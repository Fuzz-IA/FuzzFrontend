import { ethers } from 'ethers';
import { contractToast } from '@/lib/utils';
import {
  BASE_MAINNET_CONFIG,
  BASE_MAINNET_CHAIN_ID
} from '@/config';

export const useNetworkSwitch = () => {
  let lastSwitchAttempt = 0;
  const SWITCH_COOLDOWN = 5000; // 5 seconds cooldown

  const switchToBaseMainnet = async () => {
    try {
      const now = Date.now();
      if (now - lastSwitchAttempt < SWITCH_COOLDOWN) {
        return true;
      }
      lastSwitchAttempt = now;

      if (typeof window.ethereum === 'undefined') {
        return false;
      }

      const provider = new ethers.providers.Web3Provider(window.ethereum);
      const network = await provider.getNetwork();
      
      if (network.chainId === BASE_MAINNET_CHAIN_ID) {
        return true;
      }

      try {
        await window.ethereum.request({
          method: 'wallet_switchEthereumChain',
          params: [{ chainId: BASE_MAINNET_CONFIG.chainId }],
        });
      } catch (switchError: any) {
        if (switchError.code === 4902) {
          try {
            await window.ethereum.request({
              method: 'wallet_addEthereumChain',
              params: [BASE_MAINNET_CONFIG],
            });
          } catch (addError) {
            console.error('Error adding the chain:', addError);
            return false;
          }
        } else {
          console.error('Error switching chain:', switchError);
          return false;
        }
      }

      const updatedNetwork = await provider.getNetwork();
      if (updatedNetwork.chainId !== BASE_MAINNET_CHAIN_ID) {
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error in network switch:', error);
      return false;
    }
  };

  return { switchToBaseMainnet };
};