// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

import {ERC165} from "@openzeppelin/contracts-v5/utils/introspection/ERC165.sol";
import {IStandaloneReverseRegistrar} from "../reverseRegistrar/IStandaloneReverseRegistrar.sol";
import {IExtendedResolver} from "../resolvers/profiles/IExtendedResolver.sol";
import {INameResolver} from "../resolvers/profiles/INameResolver.sol";
import {INameReverser} from "./INameReverser.sol";
import {ENSIP19, COIN_TYPE_ETH} from "../utils/ENSIP19.sol";

/// @title Default Reverse Resolver
/// @notice Resolves reverse records for EVM addresses to the default registrar.
contract DefaultReverseResolver is IExtendedResolver, INameReverser, ERC165 {
    /// @notice Thrown when the name is not reachable in this resolver's namespace.
    error UnreachableName(bytes name);

    /// @notice Thrown when the resolver profile is unknown.
    error UnsupportedResolverProfile(bytes4 selector);

    /// @notice The default reverse registrar contract.
    IStandaloneReverseRegistrar public immutable defaultRegistrar;

    constructor(IStandaloneReverseRegistrar registrar) {
        defaultRegistrar = registrar;
    }

    /// @inheritdoc ERC165
    function supportsInterface(
        bytes4 interfaceId
    ) public view override returns (bool) {
        return
            interfaceId == type(IExtendedResolver).interfaceId ||
            interfaceId == type(INameReverser).interfaceId ||
            super.supportsInterface(interfaceId);
    }

    /// @notice Callers should enable EIP-3668.
    /// @dev This function may execute over multiple steps.
    /// @param name The name to resolve, in normalised and DNS-encoded form.
    /// @param data The resolution data, as specified in ENSIP-10.
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
            return abi.encode(defaultRegistrar.nameForAddr(addr));
        } else {
            revert UnsupportedResolverProfile(selector);
        }
    }

    /// @inheritdoc INameReverser
    function resolveNames(
        address[] memory addrs,
        uint8 /*perPage*/
    ) external view returns (string[] memory names) {
        names = new string[](addrs.length);
        for (uint256 i; i < addrs.length; i++) {
            names[i] = defaultRegistrar.nameForAddr(addrs[i]);
        }
    }
}
