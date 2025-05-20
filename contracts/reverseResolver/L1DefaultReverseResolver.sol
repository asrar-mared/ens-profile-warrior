// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

import {AbstractL1ReverseResolver} from "./AbstractL1ReverseResolver.sol";
import {ENS} from "../registry/ENS.sol";
import {IStandaloneReverseRegistrar} from "../reverseRegistrar/IStandaloneReverseRegistrar.sol";
import {INameResolver} from "../resolvers/profiles/INameResolver.sol";
import {IEVMNamesReverser} from "./IEVMNamesReverser.sol";
import {ENSIP19} from "../utils/ENSIP19.sol";

/// @title L1 Default Reverse Resolver
/// @notice Resolves reverse records for EVM addresses to the default registrar. Deployed on the L1 chain.
contract L1DefaultReverseResolver is AbstractL1ReverseResolver {
    constructor(ENS ens) AbstractL1ReverseResolver(ens) {}

    function resolve(
        bytes calldata name,
        bytes calldata data
    ) external view returns (bytes memory result) {
        bytes4 selector = bytes4(data);
        if (selector == INameResolver.name.selector) {
            (bytes memory a, uint256 coinType) = ENSIP19.parse(name);
            if (a.length != 20 || !ENSIP19.isEVMCoinType(coinType)) {
                revert UnreachableName(name);
            }
            address addr = address(bytes20(a));
            return abi.encode(defaultRegistrar().nameForAddr(addr));
        } else {
            revert UnsupportedResolverProfile(selector);
        }
    }

    /// @inheritdoc IEVMNamesReverser
    function resolveNames(
        address[] memory addrs,
        uint8 /*perPage*/
    ) external view returns (string[] memory names) {
        names = new string[](addrs.length);
        IStandaloneReverseRegistrar rr = defaultRegistrar();
        for (uint256 i; i < addrs.length; i++) {
            names[i] = rr.nameForAddr(addrs[i]);
        }
    }
}
