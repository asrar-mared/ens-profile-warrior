import { execute, artifacts } from '@rocketh'
import { encodeFunctionData } from 'viem'

export default execute(
  async ({ deploy, get, tx, namedAccounts }) => {
    const { deployer, owner } = namedAccounts

    await deploy('DefaultReverseRegistrar', {
      account: deployer,
      artifact: artifacts.DefaultReverseRegistrar,
    })

    const defaultReverseRegistrar = get('DefaultReverseRegistrar')

    // Transfer ownership to owner
    if (owner !== deployer) {
      try {
        const transferTx = await tx({
          to: defaultReverseRegistrar.address,
          data: encodeFunctionData({
            abi: defaultReverseRegistrar.abi,
            functionName: 'transferOwnership',
            args: [owner],
          }),
          account: deployer,
        })
        console.log(
          `Transferred ownership of DefaultReverseRegistrar to ${owner}`,
        )
      } catch (error) {
        console.log(
          'DefaultReverseRegistrar ownership transfer error:',
          error instanceof Error ? error.message : error,
        )
      }
    }
  },
  {
    id: 'DefaultReverseRegistrar v1.0.0',
    tags: ['category:reverseregistrar', 'DefaultReverseRegistrar'],
    dependencies: ['ReverseRegistrar'],
  },
)
