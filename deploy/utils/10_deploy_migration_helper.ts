import { execute, artifacts } from '@rocketh'

export default execute(
  async ({ deploy, get, execute: executeContract, namedAccounts }) => {
    const { deployer, owner } = namedAccounts

    const registrar = await get('BaseRegistrarImplementation')
    const wrapper = await get('NameWrapper')

    const migrationHelper = await deploy('MigrationHelper', {
      account: deployer,
      artifact: artifacts.MigrationHelper,
      args: [registrar.address, wrapper.address],
    })

    if (!migrationHelper.newlyDeployed) {
      return
    }

    console.log('MigrationHelper deployed successfully')

    // Transfer ownership to owner if different from deployer
    if (owner !== deployer) {
      await executeContract(migrationHelper, {
        functionName: 'transferOwnership',
        args: [owner],
        account: deployer,
      })
      console.log(`Transferred ownership to ${owner}`)
    }
  },
  {
    id: 'migration-helper',
    tags: ['utils', 'MigrationHelper'],
    dependencies: ['BaseRegistrarImplementation', 'NameWrapper'],
  },
)
