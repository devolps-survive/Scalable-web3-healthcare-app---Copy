// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";
import {Initializable} from "@openzeppelin/contracts/proxy/utils/Initializable.sol";
import {AccessControlLib} from "./libraries/AccessControlLib.sol";
import {IRegistryCore} from "./interfaces/IRegistryCore.sol";

/// @title MedicalRecordRegistry
/// @notice Stores only metadata pointers for off-chain medical records.
contract MedicalRecordRegistry is AccessControl, Initializable, IRegistryCore {
    struct MedicalRecordMeta {
        address patient;
        address uploader;
        bytes32 encryptedFileHash;
        string encryptedFileReference;
        bytes32 recordHash;
        uint64 timestamp;
        string category;
    }

    mapping(bytes32 => MedicalRecordMeta) private _records;
    mapping(address => bytes32[]) private _patientRecords;

    error RecordNotFound();
    error InvalidFileHash();
    error InvalidReference();
    error InvalidCategory();

    event MedicalRecordAdded(
        bytes32 indexed recordId,
        address indexed patient,
        address indexed uploader,
        bytes32 encryptedFileHash,
        string encryptedFileReference,
        bytes32 recordHash,
        uint64 timestamp,
        string category
    );

    constructor(address admin) {
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
    }

    function initialize() external initializer {}

    function addMedicalRecord(
        address patient,
        bytes32 encryptedFileHash,
        string calldata encryptedFileReference,
        bytes32 recordHash,
        string calldata category
    ) external returns (bytes32 recordId) {
        if (patient == address(0)) revert ZeroAddress();
        if (encryptedFileHash == bytes32(0)) revert InvalidFileHash();
        if (bytes(encryptedFileReference).length == 0) revert InvalidReference();
        if (recordHash == bytes32(0)) revert InvalidCategory();
        if (bytes(category).length == 0) revert InvalidCategory();

        recordId = keccak256(abi.encodePacked(patient, encryptedFileHash, recordHash, block.timestamp));
        _records[recordId] = MedicalRecordMeta({
            patient: patient,
            uploader: msg.sender,
            encryptedFileHash: encryptedFileHash,
            encryptedFileReference: encryptedFileReference,
            recordHash: recordHash,
            timestamp: uint64(block.timestamp),
            category: category
        });
        _patientRecords[patient].push(recordId);

        emit MedicalRecordAdded(recordId, patient, msg.sender, encryptedFileHash, encryptedFileReference, recordHash, uint64(block.timestamp), category);
    }

    function getMedicalRecord(bytes32 recordId) external view returns (MedicalRecordMeta memory) {
        MedicalRecordMeta memory record = _records[recordId];
        if (record.timestamp == 0) revert RecordNotFound();
        return record;
    }

    function listPatientRecords(address patient) external view returns (bytes32[] memory) {
        return _patientRecords[patient];
    }
}
