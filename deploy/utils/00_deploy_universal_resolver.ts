import { execute, artifacts } from '../../rocketh.js'

export default execute(
  async ({ deploy, get, namedAccounts }) => {
    const { deployer } = namedAccounts
    
    // Get dependencies
    const registry = await get('ENSRegistry')
    
    // Get batch gateway URLs from environment
    const batchGatewayURLs: string[] = JSON.parse(
      process.env.BATCH_GATEWAY_URLS || '[]',
    )

    if (batchGatewayURLs.length === 0) {
      throw new Error('UniversalResolver: No batch gateway URLs provided')
    }
    
    // Deploy UniversalResolver
    await deploy('UniversalResolver', {
      account: deployer,
      artifact: artifacts.UniversalResolver,
      args: [registry.address, batchGatewayURLs],
    })
  },
  {
    id: 'UniversalResolver v1.0.0',
    tags: ['category:utils', 'UniversalResolver'],
    dependencies: ['ENSRegistry'],
  },
)
