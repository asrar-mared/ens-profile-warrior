import { shouldSupportInterfaces } from '@ensdomains/hardhat-chai-matchers-viem/behaviour'
import { loadFixture } from '@nomicfoundation/hardhat-toolbox-viem/network-helpers.js'
import { expect } from 'chai'
import hre from 'hardhat'
import { keccak256, namehash, slice, stringToBytes } from 'viem'
import {
  EVM_BIT,
  getReverseName,
  getReverseNamespace,
} from '../fixtures/ensip19.js'
import { KnownProfile, makeResolutions } from '../universalResolver/utils.js'
import { dnsEncodeName } from '../fixtures/dnsEncodeName.js'
import { deployRegistryFixture } from '../fixtures/registryFixture.js'
import { Gateway, UncheckedRollup } from '@ensdomains/unruggable-gateways'
import { serve } from '@namestone/ezccip/serve'
import { BrowserProvider } from 'ethers'
import { deployArtifact } from '../fixtures/deployArtifact.js'
import { urgArtifact } from '../fixtures/externalArtifacts.js'

const testName = 'test.eth'
const l2CoinType = EVM_BIT | 8453n

async function fixture() {
  const F = await deployRegistryFixture()
  const defaultReverseRegistrar = await hre.viem.deployContract(
    'DefaultReverseRegistrar',
  )
  const defaultReverseResolver = await hre.viem.deployContract(
    'L1DefaultReverseResolver',
    [defaultReverseRegistrar.address],
  )
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
  {
    const name = 'reverse'
    await F.takeControl(name)
    await F.ensRegistry.write.setResolver([
      namehash(name),
      defaultReverseResolver.address,
    ])
  }
  {
    const name = getReverseNamespace(l2CoinType)
    await F.takeControl(name)
    await F.ensRegistry.write.setResolver([
      namehash(name),
      reverseResolver.address,
    ])
  }
  return {
    ...F,
    defaultReverseRegistrar,
    defaultReverseResolver,
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
    ],
  })

  it('eip3668.wrappable', async () => {
    const F = await loadFixture(fixture)
    await expect(
      F.reverseResolver.read.supportsInterface([
        slice(keccak256(stringToBytes('eip3668.wrappable')), 0, 4),
      ]),
    ).resolves.toStrictEqual(true)
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
        name: getReverseNamespace(l2CoinType),
        addresses: [
          { coinType: l2CoinType, encodedAddress: F.reverseRegistrar.address },
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
})
