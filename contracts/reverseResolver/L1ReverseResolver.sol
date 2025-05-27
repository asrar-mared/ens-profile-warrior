// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

import {Ownable} from "@openzeppelin/contracts-v5/access/Ownable.sol";
import {ERC165} from "@openzeppelin/contracts-v5/utils/introspection/ERC165.sol";
import {GatewayFetchTarget, IGatewayVerifier} from "@unruggable/gateways/contracts/GatewayFetchTarget.sol";
import {GatewayFetcher, GatewayRequest} from "@unruggable/gateways/contracts/GatewayFetcher.sol";
import {IUniversalResolver} from "../universalResolver/IUniversalResolver.sol";
import {CCIPReader} from "../ccipRead/CCIPReader.sol";
import {IExtendedResolver} from "../resolvers/profiles/IExtendedResolver.sol";
import {IAddressResolver} from "../resolvers/profiles/IAddressResolver.sol";
import {IAddrResolver} from "../resolvers/profiles/IAddrResolver.sol";
import {INameResolver} from "../resolvers/profiles/INameResolver.sol";
import {INameReverser} from "./INameReverser.sol";
import {ENSIP19, COIN_TYPE_ETH} from "../utils/ENSIP19.sol";

/// @title L1 Reverse Resolver
/// @notice Resolves reverse records for an L2 chain. Deployed on the L1 chain.
contract L1ReverseResolver is
    IExtendedResolver,
    INameReverser,
    CCIPReader,
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

    bytes constant DEFAULT_NAMESPACE = "\x07default\x07reverse\x00";

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
            address addr = address(bytes20(a));
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
        } else if (selector == IAddrResolver.addr.selector) {
            (bool valid, ) = ENSIP19.parseNamespace(name, 0);
            if (!valid) revert UnreachableName(name);
            return abi.encode(this);
        } else if (selector == IAddressResolver.addr.selector) {
            (bool valid, uint256 coinType) = ENSIP19.parseNamespace(name, 0);
            if (!valid) revert UnreachableName(name);
            (, uint256 reqCoinType) = abi.decode(data[4:], (bytes32, uint256));
            if (reqCoinType == COIN_TYPE_ETH) {
                return abi.encode(abi.encodePacked(this));
            } else if (reqCoinType == coinType) {
                return abi.encode(abi.encodePacked(l2Registrar));
            } else {
                return abi.encode("");
            }
        } else {
            revert UnsupportedResolverProfile(selector);
        }
    }

    /// @dev The current default resolver.
    function defaultResolver() public view returns (address resolver) {
        (resolver, , ) = ur.findResolver(DEFAULT_NAMESPACE);
    }

    /// @dev CCIP-Read callback for `resolve()` (step 2 of 3).
    /// @param values The outputs for `GatewayRequest` (1 name).
    /// @param extraData The contextual data passed from `_resolveName()`.
    /// @return result The abi-encoded name for the given address.
    function resolveNameCallback(
        bytes[] memory values,
        uint8 /* exitCode */,
        bytes calldata extraData
    ) external view returns (bytes memory result) {
        result = values[0];
        if (result.length == 0) {
            address[] memory addrs = new address[](1);
            addrs[0] = abi.decode(extraData, (address));
            ccipRead(
                defaultResolver(),
                abi.encodeCall(INameReverser.resolveNames, (addrs, 1)),
                this.resolveDefaultNameCallback.selector,
                ""
            );
        }
        result = abi.encode(result);
    }

    /// @dev CCIP-Read callback for `resolveNameCallback()` (step 3 of 3).
    /// @param response The response data from `INameReverser.resolveNames()`.
    /// @return result The abi-encoded name for the given address.
    function resolveDefaultNameCallback(
        bytes calldata response,
        bytes calldata /*extraData*/
    ) external pure returns (bytes memory result) {
        string[] memory names = abi.decode(response, (string[])); // INameReverser.resolveNames()
        result = abi.encode(names[0]);
    }

    /// @inheritdoc INameReverser
    function resolveNames(
        address[] memory addrs,
        uint8 perPage
    ) external view returns (string[] memory names) {
        names = new string[](addrs.length);
        _resolveNames(addrs, names, 0, perPage);
    }

    /// @dev Resolve the names for the next page of addresses.
    ///      This function executes over multiple steps (step 1 of 3).
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

    /// @dev CCIP-Read callback for `resolveNames()` (step 2 of 3).
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
        uint256 count;
        for (uint256 i; i < names.length; i++) {
            if (bytes(names[i]).length == 0) {
                addrs[count++] = addrs[i];
            }
        }
        if (count > 0) {
            assembly {
                mstore(addrs, count) // truncate
            }
            ccipRead(
                defaultResolver(),
                abi.encodeCall(INameReverser.resolveNames, (addrs, perPage)),
                this.resolveDefaultNamesCallback.selector,
                abi.encode(names)
            );
        }
    }

    /// @dev CCIP-Read callback for `resolveNames()` (step 3 of 3).
    /// @param response The response data from `INameReverser.resolveNames()`.
    /// @return names The corresponding names.
    function resolveDefaultNamesCallback(
        bytes calldata response,
        bytes calldata extraData
    ) external pure returns (string[] memory names) {
        names = abi.decode(extraData, (string[]));
        string[] memory defaults = abi.decode(response, (string[])); // INameReverser.resolveNames()
        uint256 count;
        for (uint256 i; i < names.length; i++) {
            if (bytes(names[i]).length == 0) {
                names[i] = defaults[count++];
            }
        }
    }
}
