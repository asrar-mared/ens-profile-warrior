import { configVariable, type HardhatUserConfig } from 'hardhat/config'

import dotenv from 'dotenv'

import HardhatChaiMatchersViemPlugin from '@ensdomains/hardhat-chai-matchers-viem'
import HardhatKeystore from '@nomicfoundation/hardhat-keystore'
import HardhatNetworkHelpersPlugin from '@nomicfoundation/hardhat-network-helpers'
import HardhatViem from '@nomicfoundation/hardhat-viem'
import HardhatDeploy from 'hardhat-deploy'

const realAccounts = [
  configVariable('DEPLOYER_KEY'),
  configVariable('OWNER_KEY'),
]

import { arbitrum, optimism } from 'viem/chains'

dotenv.config({ debug: false })

// circular dependency shared with actions
export const archivedDeploymentPath = './deployments/archive'

const config = {
  networks: {
    hardhat: {
      type: 'edr-simulated',
      allowUnlimitedContractSize: false,
      forking: process.env.FORKING_ENABLED
        ? {
            url: `https://mainnet.infura.io/v3/${process.env.INFURA_API_KEY}`,
          }
        : undefined,
    },
    localhost: {
      type: 'http',
      chainId: 31337,
      url: 'http://127.0.0.1:8545/',
    },
    sepolia: {
      type: 'http',
      url: `https://sepolia.infura.io/v3/${process.env.INFURA_API_KEY}`,
      chainId: 11155111,
      accounts: realAccounts,
    },
    holesky: {
      type: 'http',
      url: `https://holesky.gateway.tenderly.co`,
      chainId: 17000,
      accounts: realAccounts,
    },
    mainnet: {
      type: 'http',
      url: `https://mainnet.infura.io/v3/${process.env.INFURA_API_KEY}`,
      chainId: 1,
      accounts: realAccounts,
    },
    optimism: {
      type: 'http',
      url: optimism.rpcUrls.default.http[0],
      chainId: optimism.id,
      accounts: realAccounts,
    },
    arbitrum: {
      type: 'http',
      url: arbitrum.rpcUrls.default.http[0],
      chainId: arbitrum.id,
      accounts: realAccounts,
    },
  },
  solidity: {
    compilers: [
      {
        version: '0.8.26',
        settings: {
          optimizer: {
            enabled: true,
            runs: 1_000_000,
          },
          metadata: {
            bytecodeHash: 'ipfs',
            useLiteralContent: true,
          },
          evmVersion: 'paris',
        },
      },
      {
        version: '0.8.17',
        settings: {
          optimizer: {
            enabled: true,
            runs: 1200,
          },
        },
      },
    ],
    overrides: {
      'contracts/wrapper/NameWrapper.sol': {
        version: '0.8.17',
        settings: {
          optimizer: {
            enabled: true,
            runs: 1200,
          },
        },
      },
    },
    npmFilesToBuild: ['@openzeppelin/contracts/utils/introspection/ERC165.sol'],
  },
  paths: {
    sources: {
      solidity: ['./contracts'],
    },
  },
  plugins: [
    HardhatNetworkHelpersPlugin,
    HardhatChaiMatchersViemPlugin,
    HardhatViem,
    HardhatDeploy,
    HardhatKeystore,
  ],
} satisfies HardhatUserConfig

// safe's pkgs set addressType to string for some reason
declare module 'abitype' {
  interface Register {
    addressType: `0x${string}`
  }
}

export default config
