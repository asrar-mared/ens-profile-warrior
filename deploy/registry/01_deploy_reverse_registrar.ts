import { execute, artifacts } from '@rocketh'
import { namehash, labelhash } from 'viem'

export default execute(
  async ({ deploy, get, execute: executeContract, namedAccounts, network }) => {
    const { deployer, owner } = namedAccounts

    const registry = await get('ENSRegistry')

    const reverseRegistrar = await deploy('ReverseRegistrar', {
      account: deployer,
      artifact: artifacts.ReverseRegistrar,
      args: [registry.address],
    })

    if (!reverseRegistrar.newlyDeployed) {
      return
    }

    console.log('ReverseRegistrar deployed successfully')

    // 1. Transfer ownership to owner if different from deployer
    if (owner !== deployer) {
      await executeContract(reverseRegistrar, {
        functionName: 'transferOwnership',
        args: [owner],
        account: deployer,
      })
      console.log(`Transferred ownership of ReverseRegistrar to ${owner}`)
    }

    // Only attempt to make controller etc changes directly on testnets
    if (network.name === 'mainnet') {
      return
    }

    const root = await get('Root')

    // 2. Set owner of .reverse to owner using root contract
    await executeContract(root, {
      functionName: 'setSubnodeOwner',
      args: [labelhash('reverse'), owner],
      account: owner,
    })
    console.log('Set owner of .reverse to owner on root')

    // 3. Set owner of .addr.reverse using registry directly
    await executeContract(registry, {
      functionName: 'setSubnodeOwner',
      args: [namehash('reverse'), labelhash('addr'), reverseRegistrar.address],
      account: owner,
    })
    console.log('Set owner of .addr.reverse to ReverseRegistrar on registry')
  },
  {
    id: 'reverse-registrar',
    tags: ['ReverseRegistrar'],
    dependencies: ['root'],
  },
)
