'use client';

import { useState, useEffect, useRef } from 'react';
import { Play, Pause, AlertCircle, Loader2, Music, Volume2, Radio } from 'lucide-react';

// URLs para probar diferentes configuraciones
const URLS = {
  ABSOLUTE: 'https://www.fuzzai.fun/narrator-audio/1742269796903-82ba3372-8796-4a55-bb80-08208327d202.mp3',
  RELATIVE: '/narrator-audio/1742269796903-82ba3372-8796-4a55-bb80-08208327d202.mp3',
  
  // Una URL de prueba de audio público que sabemos que funciona para validar la reproducción
  TEST: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3'
};

// Versión para debugging
export function MiniNarrator() {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [debugInfo, setDebugInfo] = useState<string>('Inicializando...');
  const [componentMounted, setComponentMounted] = useState(false);
  const [debugLogs, setDebugLogs] = useState<string[]>([]);
  const [activeUrl, setActiveUrl] = useState<string>(URLS.RELATIVE);
  const [showDirectPlayer, setShowDirectPlayer] = useState(true);
  const [showNotice, setShowNotice] = useState(false);

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

      // Prueba de fetch directo para ver si podemos acceder al archivo
      fetch(URLS.ABSOLUTE, { method: 'HEAD' })
        .then(response => {
          addLog(`Fetch HEAD a URL absoluta: ${response.status} ${response.statusText}`);
        })
        .catch(err => {
          addLog(`Error en fetch HEAD: ${err.message}`);
        });
    } catch (e) {
      addLog(`Error obteniendo info del navegador: ${e}`);
    }
    
    // Esto se ejecutará cuando el componente se desmonte
    return () => {
      addLog('Componente desmontado.');
    };
  }, []);

  // Cambiar la URL activa y reiniciar el audio
  const changeAudioSource = (url: string) => {
    addLog(`Cambiando URL de audio a: ${url}`);
    setActiveUrl(url);
    
    // Limpiar el audio anterior si existe
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    
    // Reset states
    setIsPlaying(false);
    setIsLoading(true);
    setError(null);
    
    // Crear nuevo audio con la URL seleccionada
    try {
      const audio = new Audio();
      
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
        
        // Si falla la URL relativa, intentar con la URL absoluta si estábamos usando la relativa
        if (url === URLS.RELATIVE && url !== URLS.ABSOLUTE) {
          addLog('Intentando con URL absoluta como fallback');
          changeAudioSource(URLS.ABSOLUTE);
          return;
        }
        
        // Si falla la URL absoluta, intentar con la URL de prueba como último recurso
        if (url === URLS.ABSOLUTE && url !== URLS.TEST) {
          addLog('Intentando con URL de prueba como último recurso');
          changeAudioSource(URLS.TEST);
          return;
        }
        
        setError(`Error al cargar (${errorDetail}). Haz clic para reintentar.`);
        setIsLoading(false);
      });
      
      audio.addEventListener('ended', () => {
        setIsPlaying(false);
        addLog('Reproducción finalizada');
      });
      
      // Mostrar la URL completa en el log para depuración
      const fullUrl = url.startsWith('http') ? url : `${window.location.origin}${url}`;
      addLog(`URL completa: ${fullUrl}`);
      
      // Asignar la URL
      audio.src = url;
      
      // Almacenar la referencia
      audioRef.current = audio;
      
      // Precargar
      audio.load();
    } catch (err) {
      console.error('Error al crear audio:', err);
      addLog(`Error al inicializar audio: ${err}`);
      setError(`Error al inicializar audio: ${err}`);
      setIsLoading(false);
    }
  };

  // Inicializar el audio cuando el componente se monta
  useEffect(() => {
    if (!componentMounted) return;
    
    changeAudioSource(activeUrl);
    
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
      changeAudioSource(activeUrl);
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

  // Mostrar u ocultar el reproductor directo
  const toggleDirectPlayer = () => {
    setShowDirectPlayer(!showDirectPlayer);
    addLog(`Reproductor directo ${!showDirectPlayer ? 'activado' : 'desactivado'}`);
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
        {/* Aviso sobre el problema 404 */}
        {showNotice && (
          <div style={{
            backgroundColor: 'rgba(59, 130, 246, 0.9)',
            color: 'white',
            padding: '12px 16px',
            borderRadius: '8px',
            marginBottom: '16px',
            fontSize: '14px',
            textAlign: 'left',
            maxWidth: '350px',
            boxShadow: '0 4px 8px rgba(0,0,0,0.2)'
          }}>
            <div style={{ fontWeight: 'bold', marginBottom: '8px', display: 'flex', justifyContent: 'space-between' }}>
              <span>⚠️ Archivo de audio no encontrado (404)</span>
              <button 
                onClick={() => setShowNotice(false)}
                style={{ 
                  background: 'none', 
                  border: 'none', 
                  color: 'white', 
                  fontSize: '16px',
                  cursor: 'pointer' 
                }}
              >
                ×
              </button>
            </div>
            <p style={{ marginBottom: '8px' }}>
              El archivo de audio original no se encuentra en la ruta especificada. Estamos usando un audio de prueba mientras tanto.
            </p>
            <p style={{ fontSize: '12px', opacity: 0.8 }}>
              Solución: Coloca tu archivo MP3 en la carpeta <code style={{ background: 'rgba(0,0,0,0.2)', padding: '2px 4px', borderRadius: '4px' }}>public/narrator-audio/</code> de tu proyecto y despliega nuevamente.
            </p>
          </div>
        )}

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
        
        {/* Botón para mostrar reproductor directo */}
        <button
          onClick={toggleDirectPlayer}
          style={{
            backgroundColor: showDirectPlayer ? '#F3642E' : 'rgba(0,0,0,0.7)',
            color: showDirectPlayer ? 'white' : '#F3642E',
            border: '2px solid #F3642E',
            borderRadius: '20px',
            padding: '4px 12px',
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            marginTop: '8px',
            fontSize: '12px',
            cursor: 'pointer'
          }}
        >
          <Radio size={16} />
          <span>Reproductor HTML</span>
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
        
        {/* Reproductor HTML directo (alternativa) */}
        {showDirectPlayer && (
          <div style={{
            backgroundColor: 'rgba(0,0,0,0.8)',
            padding: '16px',
            borderRadius: '8px',
            marginTop: '16px',
            width: '300px',
            boxShadow: '0 4px 15px rgba(0,0,0,0.3)',
            border: '1px solid #444'
          }}>
            <div style={{
              fontSize: '14px',
              fontWeight: 'bold',
              marginBottom: '12px',
              color: 'white',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}>
              <Music size={18} />
              <span>Reproductor HTML Directo</span>
            </div>
            
            <audio 
              controls 
              style={{ width: '100%' }}
              crossOrigin="anonymous"
              src={activeUrl}
            >
              Tu navegador no soporta el elemento audio.
            </audio>
            
            <div style={{
              marginTop: '12px',
              display: 'flex',
              flexDirection: 'column',
              gap: '8px'
            }}>
              {Object.entries(URLS).map(([key, url]) => (
                <button
                  key={key}
                  onClick={() => changeAudioSource(url)}
                  style={{
                    backgroundColor: activeUrl === url ? '#F3642E' : 'rgba(60,60,60,0.8)',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    padding: '6px 8px',
                    fontSize: '12px',
                    cursor: 'pointer',
                    textAlign: 'left',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}
                >
                  <Volume2 size={14} />
                  <span>{key}: {url.substring(0, 20)}...</span>
                </button>
              ))}
            </div>
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
        width: '60%',
        maxHeight: '300px',
        overflowY: 'auto',
        borderTop: '1px solid #333',
        borderRight: '1px solid #333'
      }}>
        <div style={{ fontWeight: 'bold', marginBottom: '4px' }}>
          Depuración Narrador ({debugLogs.length} eventos)
        </div>
        <div>Estado: {isPlaying ? 'Reproduciendo' : isLoading ? 'Cargando' : error ? 'Error' : 'Listo'}</div>
        <div>URL Activa: {activeUrl}</div>
        <div>Último evento: {debugInfo}</div>
        
        <div style={{ 
          marginTop: '8px', 
          borderTop: '1px solid #444', 
          paddingTop: '4px',
          fontSize: '11px',
          opacity: 0.8,
          maxHeight: '180px',
          overflowY: 'auto'
        }}>
          {debugLogs.map((log, i) => (
            <div key={i} style={{ marginBottom: '2px', wordBreak: 'break-word' }}>{log}</div>
          ))}
        </div>
        
        <div style={{
          marginTop: '8px',
          display: 'flex',
          gap: '4px',
          flexWrap: 'wrap'
        }}>
          <button
            onClick={() => changeAudioSource(activeUrl)}
            style={{
              backgroundColor: '#F3642E',
              border: 'none',
              borderRadius: '4px',
              padding: '4px 8px',
              fontSize: '11px',
              color: 'white',
              cursor: 'pointer',
              flex: '1 0 auto'
            }}
          >
            Recargar Audio
          </button>
          
          <button
            onClick={toggleDirectPlayer}
            style={{
              backgroundColor: '#0066cc',
              border: 'none',
              borderRadius: '4px',
              padding: '4px 8px',
              fontSize: '11px',
              color: 'white',
              cursor: 'pointer',
              flex: '1 0 auto'
            }}
          >
            {showDirectPlayer ? 'Ocultar' : 'Mostrar'} Reproductor HTML
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
              cursor: 'pointer',
              flex: '0 0 auto'
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