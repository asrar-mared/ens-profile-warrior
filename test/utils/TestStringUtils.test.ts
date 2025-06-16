import hre from 'hardhat'
import { describe, expect, it } from 'vitest'

const connection = await hre.network.connect()

async function fixture() {
  const stringUtils = await connection.viem.deployContract(
    'StringUtilsTest',
    [],
  )

  return { stringUtils }
}
const loadFixture = async () => connection.networkHelpers.loadFixture(fixture)

describe('StringUtils', () => {
  it('should escape double quote correctly based on JSON standard', async () => {
    const { stringUtils } = await loadFixture()

    await expect(
      stringUtils.read.testEscape(['My ENS is, "tanrikulu.eth"']),
    ).resolves.toEqual('My ENS is, \\"tanrikulu.eth\\"')
  })

  it('should escape backslash correctly based on JSON standard', async () => {
    const { stringUtils } = await loadFixture()

    await expect(
      stringUtils.read.testEscape(['Path\\to\\file']),
    ).resolves.toEqual('Path\\\\to\\\\file')
  })

  it('should escape new line character correctly based on JSON standard', async () => {
    const { stringUtils } = await loadFixture()

    await expect(
      stringUtils.read.testEscape(['Line 1\nLine 2']),
    ).resolves.toEqual('Line 1\\nLine 2')
  })
})
