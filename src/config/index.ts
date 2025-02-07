import { ethers } from 'ethers';

export const BASE_SEPOLIA_CONFIG = {
  chainId: "0x14A34",
  chainName: "Base Sepolia",
  nativeCurrency: {
    name: "ETH",
    symbol: "ETH",
    decimals: 18
  },
  rpcUrls: ["https://sepolia.base.org"],
  blockExplorerUrls: ["https://sepolia.basescan.org"]
} as const;

export const BASE_SEPOLIA_CHAIN_ID = 0x14A34;

export const MAX_ALLOWANCE = ethers.constants.MaxUint256;

export const TOKEN_ABI = [
  "function approve(address spender, uint256 amount) public returns (bool)",
  "function allowance(address owner, address spender) view returns (uint256)"
] as const;

