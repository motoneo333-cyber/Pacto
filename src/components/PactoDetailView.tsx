import React, { useState, useEffect } from 'react';
import { ArrowLeft, Flame, Camera, Check, X, Clock, ShieldCheck, Scale } from 'lucide-react';
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
  const { evidences, fetchEvidences, addEvidence } = usePactoStore();
  const [votedItems, setVotedItems] = useState<Record<string, boolean>>({});

  useEffect(() => {
    fetchEvidences(pacto.id);

    // Subscribe to Supabase Realtime channel for live evidence feed
    const channel = supabase
      .channel(`pacto_feed_${pacto.id}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'progress', filter: `pacto_id=eq.${pacto.id}` },
        (payload) => {
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

  const defaultEvidences = [
    {
      id: 'e1',
      username: 'Carlos',
      timestamp: 'Hoy, 08:30 AM',
      imageUrl: 'https://images.unsplash.com/photo-1517838277536-f5f99be501cd?w=400&auto=format&fit=crop&q=60'
    },
    {
      id: 'e2',
      username: 'Sofía',
      timestamp: 'Ayer, 07:15 PM',
      imageUrl: 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=400&auto=format&fit=crop&q=60'
    }
  ];

  return (
    <div className="min-h-screen bg-[#0A0A0F] text-[#F5F5F7] p-4 max-w-md mx-auto space-y-6 pb-24">
      {/* Top Bar */}
      <div className="flex items-center justify-between">
        <button
          onClick={onBack}
          className="p-2 bg-[#16161E] border border-white/10 rounded-xl text-gray-300 hover:text-white"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <span className="text-xs bg-[#FF5A1F]/20 text-[#FF5A1F] border border-[#FF5A1F]/40 px-3 py-1 rounded-full font-bold uppercase tracking-wider">
          {pacto.status}
        </span>
      </div>

      {/* Header Info */}
      <div className="bg-[#16161E] border border-white/10 p-6 rounded-2xl space-y-3 shadow-xl">
        <div className="flex items-center space-x-3">
          <span className="text-3xl">{pacto.emoji || '🔥'}</span>
          <div>
            <h1 className="text-2xl font-black">{pacto.name}</h1>
            <p className="text-xs text-gray-400">
              Meta: {pacto.target_value} ({pacto.goal_type}) · {pacto.frequency}
            </p>
          </div>
        </div>

        <div className="bg-[#0A0A0F] border border-white/5 p-3.5 rounded-xl flex items-center justify-between">
          <div className="flex items-center space-x-2 text-sm font-bold">
            <Flame className="w-5 h-5 text-[#FF5A1F]" />
            <span>Racha de Cumplimiento:</span>
          </div>
          <span className="text-base font-extrabold text-[#B4F461]">5 Días 🔥</span>
        </div>
      </div>

      {/* Live Evidence Stream (Supabase Realtime) */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-gray-400 flex items-center space-x-2">
            <Clock className="w-4 h-4 text-[#FF5A1F]" />
            <span>Feed de Evidencias en Vivo</span>
          </h2>
          <span className="text-[10px] text-[#B4F461] bg-[#B4F461]/10 px-2 py-0.5 rounded font-mono">
            Realtime Activo
          </span>
        </div>

        <div className="space-y-4">
          {defaultEvidences.map((item) => (
            <div
              key={item.id}
              className="bg-[#16161E] border border-white/10 rounded-2xl overflow-hidden shadow-lg space-y-3 p-4"
            >
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-white">Subido por @{item.username}</span>
                <span className="text-gray-400">{item.timestamp}</span>
              </div>

              <div className="relative rounded-xl overflow-hidden bg-black aspect-video border border-white/5">
                <img src={item.imageUrl} alt="Evidencia" className="w-full h-full object-cover" />
                <div className="absolute top-2 left-2 bg-black/60 backdrop-blur-md px-2 py-1 rounded text-[10px] text-white flex items-center space-x-1">
                  <ShieldCheck className="w-3 h-3 text-[#B4F461]" />
                  <span>MediaDevices Verified</span>
                </div>
              </div>

              <div className="flex items-center justify-between pt-1">
                <span className="text-xs text-gray-400">Votación del Grupo:</span>
                <div className="flex space-x-2">
                  <button
                    onClick={() => handleVote(item.id, true)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center space-x-1 border transition ${
                      votedItems[item.id] === true
                        ? 'bg-[#B4F461] text-black border-[#B4F461]'
                        : 'bg-[#0A0A0F] border-white/10 text-[#B4F461] hover:bg-[#B4F461]/10'
                    }`}
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>Aprobar</span>
                  </button>
                  <button
                    onClick={() => handleVote(item.id, false)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center space-x-1 border transition ${
                      votedItems[item.id] === false
                        ? 'bg-[#FF3B5C] text-white border-[#FF3B5C]'
                        : 'bg-[#0A0A0F] border-white/10 text-[#FF3B5C] hover:bg-[#FF3B5C]/10'
                    }`}
                  >
                    <X className="w-3.5 h-3.5" />
                    <span>Rechazar</span>
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <button
        onClick={onOpenJudgement}
        className="w-full bg-[#16161E] border border-[#FFC53D] text-[#FFC53D] font-extrabold py-3.5 rounded-2xl flex items-center justify-center space-x-2 shadow-lg hover:bg-[#FFC53D]/10 transition"
      >
        <Scale className="w-5 h-5" />
        <span>Ir a Ceremonia de Juicio Final</span>
      </button>

      <button
        onClick={onUploadEvidence}
        className="fixed bottom-6 right-6 bg-[#FF5A1F] text-white p-4 rounded-full shadow-2xl flex items-center space-x-2 font-bold hover:scale-105 active:scale-95 transition z-40 border-2 border-black"
      >
        <Camera className="w-6 h-6" />
        <span className="pr-1 text-sm font-extrabold">Subir Evidencia</span>
      </button>
    </div>
  );
};
