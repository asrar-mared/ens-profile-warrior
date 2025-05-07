// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import {IStandaloneReverseRegistrar} from "../reverseRegistrar/IStandaloneReverseRegistrar.sol";

interface IReverseRegistrarProvider {
    function reverseRegistrar()
        external
        view
        returns (IStandaloneReverseRegistrar);
}
