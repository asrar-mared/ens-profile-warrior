import { execute, artifacts } from '../../rocketh.js'

export default execute(
  async ({ deploy, get, namedAccounts }) => {
    const { deployer } = namedAccounts
    
    // Get dependencies
    const registry = await get('ENSRegistry')
    
    // Deploy ReverseRegistrar
    await deploy('ReverseRegistrar', {
      account: deployer,
      artifact: artifacts.ReverseRegistrar,
      args: [registry.address],
    })
  },
  {
    id: 'ReverseRegistrar v1.0.0',
    tags: ['category:reverseregistrar', 'ReverseRegistrar'],
    dependencies: ['ENSRegistry', 'Root'],
  },
)
