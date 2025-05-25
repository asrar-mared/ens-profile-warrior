// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

import {Ownable} from "@openzeppelin/contracts-v5/access/Ownable.sol";
import {ERC165} from "@openzeppelin/contracts-v5/utils/introspection/ERC165.sol";
import {GatewayFetchTarget, IGatewayVerifier} from "@unruggable/gateways/contracts/GatewayFetchTarget.sol";
import {GatewayFetcher, GatewayRequest} from "@unruggable/gateways/contracts/GatewayFetcher.sol";
import {IUniversalResolver} from "../universalResolver/IUniversalResolver.sol";
import {IExtendedResolver} from "../resolvers/profiles/IExtendedResolver.sol";
import {IAddressResolver} from "../resolvers/profiles/IAddressResolver.sol";
import {IAddrResolver} from "../resolvers/profiles/IAddrResolver.sol";
import {INameResolver} from "../resolvers/profiles/INameResolver.sol";
import {NameCoder} from "../utils/NameCoder.sol";
import {INameReverser} from "./INameReverser.sol";
import {ENSIP19, COIN_TYPE_ETH} from "../utils/ENSIP19.sol";

/// @title L1 Reverse Resolver
/// @notice Resolves reverse records for an L2 chain. Deployed on the L1 chain.
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

    /// @notice The UniveralResolver contract.
    IUniversalResolver immutable ur;

    /// @notice The gateway verifier contract, unique to each L2 chain.
    IGatewayVerifier public immutable l2Verifier;

    /// @notice The verifier gateway URLs.
    string[] public gatewayURLs;

    /// @notice The target registrar contract on the L2 chain.
    address public immutable l2Registrar;

    /// @notice Storage slot for the names mapping in the target registrar contract.
    uint256 constant NAMES_SLOT = 0;

    /// @notice Sets the initial state of the contract.
    ///
    /// @param _owner The owner of the contract, able to modify the gateway URLs.
    /// @param _ur The UniveralResolver contract.
    /// @param verifier The gateway verifier contract, unique to each L2 chain.
    /// @param gateways The verifier gateway URLs.
    /// @param registrar The target registrar contract on the L2 chain.
    constructor(
        address _owner,
        IUniversalResolver _ur,
        IGatewayVerifier verifier,
        string[] memory gateways,
        address registrar
    ) Ownable(_owner) {
        ur = _ur;
        l2Verifier = verifier;
        gatewayURLs = gateways;
        l2Registrar = registrar;
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

    /// @notice Sets the gateway URLs.
    ///
    /// @param gateways The new gateway URLs.
    function setGatewayURLs(string[] memory gateways) external onlyOwner {
        gatewayURLs = gateways;
        emit GatewayURLsChanged(gateways);
    }

    /// @dev The current Default Registrar.
    function defaultReverser() public view returns (INameReverser reverser) {
        (address resolver, , ) = ur.findResolver("\x07default\x07reverse\x00");
        reverser = INameReverser(resolver);
    }

    /// @notice Resolves and verifies `name` records on the target L2 chain's registrar contract,
    ///         or falls back to the default resolver if the name is not found.
    ///         Also supports `addr` calls for the L2 chain's reverse namespace,
    ///         which resolves to the target L2 chain's registrar contract.
    /// @notice Callers should enable EIP-3668.
    /// @dev This function executes over multiple steps (step 1 of 2).
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
            _resolveName(address(bytes20(a)), true);
        } else if (selector == IAddrResolver.addr.selector) {
            (bool valid, ) = ENSIP19.parseNamespace(name, 0);
            if (!valid) revert UnreachableName(name);
            return abi.encode(address(this));
        } else if (selector == IAddressResolver.addr.selector) {
            (bool valid, uint256 coinType) = ENSIP19.parseNamespace(name, 0);
            if (!valid) revert UnreachableName(name);
            (, uint256 reqCoinType) = abi.decode(data[4:], (bytes32, uint256));
            if (reqCoinType == COIN_TYPE_ETH) {
                return abi.encode(abi.encodePacked(address(this)));
            } else if (reqCoinType == coinType) {
                return abi.encode(abi.encodePacked(l2Registrar));
            } else {
                return abi.encode("");
            }
        } else {
            revert UnsupportedResolverProfile(selector);
        }
    }

    /// @inheritdoc INameReverser
    function resolveName(
        address addr
    ) external view returns (string memory /*name*/) {
        _resolveName(addr, false);
    }

    /// @dev Resolve one name to an address.
    ///      This function executes over multiple steps (step 1 of 2).
    /// @param addr The address to resolve.
    /// @param wrap True if the result should be abi-encoded.
    function _resolveName(address addr, bool wrap) internal view {
        GatewayRequest memory req = GatewayFetcher.newRequest(1);
        req.setTarget(l2Registrar); // target L2 registrar
        req.setSlot(NAMES_SLOT).push(addr).follow().readBytes(); // names[addr]
        req.setOutput(0);
        fetch(
            l2Verifier,
            req,
            this.resolveNameCallback.selector,
            abi.encode(addr, wrap),
            gatewayURLs
        );
    }

    /// @dev CCIP-Read callback for `resolveName()` (step 2 of 2).
    /// @param values The outputs for `GatewayRequest` (1 name).
    /// @param extraData The contextual data passed from `_resolveName()`.
    /// @return result The name or abi-encoded name for the given address.
    function resolveNameCallback(
        bytes[] memory values,
        uint8 /* exitCode */,
        bytes calldata extraData
    ) external view returns (bytes memory result) {
        (address addr, bool wrap) = abi.decode(extraData, (address, bool));
        result = values[0];
        if (result.length == 0) {
            result = bytes(defaultReverser().resolveName(addr));
        }
        if (wrap) {
            result = abi.encode(result);
        }
    }

    /// @inheritdoc INameReverser
    function resolveNames(
        address[] memory addrs,
        uint8 perPage
    ) external view returns (string[] memory names) {
        names = defaultReverser().resolveNames(addrs, perPage);
        _resolveNames(addrs, names, 0, perPage);
    }

    /// @dev Resolve the names for the next page of addresses.
    ///      This function executes over multiple steps (step 1 of 2+).
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
            req.setSlot(NAMES_SLOT);
            req.push(addrs[start + i]).follow().readBytes(); // names[addr[i]]
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

    /// @dev CCIP-Read callback for `resolveNames()` (step 2 of 2+).
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
            bytes memory v = values[i];
            if (v.length > 0) {
                names[start + i] = string(v);
            }
        }
        _resolveNames(addrs, names, start + values.length, perPage);
    }
}
