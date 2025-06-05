import { execute } from '@rocketh';
import type { Abi } from 'viem';
import legacyArtifactRaw from '../../deployments/archive/PublicResolver_mainnet_9412610.sol/PublicResolver_mainnet_9412610.json';

const legacyArtifact = {
  ...legacyArtifactRaw,
  metadata: '{}',
  abi: legacyArtifactRaw.abi as Abi,
};

export default execute(
  async ({ deploy, get, namedAccounts, network }) => {
    const { deployer } = namedAccounts;

    const registry = await get('ENSRegistry');

    if (!network.tags?.legacy) {
      return;
    }

    await deploy('LegacyPublicResolver', {
      account: deployer,
      artifact: legacyArtifact,
      args: [registry.address],
    });

    console.log('LegacyPublicResolver deployed successfully');
  },
  {
    id: 'legacy-resolver',
    tags: ['resolvers', 'LegacyPublicResolver'],
    dependencies: ['registry', 'wrapper'],
  }
);
