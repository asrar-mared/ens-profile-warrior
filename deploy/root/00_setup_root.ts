import { execute } from '@rocketh';
import { zeroHash, type Address } from 'viem';

export default execute(
  async ({ get, read, execute: executeContract, namedAccounts, network }) => {
    const { deployer, owner } = namedAccounts;

    if (!network.tags?.use_root) {
      return;
    }

    console.log('Running root setup');

    const registry = await get('ENSRegistry');
    const root = await get('Root');

    // 1. Set owner of root node to root contract
    await executeContract(registry, {
      functionName: 'setOwner',
      args: [zeroHash, root.address],
      account: deployer,
    });
    console.log('Set owner of root node to root contract');

    // 2. Check current root owner and transfer if needed
    const rootOwner = await read(root, {
      functionName: 'owner',
      args: [],
    }) as Address;

    switch (rootOwner.toLowerCase()) {
      case deployer.toLowerCase():
        await executeContract(root, {
          functionName: 'transferOwnership',
          args: [owner],
          account: deployer,
        });
        console.log('Transferred root ownership to final owner');
        // Fallthrough to set controller
      case owner.toLowerCase():
        const ownerIsRootController = await read(root, {
          functionName: 'controllers',
          args: [owner],
        });
        if (!ownerIsRootController) {
          await executeContract(root, {
            functionName: 'setController',
            args: [owner, true],
            account: owner,
          });
          console.log('Set final owner as controller on root contract');
        }
        break;
      default:
        console.log(`WARNING: Root is owned by ${rootOwner}; cannot transfer to owner account`);
    }
  },
  {
    id: 'setupRoot',
    tags: ['setupRoot'],
    dependencies: ['Root'],
  }
);
