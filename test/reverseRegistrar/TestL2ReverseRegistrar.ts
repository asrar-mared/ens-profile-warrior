import { evmChainIdToCoinType } from '@ensdomains/address-encoder/utils'
import { loadFixture } from '@nomicfoundation/hardhat-toolbox-viem/network-helpers.js'
import { expect } from 'chai'
import hre from 'hardhat'
import {
  concat,
  encodeFunctionData,
  encodePacked,
  getAddress,
  keccak256,
  namehash,
  toFunctionSelector,
  zeroHash,
  type AbiFunction,
  type Address,
  type Hex,
} from 'viem'
import { optimism } from 'viem/chains'
import { serializeErc6492Signature } from 'viem/experimental'
import { getReverseNamespace } from '../fixtures/getReverseNode.js'
import { shouldSupportInterfaces } from '../wrapper/SupportsInterface.behaviour.js'

const coinType = evmChainIdToCoinType(optimism.id)
const reverseNamespace = getReverseNamespace({ chainId: optimism.id })
const ddpSigner = '0x3fab184622dc19b6109349b94811493bf2a45362'
const ddpAddress = '0x4e59b44847b379578588920ca78fbf26c0b4956c'

async function fixture() {
  const accounts = await hre.viem
    .getWalletClients()
    .then((clients) => clients.map((c) => c.account))

  const testClient = await hre.viem.getTestClient()
  const publicClient = await hre.viem.getPublicClient()
  const [walletClient] = await hre.viem.getWalletClients()

  // deploy deterministic deployer proxy
  await testClient.setBalance({
    address: ddpSigner,
    value: 10n ** 16n,
  })
  const deterministicDeployerDeployHash = await publicClient.sendRawTransaction(
    {
      serializedTransaction:
        '0xf8a58085174876e800830186a08080b853604580600e600039806000f350fe7fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffe03601600081602082378035828234f58015156039578182fd5b8082525050506014600cf31ba02222222222222222222222222222222222222222222222222222222222222222a02222222222222222222222222222222222222222222222222222222222222222',
    },
  )
  await hre.viem.waitForTransactionSuccess(deterministicDeployerDeployHash)

  // deploy universal sig validator
  const usvArtifact = await hre.deployments.getArtifact('UniversalSigValidator')
  const usvBytecode = usvArtifact.bytecode as Hex
  const universalSigValidatorDeployHash = await walletClient.sendTransaction({
    to: ddpAddress,
    data: concat([zeroHash, usvBytecode]),
  })
  await hre.viem.waitForTransactionSuccess(universalSigValidatorDeployHash)

  const l2ReverseRegistrar = await hre.viem.deployContract(
    'L2ReverseRegistrar',
    [namehash(reverseNamespace), coinType],
  )
  const mockSmartContractAccount = await hre.viem.deployContract(
    'MockSmartContractWallet',
    [accounts[0].address],
  )
  const mockOwnableSca = await hre.viem.deployContract('MockOwnable', [
    mockSmartContractAccount.address,
  ])
  const mockErc6492WalletFactory = await hre.viem.deployContract(
    'MockERC6492WalletFactory',
  )
  const mockOwnableEoa = await hre.viem.deployContract('MockOwnable', [
    accounts[0].address,
  ])

  return {
    l2ReverseRegistrar,
    mockSmartContractAccount,
    mockErc6492WalletFactory,
    mockOwnableSca,
    mockOwnableEoa,
    accounts,
  }
}

const createMessageHash = ({
  contractAddress,
  functionSelector,
  name,
  address,
  coinTypes,
  signatureExpiry,
}: {
  contractAddress: Address
  functionSelector: Hex
  name: string
  address: Address
  coinTypes: bigint[]
  signatureExpiry: bigint
}) =>
  keccak256(
    encodePacked(
      ['address', 'bytes4', 'string', 'address', 'uint256[]', 'uint256'],
      [
        contractAddress,
        functionSelector,
        name,
        address,
        coinTypes,
        signatureExpiry,
      ],
    ),
  )

