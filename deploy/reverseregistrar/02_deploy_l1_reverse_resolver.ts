import { evmChainIdToCoinType } from '@ensdomains/address-encoder/utils'
import type { DeployFunction } from 'hardhat-deploy/types.js'
import {
  arbitrumSepolia,
  baseSepolia,
  lineaSepolia,
  mainnet,
  optimismSepolia,
  scrollSepolia,
  sepolia,
} from 'viem/chains'
import { dnsEncodeName } from '../../test/fixtures/dnsEncodeName.js'
import { getReverseNamespace } from '../../test/fixtures/ensip19.js'

const owners = {
  [sepolia.id]: '0x343431e9CEb7C19cC8d3eA0EE231bfF82B584910',
  // dao address
  [mainnet.id]: '0xFe89cc7aBB2C4183683ab71653C4cdc9B02D44b7',
} as const

const getDnsEncodedReverseName = (chainId: number) => {
  const namespace = getReverseNamespace(evmChainIdToCoinType(chainId))
  return dnsEncodeName(namespace)
}

const targets = {
  [sepolia.id]: {
    Base: {
      dnsEncodedReverseName: getDnsEncodedReverseName(baseSepolia.id),
      verifier: '0x2a5c43a0aa33c6ca184ac0eadf0a117109c9d6ae',
      target: '0x00000BeEF055f7934784D6d81b6BC86665630dbA',
      urls: ['https://lb.drpc.org/gateway/unruggable?network=base-sepolia'],
    },
    Optimism: {
      dnsEncodedReverseName: getDnsEncodedReverseName(optimismSepolia.id),
      verifier: '0x9fc09f6683ea8e8ad0fae3317e39e57582469707',
      target: '0x00000BeEF055f7934784D6d81b6BC86665630dbA',
      urls: ['https://lb.drpc.org/gateway/unruggable?network=optimism-sepolia'],
    },
    Arbitrum: {
      dnsEncodedReverseName: getDnsEncodedReverseName(arbitrumSepolia.id),
      verifier: '0x5e2a4f6c4cc16b27424249eedb15326207c9ee44',
      target: '0x00000BeEF055f7934784D6d81b6BC86665630dbA',
      urls: ['https://lb.drpc.org/gateway/unruggable?network=arbitrum-sepolia'],
    },
    Scroll: {
      dnsEncodedReverseName: getDnsEncodedReverseName(scrollSepolia.id),
      verifier: '0xd126DD79133D3aaf0248E858323Cd10C04c5E43d',
      target: '0x00000BeEF055f7934784D6d81b6BC86665630dbA',
      urls: ['https://lb.drpc.org/gateway/unruggable?network=scroll-sepolia'],
    },
    Linea: {
      dnsEncodedReverseName: getDnsEncodedReverseName(lineaSepolia.id),
      verifier: '0x6AD2BbEE28e780717dF146F59c2213E0EB9CA573',
      target: '0x00000BeEF055f7934784D6d81b6BC86665630dbA',
      urls: ['https://lb.drpc.org/gateway/unruggable?network=linea-sepolia'],
    },
  },
} as const

const func: DeployFunction = async function (hre) {
  const { viem } = hre
  const { deployer } = await viem.getNamedClients()

  const publicClient = await viem.getPublicClient()

  const ensRegistryAddress = await hre.viem
    .getContract('ENSRegistry')
    .then((c) => c.address)

  const targetsForChain = targets[publicClient.chain.id as keyof typeof targets]
  const owner = owners[publicClient.chain.id as keyof typeof owners]

  for (const [
    chainName,
    { verifier, target, urls, dnsEncodedReverseName },
  ] of Object.entries(targetsForChain)) {
    await viem.deploy(
      'L1ReverseResolver',
      [
        owner,
        ensRegistryAddress,
        verifier,
        target,
        dnsEncodedReverseName,
        urls,
      ],
      {
        alias: `${chainName}L1ReverseResolver`,
        client: deployer,
      },
    )
  }
}

func.tags = ['L1ReverseResolver']

export default func
