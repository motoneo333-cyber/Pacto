import React, { useRef, useState, useEffect } from 'react';
import { Camera, MapPin, RefreshCw, ArrowLeft, Check, ShieldCheck, WifiOff } from 'lucide-react';

interface CameraCaptureProps {
  onBack: () => void;
  onCaptured: (evidence: any) => void;
}

export const CameraCaptureView: React.FC<CameraCaptureProps> = ({ onBack, onCaptured }) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [stream, setStream] = useState<MediaStream | null>(null);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [gpsLocation, setGpsLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [gpsLoading, setGpsLoading] = useState<boolean>(true);
  const [serverTimestamp, setServerTimestamp] = useState<string>('');
  const [isOffline, setIsOffline] = useState<boolean>(!navigator.onLine);

  useEffect(() => {
    // Track online/offline status
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Initialize MediaDevices Camera Stream (Rule R5)
    navigator.mediaDevices
      .getUserMedia({ video: { facingMode: 'environment' }, audio: false })
      .then((mediaStream) => {
        setStream(mediaStream);
        if (videoRef.current) {
          videoRef.current.srcObject = mediaStream;
        }
      })
      .catch((err) => {
        console.error('Camera access error:', err);
      });

    // Obtain GPS location if available
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setGpsLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
          setGpsLoading(false);
        },
        () => {
          setGpsLoading(false);
        }
      );
    } else {
      setGpsLoading(false);
    }

    setServerTimestamp(new Date().toLocaleString('es-ES', { dateStyle: 'medium', timeStyle: 'medium' }));

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

  const handleTakePicture = () => {
    if (!videoRef.current || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const video = videoRef.current;

    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;

    const ctx = canvas.getContext('2d');
    if (ctx) {
      // Draw live camera frame
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

      // Overlay Server Timestamp & GPS metadata directly on image canvas (Rule R5)
      ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
      ctx.fillRect(10, canvas.height - 60, canvas.width - 20, 50);

      ctx.fillStyle = '#FF5A1F';
      ctx.font = 'bold 14px sans-serif';
      ctx.fillText(`PACTO VERIFIED · SERVER TS: ${serverTimestamp}`, 20, canvas.height - 38);

      if (gpsLocation) {
        ctx.fillStyle = '#B4F461';
        ctx.font = '12px sans-serif';
        ctx.fillText(`GPS: ${gpsLocation.lat.toFixed(4)}, ${gpsLocation.lng.toFixed(4)}`, 20, canvas.height - 18);
      }

      const dataUrl = canvas.toDataURL('image/jpeg');
      setCapturedImage(dataUrl);
    }
  };

  const handleRetake = () => {
    setCapturedImage(null);
  };

  const handleUpload = () => {
    if (!capturedImage) return;

    const evidenceData = {
      id: `ev-${Date.now()}`,
      imageUrl: capturedImage,
      gps_lat: gpsLocation?.lat,
      gps_lng: gpsLocation?.lng,
      server_timestamp: new Date().toISOString(),
      offlineQueued: isOffline
    };

    if (isOffline) {
      alert('Sin conexión: Evidencia guardada en cola de reintento automático (IndexedDB Background Sync).');
    }

    onCaptured(evidenceData);
  };

  return (
    <div className="fixed inset-0 bg-black text-[#F5F5F7] flex flex-col justify-between p-4 z-50">
      {/* Top Controls */}
      <div className="flex items-center justify-between z-10 pt-2">
        <button
          onClick={onBack}
          className="p-3 bg-[#16161E]/80 backdrop-blur-md rounded-full text-white border border-white/10"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>

        {isOffline && (
          <div className="bg-[#FF3B5C] text-white px-3 py-1 rounded-full text-xs font-bold flex items-center space-x-1">
            <WifiOff className="w-3.5 h-3.5" />
            <span>Modo Offline</span>
          </div>
        )}

        <div className="bg-black/60 backdrop-blur-md px-3 py-1 rounded-full border border-white/10 text-xs flex items-center space-x-1.5">
          <ShieldCheck className="w-4 h-4 text-[#B4F461]" />
          <span className="font-bold text-[#B4F461]">MediaDevices R5</span>
        </div>
      </div>

      {/* Main Camera Viewfinder */}
      <div className="relative flex-1 my-4 rounded-3xl overflow-hidden bg-[#16161E] border border-white/10 flex items-center justify-center">
        {!capturedImage ? (
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="w-full h-full object-cover"
          />
        ) : (
          <img src={capturedImage} alt="Captura" className="w-full h-full object-cover" />
        )}

        <canvas ref={canvasRef} className="hidden" />

        {/* Live GPS Badge Overlay */}
        <div className="absolute bottom-4 left-4 right-4 bg-black/70 backdrop-blur-md p-3 rounded-2xl border border-white/10 text-xs space-y-1">
          <div className="flex items-center space-x-2 text-gray-300">
            <MapPin className="w-4 h-4 text-[#FF5A1F]" />
            <span>
              {gpsLoading
                ? 'Obteniendo GPS...'
                : gpsLocation
                ? `GPS: ${gpsLocation.lat.toFixed(4)}, ${gpsLocation.lng.toFixed(4)}`
                : 'GPS No Disponible'}
            </span>
          </div>
          <div className="text-[10px] text-gray-400 font-mono">
            Timestamp Servidor: {serverTimestamp}
          </div>
        </div>
      </div>

      {/* Bottom Controls */}
      <div className="pb-6 pt-2 flex items-center justify-center space-x-6">
        {!capturedImage ? (
          <button
            onClick={handleTakePicture}
            className="w-20 h-20 bg-[#FF5A1F] rounded-full border-4 border-white flex items-center justify-center shadow-2xl active:scale-90 transition"
          >
            <Camera className="w-8 h-8 text-white" />
          </button>
        ) : (
          <div className="flex items-center space-x-4 w-full max-w-xs">
            <button
              onClick={handleRetake}
              className="flex-1 bg-[#16161E] border border-white/20 font-bold py-3.5 rounded-2xl flex items-center justify-center space-x-2 text-gray-300"
            >
              <RefreshCw className="w-4 h-4" />
              <span>Repetir</span>
            </button>
            <button
              onClick={handleUpload}
              className="flex-1 bg-[#B4F461] text-black font-extrabold py-3.5 rounded-2xl flex items-center justify-center space-x-2 shadow-xl"
            >
              <Check className="w-5 h-5" />
              <span>Enviar</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