const createMessageHashForOwnable = ({
  contractAddress,
  functionSelector,
  name,
  targetOwnableAddress,
  ownerAddress,
  coinTypes,
  signatureExpiry,
}: {
  contractAddress: Address
  functionSelector: Hex
  name: string
  targetOwnableAddress: Address
  ownerAddress: Address
  coinTypes: bigint[]
  signatureExpiry: bigint
}) =>
  keccak256(
    encodePacked(
      [
        'address',
        'bytes4',
        'string',
        'address',
        'address',
        'uint256[]',
        'uint256',
      ],
      [
        contractAddress,
        functionSelector,
        name,
        targetOwnableAddress,
        ownerAddress,
        coinTypes,
        signatureExpiry,
      ],
    ),
  )

describe('L2ReverseRegistrar', () => {
  shouldSupportInterfaces({
    contract: () =>
      loadFixture(fixture).then(({ l2ReverseRegistrar }) => l2ReverseRegistrar),
    interfaces: [
      'IL2ReverseRegistrar',
      '@openzeppelin/contracts-v5/utils/introspection/IERC165.sol:IERC165',
      'ISignatureReverseRegistrar',
    ],
  })

  it('should deploy the contract', async () => {
    const { l2ReverseRegistrar } = await loadFixture(fixture)

    expect(l2ReverseRegistrar.address).not.toBeUndefined()
  })

  describe('setName', () => {
    async function setNameFixture() {
      const initial = await loadFixture(fixture)
      const { l2ReverseRegistrar, accounts } = initial

      const name = 'myname.eth'
      const node = await l2ReverseRegistrar.read.node([accounts[0].address])

      return {
        ...initial,
        name,
        node,
      }
    }

    it('should set the name record for the calling account', async () => {
      const { l2ReverseRegistrar, name, node } = await loadFixture(
        setNameFixture,
      )

      await l2ReverseRegistrar.write.setName([name])

      await expect(l2ReverseRegistrar.read.name([node])).resolves.toBe(name)
    })

    it('event NameChanged is emitted', async () => {
      const { l2ReverseRegistrar, name, node, accounts } = await loadFixture(
        setNameFixture,
      )

      await expect(l2ReverseRegistrar)
        .write('setName', [name])
        .toEmitEvent('NameChanged')
        .withArgs(getAddress(accounts[0].address), node, name)
    })
  })

  describe('setNameForAddrWithSignature', () => {
    async function setNameForAddrWithSignatureFixture() {
      const initial = await loadFixture(fixture)
      const { l2ReverseRegistrar, accounts } = initial

      const name = 'myname.eth'
      const node = await l2ReverseRegistrar.read.node([accounts[0].address])
      const functionSelector = toFunctionSelector(
        l2ReverseRegistrar.abi.find(
          (f) =>
            f.type === 'function' && f.name === 'setNameForAddrWithSignature',
        ) as AbiFunction,
      )

      const publicClient = await hre.viem.getPublicClient()
      const blockTimestamp = await publicClient
        .getBlock()
        .then((b) => b.timestamp)
      const signatureExpiry = blockTimestamp + 3600n

      const [walletClient] = await hre.viem.getWalletClients()
      const messageHash = createMessageHash({
        contractAddress: l2ReverseRegistrar.address,
        functionSelector,
        name,
        address: accounts[0].address,
        coinTypes: [coinType],
        signatureExpiry,
      })
      const signature = await walletClient.signMessage({
        message: { raw: messageHash },
      })

      return {
        ...initial,
        name,
        node,
        functionSelector,
        signatureExpiry,
        signature,
        walletClient,
      }
    }

    it('allows an account to sign a message to allow a relayer to claim the address', async () => {
      const {
        l2ReverseRegistrar,
        name,
        node,
        signatureExpiry,
        signature,
        accounts,
      } = await loadFixture(setNameForAddrWithSignatureFixture)

      await l2ReverseRegistrar.write.setNameForAddrWithSignature(
        [accounts[0].address, name, [coinType], signatureExpiry, signature],
        { account: accounts[1] },
      )

      await expect(l2ReverseRegistrar.read.name([node])).resolves.toBe(name)
    })

    it('event NameChanged is emitted', async () => {
      const {
        l2ReverseRegistrar,
        name,
        node,
        signatureExpiry,
        signature,
        accounts,
      } = await loadFixture(setNameForAddrWithSignatureFixture)

      await expect(l2ReverseRegistrar)
        .write(
          'setNameForAddrWithSignature',
          [accounts[0].address, name, [coinType], signatureExpiry, signature],
          { account: accounts[1] },
        )
        .toEmitEvent('NameChanged')
        .withArgs(getAddress(accounts[0].address), node, name)
    })

    it('allows SCA signatures', async () => {
      const {
        l2ReverseRegistrar,
        name,
        signatureExpiry,
        functionSelector,
        accounts,
        mockSmartContractAccount,
        walletClient,
      } = await loadFixture(setNameForAddrWithSignatureFixture)

      const node = await l2ReverseRegistrar.read.node([
        mockSmartContractAccount.address,
      ])

      const messageHash = createMessageHash({
        contractAddress: l2ReverseRegistrar.address,
        functionSelector,
        name,
        address: mockSmartContractAccount.address,
        coinTypes: [coinType],
        signatureExpiry,
      })
      const signature = await walletClient.signMessage({
        message: { raw: messageHash },
      })

      await expect(l2ReverseRegistrar)
        .write(
          'setNameForAddrWithSignature',
          [
            mockSmartContractAccount.address,
            name,
            [coinType],
            signatureExpiry,
            signature,
          ],
          { account: accounts[1] },
        )
        .toEmitEvent('NameChanged')
        .withArgs(getAddress(mockSmartContractAccount.address), node, name)

      await expect(l2ReverseRegistrar.read.name([node])).resolves.toBe(name)
    })

    it('allows undeployed SCA signatures (ERC6492)', async () => {
      const {
        l2ReverseRegistrar,
        name,
        signatureExpiry,
        functionSelector,
        accounts,
        mockErc6492WalletFactory,
        walletClient,
      } = await loadFixture(setNameForAddrWithSignatureFixture)

      const predictedAddress =
        await mockErc6492WalletFactory.read.predictAddress([
          accounts[0].address,
        ])

      const node = await l2ReverseRegistrar.read.node([predictedAddress])

      const messageHash = createMessageHash({
        contractAddress: l2ReverseRegistrar.address,
        functionSelector,
        name,
        address: predictedAddress,
        coinTypes: [coinType],
        signatureExpiry,
      })
      const signature = await walletClient.signMessage({
        message: { raw: messageHash },
      })

      const wrappedSignature = serializeErc6492Signature({
        address: mockErc6492WalletFactory.address,
        data: encodeFunctionData({
          abi: mockErc6492WalletFactory.abi,
          functionName: 'createWallet',
          args: [accounts[0].address],
        }),
        signature,
      })

      await expect(l2ReverseRegistrar)
        .write(
          'setNameForAddrWithSignature',
          [
            predictedAddress,
            name,
            [coinType],
            signatureExpiry,
            wrappedSignature,
          ],
          { account: accounts[1] },
        )
        .toEmitEvent('NameChanged')
        .withArgs(getAddress(predictedAddress), node, name)

      await expect(l2ReverseRegistrar.read.name([node])).resolves.toBe(name)
    })

    it('reverts if signature parameters do not match', async () => {
      const {
        l2ReverseRegistrar,
        name,
        functionSelector,
        signatureExpiry,
        walletClient,
        accounts,
      } = await loadFixture(setNameForAddrWithSignatureFixture)

      const messageHash = keccak256(
        encodePacked(
          ['address', 'bytes4', 'string', 'address', 'uint256'],
          [
            l2ReverseRegistrar.address,
            functionSelector,
            name,
            accounts[0].address,
            signatureExpiry,
          ],
        ),
      )
      const signature = await walletClient.signMessage({
        message: { raw: messageHash },
      })

      await expect(l2ReverseRegistrar)
        .write(
          'setNameForAddrWithSignature',
          [accounts[0].address, name, [coinType], signatureExpiry, signature],
          { account: accounts[1] },
        )
        .toBeRevertedWithCustomError('InvalidSignature')
    })

    it('reverts if expiry date is too low', async () => {
      const {
        l2ReverseRegistrar,
        name,
        functionSelector,
        accounts,
        walletClient,
      } = await loadFixture(setNameForAddrWithSignatureFixture)

      const signatureExpiry = 0n

      const messageHash = createMessageHash({
        contractAddress: l2ReverseRegistrar.address,
        functionSelector,
        name,
        address: accounts[0].address,
        coinTypes: [coinType],
        signatureExpiry,
      })
      const signature = await walletClient.signMessage({
        message: { raw: messageHash },
      })

      await expect(l2ReverseRegistrar)
        .write(
          'setNameForAddrWithSignature',
          [accounts[0].address, name, [coinType], signatureExpiry, signature],
          { account: accounts[1] },
        )
        .toBeRevertedWithCustomError('SignatureExpired')
    })

    it('reverts if expiry date is too high', async () => {
      const {
        l2ReverseRegistrar,
        name,
        functionSelector,
        signatureExpiry: oldSignatureExpiry,
        accounts,
        walletClient,
      } = await loadFixture(setNameForAddrWithSignatureFixture)

      const signatureExpiry = oldSignatureExpiry + 86401n

      const messageHash = createMessageHash({
        contractAddress: l2ReverseRegistrar.address,
        functionSelector,
        name,
        address: accounts[0].address,
        coinTypes: [coinType],
        signatureExpiry,
      })
      const signature = await walletClient.signMessage({
        message: { raw: messageHash },
      })

      await expect(l2ReverseRegistrar)
        .write(
          'setNameForAddrWithSignature',
          [accounts[0].address, name, [coinType], signatureExpiry, signature],
          { account: accounts[1] },
        )
        .toBeRevertedWithCustomError('SignatureExpiryTooHigh')
    })

    it('allows unrelated coin types in array', async () => {
      const {
        l2ReverseRegistrar,
        name,
        node,
        signatureExpiry,
        functionSelector,
        accounts,
        walletClient,
      } = await loadFixture(setNameForAddrWithSignatureFixture)

      const coinTypes = [34384n, 54842344n, 3498283n, coinType]

      const messageHash = createMessageHash({
        contractAddress: l2ReverseRegistrar.address,
        functionSelector,
        name,
        address: accounts[0].address,
        signatureExpiry,
        coinTypes,
      })
      const signature = await walletClient.signMessage({
        message: { raw: messageHash },
      })

      await l2ReverseRegistrar.write.setNameForAddrWithSignature(
        [accounts[0].address, name, coinTypes, signatureExpiry, signature],
        { account: accounts[1] },
      )

      await expect(l2ReverseRegistrar.read.name([node])).resolves.toBe(name)
    })
    it('reverts if coin type is not in array', async () => {
      const {
        l2ReverseRegistrar,
        name,
        signatureExpiry,
        functionSelector,
        accounts,
        walletClient,
      } = await loadFixture(setNameForAddrWithSignatureFixture)

      const coinTypes = [34384n, 54842344n, 3498283n]

      const messageHash = createMessageHash({
        contractAddress: l2ReverseRegistrar.address,
        functionSelector,
        name,
        address: accounts[0].address,
        signatureExpiry,
        coinTypes,
      })
      const signature = await walletClient.signMessage({
        message: { raw: messageHash },
      })

      await expect(l2ReverseRegistrar)
        .write(
          'setNameForAddrWithSignature',
          [accounts[0].address, name, coinTypes, signatureExpiry, signature],
          { account: accounts[1] },
        )
        .toBeRevertedWithCustomError('CoinTypeNotFound')
    })
    it('reverts if array is empty', async () => {
      const {
        l2ReverseRegistrar,
        name,
        signatureExpiry,
        functionSelector,
        accounts,
        walletClient,
      } = await loadFixture(setNameForAddrWithSignatureFixture)

      const coinTypes = [] as bigint[]

      const messageHash = createMessageHash({
        contractAddress: l2ReverseRegistrar.address,
        functionSelector,
        name,
        address: accounts[0].address,
        signatureExpiry,
        coinTypes,
      })
      const signature = await walletClient.signMessage({
        message: { raw: messageHash },
      })

      await expect(l2ReverseRegistrar)
        .write(
          'setNameForAddrWithSignature',
          [accounts[0].address, name, coinTypes, signatureExpiry, signature],
          { account: accounts[1] },
        )
        .toBeRevertedWithCustomError('CoinTypeNotFound')
    })
  })

  describe('setNameForOwnableWithSignature', () => {
    async function setNameForOwnableWithSignatureFixture() {
      const initial = await loadFixture(fixture)
      const { l2ReverseRegistrar } = initial

      const name = 'ownable.eth'
      const functionSelector = toFunctionSelector(
        l2ReverseRegistrar.abi.find(
          (f) =>
            f.type === 'function' &&
            f.name === 'setNameForOwnableWithSignature',
        ) as AbiFunction,
      )

      const publicClient = await hre.viem.getPublicClient()
      const blockTimestamp = await publicClient
        .getBlock()
        .then((b) => b.timestamp)
      const signatureExpiry = blockTimestamp + 3600n

      const [walletClient] = await hre.viem.getWalletClients()

      return {
        ...initial,
        name,
        functionSelector,
        signatureExpiry,
        walletClient,
      }
    }

    it('allows an EOA to sign a message to claim the address of a contract it owns via Ownable', async () => {
      const {
        l2ReverseRegistrar,
        name,
        functionSelector,
        signatureExpiry,
        accounts,
        mockOwnableEoa,
        walletClient,
      } = await loadFixture(setNameForOwnableWithSignatureFixture)

      const node = await l2ReverseRegistrar.read.node([mockOwnableEoa.address])
      const messageHash = createMessageHashForOwnable({
        contractAddress: l2ReverseRegistrar.address,
        functionSelector,
        name,
        targetOwnableAddress: mockOwnableEoa.address,
        ownerAddress: accounts[0].address,
        coinTypes: [coinType],
        signatureExpiry,
      })
      const signature = await walletClient.signMessage({
        message: { raw: messageHash },
      })

      await expect(l2ReverseRegistrar)
        .write(
          'setNameForOwnableWithSignature',
          [
            mockOwnableEoa.address,
            accounts[0].address,
            name,
            [coinType],
            signatureExpiry,
            signature,
          ],
          { account: accounts[9] },
        )
        .toEmitEvent('NameChanged')
        .withArgs(getAddress(mockOwnableEoa.address), node, name)

      await expect(l2ReverseRegistrar.read.name([node])).resolves.toBe(name)
    })

    it('allows an SCA to sign a message to claim the address of a contract it owns via Ownable', async () => {
      const {
        l2ReverseRegistrar,
        name,
        functionSelector,
        signatureExpiry,
        accounts,
        mockOwnableSca,
        mockSmartContractAccount,
        walletClient,
      } = await loadFixture(setNameForOwnableWithSignatureFixture)

      const node = await l2ReverseRegistrar.read.node([mockOwnableSca.address])
      const messageHash = createMessageHashForOwnable({
        contractAddress: l2ReverseRegistrar.address,
        functionSelector,
        name,
        targetOwnableAddress: mockOwnableSca.address,
        ownerAddress: mockSmartContractAccount.address,
        coinTypes: [coinType],
        signatureExpiry,
      })
      const signature = await walletClient.signMessage({
        message: { raw: messageHash },
      })

      await expect(l2ReverseRegistrar)
        .write(
          'setNameForOwnableWithSignature',
          [
            mockOwnableSca.address,
            mockSmartContractAccount.address,
            name,
            [coinType],
            signatureExpiry,
            signature,
          ],
          { account: accounts[9] },
        )
        .toEmitEvent('NameChanged')
        .withArgs(getAddress(mockOwnableSca.address), node, name)

      await expect(l2ReverseRegistrar.read.name([node])).resolves.toBe(name)
    })

    it('reverts if the owner address is not the owner of the contract', async () => {
      const {
        l2ReverseRegistrar,
        name,
        functionSelector,
        signatureExpiry,
        accounts,
        mockOwnableEoa,
      } = await loadFixture(setNameForOwnableWithSignatureFixture)
      const [, walletClient] = await hre.viem.getWalletClients()

      const messageHash = createMessageHashForOwnable({
        contractAddress: l2ReverseRegistrar.address,
        functionSelector,
        name,
        targetOwnableAddress: mockOwnableEoa.address,
        ownerAddress: accounts[1].address,
        coinTypes: [coinType],
        signatureExpiry,
      })
      const signature = await walletClient.signMessage({
        message: { raw: messageHash },
      })

      await expect(l2ReverseRegistrar)
        .write(
          'setNameForOwnableWithSignature',
          [
            mockOwnableEoa.address,
            accounts[1].address,
            name,
            [coinType],
            signatureExpiry,
            signature,
          ],
          { account: accounts[9] },
        )
        .toBeRevertedWithCustomError('NotOwnerOfContract')
    })

    it('reverts if the target address is not a contract', async () => {
      const {
        l2ReverseRegistrar,
        name,
        functionSelector,
        signatureExpiry,
        accounts,
        walletClient,
      } = await loadFixture(setNameForOwnableWithSignatureFixture)

      const messageHash = createMessageHashForOwnable({
        contractAddress: l2ReverseRegistrar.address,
        functionSelector,
        name,
        targetOwnableAddress: accounts[2].address,
        ownerAddress: accounts[0].address,
        coinTypes: [coinType],
        signatureExpiry,
      })
      const signature = await walletClient.signMessage({
        message: { raw: messageHash },
      })

      await expect(l2ReverseRegistrar)
        .write(
          'setNameForOwnableWithSignature',
          [
            accounts[2].address,
            accounts[0].address,
            name,
            [coinType],
            signatureExpiry,
            signature,
          ],
          { account: accounts[9] },
        )
        .toBeRevertedWithCustomError('NotOwnerOfContract')
    })

    it('reverts if the target address does not implement Ownable', async () => {
      const {
        l2ReverseRegistrar,
        name,
        functionSelector,
        signatureExpiry,
        accounts,
        walletClient,
      } = await loadFixture(setNameForOwnableWithSignatureFixture)

      const messageHash = createMessageHashForOwnable({
        contractAddress: l2ReverseRegistrar.address,
        functionSelector,
        name,
        targetOwnableAddress: l2ReverseRegistrar.address,
        ownerAddress: accounts[0].address,
        coinTypes: [coinType],
        signatureExpiry,
      })
      const signature = await walletClient.signMessage({
        message: { raw: messageHash },
      })

      await expect(l2ReverseRegistrar)
        .write(
          'setNameForOwnableWithSignature',
          [
            l2ReverseRegistrar.address,
            accounts[0].address,
            name,
            [coinType],
            signatureExpiry,
            signature,
          ],
          { account: accounts[9] },
        )
        .toBeRevertedWithCustomError('NotOwnerOfContract')
    })

    it('reverts if the signature is invalid', async () => {
      const {
        l2ReverseRegistrar,
        name,
        functionSelector,
        signatureExpiry,
        accounts,
        mockOwnableEoa,
        walletClient,
      } = await loadFixture(setNameForOwnableWithSignatureFixture)

      const messageHash = createMessageHashForOwnable({
        contractAddress: l2ReverseRegistrar.address,
        functionSelector,
        name,
        targetOwnableAddress: mockOwnableEoa.address,
        ownerAddress: accounts[0].address,
        coinTypes: [coinType],
        signatureExpiry: 0n,
      })
      const signature = await walletClient.signMessage({
        message: { raw: messageHash },
      })

      await expect(l2ReverseRegistrar)
        .write(
          'setNameForOwnableWithSignature',
          [
            mockOwnableEoa.address,
            accounts[0].address,
            name,
            [coinType],
            signatureExpiry,
            signature,
          ],
          { account: accounts[9] },
        )
        .toBeRevertedWithCustomError('InvalidSignature')
    })

    it('reverts if expiry date is too low', async () => {
      const {
        l2ReverseRegistrar,
        name,
        functionSelector,
        accounts,
        mockOwnableEoa,
        walletClient,
      } = await loadFixture(setNameForOwnableWithSignatureFixture)

      const signatureExpiry = 0n

      const messageHash = createMessageHashForOwnable({
        contractAddress: l2ReverseRegistrar.address,
        functionSelector,
        name,
        targetOwnableAddress: mockOwnableEoa.address,
        ownerAddress: accounts[0].address,
        coinTypes: [coinType],
        signatureExpiry,
      })
      const signature = await walletClient.signMessage({
        message: { raw: messageHash },
      })

      await expect(l2ReverseRegistrar)
        .write(
          'setNameForOwnableWithSignature',
          [
            mockOwnableEoa.address,
            accounts[0].address,
            name,
            [coinType],
            signatureExpiry,
            signature,
          ],
          { account: accounts[9] },
        )
        .toBeRevertedWithCustomError('SignatureExpired')
    })

    it('reverts if expiry date is too high', async () => {
      const {
        l2ReverseRegistrar,
        name,
        functionSelector,
        accounts,
        mockOwnableEoa,
        walletClient,
        signatureExpiry: oldSignatureExpiry,
      } = await loadFixture(setNameForOwnableWithSignatureFixture)

      const signatureExpiry = oldSignatureExpiry + 86401n

      const messageHash = createMessageHashForOwnable({
        contractAddress: l2ReverseRegistrar.address,
        functionSelector,
        name,
        targetOwnableAddress: mockOwnableEoa.address,
        ownerAddress: accounts[0].address,
        coinTypes: [coinType],
        signatureExpiry,
      })
      const signature = await walletClient.signMessage({
        message: { raw: messageHash },
      })

      await expect(l2ReverseRegistrar)
        .write(
          'setNameForOwnableWithSignature',
          [
            mockOwnableEoa.address,
            accounts[0].address,
            name,
            [coinType],
            signatureExpiry,
            signature,
          ],
          { account: accounts[9] },
        )
        .toBeRevertedWithCustomError('SignatureExpiryTooHigh')
    })

    it('allows unrelated coin types in array', async () => {
      const {
        l2ReverseRegistrar,
        name,
        functionSelector,
        signatureExpiry,
        accounts,
        mockOwnableEoa,
        walletClient,
      } = await loadFixture(setNameForOwnableWithSignatureFixture)

      const coinTypes = [34384n, 54842344n, 3498283n, coinType]
      const node = await l2ReverseRegistrar.read.node([mockOwnableEoa.address])
      const messageHash = createMessageHashForOwnable({
        contractAddress: l2ReverseRegistrar.address,
        functionSelector,
        name,
        targetOwnableAddress: mockOwnableEoa.address,
        ownerAddress: accounts[0].address,
        coinTypes,
        signatureExpiry,
      })
      const signature = await walletClient.signMessage({
        message: { raw: messageHash },
      })

      await expect(l2ReverseRegistrar)
        .write(
          'setNameForOwnableWithSignature',
          [
            mockOwnableEoa.address,
            accounts[0].address,
            name,
            coinTypes,
            signatureExpiry,
            signature,
          ],
          { account: accounts[9] },
        )
        .toEmitEvent('NameChanged')
        .withArgs(getAddress(mockOwnableEoa.address), node, name)

      await expect(l2ReverseRegistrar.read.name([node])).resolves.toBe(name)
    })

    it('reverts if coin type is not in array', async () => {
      const {
        l2ReverseRegistrar,
        name,
        functionSelector,
        signatureExpiry,
        accounts,
        mockOwnableEoa,
        walletClient,
      } = await loadFixture(setNameForOwnableWithSignatureFixture)

      const coinTypes = [34384n, 54842344n, 3498283n]
      const messageHash = createMessageHashForOwnable({
        contractAddress: l2ReverseRegistrar.address,
        functionSelector,
        name,
        targetOwnableAddress: mockOwnableEoa.address,
        ownerAddress: accounts[0].address,
        coinTypes,
        signatureExpiry,
      })
      const signature = await walletClient.signMessage({
        message: { raw: messageHash },
      })

      await expect(l2ReverseRegistrar)
        .write(
          'setNameForOwnableWithSignature',
          [
            mockOwnableEoa.address,
            accounts[0].address,
            name,
            coinTypes,
            signatureExpiry,
            signature,
          ],
          { account: accounts[9] },
        )
        .toBeRevertedWithCustomError('CoinTypeNotFound')
    })

    it('reverts if array is empty', async () => {
      const {
        l2ReverseRegistrar,
        name,
        functionSelector,
        signatureExpiry,
        accounts,
        mockOwnableEoa,
        walletClient,
      } = await loadFixture(setNameForOwnableWithSignatureFixture)

      const coinTypes = [] as bigint[]
      const messageHash = createMessageHashForOwnable({
        contractAddress: l2ReverseRegistrar.address,
        functionSelector,
        name,
        targetOwnableAddress: mockOwnableEoa.address,
        ownerAddress: accounts[0].address,
        coinTypes,
        signatureExpiry,
      })
      const signature = await walletClient.signMessage({
        message: { raw: messageHash },
      })

      await expect(l2ReverseRegistrar)
        .write(
          'setNameForOwnableWithSignature',
          [
            mockOwnableEoa.address,
            accounts[0].address,
            name,
            coinTypes,
            signatureExpiry,
            signature,
          ],
          { account: accounts[9] },
        )
        .toBeRevertedWithCustomError('CoinTypeNotFound')
    })
  })
})
