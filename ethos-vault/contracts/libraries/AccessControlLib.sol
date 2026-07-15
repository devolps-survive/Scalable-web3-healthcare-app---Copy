// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

library AccessControlLib {
    bytes32 internal constant DEFAULT_ADMIN_ROLE = 0x00;
    bytes32 internal constant PATIENT_ROLE = keccak256("PATIENT_ROLE");
    bytes32 internal constant DOCTOR_ROLE = keccak256("DOCTOR_ROLE");
    bytes32 internal constant EMERGENCY_ROLE = keccak256("EMERGENCY_ROLE");
}
