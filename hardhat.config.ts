import { configVariable, type HardhatUserConfig } from 'hardhat/config'

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

// circular dependency shared with actions
export const archivedDeploymentPath = './deployments/archive'

const config = {
  networks: {
    hardhat: {
      type: 'edr',
      allowUnlimitedContractSize: false,
      forking: process.env.FORKING_ENABLED
        ? {
            url: `https://mainnet.infura.io/v3/${process.env.INFURA_API_KEY}`,
          }
        : undefined,
    },
    localhost: {
      type: 'http',
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
            runs: 1200,
          },
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
    remappings: [
      '@unruggable/gateways/=node_modules/@unruggable/gateways/',
      '@openzeppelin/contracts-v5/=node_modules/@openzeppelin/contracts-v5/',
      '@openzeppelin/contracts/=node_modules/@openzeppelin/contracts/',
      'clones-with-immutable-args/=node_modules/clones-with-immutable-args/',
    ],
  },
  paths: {
    sources: [
      './contracts',
      './node_modules/@openzeppelin/contracts/utils/introspection/',
      './node_modules/@openzeppelin/contracts/token/ERC1155/',
      './node_modules/@openzeppelin/contracts/token/ERC721/',
    ],
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
