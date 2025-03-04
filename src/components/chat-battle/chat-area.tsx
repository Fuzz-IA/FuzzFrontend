'use client';

import { useState, useEffect, useRef } from 'react';
import { apiClient } from '@/lib/api';
import { useQueryClient } from '@tanstack/react-query';
import { useTransition, animated } from '@react-spring/web';
import { SpringValue } from '@react-spring/web';
import { ChatInput } from "./chat-input";
import { ChatHeader } from "./chat-header";
import { BetActivityFeed } from "./bet-activity-feed";
import { ClickableAgentAvatar } from "@/components/character/clickable-agent-avatar";
import { Pin } from 'lucide-react';
import { getLatestPrompt } from '@/lib/supabase';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";


// Hardcoded agent IDs
const AGENT_IDS = {
    AGENT1_ID: 'e0e10e6f-ff2b-0d4c-8011-1fc1eee7cb32', // trump
    AGENT2_ID: '94bfebec-fb1a-02b3-a54d-a1f15b5668a5',  // china
    AGENT3_ID: 'd1c10fb0-e672-079e-b9cf-a1c8cdc32b96'  // Fuzz
} as const;

// Modificar las constantes de los agentes para incluir más información
const AGENTS_INFO = {
    [AGENT_IDS.AGENT1_ID]: {
        name: 'Donald Trump',
        color: 'bg-orange-500',
        initials: 'DT',
        avatar: '/trumpProfile.svg',
        side: 'trump' as const
    },
    [AGENT_IDS.AGENT2_ID]: {
        name: 'Xi Jinping',
        color: 'bg-red-500',
        initials: 'CN',
        avatar: '/xiProfile.png',
        side: 'xi' as const
    },
    [AGENT_IDS.AGENT3_ID]: {
        name: 'Fuzz',
        color: 'bg-blue-500',
        initials: 'FZ',
        avatar: '/fuzzProfile.svg',
        side: 'fuzz' as const
    }
} as const;

type AgentId = keyof typeof AGENTS_INFO;


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
    scores?: {
        trump: number;
        xi: number;
    };
    isPinned?: boolean;
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
    <>
      <ChatHeader />
      <main className="flex-1 overflow-hidden relative mx-4 ml-20 my-6 mt-4 rounded-lg border bg-background shadow-md border-[#F3642E] h-[calc(100vh-10rem)]">
        <div className="h-full flex flex-col">
          <ChatMessages selectedChampion={selectedChampion} />
          <ChatInput selectedChampion={selectedChampion} />
        </div>
      </main>
    </>
  );
}

