// src/types/ethereum.d.ts
export {};

declare global {
  interface Window {
    ethereum?: import('ethers').Eip1193Provider & {
      isMetaMask?: boolean;
      on?: (event: string, handler: (...args: any[]) => void) => void;
      removeListener?: (event: string, handler: (...args: any[]) => void) => void;
    };
  }
}