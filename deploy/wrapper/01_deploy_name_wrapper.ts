import { execute, artifacts } from '../../rocketh.js'

export default execute(
  async ({ deploy, get, namedAccounts }) => {
    const { deployer } = namedAccounts
    
    // Get dependencies
    const registry = await get('ENSRegistry')
    const registrar = await get('BaseRegistrarImplementation')
    const metadata = await get('StaticMetadataService')
    
    // Deploy NameWrapper
    await deploy('NameWrapper', {
      account: deployer,
      artifact: artifacts.NameWrapper,
      args: [
        registry.address,
        registrar.address,
        metadata.address,
      ],
    })
  },
  {
    id: 'NameWrapper v1.0.0',
    tags: ['category:wrapper', 'NameWrapper'],
    dependencies: [
      'StaticMetadataService',
      'ENSRegistry',
      'BaseRegistrarImplementation',
      'OwnedResolver',
    ],
  },
)
