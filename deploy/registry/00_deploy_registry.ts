import { artifacts, execute } from '@rocketh'

export default execute(
  async ({ deploy, namedAccounts: { deployer }, network }) => {
    if (network.tags.legacy) {
      console.log('Deploying Legacy ENS Registry...')
      const contract = await deploy('LegacyENSRegistry', {
        account: deployer,
        artifact: artifacts.ENSRegistry,
      })

      console.log('Deploying ENS Registry with Fallback...')
      await deploy('ENSRegistry', {
        account: deployer,
        artifact: artifacts.ENSRegistryWithFallback,
        args: [contract.address],
      })
    } else {
      console.log('Deploying standard ENS Registry...')
      await deploy('ENSRegistry', {
        account: deployer,
        artifact: artifacts.ENSRegistry,
      })
    }

    console.log('Registry deployment completed')
  },
  {
    id: 'ENSRegistry v1.0.0',
    tags: ['category:registry', 'ENSRegistry'],
  },
)
