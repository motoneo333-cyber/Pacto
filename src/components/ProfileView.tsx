import React from 'react';
import { Award, Flame, AlertTriangle, Shield, CheckCircle2, History, ArrowLeft } from 'lucide-react';
import { Profile } from '../types/pacto';

interface ProfileViewProps {
  profile: Profile;
  onBack: () => void;
}

export const ProfileView: React.FC<ProfileViewProps> = ({ profile, onBack }) => {
  // Mock pact history
  const historyPactos = [
    { id: '1', name: 'Lectura Diaria 20m', outcome: 'Cumplido', status: 'completed' },
    { id: '2', name: 'Gimnasio 4x/semana', outcome: 'Cumplido', status: 'completed' },
    { id: '3', name: 'Sin Comida Chatarra', outcome: 'Fallado (Sentencia Cumplida)', status: 'failed' }
  ];

  return (
    <div className="min-h-screen bg-[#0A0A0F] text-[#F5F5F7] p-4 max-w-md mx-auto space-y-6">
      {/* Top Navigation */}
      <div className="flex items-center space-x-3">
        <button
          onClick={onBack}
          className="p-2 bg-[#16161E] border border-white/10 rounded-xl text-gray-300 hover:text-white"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="text-xl font-bold">Perfil de Honor</h1>
      </div>

      {/* User Header Card */}
      <div className="bg-[#16161E] border border-white/10 rounded-2xl p-6 text-center space-y-4 shadow-xl">
        <div className="relative w-20 h-20 mx-auto">
          <div className="w-20 h-20 bg-[#FF5A1F]/20 border-2 border-[#FF5A1F] rounded-full flex items-center justify-center text-2xl font-bold text-[#FF5A1F]">
            {profile.username.substring(0, 2).toUpperCase()}
          </div>
          {profile.installed_pwa && (
            <span className="absolute bottom-0 right-0 bg-[#B4F461] text-black text-[10px] font-bold px-1.5 py-0.5 rounded-full border border-[#0A0A0F]">
              PWA
            </span>
          )}
        </div>

        <div>
          <h2 className="text-2xl font-extrabold">{profile.username}</h2>
          <p className="text-xs text-gray-400 mt-0.5">Miembro Activo PACTO</p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-3 pt-2">
          {/* Honor Points */}
          <div className="bg-[#0A0A0F] border border-[#B4F461]/30 p-4 rounded-xl flex flex-col items-center">
            <Award className="w-6 h-6 text-[#B4F461] mb-1" />
            <span className="text-2xl font-extrabold text-[#B4F461]">
              {profile.honor_points}
            </span>
            <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mt-0.5">
              Puntos de Honor
            </span>
          </div>

          {/* Shame Count */}
          <div className="bg-[#0A0A0F] border border-[#FF3B5C]/30 p-4 rounded-xl flex flex-col items-center">
            <AlertTriangle className="w-6 h-6 text-[#FF3B5C] mb-1" />
            <span className="text-2xl font-extrabold text-[#FF3B5C]">
              {profile.shame_count}
            </span>
            <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mt-0.5">
              Marcas de Deshonra
            </span>
          </div>
        </div>
      </div>

      {/* History Section */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold uppercase tracking-wider text-gray-400 flex items-center space-x-2">
            <History className="w-4 h-4 text-[#FF5A1F]" />
            <span>Historial de Pactos</span>
          </h3>
          <span className="text-xs text-gray-500">{historyPactos.length} pactos</span>
        </div>

        <div className="space-y-2">
          {historyPactos.map((item) => (
            <div
              key={item.id}
              className="bg-[#16161E] border border-white/5 p-4 rounded-xl flex items-center justify-between"
            >
              <div>
                <h4 className="font-semibold text-sm">{item.name}</h4>
                <p className="text-xs text-gray-400 mt-0.5">{item.outcome}</p>
              </div>
              {item.status === 'completed' ? (
                <CheckCircle2 className="w-5 h-5 text-[#B4F461]" />
              ) : (
                <AlertTriangle className="w-5 h-5 text-[#FF3B5C]" />
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
