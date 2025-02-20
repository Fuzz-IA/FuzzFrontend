import { useQuery } from '@tanstack/react-query';
import { ethers } from 'ethers';
import { usePrivy } from '@privy-io/react-auth';
import { queryKeys } from '@/lib/query-keys';

interface UseTokenBalanceProps {
  tokenAddress: string;
  enabled?: boolean;
}

async function fetchTokenBalance(tokenAddress: string, userAddress: string) {
  const provider = new ethers.providers.Web3Provider(window.ethereum);
  const tokenContract = new ethers.Contract(
    tokenAddress,
    ['function balanceOf(address account) view returns (uint256)'],
    provider
  );
  
  const balance = await tokenContract.balanceOf(userAddress);
  return ethers.utils.formatEther(balance);
}

export const useTokenBalance = ({ tokenAddress, enabled = true }: UseTokenBalanceProps) => {
  const { authenticated, user } = usePrivy();
  const walletAddress = user?.wallet?.address;

  const { 
    data: balance = '0', 
    isLoading,
    refetch 
  } = useQuery({
    queryKey: [queryKeys.user.balance, tokenAddress, walletAddress],
    queryFn: async () => {
      if (!walletAddress) return '0';
      return fetchTokenBalance(tokenAddress, walletAddress);
    },
    enabled: enabled && authenticated && !!walletAddress && typeof window !== 'undefined',
    staleTime: 30000, 
    refetchInterval: 60000, 
    retry: 2
  });

  const formattedBalance = Number(balance).toFixed(2);

  return {
    balance,
    formattedBalance,
    isLoading,
    refresh: refetch
  };
};