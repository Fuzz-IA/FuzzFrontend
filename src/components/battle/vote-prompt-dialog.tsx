'use client';

import { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { usePrivy } from '@privy-io/react-auth';
import { ethers } from 'ethers';
import { BATTLE_ABI, BATTLE_ADDRESS, TOKEN_ADDRESS, BETTING_AMOUNT } from '@/lib/contracts/battle-abi';
import { getPrompts, Prompt } from '@/lib/supabase';
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Loader2, Vote } from "lucide-react";

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

function truncateAddress(address: string) {
  if (!address) return '';
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

interface VotePromptDialogProps {
  selectedChain: 'solana' | 'base' | 'info';
  onClose: () => void;
}

export function VotePromptDialog({ selectedChain, onClose }: VotePromptDialogProps) {
  const [prompts, setPrompts] = useState<Prompt[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isVoting, setIsVoting] = useState(false);
  const [tokenBalance, setTokenBalance] = useState('0');
  const { login, authenticated } = usePrivy();

  useEffect(() => {
    loadPrompts();
    checkBalance();
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

  async function checkBalance() {
    try {
      if (typeof window.ethereum !== 'undefined' && authenticated) {
        const provider = new ethers.providers.Web3Provider(window.ethereum);
        const signer = provider.getSigner();
        const tokenContract = new ethers.Contract(TOKEN_ADDRESS, [
          'function balanceOf(address account) view returns (uint256)'
        ], provider);
        
        const userAddress = await signer.getAddress();
        const balance = await tokenContract.balanceOf(userAddress);
        const formattedBalance = ethers.utils.formatEther(balance);
        setTokenBalance(formattedBalance);
      }
    } catch (error) {
      console.error('Error checking balance:', error);
    }
  }

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

  return (
    <DialogContent className="max-w-2xl">
      <DialogHeader>
        <DialogTitle>Vote for {selectedChain} Prompts</DialogTitle>
      </DialogHeader>
      <div className="text-sm text-muted-foreground mb-4">
        Available Balance: {Number(tokenBalance).toFixed(2)} FUZZ
      </div>
      {isLoading ? (
        <div className="flex items-center justify-center p-8">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      ) : prompts.length > 0 ? (
        <ScrollArea className="h-[60vh]">
          <div className="space-y-4 pr-4">
            {prompts.map((prompt) => (
              <Card key={prompt.id} className="p-4">
                <CardHeader className="p-0">
                  <CardTitle className="text-base">{prompt.short_description}</CardTitle>
                  <CardDescription className="text-xs truncate">
                    by {truncateAddress(prompt.wallet_address)}
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-0 mt-4">
                  <p className="text-sm text-muted-foreground">{prompt.message}</p>
                </CardContent>
                <CardFooter className="p-0 mt-4">
                  <Button 
                    onClick={() => handleVote(prompt.prompt_id)} 
                    disabled={isVoting || Number(BETTING_AMOUNT) > Number(ethers.utils.parseEther(tokenBalance))}
                    className="w-full"
                  >
                    {isVoting ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Voting...
                      </>
                    ) : Number(BETTING_AMOUNT) > Number(ethers.utils.parseEther(tokenBalance)) ? (
                      'Insufficient Balance'
                    ) : (
                      <>
                        <Vote className="mr-2 h-4 w-4" />
                        Vote ({ethers.utils.formatEther(BETTING_AMOUNT)} FUZZ)
                      </>
                    )}
                  </Button>
                </CardFooter>
              </Card>
            ))}
          </div>
        </ScrollArea>
      ) : (
        <div className="text-center py-8 text-muted-foreground">
          No prompts available for voting
        </div>
      )}
    </DialogContent>
  );
} 