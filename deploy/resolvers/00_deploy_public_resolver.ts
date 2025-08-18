import { execute, artifacts } from '@rocketh'
import { getAddress, namehash, encodeFunctionData } from 'viem'

export default execute(
  async ({ deploy, get, namedAccounts, tx, network }) => {
    const { deployer, owner } = namedAccounts

    // Get dependencies
    const registry = await get('ENSRegistry')
    const nameWrapper = await get('NameWrapper')
    const controller = await get('ETHRegistrarController')
    const reverseRegistrar = await get('ReverseRegistrar')

    // Deploy PublicResolver
    const publicResolverDeployment = await deploy('PublicResolver', {
      account: deployer,
      artifact: artifacts.PublicResolver,
      args: [
        registry.address,
        nameWrapper.address,
        controller.address,
        reverseRegistrar.address,
      ],
    })

    if (!publicResolverDeployment.newlyDeployed) return

    const publicResolver = await get('PublicResolver')

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
        getAddress(currentDefaultResolver.data || '0x') ===
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
