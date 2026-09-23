import React from 'react';
import { Plus, Flame, Clock, Shield, Users, ChevronRight, User } from 'lucide-react';
import { Pacto } from '../types/pacto';

interface DashboardViewProps {
  pactos: Pacto[];
  onCreatePactoClick: () => void;
  onPactoSelect: (pactoId: string) => void;
  onGroupSelect: (groupId: string) => void;
  onProfileClick: () => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  pactos,
  onCreatePactoClick,
  onPactoSelect,
  onGroupSelect,
  onProfileClick
}) => {
  return (
    <div className="min-h-screen bg-[#0A0A0F] text-[#F5F5F7] p-4 max-w-md mx-auto space-y-6 pb-24">
      {/* Top Bar */}
      <div className="flex items-center justify-between pt-2">
        <div>
          <h1 className="text-2xl font-black tracking-wide text-[#FF5A1F]">PACTO</h1>
          <p className="text-xs text-gray-400">Panel de Control</p>
        </div>
        <button
          onClick={onProfileClick}
          className="p-2.5 bg-[#16161E] border border-white/10 rounded-xl hover:border-[#FF5A1F] transition"
        >
          <User className="w-5 h-5 text-gray-200" />
        </button>
      </div>

      {/* Active Pactos Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-gray-400 flex items-center space-x-2">
            <Flame className="w-4 h-4 text-[#FF5A1F]" />
            <span>Pactos Activos</span>
          </h2>
          <span className="text-xs bg-[#FF5A1F]/20 text-[#FF5A1F] px-2 py-0.5 rounded-full font-bold">
            {pactos.filter((p) => p.status === 'active').length} activos
          </span>
        </div>

        {pactos.length === 0 ? (
          <div className="bg-[#16161E] border border-white/10 rounded-2xl p-8 text-center space-y-3">
            <Shield className="w-10 h-10 text-gray-500 mx-auto" />
            <h3 className="text-base font-bold text-gray-300">No tienes pactos activos</h3>
            <p className="text-xs text-gray-500">Crea un pacto con tu grupo de amigos para empezar el reto.</p>
            <button
              onClick={onCreatePactoClick}
              className="mt-2 bg-[#FF5A1F] text-white font-bold text-xs px-4 py-2.5 rounded-xl inline-flex items-center space-x-2"
            >
              <Plus className="w-4 h-4" />
              <span>Crear Primer Pacto</span>
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {pactos.map((pacto) => {
              // Animated SVG Progress Ring calculation
              const radius = 24;
              const circumference = 2 * Math.PI * radius;
              const progressPercentage = 0.65; // Demo progress
              const strokeDashoffset = circumference - progressPercentage * circumference;

              return (
                <div
                  key={pacto.id}
                  onClick={() => onPactoSelect(pacto.id)}
                  className="bg-[#16161E] border border-white/10 hover:border-[#FF5A1F]/50 p-5 rounded-2xl transition cursor-pointer flex items-center justify-between shadow-lg relative overflow-hidden group"
                >
                  <div className="space-y-2 flex-1 pr-4">
                    <div className="flex items-center space-x-2">
                      <span className="text-xl">{pacto.emoji || '🔥'}</span>
                      <h3 className="font-bold text-base group-hover:text-[#FF5A1F] transition">
                        {pacto.name}
                      </h3>
                    </div>

                    <div className="flex items-center space-x-3 text-xs text-gray-400">
                      <span className="bg-[#0A0A0F] px-2.5 py-1 rounded-lg border border-white/5 font-medium">
                        Meta: {pacto.target_value} ({pacto.goal_type})
                      </span>
                      <span className="flex items-center space-x-1 text-[#FFC53D]">
                        <Clock className="w-3.5 h-3.5" />
                        <span>Quedan 3 días</span>
                      </span>
                    </div>
                  </div>

                  {/* Circular Animated SVG Progress */}
                  <div className="relative flex items-center justify-center">
                    <svg className="w-14 h-14 transform -rotate-90">
                      <circle
                        cx="28"
                        cy="28"
                        r={radius}
                        stroke="#0A0A0F"
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
        onClick={() => onGroupSelect('group-demo-id')}
        className="bg-[#16161E] border border-white/10 p-4 rounded-2xl flex items-center justify-between cursor-pointer hover:border-white/20 transition"
      >
        <div className="flex items-center space-x-3">
          <div className="p-2.5 bg-[#FF5A1F]/10 text-[#FF5A1F] rounded-xl">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <h4 className="font-bold text-sm">Los Inquebrantables</h4>
            <p className="text-xs text-gray-400">4 Miembros · Código: PACTO2025</p>
          </div>
        </div>
        <ChevronRight className="w-5 h-5 text-gray-500" />
      </div>

      {/* Floating Action Button (+ Pacto) */}
      <button
        onClick={onCreatePactoClick}
        className="fixed bottom-6 right-6 bg-[#FF5A1F] text-white p-4 rounded-full shadow-2xl flex items-center space-x-2 font-bold hover:scale-105 active:scale-95 transition z-40 border-2 border-black"
      >
        <Plus className="w-6 h-6" />
        <span className="pr-1 text-sm font-extrabold">Nuevo Pacto</span>
      </button>
    </div>
  );
};
