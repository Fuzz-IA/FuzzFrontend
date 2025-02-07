import { ethers } from 'ethers';
import { contractToast } from '@/lib/utils';
import {
  BASE_SEPOLIA_CONFIG,
  BASE_SEPOLIA_CHAIN_ID
} from '@/config';

export const useNetworkSwitch = () => {
  const switchToBaseSepolia = async () => {
    try {
      if (typeof window.ethereum === 'undefined') {
        contractToast.wallet.notInstalled();
        return false;
      }

      const provider = new ethers.providers.Web3Provider(window.ethereum);

      try {
        await window.ethereum.request({
          method: 'wallet_switchEthereumChain',
          params: [{ chainId: BASE_SEPOLIA_CONFIG.chainId }],
        });
      } catch (switchError: any) {
        if (switchError.code === 4902) {
          try {
            await window.ethereum.request({
              method: 'wallet_addEthereumChain',
              params: [BASE_SEPOLIA_CONFIG],
            });
          } catch (addError) {
            console.error('Error adding the chain:', addError);
            contractToast.error(addError);
            return false;
          }
        } else {
          contractToast.error(switchError);
          return false;
        }
      }

      const network = await provider.getNetwork();
      if (network.chainId !== BASE_SEPOLIA_CHAIN_ID) {
        contractToast.wallet.wrongNetwork('Base Sepolia');
        throw new Error(`Please switch to Base Sepolia network. Current chain ID: ${network.chainId}`);
      }

      return true;
    } catch (error) {
      console.error('Error switching network:', error);
      contractToast.error(error);
      return false;
    }
  };

  return { switchToBaseSepolia };
};