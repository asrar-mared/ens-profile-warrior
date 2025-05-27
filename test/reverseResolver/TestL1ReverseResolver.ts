import { shouldSupportInterfaces } from '@ensdomains/hardhat-chai-matchers-viem/behaviour'
import { loadFixture } from '@nomicfoundation/hardhat-toolbox-viem/network-helpers.js'
import { expect } from 'chai'
import hre from 'hardhat'
import { namehash, slice } from 'viem'
import {
  COIN_TYPE_ETH,
  EVM_BIT,
  getReverseName,
  getReverseNamespace,
} from '../fixtures/ensip19.js'
import { KnownProfile, makeResolutions } from '../universalResolver/utils.js'
import { dnsEncodeName } from '../fixtures/dnsEncodeName.js'
import { Gateway, UncheckedRollup } from '@unruggable/gateways'
import { serve } from '@namestone/ezccip/serve'
import { BrowserProvider } from 'ethers/providers'
import { deployArtifact } from '../fixtures/deployArtifact.js'
import { urgArtifact } from '../fixtures/externalArtifacts.js'
import { deployDefaultReverseFixture } from '../fixtures/deployDefaultReverseFixture.js'

const testName = 'test.eth'

async function fixture() {
  const F = await deployDefaultReverseFixture()
  const gateway = new Gateway(
    new UncheckedRollup(new BrowserProvider(hre.network.provider)),
  )
  gateway.disableCache()
  const ccip = await serve(gateway, { protocol: 'raw', log: false })
  after(ccip.shutdown)
  const GatewayVM = await deployArtifact({
    file: urgArtifact('GatewayVM'),
  })
  const verifierAddress = await deployArtifact({
    file: urgArtifact('UncheckedVerifier'),
    args: [[ccip.endpoint]],
    libs: { GatewayVM },
  })
  const publicClient = await hre.viem.getPublicClient({ ccipRead: undefined })
  const universalResolver = await hre.viem.deployContract('UniversalResolver', [
    F.ensRegistry.address,
    [],
  ])
  const chain = await deployReverse(EVM_BIT | 8453n)
  const chain2 = await deployReverse(EVM_BIT | 123n)
  await F.takeControl(chain.namespace)
  await F.ensRegistry.write.setResolver([
    namehash(chain.namespace),
    chain.resolver.address,
  ])
  return { ...F, chain, chain2, deployReverse }
  async function deployReverse(coinType: bigint) {
    const registrar = await hre.viem.deployContract('L2ReverseRegistrar', [
      coinType,
    ])
    const resolver = await hre.viem.deployContract(
      'L1ReverseResolver',
      [
        F.owner,
        universalResolver.address,
        verifierAddress,
        [ccip.endpoint],
        registrar.address,
      ],
      { client: { public: publicClient } },
    )
    return {
      coinType,
      namespace: getReverseNamespace(coinType),
      registrar,
      resolver,
    }
  }
}

