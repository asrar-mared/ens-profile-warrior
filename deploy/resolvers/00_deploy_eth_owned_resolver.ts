import { execute, artifacts } from '../../rocketh.js'
import { namehash } from 'viem'

export default execute(
  async ({ deploy, get, namedAccounts, viem }) => {
    const { deployer, owner } = namedAccounts
    
    // Deploy OwnedResolver
    const ethOwnedResolver = await deploy('OwnedResolver', {
      account: deployer,
      artifact: artifacts.OwnedResolver,
      args: [],
    })

    if (!ethOwnedResolver.newlyDeployed) return

    const registry = await get('ENSRegistry')
    const registrar = await get('BaseRegistrarImplementation')

    const setResolverHash = await registrar.write.setResolver(
      [ethOwnedResolver.address],
      { account: owner.account },
    )
    await viem.waitForTransactionSuccess(setResolverHash)

    const resolver = await registry.read.resolver([namehash('eth')])
    console.log(`set resolver for .eth to ${resolver}`)
  },
  {
    id: 'EthOwnedResolver v1.0.0',
    tags: ['category:resolvers', 'OwnedResolver', 'EthOwnedResolver'],
    dependencies: ['ENSRegistry', 'BaseRegistrarImplementation'],
  },
)
