// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";
import {Initializable} from "@openzeppelin/contracts/proxy/utils/Initializable.sol";
import {AccessControlLib} from "./libraries/AccessControlLib.sol";
import {IRegistryCore} from "./interfaces/IRegistryCore.sol";

/// @title ConsentManager
/// @notice Manages patient-controlled data access permissions for doctors.
contract ConsentManager is AccessControl, Initializable, IRegistryCore {
    struct ConsentRecord {
        address patient;
        address doctor;
        uint64 grantedAt;
        uint64 expiresAt;
        bool active;
    }

    mapping(bytes32 => ConsentRecord) private _consents;
    mapping(address => mapping(address => bytes32)) private _consentIds;

    error ConsentAlreadyExists();
    error ConsentNotFound();
    error ConsentExpired();
    error ConsentInactive();
    error UnauthorizedConsentAction();

    event ConsentGranted(address indexed patient, address indexed doctor, bytes32 indexed consentId, uint64 expiresAt, uint64 grantedAt);
    event ConsentRevoked(address indexed patient, address indexed doctor, bytes32 indexed consentId, uint64 revokedAt);
    event ConsentExtended(address indexed patient, address indexed doctor, bytes32 indexed consentId, uint64 newExpiresAt, uint64 extendedAt);

    constructor(address admin) {
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
    }

    function initialize() external initializer {}

    function grantConsent(address doctor, uint64 expiresAt) external returns (bytes32 consentId) {
        if (doctor == address(0)) revert ZeroAddress();
        if (expiresAt <= block.timestamp) revert InvalidState();
        if (_consentIds[msg.sender][doctor] != bytes32(0)) revert ConsentAlreadyExists();

        consentId = keccak256(abi.encodePacked(msg.sender, doctor, block.timestamp, block.prevrandao));
        _consents[consentId] = ConsentRecord({
            patient: msg.sender,
            doctor: doctor,
            grantedAt: uint64(block.timestamp),
            expiresAt: expiresAt,
            active: true
        });
        _consentIds[msg.sender][doctor] = consentId;

        emit ConsentGranted(msg.sender, doctor, consentId, expiresAt, uint64(block.timestamp));
    }

    function revokeConsent(address doctor) external {
        bytes32 consentId = _consentIds[msg.sender][doctor];
        if (consentId == bytes32(0)) revert ConsentNotFound();

        ConsentRecord storage consent = _consents[consentId];
        consent.active = false;
        delete _consentIds[msg.sender][doctor];

        emit ConsentRevoked(msg.sender, doctor, consentId, uint64(block.timestamp));
    }

    function extendConsent(address doctor, uint64 newExpiresAt) external {
        bytes32 consentId = _consentIds[msg.sender][doctor];
        if (consentId == bytes32(0)) revert ConsentNotFound();
        if (newExpiresAt <= block.timestamp) revert InvalidState();

        ConsentRecord storage consent = _consents[consentId];
        if (!consent.active) revert ConsentInactive();
        if (consent.expiresAt <= block.timestamp) revert ConsentExpired();

        consent.expiresAt = newExpiresAt;

        emit ConsentExtended(msg.sender, doctor, consentId, newExpiresAt, uint64(block.timestamp));
    }

    function hasValidConsent(address patient, address doctor) external view returns (bool) {
        bytes32 consentId = _consentIds[patient][doctor];
        if (consentId == bytes32(0)) return false;
        ConsentRecord storage consent = _consents[consentId];
        return consent.active && consent.expiresAt > block.timestamp;
    }

    function getConsent(address patient, address doctor) external view returns (ConsentRecord memory) {
        bytes32 consentId = _consentIds[patient][doctor];
        if (consentId == bytes32(0)) revert ConsentNotFound();
        return _consents[consentId];
    }
}
