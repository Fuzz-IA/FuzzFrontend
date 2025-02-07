import { useState } from 'react';
import { ethers } from 'ethers';
import { contractToast } from '@/lib/utils';
import { TOKEN_ABI, MAX_ALLOWANCE } from '@/config';
import { UseTokenAllowanceProps} from '@/types/contractRelated'
import { TOKEN_ADDRESS} from "@/lib/contracts/battle-abi"

export const useTokenAllowance = ({ spenderAddress, requiredAmount }: UseTokenAllowanceProps) => {
  const [isCheckingAllowance, setIsCheckingAllowance] = useState(false);
  
  const checkAndApproveAllowance = async () => {
    setIsCheckingAllowance(true);
    try {
      if (typeof window.ethereum === 'undefined') {
        contractToast.wallet.notInstalled();
        return false
      }
      
      const provider = new ethers.providers.Web3Provider(window.ethereum);
      const signer = provider.getSigner();
      const userAddress = await signer.getAddress();
      const tokenContract = new ethers.Contract(TOKEN_ADDRESS, TOKEN_ABI, signer);
      
      contractToast.loading('Checking token allowance...');
      const currentAllowance = await tokenContract.allowance(
        userAddress,
        spenderAddress
      );
      
      
      if (currentAllowance.lt(requiredAmount)) {
        contractToast.loading(`Current allowance (${ethers.utils.formatUnits(currentAllowance, 18)} FUZZ) is insufficient. Requesting max approval...`);
        const approveTx = await tokenContract.approve(spenderAddress, MAX_ALLOWANCE);
        await approveTx.wait();
        contractToast.success('Max token approval successful! You won\'t need to approve again.');
      } else {
        contractToast.success('Token spending already approved');
      }
      
      return true;
    } catch (error) {
      console.error('Error checking/approving allowance:', error);
      contractToast.error(error);
      return false;
    } finally {
      setIsCheckingAllowance(false);
    }
  };
  
  return {
    checkAndApproveAllowance,
    isCheckingAllowance
  };
};
