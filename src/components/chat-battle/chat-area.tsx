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
    <div style={{
      display: "flex",
      flexDirection: "column",
      flex: 1,
      height: "calc(100vh - 80px)",
      width: "calc(100% - 100px)", // Account for the left sidebar margin
      marginLeft: "80px",
      paddingLeft: "8px",
      paddingRight: "16px",
      overflowX: "hidden",
      position: "relative"
    }}>
      {showHeader && <ChatHeader />}
      <main 
        style={{
          position: "relative",
          display: "flex",
          flexDirection: "column",
          width: "100%",
          margin: showHeader ? "16px 0" : "0",
          borderRadius: showHeader ? "8px" : "0",
          border: showHeader ? "1px solid #F3642E" : "none",
          backgroundColor: showHeader ? "var(--background)" : "transparent",
          boxShadow: showHeader ? "0 4px 6px -1px rgba(0, 0, 0, 0.1)" : "none",
          height: "calc(100vh - 12rem)",
          overflowX: "hidden",
          boxSizing: "border-box" // Force it to include borders in width
        }}
      >
        <div style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          display: "flex",
          flexDirection: "column",
          boxSizing: "border-box"
        }}>
          <div 
            ref={chatContainerRef}
            style={{
              height: "calc(100% - 80px)",
              overflowY: "auto",
              overflowX: "hidden",
              WebkitOverflowScrolling: "touch", // Para mejor scroll en iOS
              width: "100%",
              maxWidth: "100%",
              paddingBottom: "20px" // Add space at the bottom
            }}
          >
            <ChatMessages 
              selectedChampion={selectedChampion} 
              countdownActive={countdownActive} 
              scrollContainerRef={chatContainerRef}
            />
          </div>
          <div style={{height: "80px"}}>
            <ChatInput selectedChampion={selectedChampion} countdownActive={countdownActive} />
          </div>
        </div>
      </main>
    </div>
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
        <span className="whitespace-pre-wrap break-words overflow-hidden">
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
            setTimeout(() => {
                if (messagesContainerRef.current) {
                    messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
                    console.log("Scrolled to bottom on initial load");
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
                    console.log("Scrolled messages container to bottom");
                }
                
                // Also try the parent container provided as prop
                if (scrollContainerRef?.current) {
                    scrollContainerRef.current.scrollTop = scrollContainerRef.current.scrollHeight;
                    console.log("Scrolled parent container to bottom");
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

    // Actualización periódica de estadísticas
    useEffect(() => {
        // Actualizar estadísticas cada segundo cuando hay procesamiento en cola
        const statsInterval = setInterval(() => {
            const stats = getCacheStats();
            if (stats.queuedMessages > 0 || stats.isProcessingQueue) {
                setSummaryStats(stats);
            }
        }, 1000);
        
        return () => clearInterval(statsInterval);
    }, []);

    // Refrescar mensajes cuando cambien las estadísticas de procesamiento
    useEffect(() => {
        if (!summaryStats) return;
        
        // Si hay mensajes en cola y el procesamiento está activo, 
        // refrescar los mensajes para obtener las versiones resumidas
        if (summaryStats.isProcessingQueue && messages.length > 0) {
            const hasPlaceholders = messages.some(msg => 
                msg.shortSummary === '⏳ Processing summary...'
            );
            
            // Solo refrescar si hay marcadores de procesamiento
            if (hasPlaceholders) {
                const refreshMessages = async () => {
                    // No necesitamos volver a cargar de la API, solo reprocesar con la caché actual
                    const refreshedMessages = await processChatMessages(messages);
                    queryClient.setQueryData(["messages"], refreshedMessages);
                };
                
                refreshMessages();
            }
        }
    }, [summaryStats, messages]);

    // Añadir función para limpiar la caché
    const clearCache = () => {
        clearSummaryCache();
        setSummaryStats(getCacheStats());
        
        // Reprocesar los mensajes
        const refreshMessages = async () => {
            setIsSummarizing(true);
            const refreshedMessages = await processChatMessages(messages);
            queryClient.setQueryData(["messages"], refreshedMessages);
            setIsSummarizing(false);
        };
        
        refreshMessages();
    };

    if (isLoadingHistory) {
        return <LoadingSpinner />;
    }

    return (
        <div style={{
            minHeight: "100%", 
            padding: "16px 16px 80px 16px", // Increased bottom padding for the input area
            overflowY: "auto",
            overflowX: "hidden",
            width: "100%", 
            boxSizing: "border-box",
            maxWidth: "100%"
        }} ref={messagesContainerRef}>
            {showScrollButton && (
                <button 
                    onClick={scrollToBottom}
                    style={{
                        position: "fixed",
                        bottom: "100px",
                        right: "20px",
                        backgroundColor: hasNewMessages ? "#F3642E" : "rgba(243, 100, 46, 0.8)",
                        color: "white",
                        borderRadius: "9999px",
                        padding: "8px",
                        boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)",
                        zIndex: 50,
                        cursor: "pointer",
                        border: "none",
                        outline: "none",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        width: "40px",
                        height: "40px",
                        animation: hasNewMessages ? "pulse 2s infinite" : "none"
                    }}
                    aria-label="Scroll to bottom"
                >
                    <ChevronDown style={{height: "20px", width: "20px"}} />
                    {hasNewMessages && (
                        <span style={{
                            position: "absolute",
                            top: "-4px",
                            right: "-4px",
                            backgroundColor: "#ef4444", 
                            borderRadius: "9999px",
                            width: "12px",
                            height: "12px"
                        }}></span>
                    )}
                </button>
            )}
            {isLoadingHistory ? (
                <LoadingSpinner />
            ) : (
                <div style={{
                    display: "flex", 
                    flexDirection: "column", 
                    gap: "32px", // Increased gap for better message separation
                    width: "100%",
                    maxWidth: "100%",
                    boxSizing: "border-box"
                }}>
                    <div style={{
                        position: "sticky",
                        top: 0,
                        zIndex: 10,
                        backdropFilter: "blur(8px)",
                        borderRadius: "0.375rem",
                        padding: "0.375rem 0.5rem",
                        marginBottom: "0.5rem",
                        boxShadow: "0 2px 4px rgba(0, 0, 0, 0.1)",
                        width: "calc(100% - 16px)",
                        maxWidth: "calc(100% - 16px)",
                        boxSizing: "border-box",
                        overflow: "hidden",
                        height: "auto",
                        maxHeight: "2.5rem", // Restringir altura
                        background: selectedChampion === 'info' 
                            ? "linear-gradient(to right, #1c1c1c, #222)" 
                            : "rgba(0, 0, 0, 0.8)",
                        border: `1px solid ${selectedChampion === 'info' ? "#F3642E" : "rgba(243, 100, 46, 0.5)"}`,
                    }}>
                        <div style={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                            width: "100%",
                            height: "100%"
                        }}>
                            <div style={{
                                display: "flex",
                                alignItems: "center",
                                gap: "0.375rem",
                                overflow: "hidden",
                                maxWidth: "70%"
                            }}>
                                {selectedChampion === 'info' ? (
                                    <>
                                        <Info style={{height: "14px", width: "14px", minWidth: "14px", color: "#F3642E"}} />
                                        <span style={{
                                            fontWeight: "bold", 
                                            fontSize: "0.75rem",
                                            textTransform: "uppercase", 
                                            letterSpacing: "0.025em", 
                                            overflow: "hidden", 
                                            textOverflow: "ellipsis", 
                                            whiteSpace: "nowrap"
                                        }}>Info</span>
                                    </>
                                ) : (
                                    <>
                                        <Pin style={{height: "14px", width: "14px", minWidth: "14px", color: "#F3642E"}} />
                                        <span style={{
                                            fontWeight: "bold", 
                                            fontSize: "0.75rem",
                                            overflow: "hidden", 
                                            textOverflow: "ellipsis", 
                                            whiteSpace: "nowrap"
                                        }}>
                                            {lastPrompt && lastPrompt.message ? 
                                                lastPrompt.message.length > 30 ? 
                                                    lastPrompt.message.substring(0, 30) + "..." 
                                                    : lastPrompt.message 
                                                : `Prompt: ${selectedChampion === CHAMPION1 ? CHAMPION1_NAME : CHAMPION2_NAME}`}
                                        </span>
                                    </>
                                )}
                            </div>
                            
                            {selectedChampion === 'info' && (
                                <div style={{
                                    display: "flex", 
                                    alignItems: "center", 
                                    gap: "0.25rem",
                                    marginLeft: "auto"
                                }}>
                                    {isSummarizing && (
                                        <div style={{
                                            display: "flex",
                                            alignItems: "center",
                                            fontSize: "0.625rem",
                                            color: "rgba(255, 255, 255, 0.7)",
                                            gap: "0.25rem",
                                            marginRight: "0.25rem"
                                        }}>
                                            <Loader2 style={{height: "10px", width: "10px"}} className="animate-spin" />
                                            <span>Processing</span>
                                        </div>
                                    )}
                                    <div 
                                        onClick={toggleSummaryView}
                                        style={{
                                            display: "inline-flex",
                                            alignItems: "center",
                                            justifyContent: "center",
                                            borderRadius: "0.25rem",
                                            fontSize: "0.625rem",
                                            fontWeight: "500",
                                            height: "1.5rem",
                                            padding: "0 0.5rem",
                                            cursor: "pointer",
                                            background: displayShortSummaries ? "#F3642E" : "transparent",
                                            color: displayShortSummaries ? "white" : "#F3642E",
                                            border: displayShortSummaries ? "none" : "1px solid rgba(243, 100, 46, 0.5)"
                                        }}
                                    >
                                        {displayShortSummaries ? "Full" : "Summary"}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                    <div style={{
                        fontSize: "0.625rem", 
                        color: "rgba(156, 163, 175, 0.8)", 
                        textAlign: "center",
                        marginTop: "0.25rem",
                        marginBottom: "0.25rem"
                    }}>
                        Last updated: {new Date(lastUpdateTime).toLocaleTimeString()}
                    </div>
                    
                    {filteredMessages.map((message, index) => (
                        <div
                            key={`${message.createdAt}-${message.user}-${message.text}-${index}`}
                            style={{
                                display: "flex",
                                alignItems: "flex-start",
                                gap: "12px",
                                width: "100%",
                                maxWidth: "90%",
                                marginBottom: "20px",
                                flexDirection: message.fromAgent && 
                                    AGENTS_INFO[message.fromAgent as AgentId]?.side === selectedChampion 
                                        ? "row-reverse" : "row",
                                marginLeft: message.fromAgent && 
                                    AGENTS_INFO[message.fromAgent as AgentId]?.side === selectedChampion 
                                        ? "auto" : "0",
                                marginRight: message.fromAgent && 
                                    AGENTS_INFO[message.fromAgent as AgentId]?.side === selectedChampion 
                                        ? "0" : "auto",
                                boxSizing: "border-box",
                                padding: "0 4px"
                            }}
                        >
                            <div style={{
                                minWidth: "36px", // Make the avatar have a fixed minimum width
                                maxWidth: "36px",
                                height: "36px",
                                display: "flex",
                                justifyContent: "center",
                                alignItems: "center"
                            }}>
                                <MessageAvatar agentId={message.fromAgent} />
                            </div>
                            <div style={{
                                display: "flex",
                                flexDirection: "column",
                                overflowX: "hidden",
                                alignItems: message.fromAgent && 
                                    AGENTS_INFO[message.fromAgent as AgentId]?.side === selectedChampion 
                                        ? "flex-end" : "flex-start",
                                maxWidth: "calc(100% - 50px)", // Account for avatar and gap
                            }}>
                                <div style={{
                                    position: "relative",
                                    borderRadius: "8px",
                                    padding: "12px",
                                    marginBottom: "4px",
                                    wordBreak: "break-word",
                                    maxWidth: "100%",
                                    boxSizing: "border-box",
                                    backgroundColor: message.isPinned 
                                        ? 'rgba(243, 100, 46, 0.1)'
                                        : message.fromAgent && AGENTS_INFO[message.fromAgent as AgentId]?.side === selectedChampion
                                            ? 'rgba(243, 100, 46, 0.1)'
                                            : 'rgba(100, 116, 139, 0.3)',
                                    border: message.isPinned ? '1px solid rgba(243, 100, 46, 0.3)' : 'none'
                                }}>
                                    {message.isPinned && (
                                        <div style={{
                                            position: "absolute",
                                            top: "-8px",
                                            left: "-8px",
                                            color: "#F3642E"
                                        }}>
                                            <Pin style={{ height: "16px", width: "16px" }} />
                                        </div>
                                    )}
                                    
                                    {/* Simple status indicators for summaries */}
                                    {displayShortSummaries && selectedChampion === 'info' && (
                                        <>
                                            {(!message.shortSummary || message.shortSummary === '⏳ Processing summary...') && (
                                                <div style={{
                                                    position: "absolute",
                                                    top: "-8px",
                                                    right: "-8px",
                                                    backgroundColor: "rgba(243, 100, 46, 0.8)",
                                                    color: "white",
                                                    fontSize: "10px",
                                                    padding: "2px 6px",
                                                    borderRadius: "9999px",
                                                    fontWeight: "500",
                                                    display: "flex",
                                                    alignItems: "center"
                                                }}>
                                                    <Loader2 style={{ height: "8px", width: "8px", marginRight: "4px" }} className="animate-spin" />
                                                    Processing
                                                </div>
                                            )}
                                            {message.shortSummary && message.shortSummary !== '⏳ Processing summary...' && !(message.text || message.content).startsWith(message.shortSummary) && (
                                                <div style={{
                                                    position: "absolute",
                                                    top: "-8px",
                                                    right: "-8px",
                                                    backgroundColor: "rgb(22, 163, 74)",
                                                    color: "white",
                                                    fontSize: "10px",
                                                    padding: "2px 6px",
                                                    borderRadius: "9999px",
                                                    fontWeight: "500"
                                                }}>
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
                                <div style={{
                                    fontSize: "0.75rem",
                                    color: "#9ca3af",
                                    textOverflow: "ellipsis",
                                    overflow: "hidden",
                                    whiteSpace: "nowrap",
                                    maxWidth: "100%"
                                }}>
                                    {message.fromAgent && AGENTS_INFO[message.fromAgent as AgentId]?.name || 'Unknown'} • {new Date(message.timestamp).toLocaleTimeString([], {hour: '2-digit', minute: '2-digit'})}
                                </div>
                            </div>
                        </div>
                    ))}
                    
                    {chatState.isTyping && (
                        <div style={{
                            display: "flex",
                            alignItems: "flex-start",
                            gap: "12px",
                            width: "100%",
                            maxWidth: "90%",
                            marginBottom: "20px",
                            flexDirection: chatState.typingAgent && 
                                AGENTS_INFO[chatState.typingAgent as AgentId]?.side === selectedChampion 
                                    ? "row-reverse" : "row",
                            marginLeft: chatState.typingAgent && 
                                AGENTS_INFO[chatState.typingAgent as AgentId]?.side === selectedChampion 
                                    ? "auto" : "0",
                            marginRight: chatState.typingAgent && 
                                AGENTS_INFO[chatState.typingAgent as AgentId]?.side === selectedChampion 
                                    ? "0" : "auto",
                            boxSizing: "border-box",
                            padding: "0 4px"
                        }}>
                            <div style={{
                                minWidth: "36px",
                                maxWidth: "36px",
                                height: "36px",
                                display: "flex",
                                justifyContent: "center",
                                alignItems: "center"
                            }}>
                                <MessageAvatar agentId={chatState.typingAgent || ''} />
                            </div>
                            <div style={{
                                display: "flex",
                                flexDirection: "column",
                                overflowX: "hidden",
                                alignItems: chatState.typingAgent && 
                                    AGENTS_INFO[chatState.typingAgent as AgentId]?.side === selectedChampion 
                                        ? "flex-end" : "flex-start",
                                maxWidth: "calc(100% - 50px)",
                            }}>
                                <div style={{
                                    position: "relative",
                                    borderRadius: "8px",
                                    padding: "12px",
                                    marginBottom: "4px",
                                    backgroundColor: chatState.typingAgent && 
                                        AGENTS_INFO[chatState.typingAgent as AgentId]?.side === selectedChampion
                                            ? 'rgba(243, 100, 46, 0.1)'
                                            : 'rgba(100, 116, 139, 0.3)',
                                }}>
                                    <TypingIndicator />
                                </div>
                                <div style={{
                                    fontSize: "0.75rem",
                                    color: "#9ca3af",
                                    textOverflow: "ellipsis",
                                    overflow: "hidden",
                                    whiteSpace: "nowrap",
                                    maxWidth: "100%"
                                }}>
                                    {chatState.typingAgent && AGENTS_INFO[chatState.typingAgent as AgentId]?.name || 'Unknown'} • typing...
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
        <div style={{
            display: "flex", 
            justifyContent: "center", 
            alignItems: "center", 
            padding: "16px"
        }}>
            <div style={{
                animation: "spin 1s linear infinite",
                borderRadius: "9999px",
                height: "32px",
                width: "32px",
                borderBottom: "2px solid #F3642E",
                borderLeft: "2px solid transparent",
                borderRight: "2px solid transparent",
                borderTop: "2px solid transparent"
            }}></div>
        </div>
    );
}

function TypingIndicator() {
    return (
        <div style={{
            display: "flex",
            alignItems: "center",
            gap: "8px"
        }}>
            <div style={{
                display: "flex",
                gap: "4px"
            }}>
                <div style={{
                    width: "8px",
                    height: "8px",
                    borderRadius: "9999px",
                    backgroundColor: "rgba(243, 100, 46, 0.6)",
                    animation: "bounce 1s infinite",
                    animationDelay: "-0.3s"
                }} />
                <div style={{
                    width: "8px",
                    height: "8px",
                    borderRadius: "9999px",
                    backgroundColor: "rgba(243, 100, 46, 0.6)",
                    animation: "bounce 1s infinite",
                    animationDelay: "-0.15s"
                }} />
                <div style={{
                    width: "8px",
                    height: "8px",
                    borderRadius: "9999px",
                    backgroundColor: "rgba(243, 100, 46, 0.6)",
                    animation: "bounce 1s infinite",
                }} />
            </div>
            <span style={{
                fontSize: "0.875rem",
                color: "rgba(156, 163, 175, 0.8)"
            }}>typing...</span>
        </div>
    );
}