#!/usr/bin/env bun
import { createServer } from 'http'

// parse cli args
const args = process.argv.slice(2)
let rpcUrl = ''
let port = '8545'
const accounts: string[] = []

for (let i = 0; i < args.length; i++) {
  switch (args[i]) {
    case '--rpc-url':
      rpcUrl = args[++i]
      break
    case '--port':
      port = args[++i]
      break
    case '--accounts':
      while (args[i + 1] && !args[i + 1].startsWith('--')) {
        accounts.push(args[++i])
      }
      break
  }
}

if (!rpcUrl || accounts.length === 0) {
  console.error(
    'usage: --rpc-url <url> --accounts <addr1> [addr2 ...] [--port <port>]',
  )
  process.exit(1)
}

createServer((req, res) => {
  if (req.method !== 'POST') return res.writeHead(405).end()

  let body = ''
  req.on('data', (chunk) => (body += chunk))
  req.on('end', async () => {
    let reqJson
    try {
      reqJson = JSON.parse(body)
    } catch {
      return res.writeHead(400).end()
    }

    const { id, jsonrpc, method, params } = reqJson

    if (method === 'eth_accounts') {
      res.writeHead(200, { 'Content-Type': 'application/json' })
      return res.end(JSON.stringify({ jsonrpc, id, result: accounts }))
    }

    try {
      const proxyRes = await fetch(rpcUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, jsonrpc, method, params }),
      })
      const text = await proxyRes.text()
      res.writeHead(proxyRes.status, { 'Content-Type': 'application/json' })
      res.end(text)
    } catch (e) {
      console.error('proxy error', e)
      res.writeHead(502).end()
    }
  })
}).listen(Number(port), () => {
  console.log(`proxy on :${port} → ${rpcUrl}`)
})
