import type { DeployFunction } from 'hardhat-deploy/types.js'
import type { Address } from 'viem'
import {
  arbitrumSepolia,
  baseSepolia,
  lineaSepolia,
  mainnet,
  optimismSepolia,
  scrollSepolia,
  sepolia,
} from 'viem/chains'
import { coinTypeFromChain } from '../../test/fixtures/ensip19.js'

const owners = {
  [sepolia.id]: '0x343431e9CEb7C19cC8d3eA0EE231bfF82B584910',
  // dao address
  [mainnet.id]: '0xFe89cc7aBB2C4183683ab71653C4cdc9B02D44b7',
} as const

type ResolverDeployment = {
  chain: number
  verifier: Address
  registrar: Address
  gateways: string[]
}

const targets = {
  [sepolia.id]: {
    Base: {
      chain: baseSepolia.id,
      verifier: '0x2a5c43a0aa33c6ca184ac0eadf0a117109c9d6ae',
      registrar: '0x00000BeEF055f7934784D6d81b6BC86665630dbA',
      gateways: ['https://lb.drpc.org/gateway/unruggable?network=base-sepolia'],
    },
    Optimism: {
      chain: optimismSepolia.id,
      verifier: '0x9fc09f6683ea8e8ad0fae3317e39e57582469707',
      registrar: '0x00000BeEF055f7934784D6d81b6BC86665630dbA',
      gateways: [
        'https://lb.drpc.org/gateway/unruggable?network=optimism-sepolia',
      ],
    },
    Arbitrum: {
      chain: arbitrumSepolia.id,
      verifier: '0x5e2a4f6c4cc16b27424249eedb15326207c9ee44',
      registrar: '0x00000BeEF055f7934784D6d81b6BC86665630dbA',
      gateways: [
        'https://lb.drpc.org/gateway/unruggable?network=arbitrum-sepolia',
      ],
    },
    Scroll: {
      chain: scrollSepolia.id,
      verifier: '0xd126DD79133D3aaf0248E858323Cd10C04c5E43d',
      registrar: '0x00000BeEF055f7934784D6d81b6BC86665630dbA',
      gateways: [
        'https://lb.drpc.org/gateway/unruggable?network=scroll-sepolia',
      ],
    },
    Linea: {
      chain: lineaSepolia.id,
      verifier: '0x6AD2BbEE28e780717dF146F59c2213E0EB9CA573',
      registrar: '0x00000BeEF055f7934784D6d81b6BC86665630dbA',
      gateways: [
        'https://lb.drpc.org/gateway/unruggable?network=linea-sepolia',
      ],
    },
  },
} as const satisfies Record<number, Record<string, ResolverDeployment>>

const func: DeployFunction = async function (hre) {
  const { deployer } = await hre.viem.getNamedClients()
  const publicClient = await hre.viem.getPublicClient()

  const defaultReverseRegistrar = await hre.viem
    .getContract('DefaultReverseRegistrar')
    .then((c) => c.address)

  const targetsForChain = targets[publicClient.chain.id as keyof typeof targets]
  const owner = owners[publicClient.chain.id as keyof typeof owners]

  if (!targetsForChain) {
    console.log(`No targets for chain ${publicClient.chain.id}`)
    return
  }
  // there should always be an owner specified when there are targets
  if (!owner) throw new Error(`No owner for chain ${publicClient.chain.id}`)

  for (const [
    chainName,
    { chain, registrar, verifier, gateways },
  ] of Object.entries(targetsForChain)) {
    await hre.viem.deploy(
      'ChainReverseResolver',
      [
        owner,
        coinTypeFromChain(chain),
        defaultReverseRegistrar,
        registrar,
        verifier,
        gateways,
      ],
      {
        alias: `${chainName}ReverseResolver`,
        client: deployer,
      },
    )
  }
}

func.tags = ['ChainReverseResolver']

export default func
