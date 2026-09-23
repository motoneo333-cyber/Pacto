import React, { useRef, useState, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Camera, MapPin, RefreshCw, ArrowLeft, Check, ShieldCheck, WifiOff, AlertCircle } from 'lucide-react';
import { queueOfflineEvidence, getQueuedEvidences } from '../lib/offlineQueue';
import { api } from '../lib/api';
import { useSession } from '../lib/session';
import { useToast } from '../lib/toast';
import type { Pacto } from '../types/pacto';

interface CameraCaptureProps {
  pacto: Pacto;
  /** Si se pasa, la foto es la evidencia de cumplimiento de esa sentencia en vez de una evidencia diaria. */
  sentenceId?: string;
  onBack: () => void;
  onDone: () => void;
}

export const CameraCaptureView: React.FC<CameraCaptureProps> = ({ pacto, sentenceId, onBack, onDone }) => {
  const { user } = useSession();
  const toast = useToast();
  const qc = useQueryClient();
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [blob, setBlob] = useState<Blob | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [gps, setGps] = useState<{ lat: number; lng: number } | null>(null);
  const [gpsLoading, setGpsLoading] = useState(true);
  const [camError, setCamError] = useState<string | null>(null);
  const [offline, setOffline] = useState(!navigator.onLine);
  const [queued, setQueued] = useState(0);
  const [sending, setSending] = useState(false);

  const honor = pacto.verification_type === 'honor_code' && !sentenceId;

  useEffect(() => {
    const on = () => setOffline(false);
    const off = () => setOffline(true);
    window.addEventListener('online', on);
    window.addEventListener('offline', off);
    getQueuedEvidences().then((i) => setQueued(i.length)).catch(() => {});

    if (!honor) {
      navigator.mediaDevices
        ?.getUserMedia({ video: { facingMode: 'environment' }, audio: false })
        .then((s) => {
          streamRef.current = s;
          if (videoRef.current) videoRef.current.srcObject = s;
        })
        .catch(() => setCamError('No se pudo acceder a la cámara. Revisa el permiso del navegador.'));

      if ('geolocation' in navigator) {
        navigator.geolocation.getCurrentPosition(
          (p) => { setGps({ lat: p.coords.latitude, lng: p.coords.longitude }); setGpsLoading(false); },
          () => setGpsLoading(false),
          { timeout: 8000 }
        );
      } else setGpsLoading(false);
    }

    return () => {
      window.removeEventListener('online', on);
      window.removeEventListener('offline', off);
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, [honor]);

  useEffect(() => () => { if (preview) URL.revokeObjectURL(preview); }, [preview]);

  const take = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.fillRect(10, canvas.height - 50, canvas.width - 20, 40);
    ctx.fillStyle = '#FF5A1F';
    ctx.font = 'bold 14px sans-serif';
    ctx.fillText(`PACTO · ${new Date().toLocaleString('es')}${gps ? ` · ${gps.lat.toFixed(4)}, ${gps.lng.toFixed(4)}` : ''}`, 20, canvas.height - 25);
    canvas.toBlob((b) => {
      if (!b) return;
      setBlob(b);
      setPreview(URL.createObjectURL(b));
    }, 'image/jpeg', 0.85);
  };

  const retake = () => { setBlob(null); setPreview(null); };

  const send = async () => {
    if (!user || sending) return;
    if (!honor && !blob) return;
    setSending(true);
    try {
      if (sentenceId) {
        if (!navigator.onLine) throw new Error('Necesitas conexión para enviar la evidencia de la sentencia.');
        const path = await api.uploadEvidence(pacto.id, user.id, blob!);
        await api.submitSentenceEvidence(sentenceId, path);
        toast('Evidencia de la sentencia enviada. El grupo la revisará.');
      } else if (honor) {
        await api.submitEvidence({ pacto_id: pacto.id, user_id: user.id, evidence_url: null });
        toast('Cumplimiento registrado. El grupo votará.');
      } else if (!navigator.onLine) {
        await queueOfflineEvidence({ id: crypto.randomUUID(), pacto_id: pacto.id, user_id: user.id, blob: blob!, gps_lat: gps?.lat, gps_lng: gps?.lng, queued_at: new Date().toISOString() });
        toast('Sin conexión: guardada. Se enviará sola al volver internet.');
      } else {
        const path = await api.uploadEvidence(pacto.id, user.id, blob!);
        await api.submitEvidence({ pacto_id: pacto.id, user_id: user.id, evidence_url: path, gps_lat: gps?.lat, gps_lng: gps?.lng });
        toast('Evidencia enviada. El grupo votará.');
      }
      await qc.invalidateQueries();
      onDone();
    } catch (e) {
      const msg = (e as Error).message;
      toast(/duplicate|unique/i.test(msg) ? 'Ya subiste tu evidencia de hoy.' : msg, 'error');
    } finally {
      setSending(false);
    }
  };

  if (honor) {
    return (
      <div className="min-h-screen bg-[#090A0F] text-[#F3F4F6] p-4 max-w-md mx-auto space-y-6 flex flex-col justify-center">
        <button onClick={onBack} aria-label="Volver" className="absolute top-4 left-4 p-3 bg-[#12141D] rounded-full border border-white/10"><ArrowLeft className="w-5 h-5" /></button>
        <div className="bg-[#12141D] border border-white/10 rounded-2xl p-6 text-center space-y-4">
          <ShieldCheck className="w-10 h-10 text-[#34D399] mx-auto" />
          <h1 className="text-lg font-extrabold">Palabra de honor</h1>
          <p className="text-sm text-gray-300">Afirmas que hoy cumpliste “{pacto.name}”. Tus amigos votarán si te creen.</p>
          <button onClick={send} disabled={sending} className="w-full bg-[#34D399] text-black font-extrabold py-3.5 rounded-2xl min-h-[44px] disabled:opacity-50">{sending ? 'Enviando…' : 'Lo juro, cumplí hoy'}</button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black text-[#F3F4F6] flex flex-col justify-between p-4 z-50">
      <div className="flex items-center justify-between z-10 pt-2">
        <button onClick={onBack} aria-label="Volver" className="p-3 bg-[#12141D]/80 backdrop-blur-md rounded-full text-white border border-white/10 focus-visible:ring-2 focus-visible:ring-[#FF5A1F]">
          <ArrowLeft className="w-5 h-5" />
        </button>
        {offline && (
          <div className="bg-[#F87171] text-white px-3 py-1 rounded-full text-xs font-bold flex items-center space-x-1"><WifiOff className="w-3.5 h-3.5" /><span>Sin conexión</span></div>
        )}
        <div className="bg-black/60 px-3 py-1 rounded-full border border-white/10 text-xs flex items-center space-x-1.5">
          <ShieldCheck className="w-4 h-4 text-[#34D399]" /><span className="font-bold text-[#34D399]">{sentenceId ? 'Sentencia' : 'Evidencia'}</span>
        </div>
      </div>

      {queued > 0 && (
        <div role="status" className="z-10 bg-[#FBBF24]/20 border border-[#FBBF24] p-2.5 rounded-xl text-xs text-[#FBBF24] font-semibold flex items-center space-x-2 my-1">
          <AlertCircle className="w-4 h-4 flex-shrink-0" /><span>{queued} evidencia(s) esperando conexión para enviarse.</span>
        </div>
      )}

      <div className="relative flex-1 my-2 rounded-3xl overflow-hidden bg-[#12141D] border border-white/10 flex items-center justify-center">
        {camError && <p role="alert" className="text-sm text-[#F87171] p-6 text-center">{camError}</p>}
        {!preview ? <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" /> : <img src={preview} alt="Captura" className="w-full h-full object-cover" />}
        <canvas ref={canvasRef} className="hidden" />
        <div className="absolute bottom-4 left-4 right-4 bg-black/70 backdrop-blur-md p-3 rounded-2xl border border-white/10 text-xs">
          <div className="flex items-center space-x-2 text-gray-200">
            <MapPin className="w-4 h-4 text-[#FF5A1F]" />
            <span>{gpsLoading ? 'Obteniendo GPS…' : gps ? `GPS: ${gps.lat.toFixed(4)}, ${gps.lng.toFixed(4)}` : 'GPS no disponible'}</span>
          </div>
          <div className="text-[11px] text-gray-300 mt-1">La hora oficial la fija el servidor al enviar.</div>
        </div>
      </div>

      <div className="pb-6 pt-2 flex items-center justify-center">
        {!preview ? (
          <button onClick={take} disabled={!!camError} aria-label="Tomar foto" className="w-20 h-20 bg-[#FF5A1F] rounded-full border-4 border-white flex items-center justify-center shadow-2xl active:scale-90 transition disabled:opacity-40">
            <Camera className="w-8 h-8 text-white" />
          </button>
        ) : (
          <div className="flex items-center space-x-4 w-full max-w-xs">
            <button onClick={retake} className="flex-1 bg-[#12141D] border border-white/20 font-bold py-3.5 rounded-2xl flex items-center justify-center space-x-2 text-gray-200 min-h-[44px]"><RefreshCw className="w-4 h-4" /><span>Repetir</span></button>
            <button onClick={send} disabled={sending} className="flex-1 bg-[#34D399] text-black font-extrabold py-3.5 rounded-2xl flex items-center justify-center space-x-2 min-h-[44px] disabled:opacity-50"><Check className="w-5 h-5" /><span>{sending ? 'Enviando…' : 'Enviar'}</span></button>
          </div>
        )}
      </div>
    </div>
  );
};
