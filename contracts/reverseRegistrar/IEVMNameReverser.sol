// SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

/// @notice Interface for efficient `name()` lookup for `address`.
interface IEVMNameReverser {
    /// @notice Returns the name for an `address`.
    /// @param addr The address to get the name for.
    /// @return name The name for the address.
    function nameForAddr(
        address addr
    ) external view returns (string memory name);
}
