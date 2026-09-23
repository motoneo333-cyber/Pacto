import React, { useState } from 'react';
import { Award, AlertTriangle, History, ArrowLeft, Shield, Trash2, X, Lock } from 'lucide-react';
import { Profile } from '../types/pacto';

interface ProfileViewProps {
  profile: Profile;
  onBack: () => void;
}

export const ProfileView: React.FC<ProfileViewProps> = ({ profile, onBack }) => {
  const [showPrivacyModal, setShowPrivacyModal] = useState(false);

  const historyPactos = [
    { id: '1', name: 'Lectura Diaria 20m', outcome: 'Cumplido (+10 Honor)', status: 'completed' },
    { id: '2', name: 'Gimnasio 4x/semana', outcome: 'Cumplido (+10 Honor)', status: 'completed' },
    { id: '3', name: 'Sin Comida Chatarra', outcome: 'Fallado (Marca de Deshonra)', status: 'failed' }
  ];

  return (
    <div className="min-h-screen bg-[#090A0F] text-[#F3F4F6] p-4 max-w-md mx-auto space-y-6 pb-28">
      {/* Top Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <button
            onClick={onBack}
            aria-label="Volver"
            className="p-2.5 bg-[#12141D] border border-white/10 rounded-xl text-gray-300 hover:text-white focus-visible:ring-2 focus-visible:ring-[#FF5A1F]"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-lg font-bold text-white">Perfil de Honor</h1>
        </div>

        <button
          onClick={() => setShowPrivacyModal(true)}
          aria-label="Política de Privacidad"
          className="p-2.5 bg-[#12141D] border border-white/10 rounded-xl text-gray-300 hover:text-white"
        >
          <Lock className="w-4 h-4 text-[#FF5A1F]" />
        </button>
      </div>

      {/* User Info Card */}
      <div className="bg-[#12141D] border border-white/10 rounded-2xl p-6 text-center space-y-4 shadow-xl">
        <div className="relative w-20 h-20 mx-auto">
          <div className="w-20 h-20 bg-[#FF5A1F]/20 border-2 border-[#FF5A1F] rounded-full flex items-center justify-center text-2xl font-black text-[#FF5A1F]">
            {profile.username.substring(0, 2).toUpperCase()}
          </div>
          {profile.installed_pwa && (
            <span className="absolute bottom-0 right-0 bg-[#34D399] text-black text-[10px] font-extrabold px-1.5 py-0.5 rounded-full border border-[#090A0F]">
              PWA
            </span>
          )}
        </div>

        <div>
          <h2 className="text-2xl font-black text-white">{profile.username}</h2>
          <p className="text-xs text-gray-300 font-semibold mt-0.5">Miembro Activo de PACTO</p>
        </div>

        {/* Honor & Shame Stats */}
        <div className="grid grid-cols-2 gap-3 pt-2">
          <div className="bg-[#090A0F] border border-[#34D399]/30 p-4 rounded-xl flex flex-col items-center">
            <Award className="w-6 h-6 text-[#34D399] mb-1" />
            <span className="text-2xl font-black text-[#34D399]">
              {profile.honor_points}
            </span>
            <span className="text-[11px] font-bold text-gray-300 uppercase tracking-wider mt-0.5">
              Puntos de Honor
            </span>
          </div>

          <div className="bg-[#090A0F] border border-[#F87171]/30 p-4 rounded-xl flex flex-col items-center">
            <AlertTriangle className="w-6 h-6 text-[#F87171] mb-1" />
            <span className="text-2xl font-black text-[#F87171]">
              {profile.shame_count}
            </span>
            <span className="text-[11px] font-bold text-gray-300 uppercase tracking-wider mt-0.5">
              Marcas Deshonra
            </span>
          </div>
        </div>
      </div>

      {/* History */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold uppercase tracking-wider text-gray-300 flex items-center space-x-2">
            <History className="w-4 h-4 text-[#FF5A1F]" />
            <span>Historial de Pactos</span>
          </h3>
          <span className="text-xs text-gray-300 font-semibold">{historyPactos.length} pactos</span>
        </div>

        <div className="space-y-2">
          {historyPactos.map((item) => (
            <div
              key={item.id}
              className="bg-[#12141D] border border-white/5 p-4 rounded-xl flex items-center justify-between"
            >
              <div>
                <h4 className="font-bold text-xs text-white">{item.name}</h4>
                <p className="text-xs text-gray-300 mt-0.5">{item.outcome}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Privacy Policy & Data Deletion Modal */}
      {showPrivacyModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50">
          <div className="bg-[#12141D] border border-white/10 p-6 rounded-2xl max-w-sm w-full space-y-4 text-left">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-extrabold text-white flex items-center space-x-2">
                <Shield className="w-5 h-5 text-[#FF5A1F]" />
                <span>Privacidad y Datos</span>
              </h3>
              <button onClick={() => setShowPrivacyModal(false)} className="text-gray-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-gray-300 leading-relaxed">
              PACTO cumple con las normas de privacidad. Tus datos de GPS y evidencias fotográficas se utilizan únicamente para la verificación de pactos con los miembros de tu grupo.
            </p>

            <button
              onClick={() => {
                alert('Solicitud de borrado de cuenta recibida. Tus datos serán eliminados permanentemente.');
                setShowPrivacyModal(false);
              }}
              className="w-full bg-[#F87171]/10 border border-[#F87171] text-[#F87171] font-bold py-2.5 rounded-xl text-xs flex items-center justify-center space-x-2"
            >
              <Trash2 className="w-4 h-4" />
              <span>Solicitar Borrado de Cuenta y Fotos</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
