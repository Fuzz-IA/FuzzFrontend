'use client';

import { useState, useEffect, useRef } from 'react';
import { Play, Pause, AlertCircle, Loader2 } from 'lucide-react';

// Constante para url directa en producción
const AUDIO_URL = 'https://www.fuzzai.fun/narrator-audio/1742263051807-2b448ea0-a009-45cb-965f-c20074e95788.mp3';

// Versión para debugging
export function MiniNarrator() {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [debugInfo, setDebugInfo] = useState<string>('Inicializando...');
  const [componentMounted, setComponentMounted] = useState(false);
  const [debugLogs, setDebugLogs] = useState<string[]>([]);

  // Función para añadir logs
  const addLog = (message: string) => {
    console.log(`[Narrator] ${message}`);
    setDebugLogs(prev => [...prev, `${new Date().toLocaleTimeString()}: ${message}`]);
    setDebugInfo(message);
  };

  // Indicar explícitamente que el componente está montado
  useEffect(() => {
    setComponentMounted(true);
    addLog('Componente montado.');
    
    // Intentar obtener información del navegador
    try {
      const userAgent = navigator.userAgent;
      const audioContext = window.AudioContext || (window as any).webkitAudioContext;
      const hasAudioContext = !!audioContext;
      addLog(`User Agent: ${userAgent.substring(0, 50)}...`);
      addLog(`Soporte Audio API: ${hasAudioContext ? 'Sí' : 'No'}`);
    } catch (e) {
      addLog(`Error obteniendo info del navegador: ${e}`);
    }
    
    // Esto se ejecutará cuando el componente se desmonte
    return () => {
      addLog('Componente desmontado.');
    };
  }, []);

  // Inicializar el audio una sola vez
  useEffect(() => {
    if (!componentMounted) return;
    
    // Crear el elemento de audio
    try {
      addLog('Creando elemento de audio...');
      const audio = new Audio();
      
      // Configurar eventos antes de asignar src
      audio.addEventListener('canplaythrough', () => {
        setIsLoading(false);
        addLog('Audio listo para reproducir');
      });
      
      audio.addEventListener('loadstart', () => {
        addLog('Audio comenzó a cargar');
      });
      
      audio.addEventListener('error', (e) => {
        const errorDetail = audio.error 
          ? `Código: ${audio.error.code}, Mensaje: ${audio.error.message}` 
          : 'desconocido';
        
        console.error('Error en audio:', errorDetail);
        addLog(`Error de audio: ${errorDetail}`);
        setError(`Error al cargar (${errorDetail}). Haz clic para reintentar.`);
        setIsLoading(false);
      });
      
      audio.addEventListener('ended', () => {
        setIsPlaying(false);
        addLog('Reproducción finalizada');
      });
      
      // Ahora asignar la URL
      audio.src = AUDIO_URL;
      
      // Almacenar la referencia
      audioRef.current = audio;
      addLog(`Audio inicializado con URL: ${AUDIO_URL}`);
      
      // Precargar
      setIsLoading(true);
      audio.load();
    } catch (err) {
      console.error('Error al crear audio:', err);
      addLog(`Error al inicializar audio: ${err}`);
      setError('Error al inicializar audio. Haz clic para reintentar.');
    }
    
    // Limpieza
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
        addLog('Elemento de audio eliminado');
      }
    };
  }, [componentMounted]);

  // Función para alternar reproducción
  const togglePlayback = () => {
    addLog('Botón pulsado');
    
    if (error) {
      // Si hay error, reintentar cargando el audio
      setError(null);
      setIsLoading(true);
      addLog('Reintentando carga por error previo...');
      
      try {
        if (audioRef.current) {
          audioRef.current.load();
        } else {
          const audio = new Audio();
          audio.addEventListener('error', (e) => {
            const errorDetail = audio.error 
              ? `Código: ${audio.error.code}, Mensaje: ${audio.error.message}` 
              : 'desconocido';
            addLog(`Nuevo error de audio: ${errorDetail}`);
            setError(`No se pudo cargar (${errorDetail})`);
            setIsLoading(false);
          });
          
          audio.src = AUDIO_URL;
          audioRef.current = audio;
          audio.load();
          addLog('Creado nuevo elemento de audio para reintento');
        }
      } catch (e) {
        addLog(`Error en reintento: ${e}`);
        setError(`Error en reintento: ${e}`);
        setIsLoading(false);
      }
      return;
    }
    
    if (!audioRef.current) {
      addLog('No hay elemento de audio disponible');
      setError('Audio no disponible. Haz clic para reintentar.');
      return;
    }
    
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
      addLog('Audio pausado');
    } else {
      addLog('Intentando reproducir audio...');
      
      // Forzar carga antes de reproducir
      audioRef.current.load();
      
      audioRef.current.play()
        .then(() => {
          setIsPlaying(true);
          addLog('Audio reproduciéndose correctamente');
        })
        .catch(err => {
          addLog(`Error de reproducción: ${err.message}`);
          setError(`No se pudo reproducir (${err.message})`);
        });
    }
  };

  // Si el componente aún no está montado, mostrar un mensaje simple
  if (!componentMounted) {
    return (
      <div style={{
        position: 'fixed',
        bottom: '20px',
        right: '20px',
        backgroundColor: 'rgba(0,0,0,0.7)',
        color: 'white',
        padding: '10px',
        borderRadius: '5px',
        zIndex: 10001
      }}>
        Inicializando narrador...
      </div>
    );
  }

  return (
    <>
      {/* Botón principal con estilos en línea para evitar problemas de Tailwind */}
      <div style={{
        position: 'fixed',
        bottom: '100px',
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 10000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'column'
      }}>
        <button 
          onClick={togglePlayback}
          style={{
            width: '70px',
            height: '70px',
            borderRadius: '50%',
            backgroundColor: isPlaying ? '#F3642E' : 'rgba(0,0,0,0.7)',
            color: isPlaying ? 'white' : '#F3642E',
            border: '4px solid #F3642E',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            boxShadow: '0 0 15px rgba(243, 100, 46, 0.7)'
          }}
        >
          {isLoading ? (
            <div style={{ 
              animation: 'spin 1s linear infinite',
              transformOrigin: 'center',
              display: 'flex'
            }}>
              <Loader2 size={36} />
            </div>
          ) : error ? (
            <AlertCircle size={36} />
          ) : isPlaying ? (
            <Pause size={36} />
          ) : (
            <Play size={36} />
          )}
        </button>
        
        {/* Mensaje de error */}
        {error && (
          <div style={{
            backgroundColor: 'rgba(239, 68, 68, 0.9)',
            color: 'white',
            padding: '8px 12px',
            borderRadius: '8px',
            marginTop: '12px',
            fontSize: '14px',
            textAlign: 'center',
            maxWidth: '250px',
            boxShadow: '0 4px 8px rgba(0,0,0,0.2)'
          }}>
            {error}
            <button
              onClick={togglePlayback}
              style={{
                backgroundColor: 'rgba(255,255,255,0.2)',
                border: 'none',
                borderRadius: '4px',
                padding: '4px 8px',
                fontSize: '12px',
                color: 'white',
                marginTop: '8px',
                width: '100%',
                cursor: 'pointer'
              }}
            >
              Reintentar
            </button>
          </div>
        )}
      </div>
      
      {/* Panel de depuración con logs completos */}
      <div style={{
        position: 'fixed',
        bottom: '0',
        left: '0',
        backgroundColor: 'rgba(0,0,0,0.9)',
        color: 'white',
        padding: '12px',
        fontSize: '12px',
        zIndex: 10001,
        width: '50%',
        maxHeight: '200px',
        overflowY: 'auto',
        borderTop: '1px solid #333',
        borderRight: '1px solid #333'
      }}>
        <div style={{ fontWeight: 'bold', marginBottom: '4px' }}>
          Depuración Narrador ({debugLogs.length} eventos)
        </div>
        <div>Estado: {isPlaying ? 'Reproduciendo' : isLoading ? 'Cargando' : error ? 'Error' : 'Listo'}</div>
        <div>Audio URL: {AUDIO_URL}</div>
        <div>Último evento: {debugInfo}</div>
        
        <div style={{ 
          marginTop: '8px', 
          borderTop: '1px solid #444', 
          paddingTop: '4px',
          fontSize: '11px',
          opacity: 0.8,
          maxHeight: '100px',
          overflowY: 'auto'
        }}>
          {debugLogs.map((log, i) => (
            <div key={i} style={{ marginBottom: '2px' }}>{log}</div>
          ))}
        </div>
        
        <div style={{
          marginTop: '8px',
          display: 'flex',
          gap: '4px'
        }}>
          <button
            onClick={() => {
              if (audioRef.current) {
                audioRef.current.pause();
                audioRef.current = null;
              }
              const newAudio = new Audio(AUDIO_URL);
              audioRef.current = newAudio;
              setIsLoading(true);
              addLog('Recargando audio manualmente');
              newAudio.load();
            }}
            style={{
              backgroundColor: '#F3642E',
              border: 'none',
              borderRadius: '4px',
              padding: '4px 8px',
              fontSize: '11px',
              color: 'white',
              cursor: 'pointer',
              flex: 1
            }}
          >
            Recargar Audio
          </button>
          
          <button
            onClick={() => {
              setDebugLogs([]);
              addLog('Logs limpiados');
            }}
            style={{
              backgroundColor: '#333',
              border: 'none',
              borderRadius: '4px',
              padding: '4px 8px',
              fontSize: '11px',
              color: 'white',
              cursor: 'pointer'
            }}
          >
            Limpiar
          </button>
        </div>
      </div>
      
      {/* Estilos para animaciones */}
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}} />
    </>
  );
} 