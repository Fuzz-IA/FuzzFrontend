'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { apiClient } from '@/lib/api';
import { AGENT_IDS, AGENTS_INFO } from '@/lib/constants';
import { Loader2, Volume2, Pause, RefreshCw, Zap } from 'lucide-react';
import { VoiceNav } from '@/components/voice-nav';
import { generateHumorousSummary } from '@/lib/openai';

interface Message {
  id: string;
  content: string;
  text?: string;
  fromAgent: string;
  timestamp: number;
}

// Voces con personalidad para el narrador
const NARRATOR_VOICES = [
  { id: 'TxGEqnHWrfWFTfGW9XjX', name: 'Josh', description: 'Humorous and youthful' },
  { id: 'VR6AewLTigWG4xSOukaG', name: 'Arnold', description: 'Intense and provocative' },
  { id: 'CYw3kZ02Hs0563khs1Fj', name: 'Dave', description: 'Casual and sarcastic' },
  { id: 'z9fAnlkpzviPz146aGWa', name: 'Rachel', description: 'Energetic and teasing' }
];

export default function NarratorTestPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [narratorVoice, setNarratorVoice] = useState(NARRATOR_VOICES[1].id);
  const [summaryText, setSummaryText] = useState<string>('');
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [audioElement, setAudioElement] = useState<HTMLAudioElement | null>(null);
  const [statusMessage, setStatusMessage] = useState<string>('');
  const [modelInfo, setModelInfo] = useState<{ model?: string, attempts?: number, error?: string } | null>(null);
  const [errorDetails, setErrorDetails] = useState<string | null>(null);
  const [debugMode, setDebugMode] = useState<boolean>(false);
  const [playbackRate, setPlaybackRate] = useState<number>(1);

  useEffect(() => {
    fetchMessages();
  }, []);

  // Auto-generate summary when messages are loaded
  useEffect(() => {
    // Only auto-generate if we have messages and no summary yet
    if (messages.length > 0 && !summaryText && !isGenerating) {
      generateHumorousSummaryHandler();
    }
  }, [messages, summaryText, isGenerating]);

  // Update playback rate when it changes
  useEffect(() => {
    if (audioElement) {
      audioElement.playbackRate = playbackRate;
    }
  }, [playbackRate, audioElement]);

  // Fetch the messages from the API
  const fetchMessages = async () => {
    try {
      setIsLoading(true);
      setStatusMessage('Loading messages...');
      
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
      ].sort((a, b) => a.createdAt! - b.createdAt!); // Sort by oldest first

      // Get the last 30 messages 
      const newMessages = allMemories
        .filter(memory => memory.userId !== "12dea96f-ec20-0935-a6ab-75692c994959")
        .slice(-30) // Get the last 30 messages
        .map(memory => ({
          id: memory.id,
          content: memory.content.text || memory.content.content || '',
          fromAgent: memory.agentId,
          timestamp: memory.createdAt!
        }));

      setMessages(newMessages);
      setStatusMessage(`${newMessages.length} messages loaded`);
    } catch (error) {
      console.error('Error fetching messages:', error);
      setStatusMessage('Error loading messages');
    } finally {
      setIsLoading(false);
    }
  };

  // Generate a humorous summary of the conversation
  const generateHumorousSummaryHandler = async () => {
    if (messages.length === 0) {
      setStatusMessage('No messages to summarize');
      return;
    }

    // Limpiar errores previos
    setErrorDetails(null);
    setIsGenerating(true);
    setStatusMessage('Generating humorous summary...');

    try {
      // Format the conversation for the AI
      const conversationText = messages.map(msg => {
        const agent = AGENTS_INFO[msg.fromAgent as keyof typeof AGENTS_INFO];
        return `${agent?.name || 'Unknown'}: ${msg.content}`;
      }).join('\n\n');
      
      // Usar la función directamente sin llamar a la API
      const result = await generateHumorousSummary(
        conversationText,
        AGENTS_INFO[AGENT_IDS.AGENT1_ID].name,
        AGENTS_INFO[AGENT_IDS.AGENT2_ID].name
      );
      
      setSummaryText(result.summary);
      
      // Guardar información sobre el modelo usado
      setModelInfo({
        model: result.model || 'unknown',
        attempts: result.attempts || 1,
        error: result.error
      });
      
      if (result.error) {
        // Guardar detalles técnicos para depuración
        setErrorDetails(JSON.stringify({
          error: result.error,
          model: result.model,
          attempts: result.attempts
        }, null, 2));
      }
      
      if (result.model === 'emergency-fallback') {
        // Mensaje especial para el fallback de emergencia
        setStatusMessage(`Could not use API. Using emergency response.`);
      } else if (result.model) {
        setStatusMessage(`Summary generated using ${result.model}. Generating audio...`);
      } else {
        setStatusMessage('Summary generated. Generating audio...');
      }
      
      // Generate speech with the summary
      await generateSpeech(result.summary);
      
    } catch (error: any) {
      console.error('Error generating summary:', error);
      setStatusMessage(`Error: ${error.message || 'Unknown'}`);
      
      // Guardar detalles de error para debug
      setErrorDetails(JSON.stringify({
        error: error.message,
        status: error.status,
        type: error.type,
        stack: error.stack
      }, null, 2));
    } finally {
      setIsGenerating(false);
    }
  };

  // Function to generate speech using ElevenLabs API
  const generateSpeech = async (text: string) => {
    if (!text || text.trim() === '') {
      setStatusMessage('No text to convert to speech');
      return;
    }
    
    setStatusMessage('Generating audio...');
    
    try {
      const response = await fetch('/api/elevenlabs/text-to-speech', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text,
          voiceId: narratorVoice,
        }),
      });

      if (!response.ok) {
        const errorStatus = response.status;
        let errorDetail = '';
        
        try {
          // Intentar extraer el mensaje de error detallado del cuerpo
          const errorData = await response.json();
          errorDetail = errorData.error || JSON.stringify(errorData);
        } catch (parseErr) {
          // Si no podemos analizar el cuerpo como JSON, usar el texto de estado
          errorDetail = response.statusText;
        }
        
        console.error(`Error generating audio: ${errorStatus} - ${errorDetail}`);
        
        // Si el error es de API rate limit (429), dar un mensaje más amigable
        if (errorStatus === 429) {
          setStatusMessage('API rate limit exceeded. Please try again later.');
        } else {
          setStatusMessage(`Error ${errorStatus}: ${errorDetail}`);
        }
        
        throw new Error(`Error generating audio: ${errorStatus} ${errorDetail}`);
      }

      const audioBlob = await response.blob();
      const url = URL.createObjectURL(audioBlob);
      
      // Clean up previous audio if it exists
      if (audioUrl) {
        URL.revokeObjectURL(audioUrl);
      }
      
      setAudioUrl(url);
      const audio = new Audio(url);
      
      // Set playback rate before playing
      audio.playbackRate = playbackRate;
      
      // Auto-play the audio
      audio.oncanplaythrough = () => {
        audio.play()
          .then(() => {
            setIsPlaying(true);
            setStatusMessage('Playing audio...');
          })
          .catch(err => {
            console.error('Auto-play failed:', err);
            setStatusMessage('Audio ready to play (auto-play failed)');
          });
      };
      
      audio.onended = () => {
        setIsPlaying(false);
        setStatusMessage('Playback finished');
      };
      
      setAudioElement(audio);
      
    } catch (error) {
      console.error('Error generating speech:', error);
      setStatusMessage(`Error: ${error}`);
    }
  };
  
  // Play/pause the audio
  const togglePlayback = () => {
    if (!audioElement) return;
    
    if (isPlaying) {
      audioElement.pause();
      setIsPlaying(false);
      setStatusMessage('Audio paused');
    } else {
      audioElement.play()
        .then(() => {
          setIsPlaying(true);
          setStatusMessage('Playing audio...');
        })
        .catch(err => {
          console.error('Play failed:', err);
          setStatusMessage('Could not play audio. Try clicking again.');
        });
      
      audioElement.onended = () => {
        setIsPlaying(false);
        setStatusMessage('Playback finished');
      };
    }
  };
  
  // Handle voice selection
  const handleVoiceChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    setNarratorVoice(event.target.value);
    
    // If we already have a summary, regenerate the audio with the new voice
    if (summaryText) {
      generateSpeech(summaryText);
    }
  };
  
  return (
    <div className="container mx-auto py-10">
      <VoiceNav />
      <Card className="mb-8">
        <CardHeader>
          <CardTitle className="text-center text-2xl">Humorous Narrator</CardTitle>
          <p className="text-center text-muted-foreground mt-2">
            Sarcastic and comic summary of the last 30 messages of the conversation
          </p>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Status indicator */}
          {statusMessage && (
            <div className="p-3 rounded bg-black/10 border border-gray-200 dark:border-gray-800">
              <div className="text-sm font-medium">{statusMessage}</div>
            </div>
          )}
          
          {/* Controls */}
          <div className="flex flex-wrap gap-4 items-center justify-center">
            <Button
              onClick={fetchMessages}
              variant="outline"
              disabled={isLoading}
              className="flex-1 min-w-[150px] max-w-[200px]"
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Loading...
                </>
              ) : (
                <>
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Update Messages
                </>
              )}
            </Button>
            
            <div className="flex-1 min-w-[150px] max-w-[200px]">
              <select 
                value={narratorVoice}
                onChange={handleVoiceChange}
                className="w-full px-3 py-2 rounded border bg-transparent"
                disabled={isGenerating}
              >
                {NARRATOR_VOICES.map(voice => (
                  <option key={voice.id} value={voice.id}>
                    {voice.name} - {voice.description}
                  </option>
                ))}
              </select>
            </div>
            
            <Button
              onClick={generateHumorousSummaryHandler}
              variant="default"
              disabled={isGenerating || messages.length === 0}
              className="flex-1 min-w-[150px] max-w-[200px] bg-yellow-600 hover:bg-yellow-700 relative group"
              title="The system may use GPT-4 or GPT-3.5 depending on API limits"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Zap className="mr-2 h-4 w-4" />
                  Generate Monologue
                  <span className="absolute -top-10 left-1/2 transform -translate-x-1/2 w-40 bg-black/80 text-white text-xs p-1 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                    Uses GPT-4 or GPT-3.5 based on availability
                  </span>
                </>
              )}
            </Button>
            
            <Button
              onClick={togglePlayback}
              disabled={!audioUrl}
              variant={isPlaying ? "destructive" : "default"}
              className="flex-1 min-w-[150px] max-w-[200px]"
            >
              {isPlaying ? (
                <>
                  <Pause className="mr-2 h-4 w-4" />
                  Pause
                </>
              ) : (
                <>
                  <Volume2 className="mr-2 h-4 w-4" />
                  Play
                </>
              )}
            </Button>
            
            {/* Playback Speed Controls */}
            {audioUrl && (
              <div className="flex justify-center gap-2 mt-2 w-full">
                <Button
                  onClick={() => setPlaybackRate(1)}
                  variant={playbackRate === 1 ? "default" : "outline"}
                  size="sm"
                  className={`px-2 ${playbackRate === 1 ? 'bg-yellow-600 hover:bg-yellow-700' : ''}`}
                >
                  1x
                </Button>
                <Button
                  onClick={() => setPlaybackRate(1.5)}
                  variant={playbackRate === 1.5 ? "default" : "outline"}
                  size="sm"
                  className={`px-2 ${playbackRate === 1.5 ? 'bg-yellow-600 hover:bg-yellow-700' : ''}`}
                >
                  1.5x
                </Button>
                <Button
                  onClick={() => setPlaybackRate(2)}
                  variant={playbackRate === 2 ? "default" : "outline"}
                  size="sm"
                  className={`px-2 ${playbackRate === 2 ? 'bg-yellow-600 hover:bg-yellow-700' : ''}`}
                >
                  2x
                </Button>
              </div>
            )}
            
            {/* Botón de modo debug */}
            <Button
              onClick={() => setDebugMode(!debugMode)}
              variant={debugMode ? "destructive" : "outline"}
              size="sm"
              className="absolute top-2 right-2 px-2 py-1 text-xs"
              title="Toggle debug mode"
            >
              {debugMode ? "Debug Mode: ON" : "Debug"}
            </Button>
          </div>
          
          {/* Debug information when debug mode is enabled */}
          {debugMode && (
            <div className="mt-4 p-3 rounded bg-gray-900/30 border border-gray-700 text-xs font-mono">
              <h4 className="font-bold mb-2">Debug Information:</h4>
              <div className="grid grid-cols-2 gap-2">
                <div><span className="opacity-70">API Status:</span> {statusMessage ? `"${statusMessage}"` : 'N/A'}</div>
                <div><span className="opacity-70">Model:</span> {modelInfo?.model || 'N/A'}</div>
                <div><span className="opacity-70">Attempts:</span> {modelInfo?.attempts || 'N/A'}</div>
                <div><span className="opacity-70">Messages:</span> {messages.length}</div>
                <div><span className="opacity-70">Voice ID:</span> {narratorVoice}</div>
                <div><span className="opacity-70">Has Error:</span> {errorDetails ? 'Yes' : 'No'}</div>
              </div>
              
              <div className="mt-2">
                <Button 
                  onClick={() => {
                    console.log('Debug state dump:', {
                      messages: messages.length > 0 ? messages.slice(0, 2) : [],
                      totalMessages: messages.length,
                      statusMessage,
                      modelInfo,
                      errorDetails,
                      narratorVoice,
                      isGenerating,
                      isPlaying
                    });
                    
                    // Copiar info a clipboard
                    navigator.clipboard.writeText(JSON.stringify({
                      statusMessage,
                      modelInfo,
                      errorDetails,
                      narratorVoice,
                      totalMessages: messages.length
                    }, null, 2)).then(() => {
                      setStatusMessage('Debug info copied to clipboard');
                    });
                  }}
                  variant="outline"
                  size="sm"
                  className="w-full mt-2 text-xs h-6"
                >
                  Log Debug Info to Console & Copy
                </Button>
              </div>
            </div>
          )}
          
          {/* Summary display */}
          {summaryText && (
            <Card className="mt-6 bg-black/5">
              <CardContent className="p-6">
                <div className="flex justify-between items-center mb-3">
                  <h3 className="text-lg font-bold text-yellow-600">Narrator's Monologue</h3>
                  {modelInfo && (
                    <div className="text-xs text-muted-foreground">
                      Generated with: {modelInfo.model} 
                      {modelInfo.attempts && modelInfo.attempts > 1 ? ` (after ${modelInfo.attempts - 1} retries)` : ''}
                      {modelInfo.error && <span className="text-amber-500 ml-1">⚠️</span>}
                    </div>
                  )}
                </div>
                <div className="text-base whitespace-pre-wrap">
                  {summaryText}
                </div>
                
                {/* Mostrar detalles de error si están disponibles (para depuración) */}
                {errorDetails && (
                  <div className="mt-4 p-2 bg-red-900/20 border border-red-800 rounded-sm">
                    <details>
                      <summary className="text-xs cursor-pointer hover:text-red-400">View technical error details</summary>
                      <pre className="text-xs text-red-400 mt-2 overflow-auto max-h-40 p-2 bg-black/30 rounded">
                        {errorDetails}
                      </pre>
                    </details>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
          
          {/* Message list */}
          <div className="mt-8">
            <h3 className="text-lg font-semibold mb-4">Last {messages.length} messages:</h3>
            
            {messages.length === 0 && !isLoading ? (
              <p className="text-center text-muted-foreground">No messages found</p>
            ) : (
              <div className="space-y-3 max-h-[400px] overflow-y-auto p-2">
                {messages.map((message, index) => {
                  const agent = AGENTS_INFO[message.fromAgent as keyof typeof AGENTS_INFO];
                  return (
                    <div 
                      key={`${message.id}-${index}`}
                      className={`p-3 rounded ${
                        agent?.side === 'putin' 
                          ? 'bg-orange-100/10 border-l-4 border-orange-500' 
                          : 'bg-slate-100/10 border-l-4 border-blue-500'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <div className="font-semibold">
                          {agent?.name || 'Unknown'}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {new Date(message.timestamp).toLocaleTimeString()}
                        </div>
                      </div>
                      <div className="text-sm text-gray-600 dark:text-gray-300">
                        {message.content.length > 100 
                          ? `${message.content.substring(0, 100)}...` 
                          : message.content}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
} 