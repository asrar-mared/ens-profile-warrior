// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

import {ERC165} from "@openzeppelin/contracts-v5/utils/introspection/ERC165.sol";
import {Ownable} from "@openzeppelin/contracts-v5/access/Ownable.sol";
import {GatewayFetchTarget, IGatewayVerifier} from "@ensdomains/unruggable-gateways/contracts/GatewayFetchTarget.sol";
import {GatewayFetcher, GatewayRequest} from "@ensdomains/unruggable-gateways/contracts/GatewayFetcher.sol";
import {IReverseRegistrarProvider} from "./IReverseRegistrarProvider.sol";
import {ENS} from "../registry/ENS.sol";
import {IExtendedResolver} from "../resolvers/profiles/IExtendedResolver.sol";
import {IAddressResolver} from "../resolvers/profiles/IAddressResolver.sol";
import {INameResolver} from "../resolvers/profiles/INameResolver.sol";
import {NameCoder} from "../utils/NameCoder.sol";
import {ENSIP19} from "../utils/ENSIP19.sol";

/// @title L1 Reverse Resolver
/// @notice Resolves reverse records for an L2 chain. Deployed on the L1 chain.
contract L1ReverseResolver is
    GatewayFetchTarget,
    IExtendedResolver,
    ERC165,
    Ownable
{
    using GatewayFetcher for GatewayRequest;

    /// @notice Emitted when the gateway URLs are changed.
    event GatewayURLsChanged(string[] urls);

    /// @notice Thrown when the name is not reachable in this resolver's namespace.
    error UnreachableName(bytes name);

    /// @notice Thrown when the resolver profile is unknown.
    error UnsupportedResolverProfile(bytes4 selector);

    /// @notice The ENS registry contract.
    ENS immutable registry;

    /// @notice The gateway verifier contract, unique to each L2 chain.
    IGatewayVerifier public immutable l2Verifier;

    /// @notice The verifier gateway URLs.
    string[] public gatewayURLs;

    /// @notice The target registrar contract on the L2 chain.
    address public immutable l2Registrar;

    /// @notice The namehash of 'reverse'
    bytes32 constant REVERSE_NODE =
        keccak256(abi.encode(0, keccak256("reverse")));

    /// @notice Storage slot for the names mapping in the target registrar contract.
    uint256 constant NAMES_SLOT = 0;

    /// @notice Sets the initial state of the contract.
    ///
    /// @param _owner The owner of the contract, able to modify the gateway URLs.
    /// @param ens The ENS registry contract.
    /// @param verifier The gateway verifier contract, unique to each L2 chain.
    /// @param gateways The verifier gateway URLs.
    /// @param registrar The target registrar contract on the L2 chain.
    constructor(
        address _owner,
        ENS ens,
        IGatewayVerifier verifier,
        string[] memory gateways,
        address registrar
    ) Ownable(_owner) {
        registry = ens;
        l2Verifier = verifier;
        gatewayURLs = gateways;
        l2Registrar = registrar;
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

    /// @notice Sets the gateway URLs.
    ///
    /// @param gateways The new gateway URLs.
    function setGatewayURLs(string[] memory gateways) external onlyOwner {
        gatewayURLs = gateways;
        emit GatewayURLsChanged(gateways);
    }

    /// @notice Resolves and verifies `name` records on the target L2 chain's registrar contract,
    ///         or falls back to the default resolver if the name is not found.
    ///         Also supports `addr` calls for the L2 chain's reverse namespace,
    ///         which resolves to the target L2 chain's registrar contract.
    ///
    /// @param name The DNS encoded ENS name to query.
    /// @param data The resolver calldata.
    function resolve(
        bytes calldata name,
        bytes calldata data
    ) external view returns (bytes memory) {
        bytes4 selector = bytes4(data);
        if (selector == INameResolver.name.selector) {
            (bytes memory a, ) = ENSIP19.parse(name);
            if (a.length != 20) revert UnreachableName(name);
            address addr = address(bytes20(a));
            GatewayRequest memory req = GatewayFetcher.newRequest(1);
            req.setTarget(l2Registrar); // target L2 registrar
            req.setSlot(NAMES_SLOT).push(addr).follow().readBytes(); // names[addr]
            req.setOutput(0);
            fetch(
                l2Verifier,
                req,
                this.fetchNameCallback.selector,
                abi.encode(addr),
                gatewayURLs
            );
        } else if (selector == IAddressResolver.addr.selector) {
            address resolver = registry.resolver(NameCoder.namehash(name, 0));
            if (resolver != address(this)) revert UnreachableName(name);
            return abi.encode(abi.encodePacked(l2Registrar));
        } else {
            revert UnsupportedResolverProfile(selector);
        }
    }

    /// @notice Callback function, called by the verifier contract.
    ///
    /// @dev If the primary name is empty, the default resolver is used.
    ///
    /// @param values The values returned from the verifier contract.
    ///               Should be a single value.
    /// @param extraData The contextual data passed from `resolve()`.
    /// @return The name for the given address, ABI encoded.
    function fetchNameCallback(
        bytes[] memory values,
        uint8 /* exitCode */,
        bytes calldata extraData
    ) external view returns (bytes memory) {
        bytes memory primary = values[0];
        if (primary.length == 0) {
            address resolver = registry.resolver(REVERSE_NODE);
            if (resolver != address(0)) {
                address addr = abi.decode(extraData, (address));
                primary = bytes(
                    IReverseRegistrarProvider(resolver)
                        .reverseRegistrar()
                        .nameForAddr(addr)
                );
            }
        }
        return abi.encode(primary);
    }
}
