// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

interface IBatchReverser {
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
