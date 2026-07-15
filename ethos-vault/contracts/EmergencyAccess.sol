// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";
import {Initializable} from "@openzeppelin/contracts/proxy/utils/Initializable.sol";
import {AccessControlLib} from "./libraries/AccessControlLib.sol";
import {IRegistryCore} from "./interfaces/IRegistryCore.sol";

/// @title EmergencyAccess
/// @notice Implements break-glass access for verified doctors with the emergency role.
contract EmergencyAccess is AccessControl, Initializable, IRegistryCore {
    struct EmergencyGrant {
        address doctor;
        address patient;
        uint64 grantedAt;
        uint64 expiresAt;
        bool active;
    }

    mapping(bytes32 => EmergencyGrant) private _grants;
    mapping(address => bytes32[]) private _patientEmergencyAccess;

    error EmergencyNotAuthorized();
    error EmergencyGrantNotFound();
    error EmergencyAlreadyActive();

    event EmergencyAccessGranted(bytes32 indexed grantId, address indexed doctor, address indexed patient, uint64 grantedAt, uint64 expiresAt);
    event EmergencyAccessExpired(bytes32 indexed grantId, address indexed doctor, address indexed patient, uint64 expiredAt);

    constructor(address admin) {
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
    }

    function initialize() external initializer {}

    function grantEmergencyAccess(address doctor, address patient) external returns (bytes32 grantId) {
        if (!hasRole(AccessControlLib.DOCTOR_ROLE, doctor)) revert EmergencyNotAuthorized();
        if (!hasRole(AccessControlLib.EMERGENCY_ROLE, doctor)) revert EmergencyNotAuthorized();
        if (doctor == address(0) || patient == address(0)) revert ZeroAddress();

        grantId = keccak256(abi.encodePacked(doctor, patient, block.timestamp));
        if (_grants[grantId].grantedAt != 0) revert EmergencyAlreadyActive();

        uint64 expiresAt = uint64(block.timestamp + 24 hours);
        _grants[grantId] = EmergencyGrant({
            doctor: doctor,
            patient: patient,
            grantedAt: uint64(block.timestamp),
            expiresAt: expiresAt,
            active: true
        });
        _patientEmergencyAccess[patient].push(grantId);

        emit EmergencyAccessGranted(grantId, doctor, patient, uint64(block.timestamp), expiresAt);
    }

    function expireEmergencyAccess(bytes32 grantId) external {
        EmergencyGrant storage grant = _grants[grantId];
        if (grant.grantedAt == 0) revert EmergencyGrantNotFound();
        if (!grant.active) revert EmergencyGrantNotFound();

        grant.active = false;
        emit EmergencyAccessExpired(grantId, grant.doctor, grant.patient, uint64(block.timestamp));
    }

    function isEmergencyAccessActive(bytes32 grantId) external view returns (bool) {
        EmergencyGrant memory grant = _grants[grantId];
        return grant.active && grant.expiresAt > block.timestamp;
    }

    function getEmergencyAccess(bytes32 grantId) external view returns (EmergencyGrant memory) {
        return _grants[grantId];
    }
}
