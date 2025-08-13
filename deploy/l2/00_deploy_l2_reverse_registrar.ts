import { evmChainIdToCoinType } from '@ensdomains/address-encoder/utils'
import { execute, artifacts } from '@rocketh'
import { concatHex, encodeDeployData, encodeFunctionData, Hash, Hex, keccak256, namehash, parseAbi, stringToHex, TransactionReceipt } from 'viem'
import { base, baseSepolia } from 'viem/chains'

export const safeConfig = {
  testnet: {
    safeAddress: '0x343431e9CEb7C19cC8d3eA0EE231bfF82B584910',
    baseDeploymentSalt:
      '0xb42292a18122332f920fcf3af8efe05e2c97a83802dfe4dd01dee7dec47f66ae',
    expectedDeploymentAddress: '0x00000BeEF055f7934784D6d81b6BC86665630dbA',
  },
  mainnet: {
    safeAddress: '0x353530FE74098903728Ddb66Ecdb70f52e568eC1',
    baseDeploymentSalt:
      '0xc68333947ff61550c9b629abed325e2244278524f8e5782579f1dd2ea46c0c4f',
    expectedDeploymentAddress: '0x0000000000D8e504002cC26E3Ec46D81971C1664',
  },
} as const

const create3ProxyAddress =
  '0x004eE012d77C5D0e67D861041D11824f51B590fb' as const

const oldReverseResolvers = {
  [base.id]: '0xC6d566A56A1aFf6508b41f6c90ff131615583BCD',
  [baseSepolia.id]: '0x6533C94869D28fAA8dF77cc63f9e2b2D6Cf77eBA',
} as const


export default execute(
  async ({ deploy, namedAccounts, network }) => {
    const { deployer } = namedAccounts
    const chainId = network.chain.id
    const coinType = evmChainIdToCoinType(chainId) as bigint
    const coinTypeHex = coinType.toString(16)
  
    const REVERSE_NAMESPACE = `${coinTypeHex}.reverse`
    const REVERSENODE = namehash(REVERSE_NAMESPACE)
  
    // Determine if this is a Base chain that needs migration support
    const isBaseChain = chainId === 8453 || chainId === 84532 // Base mainnet or Base Sepolia
  
    if (isBaseChain) {
      // For Base chains, we need the migration version
      const safeAddress = network.tags.testnet
        ? '0x343431e9CEb7C19cC8d3eA0EE231bfF82B584910'
        : '0x353530FE74098903728Ddb66Ecdb70f52e568eC1'
  
      const oldReverseResolver =
        chainId === 8453
          ? '0xC6d566A56A1aFf6508b41f6c90ff131615583BCD' // Base mainnet
          : '0x6533C94869D28fAA8dF77cc63f9e2b2D6Cf77eBA' // Base Sepolia
  
      await deploy('L2ReverseRegistrar', {
        account: deployer,
        artifact: artifacts.L2ReverseRegistrarWithMigration,
        args: [coinType, safeAddress, REVERSENODE, oldReverseResolver],
      })
    } else {
      // For other L2 chains, use the standard version
      await deploy('L2ReverseRegistrar', {
        account: deployer,
        artifact: artifacts.L2ReverseRegistrar,
        args: [coinType],
      })
    }
  },  
  {
    id: 'L2ReverseRegistrar v1.0.0',
    tags: ['category:l2', 'L2ReverseRegistrar'],
    dependencies: ['UniversalSigValidator'],
  },
)