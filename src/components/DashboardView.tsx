import React, { useEffect } from 'react';
import { Plus, Flame, Clock, Shield, Users, ChevronRight, User, AlertTriangle } from 'lucide-react';
import { Pacto } from '../types/pacto';
import { usePactoStore } from '../usePactoStore';

interface DashboardViewProps {
  onCreatePactoClick: () => void;
  onPactoSelect: (pactoId: string) => void;
  onGroupSelect: (groupId: string) => void;
  onProfileClick: () => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  onCreatePactoClick,
  onPactoSelect,
  onGroupSelect,
  onProfileClick
}) => {
  const { pactos, fetchPactos } = usePactoStore();

  useEffect(() => {
    fetchPactos();
  }, [fetchPactos]);

  // Mock group member status summary for "cumple o asume" workflow
  const groupMembers = [
    { id: '1', name: 'Carlos (Tú)', streak: 5, status: 'on_track', avatar: 'C' },
    { id: '2', name: 'Sofía', streak: 4, status: 'on_track', avatar: 'S' },
    { id: '3', name: 'Mateo', streak: 1, status: 'behind', avatar: 'M' },
    { id: '4', name: 'Elena', streak: 0, status: 'danger', avatar: 'E' }
  ];

  return (
    <div className="min-h-screen bg-[#090A0F] text-[#F3F4F6] p-4 max-w-md mx-auto space-y-6 pb-28">
      {/* Top Bar */}
      <div className="flex items-center justify-between pt-2">
        <div>
          <h1 className="text-2xl font-black tracking-wide text-[#FF5A1F]">PACTO</h1>
          <p className="text-xs text-gray-300 font-semibold">Cumple o asume las consecuencias</p>
        </div>
        <button
          onClick={onProfileClick}
          aria-label="Perfil de usuario"
          className="p-2.5 bg-[#12141D] border border-white/10 rounded-xl hover:border-[#FF5A1F] transition focus-visible:ring-2 focus-visible:ring-[#FF5A1F]"
        >
          <User className="w-5 h-5 text-gray-200" />
        </button>
      </div>

      {/* Member Fulfill or Suffer Status Row */}
      <div className="bg-[#12141D] border border-white/10 p-4 rounded-2xl space-y-3 shadow-xl">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold uppercase tracking-wider text-gray-300 flex items-center space-x-2">
            <Users className="w-4 h-4 text-[#FF5A1F]" />
            <span>Estado de los Miembros</span>
          </h3>
          <span className="text-[11px] font-bold text-[#FF3B5C]">1 En Peligro</span>
        </div>

        <div className="flex items-center justify-between pt-1">
          {groupMembers.map((m) => (
            <div key={m.id} className="flex flex-col items-center space-y-1">
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center font-extrabold text-xs border-2 ${
                  m.status === 'on_track'
                    ? 'border-[#34D399] bg-[#34D399]/10 text-[#34D399]'
                    : m.status === 'behind'
                    ? 'border-[#FBBF24] bg-[#FBBF24]/10 text-[#FBBF24]'
                    : 'border-[#F87171] bg-[#F87171]/10 text-[#F87171]'
                }`}
              >
                {m.avatar}
              </div>
              <span className="text-[11px] font-bold text-gray-200">{m.streak}d 🔥</span>
            </div>
          ))}
        </div>

        {/* Dynamic Action Alert */}
        <div className="bg-[#F87171]/10 border border-[#F87171]/30 p-3 rounded-xl flex items-center space-x-2.5 text-xs text-[#F87171] font-semibold mt-2">
          <AlertTriangle className="w-4 h-4 flex-shrink-0" />
          <span>Vas 1 evidencia atrasado en tu meta. Quedan 3 días para el juicio.</span>
        </div>
      </div>

      {/* Active Pactos Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-gray-300 flex items-center space-x-2">
            <Flame className="w-4 h-4 text-[#FF5A1F]" />
            <span>Pactos Activos</span>
          </h2>
          <span className="text-xs bg-[#FF5A1F]/20 text-[#FF5A1F] px-2.5 py-1 rounded-full font-bold">
            {pactos.filter((p) => p.status === 'active').length} activos
          </span>
        </div>

        {pactos.length === 0 ? (
          <div className="bg-[#12141D] border border-white/10 rounded-2xl p-8 text-center space-y-3">
            <Shield className="w-10 h-10 text-gray-400 mx-auto" />
            <h3 className="text-base font-bold text-gray-200">No tienes pactos activos</h3>
            <p className="text-xs text-gray-300">Crea un pacto con tu grupo de amigos para empezar el reto.</p>
            <button
              onClick={onCreatePactoClick}
              className="mt-2 bg-[#FF5A1F] hover:bg-[#FF5A1F]/90 text-white font-bold text-xs px-4 py-2.5 rounded-xl inline-flex items-center space-x-2"
            >
              <Plus className="w-4 h-4" />
              <span>Crear Primer Pacto</span>
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {pactos.map((pacto) => {
              const radius = 24;
              const circumference = 2 * Math.PI * radius;
              const progressPercentage = 0.65;
              const strokeDashoffset = circumference - progressPercentage * circumference;

              return (
                <div
                  key={pacto.id}
                  onClick={() => onPactoSelect(pacto.id)}
                  className="bg-[#12141D] border border-white/10 hover:border-[#FF5A1F]/50 p-5 rounded-2xl transition cursor-pointer flex items-center justify-between shadow-lg relative overflow-hidden group"
                >
                  <div className="space-y-2 flex-1 pr-4">
                    <div className="flex items-center space-x-2">
                      <span className="text-xl">{pacto.emoji || '🔥'}</span>
                      <h3 className="font-bold text-base group-hover:text-[#FF5A1F] transition">
                        {pacto.name}
                      </h3>
                    </div>

                    <div className="flex items-center space-x-3 text-xs text-gray-300">
                      <span className="bg-[#090A0F] px-2.5 py-1 rounded-lg border border-white/5 font-semibold">
                        Meta: {pacto.target_value} ({pacto.goal_type})
                      </span>
                      <span className="flex items-center space-x-1 text-[#FBBF24] font-semibold">
                        <Clock className="w-3.5 h-3.5" />
                        <span>Quedan 3 días</span>
                      </span>
                    </div>
                  </div>

                  <div className="relative flex items-center justify-center">
                    <svg className="w-14 h-14 transform -rotate-90">
                      <circle
                        cx="28"
                        cy="28"
                        r={radius}
                        stroke="#090A0F"
                        strokeWidth="5"
                        fill="transparent"
                      />
                      <circle
                        cx="28"
                        cy="28"
                        r={radius}
                        stroke="#FF5A1F"
                        strokeWidth="5"
                        strokeDasharray={circumference}
                        strokeDashoffset={strokeDashoffset}
                        strokeLinecap="round"
                        fill="transparent"
                        className="transition-all duration-1000 ease-out"
                      />
                    </svg>
                    <span className="absolute text-[11px] font-black text-white">
                      65%
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Group Navigation Shortcut */}
      <div
        onClick={() => onGroupSelect('g1')}
        className="bg-[#12141D] border border-white/10 p-4 rounded-2xl flex items-center justify-between cursor-pointer hover:border-white/20 transition"
      >
        <div className="flex items-center space-x-3">
          <div className="p-2.5 bg-[#FF5A1F]/10 text-[#FF5A1F] rounded-xl">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <h4 className="font-bold text-sm">Los Inquebrantables</h4>
            <p className="text-xs text-gray-300">4 Miembros · Código: PACTO2025</p>
          </div>
        </div>
        <ChevronRight className="w-5 h-5 text-gray-400" />
      </div>
    </div>
  );
};
