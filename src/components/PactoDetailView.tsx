import React, { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Flame, Camera, Clock, ShieldCheck, Scale, ThumbsUp, ThumbsDown, PenLine, Check } from 'lucide-react';
import { api } from '../lib/api';
import { useSession } from '../lib/session';
import { useToast } from '../lib/toast';
import { useEvidences, usePactoMembers, usePunishments, useRealtimePacto, useStandings } from '../lib/hooks';
import { daysLeft, progressRatio, streak } from '../lib/pactoMath';
import type { Pacto, PunishmentCategory } from '../types/pacto';

interface PactoDetailProps {
  pacto: Pacto;
  onBack: () => void;
  onUploadEvidence: () => void;
  onOpenJudgement: () => void;
}

const STATUS_LABEL: Record<string, string> = { draft: 'Borrador', active: 'Activo', judging: 'En juicio', completed: 'Terminado' };
const EV_LABEL: Record<string, string> = { pending: 'Votando', approved: 'Aprobada', rejected: 'Rechazada' };
const EV_COLOR: Record<string, string> = { pending: 'text-[#FBBF24]', approved: 'text-[#34D399]', rejected: 'text-[#F87171]' };

export const PactoDetailView: React.FC<PactoDetailProps> = ({ pacto, onBack, onUploadEvidence, onOpenJudgement }) => {
  const { user } = useSession();
  const toast = useToast();
  const qc = useQueryClient();
  useRealtimePacto(pacto.id);

  const { data: members = [] } = usePactoMembers(pacto.id);
  const { data: punishments = [] } = usePunishments(pacto.id);
  const { data: evidences = [] } = useEvidences(pacto.id);
  const { data: standings = [] } = useStandings(pacto.id);
  const [pBody, setPBody] = useState('');
  const [pCat] = useState<PunishmentCategory>('embarrassment');
  const [busy, setBusy] = useState(false);

  const me = members.find((m) => m.user_id === user?.id);
  const myStanding = standings.find((s) => s.user_id === user?.id);
  const isDraft = pacto.status === 'draft';
  const isActive = pacto.status === 'active' && new Date(pacto.end_date) > new Date();
  const inJudgement = pacto.status === 'judging' || pacto.status === 'completed' || (pacto.status === 'active' && !isActive);
  const iFailed = !!myStanding && !myStanding.met;
  const myDates = evidences.filter((e) => e.user_id === user?.id && e.status !== 'rejected').map((e) => e.entry_date);
  const uploadedToday = evidences.some((e) => e.user_id === user?.id && e.entry_date === new Date().toISOString().slice(0, 10));

  const act = async (fn: () => Promise<unknown>, okMsg?: string) => {
    setBusy(true);
    try {
      await fn();
      await qc.invalidateQueries();
      if (okMsg) toast(okMsg);
    } catch (e) {
      toast((e as Error).message, 'error');
    } finally {
      setBusy(false);
    }
  };

  const sign = () => act(async () => {
    const activated = await api.signPacto(pacto.id);
    if (activated) toast('¡Todos firmaron! El pacto está activo.');
  }, 'Firmado');
  const votePun = (id: string, ok: boolean) => act(async () => {
    const activated = await api.votePunishment(id, ok);
    if (activated) toast('¡Pacto activado!');
  });
  const propose = () => act(async () => {
    await api.proposePunishment(pacto.id, pBody.trim(), pCat, 3);
    setPBody('');
  }, 'Castigo propuesto. Los demás deben firmar de nuevo.');
  const voteEv = (progressId: string, verdict: boolean) => act(() => api.vote(progressId, user!.id, verdict));

  const card = 'bg-[#12141D] border border-white/10 rounded-2xl';
  const signed = members.filter((m) => m.signed).length;

  return (
    <div className="min-h-screen bg-[#090A0F] text-[#F3F4F6] p-4 max-w-md mx-auto space-y-6 pb-28">
      <div className="flex items-center justify-between">
        <button onClick={onBack} aria-label="Volver" className="p-2.5 bg-[#12141D] border border-white/10 rounded-xl text-gray-300 hover:text-white focus-visible:ring-2 focus-visible:ring-[#FF5A1F]">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <span className="text-xs bg-[#FF5A1F]/20 text-[#FF5A1F] border border-[#FF5A1F]/40 px-3 py-1 rounded-full font-bold uppercase tracking-wider">{STATUS_LABEL[pacto.status]}</span>
      </div>

      <div className={`${card} p-5 space-y-3 shadow-xl`}>
        <div className="flex items-center space-x-3">
          <span className="text-3xl">{pacto.emoji || '🔥'}</span>
          <div>
            <h1 className="text-xl font-extrabold text-white">{pacto.name}</h1>
            <p className="text-xs text-gray-300 font-medium">Meta: {pacto.target_value} aprobadas · {daysLeft(pacto.end_date)} día(s) restantes</p>
          </div>
        </div>
        {!isDraft && myStanding && (
          <>
            <div className="h-2 bg-[#090A0F] rounded-full overflow-hidden" aria-hidden="true">
              <div className="h-full bg-[#FF5A1F]" style={{ width: `${progressRatio(myStanding.approved, myStanding.target) * 100}%` }} />
            </div>
            <div className="bg-[#090A0F] border border-white/5 p-3 rounded-xl flex items-center justify-between text-xs font-bold text-gray-200">
              <span className="flex items-center space-x-2"><Flame className="w-4 h-4 text-[#FF5A1F]" /><span>Tu racha</span></span>
              <span className="text-[#34D399]">{streak(myDates)} día(s) · {myStanding.approved}/{myStanding.target} aprobadas</span>
            </div>
          </>
        )}
      </div>

      {isDraft && (
        <div className={`${card} p-5 space-y-4`}>
          <h2 className="text-sm font-extrabold text-[#FBBF24] flex items-center space-x-2"><PenLine className="w-4 h-4" /><span>Para empezar: firmas {signed}/{members.length}</span></h2>
          <div className="space-y-1">
            {members.map((m) => (
              <div key={m.user_id} className="flex items-center justify-between text-xs">
                <span className="text-gray-200 font-semibold">{m.profiles?.username ?? '?'}{m.user_id === user?.id ? ' (tú)' : ''}</span>
                <span className={m.signed ? 'text-[#34D399] font-bold' : 'text-gray-400'}>{m.signed ? 'Firmó ✓' : 'Falta firma'}</span>
              </div>
            ))}
          </div>

          <div className="space-y-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-gray-300">Castigos (deben aprobarlos todos)</h3>
            {punishments.map((p) => {
              const approvals = p.punishment_approvals.filter((a) => a.approved).length;
              const mine = p.punishment_approvals.find((a) => a.user_id === user?.id);
              return (
                <div key={p.id} className="bg-[#090A0F] border border-white/5 rounded-xl p-3 space-y-2">
                  <div className="text-sm font-bold text-white">{p.body}</div>
                  <div className="flex items-center justify-between text-[11px] text-gray-300">
                    <span>{approvals}/{members.length} aprobaron</span>
                    <span className="flex space-x-2">
                      <button disabled={busy} onClick={() => votePun(p.id, true)} aria-pressed={mine?.approved === true} className={`px-3 py-2 rounded-lg border font-bold min-h-[44px] ${mine?.approved === true ? 'bg-[#34D399] text-black border-[#34D399]' : 'border-white/10 text-[#34D399]'}`}>Aprobar</button>
                      <button disabled={busy} onClick={() => votePun(p.id, false)} aria-pressed={mine?.approved === false} className={`px-3 py-2 rounded-lg border font-bold min-h-[44px] ${mine?.approved === false ? 'bg-[#F87171] text-white border-[#F87171]' : 'border-white/10 text-[#F87171]'}`}>Rechazar</button>
                    </span>
                  </div>
                </div>
              );
            })}
            <div className="flex space-x-2">
              <input aria-label="Proponer un castigo" value={pBody} onChange={(e) => setPBody(e.target.value)} placeholder="Proponer otro castigo…" maxLength={200} className="flex-1 bg-[#090A0F] border border-white/10 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-[#FF5A1F]" />
              <button disabled={busy || pBody.trim().length < 10} onClick={propose} className="px-4 bg-[#090A0F] border border-[#FF5A1F] text-[#FF5A1F] font-bold rounded-xl text-xs min-h-[44px] disabled:opacity-40">Añadir</button>
            </div>
          </div>

          {me && !me.signed && (
            <button disabled={busy} onClick={sign} className="w-full bg-[#FF5A1F] text-white font-extrabold py-3.5 rounded-2xl flex items-center justify-center space-x-2 min-h-[44px]">
              <Check className="w-5 h-5" /><span>Firmar el pacto</span>
            </button>
          )}
        </div>
      )}

      {!isDraft && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-bold uppercase tracking-wider text-gray-300 flex items-center space-x-2"><Clock className="w-4 h-4 text-[#FF5A1F]" /><span>Evidencias</span></h2>
            <span className="text-[10px] text-[#34D399] bg-[#34D399]/10 px-2 py-0.5 rounded font-mono font-bold">En vivo</span>
          </div>

          {evidences.length === 0 && <div className={`${card} p-6 text-center text-xs text-gray-300`}>Aún no hay evidencias. ¡Sé el primero en subir una!</div>}

          {evidences.map((item) => {
            const mine = item.user_id === user?.id;
            const myVote = item.votes.find((v) => v.voter_id === user?.id);
            const needed = Math.max(0, members.length - 1);
            const canVote = !mine && item.status === 'pending' && pacto.status === 'active';
            return (
              <div key={item.id} className={`${card} overflow-hidden shadow-lg space-y-3 p-4`}>
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-white">@{item.username}{mine ? ' (tú)' : ''}</span>
                  <span className="text-gray-300">{new Date(item.server_timestamp).toLocaleString('es', { dateStyle: 'short', timeStyle: 'short' })}</span>
                </div>
                {item.signedUrl ? (
                  <div className="relative rounded-xl overflow-hidden bg-black aspect-video border border-white/5">
                    <img src={item.signedUrl} alt={`Evidencia de ${item.username}`} className="w-full h-full object-cover" />
                    <div className="absolute top-2 left-2 bg-black/70 backdrop-blur-md px-2.5 py-1 rounded-md text-[11px] text-white flex items-center space-x-1 border border-white/10 font-medium">
                      <ShieldCheck className="w-3.5 h-3.5 text-[#34D399]" /><span>Hora del servidor{item.gps_lat != null ? ' · GPS' : ''}</span>
                    </div>
                  </div>
                ) : (
                  <div className="rounded-xl bg-[#090A0F] border border-white/5 p-4 text-xs text-gray-300">Palabra de honor: {item.username} afirma que cumplió.</div>
                )}
                <div className="flex items-center justify-between text-xs pt-1 border-t border-white/5">
                  <span className={`font-bold ${EV_COLOR[item.status]}`}>{EV_LABEL[item.status]}</span>
                  <span className="text-gray-300">{item.votes.length}/{needed} votaron</span>
                </div>
                {canVote && (
                  <div className="flex space-x-3">
                    <button disabled={busy} onClick={() => voteEv(item.id, true)} aria-label="Aprobar evidencia" aria-pressed={myVote?.verdict === true}
                      className={`flex-1 py-3 rounded-xl text-xs font-bold flex items-center justify-center space-x-2 border min-h-[44px] ${myVote?.verdict === true ? 'bg-[#34D399] text-black border-[#34D399]' : 'bg-[#090A0F] border-white/10 text-[#34D399]'}`}>
                      <ThumbsUp className="w-4 h-4" /><span>Aprobar</span>
                    </button>
                    <button disabled={busy} onClick={() => voteEv(item.id, false)} aria-label="Rechazar evidencia" aria-pressed={myVote?.verdict === false}
                      className={`flex-1 py-3 rounded-xl text-xs font-bold flex items-center justify-center space-x-2 border min-h-[44px] ${myVote?.verdict === false ? 'bg-[#F87171] text-white border-[#F87171]' : 'bg-[#090A0F] border-white/10 text-[#F87171]'}`}>
                      <ThumbsDown className="w-4 h-4" /><span>Rechazar</span>
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {inJudgement && (
        iFailed || pacto.status === 'completed' ? (
          <button onClick={onOpenJudgement} className="w-full bg-[#12141D] border border-[#FBBF24] text-[#FBBF24] font-extrabold py-3.5 rounded-2xl flex items-center justify-center space-x-2 hover:bg-[#FBBF24]/10 min-h-[44px]">
            <Scale className="w-5 h-5" /><span>{iFailed ? 'Ir a la ceremonia de juicio' : 'Ver resultados del juicio'}</span>
          </button>
        ) : (
          <div className={`${card} p-3.5 text-center text-xs text-[#34D399] font-semibold`}>¡Cumpliste tu meta! Ganaste 10 puntos de honor.</div>
        )
      )}

      {isActive && (
        <button onClick={onUploadEvidence} disabled={uploadedToday}
          className="w-full bg-[#FF5A1F] text-white font-extrabold py-3.5 rounded-2xl flex items-center justify-center space-x-2 shadow-xl min-h-[44px] disabled:opacity-40">
          <Camera className="w-5 h-5" /><span>{uploadedToday ? 'Ya subiste tu evidencia de hoy' : pacto.verification_type === 'honor_code' ? 'Registrar cumplimiento de hoy' : 'Subir evidencia de hoy'}</span>
        </button>
      )}
    </div>
  );
};
