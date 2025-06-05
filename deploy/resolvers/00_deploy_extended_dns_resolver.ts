import { execute, artifacts } from '@rocketh';

export default execute(
  async ({ deploy, namedAccounts }) => {
    const { deployer } = namedAccounts;

    await deploy('ExtendedDNSResolver', {
      account: deployer,
      artifact: artifacts.ExtendedDNSResolver,
    });

    console.log('ExtendedDNSResolver deployed successfully');
  },
  {
    tags: ['resolvers', 'ExtendedDNSResolver'],
  }
);
