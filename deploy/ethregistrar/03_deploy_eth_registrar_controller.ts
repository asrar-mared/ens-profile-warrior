import { execute, artifacts } from '@rocketh'
import { namehash, zeroAddress } from 'viem'
import { getInterfaceId } from '../../test/fixtures/createInterfaceId.js'

export default execute(
  async ({
    deploy,
    get,
    read,
    execute: executeContract,
    namedAccounts,
    network,
  }) => {
    const { deployer, owner } = namedAccounts

    const registry = await get('ENSRegistry')
    const registrar = await get('BaseRegistrarImplementation')
    const priceOracle = await get('ExponentialPremiumPriceOracle')
    const reverseRegistrar = await get('ReverseRegistrar')
    const nameWrapper = await get('NameWrapper')

    const controller = await deploy('ETHRegistrarController', {
      account: deployer,
      artifact: artifacts.ETHRegistrarController,
      args: [
        registrar.address,
        priceOracle.address,
        60n,
        86400n,
        reverseRegistrar.address,
        nameWrapper.address,
        registry.address,
      ],
    })

    if (!controller.newlyDeployed) {
      return
    }

    console.log('ETHRegistrarController deployed successfully')

    // 1. Transfer ownership to owner if different from deployer
    if (owner !== deployer) {
      await executeContract(controller, {
        functionName: 'transferOwnership',
        args: [owner],
        account: deployer,
      })
      console.log(`Transferred ownership of ETHRegistrarController to ${owner}`)
    }

    // Only attempt to make controller etc changes directly on testnets
    if (network.name === 'mainnet') {
      return
    }

    // 2. Set controller permissions on NameWrapper
    await executeContract(nameWrapper, {
      functionName: 'setController',
      args: [controller.address, true],
      account: owner,
    })
    console.log('Added ETHRegistrarController as a controller of NameWrapper')

    // 3. Set controller permissions on ReverseRegistrar
    await executeContract(reverseRegistrar, {
      functionName: 'setController',
      args: [controller.address, true],
      account: owner,
    })
    console.log(
      'Added ETHRegistrarController as a controller of ReverseRegistrar',
    )

    // 4. Set interface ID on .eth resolver
    const resolverAddress = await read(registry, {
      functionName: 'resolver',
      args: [namehash('eth')],
    })
    if (resolverAddress === zeroAddress) {
      console.log(
        'No resolver set for .eth; not setting interface for ETH Registrar Controller',
      )
      return
    }

    // Get the resolver deployment
    const ethOwnedResolver = await get('OwnedResolver')

    // Create interface ID for IETHRegistrarController
    const interfaceId = await getInterfaceId('IETHRegistrarController')
    await executeContract(ethOwnedResolver, {
      functionName: 'setInterface',
      args: [namehash('eth'), interfaceId, controller.address],
      account: owner,
    })
    console.log(
      `Set ETHRegistrarController interface ID ${interfaceId} on .eth resolver`,
    )
  },
  {
    tags: ['ethregistrar', 'ETHRegistrarController'],
    dependencies: [
      'ENSRegistry',
      'BaseRegistrarImplementation',
      'ExponentialPremiumPriceOracle',
      'ReverseRegistrar',
      'NameWrapper',
      'OwnedResolver',
    ],
  },
)
