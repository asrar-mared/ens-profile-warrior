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
import * as deployFunctions from '@rocketh/deploy' // this one provide a deploy function
import * as readExecuteFunctions from '@rocketh/read-execute' // this one provide read,execute functions

// ------------------------------------------------------------------------------------------------
// we re-export the artifacts, so they are easily available from the alias
import artifacts from './generated/artifacts.js'
export { artifacts }

// ------------------------------------------------------------------------------------------------
// while not necessary, we also converted the execution function type to know about the named accounts
// this way you get type safe accounts
import {
  loadAndExecuteDeployments,
  setup,
  type Environment as Environment_,
} from 'rocketh'
import { createPublicClient, custom, type PublicClient } from 'viem'

const functions = {
  ...deployFunctions,
  ...readExecuteFunctions,
  getPublicClient: (env: Environment_) => {
    return createPublicClient({
      chain: env.network.chain,
      transport: custom(env.network.provider),
    })
  },
}

type Environment = Environment_<typeof config.accounts> & {
  getPublicClient: () => PublicClient
}

const execute = setup<typeof functions, typeof config.accounts>(functions)
export { execute, loadAndExecuteDeployments, type Environment }
