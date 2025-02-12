import type { DeployFunction } from 'hardhat-deploy/types.js'
import { labelhash, namehash, zeroAddress } from 'viem'

const func: DeployFunction = async function (hre) {
  const { network, viem } = hre

  const { owner } = await viem.getNamedClients()

  const defaultReverseRegistrarDeployment = await viem.deploy(
    'DefaultReverseRegistrar',
    [],
  )
  if (!defaultReverseRegistrarDeployment.newlyDeployed) return

  const defaultReverseRegistrar = await viem.getContract(
    'DefaultReverseRegistrar',
  )

  // Only attempt to make controller etc changes directly on testnets
  if (network.name === 'mainnet') return

  const registry = await viem.getContract('ENSRegistry')
  const root = await viem.getContract('Root')

  const currentRootOwner = await root.read.owner()
  const currentReverseOwner = await registry.read.owner([namehash('reverse')])
  if (
    currentRootOwner === owner.address &&
    currentReverseOwner !== owner.address
  ) {
    const setReverseOwnerHash = await root.write.setSubnodeOwner(
      [labelhash('reverse'), owner.address],
      { account: owner.account },
    )
    console.log(
      `Setting owner of .reverse to owner on root (tx: ${setReverseOwnerHash})...`,
    )
    await viem.waitForTransactionSuccess(setReverseOwnerHash)
  } else if (currentRootOwner !== owner.address) {
    console.warn(
      'Root owner account not available, skipping default.reverse setup on registry',
    )
    return
  }

  const setResolverHash = await registry.write.setSubnodeRecord(
    [
      namehash('reverse'),
      labelhash('default'),
      zeroAddress,
      defaultReverseRegistrar.address,
      0n,
    ],
    {
      account: owner.account,
    },
  )
  console.log(
    `Setting resolver of default.reverse to DefaultReverseRegistrar on registry (tx: ${setResolverHash})...`,
  )
  await viem.waitForTransactionSuccess(setResolverHash)
}

func.id = 'default-reverse-registrar'
func.tags = ['DefaultReverseRegistrar']
func.dependencies = ['root']

export default func
