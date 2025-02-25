import { ethers } from 'ethers';

export const BASE_MAINNET_CONFIG = {
  chainId: "0x2105",
  chainName: "Base",
  nativeCurrency: {
    name: "ETH",
    symbol: "ETH",
    decimals: 18
  },
  rpcUrls: ["https://mainnet.base.org"],
  blockExplorerUrls: ["https://basescan.org"]
} as const;

export const BASE_MAINNET_CHAIN_ID = 0x2105;

export const MAX_ALLOWANCE = ethers.constants.MaxUint256;

export const TOKEN_ABI = [
  "function approve(address spender, uint256 amount) public returns (bool)",
  "function allowance(address owner, address spender) view returns (uint256)"
] as const;

