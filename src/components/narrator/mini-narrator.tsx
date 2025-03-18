'use client';

import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Volume2, Volume1, VolumeX, Pause, Play, Square, AlertCircle, Loader2 } from 'lucide-react';
import { Slider } from '@/components/ui/slider';

export function MiniNarrator() {
  const [isLoading, setIsLoading] = useState(false);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [audioElement, setAudioElement] = useState<HTMLAudioElement | null>(null);
  const [lastFetchTimestamp, setLastFetchTimestamp] = useState<number>(0);
  const [playbackRate, setPlaybackRate] = useState<number>(1);
  const [error, setError] = useState<string | null>(null);
  const [showControls, setShowControls] = useState<boolean>(false);
  const [readyToPlay, setReadyToPlay] = useState<boolean>(false);
  const [volume, setVolume] = useState<number>(100);
  const controlsTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const audioCache = useRef<Record<string, HTMLAudioElement>>({});
  const lastUrlRef = useRef<string | null>(null);
  const [rendered, setRendered] = useState(false);
  const mountedRef = useRef(false);
  // Nuevo estado para forzar visibilidad en producción
  const [forceVisible, setForceVisible] = useState(false);

  // Fetch the latest audio on component mount
  useEffect(() => {
    // Marcar como renderizado para evitar problemas de hidratación
    setRendered(true);
    
    if (mountedRef.current) return;
    mountedRef.current = true;
    
    // Forzar visibilidad después de 2 segundos para dar tiempo a la hidratación
    setTimeout(() => {
      setForceVisible(true);
    }, 2000);
    
    fetchLatestAudio();
    
    // Auto-hide controls after 5 seconds
    const timer = setTimeout(() => {
      setShowControls(false);
    }, 5000);
    
    // Set up a periodic check for new audio (every 5 minutes)
    const intervalId = setInterval(() => {
      // Only check if the user isn't currently playing audio
      if (!isPlaying) {
        fetchLatestAudio(false); // Silent update (no loading indicator)
      }
    }, 5 * 60 * 1000);
    
    return () => {
      clearTimeout(timer);
      clearInterval(intervalId);
    };
  }, []);

  // Update playback rate when it changes
  useEffect(() => {
    if (audioElement) {
      audioElement.playbackRate = playbackRate;
    }
  }, [playbackRate, audioElement]);

  // Update volume when it changes
  useEffect(() => {
    if (audioElement) {
      audioElement.volume = volume / 100;
    }
  }, [volume, audioElement]);

  const fetchLatestAudio = async (showLoading = true) => {
    if (showLoading) {
      setIsLoading(true);
    }
    setError(null);
    
    try {
      console.log('Fetching latest audio...');
      const response = await fetch('/api/narrator-summaries');
      
      if (!response.ok) {
        throw new Error(`Error: ${response.status}`);
      }
      
      const data = await response.json();
      
      // Manejar el caso de fallback
      if (data.isFallback && data.errorMessage) {
        // Determinar el tipo de mensaje
        if (data.errorMessage.includes('API key not configured')) {
          console.warn('ElevenLabs API key not configured');
          setError('Narrador no disponible: Falta configurar la API key de ElevenLabs.');
        } else {
          setError('La función de narrador no está disponible en este momento.');
        }
        setIsLoading(false);
        return;
      }
      
      // Verificar si el audio URL es el mismo que ya tenemos
      if (data.success && data.audioUrl) {
        console.log(`Server returned audio URL: ${data.audioUrl}, is new: ${data.isNew}`);
        
        // Si es el mismo URL y ya tenemos un elemento de audio, no hacer nada
        if (data.audioUrl === lastUrlRef.current && !data.isNew && audioElement) {
          console.log('Same audio URL, reusing existing audio element');
          setIsLoading(false);
          
          // Si aún no está reproduciéndose, marcar como listo para reproducir
          if (!isPlaying) {
            setReadyToPlay(true);
          }
          return;
        }
        
        // Solo actualizar si es nuevo o no tenemos uno aún
        setAudioUrl(data.audioUrl);
        setLastFetchTimestamp(data.timestamp);
        lastUrlRef.current = data.audioUrl;
        
        // Cargar y reproducir el audio solo si es nuevo
        loadAndPlayAudio(data.audioUrl, data.isNew);
      }
    } catch (error) {
      console.error('Error fetching narrator audio:', error);
      setError('No se pudo conectar al servicio del narrador. Inténtelo de nuevo más tarde.');
    } finally {
      if (showLoading) {
        setIsLoading(false);
      }
    }
  };
  
  const loadAndPlayAudio = (url: string, isNew = false) => {
    if (!url || typeof url !== 'string' || !url.trim()) {
      setError('URL de audio inválida');
      return;
    }
    
    console.log(`Loading audio: ${url}, isNew: ${isNew}`);

    // Si el audio ya está en caché, usarlo
    if (audioCache.current[url]) {
      console.log('Using cached audio element');
      const cachedAudio = audioCache.current[url];
      
      // Limpiar el audio anterior si existe
      if (audioElement && audioElement !== cachedAudio) {
        audioElement.pause();
        setIsPlaying(false);
      }
      
      setAudioElement(cachedAudio);
      setReadyToPlay(true);
      
      // Reproducir automáticamente solo si es nuevo
      if (isNew) {
        cachedAudio.currentTime = 0;
        playAudio(cachedAudio);
      }
      return;
    }

    // Resetear el estado de reproducción
    setReadyToPlay(false);
    if (audioElement) {
      audioElement.pause();
    }
    setIsPlaying(false);

    const audio = new Audio(url);
    
    // Set playback rate and volume before playing
    audio.playbackRate = playbackRate;
    audio.volume = volume / 100;
    
    // Guardar en caché
    audioCache.current[url] = audio;
    
    // Establecer primero el elemento de audio para que esté disponible
    setAudioElement(audio);
    
    // Auto-play the audio
    audio.oncanplaythrough = () => {
      console.log('Audio can play through, attempting to play...');
      setReadyToPlay(true);
      
      // Reproducir automáticamente solo si es nuevo
      if (isNew) {
        playAudio(audio);
      }
    };
    
    audio.onended = () => {
      setIsPlaying(false);
      
      // Auto-hide controls 3 seconds after playback ends
      setTimeout(() => {
        setShowControls(false);
      }, 3000);
    };
    
    audio.onerror = (e) => {
      console.error('Audio error:', e);
      setError('Error al cargar el archivo de audio. Inténtelo de nuevo.');
      
      // Eliminar de la caché si hay error
      delete audioCache.current[url];
    };
  };
  
  const playAudio = (audio: HTMLAudioElement) => {
    audio.play()
      .then(() => {
        setIsPlaying(true);
        setShowControls(true); // Show controls while playing
      })
      .catch(err => {
        console.error('Auto-play failed:', err);
        // No configuramos un error, simplemente indicamos que está listo para reproducir manualmente
        setShowControls(true); // Mostrar controles de inmediato para que el usuario pueda reproducir
      });
  };
  
  const togglePlayback = () => {
    // If we're still loading, do nothing
    if (isLoading) return;
    
    // If we have an error and no audio, try to fetch again
    if (error && !audioElement) {
      fetchLatestAudio();
      return;
    }
    
    // If we have audio, toggle playback
    if (audioElement) {
      if (isPlaying) {
        audioElement.pause();
        setIsPlaying(false);
      } else {
        playAudio(audioElement);
      }
    }
  };
  
  const stopPlayback = () => {
    if (audioElement) {
      audioElement.pause();
      audioElement.currentTime = 0;
      setIsPlaying(false);
    }
  };

  const showControlsWithTimeout = () => {
    setShowControls(true);
    
    // Clear any existing timeout
    if (controlsTimeoutRef.current) {
      clearTimeout(controlsTimeoutRef.current);
    }
    
    // Set new timeout to hide controls after 5 seconds
    controlsTimeoutRef.current = setTimeout(() => {
      if (!isPlaying) {
        setShowControls(false);
      }
    }, 5000);
  };
  
  // Añadir pulsación visual si hay audio nuevo pero no se está reproduciendo
  useEffect(() => {
    if (readyToPlay && !isPlaying && !isLoading && !error && rendered) {
      // Crear un intervalo pulsante para llamar la atención
      const pulseInterval = setInterval(() => {
        const button = document.querySelector('.narrator-button');
        if (button) {
          button.classList.add('narrator-pulse');
          setTimeout(() => {
            button.classList.remove('narrator-pulse');
          }, 1000);
        }
      }, 3000);
      
      return () => clearInterval(pulseInterval);
    }
  }, [readyToPlay, isPlaying, isLoading, error, rendered]);
  
  // Si no está renderizado o forzado a ser visible, no mostrar nada inicialmente
  if (!rendered && !forceVisible) {
    return null;
  }
  
  return (
    <>
    {/* Estilos dinámicos para pulsación */}
    <style dangerouslySetInnerHTML={{ __html: `
      @keyframes narrator-pulse {
        0% { box-shadow: 0 0 0 0 rgba(243, 100, 46, 0.7); }
        70% { box-shadow: 0 0 0 10px rgba(243, 100, 46, 0); }
        100% { box-shadow: 0 0 0 0 rgba(243, 100, 46, 0); }
      }
      
      .narrator-pulse {
        animation: narrator-pulse 1.5s ease-out;
      }

      /* Estilos forzados para Vercel */
      .narrator-container {
        position: fixed !important;
        bottom: 80px !important;
        left: 50% !important;
        transform: translateX(-50%) !important;
        z-index: 10000 !important;
        width: auto !important;
        display: flex !important;
        flex-direction: column !important;
        align-items: center !important;
        pointer-events: auto !important;
      }

      .narrator-main-button {
        display: flex !important;
        justify-content: center !important;
        align-items: center !important;
        min-width: 48px !important;
        height: 48px !important;
        border-radius: 9999px !important;
        padding: 0 !important;
        color: #F3642E !important;
        border: 2px solid #F3642E !important;
        cursor: pointer !important;
        transition: all 300ms !important;
        outline: none !important;
        box-shadow: 0 0 10px rgba(243, 100, 46, 0.4) !important;
        position: relative !important;
        z-index: 10001 !important;
      }

      .narrator-main-button.playing {
        background-color: #F3642E !important;
        color: white !important;
      }

      .narrator-main-button.error {
        background-color: rgba(0, 0, 0, 0.8) !important;
        box-shadow: 0 0 0 2px rgba(239, 68, 68, 0.6) !important;
      }

      .narrator-main-button.idle {
        background-color: rgba(0, 0, 0, 0.7) !important;
      }
    `}} />

    <div className="narrator-container"
      style={{
        position: "fixed",
        bottom: "60px", // More visible position
        left: "50%",
        transform: "translateX(-50%)",
        zIndex: 10000, // Extremely high z-index
        width: "auto",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        pointerEvents: "auto"
      }}
      onMouseEnter={() => showControlsWithTimeout()}
      onMouseLeave={() => !isPlaying && setShowControls(false)}
    >
      {/* Panel principal con controles flotantes */}
      <div style={{
        display: "flex",
        alignItems: "center",
        gap: "12px",
        backgroundColor: "rgba(0, 0, 0, 0.7)",
        backdropFilter: "blur(8px)",
        borderRadius: "9999px",
        padding: "8px 16px",
        boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.3)",
        border: "1px solid rgba(243, 100, 46, 0.2)",
        transition: "all 300ms ease-out",
        opacity: showControls || isPlaying ? 1 : 0.98
      }}>
        {/* Botón principal de reproducción/pausa con ajustes específicos para garantizar visibilidad */}
        <button
          className={`narrator-button narrator-main-button ${isPlaying ? 'playing' : error ? 'error' : 'idle'}`}
          onClick={togglePlayback}
          disabled={isLoading && !error}
          style={{
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            minWidth: "52px", // Aún más grande
            height: "52px", // Aún más grande
            borderRadius: "9999px",
            padding: 0,
            backgroundColor: isPlaying ? "#F3642E" : error ? "rgba(0, 0, 0, 0.8)" : "rgba(0, 0, 0, 0.7)",
            color: isPlaying ? "white" : "#F3642E",
            border: "3px solid #F3642E", // Borde más grueso para mayor visibilidad
            cursor: "pointer",
            transition: "all 300ms",
            outline: "none",
            boxShadow: error ? "0 0 0 2px rgba(239, 68, 68, 0.6)" : "0 0 10px rgba(243, 100, 46, 0.6)", // Sombra más visible
            position: "relative", // Para asegurar que el z-index funcione
            zIndex: 10001 // Extremadamente alto z-index para el botón principal
          }}
          title={error ? "Error - Haz clic para reintentar" : isLoading ? "Cargando..." : isPlaying ? "Pausar" : readyToPlay ? "Reproducir narración" : "Narrador"}
        >
          {isLoading ? (
            <div style={{ animation: "spin 1s linear infinite", height: "24px", width: "24px" }}>
              <Loader2 style={{height: "24px", width: "24px"}} />
            </div>
          ) : error ? (
            <AlertCircle style={{height: "24px", width: "24px"}} />
          ) : isPlaying ? (
            <Pause style={{height: "24px", width: "24px"}} />
          ) : (
            <Play style={{height: "24px", width: "24px"}} />
          )}
          {readyToPlay && !isPlaying && !isLoading && !error && (
            <span style={{
              position: "absolute", 
              top: "-6px", 
              right: "-6px", 
              width: "12px", 
              height: "12px", 
              borderRadius: "50%", 
              backgroundColor: "#F3642E", 
              border: "2px solid #000"
            }}></span>
          )}
        </button>

        {/* Controles que se muestran siempre que haya audio */}
        {audioElement && (
          <>
            {/* Botón de detener */}
            <button
              onClick={stopPlayback}
              style={{
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                height: "32px",
                width: "32px",
                borderRadius: "9999px",
                padding: 0,
                backgroundColor: "transparent",
                color: "rgba(255, 255, 255, 0.8)",
                border: "none",
                cursor: "pointer"
              }}
              title="Detener"
            >
              <Square style={{height: "16px", width: "16px"}} />
            </button>

            {/* Control de velocidad compacto */}
            <div style={{
              display: "flex",
              alignItems: "center",
              backgroundColor: "rgba(0, 0, 0, 0.3)",
              borderRadius: "9999px",
              padding: "2px 4px"
            }}>
              <button
                onClick={() => setPlaybackRate(1)}
                style={{
                  display: "flex",
                  justifyContent: "center",
                  alignItems: "center",
                  height: "24px",
                  width: "24px",
                  borderRadius: "9999px",
                  padding: "2px",
                  backgroundColor: playbackRate === 1 ? "#F3642E" : "transparent",
                  color: playbackRate === 1 ? "white" : "rgba(255, 255, 255, 0.7)",
                  border: playbackRate === 1 ? "none" : "1px solid rgba(255, 255, 255, 0.3)",
                  cursor: "pointer"
                }}
              >
                1x
              </button>
              <button
                onClick={() => setPlaybackRate(1.5)}
                style={{
                  display: "flex",
                  justifyContent: "center",
                  alignItems: "center",
                  height: "24px",
                  width: "24px",
                  borderRadius: "9999px",
                  padding: "2px",
                  backgroundColor: playbackRate === 1.5 ? "#F3642E" : "transparent",
                  color: playbackRate === 1.5 ? "white" : "rgba(255, 255, 255, 0.7)",
                  border: playbackRate === 1.5 ? "none" : "1px solid rgba(255, 255, 255, 0.3)",
                  cursor: "pointer"
                }}
              >
                1.5x
              </button>
              <button
                onClick={() => setPlaybackRate(2)}
                style={{
                  display: "flex",
                  justifyContent: "center",
                  alignItems: "center",
                  height: "24px",
                  width: "24px",
                  borderRadius: "9999px",
                  padding: "2px",
                  backgroundColor: playbackRate === 2 ? "#F3642E" : "transparent",
                  color: playbackRate === 2 ? "white" : "rgba(255, 255, 255, 0.7)",
                  border: playbackRate === 2 ? "none" : "1px solid rgba(255, 255, 255, 0.3)",
                  cursor: "pointer"
                }}
              >
                2x
              </button>
            </div>

            {/* Control de volumen */}
            <div style={{
              display: "flex",
              alignItems: "center",
              gap: "2px",
              backgroundColor: "rgba(0, 0, 0, 0.3)",
              borderRadius: "9999px",
              padding: "2px 4px"
            }}>
              <button
                onClick={() => volume > 0 ? setVolume(0) : setVolume(70)}
                style={{
                  display: "flex",
                  justifyContent: "center",
                  alignItems: "center",
                  height: "24px",
                  width: "24px",
                  borderRadius: "9999px",
                  padding: 0,
                  backgroundColor: "transparent",
                  color: "rgba(255, 255, 255, 0.8)",
                  cursor: "pointer"
                }}
                title={volume === 0 ? "Activar sonido" : "Silenciar"}
              >
                {volume === 0 ? (
                  <VolumeX style={{height: "16px", width: "16px"}} />
                ) : volume < 50 ? (
                  <Volume1 style={{height: "16px", width: "16px"}} />
                ) : (
                  <Volume2 style={{height: "16px", width: "16px"}} />
                )}
              </button>
              
              <div style={{
                width: "64px"
              }}>
                <Slider
                  value={[volume]}
                  min={0}
                  max={100}
                  step={1}
                  onValueChange={(value) => setVolume(value[0])}
                  style={{
                    height: "4px"
                  }}
                  aria-label="Volumen"
                />
              </div>
            </div>
          </>
        )}
      </div>

      {/* Status message when loading */}
      {isLoading && (
        <div style={{
          position: "absolute",
          left: "50%",
          transform: "translateX(-50%) translateY(-40px)",
          backgroundColor: "rgba(0, 0, 0, 0.7)",
          color: "white",
          padding: "8px 16px",
          borderRadius: "8px",
          boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.1)",
          zIndex: 10000,
          display: "flex",
          alignItems: "center",
          gap: "8px"
        }}>
          <div style={{ animation: "spin 1s linear infinite", height: "20px", width: "20px" }}>
            <Loader2 style={{height: "20px", width: "20px"}} />
          </div>
          <span style={{fontSize: "12px"}}>Cargando narrador...</span>
        </div>
      )}
      
      {/* Error tooltip */}
      {error && (
        <div style={{
          position: "absolute",
          left: "50%",
          transform: "translateX(-50%) translateY(-80px)",
          backgroundColor: "rgba(239, 68, 68, 0.9)",
          color: "white",
          padding: "12px",
          fontSize: "12px",
          borderRadius: "8px",
          boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.1)",
          maxWidth: "250px",
          textAlign: "center",
          zIndex: 10000
        }}>
          {error}
          {!error.includes('configurar la API key') && (
            <button 
              style={{
                marginTop: "8px",
                height: "28px",
                fontSize: "12px",
                width: "100%",
                backgroundColor: "transparent",
                border: "1px solid rgba(255, 255, 255, 0.3)",
                borderRadius: "4px",
                color: "white",
                cursor: "pointer"
              }}
              onClick={() => {
                setError(null);
                fetchLatestAudio();
              }}
            >
              Reintentar
            </button>
          )}
          <div style={{
            width: 0,
            height: 0,
            borderLeft: "8px solid transparent",
            borderRight: "8px solid transparent",
            borderTop: "8px solid rgba(239, 68, 68, 0.9)",
            position: "absolute",
            bottom: "-8px",
            left: "50%",
            transform: "translateX(-50%)"
          }}></div>
        </div>
      )}
      
      {/* Botón de fallback independiente (siempre visible para casos críticos) */}
      <div style={{
        display: (rendered && !forceVisible && !isLoading && !error && !isPlaying) ? "block" : "none",
        position: "fixed",
        bottom: "20px",
        right: "20px",
        zIndex: 20000,
        width: "40px",
        height: "40px",
        borderRadius: "50%",
        backgroundColor: "#F3642E",
        boxShadow: "0 4px 10px rgba(0,0,0,0.3)",
        justifyContent: "center",
        alignItems: "center",
        border: "none",
        cursor: "pointer"
      }} onClick={() => fetchLatestAudio()}>
        <Volume2 style={{ width: "20px", height: "20px", color: "white" }} />
      </div>
    </div>
    
    {/* Añadir un elemento de fallback visible para debugging en producción */}
    <div style={{
      display: "none", /* Inicialmente oculto */
      position: "fixed",
      top: 0,
      right: 0,
      backgroundColor: "rgba(0,0,0,0.7)",
      color: "white",
      padding: "4px 8px",
      fontSize: "10px",
      zIndex: 100000
    }} id="narrator-debug">
      Narrador cargado
    </div>
    
    {/* Script para mostrar el elemento de debug después de cargar la página */}
    <script dangerouslySetInnerHTML={{ __html: `
      document.addEventListener('DOMContentLoaded', function() {
        const debug = document.getElementById('narrator-debug');
        if (debug) {
          debug.style.display = 'block';
          setTimeout(() => { debug.style.display = 'none'; }, 5000);
        }
      });
    `}} />
    </>
  );
} 