import { evmChainIdToCoinType } from '@ensdomains/address-encoder/utils'
import type { ContractNetworkConfig } from '@safe-global/protocol-kit'
import fs from 'fs'
import type {
  DeployFunction,
  DeploymentSubmission,
} from 'hardhat-deploy/types.js'
import type { HardhatRuntimeEnvironment } from 'hardhat/types/runtime.js'
import path from 'path'
import {
  encodeDeployData,
  encodeFunctionData,
  keccak256,
  namehash,
  parseAbi,
  stringToHex,
  type Hash,
  type Hex,
  type TransactionReceipt,
} from 'viem'
import { base, baseSepolia } from 'viem/chains'

const safeConfig = {
  testnet: {
    safeAddress: '0x343431e9CEb7C19cC8d3eA0EE231bfF82B584910',
    expectedDeploymentAddress: '0xAe91c512BC1da8B00cd33dd9D9C734069e6E0fcd',
  },
  mainnet: {
    safeAddress: '0x353530FE74098903728Ddb66Ecdb70f52e568eC1',
    expectedDeploymentAddress: '0xa4a5CaA360A81461158C96f2Dbad8944411CF3fd',
  },
} as const

const create3ProxyAddress =
  '0x004eE012d77C5D0e67D861041D11824f51B590fb' as const

const oldReverseResolvers = {
  [base.id]: '0xC6d566A56A1aFf6508b41f6c90ff131615583BCD',
  [baseSepolia.id]: '0x6533C94869D28fAA8dF77cc63f9e2b2D6Cf77eBA',
} as const

const safeDeploy = async (
  hre: HardhatRuntimeEnvironment,
  {
    reverseNode,
    coinType,
  }: {
    reverseNode: Hex
    coinType: bigint
  },
) => {
  const networkType = hre.network.tags.testnet ? 'testnet' : 'mainnet'
  const { safeAddress, expectedDeploymentAddress } = safeConfig[networkType]
  const deployConfig = (() => {
    if (
      hre.network.config.chainId === base.id ||
      hre.network.config.chainId === baseSepolia.id
    )
      return {
        artifactName: 'L2ReverseRegistrarWithMigration',
        deploymentArgs: [
          reverseNode,
          coinType,
          safeAddress,
          oldReverseResolvers[hre.network.config.chainId],
        ] as [Hex, bigint, Hex, Hex],
      } as const
    return {
      artifactName: 'L2ReverseRegistrar',
      deploymentArgs: [reverseNode, coinType] as [Hex, bigint],
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
    deployment: DeploymentSubmission
    receipt: TransactionReceipt
  }) => {
    const currentBytecode = await provider.getBytecode({
      address: expectedDeploymentAddress,
    })
    if (!currentBytecode) throw new Error('L2ReverseRegistrar not deployed')

    console.log(
      `"L2ReverseRegistrar" deployed at: ${expectedDeploymentAddress} with ${receipt.gasUsed} gas`,
    )
    deployment.receipt = {
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

    await hre.deployments.save('L2ReverseRegistrar', deployment)
  }

  const { default: SafeApiKit } = await import('@safe-global/api-kit').then(
    (m) => m.default,
  )
  const { default: Safe } = await import('@safe-global/protocol-kit').then(
    (m) => m.default,
  )

  const provider = await hre.viem.getPublicClient()
  const privateKey = process.env.SAFE_PROPOSER_KEY!

  if (networkType === 'mainnet') {
    const pendingSafeTransactionsFile = path.join(
      hre.config.paths.deployments,
      hre.network.name,
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
        chainId: BigInt(hre.network.config.chainId!),
      })
      const safeTransaction = await apiKit.getTransaction(
        existingTransaction.safeTransactionHash,
      )
      if (!safeTransaction) throw new Error('Safe transaction not found')
      if (!safeTransaction.isExecuted)
        throw new Error('Safe transaction not yet executed')
      if (!safeTransaction.isSuccessful)
        throw new Error('Safe transaction failed')

      const receipt = await provider.getTransactionReceipt({
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

      return
    }
  }

  const protocolKit = await Safe.init({
    provider: provider.transport,
    signer: privateKey,
    safeAddress,
    contractNetworks: {
      [hre.network.config.chainId!]: {
        createCallAddress: '0x9b35Af71d77eaf8d7e40252370304687390A1A52',
        fallbackHandlerAddress: '0xfd0732Dc9E303f09fCEf3a7388Ad10A83459Ec99',
        multiSendAddress: '0x38869bf66a61cF6bDB996A6aE40D5853Fd43B526',
        multiSendCallOnlyAddress: '0x9641d764fc13c8B624c04430C7356C1C7C8102e2',
        safeProxyFactoryAddress: '0x4e1DCf7AD4e460CfD30791CCC4F9c8a4f820ec67',
        safeSingletonAddress: '0x29fcB43b46531BcA003ddC8FCB67FFE91900C762',
      } as ContractNetworkConfig,
    },
  })

  const { abi, ...extendedArtifact } =
    await hre.deployments.getExtendedArtifact(deployConfig.artifactName)
  const deployData = encodeDeployData({
    abi,
    bytecode: extendedArtifact.bytecode as Hex,
    args: deployConfig.deploymentArgs,
  })
  const create3Transaction = encodeFunctionData({
    abi: parseAbi([
      'function deployDeterministic(bytes initCode, bytes32 salt) returns (address)',
    ]),
    args: [deployData, keccak256(stringToHex('L2ReverseRegistrar v1.0.0'))],
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
    ...extendedArtifact,
  } as unknown as DeploymentSubmission

  if (networkType === 'testnet') {
    safeTransaction.addSignature(signature)

    const { hash } = await protocolKit.executeTransaction(safeTransaction)
    const receipt = await provider.waitForTransactionReceipt({
      hash: hash as Hash,
    })
    if (receipt.status !== 'success') throw new Error('Transaction failed')
    await confirmAndSave({ deployment, receipt })
  } else {
    const apiKit = new SafeApiKit({
      chainId: BigInt(hre.network.config.chainId!),
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
      hre.config.paths.deployments,
      hre.network.name,
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
  }
}

const func: DeployFunction = async function (hre) {
  const { viem } = hre

  const chainId = hre.network.config.chainId!
  const coinType = evmChainIdToCoinType(chainId) as bigint
  const coinTypeHex = coinType.toString(16)

  const REVERSE_NAMESPACE = `${coinTypeHex}.reverse`
  const REVERSENODE = namehash(REVERSE_NAMESPACE)

  if (process.env.SAFE_PROPOSER_KEY && hre.network.saveDeployments) {
    await safeDeploy(hre, {
      reverseNode: REVERSENODE,
      coinType,
    })
  } else {
    console.log(`Deploying L2ReverseRegistrar on ${hre.network.name} with:`)
    console.log(`reverseNode: ${REVERSENODE}`)
    console.log(`coinType: ${coinType}`)

    await viem.deploy('L2ReverseRegistrar', [REVERSENODE, coinType])
  }
}

func.dependencies = ['UniversalSigValidator']
func.tags = ['L2ReverseRegistrar', 'l2']

export default func
