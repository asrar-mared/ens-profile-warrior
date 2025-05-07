// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

import {ERC165} from "@openzeppelin/contracts-v5/utils/introspection/ERC165.sol";
import {IReverseRegistrarProvider, IStandaloneReverseRegistrar} from "./IReverseRegistrarProvider.sol";
import {IExtendedResolver} from "../resolvers/profiles/IExtendedResolver.sol";
import {INameResolver} from "../resolvers/profiles/INameResolver.sol";
import {ENSIP19} from "../utils/ENSIP19.sol";

/// @title L1 Default Reverse Resolver
/// @notice Resolves reverse records for EVM addresses to the default registrar. Deployed on the L1 chain.
contract L1DefaultReverseResolver is
    IExtendedResolver,
    IReverseRegistrarProvider,
    ERC165
{
    /// @param name DNS-encoded ENS name that does not exist.
    error UnreachableName(bytes name);

    /// @param selector Function selector of the resolver profile that cannot be answered.
    error UnsupportedResolverProfile(bytes4 selector);

    IStandaloneReverseRegistrar public immutable reverseRegistrar;

    constructor(IStandaloneReverseRegistrar _reverseRegistrar) {
        reverseRegistrar = _reverseRegistrar;
    }

    /// @inheritdoc ERC165
    function supportsInterface(
        bytes4 interfaceId
    ) public view override returns (bool) {
        return
            interfaceId == type(IExtendedResolver).interfaceId ||
            interfaceId == bytes4(keccak256("eip3668.wrappable")) ||
            interfaceId == type(IReverseRegistrarProvider).interfaceId ||
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
            return abi.encode(reverseRegistrar.nameForAddr(addr));
        } else {
            revert UnsupportedResolverProfile(selector);
        }
    }
}
