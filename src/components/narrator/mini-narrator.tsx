'use client';

import { useState, useEffect, useRef } from 'react';
import { Play, Pause, Volume2, VolumeX, Loader2, AlertCircle } from 'lucide-react';

// URLs para probar diferentes configuraciones
const URLS = {
  ABSOLUTE: 'https://www.fuzzai.fun/narrator-audio/1742269796903-82ba3372-8796-4a55-bb80-08208327d202.mp3',
  RELATIVE: '/narrator-audio/1742269796903-82ba3372-8796-4a55-bb80-08208327d202.mp3',
  TEST: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3'
};

// Versión minimalista tipo pill
export function MiniNarrator() {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [componentMounted, setComponentMounted] = useState(false);
  const [activeUrl, setActiveUrl] = useState<string>(URLS.RELATIVE);

  // Inicializar el componente
  useEffect(() => {
    setComponentMounted(true);
    
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
      }
    };
  }, []);

  // Cambiar la URL activa y reiniciar el audio
  const changeAudioSource = (url: string) => {
    console.log(`[Narrator] Cambiando URL de audio a: ${url}`);
    setActiveUrl(url);
    
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    
    setIsPlaying(false);
    setIsLoading(true);
    setError(null);
    
    try {
      const audio = new Audio();
      
      audio.addEventListener('canplaythrough', () => {
        setIsLoading(false);
      });
      
      audio.addEventListener('error', (e) => {
        console.error('Error en audio:', e);
        
        if (url === URLS.RELATIVE && url !== URLS.ABSOLUTE) {
          changeAudioSource(URLS.ABSOLUTE);
          return;
        }
        
        if (url === URLS.ABSOLUTE && url !== URLS.TEST) {
          changeAudioSource(URLS.TEST);
          return;
        }
        
        setError(`Error al cargar audio.`);
        setIsLoading(false);
      });
      
      audio.addEventListener('ended', () => {
        setIsPlaying(false);
      });
      
      audio.src = url;
      audio.muted = isMuted;
      audioRef.current = audio;
      audio.load();
    } catch (err) {
      console.error('Error al crear audio:', err);
      setError(`Error al inicializar audio.`);
      setIsLoading(false);
    }
  };

  // Inicializar el audio cuando el componente se monta
  useEffect(() => {
    if (!componentMounted) return;
    changeAudioSource(activeUrl);
    
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, [componentMounted]);

  // Función para alternar reproducción
  const togglePlayback = () => {
    if (error) {
      setError(null);
      setIsLoading(true);
      changeAudioSource(activeUrl);
      return;
    }
    
    if (!audioRef.current) {
      setError('Audio no disponible.');
      return;
    }
    
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.load();
      
      audioRef.current.play()
        .then(() => {
          setIsPlaying(true);
        })
        .catch(err => {
          console.error(`Error de reproducción: ${err.message}`);
          setError(`No se pudo reproducir el audio.`);
        });
    }
  };

  // Función para silenciar/activar sonido
  const toggleMute = () => {
    if (audioRef.current) {
      audioRef.current.muted = !isMuted;
      setIsMuted(!isMuted);
    }
  };

  if (!componentMounted) {
    return null;
  }

  return (
    <>
      {/* Control de narrador tipo píldora */}
      <div style={{
        position: 'fixed',
        bottom: '100px',
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 10000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}>
        <div style={{
          backgroundColor: '#F3642E',
          borderRadius: '30px',
          padding: '8px 20px',
          display: 'flex',
          alignItems: 'center',
          gap: '20px',
          boxShadow: '0 4px 10px rgba(0,0,0,0.3)',
        }}>
          {/* Botón Play/Pause */}
          <button 
            onClick={togglePlayback}
            style={{
              backgroundColor: 'transparent',
              border: 'none',
              color: 'white',
              width: '36px',
              height: '36px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              opacity: error ? 0.7 : 1
            }}
            aria-label={isPlaying ? "Pausar narración" : "Reproducir narración"}
          >
            {isLoading ? (
              <div style={{ 
                animation: 'spin 1s linear infinite',
                transformOrigin: 'center',
                display: 'flex'
              }}>
                <Loader2 size={24} />
              </div>
            ) : error ? (
              <AlertCircle size={24} />
            ) : isPlaying ? (
              <Pause size={24} />
            ) : (
              <Play size={24} />
            )}
          </button>

          {/* Botón para silenciar */}
          <button
            onClick={toggleMute}
            style={{
              backgroundColor: 'transparent',
              border: 'none',
              color: 'white',
              width: '36px',
              height: '36px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              opacity: error ? 0.7 : 1
            }}
            aria-label={isMuted ? "Activar sonido" : "Silenciar"}
          >
            {isMuted ? <VolumeX size={24} /> : <Volume2 size={24} />}
          </button>
        </div>
        
        {/* Mensaje de error - se muestra solo cuando hay error */}
        {error && (
          <div style={{
            position: 'absolute',
            top: '100%',
            left: '50%',
            transform: 'translateX(-50%)',
            backgroundColor: 'rgba(239, 68, 68, 0.9)',
            color: 'white',
            padding: '8px 12px',
            borderRadius: '8px',
            marginTop: '12px',
            fontSize: '14px',
            textAlign: 'center',
            width: '200px',
            boxShadow: '0 4px 8px rgba(0,0,0,0.2)'
          }}>
            {error}
            <button
              onClick={() => {
                setError(null);
                changeAudioSource(activeUrl);
              }}
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