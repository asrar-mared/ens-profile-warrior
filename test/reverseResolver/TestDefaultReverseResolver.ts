import { shouldSupportInterfaces } from '@ensdomains/hardhat-chai-matchers-viem/behaviour'
import { loadFixture } from '@nomicfoundation/hardhat-toolbox-viem/network-helpers.js'
import { expect } from 'chai'
import hre from 'hardhat'
import { slice } from 'viem'
import {
  COIN_TYPE_ETH,
  EVM_BIT,
  shortCoin,
  isEVMCoinType,
  getReverseName,
} from '../fixtures/ensip19.js'
import { KnownProfile, makeResolutions } from '../universalResolver/utils.js'
import { dnsEncodeName } from '../fixtures/dnsEncodeName.js'
import { deployDefaultReverseFixture } from '../fixtures/deployDefaultReverseFixture.js'

const testName = 'test.eth'
const coinTypes = [COIN_TYPE_ETH, EVM_BIT, 0n, 1n]

async function fixture() {
  const F = await deployDefaultReverseFixture()
  const [wallet] = await hre.viem.getWalletClients()
  await F.defaultReverseRegistrar.write.setName([testName])
  return {
    ...F,
    owner: wallet.account.address,
  }
}

describe('DefaultReverseResolver', () => {
  shouldSupportInterfaces({
    contract: () => loadFixture(fixture).then((F) => F.defaultReverseResolver),
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
    await expect(F.defaultReverseResolver)
      .read('resolve', [dnsEncodeName(kp.name), res.call])
      .toBeRevertedWithCustomError('UnsupportedResolverProfile')
      .withArgs(slice(res.call, 0, 4))
  })

  describe('resolve()', () => {
    for (const coinType of coinTypes) {
      it(shortCoin(coinType), async () => {
        const F = await loadFixture(fixture)
        const kp: KnownProfile = {
          name: getReverseName(F.owner, coinType),
          primary: { name: testName },
        }
        const [res] = makeResolutions(kp)
        if (isEVMCoinType(coinType)) {
          res.expect(
            await F.defaultReverseResolver.read.resolve([
              dnsEncodeName(kp.name),
              res.call,
            ]),
          )
        } else {
          await expect(F.defaultReverseResolver)
            .read('resolve', [dnsEncodeName(kp.name), res.call])
            .toBeRevertedWithCustomError('UnreachableName')
            .withArgs(dnsEncodeName(kp.name))
        }
      })
    }
  })

  describe('edge cases', () => {
    for (const namespace of [
      '3c.reverse', // coinType(60)
      '03c.reverse', // coinType(60)
      '000000000000000000000000000000000000000000000000000000000000003c.reverse', // coinType(60)
      '80000000.reverse', // default
      '80000001.reverse', // chain(1)
    ]) {
      it(namespace, async () => {
        const F = await loadFixture(fixture)
        const kp: KnownProfile = {
          name: `${F.owner.slice(2).toLowerCase()}.${namespace}`,
          primary: { name: testName },
        }
        const [res] = makeResolutions(kp)
        res.expect(
          await F.defaultReverseResolver.read.resolve([
            dnsEncodeName(kp.name),
            res.call,
          ]),
        )
      })
    }
  })

  describe('resolveNames()', () => {
    const perPage = 0 // ignored, has no effect

    it('empty', async () => {
      const F = await loadFixture(fixture)
      await expect(
        F.defaultReverseResolver.read.resolveNames([[], perPage]),
      ).resolves.toStrictEqual([])
    })

    it('multiple + 1 unset', async () => {
      const F = await loadFixture(fixture)
      const wallets = await hre.viem.getWalletClients()
      for (const w of wallets) {
        await F.defaultReverseRegistrar.write.setName([w.uid], {
          account: w.account,
        })
      }
      await expect(
        F.defaultReverseResolver.read.resolveNames([
          [
            ...wallets.map((x) => x.account.address),
            F.defaultReverseRegistrar.address,
          ],
          perPage,
        ]),
      ).resolves.toStrictEqual([...wallets.map((x) => x.uid), ''])
    })
  })
})
