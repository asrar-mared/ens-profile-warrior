import { execute, artifacts } from '@rocketh'

export default execute(
  async ({ deploy, get, namedAccounts, network }) => {
    const { deployer } = namedAccounts

    if (!network.tags?.use_root) {
      return
    }

    const registry = await get('ENSRegistry')

    await deploy('Root', {
      account: deployer,
      artifact: artifacts.Root,
      args: [registry.address],
    })
  },
  {
    id: 'root',
    tags: ['root', 'Root'],
    dependencies: ['ENSRegistry'],
  },
)
