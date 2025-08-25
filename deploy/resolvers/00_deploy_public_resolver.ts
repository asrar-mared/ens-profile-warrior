import { execute, artifacts } from '@rocketh'
import { getAddress, encodeFunctionData } from 'viem'

export default execute(
  async ({ deploy, get, namedAccounts, tx, network }) => {
    const { deployer, owner } = namedAccounts

    // Get dependencies
    const registry = get('ENSRegistry')
    const nameWrapper = get('NameWrapper')
    const controller = get('ETHRegistrarController')
    const reverseRegistrar = get('ReverseRegistrar')

    // Deploy PublicResolver
    const publicResolver = await deploy('PublicResolver', {
      account: deployer,
      artifact: artifacts.PublicResolver,
      args: [
        registry.address,
        nameWrapper.address,
        controller.address,
        reverseRegistrar.address,
      ],
    })

    if (!publicResolver.newlyDeployed) return

    // Only attempt to make controller etc changes directly on testnets
    if (network.name === 'mainnet' && !network.tags?.tenderly) return

    // Check if PublicResolver is already the default resolver on ReverseRegistrar
    try {
      const currentDefaultResolver = await tx({
        to: reverseRegistrar.address,
        data: encodeFunctionData({
          abi: reverseRegistrar.abi,
          functionName: 'defaultResolver',
          args: [],
        }),
        account: owner,
      })

      const isAlreadyDefault =
        currentDefaultResolver.data &&
        getAddress(currentDefaultResolver.data) ===
          getAddress(publicResolver.address)

      if (!isAlreadyDefault) {
        // Set PublicResolver as default resolver on ReverseRegistrar
        await tx({
          to: reverseRegistrar.address,
          data: encodeFunctionData({
            abi: reverseRegistrar.abi,
            functionName: 'setDefaultResolver',
            args: [publicResolver.address],
          }),
          account: owner,
        })
        console.log(
          `Set PublicResolver as default resolver on ReverseRegistrar`,
        )
      } else {
        console.log(
          `PublicResolver is already the default resolver on ReverseRegistrar`,
        )
      }
    } catch (error) {
      console.log(
        'PublicResolver default resolver setup error:',
        error instanceof Error ? error.message : error,
      )
    }
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
