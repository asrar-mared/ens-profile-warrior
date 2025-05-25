import hre from 'hardhat'
import { deployRegistryFixture } from './deployRegistryFixture.js'
import { namehash } from 'viem'
import { EVM_BIT, getReverseNamespace } from './ensip19.js'

export async function deployDefaultReverseFixture() {
  const F = await deployRegistryFixture()
  const defaultReverseRegistrar = await hre.viem.deployContract(
    'DefaultReverseRegistrar',
  )
  const defaultReverseResolver = await hre.viem.deployContract(
    'DefaultReverseResolver',
    [defaultReverseRegistrar.address],
  )
  const defaultReverseNamespace = getReverseNamespace(EVM_BIT) // could be "reverse"
  await F.takeControl(defaultReverseNamespace)
  await F.ensRegistry.write.setResolver([
    namehash(defaultReverseNamespace),
    defaultReverseResolver.address,
  ])
  // await F.ensRegistry.write.setRecord([
  //   namehash(defaultReverseNamespace),
  //   defaultReverseRegistrar.address,
  //   defaultReverseResolver.address,
  //   0n,
  // ])
  return {
    ...F,
    defaultReverseNamespace,
    defaultReverseRegistrar,
    defaultReverseResolver,
  }
}
