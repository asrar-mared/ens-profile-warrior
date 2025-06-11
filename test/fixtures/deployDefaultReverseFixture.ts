import hre from 'hardhat'
import { namehash } from 'viem'
import { deployRegistryFixture } from './deployRegistryFixture.js'
import { COIN_TYPE_DEFAULT, getReverseNamespace } from './ensip19.js'

export async function deployDefaultReverseFixture() {
  const F = await deployRegistryFixture()
  const defaultReverseRegistrar = await hre.viem.deployContract(
    'DefaultReverseRegistrar',
  )
  const defaultReverseResolver = await hre.viem.deployContract(
    'DefaultReverseResolver',
    [defaultReverseRegistrar.address],
  )
  const defaultReverseNamespace = getReverseNamespace(COIN_TYPE_DEFAULT) // could be "reverse"
  await F.takeControl(defaultReverseNamespace)
  await F.ensRegistry.write.setResolver([
    namehash(defaultReverseNamespace),
    defaultReverseResolver.address,
  ])
  return {
    ...F,
    defaultReverseNamespace,
    defaultReverseRegistrar,
    defaultReverseResolver,
  }
}
