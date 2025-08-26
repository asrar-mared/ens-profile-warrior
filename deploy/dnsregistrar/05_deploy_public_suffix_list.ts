import { execute, artifacts } from '@rocketh'
import { dnsEncodeName } from '../../test/fixtures/dnsEncodeName.js'

async function fetchPublicSuffixes() {
  const res = await fetch(
    'https://publicsuffix.org/list/public_suffix_list.dat',
    { headers: { Connection: 'close' } },
  )
  if (!res.ok) throw new Error(`expected suffixes: ${res.status}`)
  return (await res.text())
    .split('\n')
    .map((x) => x.trim())
    .filter((x) => x && !x.startsWith('//'))
}

export default execute(
  async ({ deploy, execute, namedAccounts: { deployer, owner } }) => {
    const psl = await deploy('SimplePublicSuffixList', {
      account: deployer,
      artifact: artifacts.SimplePublicSuffixList,
      args: [],
    })

    if (!psl.newlyDeployed) {
      return
    }

    console.log('SimplePublicSuffixList deployed successfully')

    // Transfer ownership to owner if different from deployer
    if (owner !== deployer) {
      await execute(psl, {
        functionName: 'transferOwnership',
        args: [owner],
        account: deployer,
      })
      console.log('Transferred ownership to owner account')
    }

    // Fetch and set public suffix list
    const suffixes0: string[] = process.env.SUFFIX_LIST
      ? process.env.SUFFIX_LIST.split(',')
      : await fetchPublicSuffixes()

    // Right now we're only going to support top-level, non-idna suffixes
    const suffixes = suffixes0.filter((suffix) => suffix.match(/^[a-z0-9]+$/))

    console.log(`Starting suffix transactions for ${suffixes.length} suffixes`)
    const totalBatches = Math.ceil(suffixes.length / 100)
    let successfulBatches = 0
    let failedBatches = 0

    // Send transactions sequentially to avoid nonce conflicts
    for (let i = 0; i < suffixes.length; i += 100) {
      const batch = suffixes
        .slice(i, i + 100)
        .map((suffix) => dnsEncodeName(suffix))

      const batchIndex = Math.floor(i / 100) + 1
      console.log(
        `Sending suffixes batch ${batchIndex}/${totalBatches} (${batch.length} suffixes)`,
      )

      try {
        await execute(psl, {
          functionName: 'addPublicSuffixes',
          args: [batch],
          account: owner,
        })
        successfulBatches++
        console.log(`Batch ${batchIndex} completed successfully`)
      } catch (error) {
        failedBatches++
        console.error(
          `Batch ${batchIndex} failed:`,
          error instanceof Error ? error.message : error,
        )
        // Continue with next batch
      }
    }

    console.log(
      `Public suffix list configuration completed: ${successfulBatches} successful, ${failedBatches} failed`,
    )
  },
  {
    id: 'SimplePublicSuffixList v1.0.0',
    tags: ['category:dnsregistrar', 'SimplePublicSuffixList'],
    dependencies: [],
  },
)
