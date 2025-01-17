'use client';

import { Button } from "@/components/ui/button"
import { PlayerAttributes } from "@/types/battle"
import { usePrivy } from "@privy-io/react-auth"
import { ThumbsUp } from "lucide-react"
import { useState, useEffect } from "react"
import { getPrompts, Prompt } from "@/lib/supabase"
import { ethers } from 'ethers';
import { BATTLE_ADDRESS, TOKEN_ADDRESS, BATTLE_ABI, BETTING_AMOUNT } from '@/lib/contracts/battle-abi';

// Base Sepolia configuration
const BASE_SEPOLIA_CONFIG = {
  chainId: "0x14A34",
  chainName: "Base Sepolia",
  nativeCurrency: {
    name: "ETH",
    symbol: "ETH",
    decimals: 18
  },
  rpcUrls: ["https://sepolia.base.org"],
  blockExplorerUrls: ["https://sepolia.basescan.org"]
};

// Decimal chain ID for comparison
const BASE_SEPOLIA_CHAIN_ID = 0x14A34;

// Token ABI - solo necesitamos la función approve
const TOKEN_ABI = [
  "function approve(address spender, uint256 amount) public returns (bool)"
] as const;

interface Message {
  role: 'user' | 'assistant'
  content: string
}

interface VotePromptDialogProps {
  player: PlayerAttributes
  onVote: (promptId: string) => Promise<void>
  isAgentA: boolean
}

export function VotePromptDialog({ player, onVote, isAgentA }: VotePromptDialogProps) {
  const [prompts, setPrompts] = useState<Prompt[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [messages, setMessages] = useState<Message[]>([])
  const [votingPromptId, setVotingPromptId] = useState<string | null>(null)
  const { authenticated, login, user, ready } = usePrivy()

  useEffect(() => {
    async function loadPrompts() {
      try {
        const data = await getPrompts(isAgentA)
        setPrompts(data)
      } catch (error) {
        console.error('Error loading prompts:', error)
      } finally {
        setIsLoading(false)
      }
    }

    loadPrompts()
    // Refresh every 30 seconds
    const interval = setInterval(loadPrompts, 30000)
    return () => clearInterval(interval)
  }, [isAgentA])

  const handleVote = async (promptId: string) => {
    if (!authenticated || !user?.wallet) {
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: 'Please connect your wallet first' 
      }]);
      login();
      return;
    }

    setVotingPromptId(promptId);
    try {
      if (!ready) throw new Error('Privy is not ready');
      if (!user?.wallet) throw new Error('No wallet found');

      // Get provider from window.ethereum
      const provider = new ethers.providers.Web3Provider(window.ethereum);
      await provider.send("eth_requestAccounts", []); // Request account access

      // Try to switch to Base Sepolia first
      try {
        await window.ethereum.request({
          method: 'wallet_switchEthereumChain',
          params: [{ chainId: BASE_SEPOLIA_CONFIG.chainId }],
        });
      } catch (switchError: any) {
        // Only add the chain if error code 4902 (chain not added)
        if (switchError.code === 4902) {
          try {
            await window.ethereum.request({
              method: 'wallet_addEthereumChain',
              params: [BASE_SEPOLIA_CONFIG],
            });
          } catch (addError) {
            console.error('Error adding the chain:', addError);
            throw addError;
          }
        } else {
          throw switchError;
        }
      }

      // Verify we're on the correct network
      const network = await provider.getNetwork();
      if (network.chainId !== BASE_SEPOLIA_CHAIN_ID) {
        throw new Error(`Please switch to Base Sepolia network. Current chain ID: ${network.chainId}`);
      }

      // Get fresh provider and signer after network switch
      const updatedProvider = new ethers.providers.Web3Provider(window.ethereum, {
        chainId: BASE_SEPOLIA_CHAIN_ID,
        name: "Base Sepolia"
      });
      const signer = updatedProvider.getSigner();
      if (!signer) throw new Error('Signer not found');

      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: 'Approving token spending...' 
      }]);

      // Create contracts with the signer directly
      const tokenContract = new ethers.Contract(
        TOKEN_ADDRESS, 
        TOKEN_ABI, 
        signer
      );
      
      // First approve token spending
      const approveTx = await tokenContract.approve(BATTLE_ADDRESS, BETTING_AMOUNT);
      
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: 'Waiting for approval confirmation...' 
      }]);
      
      await approveTx.wait();

      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: 'Tokens approved! Processing vote...' 
      }]);

      await onVote(promptId);
      
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: 'Vote submitted successfully! 🎉' 
      }]);
    } catch (error: any) {
      console.error('Error voting:', error);
      const errorMessage = error.reason || error.message || 'Unknown error occurred';
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: `Error: ${errorMessage}` 
      }]);
    } finally {
      setVotingPromptId(null);
    }
  }

  if (isLoading) {
    return (
      <div className="flex flex-col h-[60vh] items-center justify-center">
        <div className={`${player.style.textColor}`}>Loading prompts...</div>
      </div>
    )
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
              className={`max-w-[80%] rounded-lg px-4 py-2 bg-gray-800 text-white`}
            >
              {message.content}
            </div>
          </div>
        ))}

        {prompts.length === 0 ? (
          <div className={`text-center ${player.style.textColor}`}>No prompts available yet.</div>
        ) : (
          prompts.map((prompt) => (
            <div
              key={prompt.id}
              className={`p-4 rounded-lg border-2 ${player.style.borderColor} bg-black/40 backdrop-blur-xl`}
            >
              <p className={`mb-2 ${player.style.textColor}`}>{prompt.short_description}</p>
              <p className={`mb-4 text-sm ${player.style.lightTextColor}`}>{prompt.message}</p>
              <div className="flex items-center justify-between">
                <span className={`${player.style.lightTextColor} text-sm`}>
                  by {prompt.wallet_address.slice(0, 6)}...{prompt.wallet_address.slice(-4)}
                </span>
                <Button
                  onClick={() => handleVote(prompt.id.toString())}
                  disabled={votingPromptId === prompt.id.toString()}
                  className={`${player.style.borderColor} ${player.style.textColor} hover:opacity-90 bg-black/40 backdrop-blur-xl border-2`}
                  variant="outline"
                >
                  <ThumbsUp className={`h-4 w-4 mr-2 ${votingPromptId === prompt.id.toString() ? 'animate-spin' : ''}`} />
                  {votingPromptId === prompt.id.toString() ? 'Voting...' : 'Vote'}
                </Button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
} 