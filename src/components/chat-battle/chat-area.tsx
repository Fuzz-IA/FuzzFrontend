'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { usePrivy } from '@privy-io/react-auth';
import { ethers } from 'ethers';
import { BATTLE_ABI, BATTLE_ADDRESS, TOKEN_ADDRESS, BETTING_AMOUNT } from '@/lib/contracts/battle-abi';
import { savePromptSubmission } from '@/lib/supabase';
import { generateShortDescription, improveText } from '@/lib/openai';
import { Send, Wand2 } from "lucide-react";
import { apiClient } from '@/lib/api';
import { useQueryClient, useMutation } from '@tanstack/react-query';
import { contractToast } from '@/lib/utils';
import { useTransition, animated, AnimatedProps } from '@react-spring/web';
import { SpringValue } from '@react-spring/web';

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
    AGENT1_ID: 'e0e10e6f-ff2b-0d4c-8011-1fc1eee7cb32', // trump
    AGENT2_ID: '94bfebec-fb1a-02b3-a54d-a1f15b5668a5'  // china
} as const;

// Modificar las constantes de los agentes para incluir más información
const AGENTS_INFO = {
    [AGENT_IDS.AGENT1_ID]: {
        name: 'Donald Trump',
        color: 'bg-orange-500',
        initials: 'DT',
        avatar: '/trump.png',
        side: 'trump' as const
    },
    [AGENT_IDS.AGENT2_ID]: {
        name: 'Xi Jinping',
        color: 'bg-red-500',
        initials: 'CN',
        avatar: '/xi.png',
        side: 'xi' as const
    },
    user: {
        name: 'User',
        color: 'bg-blue-500',
        initials: 'U',
        avatar: null,
        side: null
    }
} as const;

type AgentId = keyof typeof AGENTS_INFO;

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
    isTyping?: boolean;
}

interface ChatState {
    isTyping: boolean;
    typingAgent: string | null;
    waitingResponse: boolean;
}

interface ChatAreaProps {
  selectedChampion: 'trump' | 'xi' | 'info';
}

interface AnimatedStyles {
    opacity: SpringValue<number>;
    transform: SpringValue<string>;
    scale: SpringValue<number>;
}

export function ChatArea({ selectedChampion }: ChatAreaProps) {
  return (
    <main className="flex-1 overflow-hidden bg-background relative">
      <div className="h-full flex flex-col">
        <ChatMessages selectedChampion={selectedChampion} />
        <ChatInput selectedChampion={selectedChampion} />
      </div>
    </main>
  );
}

function MessageAvatar({ agentId }: { agentId: string }) {
    const agentInfo = AGENTS_INFO[agentId as keyof typeof AGENTS_INFO] || AGENTS_INFO.user;
    
    return (
        <div className={`flex-shrink-0 w-12 h-12 rounded-lg overflow-hidden ${!agentInfo.avatar ? agentInfo.color : ''} text-white flex items-center justify-center font-medium text-sm border-2 border-primary/20`}>
            {agentInfo.avatar ? (
                <img 
                    src={agentInfo.avatar} 
                    alt={agentInfo.name}
                    className="w-full h-full object-cover"
                />
            ) : (
                agentInfo.initials
            )}
        </div>
    );
}

function TypewriterText({ text, animate = false }: { text: string; animate?: boolean }) {
    const [displayedText, setDisplayedText] = useState('');
    const [isComplete, setIsComplete] = useState(!animate);
    const timeoutRef = useRef<NodeJS.Timeout | undefined>(undefined);

    useEffect(() => {
        if (!animate) {
            setDisplayedText(text);
            setIsComplete(true);
            return;
        }

        setDisplayedText('');
        setIsComplete(false);
        let currentIndex = 0;

        const typeNextChar = () => {
            if (currentIndex < text.length) {
                setDisplayedText(text.slice(0, currentIndex + 1));
                currentIndex++;
                // Súper rápido: 2-3ms por carácter
                timeoutRef.current = setTimeout(typeNextChar, Math.random() * 1 + 2);
            } else {
                setIsComplete(true);
            }
        };

        // Empezar inmediatamente
        timeoutRef.current = setTimeout(typeNextChar, 10);

        return () => {
            if (timeoutRef.current) {
                clearTimeout(timeoutRef.current);
            }
        };
    }, [text, animate]);

    return (
        <span className="whitespace-pre-wrap">
            {displayedText}
            {!isComplete && (
                <span className="inline-block w-[2px] h-[1.2em] bg-primary/60 animate-pulse ml-[1px] align-middle" />
            )}
        </span>
    );
}

