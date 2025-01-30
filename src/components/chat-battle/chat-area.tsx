'use client';

import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { usePrivy } from '@privy-io/react-auth';
import { ethers } from 'ethers';
import { BATTLE_ABI, BATTLE_ADDRESS, TOKEN_ADDRESS, BETTING_AMOUNT } from '@/lib/contracts/battle-abi';
import { savePromptSubmission } from '@/lib/supabase';
import { generateShortDescription, improveText } from '@/lib/openai';
import { Send, Wand2 } from "lucide-react";
import { apiClient } from '@/lib/api';
import { useQueryClient, useMutation } from '@tanstack/react-query';

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

// Hardcoded agent IDs
const AGENT_IDS = {
    AGENT1_ID: '07b6bf73-fe56-0327-ad9a-9be8fa688dc3', // tate
    AGENT2_ID: 'e0e10e6f-ff2b-0d4c-8011-1fc1eee7cb32'  // trump
} as const;

interface PromptBetEvent {
  event: string;
  args: {
    promptId: ethers.BigNumber;
    user: string;
    isAgentA: boolean;
    amount: ethers.BigNumber;
    gameId: ethers.BigNumber;
  };
}

interface Message {
    id: string;
    fromAgent: string;
    toAgent: string;
    content: string;
    timestamp: number;
    user?: string;
    createdAt: number;
    text?: string;
}

interface ChatAreaProps {
  selectedChain: 'solana' | 'base' | 'info';
}

export function ChatArea({ selectedChain }: ChatAreaProps) {
  return (
    <main className="flex-1 overflow-hidden bg-background relative">
      <div className="h-full flex flex-col max-w-[1200px] mx-auto">
        <ChatMessages />
        <ChatInput selectedChain={selectedChain} />
      </div>
    </main>
  );
}

