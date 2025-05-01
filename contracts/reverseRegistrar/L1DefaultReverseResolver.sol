// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

import {ERC165} from "@openzeppelin/contracts-v5/utils/introspection/ERC165.sol";
import {IStandaloneReverseRegistrar} from "./IStandaloneReverseRegistrar.sol";
import {IExtendedResolver} from "../resolvers/profiles/IExtendedResolver.sol";
import {INameResolver} from "../resolvers/profiles/INameResolver.sol";
import {ENSIP19} from "../utils/ENSIP19.sol";

contract L1DefaultReverseResolver is IExtendedResolver, ERC165 {
    /// @param name DNS-encoded ENS name that does not exist.
    error UnreachableName(bytes name);

    /// @param selector Function selector of the resolver profile that cannot be answered.
    error UnsupportedResolverProfile(bytes4 selector);

    IStandaloneReverseRegistrar public immutable defaultRegistrar;

    constructor(IStandaloneReverseRegistrar _defaultRegistrar) {
        defaultRegistrar = _defaultRegistrar;
    }

    /// @inheritdoc ERC165
    function supportsInterface(
        bytes4 interfaceId
    ) public view override returns (bool) {
        return
            interfaceId == bytes4(keccak256("eip3668.wrappable")) ||
            interfaceId == type(IExtendedResolver).interfaceId ||
            super.supportsInterface(interfaceId);
    }

    function resolve(
        bytes calldata name,
        bytes calldata data
    ) external view returns (bytes memory result) {
        if (bytes4(data) == INameResolver.name.selector) {
            (bytes memory a, uint256 coinType) = ENSIP19.parse(name);
            if (a.length != 20 || !ENSIP19.isEVMCoinType(coinType)) {
                revert UnreachableName(name);
            }
            address addr = address(bytes20(a));
            return abi.encode(defaultRegistrar.nameForAddr(addr));
        } else {
            revert UnsupportedResolverProfile(bytes4(data));
        }
    }
}
