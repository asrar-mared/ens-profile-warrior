import { execute, artifacts } from '../../rocketh.js'

export default execute(
  async ({ deploy, get, namedAccounts }) => {
    const { deployer } = namedAccounts
    
    // Get dependencies
    const registry = await get('ENSRegistry')
    
    // Deploy Root
    await deploy('Root', {
      account: deployer,
      artifact: artifacts.Root,
      args: [registry.address],
    })
  },
  {
    id: 'Root:contract v1.0.0',
    tags: ['category:root', 'Root', 'Root:contract'],
    dependencies: ['ENSRegistry'],
  },
)