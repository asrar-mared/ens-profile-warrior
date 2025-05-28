// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

import {Ownable} from "@openzeppelin/contracts-v5/access/Ownable.sol";
import {ERC165} from "@openzeppelin/contracts-v5/utils/introspection/ERC165.sol";
import {GatewayFetchTarget, IGatewayVerifier} from "@unruggable/gateways/contracts/GatewayFetchTarget.sol";
import {GatewayFetcher, GatewayRequest} from "@unruggable/gateways/contracts/GatewayFetcher.sol";
import {IStandaloneReverseRegistrar} from "../reverseRegistrar/IStandaloneReverseRegistrar.sol";
import {IExtendedResolver} from "../resolvers/profiles/IExtendedResolver.sol";
import {IAddressResolver} from "../resolvers/profiles/IAddressResolver.sol";
import {IAddrResolver} from "../resolvers/profiles/IAddrResolver.sol";
import {INameResolver} from "../resolvers/profiles/INameResolver.sol";
import {INameReverser} from "./INameReverser.sol";
import {ENSIP19, COIN_TYPE_ETH} from "../utils/ENSIP19.sol";

/// @title L1 Reverse Resolver
/// @notice Resolves reverse records for EVM addresses via gateway to a L2ReverseRegistrar
///         and queries the default resolver if the name was empty.
contract L1ReverseResolver is
    IExtendedResolver,
    INameReverser,
    GatewayFetchTarget,
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

    /// @notice The default reverse registrar contract.
    IStandaloneReverseRegistrar public immutable defaultRegistrar;

    /// @notice The target registrar contract on the L2 chain.
    address public immutable l2Registrar;

    /// @notice The gateway verifier contract, unique to each L2 chain.
    IGatewayVerifier public immutable l2Verifier;

    /// @notice The verifier gateway URLs.
    string[] public gatewayURLs;

    /// @notice Storage slot for the names mapping in the target registrar contract.
    uint256 constant NAMES_SLOT = 0;

    /// @notice Sets the initial state of the contract.
    ///
    /// @param _owner The owner of the contract, able to modify the gateway URLs.
    /// @param _defaultRegistrar The default reverse registrar contract.
    /// @param _l2Verifier The gateway verifier contract, unique to each L2 chain.
    /// @param gateways The verifier gateway URLs.
    /// @param _l2Registrar The target registrar contract on the L2 chain.
    constructor(
        address _owner,
        IStandaloneReverseRegistrar _defaultRegistrar,
        address _l2Registrar,
        IGatewayVerifier _l2Verifier,
        string[] memory gateways
    ) Ownable(_owner) {
        defaultRegistrar = _defaultRegistrar;
        l2Registrar = _l2Registrar;
        l2Verifier = _l2Verifier;
        gatewayURLs = gateways;
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

    /// @notice Set gateway URLs.
    /// @param gateways The new gateway URLs.
    function setGatewayURLs(string[] memory gateways) external onlyOwner {
        gatewayURLs = gateways;
        emit GatewayURLsChanged(gateways);
    }

    /// @notice Resolves and verifies `name` records on the target L2 chain's registrar contract,
    ///         or falls back to the default resolver if the name is not found.
    ///         Also supports `addr` calls for the L2 chain's reverse namespace,
    ///         which resolves to the target L2 chain's registrar contract.
    /// @notice Callers should enable EIP-3668.
    /// @dev This function may execute over multiple steps.
    /// @param name The name to resolve, in normalised and DNS-encoded form.
    /// @param data The resolution data, as specified in ENSIP-10.
    function resolve(
        bytes calldata name,
        bytes calldata data
    ) external view returns (bytes memory) {
        bytes4 selector = bytes4(data);
        if (selector == INameResolver.name.selector) {
            (bytes memory a, ) = ENSIP19.parse(name);
            if (a.length != 20) revert UnreachableName(name);
            _resolveName(address(bytes20(a)));
        } else if (selector == IAddrResolver.addr.selector) {
            (bool valid, uint256 coinType) = ENSIP19.parseNamespace(name, 0);
            if (!valid) revert UnreachableName(name);
            return
                abi.encode(
                    coinType == COIN_TYPE_ETH ? l2Registrar : address(0)
                );
        } else if (selector == IAddressResolver.addr.selector) {
            (bool valid, uint256 coinType) = ENSIP19.parseNamespace(name, 0);
            if (!valid) revert UnreachableName(name);
            (, uint256 reqCoinType) = abi.decode(data[4:], (bytes32, uint256));
            return
                abi.encode(
                    reqCoinType == coinType
                        ? abi.encodePacked(l2Registrar)
                        : new bytes(0)
                );
        } else {
            revert UnsupportedResolverProfile(selector);
        }
    }

    /// @dev Resolve one address to a name.
    ///      This function executes over multiple steps (step 1 of 2).
    function _resolveName(address addr) internal view {
        GatewayRequest memory req = GatewayFetcher.newRequest(1);
        req.setTarget(l2Registrar); // target L2 registrar
        req.setSlot(NAMES_SLOT).push(addr).follow().readBytes(); // names[addr]
        req.setOutput(0);
        fetch(
            l2Verifier,
            req,
            this.resolveNameCallback.selector,
            abi.encode(addr),
            gatewayURLs
        );
    }

    /// @dev CCIP-Read callback for `_resolveName()` (step 2 of 2).
    /// @param values The outputs for `GatewayRequest` (1 name).
    /// @param extraData The contextual data passed from `_resolveName()`.
    /// @return result The abi-encoded name for the given address.
    function resolveNameCallback(
        bytes[] memory values,
        uint8 /* exitCode */,
        bytes calldata extraData
    ) external view returns (bytes memory result) {
        string memory name = string(values[0]);
        if (bytes(name).length == 0) {
            address addr = abi.decode(extraData, (address));
            name = defaultRegistrar.nameForAddr(addr);
        }
        result = abi.encode(name);
    }

    /// @inheritdoc INameReverser
    function resolveNames(
        address[] memory addrs,
        uint8 perPage
    ) external view returns (string[] memory names) {
        names = new string[](addrs.length);
        _resolveNames(addrs, names, 0, perPage);
    }

    /// @dev Resolve the next page of addresses to names.
    ///      This function executes over multiple steps (step 1 of 2).
    function _resolveNames(
        address[] memory addrs,
        string[] memory names,
        uint256 start,
        uint8 perPage
    ) internal view {
        uint256 end = start + perPage;
        if (end > addrs.length) end = addrs.length;
        uint8 count = uint8(end - start);
        if (count == 0) return; // done
        GatewayRequest memory req = GatewayFetcher.newRequest(count);
        req.setTarget(l2Registrar); // target L2 registrar
        for (uint256 i; i < count; i++) {
            req.setSlot(NAMES_SLOT).push(addrs[start + i]).follow().readBytes(); // names[addr[i]]
            req.setOutput(uint8(i));
        }
        fetch(
            l2Verifier,
            req,
            this.resolveNamesCallback.selector,
            abi.encode(addrs, names, start, perPage),
            gatewayURLs
        );
    }

    /// @dev CCIP-Read callback for `resolveNames()` (step 2 of 2).
    ///      Recursive if there are still names to resolve.
    /// @param values The outputs for `GatewayRequest` (N names).
    /// @param extraData The contextual data passed from `_resolveNames()`.
    /// @return names The corresponding names.
    function resolveNamesCallback(
        bytes[] memory values,
        uint8 /* exitCode */,
        bytes calldata extraData
    ) external view returns (string[] memory names) {
        address[] memory addrs;
        uint256 start;
        uint8 perPage;
        (addrs, names, start, perPage) = abi.decode(
            extraData,
            (address[], string[], uint256, uint8)
        );
        for (uint256 i; i < values.length; i++) {
            string memory name = string(values[i]);
            if (bytes(name).length == 0) {
                name = defaultRegistrar.nameForAddr(addrs[i]);
            }
            names[start + i] = name;
        }
        _resolveNames(addrs, names, start + values.length, perPage);
    }
}
