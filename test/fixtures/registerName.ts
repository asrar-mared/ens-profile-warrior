import type { NetworkConnection } from 'hardhat/types/network'
import { Address, getAddress, Hex, zeroAddress } from 'viem'
import { EnsStack } from './deployEnsFixture.js'

export type Mutable<T> = {
  -readonly [K in keyof T]: Mutable<T[K]>
}

type RegisterNameOptions = {
  label: string
  ownerAddress?: Address
  duration?: bigint
  secret?: Hex
  resolverAddress?: Address
  data?: Hex[]
  shouldSetReverseRecord?: boolean
  ownerControlledFuses?: number
}

export const getDefaultRegistrationOptionsWithConnection =
  (connection: NetworkConnection) =>
  async ({
    label,
    ownerAddress,
    duration,
    secret,
    resolverAddress,
    data,
    shouldSetReverseRecord,
    ownerControlledFuses,
  }: RegisterNameOptions) => ({
    label,
    ownerAddress: await (async () => {
      if (ownerAddress) return getAddress(ownerAddress)
      const [deployer] = await connection.viem.getWalletClients()
      return getAddress(deployer.account.address)
    })(),
    duration: duration ?? BigInt(60 * 60 * 24 * 365),
    secret:
      secret ??
      '0x0123456789ABCDEF0123456789ABCDEF0123456789ABCDEF0123456789ABCDEF',
    resolverAddress: resolverAddress ?? zeroAddress,
    data: data ?? [],
    shouldSetReverseRecord: shouldSetReverseRecord ?? false,
    ownerControlledFuses: ownerControlledFuses ?? 0,
  })

export const getRegisterNameParameterArray = ({
  label,
  ownerAddress,
  duration,
  secret,
  resolverAddress,
  data,
  shouldSetReverseRecord,
  ownerControlledFuses,
}: Required<RegisterNameOptions>) => {
  const immutable = [
    label,
    ownerAddress,
    duration,
    secret,
    resolverAddress,
    data,
    shouldSetReverseRecord,
    ownerControlledFuses,
  ] as const
  return immutable as Mutable<typeof immutable>
}

export const commitNameWithConnection =
  (connection: NetworkConnection) =>
  async (
    { ethRegistrarController }: Pick<EnsStack, 'ethRegistrarController'>,
    params_: RegisterNameOptions,
  ) => {
    const params = await getDefaultRegistrationOptionsWithConnection(
      connection,
    )(params_)
    const args = getRegisterNameParameterArray(params)

    const testClient = await connection.viem.getTestClient()
    const [deployer] = await connection.viem.getWalletClients()

    const commitmentHash = await ethRegistrarController.read.makeCommitment(
      args,
    )
    await ethRegistrarController.write.commit([commitmentHash], {
      account: deployer.account,
    })
    const minCommitmentAge =
      await ethRegistrarController.read.minCommitmentAge()
    await testClient.increaseTime({ seconds: Number(minCommitmentAge) })
    await testClient.mine({ blocks: 1 })

    return {
      params,
      args,
      hash: commitmentHash,
    }
  }

export const registerNameWithConnection =
  (connection: NetworkConnection) =>
  async (
    { ethRegistrarController }: Pick<EnsStack, 'ethRegistrarController'>,
    params_: RegisterNameOptions,
  ) => {
    const params = await getDefaultRegistrationOptionsWithConnection(
      connection,
    )(params_)
    const args = getRegisterNameParameterArray(params)
    const { label, duration } = params

    const testClient = await connection.viem.getTestClient()
    const [deployer] = await connection.viem.getWalletClients()
    const commitmentHash = await ethRegistrarController.read.makeCommitment(
      args,
    )
    await ethRegistrarController.write.commit([commitmentHash], {
      account: deployer.account,
    })
    const minCommitmentAge =
      await ethRegistrarController.read.minCommitmentAge()
    await testClient.increaseTime({ seconds: Number(minCommitmentAge) })
    await testClient.mine({ blocks: 1 })

    const value = await ethRegistrarController.read
      .rentPrice([label, duration])
      .then(({ base, premium }) => base + premium)

    await ethRegistrarController.write.register(args, {
      value,
      account: deployer.account,
    })
  }