function ChatMessages() {
    const [isLoadingHistory, setIsLoadingHistory] = useState(true);
    const queryClient = useQueryClient();
    const messagesContainerRef = useRef<HTMLDivElement>(null);
    const [lastUpdateTime, setLastUpdateTime] = useState<number>(0);

    const scrollToBottom = () => {
        if (messagesContainerRef.current) {
            messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
        }
    };

    // Función para cargar mensajes de ambos agentes
    const fetchMessages = async () => {
        try {
            // Obtener mensajes del Agent 1
            const roomId1 = await apiClient.stringToUuid(
                `default-room-${AGENT_IDS.AGENT1_ID}`
            );
            const response1 = await apiClient.getAgentMemories(
                AGENT_IDS.AGENT1_ID,
                roomId1
            );

            // Obtener mensajes del Agent 2
            const roomId2 = await apiClient.stringToUuid(
                `default-room-${AGENT_IDS.AGENT2_ID}`
            );
            const response2 = await apiClient.getAgentMemories(
                AGENT_IDS.AGENT2_ID,
                roomId2
            );

            // Combinar y ordenar todos los mensajes
            const allMemories = [
                ...(response1?.memories || []),
                ...(response2?.memories || [])
            ].sort((a, b) => a.createdAt! - b.createdAt!);

            queryClient.setQueryData(
                ["messages"],
                allMemories
                    .filter(memory => memory.userId !== "12dea96f-ec20-0935-a6ab-75692c994959")
                    .map(memory => ({
                        ...memory.content,
                        id: memory.id,
                        user: memory.userId === AGENT_IDS.AGENT1_ID ? "user" : undefined,
                        createdAt: memory.createdAt,
                        isHistory: true,
                        text: memory.content.text,
                        fromAgent: memory.agentId,
                        toAgent: memory.userId
                    }))
            );

            setLastUpdateTime(Date.now());
            scrollToBottom();
        } catch (error) {
            console.error('Error fetching messages:', error);
        }
    };

    // Carga inicial
    useEffect(() => {
        const initChat = async () => {
            try {
                await fetchMessages();
            } finally {
                setIsLoadingHistory(false);
            }
        };

        initChat();
    }, []);

    // Refresco automático cada 5 segundos
    useEffect(() => {
        const interval = setInterval(() => {
            fetchMessages();
        }, 5000);

        return () => clearInterval(interval);
    }, []);

    // Auto-scroll cuando hay nuevos mensajes
    useEffect(() => {
        const messages = queryClient.getQueryData<Message[]>(["messages"]);
        if (messages?.length) {
            scrollToBottom();
        }
    }, [queryClient.getQueryData(["messages"])]);

    const messages = queryClient.getQueryData<Message[]>(["messages"]) || [];

    if (isLoadingHistory) {
        return (
            <div className="flex justify-center items-center p-4">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
        );
    }

    return (
        <div className="flex-1 overflow-y-auto p-6" ref={messagesContainerRef}>
            <div className="mb-2 text-sm text-gray-500 text-center">
                Last updated: {new Date(lastUpdateTime).toLocaleTimeString()}
            </div>
            <div className="space-y-4 max-w-3xl mx-auto">
                {messages.map((message) => (
                    <div
                        key={message.id}
                        className={`flex ${
                            message.user === "user" ? 'justify-end' : 'justify-start'
                        }`}
                    >
                        <div className="bg-primary/10 rounded-lg p-4 max-w-[80%]">
                            <p className="text-sm text-muted-foreground">
                                From: {message.fromAgent}
                            </p>
                            <p className="text-sm text-muted-foreground">
                                {new Date(message.createdAt).toLocaleTimeString()}
                            </p>
                            <p className="mt-1">{message.text || message.content}</p>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}

function ChatInput({ selectedChain }: { selectedChain: 'solana' | 'base' | 'info' }) {
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isImproving, setIsImproving] = useState(false);
  const { login, authenticated } = usePrivy();

  const handleImproveText = async () => {
    if (!input.trim() || isImproving) return;

    setIsImproving(true);
    try {
      const improvedText = await improveText(input);
      setInput(improvedText);
    } catch (error) {
      console.error('Error improving text:', error);
      alert('Failed to improve text. Please try again.');
    } finally {
      setIsImproving(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading || selectedChain === 'info') return;

    if (!authenticated) {
      login();
      return;
    }

    setIsLoading(true);

    try {
      if (typeof window.ethereum === 'undefined') {
        alert('Please install MetaMask!');
        return;
      }

      const provider = new ethers.providers.Web3Provider(window.ethereum);
      await provider.send("eth_requestAccounts", []);

      // Try to switch to Base Sepolia first
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

      // Verify network
      const network = await provider.getNetwork();
      if (network.chainId !== BASE_SEPOLIA_CHAIN_ID) {
        throw new Error(`Please switch to Base Sepolia network. Current chain ID: ${network.chainId}`);
      }

      const signer = provider.getSigner();
      const userAddress = await signer.getAddress();

      // First approve token spending
      const tokenContract = new ethers.Contract(TOKEN_ADDRESS, TOKEN_ABI, signer);
      const approveTx = await tokenContract.approve(BATTLE_ADDRESS, BETTING_AMOUNT);
      await approveTx.wait();

      // Then submit prompt with bet
      const battleContract = new ethers.Contract(BATTLE_ADDRESS, BATTLE_ABI, signer);
      const tx = await battleContract.betWithPrompt(
        selectedChain === 'solana', // true if Solana, false if Base
        BETTING_AMOUNT
      );

      // Wait for transaction and get the prompt ID from the event
      const receipt = await tx.wait();
      const event = receipt.events?.find((e: PromptBetEvent) => e.event === 'PromptBet');
      const promptId = event?.args?.promptId.toString();

      if (!promptId) {
        throw new Error('Failed to get prompt ID from transaction');
      }

      // Generate short description and save to Supabase
      try {
        const shortDesc = await generateShortDescription(input);
        await savePromptSubmission({
          wallet_address: userAddress,
          message: input,
          short_description: shortDesc,
          is_agent_a: selectedChain === 'solana',
          prompt_id: Number(promptId)
        });
      } catch (error) {
        console.error('Error saving to Supabase:', error);
        // Don't throw here as the blockchain transaction was successful
      }

      setInput('');
    } catch (error) {
      console.error('Error:', error);
      alert('Error submitting prompt. Check console for details.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="border-t p-4 bg-muted/50">
      <form onSubmit={handleSubmit} className="flex gap-2 max-w-3xl mx-auto">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={selectedChain === 'info' ? 'Select a chain first...' : 'Propose a prompt...'}
          disabled={isLoading || selectedChain === 'info'}
          className="flex-1 rounded-lg border bg-background px-4 py-2 focus:outline-none focus:ring-2 focus:ring-primary"
        />
        <Button
          type="button"
          variant="outline"
          size="icon"
          onClick={handleImproveText}
          disabled={!input.trim() || isImproving || isLoading || selectedChain === 'info'}
          className="px-3"
        >
          <Wand2 className={`h-4 w-4 ${isImproving ? 'animate-spin' : ''}`} />
        </Button>
        <Button 
          type="submit" 
          disabled={!input.trim() || isLoading || selectedChain === 'info'}
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
      </form>
    </div>
  );
}