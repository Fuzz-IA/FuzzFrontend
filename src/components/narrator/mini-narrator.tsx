'use client';

import { useState, useEffect, useRef } from 'react';
import { Play, Pause, AlertCircle, Loader2 } from 'lucide-react';

// Constante para url directa en producción
const AUDIO_URL = 'https://www.fuzzai.fun/narrator-audio/1742263051807-2b448ea0-a009-45cb-965f-c20074e95788.mp3';

export function MiniNarrator() {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [debugInfo, setDebugInfo] = useState<string>('Inicializando...');

  // Inicializar el audio una sola vez
  useEffect(() => {
    // Crear el elemento de audio
    try {
      setDebugInfo('Creando elemento de audio...');
      const audio = new Audio(AUDIO_URL);
      
      // Configurar eventos
      audio.addEventListener('canplaythrough', () => {
        setIsLoading(false);
        setDebugInfo('Audio listo para reproducir');
      });
      
      audio.addEventListener('error', (e) => {
        const errorCode = audio.error ? audio.error.code : 'desconocido';
        console.error('Error en audio:', errorCode);
        setError(`Error al cargar audio (${errorCode}). Haz clic para reintentar.`);
        setIsLoading(false);
        setDebugInfo(`Error de carga: ${errorCode}`);
      });
      
      audio.addEventListener('ended', () => {
        setIsPlaying(false);
        setDebugInfo('Reproducción finalizada');
      });
      
      // Almacenar la referencia
      audioRef.current = audio;
      setDebugInfo('Audio inicializado con URL: ' + AUDIO_URL);
      
      // Precargar
      setIsLoading(true);
      audio.load();
    } catch (err) {
      console.error('Error al crear audio:', err);
      setError('Error al inicializar audio. Haz clic para reintentar.');
      setDebugInfo(`Error de inicialización: ${err}`);
    }
    
    // Limpieza
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

  // Función para alternar reproducción
  const togglePlayback = () => {
    if (error) {
      // Si hay error, reintentar cargando el audio
      setError(null);
      setIsLoading(true);
      setDebugInfo('Reintentando carga...');
      
      if (audioRef.current) {
        audioRef.current.load();
      } else {
        const audio = new Audio(AUDIO_URL);
        audioRef.current = audio;
        audio.load();
      }
      return;
    }
    
    if (!audioRef.current) {
      setDebugInfo('No hay elemento de audio');
      return;
    }
    
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
      setDebugInfo('Audio pausado');
    } else {
      audioRef.current.play()
        .then(() => {
          setIsPlaying(true);
          setDebugInfo('Audio reproduciéndose');
        })
        .catch(err => {
          setError(`No se pudo reproducir (${err.message})`);
          setDebugInfo(`Error de reproducción: ${err.message}`);
        });
    }
  };

  return (
    <>
      {/* Botón principal con estilos en línea para evitar problemas de Tailwind */}
      <div style={{
        position: 'fixed',
        bottom: '80px',
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
            width: '60px',
            height: '60px',
            borderRadius: '50%',
            backgroundColor: isPlaying ? '#F3642E' : 'rgba(0,0,0,0.7)',
            color: isPlaying ? 'white' : '#F3642E',
            border: '3px solid #F3642E',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            boxShadow: '0 0 15px rgba(243, 100, 46, 0.5)'
          }}
        >
          {isLoading ? (
            <div style={{ 
              animation: 'spin 1s linear infinite',
              transformOrigin: 'center',
              display: 'flex'
            }}>
              <Loader2 size={32} />
            </div>
          ) : error ? (
            <AlertCircle size={32} />
          ) : isPlaying ? (
            <Pause size={32} />
          ) : (
            <Play size={32} />
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
            fontSize: '12px',
            textAlign: 'center',
            maxWidth: '200px'
          }}>
            {error}
          </div>
        )}
      </div>
      
      {/* Panel de depuración */}
      <div style={{
        position: 'fixed',
        bottom: '0',
        left: '0',
        backgroundColor: 'rgba(0,0,0,0.8)',
        color: 'white',
        padding: '8px',
        fontSize: '12px',
        zIndex: 10001,
        maxWidth: '100%'
      }}>
        <div>Estado: {isPlaying ? 'Reproduciendo' : isLoading ? 'Cargando' : error ? 'Error' : 'Listo'}</div>
        <div>Debug: {debugInfo}</div>
        <div>URL: {AUDIO_URL}</div>
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