import { execute, artifacts } from '@rocketh';

export default execute(
  async ({ deploy, namedAccounts, network }) => {
    const { deployer } = namedAccounts;

    await deploy('RSASHA1Algorithm', {
      account: deployer,
      artifact: artifacts.RSASHA1Algorithm,
      args: [],
    });

    await deploy('RSASHA256Algorithm', {
      account: deployer,
      artifact: artifacts.RSASHA256Algorithm,
      args: [],
    });

    await deploy('P256SHA256Algorithm', {
      account: deployer,
      artifact: artifacts.P256SHA256Algorithm,
      args: [],
    });

    if (network.tags?.test) {
      await deploy('DummyAlgorithm', {
        account: deployer,
        artifact: artifacts.DummyAlgorithm,
        args: [],
      });
    }
  },
  {
    tags: ['dnssec-algorithms'],
    dependencies: ['BaseRegistrarImplementation'], // not necessary but allows registrar to be deployed first
  }
);
