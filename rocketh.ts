// ------------------------------------------------------------------------------------------------
// Typed Config
// ------------------------------------------------------------------------------------------------
import { type UserConfig, extendEnvironment } from 'rocketh'

export const config = {
  accounts: {
    deployer: {
      default: 0,
    },
    owner: {
      default: 1,
      1: '0xFe89cc7aBB2C4183683ab71653C4cdc9B02D44b7', // mainnet
    },
  },
  networks: {
    hardhat: {
      rpcUrl: 'http://127.0.0.1:8545',
      tags: ['test', 'legacy', 'use_root'],
    },
    localhost: {
      rpcUrl: 'http://127.0.0.1:8545',
      tags: ['test', 'legacy', 'use_root'],
    },
    sepolia: {
      rpcUrl: `https://sepolia.infura.io/v3/${process.env.INFURA_API_KEY}`,
      tags: ['test', 'legacy', 'use_root'],
    },
    mainnet: {
      rpcUrl: `https://mainnet.infura.io/v3/${process.env.INFURA_API_KEY}`,
      tags: ['legacy', 'use_root'],
    },
  },
} as const satisfies UserConfig

// ------------------------------------------------------------------------------------------------
// Imports and Re-exports
// ------------------------------------------------------------------------------------------------
// We regroup all what is needed for the deploy scripts
// so that they just need to import this file
import '@rocketh/deploy' // provides the deploy function
import '@rocketh/read-execute' // provides read, execute functions
import '@rocketh/proxy' // provides proxy deployment functions

// ------------------------------------------------------------------------------------------------
// we re-export the artifacts, so they are easily available from the alias
import artifacts from './generated/artifacts.js'
export { artifacts }

// ------------------------------------------------------------------------------------------------
// while not necessary, we also converted the execution function type to know about the named accounts
// this way you get type safe accounts
import {
  execute as _execute,
  loadAndExecuteDeployments,
  type NamedAccountExecuteFunction,
} from 'rocketh'

const execute = _execute as NamedAccountExecuteFunction<typeof config.accounts>
export { execute, loadAndExecuteDeployments }

extendEnvironment((env) => {
  // replacement for TransactionHashTracker
  // https://github.com/wighawag/rocketh/blob/main/packages/rocketh/src/environment/providers/TransactionHashTracker.ts
  const parent = env.network.provider
  parent.request = async function (args: any) {
    if (args.method === 'eth_getTransactionReceipt') {
      const timeout = Date.now() + 2000
      for (;;) {
        await new Promise((f) => setTimeout(f, 25))
        const receipt = await parent.provider.request(args).catch(() => {})
        if (receipt) return receipt
        if (Date.now() > timeout)
          throw new Error(`timeout for receipt: ${args.params[0]}`)
      }
    } else {
      const res = await parent.provider.request(args)
      if (/^eth_send(Raw|)Transaction$/.test(args.method)) {
        parent.transactionHashes?.push(res)
      }
      return res
    }
  }
  return env
})
