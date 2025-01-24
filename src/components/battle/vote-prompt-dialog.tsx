'use client';

import { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { usePrivy } from '@privy-io/react-auth';
import { ethers } from 'ethers';
import { BATTLE_ABI, BATTLE_ADDRESS, TOKEN_ADDRESS, BETTING_AMOUNT } from '@/lib/contracts/battle-abi';
import { getPrompts, Prompt } from '@/lib/supabase';
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";

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

const BASE_SEPOLIA_CHAIN_ID = 0x14A34;

// Token ABI - solo necesitamos la función approve
const TOKEN_ABI = [
  "function approve(address spender, uint256 amount) public returns (bool)"
] as const;

interface VotePromptDialogProps {
  selectedChain: 'solana' | 'base' | 'info';
  onClose: () => void;
}

export function VotePromptDialog({ selectedChain, onClose }: VotePromptDialogProps) {
  const [prompts, setPrompts] = useState<Prompt[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isVoting, setIsVoting] = useState(false);
  const { login, authenticated } = usePrivy();

  useEffect(() => {
    loadPrompts();
  }, [selectedChain]);

  const loadPrompts = async () => {
    try {
      setIsLoading(true);
      const isAgentA = selectedChain === 'solana';
      const promptsData = await getPrompts(isAgentA);
      setPrompts(promptsData);
    } catch (error) {
      console.error('Error loading prompts:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleVote = async (promptId: number) => {
    if (!authenticated) {
      login();
      return;
    }

    setIsVoting(true);

    try {
      if (typeof window.ethereum === 'undefined') {
        alert('Please install MetaMask!');
        return;
      }

      const provider = new ethers.providers.Web3Provider(window.ethereum);
      await provider.send("eth_requestAccounts", []);

      // Switch to Base Sepolia
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
            throw addError;
          }
        } else {
          throw switchError;
        }
      }

      const network = await provider.getNetwork();
      if (network.chainId !== BASE_SEPOLIA_CHAIN_ID) {
        throw new Error(`Please switch to Base Sepolia network. Current chain ID: ${network.chainId}`);
      }

      const signer = provider.getSigner();

      // First approve token spending
      const tokenContract = new ethers.Contract(TOKEN_ADDRESS, TOKEN_ABI, signer);
      const approveTx = await tokenContract.approve(BATTLE_ADDRESS, BETTING_AMOUNT);
      await approveTx.wait();

      // Then vote for the prompt
      const battleContract = new ethers.Contract(BATTLE_ADDRESS, BATTLE_ABI, signer);
      const tx = await battleContract.voteForPrompt(promptId, BETTING_AMOUNT);
      await tx.wait();

      onClose();
    } catch (error) {
      console.error('Error voting:', error);
      alert('Error voting for prompt. Check console for details.');
    } finally {
      setIsVoting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <ScrollArea className="h-[60vh] w-full pr-4">
      <div className="space-y-4">
        {prompts.length === 0 ? (
          <div className="text-center text-muted-foreground p-4">
            No prompts available for voting yet.
          </div>
        ) : (
          prompts.map((prompt) => (
            <Card key={prompt.id} className="bg-card">
              <CardHeader>
                <CardTitle className="text-lg">Prompt #{prompt.prompt_id}</CardTitle>
                <CardDescription className="text-sm text-muted-foreground">
                  {prompt.short_description}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm">{prompt.message}</p>
              </CardContent>
              <CardFooter>
                <Button 
                  onClick={() => handleVote(prompt.prompt_id)}
                  disabled={isVoting}
                  className="w-full"
                >
                  {isVoting ? (
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Voting...
                    </div>
                  ) : (
                    'Vote for this prompt'
                  )}
                </Button>
              </CardFooter>
            </Card>
          ))
        )}
      </div>
    </ScrollArea>
  );
} 