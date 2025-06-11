import type { DeployFunction } from 'hardhat-deploy/types.js'

const func: DeployFunction = async function (hre) {
  const { viem } = hre

  await viem.deploy('DefaultReverseRegistrar', [])
}

func.id = 'default-reverse-registrar'
func.tags = ['DefaultReverseRegistrar']
func.dependencies = ['root']

export default func
