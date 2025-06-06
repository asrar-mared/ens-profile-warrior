import { execute, artifacts } from '@rocketh';
import { zeroAddress, zeroHash } from 'viem';

export default execute(
  async ({ deploy, get, read, execute: executeContract, namedAccounts, network }) => {
    const { deployer, owner } = namedAccounts;

    if (network.tags?.legacy) {
      const legacyRegistry = await deploy('LegacyENSRegistry', {
        account: owner,
        artifact: artifacts.ENSRegistry,
      });

      if (legacyRegistry.newlyDeployed) {
        // Set owner of root node to owner
        await executeContract(legacyRegistry, {
          functionName: 'setOwner',
          args: [zeroHash, owner],
          account: owner,
        });
        console.log('Set owner of root node to owner on legacy registry');

        // NOTE: The original hardhat-deploy implementation called a 'legacy-registry-names' task here,
        // but this task does not exist anywhere in the codebase.
        // Keeping the original code commented for reference:
        //
        // if (process.env.npm_package_name !== '@ensdomains/ens-contracts') {
        //   console.log('Running legacy registry scripts...')
        //   await run('legacy-registry-names', {
        //     deletePreviousDeployments: false,
        //     resetMemory: false,
        //   })
        // }
        //

        // Revert root ownership
        await executeContract(legacyRegistry, {
          functionName: 'setOwner',
          args: [zeroHash, zeroAddress],
          account: owner,
        });
        console.log('Unset owner of root node on legacy registry');
      }

      await deploy('ENSRegistry', {
        account: deployer,
        artifact: artifacts.ENSRegistryWithFallback,
        args: [legacyRegistry.address],
      });
    } else {
      await deploy('ENSRegistry', {
        account: deployer,
        artifact: artifacts.ENSRegistry,
      });
    }

    if (!network.tags?.use_root) {
      const registry = await get('ENSRegistry');
      const rootOwner = await read(registry, {
        functionName: 'owner',
        args: [zeroHash],
      });

      switch (rootOwner) {
        case deployer:
          await executeContract(registry, {
            functionName: 'setOwner',
            args: [zeroHash, owner],
            account: deployer,
          });
          console.log('Set final owner of root node on registry to owner');
          break;
        case owner:
          console.log('Root node already owned by owner');
          break;
        default:
          console.log(`WARNING: ENS registry root is owned by ${rootOwner}; cannot transfer to owner`);
      }
    }
  },
  {
    id: 'ens',
    tags: ['registry', 'ENSRegistry'],
  }
);
