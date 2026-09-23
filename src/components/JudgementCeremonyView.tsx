import React, { useRef, useState, useEffect, useMemo } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Scale, AlertCircle, Camera, ThumbsUp, ThumbsDown } from 'lucide-react';
import confetti from 'canvas-confetti';
import { api } from '../lib/api';
import { useSession } from '../lib/session';
import { useToast } from '../lib/toast';
import { usePactoMembers, usePunishments, useRealtimePacto, useSentences, useStandings } from '../lib/hooks';
import type { Pacto, Punishment } from '../types/pacto';

interface Props {
  pacto: Pacto;
  onBack: () => void;
  onSubmitSentenceEvidence: (sentenceId: string) => void;
}

const COLORS = ['#FF5A1F', '#1d2030', '#FFC53D', '#2A2A38'];

export const JudgementCeremonyView: React.FC<Props> = ({ pacto, onBack, onSubmitSentenceEvidence }) => {
  const { user } = useSession();
  const toast = useToast();
  const qc = useQueryClient();
  useRealtimePacto(pacto.id);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const angleRef = useRef(0);
  const [spinning, setSpinning] = useState(false);
  const [revealed, setRevealed] = useState<Punishment | null>(null);

  const { data: members = [] } = usePactoMembers(pacto.id);
  const { data: punishments = [] } = usePunishments(pacto.id);
  const { data: sentences = [] } = useSentences(pacto.id);
  const { data: standings = [] } = useStandings(pacto.id);

  // mismas candidatas y mismo orden que la funcion pick_sentence del servidor
  const candidates = useMemo(
    () => punishments
      .filter((p) => p.punishment_approvals.filter((a) => a.approved).length === members.length && members.length > 0)
      .sort((a, b) => (a.id < b.id ? -1 : 1)),
    [punishments, members.length]
  );

  const mine = sentences.find((s) => s.user_id === user?.id);
  const iFailed = standings.some((s) => s.user_id === user?.id && !s.met);
  const canSpin = pacto.status === 'judging' && iFailed && !mine;

  const draw = (angle: number) => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx || candidates.length === 0) return;
    const { width: w, height: h } = canvas;
    const cx = w / 2, cy = h / 2, radius = Math.min(w, h) / 2 - 15;
    const slice = (2 * Math.PI) / candidates.length;
    ctx.clearRect(0, 0, w, h);
    candidates.forEach((p, i) => {
      const a0 = angle + i * slice;
      ctx.beginPath(); ctx.moveTo(cx, cy); ctx.arc(cx, cy, radius, a0, a0 + slice); ctx.closePath();
      ctx.fillStyle = COLORS[i % COLORS.length]; ctx.fill();
      ctx.strokeStyle = '#090A0F'; ctx.lineWidth = 4; ctx.stroke();
      ctx.save(); ctx.translate(cx, cy); ctx.rotate(a0 + slice / 2);
      ctx.textAlign = 'right'; ctx.fillStyle = '#FFFFFF'; ctx.font = 'bold 11px Inter, sans-serif';
      const words = p.body.split(' ');
      const half = Math.ceil(words.length / 2);
      if (words.length > 3) { ctx.fillText(words.slice(0, half).join(' ').slice(0, 26), radius - 15, -4); ctx.fillText(words.slice(half).join(' ').slice(0, 26), radius - 15, 9); }
      else ctx.fillText(p.body, radius - 15, 4);
      ctx.restore();
    });
    ctx.beginPath(); ctx.arc(cx, cy, radius, 0, 2 * Math.PI); ctx.strokeStyle = '#FF5A1F'; ctx.lineWidth = 6; ctx.stroke();
    ctx.beginPath(); ctx.arc(cx, cy, 18, 0, 2 * Math.PI); ctx.fillStyle = '#090A0F'; ctx.fill(); ctx.strokeStyle = '#FFFFFF'; ctx.lineWidth = 3; ctx.stroke();
  };

  const finalAngle = (idx: number) => {
    const slice = (2 * Math.PI) / candidates.length;
    return -Math.PI / 2 - (idx * slice + slice / 2);
  };

  // si ya me tocaron, la rueda se dibuja parada en mi castigo
  useEffect(() => {
    if (candidates.length === 0) return;
    if (mine) {
      const idx = candidates.findIndex((c) => c.id === mine.punishment_id);
      if (idx >= 0) angleRef.current = finalAngle(idx);
    }
    draw(angleRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [candidates, mine?.punishment_id]);

  const spin = async () => {
    if (spinning || !canSpin) return;
    setSpinning(true);
    try {
      // el servidor decide y guarda la sentencia ANTES de que gire la rueda
      const res = await api.pickSentence(pacto.id);
      const idx = candidates.findIndex((c) => c.id === res.punishment.id);
      if (idx < 0) throw new Error('El castigo elegido no está en la rueda. Recarga.');
      const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      const total = (reduce ? 0 : Math.PI * 2 * 6) + finalAngle(idx);
      const dur = reduce ? 600 : 5000;
      const t0 = performance.now();
      const step = (now: number) => {
        const p = Math.min((now - t0) / dur, 1);
        angleRef.current = (1 - Math.pow(1 - p, 3)) * total;
        draw(angleRef.current);
        if (p < 1) { requestAnimationFrame(step); return; }
        setSpinning(false);
        setRevealed(res.punishment);
        if ('vibrate' in navigator) navigator.vibrate([200, 100, 200]);
        if (!reduce) confetti({ particleCount: 80, spread: 70, origin: { y: 0.6 } });
        qc.invalidateQueries();
      };
      requestAnimationFrame(step);
    } catch (e) {
      setSpinning(false);
      toast((e as Error).message, 'error');
    }
  };

  const voteSentence = async (id: string, verdict: boolean) => {
    try {
      const r = await api.voteSentence(id, verdict);
      await qc.invalidateQueries();
      if (r === 'fulfilled') toast('Sentencia cumplida ✓');
      if (r === 'rejected') toast('Sentencia rechazada: deberá repetir la evidencia');
    } catch (e) { toast((e as Error).message, 'error'); }
  };

  const mineSentence = mine ? { ...mine, punishmentBody: mine.punishments?.body ?? revealed?.body } : null;
  const card = 'bg-[#12141D] border border-white/10 rounded-2xl';

  return (
    <div className="min-h-screen bg-[#090A0F] text-[#F3F4F6] p-4 max-w-md mx-auto space-y-6 pb-28 text-center">
      <div className="flex items-center justify-between">
        <button onClick={onBack} aria-label="Volver" className="p-2.5 bg-[#12141D] border border-white/10 rounded-xl text-gray-300 hover:text-white focus-visible:ring-2 focus-visible:ring-[#FF5A1F]"><ArrowLeft className="w-5 h-5" /></button>
        <div className="flex items-center space-x-1 text-[#FFC53D]"><Scale className="w-5 h-5" /><span className="font-extrabold text-sm uppercase tracking-wider">Juicio</span></div>
        <span className="w-10" />
      </div>

      <div className="space-y-1">
        <h1 className="text-2xl font-black text-white">{pacto.name}</h1>
        <p className="text-xs text-gray-300">
          {canSpin ? 'No llegaste a la meta. La ruleta elige tu castigo entre los aprobados por todos; el servidor lo guarda y no se puede repetir.' : 'Resultado del pacto.'}
        </p>
      </div>

      <div className={`${card} p-4 text-left space-y-1`}>
        {standings.map((s) => (
          <div key={s.user_id} className="flex items-center justify-between text-xs">
            <span className="font-semibold">{s.username}{s.user_id === user?.id ? ' (tú)' : ''}</span>
            <span className={s.met ? 'text-[#34D399] font-bold' : 'text-[#F87171] font-bold'}>{s.approved}/{s.target} · {s.met ? 'Cumplió' : 'Falló'}</span>
          </div>
        ))}
      </div>

      {(canSpin || mine) && candidates.length > 0 && (
        <div className="relative flex flex-col items-center justify-center">
          <div className="w-0 h-0 border-l-[12px] border-l-transparent border-r-[12px] border-r-transparent border-t-[20px] border-t-[#FF3B5C] z-20 -mb-3" />
          <canvas ref={canvasRef} width={300} height={300} role="img" aria-label="Ruleta de castigos" className="rounded-full shadow-2xl bg-[#12141D] border-4 border-white/10" />
        </div>
      )}

      {canSpin && (
        <button disabled={spinning} onClick={spin} className="w-full bg-[#FF5A1F] text-white font-black py-4 rounded-2xl shadow-xl active:scale-95 transition disabled:opacity-50 min-h-[44px]">
          {spinning ? 'GIRANDO…' : 'GIRAR LA RULETA 🎰'}
        </button>
      )}

      {mineSentence && (
        <div className="bg-[#12141D] border-2 border-[#FF3B5C] p-5 rounded-2xl space-y-3 text-left">
          <div className="flex items-center space-x-2 text-[#FF3B5C]"><AlertCircle className="w-5 h-5" /><h3 className="font-extrabold text-sm uppercase tracking-wider">Tu sentencia</h3></div>
          <p className="text-lg font-extrabold text-white">“{mineSentence.punishmentBody}”</p>
          <div className="text-xs text-gray-300 space-y-1 pt-1 border-t border-white/10 font-mono">
            <div>Estado: <span className="text-white">{mine!.status === 'assigned' ? 'pendiente' : mine!.status === 'fulfilled' ? 'cumplida' : 'incumplida'}</span></div>
            <div>Plazo: <span className="text-white">{new Date(mine!.deadline).toLocaleString('es')}</span></div>
            <div className="break-all">Semilla: <span className="text-gray-400">{mine!.random_seed}</span></div>
            <div className="text-[10px] text-gray-400 font-sans">Auditoría: índice = (primeros 8 hex de md5(semilla)) mod {candidates.length}, sobre los castigos ordenados por id.</div>
          </div>
          {mine!.status === 'assigned' && !mine!.evidence_url && new Date(mine!.deadline) > new Date() && (
            <button onClick={() => onSubmitSentenceEvidence(mine!.id)} className="w-full bg-[#FF5A1F] text-white font-extrabold py-3 rounded-xl flex items-center justify-center space-x-2 min-h-[44px]">
              <Camera className="w-4 h-4" /><span>Subir prueba de que la cumpliste</span>
            </button>
          )}
          {mine!.status === 'assigned' && mine!.evidence_url && <p className="text-xs text-[#FBBF24] font-bold">Prueba enviada: el grupo la está revisando.</p>}
        </div>
      )}

      {sentences.filter((s) => s.user_id !== user?.id).map((s) => {
        const myVote = s.sentence_votes.find((v) => v.voter_id === user?.id);
        return (
          <div key={s.id} className={`${card} p-4 text-left space-y-2`}>
            <div className="text-xs font-bold text-white">@{s.profiles?.username} · “{s.punishments?.body}”</div>
            <div className="text-[11px] text-gray-300">{s.status === 'fulfilled' ? 'Cumplida ✓' : s.status === 'failed' ? 'Incumplida ✗' : s.evidence_url ? 'Prueba enviada, esperando votos' : 'Aún sin prueba'}</div>
            {s.signedUrl && <img src={s.signedUrl} alt={`Prueba de ${s.profiles?.username}`} className="w-full rounded-xl aspect-video object-cover" />}
            {s.status === 'assigned' && s.evidence_url && (
              <div className="flex space-x-3">
                <button onClick={() => voteSentence(s.id, true)} aria-pressed={myVote?.verdict === true} className={`flex-1 py-3 rounded-xl text-xs font-bold flex items-center justify-center space-x-2 border min-h-[44px] ${myVote?.verdict === true ? 'bg-[#34D399] text-black border-[#34D399]' : 'border-white/10 text-[#34D399]'}`}><ThumbsUp className="w-4 h-4" /><span>La cumplió</span></button>
                <button onClick={() => voteSentence(s.id, false)} aria-pressed={myVote?.verdict === false} className={`flex-1 py-3 rounded-xl text-xs font-bold flex items-center justify-center space-x-2 border min-h-[44px] ${myVote?.verdict === false ? 'bg-[#F87171] text-white border-[#F87171]' : 'border-white/10 text-[#F87171]'}`}><ThumbsDown className="w-4 h-4" /><span>No vale</span></button>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};
