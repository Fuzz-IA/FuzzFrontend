import { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import { usePrivy } from '@privy-io/react-auth';

interface UseTokenBalanceProps {
  tokenAddress: string;
  enabled?: boolean; 
}

export const useTokenBalance = ({ tokenAddress, enabled = true }: UseTokenBalanceProps) => {
  const [balance, setBalance] = useState('0');
  const [isLoading, setIsLoading] = useState(false);
  const { authenticated } = usePrivy();

  const checkBalance = async () => {
    setIsLoading(true);
    try {
      if (typeof window.ethereum !== 'undefined' && authenticated) {
        const provider = new ethers.providers.Web3Provider(window.ethereum);
        const signer = provider.getSigner();
        const tokenContract = new ethers.Contract(
          tokenAddress,
          ['function balanceOf(address account) view returns (uint256)'],
          provider
        );
        
        const userAddress = await signer.getAddress();
        const balance = await tokenContract.balanceOf(userAddress);
        const formattedBalance = ethers.utils.formatEther(balance);
        setBalance(formattedBalance);
        return formattedBalance;
      }
      return '0';
    } catch (error) {
      console.error('Error checking balance:', error);
      return '0';
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (enabled && authenticated) {
      checkBalance();
    }
  }, [enabled, authenticated, tokenAddress]);

  const formattedBalance = Number(balance).toFixed(2);

  return { 
    balance, 
    formattedBalance,
    isLoading, 
    checkBalance,
    refresh: checkBalance 
  };
};