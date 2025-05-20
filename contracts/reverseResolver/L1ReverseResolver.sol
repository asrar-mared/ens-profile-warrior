// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

import {Ownable} from "@openzeppelin/contracts-v5/access/Ownable.sol";
import {GatewayFetchTarget, IGatewayVerifier} from "@unruggable/gateways/contracts/GatewayFetchTarget.sol";
import {GatewayFetcher, GatewayRequest} from "@unruggable/gateways/contracts/GatewayFetcher.sol";
import {AbstractL1ReverseResolver} from "./AbstractL1ReverseResolver.sol";
import {ENS} from "../registry/ENS.sol";
import {IStandaloneReverseRegistrar} from "../reverseRegistrar/IStandaloneReverseRegistrar.sol";
import {IAddressResolver} from "../resolvers/profiles/IAddressResolver.sol";
import {INameResolver} from "../resolvers/profiles/INameResolver.sol";
import {NameCoder} from "../utils/NameCoder.sol";
import {IEVMNamesReverser} from "./IEVMNamesReverser.sol";
import {ENSIP19} from "../utils/ENSIP19.sol";

/// @title L1 Reverse Resolver
/// @notice Resolves reverse records for an L2 chain. Deployed on the L1 chain.
contract L1ReverseResolver is
    AbstractL1ReverseResolver,
    GatewayFetchTarget,
    Ownable
{
    using GatewayFetcher for GatewayRequest;

    /// @notice Emitted when the gateway URLs are changed.
    event GatewayURLsChanged(string[] urls);

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
    ) AbstractL1ReverseResolver(ens) Ownable(_owner) {
        l2Verifier = verifier;
        gatewayURLs = gateways;
        l2Registrar = registrar;
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
        } else if (selector == IAddressResolver.addr.selector) {
            address resolver = registry.resolver(NameCoder.namehash(name, 0));
            return
                abi.encode(
                    resolver == address(this)
                        ? abi.encodePacked(l2Registrar)
                        : new bytes(0)
                );
        } else {
            revert UnsupportedResolverProfile(selector);
        }
    }

    /// @dev CCIP-Read callback for `resolve()` (step 2 of 2).
    /// @param values The outputs for `GatewayRequest` (1 name).
    /// @param extraData The contextual data passed from `resolve()`.
    /// @return result The abi-encoded name for the given address.
    function resolveNameCallback(
        bytes[] memory values,
        uint8 /* exitCode */,
        bytes calldata extraData
    ) external view returns (bytes memory result) {
        string memory name = string(values[0]);
        if (bytes(name).length == 0) {
            address addr = abi.decode(extraData, (address));
            name = defaultRegistrar().nameForAddr(addr);
        }
        result = abi.encode(name);
    }

    /// @inheritdoc IEVMNamesReverser
    function resolveNames(
        address[] memory addrs,
        uint8 perPage
    ) external view returns (string[] memory names) {
        names = new string[](addrs.length);
        _resolveNames(addrs, names, 0, perPage == 0 ? 255 : perPage);
    }

    /// @dev Resolve the next page of names.
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
    /// @param extraData The contextual data passed from `resolveNames()`.
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
        IStandaloneReverseRegistrar rr = defaultRegistrar();
        for (uint256 i; i < values.length; i++) {
            string memory name = string(values[i]);
            if (bytes(name).length == 0) {
                name = rr.nameForAddr(addrs[start + i]);
            }
            names[start + i] = name;
        }
        _resolveNames(addrs, names, start + values.length, perPage);
    }
}
