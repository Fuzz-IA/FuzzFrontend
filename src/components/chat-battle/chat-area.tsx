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
import { Pin, ChevronDown } from 'lucide-react';
import { getLatestPrompt } from '@/lib/supabase';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { CHAMPION1, CHAMPION2, CHAMPION1_NAME, CHAMPION2_NAME, AGENT_IDS, AGENTS_INFO } from '@/lib/constants';
import { ChampionType } from '@/types/battle';

// Use the imported constants instead of redefining them
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
        [CHAMPION1]: number;
        [CHAMPION2]: number;
    };
    isPinned?: boolean;
}

interface ChatState {
    isTyping: boolean;
    typingAgent: string | null;
    waitingResponse: boolean;
}

interface ChatAreaProps {
  selectedChampion: ChampionType;
  showHeader?: boolean;
  countdownActive?: boolean;
}

interface AnimatedStyles {
    opacity: SpringValue<number>;
    transform: SpringValue<string>;
    scale: SpringValue<number>;
}

export function ChatArea({ selectedChampion, showHeader = true, countdownActive = false }: ChatAreaProps) {
  return (
    <>
      {showHeader && <ChatHeader />}
      <main className={`flex-1 overflow-hidden relative ${showHeader ? 'mx-0 ml-20 my-6 mt-4 rounded-lg border bg-background shadow-md border-[#F3642E]' : ''} h-[calc(100vh-10rem)]`}>
        <div className="h-full flex flex-col">
          <ChatMessages selectedChampion={selectedChampion} countdownActive={countdownActive} />
          <ChatInput selectedChampion={selectedChampion} countdownActive={countdownActive} />
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

function ChatMessages({ selectedChampion, countdownActive }: { selectedChampion: ChampionType; countdownActive?: boolean }) {
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
    const [showScrollButton, setShowScrollButton] = useState(false);
    const [hasNewMessages, setHasNewMessages] = useState(false);

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
            const prompt = await getLatestPrompt(selectedChampion === CHAMPION1);
            if (prompt) {
                setLastPrompt({
                    message: prompt.message,
                    shortDescription: prompt.short_description,
                    fromAgent: selectedChampion === CHAMPION1 ? AGENT_IDS.AGENT1_ID : AGENT_IDS.AGENT2_ID,
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
    
    // Automatic scroll to bottom when new messages arrive or typing state changes
    // Removing this effect to avoid continuous auto-scrolling
    // useEffect(() => {
    //     if (messagesContainerRef.current) {
    //         const container = messagesContainerRef.current;
    //         // Smooth scroll to bottom
    //         container.scrollTo({
    //             top: container.scrollHeight,
    //             behavior: 'smooth'
    //         });
    //     }
    // }, [messages.length, chatState.isTyping]); // Triggers on new messages or typing state changes

    // Initial scroll to bottom ONLY when messages are first loaded
    useEffect(() => {
        if (!isLoadingHistory && messagesContainerRef.current && messages.length > 0) {
            const container = messagesContainerRef.current;
            // Immediate scroll to bottom on initial load only
            container.scrollTop = container.scrollHeight;
        }
    }, [isLoadingHistory]); // Only depends on isLoadingHistory to run just once after loading

    // Add scroll event listener to show/hide scroll button
    useEffect(() => {
        const container = messagesContainerRef.current;
        if (!container) return;

        const handleScroll = () => {
            // Show button when user has scrolled up at least 200px from bottom
            const isScrolledUp = container.scrollHeight - container.scrollTop - container.clientHeight > 200;
            setShowScrollButton(isScrolledUp);
        };

        container.addEventListener('scroll', handleScroll);
        return () => container.removeEventListener('scroll', handleScroll);
    }, []);

    // Check if we need to show the scroll button when new messages arrive
    useEffect(() => {
        const container = messagesContainerRef.current;
        if (!container) return;
        
        // If user is not at the bottom when new messages arrive, show the scroll button
        const isScrolledUp = container.scrollHeight - container.scrollTop - container.clientHeight > 200;
        if (isScrolledUp) {
            setShowScrollButton(true);
            setHasNewMessages(true); // Indicate that there are new messages
            
            // Reset the new messages indicator after 5 seconds
            const timer = setTimeout(() => {
                setHasNewMessages(false);
            }, 5000);
            
            return () => clearTimeout(timer);
        }
    }, [messages.length]); // Run when messages array length changes

    // Function to scroll to bottom when button is clicked
    const scrollToBottom = () => {
        if (messagesContainerRef.current) {
            messagesContainerRef.current.scrollTo({
                top: messagesContainerRef.current.scrollHeight,
                behavior: 'smooth'
            });
            setHasNewMessages(false); // Reset new messages indicator after scrolling
        }
    };

    const lastMessageId = messages[0]?.id;

    // Show all messages regardless of countdown
    const filteredMessages = messages;

    if (isLoadingHistory) {
        return <LoadingSpinner />;
    }

    return (
        <div className="flex-1 overflow-y-auto p-4 pb-0 relative" ref={messagesContainerRef}>
            {showScrollButton && (
                <button 
                    onClick={scrollToBottom}
                    className={`absolute bottom-4 right-4 text-white rounded-full p-2 shadow-lg z-20 transition-all animate-fadeIn hover:scale-110 ${hasNewMessages ? 'bg-[#F3642E] animate-pulse' : 'bg-[#F3642E]/80 hover:bg-[#F3642E]'}`}
                    aria-label="Scroll to bottom"
                >
                    <ChevronDown className="h-5 w-5" />
                    {hasNewMessages && (
                        <span className="absolute -top-1 -right-1 bg-red-500 rounded-full w-3 h-3"></span>
                    )}
                </button>
            )}
            {isLoadingHistory ? (
                <LoadingSpinner />
            ) : (
                <div className="space-y-8 pb-2 ">
                    {lastPrompt && (
                        <div className="sticky top-0 z-10 bg-black/90 backdrop-blur-sm rounded-lg border-2 border-[#F3642E]/50 p-3 mb-3 shadow-lg shadow-[#F3642E]/10">
                            <div className="flex items-center gap-2 text-xs text-[#F3642E]">
                                <Pin className="h-4 w-4 text-[#F3642E]" />
                                <span className="font-bold uppercase tracking-wider">Latest prompt for {selectedChampion === CHAMPION1 ? CHAMPION1_NAME : CHAMPION2_NAME}</span>
                            </div>
                            <div className="text-sm text-white mt-2 font-medium">
                                {lastPrompt.message}
                            </div>
                        </div>
                    )}
                    <div className="text-xs text-muted-foreground text-center">
                        Last updated: {new Date(lastUpdateTime).toLocaleTimeString()}
                    </div>
                    
                    {/* Render messages without animations for simplicity */}
                    {filteredMessages.map((message, index) => (
                        <div
                            key={`${message.createdAt}-${message.user}-${message.text}-${index}`}
                            className={`flex items-start gap-2 ${
                                message.fromAgent && 
                                AGENTS_INFO[message.fromAgent as AgentId]?.side === selectedChampion 
                                    ? 'flex-row-reverse' 
                                    : 'flex-row'
                            }`}
                        >
                            <MessageAvatar agentId={message.fromAgent} />
                            <div className={`flex flex-col ${
                                message.fromAgent && 
                                AGENTS_INFO[message.fromAgent as AgentId]?.side === selectedChampion 
                                    ? 'items-end' 
                                    : 'items-start'
                            }`}>
                                <div className={`relative rounded-lg p-4 ${
                                    message.isPinned 
                                        ? 'bg-[#F3642E]/10 border border-[#F3642E]/30' 
                                        : 'bg-primary/10'
                                }`}>
                                    {message.isPinned && (
                                        <Pin className="absolute -top-2 -left-2 h-4 w-4 text-[#F3642E]" />
                                    )}
                                    <TypewriterText 
                                        text={message.text || message.content} 
                                        animate={message.isTyping} 
                                    />
                                </div>
                            </div>
                        </div>
                    ))}
                    
                    {/* Show typing indicator */}
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