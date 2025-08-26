import { artifacts, execute } from '@rocketh'
import { namehash } from 'viem'
import { createInterfaceId } from '../../test/fixtures/createInterfaceId.js'

export default execute(
  async ({ deploy, get, execute: write, namedAccounts, network }) => {
    const { deployer, owner } = namedAccounts

    const registry = get<(typeof artifacts.ENSRegistry)['abi']>('ENSRegistry')
    const registrar = get<
      (typeof artifacts.BaseRegistrarImplementation)['abi']
    >('BaseRegistrarImplementation')
    const priceOracle = get<
      (typeof artifacts.ExponentialPremiumPriceOracle)['abi']
    >('ExponentialPremiumPriceOracle')
    const reverseRegistrar =
      get<(typeof artifacts.ReverseRegistrar)['abi']>('ReverseRegistrar')
    const defaultReverseRegistrar = get<
      (typeof artifacts.DefaultReverseRegistrar)['abi']
    >('DefaultReverseRegistrar')

    const controller = await deploy('ETHRegistrarController', {
      account: deployer,
      artifact: artifacts.ETHRegistrarController,
      args: [
        registrar.address,
        priceOracle.address,
        60n,
        86400n,
        reverseRegistrar.address,
        defaultReverseRegistrar.address,
        registry.address,
      ],
    })

    if (!controller.newlyDeployed) return

    // Transfer ownership to owner
    if (owner !== deployer) {
      await write(controller, {
        functionName: 'transferOwnership',
        args: [owner],
        account: deployer,
      })
      console.log(`Transferred ownership of ETHRegistrarController to ${owner}`)
    }

    // Only attempt to make controller etc changes directly on testnets
    if (network.name === 'mainnet' && !network.tags?.tenderly) return

    // Add controller to BaseRegistrarImplementation
    await write(registrar, {
      functionName: 'addController',
      args: [controller.address],
      account: owner,
    })
    console.log(
      'Added ETHRegistrarController as controller on BaseRegistrarImplementation',
    )

    // Add controller to ReverseRegistrar
    await write(reverseRegistrar, {
      functionName: 'setController',
      args: [controller.address, true],
      account: owner,
    })
    console.log(
      'Added ETHRegistrarController as controller on ReverseRegistrar',
    )

    // Add controller to DefaultReverseRegistrar
    await write(defaultReverseRegistrar, {
      functionName: 'setController',
      args: [controller.address, true],
      account: owner,
    })
    console.log(
      'Added ETHRegistrarController as controller on DefaultReverseRegistrar',
    )

    // Set interface on resolver
    const artifact = artifacts.IETHRegistrarController
    const interfaceId = createInterfaceId(artifact.abi)

    // For simplicity, assume OwnedResolver was deployed for .eth
    const ethOwnedResolver = get('OwnedResolver')

    await write(ethOwnedResolver, {
      functionName: 'setInterface',
      args: [namehash('eth'), interfaceId, controller.address],
      account: owner,
    })
    console.log(
      `Set ETHRegistrarController interface ID ${interfaceId} on .eth resolver`,
    )
  },
  {
    id: 'ETHRegistrarController v3.0.0',
    tags: ['category:ethregistrar', 'ETHRegistrarController'],
    dependencies: [
      'ENSRegistry',
      'BaseRegistrarImplementation',
      'ExponentialPremiumPriceOracle',
      'ReverseRegistrar',
      'DefaultReverseRegistrar',
      'NameWrapper',
      'OwnedResolver',
    ],
  },
)
