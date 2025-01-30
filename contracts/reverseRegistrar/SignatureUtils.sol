// SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

import {SignatureChecker} from "@openzeppelin/contracts-v5/utils/cryptography/SignatureChecker.sol";

interface IUniversalSignatureValidator {
    function isValidSig(
        address _signer,
        bytes32 _hash,
        bytes calldata _signature
    ) external returns (bool);
}

/// @notice Utility functions for validating signatures with expiry
library SignatureUtils {
    /// @notice The signature is invalid
    error InvalidSignature();
    /// @notice The signature expiry is too high
    error SignatureExpiryTooHigh();
    /// @notice The signature has expired
    error SignatureExpired();

    bytes32 private constant ERC6492_DETECTION_SUFFIX =
        0x6492649264926492649264926492649264926492649264926492649264926492;

    IUniversalSignatureValidator public constant validator =
        IUniversalSignatureValidator(
            0xAE347B9B53aCd7a417Bd86292f2f9E0dED658F98
        );

    /// @notice Validates a signature with expiry
    /// @param signature The signature to validate
    /// @param addr The address that signed the message
    /// @param message The message that was signed
    /// @param signatureExpiry The expiry of the signature
    function validateSignatureWithExpiry(
        bytes calldata signature,
        address addr,
        bytes32 message,
        uint256 signatureExpiry
    ) internal {
        if (
            bytes32(signature[signature.length - 32:signature.length]) ==
            ERC6492_DETECTION_SUFFIX
        ) {
            if (!validator.isValidSig(addr, message, signature))
                revert InvalidSignature();
        } else {
            if (!SignatureChecker.isValidSignatureNow(addr, message, signature))
                revert InvalidSignature();
        }
        if (signatureExpiry < block.timestamp) revert SignatureExpired();
        if (signatureExpiry > block.timestamp + 1 hours)
            revert SignatureExpiryTooHigh();
    }
}
