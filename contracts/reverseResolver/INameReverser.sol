// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

interface INameReverser {
    /// @notice Resolve one address to a name.
    /// @notice Callers should enable EIP-3668.
    /// @param addr The address to resolve.
    /// @return name The corresponding name.
    function resolveName(
        address addr
    ) external view returns (string memory name);

    /// @notice Resolve multiple addresses to names.
    /// @notice Callers should enable EIP-3668.
    /// @dev This function executes over multiple steps (step 1 of 2+).
    /// @param addrs The addresses to resolve.
    /// @param perPage The maximum number of addresses to resolve per call.
    /// @return names The corresponding names.
    function resolveNames(
        address[] memory addrs,
        uint8 perPage
    ) external view returns (string[] memory names);
}
