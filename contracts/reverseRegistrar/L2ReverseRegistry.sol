// SPDX-License-Identifier: MIT

pragma solidity ^0.8.4;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {ECDSA} from "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import {ERC165} from "@openzeppelin/contracts/utils/introspection/ERC165.sol";

import {Multicallable} from "../resolvers/Multicallable.sol";
import {IL2ReverseRegistry} from "./IL2ReverseRegistry.sol";
import {SignatureReverseRegistry} from "./SignatureReverseRegistry.sol";
import {SignatureUtils} from "./SignatureUtils.sol";

/// @title L2 Reverse Registry
/// @notice An L2 Reverse Registry. Deployed to each L2 chain.
contract L2ReverseRegistry is
    ERC165,
    Multicallable,
    IL2ReverseRegistry,
    SignatureReverseRegistry
{
    using SignatureUtils for bytes;
    using ECDSA for bytes32;

    /// @notice The addr namespace. Equal to the namehash of
    ///         `${coinTypeHex}.reverse`.
    bytes32 public immutable L2ReverseNode;

    /// @notice Sets the namespace and coin type
    /// @param _L2ReverseNode The namespace to set. The converntion is '${coinType}.reverse'
    /// @param _coinType The cointype converted from the chainId of the chain this contract is deployed to.
    constructor(
        bytes32 _L2ReverseNode,
        uint256 _coinType
    ) SignatureReverseRegistry(_L2ReverseNode, _coinType) {
        L2ReverseNode = _L2ReverseNode;
    }

    /// @dev Checks if the caller is authorised
    function isAuthorised(address addr) internal view override {
        if (addr != msg.sender && !ownsContract(addr, msg.sender)) {
            revert Unauthorised();
        }
    }

    /// @inheritdoc IL2ReverseRegistry
    function setNameForOwnableWithSignature(
        address contractAddr,
        address owner,
        string calldata name,
        uint256[] memory coinTypes,
        uint256 signatureExpiry,
        bytes memory signature
    ) public returns (bytes32) {
        _validateCoinTypes(coinTypes);
        bytes32 node = _getNamehash(contractAddr);

        // Follow ERC191 version 0 https://eips.ethereum.org/EIPS/eip-191
        bytes32 message = keccak256(
            abi.encodePacked(
                address(this),
                IL2ReverseRegistry.setNameForOwnableWithSignature.selector,
                name,
                contractAddr,
                owner,
                coinTypes,
                signatureExpiry
            )
        ).toEthSignedMessageHash();

        if (!ownsContract(contractAddr, owner)) {
            revert NotOwnerOfContract();
        }

        signature.validateSignatureWithExpiry(owner, message, signatureExpiry);

        _setName(contractAddr, node, name);
        return node;
    }

    /// @inheritdoc IL2ReverseRegistry
    function setName(string calldata name) public override returns (bytes32) {
        return setNameForAddr(msg.sender, name);
    }

    /// @inheritdoc IL2ReverseRegistry
    function setNameForAddr(
        address addr,
        string calldata name
    ) public authorised(addr) returns (bytes32) {
        bytes32 node = _getNamehash(addr);

        _setName(addr, node, name);
        return node;
    }

    /// @dev Checks if the provided contractAddr is a contract and is owned by the
    ///      provided addr.
    function ownsContract(
        address contractAddr,
        address addr
    ) internal view returns (bool) {
        if (contractAddr.code.length == 0) return false;
        try Ownable(contractAddr).owner() returns (address owner) {
            return owner == addr;
        } catch {
            return false;
        }
    }

    /// @inheritdoc ERC165
    function supportsInterface(
        bytes4 interfaceID
    )
        public
        view
        override(ERC165, Multicallable, SignatureReverseRegistry)
        returns (bool)
    {
        return
            interfaceID == type(IL2ReverseRegistry).interfaceId ||
            super.supportsInterface(interfaceID);
    }
}
