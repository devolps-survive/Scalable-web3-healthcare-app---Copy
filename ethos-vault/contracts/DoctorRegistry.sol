// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";
import {Initializable} from "@openzeppelin/contracts/proxy/utils/Initializable.sol";
import {AccessControlLib} from "./libraries/AccessControlLib.sol";
import {IRegistryCore} from "./interfaces/IRegistryCore.sol";

/// @title DoctorRegistry
/// @notice Stores doctor identity and verification metadata on-chain.
contract DoctorRegistry is AccessControl, Initializable, IRegistryCore {
    struct DoctorRecord {
        address wallet;
        string hospital;
        string specialization;
        bytes32 licenseHash;
        bool verified;
        bool suspended;
        uint64 registeredAt;
    }

    mapping(address => DoctorRecord) private _doctors;

    error DoctorAlreadyRegistered();
    error DoctorNotRegistered();
    error DoctorNotVerified();
    error DoctorSuspended();
    error InvalidLicenseHash();
    error InvalidHospital();
    error InvalidSpecialization();

    event DoctorRegistered(address indexed doctor, address indexed wallet, string hospital, string specialization, bytes32 indexed licenseHash, uint64 registeredAt);
    event DoctorVerified(address indexed doctor, address indexed verifier, uint64 verifiedAt);
    event DoctorSuspended(address indexed doctor, address indexed admin, uint64 suspendedAt);
    event DoctorRevoked(address indexed doctor, address indexed admin, uint64 revokedAt);

    constructor(address admin) {
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
    }

    function initialize() external initializer {}

    function registerDoctor(address wallet, string calldata hospital, string calldata specialization, bytes32 licenseHash) external {
        if (wallet == address(0)) revert ZeroAddress();
        if (bytes(hospital).length == 0) revert InvalidHospital();
        if (bytes(specialization).length == 0) revert InvalidSpecialization();
        if (licenseHash == bytes32(0)) revert InvalidLicenseHash();
        if (_doctors[msg.sender].wallet != address(0)) revert DoctorAlreadyRegistered();

        _doctors[msg.sender] = DoctorRecord({
            wallet: wallet,
            hospital: hospital,
            specialization: specialization,
            licenseHash: licenseHash,
            verified: false,
            suspended: false,
            registeredAt: uint64(block.timestamp)
        });

        emit DoctorRegistered(msg.sender, wallet, hospital, specialization, licenseHash, uint64(block.timestamp));
    }

    function verifyDoctor(address doctor) external onlyRole(DEFAULT_ADMIN_ROLE) {
        DoctorRecord storage doctorRecord = _doctors[doctor];
        if (doctorRecord.wallet == address(0)) revert DoctorNotRegistered();
        if (doctorRecord.verified) revert InvalidState();

        doctorRecord.verified = true;
        _grantRole(AccessControlLib.DOCTOR_ROLE, doctor);

        emit DoctorVerified(doctor, msg.sender, uint64(block.timestamp));
    }

    function suspendDoctor(address doctor) external onlyRole(DEFAULT_ADMIN_ROLE) {
        DoctorRecord storage doctorRecord = _doctors[doctor];
        if (doctorRecord.wallet == address(0)) revert DoctorNotRegistered();
        if (doctorRecord.suspended) revert InvalidState();

        doctorRecord.suspended = true;
        _revokeRole(AccessControlLib.DOCTOR_ROLE, doctor);

        emit DoctorSuspended(doctor, msg.sender, uint64(block.timestamp));
    }

    function revokeVerification(address doctor) external onlyRole(DEFAULT_ADMIN_ROLE) {
        DoctorRecord storage doctorRecord = _doctors[doctor];
        if (doctorRecord.wallet == address(0)) revert DoctorNotRegistered();
        if (!doctorRecord.verified) revert InvalidState();

        doctorRecord.verified = false;
        doctorRecord.suspended = true;
        _revokeRole(AccessControlLib.DOCTOR_ROLE, doctor);

        emit DoctorRevoked(doctor, msg.sender, uint64(block.timestamp));
    }

    function isVerifiedDoctor(address doctor) external view returns (bool) {
        return hasRole(AccessControlLib.DOCTOR_ROLE, doctor);
    }

    function getDoctor(address doctor) external view returns (DoctorRecord memory) {
        return _doctors[doctor];
    }
}
