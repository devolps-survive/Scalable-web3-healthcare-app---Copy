// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

interface IRegistryCore {
    error NotAuthorized();
    error ZeroAddress();
    error InvalidState();

    event RoleGranted(bytes32 indexed role, address indexed account, address indexed sender);
    event RoleRevoked(bytes32 indexed role, address indexed account, address indexed sender);
}
