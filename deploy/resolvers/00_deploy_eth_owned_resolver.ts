import { execute, artifacts } from '@rocketh'
import { namehash } from 'viem'

export default execute(
  async ({ deploy, get, read, execute: executeContract, namedAccounts }) => {
    const { deployer, owner } = namedAccounts

    const ethOwnedResolver = await deploy('OwnedResolver', {
      account: deployer,
      artifact: artifacts.OwnedResolver,
    })

    if (!ethOwnedResolver.newlyDeployed) {
      return
    }

    console.log('OwnedResolver deployed successfully')

    const registry = await get('ENSRegistry')
    const registrar = await get('BaseRegistrarImplementation')

    // Set resolver on registrar to OwnedResolver
    await executeContract(registrar, {
      functionName: 'setResolver',
      args: [ethOwnedResolver.address],
      account: owner,
    })
    console.log('Set resolver on registrar to OwnedResolver')

    // Verify resolver is set for .eth
    const resolver = await read(registry, {
      functionName: 'resolver',
      args: [namehash('eth')],
    })
    console.log(`Set resolver for .eth to ${resolver}`)
  },
  {
    id: 'eth-owned-resolver',
    tags: ['resolvers', 'OwnedResolver', 'EthOwnedResolver'],
    dependencies: ['BaseRegistrarImplementation'],
  },
)
