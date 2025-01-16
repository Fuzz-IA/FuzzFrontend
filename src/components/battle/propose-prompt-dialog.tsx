'use client';

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useState } from "react"
import { Send } from "lucide-react"
import { PlayerAttributes } from "@/types/battle"
import { usePrivy } from '@privy-io/react-auth';
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

declare global {
  interface Window {
    ethereum?: any;
  }
}

// Token ABI - solo necesitamos la función approve
const TOKEN_ABI = [
  "function approve(address spender, uint256 amount) public returns (bool)"
] as const;

interface Message {
  role: 'user' | 'assistant'
  content: string
}

interface ProposePromptDialogProps {
  player: PlayerAttributes
  onSubmit: (prompt: string) => Promise<void>
  isAgentA: boolean
}

export function ProposePromptDialog({ player, onSubmit, isAgentA }: ProposePromptDialogProps) {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const { user, authenticated, login, ready } = usePrivy();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim() || isLoading) return

    if (!authenticated || !user?.wallet) {
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: 'Please connect your wallet first' 
      }]);
      login();
      return;
    }

    setIsLoading(true)
    const newMessage: Message = { role: 'user', content: input }
    setMessages(prev => [...prev, newMessage])
    setInput('')

    try {
      if (!ready) throw new Error('Privy is not ready');
      if (!user?.wallet) throw new Error('No wallet found');

      // Debug logs
      console.log('Wallet:', user.wallet);
      console.log('Wallet methods:', Object.keys(user.wallet));
      console.log('Wallet prototype methods:', Object.getOwnPropertyNames(Object.getPrototypeOf(user.wallet)));
      console.log('Wallet address:', user.wallet.address);

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
        content: 'Assigning tokens to agent...' 
      }]);

      // Create battle contract with the signer directly
      const battleContract = new ethers.Contract(
        BATTLE_ADDRESS, 
        BATTLE_ABI, 
        signer
      );
      
      // Then call assignTokensToAgent
      const tx = await battleContract.assignTokensToAgent(isAgentA);
      
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: 'Waiting for transaction confirmation...' 
      }]);
      
      await tx.wait();
      await onSubmit(input);
      
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: 'Tokens approved and assigned successfully! 🎉' 
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
              className={`max-w-[80%] rounded-lg px-4 py-2 ${
                message.role === 'user'
                  ? `${player.style.textColor} bg-black/40 border ${player.style.borderColor}`
                  : 'bg-gray-800 text-white'
              }`}
            >
              {message.content}
            </div>
          </div>
        ))}
      </div>

      <form onSubmit={handleSubmit} className="p-4 border-t border-gray-800">
        <div className="flex gap-2">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={authenticated ? "Type your prompt..." : "Connect wallet first..."}
            disabled={!authenticated}
            className="flex-1 bg-black/40 border-gray-800 text-white"
          />
          <Button 
            type="submit" 
            disabled={isLoading || !authenticated}
            className={`${player.style.borderColor} ${player.style.textColor} hover:opacity-90 bg-black/40 backdrop-blur-xl border-2`}
            variant="outline"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </form>
    </div>
  )
} 