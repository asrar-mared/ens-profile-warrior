//SPDX-License-Identifier: MIT
pragma solidity ~0.8.17;

import {HexUtils} from "./HexUtils.sol";

contract TestHexUtils {
    using HexUtils for *;

    function hexToBytes(
        bytes calldata name,
        uint256 idx,
        uint256 lastIdx
    ) public pure returns (bytes memory, bool) {
        return name.hexToBytes(idx, lastIdx);
    }

    function hexStringToBytes32(
        bytes calldata name,
        uint256 idx,
        uint256 lastIdx
    ) public pure returns (bytes32, bool) {
        return name.hexStringToBytes32(idx, lastIdx);
    }

    function hexToAddress(
        bytes calldata input,
        uint256 idx,
        uint256 lastIdx
    ) public pure returns (address, bool) {
        return input.hexToAddress(idx, lastIdx);
    }

    function addressToHex(
        address addr
    ) external pure returns (string memory hexString) {
        return HexUtils.addressToHex(addr);
    }

    function unpaddedUintToHex(
        uint256 value,
        bool dropZeroNibble
    ) external pure returns (string memory hexString) {
        return HexUtils.unpaddedUintToHex(value, dropZeroNibble);
    }

    function bytesToHex(
        bytes memory v
    ) external pure returns (string memory hexString) {
        return HexUtils.bytesToHex(v);
    }
}
