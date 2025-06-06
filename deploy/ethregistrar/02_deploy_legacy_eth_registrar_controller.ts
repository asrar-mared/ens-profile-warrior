import { execute } from '@rocketh'
import type { Address, Abi } from 'viem'
import legacyArtifactRaw from '../../deployments/archive/ETHRegistrarController_mainnet_9380471.sol/ETHRegistrarController_mainnet_9380471.json'

const legacyArtifact = {
  ...legacyArtifactRaw,
  metadata: '{}',
  abi: legacyArtifactRaw.abi as Abi,
}

export default execute(
  async ({ deploy, get, execute: executeContract, namedAccounts }) => {
    const { deployer, owner } = namedAccounts

    const registrar = await get('BaseRegistrarImplementation')
    const priceOracle = await get('ExponentialPremiumPriceOracle')
    const reverseRegistrar = await get('ReverseRegistrar')

    const controller = await deploy('LegacyETHRegistrarController', {
      account: deployer,
      artifact: legacyArtifact,
      args: [registrar.address, priceOracle.address, 60n, 86400n],
    })

    if (!controller.newlyDeployed) {
      return
    }

    console.log('LegacyETHRegistrarController deployed successfully')

    // 1. Add controller as controller on registrar
    await executeContract(registrar, {
      functionName: 'addController',
      args: [controller.address as Address],
      account: owner,
    })
    console.log('Added controller as controller on registrar')

    // 2. Set controller of ReverseRegistrar to controller
    await executeContract(reverseRegistrar, {
      functionName: 'setController',
      args: [controller.address as Address, true],
      account: owner,
    })
    console.log('Set controller of ReverseRegistrar to controller')

    // NOTE: The original hardhat-deploy implementation called a 'register-unwrapped-names' task here,
    // but this task does not exist anywhere in the codebase.
    // Keeping the original code commented for reference:
    //
    // if (process.env.npm_package_name !== '@ensdomains/ens-contracts') {
    //   console.log('Running unwrapped name registrations...')
    //   await run('register-unwrapped-names', {
    //     deletePreviousDeployments: false,
    //     resetMemory: false,
    //   })
    // }
    //
    // Since the task doesn't exist and appears to be dead code, this functionality has been omitted.
  },
  {
    id: 'legacy-controller',
    tags: ['LegacyETHRegistrarController'],
    dependencies: [
      'registry',
      'wrapper',
      'LegacyPublicResolver',
      'ExponentialPremiumPriceOracle',
      'ReverseRegistrar',
    ],
  },
)
