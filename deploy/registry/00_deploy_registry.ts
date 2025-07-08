import { execute, artifacts } from '../../rocketh.js'

export default execute(
  async ({ deploy, namedAccounts }) => {
    const { deployer } = namedAccounts

    await deploy('ENSRegistry', {
      account: deployer,
      artifact: artifacts.ENSRegistry,
    })
  },
  {
    id: 'ENSRegistry v1.0.0',
    tags: ['category:registry', 'ENSRegistry'],
  },
)
