import { evmChainIdToCoinType } from '@ensdomains/address-encoder/utils'
import { loadFixture } from '@nomicfoundation/hardhat-toolbox-viem/network-helpers.js'
import { expect } from 'chai'
import hre from 'hardhat'
import { getAddress, namehash } from 'viem'
import { base } from 'viem/chains'
import {
  getReverseNamespace,
  getReverseNodeHash,
} from '../fixtures/getReverseNode.js'

const coinType = evmChainIdToCoinType(base.id)
const reverseNamespace = getReverseNamespace({ chainId: base.id })

async function fixture() {
  const accounts = await hre.viem
    .getWalletClients()
    .then((clients) => clients.map((c) => c.account))

  const oldReverseResolver = await hre.viem.deployContract('OwnedResolver', [])

  for (let i = 0; i < accounts.length; i++) {
    const account = accounts[i]
    await oldReverseResolver.write.setName([
      getReverseNodeHash(account.address, { chainId: base.id }),
      `name-${i}.eth`,
    ])
  }

  const l2ReverseRegistrar = await hre.viem.deployContract(
    'L2ReverseRegistrarWithMigration',
    [
      namehash(reverseNamespace),
      coinType,
      accounts[0].address,
      oldReverseResolver.address,
    ],
  )

  return {
    l2ReverseRegistrar,
    oldReverseResolver,
    accounts,
  }
}

describe('L2ReverseRegistrarWithMigration', () => {
  it('should migrate names', async () => {
    const { l2ReverseRegistrar, oldReverseResolver, accounts } =
      await loadFixture(fixture)

    await l2ReverseRegistrar.write.batchSetName([
      accounts.map((a) => a.address),
    ])

    for (let i = 0; i < accounts.length; i++) {
      const account = accounts[i]
      const name = await oldReverseResolver.read.name([
        getReverseNodeHash(account.address, { chainId: base.id }),
      ])
      expect(name).toBe(`name-${i}.eth`)
      const newName = await l2ReverseRegistrar.read.name([
        getReverseNodeHash(account.address, { chainId: base.id }),
      ])
      expect(newName).toBe(`name-${i}.eth`)
    }
  })

  it('should revert if not owner', async () => {
    const { l2ReverseRegistrar, accounts } = await loadFixture(fixture)

    await expect(l2ReverseRegistrar)
      .write('batchSetName', [[accounts[0].address]], { account: accounts[1] })
      .toBeRevertedWithCustomError('OwnableUnauthorizedAccount')
      .withArgs(getAddress(accounts[1].address))
  })
})
