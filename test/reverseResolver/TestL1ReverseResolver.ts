import { shouldSupportInterfaces } from '@ensdomains/hardhat-chai-matchers-viem/behaviour'
import { loadFixture } from '@nomicfoundation/hardhat-toolbox-viem/network-helpers.js'
import { expect } from 'chai'
import hre from 'hardhat'
import { namehash, slice } from 'viem'
import {
  EVM_BIT,
  getReverseName,
  getReverseNamespace,
} from '../fixtures/ensip19.js'
import { KnownProfile, makeResolutions } from '../universalResolver/utils.js'
import { dnsEncodeName } from '../fixtures/dnsEncodeName.js'
import { Gateway, UncheckedRollup } from '@unruggable/gateways'
import { serve } from '@namestone/ezccip/serve'
import { BrowserProvider } from 'ethers'
import { deployArtifact } from '../fixtures/deployArtifact.js'
import { urgArtifact } from '../fixtures/externalArtifacts.js'
import { deployDefaultReverseFixture } from '../fixtures/deployDefaultReverseFixture.js'

const testName = 'test.eth'
const l2CoinType = EVM_BIT | 8453n

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
  const reverseRegistrar = await hre.viem.deployContract('L2ReverseRegistrar', [
    l2CoinType,
  ])
  const reverseResolver = await hre.viem.deployContract(
    'L1ReverseResolver',
    [
      F.owner,
      F.ensRegistry.address,
      verifierAddress,
      [ccip.endpoint],
      reverseRegistrar.address,
    ],
    {
      client: {
        public: await hre.viem.getPublicClient({ ccipRead: undefined }),
      },
    },
  )
  const reverseNamespace = getReverseNamespace(l2CoinType)
  await F.takeControl(reverseNamespace)
  await F.ensRegistry.write.setResolver([
    namehash(reverseNamespace),
    reverseResolver.address,
  ])
  return {
    ...F,
    reverseNamespace,
    reverseRegistrar,
    reverseResolver,
  }
}

describe('L1ReverseResolver', () => {
  shouldSupportInterfaces({
    contract: () => loadFixture(fixture).then((F) => F.reverseResolver),
    interfaces: [
      '@openzeppelin/contracts-v5/utils/introspection/IERC165.sol:IERC165',
      'IExtendedResolver',
      'IBatchReverser',
    ],
  })

  it('unsupported profile', async () => {
    const F = await loadFixture(fixture)
    const kp: KnownProfile = {
      name: getReverseName(F.owner),
      texts: [{ key: 'dne', value: 'abc' }],
    }
    const [res] = makeResolutions(kp)
    await expect(F.reverseResolver)
      .read('resolve', [dnsEncodeName(kp.name), res.call])
      .toBeRevertedWithCustomError('UnsupportedResolverProfile')
      .withArgs(slice(res.call, 0, 4))
  })

  it('unset', async () => {
    const F = await loadFixture(fixture)
    const kp: KnownProfile = {
      name: getReverseName(F.owner, l2CoinType),
      primary: { name: '' },
    }
    const [res] = makeResolutions(kp)
    res.expect(
      await F.reverseResolver.read.resolve([dnsEncodeName(kp.name), res.call]),
    )
  })

  describe('resolve()', () => {
    it('addr() on namespace', async () => {
      const F = await loadFixture(fixture)
      const kp: KnownProfile = {
        name: F.reverseName,
        addresses: [
          { coinType: l2CoinType, value: F.reverseRegistrar.address },
        ],
      }
      const [res] = makeResolutions(kp)
      res.expect(
        await F.reverseResolver.read.resolve([
          dnsEncodeName(kp.name),
          res.call,
        ]),
      )
    })

    it('name()', async () => {
      const F = await loadFixture(fixture)
      await F.reverseRegistrar.write.setName([testName])
      const kp: KnownProfile = {
        name: getReverseName(F.owner, l2CoinType),
        primary: { name: testName },
      }
      const [res] = makeResolutions(kp)
      res.expect(
        await F.reverseResolver.read.resolve([
          dnsEncodeName(kp.name),
          res.call,
        ]),
      )
    })

    it('name() w/fallback', async () => {
      const F = await loadFixture(fixture)
      await F.defaultReverseRegistrar.write.setName([testName])
      const kp: KnownProfile = {
        name: getReverseName(F.owner, l2CoinType),
        primary: { name: testName },
      }
      const [res] = makeResolutions(kp)
      res.expect(
        await F.reverseResolver.read.resolve([
          dnsEncodeName(kp.name),
          res.call,
        ]),
      )
    })
  })

  describe('resolveNames()', () => {
    it('empty', async () => {
      const F = await loadFixture(fixture)
      await expect(
        F.reverseResolver.read.resolveNames([[], 255]),
      ).resolves.toStrictEqual([])
    })

    it('multiple pages', async () => {
      const F = await loadFixture(fixture)
      const wallets = await hre.viem.getWalletClients()
      for (const w of wallets) {
        await F.reverseRegistrar.write.setName([w.uid], { account: w.account })
      }
      await expect(
        F.reverseResolver.read.resolveNames([
          wallets.map((x) => x.account.address),
          3,
        ]),
      ).resolves.toStrictEqual(wallets.map((x) => x.uid))
    })

    it('1 specific + 1 default + 1 unset', async () => {
      const F = await loadFixture(fixture)
      const wallets = await hre.viem.getWalletClients()
      await F.reverseRegistrar.write.setName(['A'], {
        account: wallets[0].account,
      })
      await F.defaultReverseRegistrar.write.setName(['B'], {
        account: wallets[1].account,
      })
      await expect(
        F.reverseResolver.read.resolveNames([
          wallets.slice(0, 3).map((x) => x.account.address),
          255,
        ]),
      ).resolves.toStrictEqual(['A', 'B', ''])
    })
  })
})
