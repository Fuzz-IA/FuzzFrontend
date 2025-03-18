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
import { Pin, ChevronDown, Loader2, Info, FileText, BarChart } from 'lucide-react';
import { getLatestPrompt } from '@/lib/supabase';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { CHAMPION1, CHAMPION2, CHAMPION1_NAME, CHAMPION2_NAME, AGENT_IDS, AGENTS_INFO } from '@/lib/constants';
import { ChampionType } from '@/types/battle';
import { processChatMessages, getCacheStats, clearSummaryCache } from '@/lib/message-cache';
import { initializeDatabase } from '@/lib/database-setup';

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
    shortSummary?: string;
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
  const chatContainerRef = useRef<HTMLDivElement | null>(null);

  return (
    <>
      {showHeader && <ChatHeader />}
      <main className={`flex-1 overflow-hidden relative ${showHeader ? 'mx-0 ml-20 my-6 mt-4 rounded-lg border bg-background shadow-md border-[#F3642E]' : ''} h-[calc(100vh-10rem)]`}>
        <div className="h-full flex flex-col">
          <div 
            ref={chatContainerRef}
            className="flex-1 overflow-y-auto"
          >
            <ChatMessages 
              selectedChampion={selectedChampion} 
              countdownActive={countdownActive} 
              scrollContainerRef={chatContainerRef}
            />
          </div>
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
        <span className="whitespace-pre-wrap break-words">
            {displayedText}
            {!isComplete && (
                <span className="inline-block w-[2px] h-[1.2em] bg-primary/60 animate-pulse ml-[1px] align-middle" />
            )}
        </span>
    );
}

