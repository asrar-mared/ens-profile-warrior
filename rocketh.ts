// ------------------------------------------------------------------------------------------------
// Typed Config
// ------------------------------------------------------------------------------------------------
import { UserConfig } from 'rocketh'

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

// Extend the Environment interface to include viem
import { extendEnvironment } from 'rocketh'
import {
  createTestClient,
  createWalletClient,
  createPublicClient,
  type TestClient,
  type WalletClient,
  type PublicClient,
  http,
} from 'viem'
import { Chain } from 'viem'

// Types for augmented deployments with viem contract interfaces
type ContractReadMethods<TAbi extends import('abitype').Abi> = {
  [K in import('abitype').ExtractAbiFunctionNames<TAbi, 'pure' | 'view'>]: (
    args?: any,
  ) => Promise<any>
}

type ContractWriteMethods<TAbi extends import('abitype').Abi> = {
  [K in import('abitype').ExtractAbiFunctionNames<
    TAbi,
    'nonpayable' | 'payable'
  >]: (args?: any, options?: any) => Promise<any>
}

type AugmentedDeployment<TAbi extends import('abitype').Abi> =
  import('rocketh').Deployment<TAbi> & {
    read: ContractReadMethods<TAbi>
    write: ContractWriteMethods<TAbi>
  }

declare module 'rocketh' {
  interface Environment {
    get<TAbi extends import('abitype').Abi = import('abitype').Abi>(
      name: string,
    ): AugmentedDeployment<TAbi>

    viem: {
      getPublicClient(): Promise<PublicClient>
      getWalletClient(): Promise<WalletClient>
      getTestClient(): Promise<TestClient>
      getUnnamedClients(): Promise<
        { address: string; account: string; wallet: WalletClient }[]
      >
      getContractAt<TAbi extends any[]>(
        contractName: string,
        address: string,
        options?: { client?: any },
      ): Promise<any>
      waitForTransactionSuccess(hash: string): Promise<any>
    }
  }
}

extendEnvironment((env) => {
  // Store the original get function
  const originalGet = env.get.bind(env)

  // Override the get function to add viem contract interfaces
  env.get = function <TAbi extends import('abitype').Abi>(
    name: string,
  ): AugmentedDeployment<TAbi> {
    const deployment = originalGet(name)

    // Add viem contract interfaces to the deployment
    const augmentedDeployment = {
      ...deployment,
      read: new Proxy(
        {},
        {
          get: (target, prop) => {
            return async (...args: any[]) => {
              const publicClient = await env.viem.getPublicClient()
              return publicClient.readContract({
                address: deployment.address as `0x${string}`,
                abi: deployment.abi,
                functionName: prop as string,
                args: args[0] || [],
              })
            }
          },
        },
      ),
      write: new Proxy(
        {},
        {
          get: (target, prop) => {
            return async (...args: any[]) => {
              const walletClient = await env.viem.getWalletClient()
              return walletClient.writeContract({
                address: deployment.address as `0x${string}`,
                abi: deployment.abi,
                functionName: prop as string,
                args: args[0] || [],
                ...args[1],
              })
            }
          },
        },
      ),
    }

    return augmentedDeployment as AugmentedDeployment<TAbi>
  }

  env.viem = {
    async getPublicClient() {
      return createPublicClient({
        chain: env.network.chain as Chain,
        transport: http(env.network.provider.connection.url),
      })
    },
    async getWalletClient() {
      return createWalletClient({
        chain: env.network.chain as Chain,
        transport: http(env.network.provider.connection.url),
      })
    },
    async getTestClient() {
      return createTestClient({
        chain: env.network.chain as Chain,
        transport: http(env.network.provider.connection.url),
        mode: 'hardhat',
      })
    },
    async getUnnamedClients() {
      return []
    },
    async getContractAt(
      contractName: string,
      address: string,
      options?: { client?: any },
    ) {
      const publicClient = await this.getPublicClient()
      const deployment = originalGet(contractName)
      return {
        address,
        abi: deployment.abi,
        read: new Proxy(
          {},
          {
            get: (target, prop) => {
              return async (...args: any[]) => {
                return publicClient.readContract({
                  address: address as `0x${string}`,
                  abi: deployment.abi,
                  functionName: prop as string,
                  args: args[0] || [],
                })
              }
            },
          },
        ),
        write: new Proxy(
          {},
          {
            get: (target, prop) => {
              return async (...args: any[]) => {
                const walletClient = await this.getWalletClient()
                return walletClient.writeContract({
                  address: address as `0x${string}`,
                  abi: deployment.abi,
                  functionName: prop as string,
                  args: args[0] || [],
                  ...args[1],
                })
              }
            },
          },
        ),
      }
    },
    async waitForTransactionSuccess(hash: string) {
      const publicClient = await this.getPublicClient()
      return publicClient.waitForTransactionReceipt({
        hash: hash as `0x${string}`,
      })
    },
  }
  return env
})

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