function MessageAvatar({ agentId }: { agentId: string }) {
    const agentInfo = AGENTS_INFO[agentId as keyof typeof AGENTS_INFO];
    
    if (!agentInfo) {
        return null;
    }
    
    return (
        <ClickableAgentAvatar
            agentId={agentId}
            avatar={agentInfo.avatar}
            name={agentInfo.name}
            color={agentInfo.color}
            initials={agentInfo.initials}
        />
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
    const [pinnedMessage, setPinnedMessage] = useState<Message | null>(null);
    const [lastPrompt, setLastPrompt] = useState<{
        message: string;
        shortDescription: string;
        fromAgent: string;
        wallet_address: string;
        createdAt: string;
    } | null>(null);
    const queryClient = useQueryClient();
    const messagesContainerRef = useRef<HTMLDivElement>(null);
    const [lastUpdateTime, setLastUpdateTime] = useState<number>(0);
    const [showFullMessage, setShowFullMessage] = useState(false);

    // Simula el efecto de escritura para un nuevo mensaje
    const simulateTyping = async (message: Message) => {
        setChatState(prev => ({
            ...prev,
            isTyping: true,
            typingAgent: message.fromAgent
        }));

        // No forzamos el scroll automático aquí
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

            // Procesar nuevos mensajes
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
                setPinnedMessage(lastNewMessage);
            }

            queryClient.setQueryData(["messages"], newMessages);
            setLastUpdateTime(Date.now());
            
        } catch (error) {
            console.error('Error fetching messages:', error);
        }
    };

    // Fetch latest prompt from Supabase
    const fetchLatestPrompt = async () => {
        if (selectedChampion === 'info') return;
        
        try {
            const prompt = await getLatestPrompt(selectedChampion === 'trump');
            if (prompt) {
                setLastPrompt({
                    message: prompt.message,
                    shortDescription: prompt.short_description,
                    fromAgent: selectedChampion === 'trump' ? AGENT_IDS.AGENT1_ID : AGENT_IDS.AGENT2_ID,
                    wallet_address: prompt.wallet_address,
                    createdAt: prompt.created_at
                });
            }
        } catch (error) {
            console.error('Error fetching latest prompt:', error);
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

    // Add effect to fetch latest prompt
    useEffect(() => {
        fetchLatestPrompt();
        const interval = setInterval(fetchLatestPrompt, 5000);
        return () => clearInterval(interval);
    }, [selectedChampion]);

    // Refresco automático cada 5 segundos
    useEffect(() => {
        const interval = setInterval(() => {
            fetchMessages();
        }, 5000);

        return () => clearInterval(interval);
    }, []);

    const messages = queryClient.getQueryData<Message[]>(["messages"]) || [];
    
    // Modificar el efecto de scroll para mantener la posición en la parte inferior
    // useEffect(() => {
    //     if (messagesContainerRef.current) {
    //         messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
    //     }
    // }, [messages.length, chatState.isTyping]); // Se ejecuta cuando hay nuevos mensajes o cambia el estado de typing

    const lastMessageId = messages[0]?.id;

    const transitions = useTransition<Message, AnimatedStyles>([...messages].reverse(), {
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
        <div className="flex-1 overflow-y-auto">
            {lastPrompt && (
                <>
                    <div 
                        className="sticky top-0 z-10 bg-black/80 backdrop-blur-sm border-b border-primary/20 p-4 cursor-pointer hover:bg-black/90 transition-colors"
                        onClick={() => setShowFullMessage(true)}
                    >
                        <div className="max-w-3xl mx-auto">
                            <div className="flex items-center justify-between mb-2">
                                <div className="flex items-center gap-2">
                                    <Pin className="h-4 w-4 text-primary" />
                                    <span className="text-sm font-medium text-primary text-white">Latest Prompt</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className="text-xs text-muted-foreground">
                                        by {lastPrompt.wallet_address?.slice(0, 6)}...{lastPrompt.wallet_address?.slice(-4)}
                                    </span>
                                    <span className="text-xs text-muted-foreground">
                                        • {new Date(lastPrompt.createdAt).toLocaleTimeString()}
                                    </span>
                                </div>
                            </div>
                            <div className="flex items-start gap-2">
                                <MessageAvatar agentId={lastPrompt.fromAgent} />
                                <div className="flex-1">
                                    <div className="bg-primary/10 rounded-lg p-4">
                                        <p className="text-sm text-primary-foreground text-white">
                                            {lastPrompt.shortDescription}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <Dialog open={showFullMessage} onOpenChange={setShowFullMessage}>
                        <DialogContent className="sm:max-w-2xl">
                            <DialogHeader>
                                <DialogTitle className="flex items-center gap-2">
                                    <Pin className="h-4 w-4" />
                                    Pinned Prompt
                                </DialogTitle>
                            </DialogHeader>
                            <div className="flex flex-col gap-4">
                                <div className="flex items-center justify-between text-sm text-muted-foreground">
                                    <span>
                                        by {lastPrompt.wallet_address?.slice(0, 6)}...{lastPrompt.wallet_address?.slice(-4)}
                                    </span>
                                    <span>
                                        {new Date(lastPrompt.createdAt).toLocaleString()}
                                    </span>
                                </div>
                                <div className="flex items-start gap-4">
                                    <MessageAvatar agentId={lastPrompt.fromAgent} />
                                    <div className="flex-1 space-y-2">
                                        <div className="bg-primary/10 rounded-lg p-4">
                                            <h3 className="font-medium mb-2 text-primary">{lastPrompt.shortDescription}</h3>
                                            <p className="text-sm text-muted-foreground whitespace-pre-wrap">{lastPrompt.message}</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </DialogContent>
                    </Dialog>
                </>
            )}
            <div 
                className="h-full overflow-y-auto scroll-smooth px-4" 
                ref={messagesContainerRef}
            >
                <div className="space-y-4 max-w-3xl mx-auto py-4 flex flex-col">
                    {transitions((style, message) => {
                        const AnimatedDiv = animated('div');
                        const agentInfo = AGENTS_INFO[message.fromAgent as keyof typeof AGENTS_INFO];
                        const isLastMessage = message.id === lastMessageId;
                        const isMyChampion = agentInfo?.side === selectedChampion;
                        
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
            <div className="text-sm text-gray-500 text-center pb-2">
                Last updated: {new Date(lastUpdateTime).toLocaleTimeString()}
            </div>
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