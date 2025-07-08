import { execute, artifacts } from '../../rocketh.js'

export default execute(
  async ({ deploy, namedAccounts }) => {
    const { deployer } = namedAccounts

    await deploy('L2ReverseRegistrar', {
      account: deployer,
      artifact: artifacts.L2ReverseRegistrar,
    })
  },
  {
    id: 'L2ReverseRegistrar v1.0.0',
    tags: ['category:l2', 'L2ReverseRegistrar'],
  },
)