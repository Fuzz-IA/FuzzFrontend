'use client';

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useState } from "react"
import { Send, Wand2, Coins } from "lucide-react"
import { usePrivy } from '@privy-io/react-auth';
import { ethers } from 'ethers';
import { BATTLE_ADDRESS, TOKEN_ADDRESS, BATTLE_ABI, BETTING_AMOUNT } from '@/lib/contracts/battle-abi';
import { savePromptSubmission } from '@/lib/supabase';
import { improveText, generateShortDescription } from '@/lib/openai';
import { Message, PromptBetEvent , ProposePromptDialogProps} from "@/types/battle"
import { useTokenAllowance } from "@/hooks/useTokenAllowance";
import { useTokenBalance } from "@/hooks/useTokenBalance";
import { useNetworkSwitch } from "@/hooks/useNetworkSwitch";
import { useInvalidations } from '@/hooks/useInvalidations';
import { InsufficientFuzzDialog } from './insufficient-fuzz-dialog';
import { CHAMPION1, CHAMPION1_NAME, CHAMPION2_NAME } from '@/lib/constants';
import { mapToOriginalChampion } from '@/types/battle';


declare global {
  interface Window {
    ethereum?: any;
  }
}

export function ProposePromptDialog({ player, onSubmit, selectedChain, isSupport = false }: ProposePromptDialogProps) {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isImproving, setIsImproving] = useState(false)
  const [showInsufficientFuzzDialog, setShowInsufficientFuzzDialog] = useState(false);
  const { user, authenticated, login, ready } = usePrivy();
  const { switchToBaseMainnet } = useNetworkSwitch();
  const { invalidateAll } = useInvalidations();
  
  const {
    checkAndApproveAllowance,
    isCheckingAllowance
  } = useTokenAllowance({
    spenderAddress: BATTLE_ADDRESS,
    requiredAmount: BETTING_AMOUNT
  });
  
  const {
    formattedBalance: tokenBalance,

  } = useTokenBalance({
    tokenAddress: TOKEN_ADDRESS
  });
  

  const handleImproveText = async () => {
    if (!input.trim() || isImproving) return;
    
    setIsImproving(true);
    try {
      const improvedText = await improveText(input);
      setInput(improvedText);
      setMessages(prev => [...prev, {
        id: Date.now().toString(),
        fromAgent: 'assistant',
        toAgent: 'user',
        content: '✨ Text improved!',
        timestamp: Date.now(),
        createdAt: Date.now(),
        role: 'assistant',
        text: '✨ Text improved!'
      }]);
    } catch (error) {
      console.error('Error improving text:', error);
      setMessages(prev => [...prev, {
        id: Date.now().toString(),
        fromAgent: 'assistant',
        toAgent: 'user',
        content: 'Failed to improve text. Please try again.',
        timestamp: Date.now(),
        createdAt: Date.now(),
        role: 'assistant',
        text: 'Failed to improve text. Please try again.'
      }]);
    } finally {
      setIsImproving(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if ((!input.trim() && !isSupport) || isLoading || selectedChain === 'info') return

    if (!authenticated || !user?.wallet) {
      setMessages(prev => [...prev, {
        id: Date.now().toString(),
        fromAgent: 'assistant',
        toAgent: 'user',
        content: 'Please connect your wallet first',
        timestamp: Date.now(),
        createdAt: Date.now(),
        role: 'assistant',
        text: 'Please connect your wallet first'
      }]);
      login();
      return;
    }

    // Check if user has enough FUZZ - Convert both to same unit (wei)
    const userBalanceInWei = ethers.utils.parseEther(tokenBalance || '0');
    if (userBalanceInWei.lt(BETTING_AMOUNT)) {
      setShowInsufficientFuzzDialog(true);
      return;
    }

    setIsLoading(true)
    if (!isSupport) {
      const newMessage: Message = {
        id: Date.now().toString(),
        fromAgent: 'user',
        toAgent: 'assistant',
        content: input,
        timestamp: Date.now(),
        createdAt: Date.now(),
        role: 'user',
        text: input
      };
      setMessages(prev => [...prev, newMessage])
    }
    setInput('')

    try {
      if (!ready) throw new Error('Privy is not ready');
      if (!user?.wallet) throw new Error('No wallet found');
      
      const networkSwitched = await switchToBaseMainnet();
      if (!networkSwitched) return;
      
      setMessages(prev => [...prev, {
        id: Date.now().toString(),
        fromAgent: 'assistant',
        toAgent: 'user',
        content: 'Checking token allowance...',
        timestamp: Date.now(),
        createdAt: Date.now(),
        role: 'assistant',
        text: 'Checking token allowance...'
      }]);
      
      const allowanceApproved = await checkAndApproveAllowance();
      if (!allowanceApproved) return;
      
      setMessages(prev => [...prev, {
        id: Date.now().toString(),
        fromAgent: 'assistant',
        toAgent: 'user',
        content: 'Submitting prompt with bet...',
        timestamp: Date.now(),
        createdAt: Date.now(),
        role: 'assistant',
        text: 'Submitting prompt with bet...'
      }]);

      const provider = new ethers.providers.Web3Provider(window.ethereum);
      const signer = provider.getSigner();
      const battleContract = new ethers.Contract(BATTLE_ADDRESS, BATTLE_ABI, signer);
    
      const tx = await battleContract.betWithPrompt(
        selectedChain === CHAMPION1, // true if Putin, false if Zelensky
        BETTING_AMOUNT
      );

      setMessages(prev => [...prev, {
        id: Date.now().toString(),
        fromAgent: 'assistant',
        toAgent: 'user',
        content: 'Waiting for transaction confirmation...',
        timestamp: Date.now(),
        createdAt: Date.now(),
        role: 'assistant',
        text: 'Waiting for transaction confirmation...'
      }]);

      const receipt = await tx.wait();
      const event = receipt.events?.find((e: PromptBetEvent) => e.event === 'PromptBet');
      const promptId = event?.args?.promptId.toString();
      invalidateAll();

      if (!promptId) {
        throw new Error('Failed to get prompt ID from transaction');
      }

      if (!isSupport) {
        await onSubmit(input);
        // Save to Supabase
        try {
          const shortDesc = await generateShortDescription(input);
          await savePromptSubmission({
            wallet_address: user.wallet.address,
            message: input,
            short_description: shortDesc,
            is_agent_a: selectedChain === CHAMPION1,
            prompt_id: Number(promptId)
          });
        } catch (error) {
          console.error('Error saving to Supabase:', error);
        }
      }

      setMessages(prev => [...prev, {
        id: Date.now().toString(),
        fromAgent: 'assistant',
        toAgent: 'user',
        content: 'Prompt submitted and bet placed successfully! 🎉',
        timestamp: Date.now(),
        createdAt: Date.now(),
        role: 'assistant',
        text: 'Prompt submitted and bet placed successfully! 🎉'
      }]);
    } catch (error: any) {
      console.error('Contract interaction error:', error);
      const errorMessage = error.reason || error.message || 'Unknown error occurred';
      setMessages(prev => [...prev, {
        id: Date.now().toString(),
        fromAgent: 'assistant',
        toAgent: 'user',
        content: `Error: ${errorMessage}`,
        timestamp: Date.now(),
        createdAt: Date.now(),
        role: 'assistant',
        text: `Error: ${errorMessage}`
      }]);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <>
      <div className="flex flex-col h-[60vh]">
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.map((message, i) => (
            <div
              key={i}
              className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`rounded-lg px-4 py-2 max-w-[80%] ${
                  message.role === 'user'
                    ? `${player.style.borderColor} border bg-black/40`
                    : 'bg-gray-800'
                }`}
              >
                <p className={message.role === 'user' ? player.style.textColor : 'text-gray-300'}>
                  {message.content}
                </p>
              </div>
            </div>
          ))}
        </div>

        <form onSubmit={handleSubmit} className="p-4 border-t border-gray-800">
          <div className="flex gap-2">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={isSupport ? "Support this agent with 1 FUZZ" : "Type your prompt..."}
              disabled={isLoading || selectedChain === 'info'}
              className="flex-1"
            />
            {!isSupport && (
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={handleImproveText}
                disabled={!input.trim() || isImproving || isLoading || selectedChain === 'info'}
              >
                <Wand2 className="h-4 w-4" />
              </Button>
            )}
            <Button 
              type="submit"
              disabled={(!input.trim() && !isSupport) || isLoading || selectedChain === 'info'}
              className={`${ethers.utils.parseEther(tokenBalance || '0').lt(BETTING_AMOUNT) ? 'bg-destructive hover:bg-destructive/90' : ''}`}
            >
              {isLoading ? (
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Processing...
                </div>
              ) : ethers.utils.parseEther(tokenBalance || '0').lt(BETTING_AMOUNT) ? (
                <div className="flex items-center gap-2">
                  <Coins className="h-4 w-4" />
                  <span>Insufficient FUZZ</span>
                </div>
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
          </div>
        </form>
      </div>

      <InsufficientFuzzDialog
        isOpen={showInsufficientFuzzDialog}
        onClose={() => setShowInsufficientFuzzDialog(false)}
        requiredAmount={ethers.utils.formatEther(BETTING_AMOUNT)}
        currentBalance={tokenBalance}
      />
    </>
  );
} 