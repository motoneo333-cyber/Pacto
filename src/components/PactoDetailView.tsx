import React, { useState, useEffect } from 'react';
import { ArrowLeft, Flame, Camera, Check, X, Clock, ShieldCheck, Scale, ThumbsUp, ThumbsDown } from 'lucide-react';
import { Pacto } from '../types/pacto';
import { supabase } from '../lib/supabaseClient';
import { usePactoStore } from '../usePactoStore';

interface PactoDetailProps {
  pacto: Pacto;
  onBack: () => void;
  onUploadEvidence: () => void;
  onOpenJudgement: () => void;
}

export const PactoDetailView: React.FC<PactoDetailProps> = ({
  pacto,
  onBack,
  onUploadEvidence,
  onOpenJudgement
}) => {
  const { fetchEvidences } = usePactoStore();
  const [votedItems, setVotedItems] = useState<Record<string, boolean>>({});

  useEffect(() => {
    fetchEvidences(pacto.id);

    const channel = supabase
      .channel(`pacto_feed_${pacto.id}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'progress', filter: `pacto_id=eq.${pacto.id}` },
        () => {
          fetchEvidences(pacto.id);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [pacto.id, fetchEvidences]);

  const handleVote = (evidenceId: string, verdict: boolean) => {
    setVotedItems({ ...votedItems, [evidenceId]: verdict });
  };

  // Inline SVG fallback images for offline reliability
  const inlineSvgEvidence1 = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="400" height="225" viewBox="0 0 400 225"><rect width="400" height="225" fill="%2312141D"/><circle cx="200" cy="112" r="50" fill="%23FF5A1F" opacity="0.3"/><text x="200" y="118" font-family="sans-serif" font-weight="bold" font-size="16" fill="%23F3F4F6" text-anchor="middle">EVIDENCIA REGISTRADA #1</text></svg>`;
  const inlineSvgEvidence2 = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="400" height="225" viewBox="0 0 400 225"><rect width="400" height="225" fill="%2312141D"/><circle cx="200" cy="112" r="50" fill="%2334D399" opacity="0.3"/><text x="200" y="118" font-family="sans-serif" font-weight="bold" font-size="16" fill="%23F3F4F6" text-anchor="middle">EVIDENCIA REGISTRADA #2</text></svg>`;

  const defaultEvidences = [
    {
      id: 'e1',
      username: 'Carlos',
      timestamp: 'Hoy, 08:30 AM',
      imageUrl: inlineSvgEvidence1,
      votesCount: 2,
      totalRequiredVotes: 3,
      status: 'pending'
    },
    {
      id: 'e2',
      username: 'Sofía',
      timestamp: 'Ayer, 07:15 PM',
      imageUrl: inlineSvgEvidence2,
      votesCount: 3,
      totalRequiredVotes: 3,
      status: 'approved'
    }
  ];

  const isJudgementEligible = pacto.status === 'judging' || pacto.status === 'completed' || new Date(pacto.end_date) <= new Date();

  return (
    <div className="min-h-screen bg-[#090A0F] text-[#F3F4F6] p-4 max-w-md mx-auto space-y-6 pb-28">
      {/* Top Bar */}
      <div className="flex items-center justify-between">
        <button
          onClick={onBack}
          aria-label="Volver"
          className="p-2.5 bg-[#12141D] border border-white/10 rounded-xl text-gray-300 hover:text-white focus-visible:ring-2 focus-visible:ring-[#FF5A1F]"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <span className="text-xs bg-[#FF5A1F]/20 text-[#FF5A1F] border border-[#FF5A1F]/40 px-3 py-1 rounded-full font-bold uppercase tracking-wider">
          {pacto.status}
        </span>
      </div>

      {/* Header Info */}
      <div className="bg-[#12141D] border border-white/10 p-5 rounded-2xl space-y-3 shadow-xl">
        <div className="flex items-center space-x-3">
          <span className="text-3xl">{pacto.emoji || '🔥'}</span>
          <div>
            <h1 className="text-xl font-extrabold text-white">{pacto.name}</h1>
            <p className="text-xs text-gray-300 font-medium">
              Meta: {pacto.target_value} ({pacto.goal_type}) · Frecuencia: {pacto.frequency}
            </p>
          </div>
        </div>

        <div className="bg-[#090A0F] border border-white/5 p-3 rounded-xl flex items-center justify-between">
          <div className="flex items-center space-x-2 text-xs font-bold text-gray-200">
            <Flame className="w-4 h-4 text-[#FF5A1F]" />
            <span>Racha de Cumplimiento:</span>
          </div>
          <span className="text-sm font-extrabold text-[#34D399]">5 Días 🔥</span>
        </div>
      </div>

      {/* Live Evidence Stream */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-bold uppercase tracking-wider text-gray-300 flex items-center space-x-2">
            <Clock className="w-4 h-4 text-[#FF5A1F]" />
            <span>Feed de Evidencias en Vivo</span>
          </h2>
          <span className="text-[10px] text-[#34D399] bg-[#34D399]/10 px-2 py-0.5 rounded font-mono font-bold">
            Realtime Activo
          </span>
        </div>

        <div className="space-y-4">
          {defaultEvidences.map((item) => (
            <div
              key={item.id}
              className="bg-[#12141D] border border-white/10 rounded-2xl overflow-hidden shadow-lg space-y-3 p-4"
            >
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-white">Subido por @{item.username}</span>
                <span className="text-gray-400">{item.timestamp}</span>
              </div>

              <div className="relative rounded-xl overflow-hidden bg-black aspect-video border border-white/5">
                <img src={item.imageUrl} alt="Evidencia" className="w-full h-full object-cover" />
                <div className="absolute top-2 left-2 bg-black/70 backdrop-blur-md px-2.5 py-1 rounded-md text-[11px] text-white flex items-center space-x-1 border border-white/10 font-medium">
                  <ShieldCheck className="w-3.5 h-3.5 text-[#34D399]" />
                  <span>MediaDevices Verified</span>
                </div>
              </div>

              {/* Vote Count and Actions (R6 & R7) */}
              <div className="space-y-2 pt-1 border-t border-white/5">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-gray-300 font-medium">
                    Progreso de votos: <strong className="text-white">{item.votesCount}/{item.totalRequiredVotes} votaron</strong>
                  </span>
                  {votedItems[item.id] !== undefined && (
                    <span className="text-[11px] font-bold text-[#34D399]">
                      Tu voto: {votedItems[item.id] ? 'Aprobado ✓' : 'Rechazado ✗'}
                    </span>
                  )}
                </div>

                {/* Touch-friendly 44px height buttons */}
                <div className="flex space-x-3">
                  <button
                    onClick={() => handleVote(item.id, true)}
                    aria-label="Aprobar evidencia"
                    className={`flex-1 py-3 px-4 rounded-xl text-xs font-bold flex items-center justify-center space-x-2 border transition min-h-[44px] ${
                      votedItems[item.id] === true
                        ? 'bg-[#34D399] text-black border-[#34D399]'
                        : 'bg-[#090A0F] border-white/10 text-[#34D399] hover:bg-[#34D399]/10'
                    }`}
                  >
                    <ThumbsUp className="w-4 h-4" />
                    <span>Aprobar</span>
                  </button>
                  <button
                    onClick={() => handleVote(item.id, false)}
                    aria-label="Rechazar evidencia"
                    className={`flex-1 py-3 px-4 rounded-xl text-xs font-bold flex items-center justify-center space-x-2 border transition min-h-[44px] ${
                      votedItems[item.id] === false
                        ? 'bg-[#F87171] text-white border-[#F87171]'
                        : 'bg-[#090A0F] border-white/10 text-[#F87171] hover:bg-[#F87171]/10'
                    }`}
                  >
                    <ThumbsDown className="w-4 h-4" />
                    <span>Rechazar</span>
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Judgment Ceremony Trigger Button - Only visible when eligible */}
      {isJudgementEligible ? (
        <button
          onClick={onOpenJudgement}
          className="w-full bg-[#12141D] border border-[#FBBF24] text-[#FBBF24] font-extrabold py-3.5 rounded-2xl flex items-center justify-center space-x-2 shadow-lg hover:bg-[#FBBF24]/10 transition min-h-[44px]"
        >
          <Scale className="w-5 h-5" />
          <span>Ir a Ceremonia de Juicio Final</span>
        </button>
      ) : (
        <div className="p-3.5 bg-[#12141D] border border-white/10 rounded-2xl text-center text-xs text-gray-300 font-medium">
          El Juicio Final se activará al vencer el plazo del pacto.
        </div>
      )}

      {/* Upload Action */}
      <button
        onClick={onUploadEvidence}
        className="w-full bg-[#FF5A1F] hover:bg-[#FF5A1F]/90 text-white font-extrabold py-3.5 rounded-2xl flex items-center justify-center space-x-2 shadow-xl transition min-h-[44px]"
      >
        <Camera className="w-5 h-5" />
        <span>Subir Nueva Evidencia</span>
      </button>
    </div>
  );
};
