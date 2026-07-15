import patientRegistryAbi from '../../abi/PatientRegistry.json';
import doctorRegistryAbi from '../../abi/DoctorRegistry.json';
import consentManagerAbi from '../../abi/ConsentManager.json';
import medicalRecordRegistryAbi from '../../abi/MedicalRecordRegistry.json';
import auditLogAbi from '../../abi/AuditLog.json';
import emergencyAccessAbi from '../../abi/EmergencyAccess.json';

export const CHAIN = {
  id: 84532, // Base Sepolia
  name: 'Base Sepolia',
  rpcUrl: 'https://sepolia.base.org',
  blockExplorer: 'https://sepolia.basescan.org',
};

export const CONTRACTS = {
  patientRegistry: {
    address: '0x7182C64c94aD3F268bEc68Cb0d4DD42a71223862',
    abi: patientRegistryAbi, // import from your build artifacts
  },
  doctorRegistry: {
    address: '0xcD0c18e0c6FEbd254d2f0E198Fb5C394A5CD414A',
    abi: doctorRegistryAbi,
  },
  consentManager: {
    address: '0x5403E422196B3ecCe88972C524Cf342c277820E3',
    abi: consentManagerAbi,
  },
  medicalRecordRegistry: {
    address: '0x04eBf4475a97Ba62b6CE8B8DF84b7B749d03fA46',
    abi: medicalRecordRegistryAbi,
  },
  auditLog: {
    address: '0x50DFd7D1C0054058a1C73Cc1E8604e3A73E7F04E',
    abi: auditLogAbi,
  },
  emergencyAccess: {
    address: '0x56BC043f9C2a54C96D7cd90286f7F04ec21a5E48',
    abi: emergencyAccessAbi,
  },
} as const;