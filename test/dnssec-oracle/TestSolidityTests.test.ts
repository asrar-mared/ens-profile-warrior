import hre from 'hardhat'

const connection = await hre.network.connect()

const contracts = [
  'contracts/test/TestBytesUtils.sol:TestBytesUtils',
  'contracts/test/TestRRUtils.sol:TestRRUtils',
] as const

describe.each(contracts)('%s', async (contract: string) => {
  async function fixture() {
    const publicClient = await connection.viem.getPublicClient()
    const testContract = await connection.viem.deployContract(
      contract as (typeof contracts)[0],
      [],
    )
    return { publicClient, testContract }
  }

  const testContract = await hre.artifacts.readArtifact(
    contract as (typeof contracts)[0],
  )
  type Contract = typeof testContract
  type TestFunction = Extract<
    Contract['abi'][number],
    { name: `test${string}` }
  >
  const tests = testContract.abi.filter((a): a is TestFunction =>
    a.name.startsWith('test'),
  )

  tests.forEach((a) => {
    it(a.name, async () => {
      const { publicClient, testContract } = await fixture()
      await publicClient.readContract({
        abi: testContract.abi,
        address: testContract.address,
        args: [],
        functionName: a.name,
      })
    })
  })
})
