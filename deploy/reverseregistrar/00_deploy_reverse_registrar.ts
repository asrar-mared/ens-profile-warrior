import { artifacts, execute } from '@rocketh'
import { labelhash, namehash } from 'viem'

export default execute(
  async ({ deploy, get, execute: write, namedAccounts, network }) => {
    const { deployer, owner } = namedAccounts

    // Get dependencies
    const registry = get<(typeof artifacts.ENSRegistry)['abi']>('ENSRegistry')

    // Deploy ReverseRegistrar
    const reverseRegistrar = await deploy('ReverseRegistrar', {
      account: deployer,
      artifact: artifacts.ReverseRegistrar,
      args: [registry.address],
    })

    if (!reverseRegistrar.newlyDeployed) return

    // Transfer ownership to owner
    if (owner !== deployer) {
      await write(reverseRegistrar, {
        functionName: 'transferOwnership',
        args: [owner],
        account: deployer,
      })
      console.log(`Transferred ownership of ReverseRegistrar to ${owner}`)
    }

    // Only attempt to make controller etc changes directly on testnets
    if (network.name === 'mainnet' && !network.tags?.tenderly) return

    const root = get<(typeof artifacts.Root)['abi']>('Root')
    await write(root, {
      functionName: 'setSubnodeOwner',
      args: [labelhash('reverse'), owner],
      account: owner,
    })
    console.log(`Set owner of .reverse to owner on root`)

    await write(registry, {
      functionName: 'setSubnodeOwner',
      args: [namehash('reverse'), labelhash('addr'), reverseRegistrar.address],
      account: owner,
    })
    console.log('Set owner of .addr.reverse to ReverseRegistrar on registry')

    return true
  },
  {
    id: 'ReverseRegistrar v1.0.0',
    tags: ['category:reverseregistrar', 'ReverseRegistrar'],
    dependencies: ['ENSRegistry', 'Root'],
  },
)
