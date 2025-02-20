'use client'

import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { usePrivy } from '@privy-io/react-auth';
import { ethers } from 'ethers';
import { BATTLE_ADDRESS, TOKEN_ADDRESS, BATTLE_ABI, BETTING_AMOUNT } from '@/lib/contracts/battle-abi';
import { savePromptSubmission } from '@/lib/supabase';
import { generateShortDescription, improveText } from '@/lib/openai';
import { Send, Wand2 } from "lucide-react";
import { contractToast } from '@/lib/utils';
import { useTokenAllowance } from '@/hooks/useTokenAllowance';
import { useTokenBalance } from '@/hooks/useTokenBalance';
import { useNetworkSwitch } from '@/hooks/useNetworkSwitch';
import { PromptBetEvent } from "@/types/battle";

interface ChatInputProps {
  selectedChampion: 'trump' | 'xi' | 'info';
  onMessageSent?: () => void;
}

export function ChatInput({ selectedChampion, onMessageSent }: ChatInputProps) {
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isImproving, setIsImproving] = useState<boolean>(false);
  const [isTyping, setIsTyping] = useState<boolean>(false);
  const typingTimeoutRef = useRef<NodeJS.Timeout | undefined>(undefined);
  const { login, authenticated, user } = usePrivy();
  const { switchToBaseSepolia } = useNetworkSwitch();

  const {
    checkAndApproveAllowance,
    isCheckingAllowance
  } = useTokenAllowance({
    spenderAddress: BATTLE_ADDRESS,
    requiredAmount: BETTING_AMOUNT
  });

  const {
    formattedBalance: tokenBalance,
    refresh: refreshBalance
  } = useTokenBalance({
    tokenAddress: TOKEN_ADDRESS
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInput(e.target.value);
    
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    setIsTyping(true);
    typingTimeoutRef.current = setTimeout(() => {
      setIsTyping(false);
    }, 1000);
  };

  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, []);

  const handleImproveText = async () => {
    if (!input.trim() || isImproving) return;

    setIsImproving(true);
    try {
      const improvedText = await improveText(input);
      setInput(improvedText);
    } catch (error) {
      console.error('Error improving text:', error);
      contractToast.error('Failed to improve text. Please try again.');
    } finally {
      setIsImproving(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading || selectedChampion === 'info') return;

    if (!authenticated || !user?.wallet) {
      contractToast.wallet.notConnected();
      login();
      return;
    }

    if (Number(tokenBalance) < Number(ethers.utils.formatEther(BETTING_AMOUNT))) {
      contractToast.error('Insufficient balance');
      return;
    }

    setIsLoading(true);

    try {
      const networkSwitched = await switchToBaseSepolia();
      if (!networkSwitched) return;

      const allowanceApproved = await checkAndApproveAllowance();
      if (!allowanceApproved) return;

      contractToast.loading('Submitting prompt with bet...');
      const provider = new ethers.providers.Web3Provider(window.ethereum);
      const signer = provider.getSigner();
      const battleContract = new ethers.Contract(BATTLE_ADDRESS, BATTLE_ABI, signer);
      
      const tx = await battleContract.betWithPrompt(
        selectedChampion === 'trump',
        BETTING_AMOUNT
      );

      contractToast.loading('Waiting for confirmation...');
      const receipt = await tx.wait();
      const event = receipt.events?.find((e: PromptBetEvent) => e.event === 'PromptBet');
      const promptId = event?.args?.promptId.toString();

      if (!promptId) {
        throw new Error('Failed to get prompt ID from transaction');
      }

      try {
        const shortDesc = await generateShortDescription(input);
        await savePromptSubmission({
          wallet_address: user.wallet.address,
          message: input,
          short_description: shortDesc,
          is_agent_a: selectedChampion === 'trump',
          prompt_id: Number(promptId)
        });
      } catch (error) {
        console.error('Error saving to Supabase:', error);
      }

      await refreshBalance();
      contractToast.success('Prompt submitted successfully! 🎉');
      setInput('');
      onMessageSent?.();
    } catch (error) {
      console.error('Error:', error);
      contractToast.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const isSubmitDisabled = 
    !input.trim() || 
    isLoading || 
    selectedChampion === 'info' ||
    isCheckingAllowance;

  return (
    <div className="border-t border-[#F3642E]/20 bg-black/50 p-4 pbes-12">
      <form onSubmit={handleSubmit} className="flex gap-3 max-w-3xl mx-auto">
        <input
          type="text"
          value={input}
          onChange={handleInputChange}
          placeholder={
            selectedChampion === 'info' 
              ? 'Select your champion first...' 
              : `Submit a prompt for ${selectedChampion === 'trump' ? 'Donald Trump' : 'Xi Jinping'}...`
          }
          disabled={isLoading || selectedChampion === 'info'}
          className="flex-1 rounded-lg border border-[#F3642E]/20 bg-black/50 px-4 py-3 text-white placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-[#F3642E] focus:border-transparent transition-all"
        />
        <Button
          type="button"
          variant="outline"
          size="icon"
          onClick={handleImproveText}
          disabled={!input.trim() || isImproving || isLoading || selectedChampion === 'info'}
          className="px-3 border-[#F3642E]/20 bg-black/50 hover:bg-[#F3642E]/10 hover:text-[#F3642E]"
        >
          <Wand2 className={`h-5 w-5 ${isImproving ? 'animate-spin' : ''}`} />
        </Button>
        <Button 
          type="submit" 
          disabled={isSubmitDisabled}
          className="bg-[#F3642E] hover:bg-[#F3642E]/90 text-white px-6"
        >
          {isLoading || isCheckingAllowance ? (
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              {isCheckingAllowance ? 'Checking...' : 'Processing...'}
            </div>
          ) : (
            <Send className="h-5 w-5" />
          )}
        </Button>
      </form>
      {isTyping && (
        <div className="text-sm text-[#F3642E]/60 text-center mt-2">
          You are typing...
        </div>
      )}
    </div>
  );
}