// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";
import {Initializable} from "@openzeppelin/contracts/proxy/utils/Initializable.sol";
import {AccessControlLib} from "./libraries/AccessControlLib.sol";
import {IRegistryCore} from "./interfaces/IRegistryCore.sol";

/// @title AuditLog
/// @notice Emits immutable audit events for all important platform actions.
contract AuditLog is AccessControl, Initializable, IRegistryCore {
    struct AuditEntry {
        address actor;
        address patient;
        string action;
        uint64 timestamp;
    }

    mapping(uint256 => AuditEntry) private _entries;
    uint256 private _entryCount;

    event AuditRecorded(uint256 indexed entryId, address indexed actor, address indexed patient, string action, uint64 timestamp);

    constructor(address admin) {
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
    }

    function initialize() external initializer {}

    function recordAudit(address patient, string calldata action) external {
        _entryCount += 1;
        _entries[_entryCount] = AuditEntry({
            actor: msg.sender,
            patient: patient,
            action: action,
            timestamp: uint64(block.timestamp)
        });

        emit AuditRecorded(_entryCount, msg.sender, patient, action, uint64(block.timestamp));
    }

    function getAuditEntry(uint256 entryId) external view returns (AuditEntry memory) {
        return _entries[entryId];
    }

    function totalEntries() external view returns (uint256) {
        return _entryCount;
    }
}
