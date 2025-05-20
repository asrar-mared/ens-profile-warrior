// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

import {ERC165} from "@openzeppelin/contracts-v5/utils/introspection/ERC165.sol";
import {ENS} from "../registry/ENS.sol";
import {IStandaloneReverseRegistrar} from "../reverseRegistrar/IStandaloneReverseRegistrar.sol";
import {IExtendedResolver} from "../resolvers/profiles/IExtendedResolver.sol";
import {IEVMNamesReverser} from "./IEVMNamesReverser.sol";

abstract contract AbstractL1ReverseResolver is
    IExtendedResolver,
    IEVMNamesReverser,
    ERC165
{
    /// @notice Thrown when the name is not reachable in this resolver's namespace.
    error UnreachableName(bytes name);

    /// @notice Thrown when the resolver profile is unknown.
    error UnsupportedResolverProfile(bytes4 selector);

    /// @dev The ENS registry contract.
    ENS immutable registry;

    /// @dev The namehash of 'default.reverse'
    bytes32 constant DEFAULT_NODE =
        keccak256(
            abi.encode(
                keccak256(abi.encode(0, keccak256("reverse"))),
                keccak256("default")
            )
        );

    /// @param ens The ENS registry contract.
    constructor(ENS ens) {
        registry = ens;
    }

    /// @inheritdoc ERC165
    function supportsInterface(
        bytes4 interfaceId
    ) public view override returns (bool) {
        return
            interfaceId == type(IExtendedResolver).interfaceId ||
            interfaceId == type(IEVMNamesReverser).interfaceId ||
            super.supportsInterface(interfaceId);
    }

	/// @return registrar The default reverse registrar.
	function defaultRegistrar() public view returns (IStandaloneReverseRegistrar registrar) {
		registrar = IStandaloneReverseRegistrar(registry.owner(DEFAULT_NODE));
	}
}
