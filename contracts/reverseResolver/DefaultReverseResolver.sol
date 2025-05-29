// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

import {AbstractReverseResolver} from "./AbstractReverseResolver.sol";
import {IStandaloneReverseRegistrar} from "../reverseRegistrar/IStandaloneReverseRegistrar.sol";
import {EVM_BIT} from "../utils/ENSIP19.sol";

/// @title Default Reverse Resolver
/// @notice Reverses an EVM address using the `IStandaloneReverseRegistrar` for "default.reverse".
contract DefaultReverseResolver is AbstractReverseResolver {
    /// @notice The reverse registrar contract for "default.reverse".
    IStandaloneReverseRegistrar public immutable defaultRegistrar;

    constructor(
        IStandaloneReverseRegistrar _defaultRegistrar
    ) AbstractReverseResolver(EVM_BIT, address(_defaultRegistrar)) {
        defaultRegistrar = _defaultRegistrar;
    }

    /// @inheritdoc AbstractReverseResolver
    function _resolveName(
        address addr
    ) internal view override returns (string memory name) {
        name = defaultRegistrar.nameForAddr(addr);
    }
}
