import { execute, artifacts } from '../../rocketh.js'

export default execute(
  async ({ deploy, namedAccounts }) => {
    const { deployer } = namedAccounts

    await deploy('DefaultReverseRegistrar', {
      account: deployer,
      artifact: artifacts.DefaultReverseRegistrar,
    })
  },
  {
    id: 'DefaultReverseRegistrar v1.0.0',
    tags: ['category:reverseregistrar', 'DefaultReverseRegistrar'],
  },
)
