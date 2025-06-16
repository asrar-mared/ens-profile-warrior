import hre from 'hardhat'
import { namehash, slice, toHex } from 'viem'
import { describe, expect, it } from 'vitest'

import { dnsDecodeName } from '../fixtures/dnsDecodeName.js'
import { dnsEncodeName } from '../fixtures/dnsEncodeName.js'
import { getParentName } from '../universalResolver/utils.js'

const connection = await hre.network.connect()

async function fixture() {
  return connection.viem.deployContract('TestNameCoder', [])
}
const loadFixture = async () => connection.networkHelpers.loadFixture(fixture)

describe('NameCoder', () => {
  describe('valid', () => {
    for (let [title, ens] of [
      ['empty', ''],
      ['a.bb.ccc.dddd.eeeee'],
      ['1x255', '1'.repeat(255)],
      ['1x300', '1'.repeat(300)],
      [`[${'1'.repeat(64)}]`],
      ['mixed', `${'1'.repeat(300)}.[${'1'.repeat(64)}].eth`],
    ]) {
      ens ??= title
      it(title, async () => {
        const F = await loadFixture()
        const dns = dnsEncodeName(ens)
        await expect(F.read.encode([ens]), 'encode').resolves.toStrictEqual(dns)
        await expect(F.read.decode([dns]), 'decode').resolves.toStrictEqual(
          dnsDecodeName(dns),
        )
        let pos = 0
        while (true) {
          await expect(
            F.read.namehash([dns, BigInt(pos)]),
            `namehash: ${ens}`,
          ).resolves.toStrictEqual(namehash(ens))
          if (!ens) break
          pos += 1 + parseInt(slice(dns, pos, pos + 1))
          ens = getParentName(ens)
        }
      })
    }
  })

  describe('encode() failure', () => {
    for (const ens of ['.', '..', '.a', 'a.', 'a..b']) {
      it(ens, async () => {
        const F = await loadFixture()
        await expect(F.read.encode([ens])).toBeRevertedWithCustomError(
          'DNSEncodingFailed',
        )
      })
    }
  })

  describe('decode() failure', () => {
    for (const dns of ['0x', '0x02', '0x0000', '0x1000'] as const) {
      it(dns, async () => {
        const F = await loadFixture()
        await expect(F.read.decode([dns])).toBeRevertedWithCustomError(
          'DNSDecodingFailed',
        )
        await expect(F.read.namehash([dns, 0n])).toBeRevertedWithCustomError(
          'DNSDecodingFailed',
        )
      })
    }
  })

  it('malicious label', async () => {
    const F = await loadFixture()
    await expect(
      F.read.decode([toHex('\x03a.b\x00')]),
    ).toBeRevertedWithCustomError('DNSDecodingFailed')
  })

  it('null hashed label', async () => {
    const F = await loadFixture()
    await expect(
      F.read.namehash([dnsEncodeName(`[${'0'.repeat(64)}]`), 0n]),
    ).toBeRevertedWithCustomError('DNSDecodingFailed')
  })
})
