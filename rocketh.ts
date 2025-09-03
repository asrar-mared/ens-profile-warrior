// ------------------------------------------------------------------------------------------------
// Typed Config
// ------------------------------------------------------------------------------------------------
import { type UserConfig } from 'rocketh'

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
      tags: ['test', 'legacy', 'use_root', 'allow_unsafe'],
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
import * as deployFunctions from '@rocketh/deploy'
import * as readExecuteFunctions from '@rocketh/read-execute'
import * as viemFunctions from '@rocketh/viem'

// ------------------------------------------------------------------------------------------------
// we re-export the artifacts, so they are easily available from the alias
import artifacts from './generated/artifacts.js'
export { artifacts }

// ------------------------------------------------------------------------------------------------
// while not necessary, we also converted the execution function type to know about the named accounts
// this way you get type safe accounts
import {
  setup,
  type CurriedFunctions,
  type Environment as Environment_,
} from 'rocketh'

type HookFunctions = {
  createLegacyRegistryNames?: (env: Environment_) => () => Promise<void>
  registerLegacyNames?: (env: Environment_) => () => Promise<void>
  registerWrappedNames?: (env: Environment_) => () => Promise<void>
  registerUnwrappedNames?: (env: Environment_) => () => Promise<void>
}

const functions = {
  ...deployFunctions,
  ...readExecuteFunctions,
  ...viemFunctions,
  __patchProvider(env: Environment_) {
    // replacement for TransactionHashTracker
    // https://github.com/wighawag/rocketh/blob/main/packages/rocketh/src/environment/providers/TransactionHashTracker.ts
    // still not fixed: https://github.com/wighawag/rocketh/issues/24
    const parent = env.network.provider
    if (parent.__patched) return;
    parent.__patched = true;
    parent.request = async function (args: any) {
      if (args.method === 'eth_getTransactionReceipt') {
        const timeout = Date.now() + 2000
        for (;;) {
          await new Promise((f) => setTimeout(f, 0))
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
  },
}

type Environment = Environment_<typeof config.accounts> &
  CurriedFunctions<typeof functions>

const { deployScript: execute, loadAndExecuteDeployments } = setup<
  typeof functions & HookFunctions,
  typeof config.accounts
>(functions)
export { execute, loadAndExecuteDeployments, type Environment }
