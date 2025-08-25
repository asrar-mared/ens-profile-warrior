import { execute, artifacts } from '@rocketh'

export default execute(
  async ({ deploy, get, execute: write, namedAccounts }) => {
    const { deployer, owner } = namedAccounts

    const registrar = await get('BaseRegistrarImplementation')
    const wrapper = await get('NameWrapper')

    await deploy('MigrationHelper', {
      account: deployer,
      artifact: artifacts.MigrationHelper,
      args: [registrar.address, wrapper.address],
    })

    if (owner && owner !== deployer) {
      const migrationHelper = await get('MigrationHelper')
      const hash = await write(migrationHelper, {
        account: deployer,
        functionName: 'transferOwnership',
        args: [owner]
      });
      console.log(`Transfer ownership to ${owner} (tx: ${hash})...`)
    }
  },
  {
    id: 'MigrationHelper v1.0.0',
    tags: ['category:utils', 'MigrationHelper'],
    dependencies: ['BaseRegistrarImplementation', 'NameWrapper'],
  },
)
