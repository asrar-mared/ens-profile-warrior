import { execute, artifacts } from '@rocketh'

export default execute(
  async ({ deploy, get, namedAccounts }) => {
    const { deployer } = namedAccounts

    const registry = await get('ENSRegistry')
    const dnssec = await get('DNSSECImpl')

    await deploy('OffchainDNSResolver', {
      account: deployer,
      artifact: artifacts.OffchainDNSResolver,
      args: [
        registry.address,
        dnssec.address,
        'https://dnssec-oracle.ens.domains/',
      ],
    })
  },
  {
    tags: ['OffchainDNSResolver'],
    dependencies: ['registry', 'dnssec-oracle'],
  },
)
