import { createWalletClient, http } from 'viem'
import { createAnvil } from '@viem/anvil'
import { executeDeployScripts, resolveConfig } from 'rocketh'

const anvil = createAnvil()
await anvil.start()

const hostPort = `http://${anvil.host}:${anvil.port}`

const client = createWalletClient({
  transport: http(hostPort),
})

const [deployer, owner] = await client.requestAddresses()
const accounts = { deployer, owner }

process.env.BATCH_GATEWAY_URLS = '["x-batch-gateway:true"]'

const env = await executeDeployScripts(
  resolveConfig({
    network: {
      name: 'local',
      tags: ['test', 'legacy', 'use_root'],
      nodeUrl: hostPort,
      fork: false,
    },
    accounts,
    askBeforeProceeding: false,
    saveDeployments: false,
  }),
)

console.log(accounts)

console.log(
  Object.fromEntries(
    Object.entries(env.deployments).map(([key, { address }]) => [key, address]),
  ),
)

// the execa logic is completely broken and makes no sense
// await anvil.stop();

// anyway, this was launched as a child process
// so we can just exit
process.exit()

// TODO: maybe this should be `bun run devnet`?
