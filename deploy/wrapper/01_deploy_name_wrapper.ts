import { execute, artifacts } from '@rocketh'
import { namehash, zeroAddress } from 'viem'
import { getInterfaceId } from '../../test/fixtures/createInterfaceId.js'

export default execute(
  async ({ deploy, get, read, execute, namedAccounts, network }) => {
    const { deployer, owner } = namedAccounts

    const registry = await get('ENSRegistry')
    const registrar = await get('BaseRegistrarImplementation')
    const metadata = await get('StaticMetadataService')

    const nameWrapper = await deploy('NameWrapper', {
      account: deployer,
      artifact: artifacts.NameWrapper,
      args: [registry.address, registrar.address, metadata.address],
    })

    if (!nameWrapper.newlyDeployed) {
      return
    }

    console.log('NameWrapper deployed successfully')

    if (owner !== deployer) {
      await execute(nameWrapper, {
        functionName: 'transferOwnership',
        args: [owner],
        account: deployer,
      })
      console.log(`Transferred ownership of NameWrapper to ${owner}`)
    }

    // Only attempt to make controller etc changes directly on testnets
    if (network.name === 'mainnet') {
      return
    }

    await execute(registrar, {
      functionName: 'addController',
      args: [nameWrapper.address],
      account: owner,
    })
    console.log('Added NameWrapper as controller on registrar')

    // Get interface ID for INameWrapper
    const interfaceId = await getInterfaceId('INameWrapper')
    const resolver = await read(registry, {
      functionName: 'resolver',
      args: [namehash('eth')],
    })

    if (resolver === zeroAddress) {
      console.log(
        `No resolver set for .eth; not setting interface ${interfaceId} for NameWrapper`,
      )
      return
    }

    // Set interface ID on the resolver
    const resolverContract = await get('OwnedResolver')
    await execute(resolverContract, {
      functionName: 'setInterface',
      args: [namehash('eth'), interfaceId, nameWrapper.address],
      account: owner,
    })
    console.log(`Set NameWrapper interface ID ${interfaceId} on .eth resolver`)
  },
  {
    id: 'name-wrapper',
    tags: ['wrapper', 'NameWrapper'],
    dependencies: [
      'StaticMetadataService',
      'registry',
      'ReverseRegistrar',
      'OwnedResolver',
    ],
  },
)
