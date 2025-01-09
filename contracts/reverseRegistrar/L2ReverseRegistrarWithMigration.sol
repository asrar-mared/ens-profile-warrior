// SPDX-License-Identifier: MIT

pragma solidity ^0.8.4;

import {Ownable} from "@openzeppelin/contracts-v5/access/Ownable.sol";

import {L2ReverseRegistrar} from "./L2ReverseRegistrar.sol";
import {INameResolver} from "../resolvers/profiles/INameResolver.sol";

/// @notice An L2 Revverse Registrar that allows migrating from a prior resolver.
contract L2ReverseRegistrarWithMigration is L2ReverseRegistrar, Ownable {
    /// @notice The old reverse resolver
    INameResolver immutable oldReverseResolver;

    /// @notice Sets the namespace, coin type, and old reverse resolver
    /// @param _L2ReverseNode The namespace to set. The converntion is '${coinType}.reverse'
    /// @param _coinType The cointype converted from the chainId of the chain this contract is deployed to.
    /// @param _owner The initial owner of the contract
    /// @param _oldReverseResolver The old reverse resolver
    constructor(
        bytes32 _L2ReverseNode,
        uint256 _coinType,
        address _owner,
        INameResolver _oldReverseResolver
    ) L2ReverseRegistrar(_L2ReverseNode, _coinType) Ownable(_owner) {
        oldReverseResolver = _oldReverseResolver;
    }

    /// @notice Migrates the names from the old reverse resolver to the new one.
    ///         Only callable by the owner.
    /// @param addresses The addresses to migrate
    function batchSetName(address[] calldata addresses) external onlyOwner {
        for (uint256 i = 0; i < addresses.length; i++) {
            bytes32 node = _getNamehash(addresses[i]);
            string memory name = oldReverseResolver.name(node);
            _setName(addresses[i], node, name);
        }
    }
}
