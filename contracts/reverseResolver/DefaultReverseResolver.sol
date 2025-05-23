// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

import {ERC165} from "@openzeppelin/contracts-v5/utils/introspection/ERC165.sol";
import {IStandaloneReverseRegistrar} from "../reverseRegistrar/IStandaloneReverseRegistrar.sol";
import {IExtendedResolver} from "../resolvers/profiles/IExtendedResolver.sol";
import {IAddressResolver} from "../resolvers/profiles/IAddressResolver.sol";
import {IAddrResolver} from "../resolvers/profiles/IAddrResolver.sol";
import {INameResolver} from "../resolvers/profiles/INameResolver.sol";
import {INameReverser} from "./INameReverser.sol";
import {ENSIP19, COIN_TYPE_ETH} from "../utils/ENSIP19.sol";

/// @title Default Reverse Resolver
/// @notice Resolves reverse records for EVM addresses to the default registrar. Deployed on the L1 chain.
contract DefaultReverseResolver is IExtendedResolver, INameReverser, ERC165 {
    /// @notice Thrown when the name is not reachable in this resolver's namespace.
    error UnreachableName(bytes name);

    /// @notice Thrown when the resolver profile is unknown.
    error UnsupportedResolverProfile(bytes4 selector);

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
            return abi.encode(resolveName(address(bytes20(a))));
        } else if (selector == IAddrResolver.addr.selector) {
            (bool valid, ) = ENSIP19.parseNamespace(name, 0);
            if (!valid) revert UnreachableName(name);
            return abi.encode(address(this));
        } else if (selector == IAddressResolver.addr.selector) {
            (bool valid, ) = ENSIP19.parseNamespace(name, 0);
            if (!valid) revert UnreachableName(name);
            (, uint256 reqCoinType) = abi.decode(data[4:], (bytes32, uint256));
            if (reqCoinType == COIN_TYPE_ETH) {
                return abi.encode(abi.encodePacked(address(this)));
            } else {
                return abi.encode("");
            }
        } else {
            revert UnsupportedResolverProfile(selector);
        }
    }

    /// @inheritdoc INameReverser
    function resolveName(address addr) public view returns (string memory) {
        return defaultRegistrar.nameForAddr(addr);
    }

    /// @inheritdoc INameReverser
    function resolveNames(
        address[] memory addrs,
        uint8 /*perPage*/
    ) external view returns (string[] memory names) {
        names = new string[](addrs.length);
        for (uint256 i; i < addrs.length; i++) {
            names[i] = resolveName(addrs[i]);
        }
    }
}
