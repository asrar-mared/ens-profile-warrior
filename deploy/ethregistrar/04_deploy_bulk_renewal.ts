import { execute, artifacts } from '@rocketh';
import { namehash, zeroAddress, type Address } from 'viem';
import { createInterfaceId } from '../../test/fixtures/createInterfaceId.js';

export default execute(
  async ({ deploy, get, read, execute: executeContract, namedAccounts, network }) => {
    const { deployer } = namedAccounts;

    const registry = await get('ENSRegistry');
    const controller = await get('ETHRegistrarController');

    const bulkRenewal = await deploy('StaticBulkRenewal', {
      account: deployer,
      artifact: artifacts.StaticBulkRenewal,
      args: [controller.address],
    });

    if (!bulkRenewal.newlyDeployed) {
      return;
    }

    console.log('StaticBulkRenewal deployed successfully');

    // Only attempt to make resolver etc changes directly on testnets
    if (network.name === 'mainnet') {
      return;
    }

    const interfaceId = createInterfaceId(artifacts.IBulkRenewal.abi);
    
    const resolver = await read(registry, {
      functionName: 'resolver',
      args: [namehash('eth')],
    });

    if (resolver === zeroAddress) {
      console.log(
        `No resolver set for .eth; not setting interface ${interfaceId} for BulkRenewal`,
      );
      return;
    }

    // Set interface on the resolver - assuming the resolver is the OwnedResolver
    // In practice, this would need to check if the resolver supports the setInterface function
    const ownedResolver = await get('OwnedResolver');
    
    // Only set interface if the resolver is actually the OwnedResolver we deployed
    if (resolver === ownedResolver.address) {
      await executeContract(ownedResolver, {
        functionName: 'setInterface',
        args: [namehash('eth'), interfaceId, bulkRenewal.address as Address],
        account: deployer,
      });
      console.log(`Set BulkRenewal interface ID ${interfaceId} on .eth resolver`);
    } else {
      console.log(`Resolver at ${resolver} is not our OwnedResolver, skipping interface setup`);
    }
  },
  {
    id: 'bulk-renewal',
    tags: ['BulkRenewal'],
    dependencies: ['registry'],
  }
);
