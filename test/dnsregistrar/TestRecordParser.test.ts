import hre from 'hardhat'
import { stringToHex } from 'viem'

const connection = await hre.network.connect()

async function fixture() {
  const parser = await connection.viem.deployContract('DummyParser', [])

  return { parser }
}

const loadFixture = async () => connection.networkHelpers.loadFixture(fixture)

describe('RecordParser', () => {
  it('parses data', async () => {
    const { parser } = await loadFixture()

    const data = 'usdt;issuer=tether decimals=18;https://tether.to'
    const [name, keys, values, url] = await parser.read.parseData([
      stringToHex(data),
      2n,
    ])

    // correct name
    expect(name).toBe('usdt')
    // correct keys and values
    expect(keys[0]).toBe('issuer')
    expect(values[0]).toBe('tether')
    expect(keys[1]).toBe('decimals')
    // incorrect last value
    expect(values[1]).not.toBe('18;https://tether.to')
    // correct url
    expect(url).toBe('https://tether.to')
  })
})
