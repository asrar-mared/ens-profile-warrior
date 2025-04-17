// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

import {ERC165, IERC165} from "@openzeppelin/contracts-v5/utils/introspection/ERC165.sol";
import {Ownable} from "@openzeppelin/contracts-v5/access/Ownable.sol";
import {GatewayFetchTarget, IGatewayVerifier} from "@unruggable/gateways/contracts/GatewayFetchTarget.sol";
import {GatewayFetcher, GatewayRequest} from "@unruggable/gateways/contracts/GatewayFetcher.sol";

import {INameResolver} from "../resolvers/profiles/INameResolver.sol";
import {IAddrResolver} from "../resolvers/profiles/IAddrResolver.sol";
import {IAddressResolver} from "../resolvers/profiles/IAddressResolver.sol";
import {HexUtils} from "../utils/HexUtils.sol";
import {IExtendedResolver} from "../resolvers/profiles/IExtendedResolver.sol";
import {IStandaloneReverseRegistrar} from "./IStandaloneReverseRegistrar.sol";
import {ENS} from "../registry/ENS.sol";

/// @title L1 Reverse Resolver
/// @notice Resolves reverse records for an L2 chain. Deployed on the L1 chain.
contract L1ReverseResolver is
    GatewayFetchTarget,
    IExtendedResolver,
    ERC165,
    Ownable
{
    using GatewayFetcher for GatewayRequest;

    /// @notice The ENS registry contract.
    ENS public immutable ens;

    /// @notice The gateway verifier contract, unique to each L2 chain.
    IGatewayVerifier public immutable verifier;

    /// @notice The target registrar contract on the L2 chain.
    address public immutable l2Registrar;

    /// @notice A keccak256 hash of the DNS encoded reverse name.
    ///         NOT using the ENS namehash algorithm
    bytes32 internal immutable _dnsEncodedReverseNameHash;

    /// @notice The length of the DNS encoded reverse name.
    uint256 internal immutable _dnsEncodedReverseNameLength;

    /// @notice The namehash of 'default.reverse'
    bytes32 constant DEFAULT_REVERSE_NODE =
        0x53a2e7cce84726721578c676b4798972d354dd7c62c832415371716693edd312;

    /// @notice Storage slot for the names mapping in the target registrar contract.
    uint256 internal constant NAMES_SLOT = 0;

    /// @notice The length of an address in bytes.
    uint256 internal constant ADDRESS_LENGTH = 40;

    /// @notice The verifier gateway URLs.
    string[] internal _urls;

    /// @notice Emitted when the gateway URLs are changed.
    event GatewayURLsChanged(string[] urls);

    /// @notice Thrown when the name is not reachable in this resolver's namespace.
    error UnreachableName(bytes name);

    /// @notice Thrown when the resolver profile is unknown.
    error UnsupportedResolverProfile(bytes4 selector);

    /// @notice Sets the initial state of the contract.
    ///
    /// @param owner_ The owner of the contract, able to modify the gateway URLs.
    /// @param ens_ The ENS registry contract.
    /// @param verifier_ The gateway verifier contract, unique to each L2 chain.
    /// @param l2Registrar_ The target registrar contract on the L2 chain.
    /// @param dnsEncodedReverseName_ The DNS encoded reverse name.
    /// @param urls_ The verifier gateway URLs.
    constructor(
        address owner_,
        ENS ens_,
        IGatewayVerifier verifier_,
        address l2Registrar_,
        bytes memory dnsEncodedReverseName_,
        string[] memory urls_
    ) Ownable(owner_) {
        ens = ens_;
        verifier = verifier_;
        l2Registrar = l2Registrar_;
        _dnsEncodedReverseNameHash = keccak256(dnsEncodedReverseName_);
        _dnsEncodedReverseNameLength = dnsEncodedReverseName_.length;
        _urls = urls_;
    }

    /// @notice Sets the gateway URLs.
    ///
    /// @param urls The new gateway URLs.
    function setGatewayURLs(string[] memory urls) external onlyOwner {
        _urls = urls;
        emit GatewayURLsChanged(urls);
    }

    /// @notice Gets the gateway URLs.
    ///
    /// @return The gateway URLs.
    function gatewayURLs() external view returns (string[] memory) {
        return _urls;
    }

    /// @notice Resolves and verifies `name` records on the target L2 chain's registrar contract,
    ///         or falls back to the default resolver if the name is not found.
    ///         Also supports `addr` calls for the L2 chain's reverse namespace,
    ///         which resolves to the target L2 chain's registrar contract.
    ///
    /// @param name The DNS encoded ENS name to query.
    /// @param data The resolver calldata.
    /// @return result The result of the call.
    function resolve(
        bytes calldata name,
        bytes calldata data
    ) external view returns (bytes memory result) {
        bytes4 selector = bytes4(data);

        bool isNamespaceCall = keccak256(name) == _dnsEncodedReverseNameHash;
        if (!isNamespaceCall) {
            if (
                name.length != _dnsEncodedReverseNameLength + ADDRESS_LENGTH + 1
            ) revert UnreachableName(name);
            if (keccak256(name[41:]) != _dnsEncodedReverseNameHash)
                revert UnreachableName(name);
        }

        if (selector == INameResolver.name.selector) {
            if (isNamespaceCall) return abi.encode("");
            (address addr, bool valid) = HexUtils.hexToAddress(
                name,
                1,
                ADDRESS_LENGTH + 1
            );
            if (!valid) revert UnreachableName(name);
            // Always throws, does not need to return.
            _fetchName(addr);
        } else if (selector == IAddressResolver.addr.selector) {
            if (isNamespaceCall)
                return abi.encode(abi.encodePacked(l2Registrar));
            return abi.encode("");
        }

        revert UnsupportedResolverProfile(selector);
    }

    /// @notice Callback function, called by the verifier contract.
    ///
    /// @dev If the returned value is empty, data is returned from the default resolver.
    ///
    /// @param values The values returned from the verifier contract.
    ///               Should be a single value.
    /// @param carry The address to query the default resolver for, ABI encoded.
    /// @return The name for the given address, ABI encoded.
    function fetchNameCallback(
        bytes[] memory values,
        uint8 /* exitCode */,
        bytes memory carry
    ) external view returns (bytes memory) {
        if (values[0].length == 0) {
            address addr = abi.decode(carry, (address));
            return abi.encode(_getDefaultNameFromAddr(addr));
        } else {
            return abi.encode(values[0]);
        }
    }

    /// @dev Fetches the name for a given node using the verifier contract.
    ///
    /// @param addr The address used for the query.
    function _fetchName(address addr) internal view {
        fetch(
            // Verifier target
            verifier,
            // Gateway request
            // 1 request to L2 target registrar contract
            // Gets data for `names[addr]`
            GatewayFetcher
                .newRequest(1)
                .setTarget(l2Registrar)
                .setSlot(NAMES_SLOT)
                .push(bytes32(uint256(uint160(addr))))
                .follow()
                .readBytes()
                .setOutput(0),
            // Callback function
            this.fetchNameCallback.selector,
            // Carry data, for default fallback
            abi.encode(addr),
            // Gateway URLs
            _urls
        );
    }

    /// @dev Resolves the default reverse registrar, and returns the name for the given address.
    ///
    /// @param addr The address to query the default resolver for.
    /// @return The default name for the given address.
    function _getDefaultNameFromAddr(
        address addr
    ) internal view returns (string memory) {
        IStandaloneReverseRegistrar defaultReverseRegistrar = IStandaloneReverseRegistrar(
                ens.resolver(DEFAULT_REVERSE_NODE)
            );
        return defaultReverseRegistrar.nameForAddr(addr);
    }

    /// @inheritdoc IERC165
    function supportsInterface(
        bytes4 interfaceId
    ) public view override returns (bool) {
        return
            interfaceId == bytes4(keccak256("eip3668.wrappable")) ||
            interfaceId == type(IExtendedResolver).interfaceId ||
            super.supportsInterface(interfaceId);
    }
}
