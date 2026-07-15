# EASEeHealth Solidity Contracts

## Folder Structure

```text
contracts/
  PatientRegistry.sol
  DoctorRegistry.sol
  ConsentManager.sol
  MedicalRecordRegistry.sol
  AuditLog.sol
  EmergencyAccess.sol
  libraries/
    AccessControlLib.sol
  interfaces/
    IRegistryCore.sol
```

## Deployment Order

1. PatientRegistry
2. DoctorRegistry
3. ConsentManager
4. MedicalRecordRegistry
5. AuditLog
6. EmergencyAccess

## Constructor Dependency Diagram

- PatientRegistry(admin)
- DoctorRegistry(admin)
- ConsentManager(admin)
- MedicalRecordRegistry(admin)
- AuditLog(admin)
- EmergencyAccess(admin)

## Remix Deployment

- Open Remix IDE.
- Create a new workspace or upload the contracts folder.
- Ensure OpenZeppelin imports resolve.
- Compile with Solidity 0.8.24.
- Deploy each contract with the admin address.

## Example Deployment Sequence

```solidity
PatientRegistry patientRegistry = new PatientRegistry(admin);
DoctorRegistry doctorRegistry = new DoctorRegistry(admin);
ConsentManager consentManager = new ConsentManager(admin);
MedicalRecordRegistry recordRegistry = new MedicalRecordRegistry(admin);
AuditLog auditLog = new AuditLog(admin);
EmergencyAccess emergencyAccess = new EmergencyAccess(admin);
```

## Example Interactions

```solidity
patientRegistry.registerPatient(wallet, encryptedProfileHash);
doctorRegistry.registerDoctor(wallet, "Mayo Clinic", "Cardiology", licenseHash);
doctorRegistry.verifyDoctor(doctorAddress);
consentManager.grantConsent(doctorAddress, uint64(block.timestamp + 30 days));
recordRegistry.addMedicalRecord(patient, encryptedFileHash, ipfsCid, recordHash, "xray");
auditLog.recordAudit(patient, "patient_registered");
emergencyAccess.grantEmergencyAccess(doctorAddress, patientAddress);
```

## Gas Optimization Notes

- Uses mappings for lookup efficiency.
- Uses immutable-style constructor setup for deploy-time configuration.
- Emits indexed events for graph indexing.
- Avoids unnecessary storage writes and uses calldata where appropriate.

## Security Notes

- No sensitive medical data is stored on-chain.
- Access control is enforced via OpenZeppelin AccessControl.
- Custom errors are used for precise failure handling.
- Consent expiration is enforced on access checks.
