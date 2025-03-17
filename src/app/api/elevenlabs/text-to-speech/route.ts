import { NextRequest, NextResponse } from 'next/server';

// Define los IDs de voces reales de ElevenLabs aquí
// Usando voces predefinidas disponibles en todas las cuentas de ElevenLabs
const VOICE_IDS = {
  // Voces predefinidas de ElevenLabs (disponibles para todos)
  adam: 'pNInz6obpgDQGcFmaJgB',       // Adam (voz masculina expresiva)
  antoni: 'ErXwobaYiN019PkySvjV',     // Antoni (voz masculina profunda)
  arnold: 'VR6AewLTigWG4xSOukaG',     // Arnold (voz con acento)
  bella: 'EXAVITQu4vr4xnSDxMaL',      // Bella (voz femenina emocional)
  daniel: 'onwK4e9ZLuTAKqWW03F9',     // Daniel (voz masculina narrativa)
  dave: 'CYw3kZ02Hs0563khs1Fj',       // Dave (voz masculina conversacional)
  dorothy: 'ThT5KcBeYPX3keUQqHPh',    // Dorothy (voz femenina mayor)
  elli: 'MF3mGyEYCl7XYWbV9V6O',       // Elli (voz femenina suave)
  josh: 'TxGEqnHWrfWFTfGW9XjX',       // Josh (voz masculina juvenil)
  rachel: 'z9fAnlkpzviPz146aGWa',     // Rachel (voz femenina enérgica)
  domi: 'AZnzlk1XvdvUeBnXmlld',       // Domi (voz femenina amigable)
  sam: 'yoZ06aMxZJJ28mfd3POQ',        // Sam (voz no binaria)
  
  // Mapeo para los personajes
  putin: 'VR6AewLTigWG4xSOukaG',      // Arnold para Putin (voz con acento)
  zelensky: 'onwK4e9ZLuTAKqWW03F9',   // Daniel para Zelensky
  fuzz: 'TxGEqnHWrfWFTfGW9XjX',       // Josh para Fuzz
  
  // Voces de respaldo
  male: 'pNInz6obpgDQGcFmaJgB',       // Adam como voz masculina predeterminada
  female: 'EXAVITQu4vr4xnSDxMaL',     // Bella como voz femenina predeterminada
  default: 'pNInz6obpgDQGcFmaJgB'     // Adam como voz predeterminada
};

// Array con todos los IDs de voz válidos
const validVoiceIds = Object.values(VOICE_IDS);

// Función para verificar si un ID de voz es válido
function isValidVoiceId(voiceId: string): boolean {
  return validVoiceIds.includes(voiceId);
}

export async function POST(request: NextRequest) {
  try {
    const { text, voiceId } = await request.json();
    
    if (!text) {
      return NextResponse.json(
        { error: 'Text is required' },
        { status: 400 }
      );
    }
    
    const elevenlabsApiKey = process.env.NEXT_PUBLIC_ELEVENLABS_API_KEY;
    
    if (!elevenlabsApiKey) {
      console.error('NEXT_PUBLIC_ELEVENLABS_API_KEY is not defined in environment variables');
      return NextResponse.json(
        { error: 'Server configuration error' },
        { status: 500 }
      );
    }

    // Usa el ID de voz proporcionado o el predeterminado
    const requestedVoiceId = voiceId || VOICE_IDS.default;
    
    // Verifica si el ID de voz es válido, si no, usa el predeterminado
    const finalVoiceId = isValidVoiceId(requestedVoiceId) 
      ? requestedVoiceId 
      : VOICE_IDS.default;
      
    if (requestedVoiceId !== finalVoiceId) {
      console.warn(`Requested voice ID ${requestedVoiceId} is not valid. Using default voice instead.`);
    }
    
    console.log(`Generating speech using voice ID: ${finalVoiceId}`);
    console.log(`Text length: ${text.length} characters`);
    console.log(`First 50 chars of text: "${text.substring(0, 50)}..."`);

    // Verificar si el texto es muy largo y truncarlo si es necesario
    const maxLength = 5000; // ElevenLabs tiene un límite de caracteres
    const truncatedText = text.length > maxLength 
      ? text.substring(0, maxLength) + "..."
      : text;

    // Configurar body con opciones según la longitud del texto
    const body = {
      text: truncatedText,
      model_id: 'eleven_multilingual_v2', // Multilingual model
      voice_settings: {
        stability: 0.5,
        similarity_boost: 0.75,
        style: 0.0,
        use_speaker_boost: true
      }
    };

    // Determinar la URL adecuada para la API
    // Primero intentamos con la API de streaming
    let apiUrl = `https://api.elevenlabs.io/v1/text-to-speech/${finalVoiceId}/stream`;
    
    console.log(`Calling ElevenLabs API at: ${apiUrl}`);
    
    // Opciones para la solicitud
    const options = {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'xi-api-key': elevenlabsApiKey
      },
      body: JSON.stringify(body)
    };

    // Hacer la solicitud a la API de ElevenLabs
    let response = await fetch(apiUrl, options);

    // Si falla el streaming, intentar con la API estándar
    if (!response.ok && response.status === 400) {
      console.log("Stream API failed, trying standard API endpoint");
      apiUrl = `https://api.elevenlabs.io/v1/text-to-speech/${finalVoiceId}`;
      response = await fetch(apiUrl, options);
    }

    if (!response.ok) {
      const errorText = await response.text();
      console.error('ElevenLabs API error status:', response.status);
      console.error('ElevenLabs API error text:', errorText);
      
      // Si el error es de límite de API, devolver un mensaje específico
      if (response.status === 429) {
        return NextResponse.json(
          { error: 'ElevenLabs API rate limit exceeded', details: errorText },
          { status: 429 }
        );
      }
      
      return NextResponse.json(
        { error: 'Failed to generate speech', details: errorText },
        { status: response.status }
      );
    }

    // Obtener el audio como arraybuffer
    const audioArrayBuffer = await response.arrayBuffer();
    
    // Devolver el audio con los headers correctos
    return new NextResponse(audioArrayBuffer, {
      headers: {
        'Content-Type': 'audio/mpeg',
        'Content-Length': audioArrayBuffer.byteLength.toString()
      }
    });
  } catch (error) {
    console.error('Error in text-to-speech API:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: String(error) },
      { status: 500 }
    );
  }
} 