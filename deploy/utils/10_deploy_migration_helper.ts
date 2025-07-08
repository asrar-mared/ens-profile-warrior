import { execute, artifacts } from '../../rocketh.js'

export default execute(
  async ({ deploy, get, namedAccounts }) => {
    const { deployer, owner } = namedAccounts

    const registrar = await get('BaseRegistrarImplementation')
    const wrapper = await get('NameWrapper')

    await deploy('MigrationHelper', {
      account: deployer,
      artifact: artifacts.MigrationHelper,
      args: [registrar.address, wrapper.address],
    })

    if (owner && owner.address !== deployer.address) {
      const migrationHelper = await get('MigrationHelper')
      const hash = await migrationHelper.write.transferOwnership([
        owner.address,
      ])
      console.log(`Transfer ownership to ${owner.address} (tx: ${hash})...`)
    }
  },
  {
    id: 'MigrationHelper v1.0.0',
    tags: ['category:utils', 'MigrationHelper'],
    dependencies: ['BaseRegistrarImplementation', 'NameWrapper'],
  },
)
