import { execute, artifacts } from '@rocketh';
import { namehash } from 'viem';

export default execute(
  async ({ deploy, get, read, execute, namedAccounts, network }) => {
    const { deployer, owner } = namedAccounts;

    const registry = await get('ENSRegistry');
    const nameWrapper = await get('NameWrapper');
    const controller = await get('ETHRegistrarController');
    const reverseRegistrar = await get('ReverseRegistrar');

    const publicResolver = await deploy('PublicResolver', {
      account: deployer,
      artifact: artifacts.PublicResolver,
      args: [
        registry.address,
        nameWrapper.address,
        controller.address,
        reverseRegistrar.address,
      ],
    });

    if (!publicResolver.newlyDeployed) {
      return;
    }

    console.log('PublicResolver deployed successfully');

    // Only attempt to make configuration changes directly on testnets
    if (network.name === 'mainnet') {
      return;
    }

    // 1. Set default resolver on ReverseRegistrar to PublicResolver
    await execute(reverseRegistrar, {
      functionName: 'setDefaultResolver',
      args: [publicResolver.address],
      account: owner,
    });
    console.log('Set PublicResolver as default resolver on ReverseRegistrar');

    // 2. Set resolver for resolver.eth to PublicResolver (if owned by owner)
    const resolverNode = namehash('resolver.eth');
    const resolverOwner = await read(registry, {
      functionName: 'owner',
      args: [resolverNode],
    });
    
    if (resolverOwner === owner) {
      await execute(registry, {
        functionName: 'setResolver',
        args: [resolverNode, publicResolver.address],
        account: owner,
      });
      console.log('Set resolver for resolver.eth to PublicResolver');

      // 3. Set address for resolver.eth to PublicResolver
      await execute(publicResolver, {
        functionName: 'setAddr',
        args: [resolverNode, publicResolver.address],
        account: owner,
      });
      console.log('Set address for resolver.eth to PublicResolver');
    } else {
      console.log('resolver.eth not owned by deployer, skipping resolver setup');
    }
  },
  {
    id: 'resolver',
    tags: ['resolvers', 'PublicResolver'],
    dependencies: [
      'registry',
      'ETHRegistrarController',
      'NameWrapper',
      'ReverseRegistrar',
    ],
  }
);