function ChatMessages({ selectedChampion }: { selectedChampion: 'trump' | 'xi' | 'info' }) {
    const [isLoadingHistory, setIsLoadingHistory] = useState(true);
    const [chatState, setChatState] = useState<ChatState>({
        isTyping: false,
        typingAgent: null,
        waitingResponse: false
    });
    const queryClient = useQueryClient();
    const messagesContainerRef = useRef<HTMLDivElement>(null);
    const [lastUpdateTime, setLastUpdateTime] = useState<number>(0);
    const [shouldAutoScroll, setShouldAutoScroll] = useState(true);

    const scrollToBottom = (force: boolean = false) => {
        if (messagesContainerRef.current && (shouldAutoScroll || force)) {
            messagesContainerRef.current.scrollTo({
                top: messagesContainerRef.current.scrollHeight,
                behavior: 'smooth'
            });
        }
    };

    // Manejar el scroll manual del usuario
    const handleScroll = () => {
        if (messagesContainerRef.current) {
            const { scrollTop, scrollHeight, clientHeight } = messagesContainerRef.current;
            const isNearBottom = scrollHeight - scrollTop - clientHeight < 100;
            setShouldAutoScroll(isNearBottom);
        }
    };

    // Simula el efecto de escritura para un nuevo mensaje
    const simulateTyping = async (message: Message) => {
        setChatState(prev => ({
            ...prev,
            isTyping: true,
            typingAgent: message.fromAgent
        }));

        scrollToBottom(true);
        await new Promise<void>((resolve) => setTimeout(resolve, Math.random() * 2000 + 1000));

        setChatState(prev => ({
            ...prev,
            isTyping: false,
            typingAgent: null
        }));

        return message;
    };

    // Función modificada para cargar mensajes
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

            // Procesar nuevos mensajes con delay
            const currentMessages = queryClient.getQueryData<Message[]>(["messages"]) || [];
            const newMessages = allMemories
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
                }));

            // Si hay nuevos mensajes, simular typing
            const lastCurrentMessage = currentMessages[currentMessages.length - 1];
            const lastNewMessage = newMessages[newMessages.length - 1];

            if (lastNewMessage && (!lastCurrentMessage || lastNewMessage.id !== lastCurrentMessage.id)) {
                await simulateTyping(lastNewMessage);
            }

            queryClient.setQueryData(["messages"], newMessages);
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

    // Modificar el useEffect para el scroll automático
    useEffect(() => {
        const messages = queryClient.getQueryData<Message[]>(["messages"]);
        if (messages?.length) {
            scrollToBottom();
        }
    }, [queryClient.getQueryData(["messages"]), chatState.isTyping]);

    // Agregar event listener para el scroll
    useEffect(() => {
        const container = messagesContainerRef.current;
        if (container) {
            container.addEventListener('scroll', handleScroll);
            return () => container.removeEventListener('scroll', handleScroll);
        }
    }, []);

    const messages = queryClient.getQueryData<Message[]>(["messages"]) || [];
    const lastMessageId = messages[messages.length - 1]?.id;

    const transitions = useTransition<Message, AnimatedStyles>(messages, {
        keys: (message) => `${message.createdAt}-${message.user}-${message.text}`,
        from: { 
            opacity: 0, 
            transform: 'translateY(50px)',
            scale: 0.9
        },
        enter: { 
            opacity: 1, 
            transform: 'translateY(0px)',
            scale: 1
        },
        leave: { 
            opacity: 0, 
            transform: 'translateY(10px)',
            scale: 0.95 
        },
        config: {
            tension: 300,
            friction: 20
        }
    });

    if (isLoadingHistory) {
        return <LoadingSpinner />;
    }

    return (
        <div className="flex flex-col w-full h-[calc(100dvh-4rem)] pb-0">
            <div 
                className="flex-1 overflow-y-auto scroll-smooth px-4" 
                ref={messagesContainerRef}
                onScroll={handleScroll}
            >
                <div className="space-y-4 max-w-3xl mx-auto py-4">
                    {transitions((style, message) => {
                        const AnimatedDiv = animated('div');
                        const agentInfo = AGENTS_INFO[message.fromAgent as keyof typeof AGENTS_INFO] || AGENTS_INFO.user;
                        const isLastMessage = message.id === lastMessageId;
                        const isMyChampion = agentInfo.side === selectedChampion;
                        
                        return (
                            <AnimatedDiv
                                style={{
                                    opacity: style.opacity,
                                    transform: style.transform,
                                    scale: style.scale
                                }}
                                className="flex flex-col gap-2 p-4"
                            >
                                <div
                                    key={message.id}
                                    className={`flex items-start gap-2 ${
                                        isMyChampion ? 'flex-row-reverse' : 'flex-row'
                                    }`}
                                >
                                    <MessageAvatar agentId={message.fromAgent} />
                                    <div className={`flex flex-col ${
                                        isMyChampion ? 'items-end' : 'items-start'
                                    }`}>
                                        <div className={`rounded-lg p-4 max-w-[80%] ${
                                            isMyChampion ? 'bg-primary/20 border-2 border-primary/10' : 'bg-muted'
                                        }`}>
                                            <p className={`text-md font-medium ${
                                                isMyChampion ? 'text-primary' : 'text-muted-foreground'
                                            }`}>
                                                {agentInfo.name}
                                            </p>
                                            <p className="text-[12px] text-muted-foreground">
                                                {new Date(message.createdAt).toLocaleTimeString()}
                                            </p>
                                            <p className="mt-1">
                                                <TypewriterText 
                                                    text={message.text || message.content} 
                                                    animate={isLastMessage}
                                                />
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </AnimatedDiv>
                        );
                    })}
                    {chatState.isTyping && (
                        <div className={`flex items-start gap-2 ${
                            chatState.typingAgent && 
                            AGENTS_INFO[chatState.typingAgent as AgentId]?.side === selectedChampion 
                                ? 'flex-row-reverse' 
                                : 'flex-row'
                        }`}>
                            <MessageAvatar agentId={chatState.typingAgent || ''} />
                            <div className={`flex flex-col ${
                                chatState.typingAgent && 
                                AGENTS_INFO[chatState.typingAgent as AgentId]?.side === selectedChampion 
                                    ? 'items-end' 
                                    : 'items-start'
                            }`}>
                                <div className="bg-primary/10 rounded-lg p-4">
                                    <TypingIndicator />
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
            {!shouldAutoScroll && (
                <button
                    onClick={() => scrollToBottom(true)}
                    className="fixed bottom-20 right-8 bg-primary text-primary-foreground rounded-full p-2 shadow-lg hover:bg-primary/90 transition-all"
                >
                    <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="24"
                        height="24"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                    >
                        <path d="M12 19V5M5 12l7 7 7-7" />
                    </svg>
                </button>
            )}
            <div className="text-sm text-gray-500 text-center pb-2">
                Last updated: {new Date(lastUpdateTime).toLocaleTimeString()}
            </div>
        </div>
    );
}

function ChatInput({ selectedChampion }: { selectedChampion: 'trump' | 'xi' | 'info' }) {
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isImproving, setIsImproving] = useState<boolean>(false);
  const [isTyping, setIsTyping] = useState<boolean>(false);
  const typingTimeoutRef = useRef<NodeJS.Timeout | undefined>(undefined);
  const { login, authenticated } = usePrivy();

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInput(e.target.value);
    
    // Clear existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // Set typing state
    setIsTyping(true);

    // Set timeout to clear typing state after 1 second of no input
    typingTimeoutRef.current = setTimeout(() => {
      setIsTyping(false);
    }, 1000);
  };

  // Cleanup timeout on unmount
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
      alert('Failed to improve text. Please try again.');
    } finally {
      setIsImproving(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading || selectedChampion === 'info') return;

    if (!authenticated) {
      contractToast.wallet.notConnected();
      login();
      return;
    }

    setIsLoading(true);

    try {
      // Simular un pequeño delay antes de enviar el mensaje
      await new Promise<void>((resolve) => setTimeout(resolve, 500));

      if (typeof window.ethereum === 'undefined') {
        contractToast.wallet.notInstalled();
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
            contractToast.error(addError);
            throw addError;
          }
        } else {
          contractToast.error(switchError);
          throw switchError;
        }
      }

      // Verify network
      const network = await provider.getNetwork();
      if (network.chainId !== BASE_SEPOLIA_CHAIN_ID) {
        contractToast.wallet.wrongNetwork('Base Sepolia');
        throw new Error(`Please switch to Base Sepolia network. Current chain ID: ${network.chainId}`);
      }

      const signer = provider.getSigner();
      const userAddress = await signer.getAddress();

      // First approve token spending
      contractToast.loading('Approving token spending...');
      const tokenContract = new ethers.Contract(TOKEN_ADDRESS, TOKEN_ABI, signer);
      const approveTx = await tokenContract.approve(BATTLE_ADDRESS, BETTING_AMOUNT);
      await approveTx.wait();
      contractToast.success('Token approval successful!');

      // Then submit prompt with bet
      contractToast.loading('Submitting prompt with bet...');
      const battleContract = new ethers.Contract(BATTLE_ADDRESS, BATTLE_ABI, signer);
      const tx = await battleContract.betWithPrompt(
        selectedChampion === 'trump', // true if Trump, false if Xi
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
          is_agent_a: selectedChampion === 'trump',
          prompt_id: Number(promptId)
        });
        contractToast.success('Prompt submitted successfully! 🎉');
      } catch (error) {
        console.error('Error saving to Supabase:', error);
        contractToast.error(error);
        // Don't throw here as the blockchain transaction was successful
      }

      setInput('');
    } catch (error) {
      console.error('Error:', error);
      contractToast.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="border-t bg-muted/50 p-3">
      <form onSubmit={handleSubmit} className="flex gap-2 max-w-3xl mx-auto">
        <input
          type="text"
          value={input}
          onChange={handleInputChange}
          placeholder={selectedChampion === 'info' ? 'Select your champion first...' : `Supporting ${selectedChampion === 'trump' ? 'Donald Trump' : 'Xi Jinping'}...`}
          disabled={isLoading || selectedChampion === 'info'}
          className="flex-1 rounded-lg border bg-background px-4 py-2 focus:outline-none focus:ring-2 focus:ring-primary"
        />
        <Button
          type="button"
          variant="outline"
          size="icon"
          onClick={handleImproveText}
          disabled={!input.trim() || isImproving || isLoading || selectedChampion === 'info'}
          className="px-3"
        >
          <Wand2 className={`h-4 w-4 ${isImproving ? 'animate-spin' : ''}`} />
        </Button>
        <Button 
          type="submit" 
          disabled={!input.trim() || isLoading || selectedChampion === 'info'}
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
      {isTyping && (
        <div className="text-sm text-muted-foreground text-center mt-1">
          You are typing...
        </div>
      )}
    </div>
  );
}

function LoadingSpinner() {
    return (
        <div className="flex justify-center items-center p-4">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
    );
}

function TypingIndicator() {
    return (
        <div className="flex items-center space-x-2">
            <div className="flex space-x-1">
                <div className="w-2 h-2 rounded-full bg-primary/60 animate-bounce [animation-delay:-0.3s]" />
                <div className="w-2 h-2 rounded-full bg-primary/60 animate-bounce [animation-delay:-0.15s]" />
                <div className="w-2 h-2 rounded-full bg-primary/60 animate-bounce" />
            </div>
            <span className="text-sm text-muted-foreground">typing...</span>
        </div>
    );
}