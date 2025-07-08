import { execute, artifacts } from '../../rocketh.js'

export default execute(
  async ({ deploy, get, namedAccounts }) => {
    const { deployer } = namedAccounts

    const registry = await get('ENSRegistry')
    const registrar = await get('BaseRegistrarImplementation')
    const priceOracle = await get('ExponentialPremiumPriceOracle')
    const reverseRegistrar = await get('ReverseRegistrar')
    const defaultReverseRegistrar = await get('DefaultReverseRegistrar')

    await deploy('ETHRegistrarController', {
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
    ],
  },
)
