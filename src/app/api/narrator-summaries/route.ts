import { NextResponse } from 'next/server';
import { apiClient } from '@/lib/api';
import { AGENT_IDS, AGENTS_INFO } from '@/lib/constants';
import { generateHumorousSummary } from '@/lib/openai';
import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';

// ElevenLabs Arnold voice ID
const ARNOLD_VOICE_ID = 'VR6AewLTigWG4xSOukaG';

// Cache para evitar generar resúmenes y audios constantemente
let lastGeneratedTime = 0;
let lastMessageCount = 0;
const GENERATION_COOLDOWN = 5 * 60 * 1000; // 5 minutos
const MESSAGE_THRESHOLD = 20; // Reducimos el umbral a 20 mensajes para testing

// Path para guardar los archivos de audio (crea la carpeta si no existe)
let audioDir: string;
try {
  audioDir = path.join(process.cwd(), 'public', 'narrator-audio');
  
  // Asegurarnos de que la carpeta exista
  if (!fs.existsSync(audioDir)) {
    console.log('Creating narrator audio directory:', audioDir);
    fs.mkdirSync(audioDir, { recursive: true });
  }
  
  // Verificar permisos de escritura intentando escribir un archivo de prueba
  const testFilePath = path.join(audioDir, '.write-test');
  try {
    fs.writeFileSync(testFilePath, 'test');
    fs.unlinkSync(testFilePath); // Eliminar después de probar
    console.log('Directory is writable:', audioDir);
  } catch (permError) {
    console.error('Directory is not writable:', audioDir, permError);
    // Usar un directorio alternativo
    audioDir = path.join(process.cwd(), 'public');
    console.log('Using fallback directory:', audioDir);
  }
} catch (error) {
  console.error('Error setting up audio directory:', error);
  // Usar un directorio de fallback
  audioDir = path.join(process.cwd(), 'public');
  console.log('Using fallback directory due to error:', audioDir);
}

// Respuesta de fallback en caso de errores graves
function getFallbackResponse(message?: string) {
  return NextResponse.json({
    success: false,
    errorMessage: message || "Sorry, I couldn't generate audio at this time. Please try again later.",
    timestamp: Date.now(),
    isNew: false,
    isFallback: true
  });
}

// GET: Obtener el último resumen generado
export async function GET() {
  console.log('Narrator GET request received');
  try {
    // Verificar que el directorio exista
    if (!fs.existsSync(audioDir)) {
      console.error('Audio directory does not exist:', audioDir);
      try {
        fs.mkdirSync(audioDir, { recursive: true });
        console.log('Created audio directory:', audioDir);
      } catch (mkdirError) {
        console.error('Failed to create audio directory:', mkdirError);
        return getFallbackResponse();
      }
    }

    // Buscar archivos de audio existentes
    let files: string[] = [];
    try {
      files = fs.readdirSync(audioDir)
        .filter(file => file.endsWith('.mp3'))
        .sort((a, b) => {
          // Verificar que los nombres de archivo sean válidos
          const timestampA = a.includes('-') ? parseInt(a.split('-')[0]) : 0;
          const timestampB = b.includes('-') ? parseInt(b.split('-')[0]) : 0;
          return timestampB - timestampA;
        });
      console.log(`Found ${files.length} audio files`);
    } catch (error) {
      console.error('Error reading audio directory:', error);
      // Continuar con un array vacío
      files = [];
    }

    // Si no hay archivos, intentar generar uno nuevo
    if (files.length === 0) {
      console.log('No audio files found, generating new summary');
      try {
        return await generateNewSummary();
      } catch (genError) {
        console.error('Error generating new summary:', genError);
        return getFallbackResponse();
      }
    }

    const latestFile = files[0];
    let timestamp = Date.now(); // Default a timestamp actual si no podemos parsearlo
    
    try {
      if (latestFile.includes('-')) {
        timestamp = parseInt(latestFile.split('-')[0]);
      }
    } catch (parseError) {
      console.error('Error parsing timestamp from filename:', parseError);
      // Continuar con el timestamp por defecto
    }
    
    const filePath = `/narrator-audio/${latestFile}`; // Path relativo para el cliente
    console.log('Using existing audio file:', filePath);

    // Verificar que el archivo exista físicamente
    const fullPath = path.join(process.cwd(), 'public', filePath);
    if (!fs.existsSync(fullPath)) {
      console.error('Audio file does not exist:', fullPath);
      try {
        console.log('File not found, generating new summary');
        return await generateNewSummary();
      } catch (genError) {
        console.error('Error generating new summary after file not found:', genError);
        return getFallbackResponse();
      }
    }

    // Verificar si necesitamos un nuevo resumen (basado en tiempo y mensajes nuevos)
    const currentTime = Date.now();
    
    // Si pasó el cooldown, verificar si hay nuevos mensajes suficientes
    if (currentTime - timestamp > GENERATION_COOLDOWN) {
      try {
        const currentMessageCount = await getTotalMessageCount();
        
        // Si hay suficientes mensajes nuevos, generar un nuevo resumen
        if (currentMessageCount - lastMessageCount >= MESSAGE_THRESHOLD) {
          try {
            return await generateNewSummary();
          } catch (genError) {
            console.error('Error generating new summary after threshold check:', genError);
            // Si falla la generación, seguir con el archivo existente
          }
        }
        
        // Actualizar el contador de mensajes aunque no generemos nuevo audio
        lastMessageCount = currentMessageCount;
      } catch (countError) {
        console.error('Error counting messages:', countError);
        // Continuar con el archivo existente
      }
    }

    // Devolver el archivo existente
    return NextResponse.json({
      success: true,
      audioUrl: filePath,
      timestamp: timestamp,
      isNew: false
    });
  } catch (error) {
    console.error('Error in narrator summary GET:', error);
    return getFallbackResponse();
  }
}

