import { ethers }  from 'ethers';

export interface UseTokenAllowanceProps {
  spenderAddress: string;
  requiredAmount: ethers.BigNumber | bigint;
}

export interface UseTokenBalanceProps {
  tokenAddress: string;
  enabled?: boolean;
}