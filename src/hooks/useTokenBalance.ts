import { useQuery, useQueryClient } from '@tanstack/react-query'; // Añadimos useQueryClient
import { ethers } from 'ethers';
import { usePrivy } from '@privy-io/react-auth';
import { queryKeys } from '@/lib/query-keys';
import { UseTokenBalanceProps } from '@/types/battle';

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
  const queryClient = useQueryClient(); 

  const queryKey = [...queryKeys.user.balance, tokenAddress, walletAddress] as const;

  const { 
    data: balance = '0', 
    isLoading,
  } = useQuery({
    queryKey,
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

  const invalidateBalance = () => {
      queryClient.invalidateQueries({
        queryKey: queryKey
      });
    };

  return {
    balance,
    formattedBalance,
    isLoading,
    invalidateBalance 
  };
};