// POST: Forzar la generación de un nuevo resumen (para uso interno/admin)
export async function POST() {
  try {
    const result = await generateNewSummary();
    return result;
  } catch (error) {
    console.error('Error in narrator summary POST:', error);
    return getFallbackResponse();
  }
}

// Función auxiliar para generar un nuevo resumen y audio
async function generateNewSummary() {
  console.log('Generating new summary and audio');
  try {
    // 1. Obtener mensajes recientes
    const messages = await getRecentMessages();
    if (!messages || messages.length === 0) {
      console.warn('No messages found to summarize');
      return getFallbackResponse();
    }
    console.log(`Retrieved ${messages.length} messages for summarization`);

    // 2. Generar el resumen humorístico
    console.log('Calling generateHumorousSummary');
    const conversationText = messages.map(msg => {
      const agent = AGENTS_INFO[msg.fromAgent as keyof typeof AGENTS_INFO];
      return `${agent?.name || 'Unknown'}: ${msg.content}`;
    }).join('\n\n');
    
    const summary = await generateHumorousSummary(
      conversationText,
      AGENTS_INFO[AGENT_IDS.AGENT1_ID].name,
      AGENTS_INFO[AGENT_IDS.AGENT2_ID].name
    );
    console.log('Summary generation complete');

    if (!summary || !summary.summary) {
      console.error('Failed to generate summary or empty summary returned');
      return getFallbackResponse();
    }

    // 3. Generar el audio usando ElevenLabs
    console.log('Calling ElevenLabs API');
    let response;
    try {
      const apiKey = process.env.NEXT_PUBLIC_ELEVENLABS_API_KEY || '';
      if (!apiKey) {
        console.error('NEXT_PUBLIC_ELEVENLABS_API_KEY environment variable not set');
        return getFallbackResponse("ElevenLabs API key not configured. Please contact the administrator.");
      }
      
      response = await fetch('https://api.elevenlabs.io/v1/text-to-speech/' + ARNOLD_VOICE_ID, {
        method: 'POST',
        headers: {
          'Accept': 'audio/mpeg',
          'Content-Type': 'application/json',
          'xi-api-key': apiKey,
        },
        body: JSON.stringify({
          text: summary.summary,
          model_id: "eleven_monolingual_v1",
          voice_settings: {
            stability: 0.5,
            similarity_boost: 0.75,
          }
        }),
      });

      if (!response.ok) {
        const errorData = await response.text();
        console.error(`ElevenLabs API error: ${response.status} - ${errorData}`);
        throw new Error(`ElevenLabs API error: ${response.status}`);
      }
      console.log('ElevenLabs API call successful');
    } catch (apiError) {
      console.error('Error calling ElevenLabs API:', apiError);
      return getFallbackResponse();
    }

    // 4. Guardar el archivo de audio
    try {
      console.log('Processing audio response');
      const audioBuffer = await response.arrayBuffer();
      if (!audioBuffer || audioBuffer.byteLength === 0) {
        console.error('Empty audio buffer received from ElevenLabs');
        throw new Error('Empty audio buffer received');
      }
      console.log(`Received audio buffer of size: ${audioBuffer.byteLength} bytes`);
      
      const timestamp = Date.now();
      const fileName = `${timestamp}-${uuidv4()}.mp3`;
      const filePath = path.join(audioDir, fileName);
      
      // Asegurarnos de que el directorio exista antes de escribir
      if (!fs.existsSync(audioDir)) {
        console.log('Audio directory does not exist, creating it');
        fs.mkdirSync(audioDir, { recursive: true });
      }
      
      console.log(`Writing audio file to: ${filePath}`);
      fs.writeFileSync(filePath, Buffer.from(audioBuffer));
      console.log('Audio file written successfully');
      
      // 5. Actualizar el estado de caché
      lastGeneratedTime = timestamp;
      lastMessageCount = await getTotalMessageCount();
      
      // 6. Limpiar archivos antiguos (mantener solo los últimos 5)
      try {
        const files: string[] = fs.readdirSync(audioDir)
          .filter(file => file.endsWith('.mp3'))
          .sort((a, b) => {
            const timestampA = a.includes('-') ? parseInt(a.split('-')[0]) : 0;
            const timestampB = b.includes('-') ? parseInt(b.split('-')[0]) : 0;
            return timestampB - timestampA;
          });
        
        // Eliminar archivos antiguos dejando solo los 5 más recientes
        if (files.length > 5) {
          for (let i = 5; i < files.length; i++) {
            const oldFile = path.join(audioDir, files[i]);
            try {
              fs.unlinkSync(oldFile);
            } catch (unlinkError) {
              console.error('Error deleting old audio file:', unlinkError);
            }
          }
        }
      } catch (cleanupError) {
        console.error('Error cleaning up old audio files:', cleanupError);
        // Continuar incluso si la limpieza falla
      }
      
      // 7. Devolver la URL del nuevo audio
      const audioUrl = `/narrator-audio/${fileName}`;
      console.log(`Returning new audio URL: ${audioUrl}`);
      return NextResponse.json({
        success: true,
        audioUrl: audioUrl,
        timestamp: timestamp,
        summary: summary.summary,
        model: summary.model,
        isNew: true
      });
    } catch (fsError) {
      console.error('Error writing audio file:', fsError);
      return getFallbackResponse();
    }
  } catch (error) {
    console.error('Error generating new summary:', error);
    return getFallbackResponse();
  }
}

// Obtener los mensajes recientes de los agentes
async function getRecentMessages() {
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
    ].sort((a, b) => a.createdAt! - b.createdAt!); // Sort by oldest first

    // Get the last 50 messages 
    return allMemories
      .filter(memory => memory.userId !== "12dea96f-ec20-0935-a6ab-75692c994959")
      .slice(-50) // Get the last 50 messages
      .map(memory => ({
        id: memory.id,
        content: memory.content.text || memory.content.content || '',
        fromAgent: memory.agentId,
        timestamp: memory.createdAt!
      }));
  } catch (error) {
    console.error('Error fetching messages:', error);
    return [];
  }
}

// Contar el número total de mensajes para saber si hay suficientes nuevos
async function getTotalMessageCount() {
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

    // Sumar el total de mensajes válidos
    return [
      ...(response1?.memories || []),
      ...(response2?.memories || [])
    ].filter(memory => memory.userId !== "12dea96f-ec20-0935-a6ab-75692c994959").length;
  } catch (error) {
    console.error('Error counting messages:', error);
    return 0;
  }
} 