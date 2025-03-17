'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { apiClient } from '@/lib/api';
import { AGENT_IDS, AGENTS_INFO } from '@/lib/constants';
import { Loader2, Volume2, Pause } from 'lucide-react';
import { VoiceNav } from '@/components/voice-nav';

interface Message {
  id: string;
  content: string;
  text?: string;
  fromAgent: string;
  timestamp: number;
}

// Voces predefinidas de ElevenLabs disponibles para todos
const VOICE_OPTIONS = [
  { id: 'pNInz6obpgDQGcFmaJgB', name: 'Adam', description: 'Voz masculina expresiva' },
  { id: 'ErXwobaYiN019PkySvjV', name: 'Antoni', description: 'Voz masculina profunda' },
  { id: 'VR6AewLTigWG4xSOukaG', name: 'Arnold', description: 'Voz con acento' },
  { id: 'EXAVITQu4vr4xnSDxMaL', name: 'Bella', description: 'Voz femenina emocional' },
  { id: 'onwK4e9ZLuTAKqWW03F9', name: 'Daniel', description: 'Voz masculina narrativa' }
];

export default function VoiceTestPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [currentlyPlaying, setCurrentlyPlaying] = useState<number | null>(null);
  const [audioElements, setAudioElements] = useState<HTMLAudioElement[]>([]);
  const [statusMessage, setStatusMessage] = useState<string>('');
  const [progressPercent, setProgressPercent] = useState<number>(0);

  useEffect(() => {
    fetchMessages();
  }, []);

  // Fetch the last messages from the API
  const fetchMessages = async () => {
    try {
      setIsLoading(true);
      
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
      ].sort((a, b) => b.createdAt! - a.createdAt!); // Sort by newest first

      // Get only the last 3 messages
      const newMessages = allMemories
        .filter(memory => memory.userId !== "12dea96f-ec20-0935-a6ab-75692c994959")
        .slice(0, 3)
        .map(memory => ({
          id: memory.id,
          content: memory.content.text || memory.content.content || '',
          fromAgent: memory.agentId,
          timestamp: memory.createdAt!
        }));

      setMessages(newMessages);
    } catch (error) {
      console.error('Error fetching messages:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Function to generate speech using ElevenLabs API
  const generateSpeech = async (text: string, voiceId: string) => {
    if (!text || text.trim() === '') {
      setStatusMessage('Empty text provided for voice generation');
      console.error('Empty text provided for voice generation');
      return null;
    }
    
    // Limpiar y formatear el texto para evitar problemas
    const cleanedText = text
      .trim()
      .replace(/\n+/g, ' ')
      .replace(/\s+/g, ' ');
      
    console.log(`Generating speech for: "${cleanedText.substring(0, 30)}..."`, `using voice ID: ${voiceId}`);
    
    try {
      // Primer intento con la API regular
      setStatusMessage(`Generating speech for: "${cleanedText.substring(0, 20)}..."`);
      const response = await fetch('/api/elevenlabs/text-to-speech', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text: cleanedText,
          voiceId,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        console.error(`Speech generation failed with status ${response.status}:`, errorData || 'No error details');
        
        // Si el error es de formato, intentamos con un texto más simple
        if (response.status === 400) {
          setStatusMessage('Retrying with simplified text...');
          console.log('Retrying with simplified text');
          // Segundo intento con un texto simplificado si hay error de formato
          const simpleText = cleanedText.substring(0, 100) + '...';
          const retryResponse = await fetch('/api/elevenlabs/text-to-speech', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              text: simpleText,
              voiceId,
            }),
          });
          
          if (retryResponse.ok) {
            const audioBlob = await retryResponse.blob();
            return URL.createObjectURL(audioBlob);
          } else {
            throw new Error(`Retry failed with status ${retryResponse.status}`);
          }
        } else {
          setStatusMessage(`API error with status ${response.status}`);
          throw new Error(`API error with status ${response.status}`);
        }
      }

      const audioBlob = await response.blob();
      return URL.createObjectURL(audioBlob);
    } catch (error) {
      setStatusMessage(`Error: ${error}`);
      console.error('Error generating speech:', error);
      return null;
    }
  };

  // Play all messages sequentially
  const playMessages = async () => {
    if (isPlaying) {
      stopPlayback();
      return;
    }

    setIsPlaying(true);
    setStatusMessage('Starting audio generation...');
    setProgressPercent(0);
    
    // Define voice IDs for each agent - using ElevenLabs predefined voices
    // Estos son IDs reales que existen en todas las cuentas de ElevenLabs
    const voiceMap: Record<string, string> = {
      [AGENT_IDS.AGENT1_ID]: 'VR6AewLTigWG4xSOukaG', // Arnold para Putin
      [AGENT_IDS.AGENT2_ID]: 'onwK4e9ZLuTAKqWW03F9', // Daniel para Zelensky
      [AGENT_IDS.AGENT3_ID]: 'ErXwobaYiN019PkySvjV', // Antoni para Fuzz
      'default': 'pNInz6obpgDQGcFmaJgB'  // Adam como voz predeterminada
    };
    
    console.log('Usando las siguientes voces:');
    Object.entries(voiceMap).forEach(([agent, voiceId]) => {
      const agentName = Object.entries(AGENT_IDS).find(([_, id]) => id === agent)?.[0] || 'Unknown';
      const voiceName = VOICE_OPTIONS.find(v => v.id === voiceId)?.name || 'Unknown';
      console.log(`${agentName}: Usando voz "${voiceName}" (ID: ${voiceId})`);
    });
    
    const audioArray: HTMLAudioElement[] = [];
    const processedMessages = [];
    
    // Procesamos de atrás hacia adelante para que la reproducción sea cronológica
    for (let i = messages.length - 1; i >= 0; i--) {
      const message = messages[i];
      const agent = AGENTS_INFO[message.fromAgent as keyof typeof AGENTS_INFO];
      const voiceId = voiceMap[message.fromAgent] || voiceMap.default;
      
      const progress = Math.round(((messages.length - i) / messages.length) * 100);
      setProgressPercent(progress);
      
      console.log(`Processing message ${messages.length - i}/${messages.length} from ${agent?.name || 'Unknown'}`);
      setStatusMessage(`Generando voz para mensaje ${messages.length - i}/${messages.length}`);
      setCurrentlyPlaying(messages.length - 1 - i);
      
      try {
        // Si el mensaje está vacío, usar un texto genérico
        const textToSynthesize = message.content?.trim() 
          ? message.content.trim() 
          : `Mensaje de ${agent?.name || 'Desconocido'}`;
          
        const audioUrl = await generateSpeech(textToSynthesize, voiceId);
        
        if (audioUrl) {
          const audio = new Audio(audioUrl);
          audioArray.push(audio);
          processedMessages.push({ success: true, index: i });
        } else {
          throw new Error("No se pudo generar la URL del audio");
        }
      } catch (error) {
        console.error(`Error con el mensaje ${i}:`, error);
        
        // Fallback: crear un elemento de audio silencioso para mantener la secuencia
        const silentAudio = new Audio("data:audio/mp3;base64,SUQzBAAAAAAAI1RTU0UAAAAPAAADTGF2ZjU4Ljc2LjEwMAAAAAAAAAAAAAAA//tQAA==");
        silentAudio.volume = 0;
        audioArray.push(silentAudio);
        processedMessages.push({ success: false, index: i, error: String(error) });
      }
    }
    
    const successRate = Math.round((processedMessages.filter(m => m.success).length / messages.length) * 100);
    setStatusMessage(`Generación de audio completada: ${successRate}% exitoso`);
    console.log(`Audio generation complete: ${processedMessages.filter(m => m.success).length}/${messages.length} messages processed successfully`);
    
    setAudioElements(audioArray);
    
    if (audioArray.length > 0) {
      playSequentially(audioArray, 0);
    } else {
      console.error("No audio elements were created");
      setIsPlaying(false);
      setCurrentlyPlaying(null);
    }
  };
  
  // Play audio elements sequentially
  const playSequentially = (audioArray: HTMLAudioElement[], index: number) => {
    if (index >= audioArray.length) {
      setStatusMessage('Playback finished');
      setProgressPercent(100);
      setIsPlaying(false);
      setCurrentlyPlaying(null);
      return;
    }
    
    setCurrentlyPlaying(messages.length - 1 - index);
    setStatusMessage(`Playing message ${index + 1}/${audioArray.length}`);
    
    const audio = audioArray[index];
    audio.play();
    
    audio.onended = () => {
      playSequentially(audioArray, index + 1);
    };
  };
  
  // Stop all playback
  const stopPlayback = () => {
    audioElements.forEach(audio => {
      audio.pause();
      audio.currentTime = 0;
    });
    setIsPlaying(false);
    setCurrentlyPlaying(null);
  };

  return (
    <div className="container mx-auto py-10">
      <VoiceNav />
      <Card className="mb-8">
        <CardHeader>
          <CardTitle className="text-center text-2xl">ElevenLabs Voice Test</CardTitle>
          <p className="text-center text-muted-foreground mt-2">
            Usando voces predefinidas de ElevenLabs: 
            Adam, Arnold, Antoni, Bella y Daniel
          </p>
        </CardHeader>
        <CardContent>
          {/* Status indicator */}
          {(isPlaying || statusMessage) && (
            <div className="mb-4 p-3 rounded bg-black/10 border border-gray-200 dark:border-gray-800">
              <div className="flex justify-between items-center mb-2">
                <div className="text-sm font-medium">{statusMessage}</div>
                {isPlaying && (
                  <div className="text-xs text-muted-foreground">
                    {progressPercent}%
                  </div>
                )}
              </div>
              {isPlaying && (
                <div className="w-full bg-gray-200 rounded-full h-2.5 dark:bg-gray-700">
                  <div 
                    className="bg-green-600 h-2.5 rounded-full transition-all duration-300" 
                    style={{ width: `${progressPercent}%` }}
                  ></div>
                </div>
              )}
            </div>
          )}
          
          <div className="flex justify-center space-x-4 mb-6">
            <Button
              onClick={fetchMessages}
              variant="outline"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Loading...
                </>
              ) : (
                'Refresh Messages'
              )}
            </Button>
            
            <Button
              onClick={playMessages}
              disabled={isLoading || messages.length === 0}
              variant={isPlaying ? "destructive" : "default"}
            >
              {isPlaying ? (
                <>
                  <Pause className="mr-2 h-4 w-4" />
                  Stop Playback
                </>
              ) : (
                <>
                  <Volume2 className="mr-2 h-4 w-4" />
                  Play Messages
                </>
              )}
            </Button>
          </div>
          
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold">Last 3 Messages:</h3>
              <div className="text-xs text-muted-foreground">
                Putin: Arnold | Zelensky: Daniel | Fuzz: Antoni
              </div>
            </div>
            
            {messages.length === 0 && !isLoading ? (
              <p className="text-center text-muted-foreground">No messages found</p>
            ) : (
              messages.map((message, index) => {
                const agent = AGENTS_INFO[message.fromAgent as keyof typeof AGENTS_INFO];
                return (
                  <Card 
                    key={message.id}
                    className={`border ${currentlyPlaying === index ? 'border-green-500 bg-green-50/10' : ''}`}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between mb-2">
                        <div className="font-semibold">
                          {agent?.name || 'Unknown Agent'}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {new Date(message.timestamp).toLocaleTimeString()}
                        </div>
                      </div>
                      <div className="text-sm">
                        {message.content}
                      </div>
                      {currentlyPlaying === index && (
                        <div className="mt-2 flex items-center text-green-500 text-xs">
                          <Volume2 className="mr-1 h-3 w-3 animate-pulse" />
                          Currently speaking...
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
} 