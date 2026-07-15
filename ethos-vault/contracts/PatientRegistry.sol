// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";
import {Initializable} from "@openzeppelin/contracts/proxy/utils/Initializable.sol";
import {AccessControlLib} from "./libraries/AccessControlLib.sol";
import {IRegistryCore} from "./interfaces/IRegistryCore.sol";

/// @title PatientRegistry
/// @notice Stores patient registration metadata and encrypted profile references on-chain.
/// @dev Sensitive medical data is never stored on-chain.
contract PatientRegistry is AccessControl, Initializable, IRegistryCore {
    using AccessControlLib for *;

    struct PatientRecord {
        address wallet;
        bytes32 encryptedProfileHash;
        uint64 registeredAt;
        bool exists;
    }

    mapping(address => PatientRecord) private _patients;
    mapping(address => address) private _walletsByPatient; // patient => wallet

    error PatientAlreadyRegistered();
    error PatientNotRegistered();
    error InvalidProfileHash();
    error InvalidWallet();

    event PatientRegistered(address indexed patient, address indexed wallet, bytes32 indexed encryptedProfileHash, uint64 registeredAt);
    event PatientWalletUpdated(address indexed patient, address indexed oldWallet, address indexed newWallet, uint64 updatedAt);
    event PatientProfileUpdated(address indexed patient, bytes32 indexed encryptedProfileHash, uint64 updatedAt);

    constructor(address admin) {
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(AccessControlLib.PATIENT_ROLE, admin);
    }

    function initialize() external initializer {}

    /// @notice Registers a patient wallet and stores a hash of encrypted profile metadata.
    function registerPatient(address wallet, bytes32 encryptedProfileHash) external returns (bool) {
        if (wallet == address(0)) revert ZeroAddress();
        if (encryptedProfileHash == bytes32(0)) revert InvalidProfileHash();
        if (_patients[msg.sender].exists) revert PatientAlreadyRegistered();

        _patients[msg.sender] = PatientRecord({
            wallet: wallet,
            encryptedProfileHash: encryptedProfileHash,
            registeredAt: uint64(block.timestamp),
            exists: true
        });
        _walletsByPatient[msg.sender] = wallet;

        _grantRole(AccessControlLib.PATIENT_ROLE, msg.sender);

        emit PatientRegistered(msg.sender, wallet, encryptedProfileHash, uint64(block.timestamp));
        return true;
    }

    /// @notice Updates the wallet bound to the patient.
    function updateWallet(address newWallet) external {
        if (newWallet == address(0)) revert ZeroAddress();
        PatientRecord storage patient = _patients[msg.sender];
        if (!patient.exists) revert PatientNotRegistered();

        address oldWallet = patient.wallet;
        patient.wallet = newWallet;
        _walletsByPatient[msg.sender] = newWallet;

        emit PatientWalletUpdated(msg.sender, oldWallet, newWallet, uint64(block.timestamp));
    }

    /// @notice Updates the encrypted profile hash for the caller.
    function updateProfile(bytes32 encryptedProfileHash) external {
        if (encryptedProfileHash == bytes32(0)) revert InvalidProfileHash();
        PatientRecord storage patient = _patients[msg.sender];
        if (!patient.exists) revert PatientNotRegistered();

        patient.encryptedProfileHash = encryptedProfileHash;

        emit PatientProfileUpdated(msg.sender, encryptedProfileHash, uint64(block.timestamp));
    }

    /// @notice Returns whether the supplied patient address is registered.
    function isPatient(address patient) external view returns (bool) {
        return _patients[patient].exists;
    }

    /// @notice Returns the on-chain patient metadata.
    function getPatient(address patient) external view returns (PatientRecord memory) {
        return _patients[patient];
    }

    /// @notice Returns the wallet bound to a patient address.
    function walletOf(address patient) external view returns (address) {
        return _patients[patient].wallet;
    }
}
