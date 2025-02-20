import { useState } from 'react';
import { ethers } from 'ethers';
import { usePrivy } from '@privy-io/react-auth';
import { useNetworkSwitch } from './useNetworkSwitch';
import { useTokenAllowance } from './useTokenAllowance';
import { useTokenBalance } from './useTokenBalance';
import { BATTLE_ADDRESS, BATTLE_ABI, TOKEN_ADDRESS, BETTING_AMOUNT } from '@/lib/contracts/battle-abi';
import { improveText as improveTextAPI, generateShortDescription } from '@/lib/openai';
import { savePromptSubmission } from '@/lib/supabase';
import { contractToast } from '@/lib/utils';
import type { PromptSubmission, UsePromptSubmissionResult } from '@/types/battle';

export function usePromptSubmission(): UsePromptSubmissionResult {
  const [isLoading, setIsLoading] = useState(false);
  const [isImproving, setIsImproving] = useState(false);
  const { login, authenticated, user } = usePrivy();
  const { switchToBaseSepolia } = useNetworkSwitch();

  const { checkAndApproveAllowance, isCheckingAllowance } = useTokenAllowance({
    spenderAddress: BATTLE_ADDRESS,
    requiredAmount: BETTING_AMOUNT
  });

  const { formattedBalance: tokenBalance, refresh: refreshBalance } = useTokenBalance({
    tokenAddress: TOKEN_ADDRESS
  });

  const improveText = async (text: string): Promise<string> => {
    setIsImproving(true);
    try {
      return await improveTextAPI(text);
    } finally {
      setIsImproving(false);
    }
  };

  const submitPrompt = async ({ message, selectedChampion }: PromptSubmission) => {
    if (!authenticated || !user?.wallet) {
      contractToast.wallet.notConnected();
      login();
      return;
    }

    if (Number(tokenBalance) < 2000) {
      contractToast.error('Insufficient balance');
      return;
    }

    setIsLoading(true);

    try {
      const networkSwitched = await switchToBaseSepolia();
      if (!networkSwitched) return;

      const allowanceApproved = await checkAndApproveAllowance();
      if (!allowanceApproved) return;

      const provider = new ethers.providers.Web3Provider(window.ethereum);
      const signer = provider.getSigner();
      const battleContract = new ethers.Contract(BATTLE_ADDRESS, BATTLE_ABI, signer);

      contractToast.loading('Submitting prompt with bet...');
      const tx = await battleContract.betWithPrompt(
        selectedChampion === 'trump',
        2000
      );

      contractToast.loading('Waiting for confirmation...');
      const receipt = await tx.wait();
      const event = receipt.events?.find((e: any) => e.event === 'PromptBet');
      const promptId = event?.args?.promptId.toString();

      if (!promptId) throw new Error('Failed to get prompt ID from transaction');

      const shortDesc = await generateShortDescription(message);
      await savePromptSubmission({
        wallet_address: user.wallet.address,
        message,
        short_description: shortDesc,
        is_agent_a: selectedChampion === 'trump',
        prompt_id: Number(promptId)
      });

      await refreshBalance();
      contractToast.success('Prompt submitted successfully! 🎉');
      return promptId;
    } catch (error) {
      console.error('Error:', error);
      contractToast.error(error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  return {
    submitPrompt,
    isLoading: isLoading || isCheckingAllowance,
    isImproving,
    improveText
  };
}