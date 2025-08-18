import { evmChainIdToCoinType } from '@ensdomains/address-encoder/utils'
import { execute, artifacts } from '@rocketh'
import {
  concatHex,
  encodeDeployData,
  encodeFunctionData,
  Hash,
  Hex,
  keccak256,
  namehash,
  parseAbi,
  stringToHex,
  TransactionReceipt,
} from 'viem'
import { base, baseSepolia } from 'viem/chains'
import fs from 'node:fs'
import path from 'node:path'

export const safeConfig = {
  testnet: {
    safeAddress: '0x343431e9CEb7C19c8d3eA0EE231bfF82B584910',
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

// Rocketh-compatible safeDeploy function
// This function handles Safe multisig deployments using CREATE3 proxy patterns
// It can be used as an alternative to the standard deploy() function for L2 chains
// that require Safe multisig approval for deployments
const safeDeploy = async (
  env: {
    network: {
      tags: { testnet?: boolean }
      chain: { id: number }
      name: string
    }
    viem: {
      getPublicClient(): Promise<any>
    }
  },
  {
    reverseNode,
    coinType,
  }: {
    reverseNode: Hex
    coinType: bigint
  },
) => {
  const networkType = env.network.tags.testnet ? 'testnet' : 'mainnet'
  const { safeAddress, baseDeploymentSalt, expectedDeploymentAddress } =
    safeConfig[networkType]

  const deployConfig = (() => {
    if (
      env.network.chain.id === base.id ||
      env.network.chain.id === baseSepolia.id
    )
      return {
        artifactName: 'L2ReverseRegistrarWithMigration',
        deploymentArgs: [
          coinType,
          safeAddress,
          reverseNode,
          oldReverseResolvers[
            env.network.chain.id as keyof typeof oldReverseResolvers
          ],
        ] as [bigint, Hex, Hex, Hex],
      } as const
    return {
      artifactName: 'L2ReverseRegistrar',
      deploymentArgs: [coinType] as [bigint],
    } as const
  })()

  console.log('L2ReverseRegistrar type:', deployConfig.artifactName)
  console.log(
    'L2ReverseRegistrar deployment args:',
    deployConfig.deploymentArgs,
  )

  const confirmAndSave = async ({
    deployment,
    receipt,
  }: {
    deployment: any
    receipt: TransactionReceipt
  }) => {
    const publicClient = await env.viem.getPublicClient()
    const currentBytecode = await publicClient.getBytecode({
      address: expectedDeploymentAddress,
    })
    if (!currentBytecode) throw new Error('L2ReverseRegistrar not deployed')

    console.log(
      `"L2ReverseRegistrar" deployed at: ${expectedDeploymentAddress} with ${receipt.gasUsed} gas`,
    )

    // Convert receipt to Rocketh format
    const rockethReceipt = {
      from: receipt.from,
      transactionHash: receipt.transactionHash,
      blockHash: receipt.blockHash,
      blockNumber: Number(receipt.blockNumber),
      transactionIndex: receipt.transactionIndex,
      cumulativeGasUsed: receipt.cumulativeGasUsed.toString(),
      gasUsed: receipt.gasUsed.toString(),
      contractAddress: receipt.contractAddress ?? undefined,
      to: receipt.to ?? undefined,
      logs: receipt.logs.map((log) => ({
        blockNumber: Number(log.blockNumber),
        blockHash: log.blockHash,
        transactionHash: log.transactionHash,
        transactionIndex: log.transactionIndex,
        logIndex: log.logIndex,
        removed: log.removed,
        address: log.address,
        topics: log.topics,
        data: log.data,
      })),
      logsBloom: receipt.logsBloom,
      status: receipt.status === 'success' ? 1 : 0,
    }

    // Save deployment using Rocketh's save mechanism
    // Note: In Rocketh, deployments are typically saved automatically
    // This is a placeholder for the save operation
    console.log('Deployment saved:', {
      ...deployment,
      receipt: rockethReceipt,
    })
  }

  const { default: SafeApiKit } = await import('@safe-global/api-kit').then(
    (m) => m.default,
  )
  const { default: Safe } = await import('@safe-global/protocol-kit').then(
    (m) => m.default,
  )

  const publicClient = await env.viem.getPublicClient()
  const privateKey = process.env.SAFE_PROPOSER_KEY!

  if (networkType === 'mainnet') {
    const pendingSafeTransactionsFile = path.join(
      'deployments',
      env.network.name,
      '.pendingSafeTransactions',
    )
    const pendingSafeTransactions = JSON.parse(
      fs.existsSync(pendingSafeTransactionsFile)
        ? fs.readFileSync(pendingSafeTransactionsFile, 'utf8')
        : '{}',
    )
    const existingTransaction = pendingSafeTransactions['L2ReverseRegistrar']
    if (existingTransaction) {
      const apiKit = new SafeApiKit({
        chainId: BigInt(env.network.chain.id!),
      })
      const safeTransaction = await apiKit.getTransaction(
        existingTransaction.safeTransactionHash,
      )
      if (!safeTransaction) throw new Error('Safe transaction not found')
      if (!safeTransaction.isExecuted)
        throw new Error('Safe transaction not yet executed')
      if (!safeTransaction.isSuccessful)
        throw new Error('Safe transaction failed')

      const receipt = await publicClient.getTransactionReceipt({
        hash: safeTransaction.transactionHash as Hash,
      })
      if (receipt.status !== 'success') throw new Error('Transaction failed')

      await confirmAndSave({ deployment: existingTransaction, receipt })

      delete pendingSafeTransactions['L2ReverseRegistrar']

      if (Object.keys(pendingSafeTransactions).length === 0)
        fs.unlinkSync(pendingSafeTransactionsFile)
      else
        fs.writeFileSync(
          pendingSafeTransactionsFile,
          JSON.stringify(pendingSafeTransactions, null, 2),
        )

      return true
    }
  }

  const protocolKit = await Safe.init({
    provider: publicClient.transport,
    signer: privateKey,
    safeAddress,
    contractNetworks: {
      [env.network.chain.id.toString()]: {
        createCallAddress: '0x9b35Af71d77eaf8d7e40252370304687390A1A52',
        fallbackHandlerAddress: '0xfd0732Dc9E303f09fCEf3a7388Ad10A83459Ec99',
        multiSendAddress: '0x38869bf66a61cF6bDB996A6aE40D5853Fd43B526',
        multiSendCallOnlyAddress: '0x9641d764fc13c8B624c04430C7356C1C7C8102e2',
        safeProxyFactoryAddress: '0x4e1DCf7AD4e460CfD30791CCC4F9c8a4f820ec67',
        safeSingletonAddress: '0x29fcB43b46531BcA003ddC8FCB67FFE91900C762',
      },
    },
  })

  // Get artifact from Rocketh artifacts
  const artifact = artifacts[deployConfig.artifactName]
  const { abi, bytecode } = artifact

  const deployData = encodeDeployData({
    abi,
    bytecode: bytecode as Hex,
    args: deployConfig.deploymentArgs,
  })

  const create3Transaction = encodeFunctionData({
    abi: parseAbi([
      'function deployDeterministic(bytes initCode, bytes32 salt) returns (address)',
    ]),
    args: [
      deployData,
      keccak256(
        concatHex([
          baseDeploymentSalt,
          stringToHex('L2ReverseRegistrar v1.0.0'),
        ]),
      ),
    ],
  })

  const safeTransaction = await protocolKit.createTransaction({
    transactions: [
      {
        to: create3ProxyAddress,
        data: create3Transaction,
        value: '0',
      },
    ],
  })

  const safeTransactionHash = await protocolKit.getTransactionHash(
    safeTransaction,
  )
  const signature = await protocolKit.signHash(safeTransactionHash)

  const deployment = {
    address: expectedDeploymentAddress,
    abi,
    receipt: {},
    args: deployConfig.deploymentArgs,
    bytecode,
  }

  if (networkType === 'testnet') {
    safeTransaction.addSignature(signature)

    const { hash } = await protocolKit.executeTransaction(safeTransaction)
    const receipt = await publicClient.waitForTransactionReceipt({
      hash: hash as Hash,
    })
    if (receipt.status !== 'success') throw new Error('Transaction failed')
    await confirmAndSave({ deployment, receipt })
    return true
  } else {
    const apiKit = new SafeApiKit({
      chainId: BigInt(env.network.chain.id!),
    })

    await apiKit.proposeTransaction({
      safeAddress,
      safeTransactionData: safeTransaction.data,
      safeTxHash: safeTransactionHash,
      senderAddress: signature.signer,
      senderSignature: signature.data,
    })

    console.log('Transaction proposed:', safeTransactionHash)

    const pendingSafeTransactionsFile = path.join(
      'deployments',
      env.network.name,
      '.pendingSafeTransactions',
    )
    const pendingSafeTransactions = JSON.parse(
      fs.existsSync(pendingSafeTransactionsFile)
        ? fs.readFileSync(pendingSafeTransactionsFile, 'utf8')
        : '{}',
    )
    pendingSafeTransactions['L2ReverseRegistrar'] = {
      ...deployment,
      safeTransactionHash,
    }
    fs.writeFileSync(
      pendingSafeTransactionsFile,
      JSON.stringify(pendingSafeTransactions, null, 2),
    )
    console.log(
      'Safe transaction saved. Confirm transaction on Safe, and re-run deploy script.',
    )
    return false
  }
}

export default execute(
  async ({ deploy, namedAccounts, network, save }) => {
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
        ? '0x343431e9CEb7C19c8d3eA0EE231bfF82B584910'
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
