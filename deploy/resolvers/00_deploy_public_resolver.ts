import { execute, artifacts } from '../../rocketh.js'

export default execute(
  async ({ deploy, get, namedAccounts }) => {
    const { deployer } = namedAccounts
    
    // Get dependencies
    const registry = await get('ENSRegistry')
    const nameWrapper = await get('NameWrapper')
    const controller = await get('ETHRegistrarController')
    const reverseRegistrar = await get('ReverseRegistrar')
    
    // Deploy PublicResolver
    await deploy('PublicResolver', {
      account: deployer,
      artifact: artifacts.PublicResolver,
      args: [
        registry.address,
        nameWrapper.address,
        controller.address,
        reverseRegistrar.address,
      ],
    })
  },
  {
    id: 'PublicResolver v3.0.0',
    tags: ['category:resolvers', 'PublicResolver'],
    dependencies: [
      'ENSRegistry',
      'NameWrapper',
      'ETHRegistrarController',
      'ReverseRegistrar',
    ],
  },
)
