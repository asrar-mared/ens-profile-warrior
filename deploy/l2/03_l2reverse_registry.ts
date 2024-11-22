import { evmChainIdToCoinType } from '@ensdomains/address-encoder/utils'
import type { DeployFunction } from 'hardhat-deploy/types.js'
import { namehash } from 'viem'
import { base, baseSepolia } from 'viem/chains'

const oldReverseResolvers = {
  [base.id]: '0xC6d566A56A1aFf6508b41f6c90ff131615583BCD',
  [baseSepolia.id]: '0x6533C94869D28fAA8dF77cc63f9e2b2D6Cf77eBA',
} as const

const func: DeployFunction = async function (hre) {
  const { viem } = hre

  const chainId = hre.network.config.chainId!
  const coinType = evmChainIdToCoinType(chainId) as bigint
  const coinTypeHex = coinType.toString(16)

  const REVERSE_NAMESPACE = `${coinTypeHex}.reverse`
  const REVERSENODE = namehash(REVERSE_NAMESPACE)

  console.log(
    `REVERSE_NAMESPACE for chainId ${chainId} is ${REVERSE_NAMESPACE}`,
  )
  console.log(
    `Deploying L2ReverseResolver with REVERSENODE ${REVERSENODE} and coinType ${coinTypeHex}`,
  )

  const oldReverseResolver =
    oldReverseResolvers[chainId as keyof typeof oldReverseResolvers] || null
  if (oldReverseResolver) {
    console.log('Deploying with migration')
    await viem.deploy('L2ReverseRegistryWithMigration', [
      REVERSENODE,
      coinType,
      oldReverseResolver,
    ])
  } else {
    await viem.deploy('L2ReverseRegistry', [REVERSENODE, coinType])
  }
}

func.tags = ['L2ReverseRegistry', 'l2']

export default func