describe('L1ReverseResolver', () => {
  shouldSupportInterfaces({
    contract: () => loadFixture(fixture).then((F) => F.chain.resolver),
    interfaces: [
      '@openzeppelin/contracts-v5/utils/introspection/IERC165.sol:IERC165',
      'IExtendedResolver',
      'INameReverser',
    ],
  })

  it('unsupported profile', async () => {
    const F = await loadFixture(fixture)
    const kp: KnownProfile = {
      name: getReverseName(F.owner),
      texts: [{ key: 'dne', value: 'abc' }],
    }
    const [res] = makeResolutions(kp)
    await expect(F.chain.resolver)
      .read('resolve', [dnsEncodeName(kp.name), res.call])
      .toBeRevertedWithCustomError('UnsupportedResolverProfile')
      .withArgs(slice(res.call, 0, 4))
  })

  it('unset', async () => {
    const F = await loadFixture(fixture)
    const kp: KnownProfile = {
      name: getReverseName(F.owner, F.chain.coinType),
      primary: { name: '' },
    }
    const [res] = makeResolutions(kp)
    res.expect(
      await F.chain.resolver.read.resolve([dnsEncodeName(kp.name), res.call]),
    )
  })

  describe('resolve()', () => {
    it('addr() on namespace', async () => {
      const F = await loadFixture(fixture)
      const kp: KnownProfile = {
        name: F.chain.namespace,
        addresses: [
          { coinType: COIN_TYPE_ETH, value: F.chain.resolver.address },
          { coinType: F.chain.coinType, value: F.chain.registrar.address },
        ],
      }
      for (const res of makeResolutions(kp)) {
        res.expect(
          await F.chain.resolver.read.resolve([
            dnsEncodeName(kp.name),
            res.call,
          ]),
        )
      }
    })

    it('name()', async () => {
      const F = await loadFixture(fixture)
      await F.chain.registrar.write.setName([testName])
      const kp: KnownProfile = {
        name: getReverseName(F.owner, F.chain.coinType),
        primary: { name: testName },
      }
      const [res] = makeResolutions(kp)
      res.expect(
        await F.chain.resolver.read.resolve([dnsEncodeName(kp.name), res.call]),
      )
    })

    it('name() w/fallback', async () => {
      const F = await loadFixture(fixture)
      await F.defaultReverseRegistrar.write.setName([testName])
      const kp: KnownProfile = {
        name: getReverseName(F.owner, F.chain.coinType),
        primary: { name: testName },
      }
      const [res] = makeResolutions(kp)
      res.expect(
        await F.chain.resolver.read.resolve([dnsEncodeName(kp.name), res.call]),
      )
    })
  })

  describe('resolveNames()', () => {
    it('empty', async () => {
      const F = await loadFixture(fixture)
      await expect(
        F.chain.resolver.read.resolveNames([[], 255]),
      ).resolves.toStrictEqual([])
    })

    it('multiple pages', async () => {
      const F = await loadFixture(fixture)
      const wallets = await hre.viem.getWalletClients()
      for (const w of wallets) {
        await F.chain.registrar.write.setName([w.uid], { account: w.account })
      }
      await expect(
        F.chain.resolver.read.resolveNames([
          wallets.map((x) => x.account.address),
          3,
        ]),
      ).resolves.toStrictEqual(wallets.map((x) => x.uid))
    })

    it('1 chain + 1 default + 1 unset', async () => {
      const F = await loadFixture(fixture)
      const wallets = await hre.viem.getWalletClients()
      await F.chain.registrar.write.setName(['A'], {
        account: wallets[0].account,
      })
      await F.defaultReverseRegistrar.write.setName(['B'], {
        account: wallets[1].account,
      })
      await expect(
        F.chain.resolver.read.resolveNames([
          wallets.slice(0, 3).map((x) => x.account.address),
          255,
        ]),
      ).resolves.toStrictEqual(['A', 'B', ''])
    })
  })

  describe('default on Namechain', async () => {
    async function replaceDefault(F: Awaited<ReturnType<typeof fixture>>) {
      // replace the default resolver with another L1ReverseResolver
      // to ensure that the fallback can ccip-read correctly
      // note: this invokes (2) separate gateway reads
      await F.ensRegistry.write.setResolver([
        namehash(F.defaultReverseNamespace),
        F.chain2.resolver.address,
      ])
    }

    it('resolve()', async () => {
      const F = await loadFixture(fixture)
      const kp: KnownProfile = {
        name: getReverseName(F.owner, F.chain.coinType),
        primary: { name: testName },
      }
      await replaceDefault(F)
      await F.chain2.registrar.write.setName([testName])
      const [res] = makeResolutions(kp)
      res.expect(
        await F.chain.resolver.read.resolve([dnsEncodeName(kp.name), res.call]),
      )
    })

    it('resolveNames()', async () => {
      const F = await loadFixture(fixture)
      await replaceDefault(F)
      const wallets = await hre.viem.getWalletClients()
      await F.chain.registrar.write.setName(['A'], {
        account: wallets[0].account,
      })
      await F.chain2.registrar.write.setName(['B'], {
        account: wallets[1].account,
      })
      await expect(
        F.chain.resolver.read.resolveNames([
          wallets.slice(0, 2).map((x) => x.account.address),
          1, // force multiple pages
        ]),
      ).resolves.toStrictEqual(['A', 'B'])
    })
  })
})