function ChatMessages({ 
    selectedChampion, 
    countdownActive,
    scrollContainerRef
}: { 
    selectedChampion: ChampionType;
    countdownActive?: boolean;
    scrollContainerRef?: React.RefObject<HTMLDivElement | null>;
}) {
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
    const [displayShortSummaries, setDisplayShortSummaries] = useState<boolean>(false);
    const [isSummarizing, setIsSummarizing] = useState<boolean>(false);
    const [summaryStats, setSummaryStats] = useState<{
        cacheSize: number;
        hitRate: number;
        dbSuccessRate?: number;
        queuedMessages?: number;
        processedFromQueue?: number;
        isProcessingQueue?: boolean;
        totalLookups?: number;
        progress?: number;
    } | null>(null);
    const [dbInitialized, setDbInitialized] = useState<boolean>(false);

    // Initialize database
    useEffect(() => {
        const setupDatabase = async () => {
            try {
                const success = await initializeDatabase();
                setDbInitialized(success);
                if (success) {
                    console.log('Database initialized successfully');
                } else {
                    console.warn('Database initialization failed, summaries will only be cached in memory');
                }
            } catch (error) {
                console.error('Error initializing database:', error);
                setDbInitialized(false);
            }
        };
        
        setupDatabase();
    }, []);

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

    // Updated function to fetch messages and process summaries
    const fetchMessages = async () => {
        try {
            // Obtain messages from Agent 1
            const roomId1 = await apiClient.stringToUuid(
                `default-room-${AGENT_IDS.AGENT1_ID}`
            );
            const response1 = await apiClient.getAgentMemories(
                AGENT_IDS.AGENT1_ID,
                roomId1
            );

            // Obtain messages from Agent 2
            const roomId2 = await apiClient.stringToUuid(
                `default-room-${AGENT_IDS.AGENT2_ID}`
            );
            const response2 = await apiClient.getAgentMemories(
                AGENT_IDS.AGENT2_ID,
                roomId2
            );

            // Combine and sort all messages
            const allMemories = [
                ...(response1?.memories || []),
                ...(response2?.memories || [])
            ].sort((a, b) => a.createdAt! - b.createdAt!);

            // Process new messages
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
                    toAgent: memory.userId,
                    timestamp: memory.createdAt
                }));

            // Process message summaries with our new caching system
            setIsSummarizing(true);
            const messagesWithSummaries = await processChatMessages(newMessages);
            setIsSummarizing(false);

            // Get cache statistics and calculate progress
            const stats = getCacheStats();
            const statsWithProgress = {
                ...stats,
                progress: newMessages.length > 0 
                    ? Math.floor((stats.processedFromQueue || 0) * 100 / newMessages.length)
                    : 100
            };
            setSummaryStats(statsWithProgress);

            // If there are new messages, simulate typing
            const lastCurrentMessage = currentMessages[currentMessages.length - 1];
            const lastNewMessage = messagesWithSummaries[messagesWithSummaries.length - 1];

            if (lastNewMessage && (!lastCurrentMessage || lastNewMessage.id !== lastCurrentMessage.id)) {
                await simulateTyping(lastNewMessage);
                setPinnedMessage(lastNewMessage);
            }

            queryClient.setQueryData(["messages"], messagesWithSummaries);
            setLastUpdateTime(Date.now());
            
        } catch (error) {
            console.error('Error fetching messages:', error);
            setIsSummarizing(false);
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
    
    // Initial scroll to bottom ONLY when messages are first loaded
    useEffect(() => {
        if (!isLoadingHistory && messagesContainerRef.current && messages.length > 0) {
            setTimeout(() => {
                if (messagesContainerRef.current) {
                    messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
                }
                
                // Also try the parent container provided as prop
                if (scrollContainerRef?.current) {
                    scrollContainerRef.current.scrollTop = scrollContainerRef.current.scrollHeight;
                }
            }, 300);
        }
    }, [isLoadingHistory, messages.length]); 

    // Also scroll when messages change - check both container refs
    useEffect(() => {
        if (!showScrollButton) {
            setTimeout(() => {
                // Try the message container first
                if (messagesContainerRef.current) {
                    messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
                }
                
                // Also try the parent container provided as prop
                if (scrollContainerRef?.current) {
                    scrollContainerRef.current.scrollTop = scrollContainerRef.current.scrollHeight;
                }
            }, 200);
        }
    }, [messages.length, scrollContainerRef]);

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

    // Add a toggle for showing summaries vs. full content
    const toggleSummaryView = () => {
        setDisplayShortSummaries(!displayShortSummaries);
    };

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
                <div className="flex flex-col w-full">
                    {/* Panel fijo de information/latest prompt */}
                    <div className="w-full sticky top-0 left-0 right-0 z-50">
                        {selectedChampion !== 'info' && lastPrompt && (
                            <div className="bg-black/90 backdrop-blur-sm rounded-lg border border-[#F3642E]/50 p-3 mb-3 shadow-lg shadow-[#F3642E]/10">
                                <div className="flex items-center gap-2 text-xs text-[#F3642E]">
                                    <Pin className="h-4 w-4 text-[#F3642E]" />
                                    <span className="font-bold uppercase tracking-wider">Latest prompt for {selectedChampion === CHAMPION1 ? CHAMPION1_NAME : CHAMPION2_NAME}</span>
                                </div>
                                <div className="text-sm text-white mt-2 font-medium">
                                    {lastPrompt.message}
                                </div>
                            </div>
                        )}
                        
                        {selectedChampion === 'info' && (
                            <div className="bg-black rounded-lg border border-[#F3642E] p-3 mb-3">
                                <div className="flex flex-wrap justify-between items-center">
                                    <div className="flex items-center gap-2 text-[#F3642E]">
                                        <Info className="h-4 w-4 text-[#F3642E]" />
                                        <span className="font-bold uppercase text-xs tracking-wider">INFORMATION MODE</span>
                                    </div>
                                    <button 
                                        onClick={toggleSummaryView}
                                        className={`text-xs px-3 py-1 rounded-md ${
                                            displayShortSummaries 
                                                ? 'bg-[#F3642E] text-white' 
                                                : 'bg-transparent border border-[#F3642E] text-[#F3642E]'
                                        }`}
                                    >
                                        {displayShortSummaries ? "Full Messages" : "Summaries"}
                                    </button>
                                </div>
                                <div className="text-gray-400 text-xs italic mt-2">
                                    Viewing {displayShortSummaries ? "summarized" : "full"} messages
                                </div>
                            </div>
                        )}
                    </div>
                    
                    <div className="text-xs text-muted-foreground text-center mt-6 mb-4">
                        Last updated: {new Date(lastUpdateTime).toLocaleTimeString()}
                    </div>
                    
                    <div className="space-y-8 pb-20">
                        {filteredMessages.map((message, index) => (
                            <div
                                key={`${message.createdAt}-${message.user}-${message.text}-${index}`}
                                className={`flex items-start gap-3 ${
                                    message.fromAgent && 
                                    AGENTS_INFO[message.fromAgent as AgentId]?.side === selectedChampion 
                                        ? 'flex-row-reverse ml-auto' 
                                        : 'flex-row mr-auto'
                                } max-w-full sm:max-w-[90%]`}
                            >
                                <MessageAvatar agentId={message.fromAgent} />
                                <div className={`flex flex-col overflow-x-hidden ${
                                    message.fromAgent && 
                                    AGENTS_INFO[message.fromAgent as AgentId]?.side === selectedChampion 
                                        ? 'items-end' 
                                        : 'items-start'
                                } max-w-[calc(100%-40px)] sm:max-w-[85%]`}>
                                    <div 
                                        className={`relative rounded-lg p-3 mb-1 break-words ${
                                            message.isPinned 
                                                ? 'bg-[#F3642E]/10 border border-[#F3642E]/30' 
                                                : message.fromAgent && AGENTS_INFO[message.fromAgent as AgentId]?.side === selectedChampion
                                                ? 'bg-[#F3642E]/10'
                                                : 'bg-slate-700/30'
                                        }`}
                                    >
                                        {message.isPinned && (
                                            <Pin className="absolute -top-2 -left-2 h-4 w-4 text-[#F3642E]" />
                                        )}
                                        
                                        {/* Simple status indicators for summaries */}
                                        {displayShortSummaries && selectedChampion === 'info' && (
                                            <>
                                                {(!message.shortSummary || message.shortSummary === '⏳ Processing summary...') && (
                                                    <div className="absolute top-0 right-0 -mt-2 -mr-2 bg-[#F3642E]/80 text-white text-[10px] px-1.5 py-0.5 rounded-full font-medium flex items-center">
                                                        <Loader2 className="h-2 w-2 animate-spin mr-1" />
                                                        Processing
                                                    </div>
                                                )}
                                                {message.shortSummary && message.shortSummary !== '⏳ Processing summary...' && !(message.text || message.content).startsWith(message.shortSummary) && (
                                                    <div className="absolute top-0 right-0 -mt-2 -mr-2 bg-green-600 text-white text-[10px] px-1.5 py-0.5 rounded-full font-medium">
                                                        Summarized
                                                    </div>
                                                )}
                                            </>
                                        )}
                                        
                                        <TypewriterText 
                                            text={displayShortSummaries && message.shortSummary 
                                                ? message.shortSummary 
                                                : (message.text || message.content)
                                            } 
                                            animate={message.isTyping} 
                                        />
                                    </div>
                                    <div className="text-xs text-gray-400 truncate max-w-full">
                                        {message.fromAgent && AGENTS_INFO[message.fromAgent as AgentId]?.name || 'Unknown'} • {new Date(message.timestamp).toLocaleTimeString([], {hour: '2-digit', minute: '2-digit'})}
                                    </div>
                                </div>
                            </div>
                        ))}
                        
                        {chatState.isTyping && (
                            <div className={`flex items-start gap-3 max-w-[90%] ${
                                chatState.typingAgent && 
                                AGENTS_INFO[chatState.typingAgent as AgentId]?.side === selectedChampion 
                                ? 'flex-row-reverse ml-auto' 
                                : 'flex-row mr-auto'
                            }`}>
                                <MessageAvatar agentId={chatState.typingAgent || ''} />
                                <div className={`flex flex-col max-w-[85%] ${
                                    chatState.typingAgent && 
                                    AGENTS_INFO[chatState.typingAgent as AgentId]?.side === selectedChampion 
                                    ? 'items-end' 
                                    : 'items-start'
                                }`}>
                                    <div className={`rounded-lg p-4 mb-1 ${
                                        chatState.typingAgent && 
                                        AGENTS_INFO[chatState.typingAgent as AgentId]?.side === selectedChampion
                                        ? 'bg-[#F3642E]/10'
                                        : 'bg-slate-700/30'
                                    }`}>
                                        <TypingIndicator />
                                    </div>
                                    <div className="text-xs text-gray-400">
                                        {chatState.typingAgent && AGENTS_INFO[chatState.typingAgent as AgentId]?.name || 'Unknown'} • typing...
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
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