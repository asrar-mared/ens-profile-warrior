import { execute, artifacts } from '@rocketh'
import type { Address } from 'viem'

const TESTNET_WRAPPER_ADDRESSES = {
  goerli: [
    '0x582224b8d4534F4749EFA4f22eF7241E0C56D4B8',
    '0xEe1F756aCde7E81B2D8cC6aB3c8A1E2cE6db0F39',
    '0x060f1546642E67c485D56248201feA2f9AB1803C',
    // Add more testnet NameWrapper addresses here...
  ],
}

export default execute(
  async ({
    deploy,
    get,
    read,
    execute: executeContract,
    namedAccounts,
    network,
    unnamedAccounts,
  }) => {
    const { deployer, owner } = namedAccounts

    // Get all available clients using rocketh's unnamedAccounts (equivalent to getUnnamedClients)
    const clients = [
      { address: deployer },
      { address: owner },
      ...unnamedAccounts.map((addr) => ({ address: addr })),
    ]

    console.log(`Available accounts for contract operations: ${clients.length}`)

    // only deploy on testnets
    if (network.name === 'mainnet') return

    const registry = await get('ENSRegistry')
    const registrar = await get('BaseRegistrarImplementation')

    const testUnwrapDeployment = await deploy('TestUnwrap', {
      account: deployer,
      artifact: artifacts.TestUnwrap,
      args: [registry.address, registrar.address],
    })

    if (!testUnwrapDeployment.newlyDeployed) return

    console.log('TestUnwrap deployed successfully')

    const testnetWrapperAddresses = TESTNET_WRAPPER_ADDRESSES[
      network.name as keyof typeof TESTNET_WRAPPER_ADDRESSES
    ] as Address[]

    if (!testnetWrapperAddresses || testnetWrapperAddresses.length === 0) {
      console.log('No testnet wrappers found, skipping')
      return
    }

    // Get TestUnwrap contract and its owner
    const contractOwner = await read(testUnwrapDeployment, {
      functionName: 'owner',
      args: [],
    })

    const contractOwnerClient = clients.find((c) => c.address === contractOwner)
    const canModifyTestUnwrap = !!contractOwnerClient

    if (!canModifyTestUnwrap) {
      console.log(
        "WARNING: Can't modify TestUnwrap, will not run setWrapperApproval()",
      )
    }

    for (const wrapperAddress of testnetWrapperAddresses) {
      try {
        // Create wrapper contract object for external contract interaction
        const wrapperContract = {
          address: wrapperAddress,
          abi: artifacts.NameWrapper.abi,
          bytecode: artifacts.NameWrapper.bytecode,
          argsData: '0x',
          metadata: artifacts.NameWrapper.metadata || '{}',
        }

        // Read wrapper state - exactly like original
        const upgradeContract = await read(wrapperContract, {
          functionName: 'upgradeContract',
          args: [],
        })

        const isUpgradeSet = upgradeContract === testUnwrapDeployment.address
        const isApprovedWrapper = await read(testUnwrapDeployment, {
          functionName: 'approvedWrapper',
          args: [wrapperAddress],
        })

        if (isUpgradeSet && isApprovedWrapper) {
          console.log(
            `Wrapper ${wrapperAddress} already set up, skipping contract`,
          )
          continue
        }

        if (!isUpgradeSet) {
          const wrapperOwner = await read(wrapperContract, {
            functionName: 'owner',
            args: [],
          })

          const wrapperOwnerClient = clients.find(
            (c) => c.address === wrapperOwner,
          )
          const canModifyWrapper = !!wrapperOwnerClient

          if (!canModifyWrapper && !canModifyTestUnwrap) {
            console.log(
              `WARNING: Can't modify wrapper ${wrapperAddress} or TestUnwrap, skipping contract`,
            )
            continue
          } else if (!canModifyWrapper) {
            console.log(
              `WARNING: Can't modify wrapper ${wrapperAddress}, skipping setUpgradeContract()`,
            )
          } else {
            // Set upgrade contract on the wrapper
            await executeContract(wrapperContract, {
              functionName: 'setUpgradeContract',
              args: [testUnwrapDeployment.address],
              account: wrapperOwnerClient.address,
            })
            console.log(
              `Setting upgrade contract for ${wrapperAddress} to ${testUnwrapDeployment.address}`,
            )
          }

          if (isApprovedWrapper) {
            console.log(
              `Wrapper ${wrapperAddress} already approved, skipping setWrapperApproval()`,
            )
            continue
          }
        }

        if (!canModifyTestUnwrap) {
          console.log(
            `WARNING: Can't modify TestUnwrap, skipping setWrapperApproval() for ${wrapperAddress}`,
          )
          continue
        }

        // Set wrapper approval - exactly like original
        await executeContract(testUnwrapDeployment, {
          functionName: 'setWrapperApproval',
          args: [wrapperAddress, true],
          account: contractOwnerClient!.address,
        })
        console.log(`Approving wrapper ${wrapperAddress}`)
      } catch (error) {
        console.log(
          `Failed to process wrapper ${wrapperAddress}:`,
          error instanceof Error ? error.message : String(error),
        )
      }
    }
  },
  {
    id: 'test-unwrap',
    tags: ['wrapper', 'TestUnwrap'],
    dependencies: ['BaseRegistrarImplementation', 'registry'],
  },
)
