// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

import {ERC165} from "@openzeppelin/contracts-v5/utils/introspection/ERC165.sol";
import {IExtendedResolver} from "../resolvers/profiles/IExtendedResolver.sol";
import {INameResolver} from "../resolvers/profiles/INameResolver.sol";
import {IEVMNameReverser} from "../reverseRegistrar/IEVMNameReverser.sol";
import {IEVMNamesReverser} from "./IEVMNamesReverser.sol";
import {ENSIP19} from "../utils/ENSIP19.sol";

/// @title L1 Default Reverse Resolver
/// @notice Resolves reverse records for EVM addresses to the default registrar. Deployed on the L1 chain.
contract L1DefaultReverseResolver is
    IExtendedResolver,
    IEVMNameReverser,
    IEVMNamesReverser,
    ERC165
{
    /// @param name DNS-encoded ENS name that does not exist.
    error UnreachableName(bytes name);

    /// @param selector Function selector of the resolver profile that cannot be answered.
    error UnsupportedResolverProfile(bytes4 selector);

    IEVMNameReverser public immutable defaultRegistrar;

    constructor(IEVMNameReverser _defaultRegistrar) {
        defaultRegistrar = _defaultRegistrar;
    }

    /// @inheritdoc ERC165
    function supportsInterface(
        bytes4 interfaceId
    ) public view override returns (bool) {
        return
            interfaceId == type(IExtendedResolver).interfaceId ||
            interfaceId == type(IEVMNamesReverser).interfaceId ||
            interfaceId == type(IEVMNameReverser).interfaceId ||
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
            address addr = address(bytes20(a));
            return abi.encode(defaultRegistrar.nameForAddr(addr));
        } else {
            revert UnsupportedResolverProfile(selector);
        }
    }

    /// @inheritdoc IEVMNameReverser
    function nameForAddr(address addr) external view returns (string memory) {
        return defaultRegistrar.nameForAddr(addr);
    }

    /// @inheritdoc IEVMNamesReverser
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
