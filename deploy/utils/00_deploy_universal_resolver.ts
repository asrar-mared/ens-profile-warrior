import { execute, artifacts } from '@rocketh'

export default execute(
  async ({ deploy, get, execute: executeContract, namedAccounts }) => {
    const { deployer, owner } = namedAccounts

    const registry = await get('ENSRegistry')
    const batchGatewayURLs: string[] = JSON.parse(
      process.env.BATCH_GATEWAY_URLS || '[]',
    )

    if (batchGatewayURLs.length === 0) {
      throw new Error('UniversalResolver: No batch gateway URLs provided')
    }

    const universalResolver = await deploy('UniversalResolver', {
      account: deployer,
      artifact: artifacts.UniversalResolver,
      args: [registry.address, batchGatewayURLs],
    })

    if (!universalResolver.newlyDeployed) {
      return
    }

    console.log('UniversalResolver deployed successfully')

    // Transfer ownership to owner if different from deployer
    if (owner !== deployer) {
      await executeContract(universalResolver, {
        functionName: 'transferOwnership',
        args: [owner],
        account: deployer,
      })
      console.log(`Transferred ownership to ${owner}`)
    }
  },
  {
    id: 'universal-resolver',
    tags: ['utils', 'UniversalResolver'],
    dependencies: ['registry'],
  },
)
