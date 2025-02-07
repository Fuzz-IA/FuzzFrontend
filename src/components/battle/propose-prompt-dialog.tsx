'use client';

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useState } from "react"
import { Send, Wand2 } from "lucide-react"
import { usePrivy } from '@privy-io/react-auth';
import { ethers } from 'ethers';
import { BATTLE_ADDRESS, TOKEN_ADDRESS, BATTLE_ABI, BETTING_AMOUNT } from '@/lib/contracts/battle-abi';
import { savePromptSubmission } from '@/lib/supabase';
import { improveText, generateShortDescription } from '@/lib/openai';
import { Message, PromptBetEvent , ProposePromptDialogProps} from "@/types/battle"
import { useTokenAllowance } from "@/hooks/useTokenAllowance";
import { useTokenBalance } from "@/hooks/useTokenBalance";
import { useNetworkSwitch } from "@/hooks/useNetworkSwitch";


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
  const { user, authenticated, login, ready } = usePrivy();
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
  

  const handleImproveText = async () => {
    if (!input.trim() || isImproving) return;
    
    setIsImproving(true);
    try {
      const improvedText = await improveText(input);
      setInput(improvedText);
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: '✨ Text improved!' 
      }]);
    } catch (error) {
      console.error('Error improving text:', error);
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: 'Failed to improve text. Please try again.' 
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
        role: 'assistant', 
        content: 'Please connect your wallet first' 
      }]);
      login();
      return;
    }

    setIsLoading(true)
    if (!isSupport) {
      const newMessage: Message = { role: 'user', content: input }
      setMessages(prev => [...prev, newMessage])
    }
    setInput('')

    try {
      if (!ready) throw new Error('Privy is not ready');
      if (!user?.wallet) throw new Error('No wallet found');
      
      const networkSwitched = await switchToBaseSepolia();
      if (!networkSwitched) return;
      
      setMessages(prev => [...prev, {
              role: 'assistant',
              content: 'Checking token allowance...'
            }]);
      
      const allowanceApproved = await checkAndApproveAllowance();
      if (!allowanceApproved) return;
      
      setMessages(prev => [...prev, { 
              role: 'assistant', 
              content: 'Submitting prompt with bet...' 
            }]);

      const provider = new ethers.providers.Web3Provider(window.ethereum);
      const signer = provider.getSigner();
      const battleContract = new ethers.Contract(BATTLE_ADDRESS, BATTLE_ABI, signer);
    
      const tx = await battleContract.betWithPrompt(
        selectedChain === 'solana', // true if Solana, false otherwise
        BETTING_AMOUNT
      );

      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: 'Waiting for transaction confirmation...' 
      }]);

      const receipt = await tx.wait();
      const event = receipt.events?.find((e: PromptBetEvent) => e.event === 'PromptBet');
      const promptId = event?.args?.promptId.toString();

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
            is_agent_a: selectedChain === 'solana',
            prompt_id: Number(promptId)
          });
        } catch (error) {
          console.error('Error saving to Supabase:', error);
        }
      }

      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: 'Prompt submitted and bet placed successfully! 🎉' 
      }]);
    } catch (error: any) {
      console.error('Contract interaction error:', error);
      const errorMessage = error.reason || error.message || 'Unknown error occurred';
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: `Error: ${errorMessage}` 
      }]);
    } finally {
      setIsLoading(false);
    }
  }

  return (
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
          >
            {isLoading ? (
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Processing...
              </div>
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </div>
      </form>
    </div>
  );
} 