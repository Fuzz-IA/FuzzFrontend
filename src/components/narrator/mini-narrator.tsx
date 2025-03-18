'use client';

import { useState, useEffect, useRef } from 'react';
import { Play, Pause, Square, Volume2, VolumeX, Loader2, AlertCircle } from 'lucide-react';

// URLs para probar diferentes configuraciones
const URLS = {
  ABSOLUTE: 'https://www.fuzzai.fun/narrator-audio/1742269796903-82ba3372-8796-4a55-bb80-08208327d202.mp3',
  RELATIVE: '/narrator-audio/1742269796903-82ba3372-8796-4a55-bb80-08208327d202.mp3',
  TEST: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3'
};

// Opciones de velocidad de reproducción
const SPEEDS = [1, 1.5, 2];

// Versión mejorada con controles adicionales
export function MiniNarrator() {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [playbackRate, setPlaybackRate] = useState<number>(1);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [componentMounted, setComponentMounted] = useState(false);
  const [activeUrl, setActiveUrl] = useState<string>(URLS.RELATIVE);
  const [showSpeedControls, setShowSpeedControls] = useState(false);

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
      audio.playbackRate = playbackRate;
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

  // Aplicar cambios en la velocidad de reproducción
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.playbackRate = playbackRate;
    }
  }, [playbackRate]);

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
      audioRef.current.currentTime = audioRef.current.currentTime || 0;
      
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

  // Función para detener la reproducción
  const stopPlayback = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      setIsPlaying(false);
    }
  };

  // Función para silenciar/activar sonido
  const toggleMute = () => {
    if (audioRef.current) {
      audioRef.current.muted = !isMuted;
      setIsMuted(!isMuted);
    }
  };

  // Función para cambiar la velocidad de reproducción
  const changePlaybackRate = (speed: number) => {
    setPlaybackRate(speed);
    if (audioRef.current) {
      audioRef.current.playbackRate = speed;
    }
  };

  // Función para mostrar/ocultar controles de velocidad
  const toggleSpeedControls = () => {
    setShowSpeedControls(!showSpeedControls);
  };

  if (!componentMounted) {
    return null;
  }

  return (
    <>
      {/* Control de narrador tipo píldora mejorado */}
      <div style={{
        position: 'fixed',
        bottom: '100px',
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 10000,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
      }}>
        <div style={{
          backgroundColor: '#F3642E',
          borderRadius: '30px',
          padding: '8px 16px',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          boxShadow: '0 4px 12px rgba(0,0,0,0.25)',
          transition: 'all 0.3s ease',
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
              opacity: error ? 0.7 : 1,
              borderRadius: '50%',
              padding: '6px',
            }}
            aria-label={isPlaying ? "Pausar narración" : "Reproducir narración"}
          >
            {isLoading ? (
              <div style={{ 
                animation: 'spin 1s linear infinite',
                transformOrigin: 'center',
                display: 'flex'
              }}>
                <Loader2 size={22} />
              </div>
            ) : error ? (
              <AlertCircle size={22} />
            ) : isPlaying ? (
              <Pause size={22} />
            ) : (
              <Play size={22} />
            )}
          </button>

          {/* Botón de Stop */}
          <button 
            onClick={stopPlayback}
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
              opacity: !isPlaying && !isLoading ? 0.5 : 1,
              borderRadius: '50%',
              padding: '6px',
            }}
            aria-label="Detener narración"
            disabled={!isPlaying && !isLoading}
          >
            <Square size={18} />
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
              opacity: error ? 0.7 : 1,
              borderRadius: '50%',
              padding: '6px',
            }}
            aria-label={isMuted ? "Activar sonido" : "Silenciar"}
          >
            {isMuted ? <VolumeX size={22} /> : <Volume2 size={22} />}
          </button>

          {/* Botón para mostrar velocidad actual / abrir selector */}
          <button
            onClick={toggleSpeedControls}
            style={{
              backgroundColor: 'rgba(255,255,255,0.2)',
              border: 'none',
              color: 'white',
              borderRadius: '15px',
              padding: '2px 10px',
              fontSize: '12px',
              fontWeight: 'bold',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              minWidth: '40px',
              textAlign: 'center',
            }}
            aria-label="Cambiar velocidad"
          >
            {playbackRate === 1 ? '1x' : playbackRate === 1.5 ? '1.5x' : '2x'}
          </button>
        </div>

        {/* Controles de velocidad (desplegable) */}
        {showSpeedControls && (
          <div style={{
            position: 'absolute',
            top: '100%',
            marginTop: '8px',
            backgroundColor: 'rgba(0,0,0,0.85)',
            borderRadius: '12px',
            padding: '6px',
            display: 'flex',
            gap: '4px',
            boxShadow: '0 4px 10px rgba(0,0,0,0.3)',
            backdropFilter: 'blur(5px)',
            border: '1px solid rgba(255,255,255,0.1)',
          }}>
            {SPEEDS.map(speed => (
              <button
                key={speed}
                onClick={() => {
                  changePlaybackRate(speed);
                  setShowSpeedControls(false);
                }}
                style={{
                  backgroundColor: playbackRate === speed ? '#F3642E' : 'rgba(255,255,255,0.1)',
                  border: 'none',
                  color: 'white',
                  borderRadius: '12px',
                  padding: '6px 12px',
                  fontSize: '12px',
                  fontWeight: 'bold',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                }}
              >
                {speed === 1 ? '1x' : speed === 1.5 ? '1.5x' : '2x'}
              </button>
            ))}
          </div>
        )}
        
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