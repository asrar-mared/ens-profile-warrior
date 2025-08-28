import { artifacts, execute } from '@rocketh'

export default execute(
  async ({ deploy, get, execute: write, namedAccounts }) => {
    const { deployer, owner } = namedAccounts

    await deploy('DefaultReverseRegistrar', {
      account: deployer,
      artifact: artifacts.DefaultReverseRegistrar,
    })

    const defaultReverseRegistrar = get('DefaultReverseRegistrar')

    // Transfer ownership to owner
    if (owner !== deployer) {
      console.log(
        `  - Transferring ownership of DefaultReverseRegistrar to ${owner}`,
      )
      await write(defaultReverseRegistrar, {
        functionName: 'transferOwnership',
        args: [owner],
        account: deployer,
      })
    }
  },
  {
    id: 'DefaultReverseRegistrar v1.0.0',
    tags: ['category:reverseregistrar', 'DefaultReverseRegistrar'],
    dependencies: ['ReverseRegistrar'],
  },
)
