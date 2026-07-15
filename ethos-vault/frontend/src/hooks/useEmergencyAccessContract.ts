// src/hooks/useEmergencyAccessContract.ts
import { ethers } from 'ethers';
import { CONTRACTS } from '../config/contracts';

export function useEmergencyAccessContract() {
  const { address, abi } = CONTRACTS.emergencyAccess;

  return async () => {
    if (!window.ethereum) throw new Error('No wallet found');
    const provider = new ethers.BrowserProvider(window.ethereum);
    const signer = await provider.getSigner();
    return new ethers.Contract(address, abi, signer);
  };
}