import type { DeployFunction } from 'hardhat-deploy/types.js'

const func: DeployFunction = async function (hre) {
  const { viem } = hre

  await viem.deploy('DefaultReverseRegistrar', [])
}

func.id = 'DefaultReverseRegistrar v1.0.0'
func.tags = ['category:reverseregistrar', 'DefaultReverseRegistrar']
func.dependencies = []

export default func
