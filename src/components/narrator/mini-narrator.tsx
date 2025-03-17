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

  // Fetch the latest audio on component mount
  useEffect(() => {
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
  
  return (
    <div 
      className="fixed bottom-16 left-1/2 transform -translate-x-1/2 z-50"
      onMouseEnter={() => showControlsWithTimeout()}
      onMouseLeave={() => !isPlaying && setShowControls(false)}
    >
      {/* Panel principal con controles flotantes */}
      <div className={`
        flex items-center gap-3 
        bg-black/50 backdrop-blur-md rounded-full px-4 py-2 
        shadow-lg border border-orange-500/20
        transition-all duration-300 ease-out
        ${showControls ? 'opacity-100 translate-y-0' : 'opacity-90 hover:opacity-100'}
      `}>
        {/* Botón principal de reproducción/pausa */}
        <Button
          onClick={togglePlayback}
          disabled={isLoading && !error}
          size="sm"
          variant={error ? "destructive" : isPlaying ? "default" : "outline"}
          className={`
            rounded-full min-w-10 h-10 p-0
            ${isPlaying ? 'bg-orange-600 hover:bg-orange-700 text-white' : 'border-orange-500 text-orange-500 hover:bg-orange-500/10'}
            transition-all duration-300
          `}
          title={error ? "Error - Haz clic para reintentar" : isLoading ? "Cargando..." : isPlaying ? "Pausar" : readyToPlay ? "Reproducir narración" : "Narrador"}
        >
          {isLoading ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : error ? (
            <AlertCircle className="h-5 w-5" />
          ) : isPlaying ? (
            <Pause className="h-5 w-5" />
          ) : (
            <Play className="h-5 w-5" />
          )}
        </Button>

        {/* Controles que se muestran siempre que haya audio */}
        {audioElement && (
          <>
            {/* Botón de detener */}
            <Button
              onClick={stopPlayback}
              variant="ghost"
              size="sm"
              className="rounded-full h-8 w-8 p-0 text-white/80 hover:text-white hover:bg-black/30"
              title="Detener"
            >
              <Square className="h-4 w-4" />
            </Button>

            {/* Control de velocidad compacto */}
            <div className="flex items-center bg-black/30 rounded-full px-2">
              <Button
                onClick={() => setPlaybackRate(1)}
                variant={playbackRate === 1 ? "default" : "ghost"}
                size="sm"
                className={`h-6 px-1 text-xs rounded-full ${playbackRate === 1 ? 'bg-orange-600 text-white' : 'text-white/70'}`}
              >
                1x
              </Button>
              <Button
                onClick={() => setPlaybackRate(1.5)}
                variant={playbackRate === 1.5 ? "default" : "ghost"}
                size="sm"
                className={`h-6 px-1 text-xs rounded-full ${playbackRate === 1.5 ? 'bg-orange-600 text-white' : 'text-white/70'}`}
              >
                1.5x
              </Button>
              <Button
                onClick={() => setPlaybackRate(2)}
                variant={playbackRate === 2 ? "default" : "ghost"}
                size="sm" 
                className={`h-6 px-1 text-xs rounded-full ${playbackRate === 2 ? 'bg-orange-600 text-white' : 'text-white/70'}`}
              >
                2x
              </Button>
            </div>

            {/* Control de volumen */}
            <div className="flex items-center gap-1 bg-black/30 rounded-full px-2 py-1">
              <Button
                onClick={() => volume > 0 ? setVolume(0) : setVolume(70)}
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0 text-white/80 hover:text-white"
                title={volume === 0 ? "Activar sonido" : "Silenciar"}
              >
                {volume === 0 ? (
                  <VolumeX className="h-3 w-3" />
                ) : volume < 50 ? (
                  <Volume1 className="h-3 w-3" />
                ) : (
                  <Volume2 className="h-3 w-3" />
                )}
              </Button>
              
              <div className="w-16">
                <Slider
                  value={[volume]}
                  min={0}
                  max={100}
                  step={1}
                  onValueChange={(value) => setVolume(value[0])}
                  className="h-2"
                  aria-label="Volumen"
                />
              </div>
            </div>
          </>
        )}
      </div>

      {/* Notificación de audio nuevo cuando está listo */}
      {/* {readyToPlay && !isPlaying && !isLoading && !error && !showControls && (
        <div className="absolute left-1/2 transform -translate-x-1/2 -translate-y-16 flex flex-col items-center">
          <div className="bg-gradient-to-r from-orange-600 to-orange-500 text-white p-2 px-4 text-xs rounded-full shadow-lg mb-2 whitespace-nowrap">
            ¡Nuevo resumen disponible! Haz clic para escuchar
          </div>
          <div className="w-0 h-0 border-l-8 border-r-8 border-t-8 border-t-orange-500 border-l-transparent border-r-transparent"></div>
        </div>
      )} */}
      
      {/* Status message when loading */}
      {isLoading && (
        <div className="absolute left-1/2 transform -translate-x-1/2 -translate-y-12 
                        bg-black/70 text-white px-4 py-1 rounded-full 
                        flex items-center gap-2 shadow-lg">
          <Loader2 className="h-3 w-3 animate-spin" />
          <span className="text-xs">Cargando narrador...</span>
        </div>
      )}
      
      {/* Error tooltip */}
      {error && (
        <div className="absolute left-1/2 transform -translate-x-1/2 -translate-y-20 
                        bg-red-600/90 text-white p-3 text-xs rounded-lg shadow-lg 
                        max-w-[250px] text-center">
          {error}
          {!error.includes('configurar la API key') && (
            <Button 
              size="sm" 
              variant="outline"
              className="mt-2 h-7 text-xs w-full border-white/30 hover:bg-white/20"
              onClick={() => {
                setError(null);
                fetchLatestAudio();
              }}
            >
              Reintentar
            </Button>
          )}
          <div className="w-0 h-0 border-l-8 border-r-8 border-t-8 border-t-red-600/90 border-l-transparent border-r-transparent absolute -bottom-2 left-1/2 transform -translate-x-1/2"></div>
        </div>
      )}
    </div>
  );
} 