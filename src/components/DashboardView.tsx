import React from 'react';
import { Plus, Flame, Clock, Shield, Users, ChevronRight, User, AlertTriangle, FileText, Scale } from 'lucide-react';
import { useSession } from '../lib/session';
import { useActiveGroup, usePactos, useStandings } from '../lib/hooks';
import { daysLeft, paceStatus, progressRatio } from '../lib/pactoMath';

interface DashboardViewProps {
  onCreatePactoClick: () => void;
  onPactoSelect: (pactoId: string) => void;
  onGroupSelect: (groupId: string) => void;
  onProfileClick: () => void;
}

const PACE_STYLE = {
  ok: 'border-[#34D399] bg-[#34D399]/10 text-[#34D399]',
  behind: 'border-[#FBBF24] bg-[#FBBF24]/10 text-[#FBBF24]',
  danger: 'border-[#F87171] bg-[#F87171]/10 text-[#F87171]'
} as const;

export const DashboardView: React.FC<DashboardViewProps> = ({ onCreatePactoClick, onPactoSelect, onGroupSelect, onProfileClick }) => {
  const { user } = useSession();
  const { active: group, isLoading: loadingGroups } = useActiveGroup();
  const { data: allPactos = [], isLoading: loadingPactos } = usePactos();
  const { data: standings = [] } = useStandings();

  const pactos = allPactos.filter((p) => !group || p.group_id === group.id);
  const drafts = pactos.filter((p) => p.status === 'draft');
  const active = pactos.filter((p) => p.status === 'active');
  const judging = pactos.filter((p) => p.status === 'judging');
  const mine = (pactoId: string) => standings.find((s) => s.pacto_id === pactoId && s.user_id === user?.id);
  const owedJudgement = judging.filter((p) => mine(p.id) && !mine(p.id)!.met);

  const focus = active[0];
  const focusStandings = focus ? standings.filter((s) => s.pacto_id === focus.id) : [];
  const dangerCount = focus ? focusStandings.filter((s) => paceStatus(s.approved, s.target, focus.start_date, focus.end_date) === 'danger').length : 0;
  const myFocus = focus ? mine(focus.id) : undefined;
  const missing = focus && myFocus ? Math.max(0, myFocus.target - myFocus.approved) : 0;

  if (loadingGroups || loadingPactos) {
    return <div className="min-h-screen flex items-center justify-center text-gray-300 text-sm">Cargando…</div>;
  }

  return (
    <div className="min-h-screen bg-[#090A0F] text-[#F3F4F6] p-4 max-w-md mx-auto space-y-6 pb-28">
      <div className="flex items-center justify-between pt-2">
        <div>
          <h1 className="text-2xl font-black tracking-wide text-[#FF5A1F]">PACTO</h1>
          <p className="text-xs text-gray-300 font-semibold">{group ? `${group.emoji ?? ''} ${group.name}` : 'Cumple o asume las consecuencias'}</p>
        </div>
        <button onClick={onProfileClick} aria-label="Perfil de usuario" className="p-2.5 bg-[#12141D] border border-white/10 rounded-xl hover:border-[#FF5A1F] transition focus-visible:ring-2 focus-visible:ring-[#FF5A1F]">
          <User className="w-5 h-5 text-gray-200" />
        </button>
      </div>

      {!group && (
        <div className="bg-[#12141D] border border-white/10 rounded-2xl p-8 text-center space-y-3">
          <Users className="w-10 h-10 text-gray-400 mx-auto" />
          <h3 className="text-base font-bold text-gray-200">Primero, un grupo</h3>
          <p className="text-xs text-gray-300">Los pactos se hacen entre amigos. Crea un grupo o únete con un código de invitación.</p>
          <button onClick={() => onGroupSelect('nuevo')} className="mt-2 bg-[#FF5A1F] text-white font-bold text-xs px-4 py-2.5 rounded-xl min-h-[44px]">
            Crear o unirme a un grupo
          </button>
        </div>
      )}

      {owedJudgement.map((p) => (
        <button key={p.id} onClick={() => onPactoSelect(p.id)} className="w-full text-left bg-[#F87171]/10 border border-[#F87171] p-4 rounded-2xl flex items-center space-x-3">
          <Scale className="w-5 h-5 text-[#F87171] flex-shrink-0" />
          <span className="text-xs font-bold text-[#F87171]">No cumpliste “{p.name}”. Te toca girar la ruleta.</span>
        </button>
      ))}

      {focus && (
        <div className="bg-[#12141D] border border-white/10 p-4 rounded-2xl space-y-3 shadow-xl">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-wider text-gray-300 flex items-center space-x-2">
              <Users className="w-4 h-4 text-[#FF5A1F]" />
              <span>Estado de los miembros · {focus.name}</span>
            </h3>
            {dangerCount > 0 && <span className="text-[11px] font-bold text-[#F87171]">{dangerCount} en peligro</span>}
          </div>
          <div className="flex items-start justify-around pt-1 flex-wrap gap-y-3">
            {focusStandings.map((m) => {
              const st = paceStatus(m.approved, m.target, focus.start_date, focus.end_date);
              return (
                <div key={m.user_id} className="flex flex-col items-center space-y-1 w-16">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center font-extrabold text-xs border-2 ${PACE_STYLE[st]}`}>
                    {m.username.slice(0, 1).toUpperCase()}
                  </div>
                  <span className="text-[11px] font-bold text-gray-200 truncate max-w-full">{m.user_id === user?.id ? 'Tú' : m.username}</span>
                  <span className="text-[11px] text-gray-300">{m.approved}/{m.target}</span>
                </div>
              );
            })}
          </div>
          {missing > 0 && (
            <div className="bg-[#FBBF24]/10 border border-[#FBBF24]/30 p-3 rounded-xl flex items-center space-x-2.5 text-xs text-[#FBBF24] font-semibold">
              <AlertTriangle className="w-4 h-4 flex-shrink-0" />
              <span>Te faltan {missing} evidencia(s) aprobadas. Quedan {daysLeft(focus.end_date)} día(s).</span>
            </div>
          )}
        </div>
      )}

      {drafts.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-xs font-bold uppercase tracking-wider text-[#FBBF24] flex items-center space-x-2">
            <FileText className="w-4 h-4" />
            <span>Pactos pendientes de firma o voto</span>
          </h2>
          {drafts.map((dp) => (
            <button key={dp.id} onClick={() => onPactoSelect(dp.id)} className="w-full text-left bg-[#12141D] border border-[#FBBF24]/30 hover:border-[#FBBF24] p-4 rounded-2xl flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <span className="text-xl">{dp.emoji || '📝'}</span>
                <div>
                  <h4 className="font-bold text-xs text-white">{dp.name}</h4>
                  <p className="text-[11px] text-gray-300 font-semibold">Necesita firma y castigo aprobado por todos</p>
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-[#FBBF24]" />
            </button>
          ))}
        </div>
      )}

      {group && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-gray-300 flex items-center space-x-2">
              <Flame className="w-4 h-4 text-[#FF5A1F]" />
              <span>Pactos activos</span>
            </h2>
            <span className="text-xs bg-[#FF5A1F]/20 text-[#FF5A1F] px-2.5 py-1 rounded-full font-bold">{active.length} activos</span>
          </div>

          {active.length === 0 ? (
            <div className="bg-[#12141D] border border-white/10 rounded-2xl p-8 text-center space-y-3">
              <Shield className="w-10 h-10 text-gray-400 mx-auto" />
              <h3 className="text-base font-bold text-gray-200">No tienes pactos activos</h3>
              <p className="text-xs text-gray-300">Crea un pacto con tu grupo para empezar el reto.</p>
              <button onClick={onCreatePactoClick} className="mt-2 bg-[#FF5A1F] text-white font-bold text-xs px-4 py-2.5 rounded-xl inline-flex items-center space-x-2 min-h-[44px]">
                <Plus className="w-4 h-4" />
                <span>Crear primer pacto</span>
              </button>
            </div>
          ) : (
            active.map((pacto) => {
              const s = mine(pacto.id);
              const ratio = s ? progressRatio(s.approved, s.target) : 0;
              const r = 24;
              const c = 2 * Math.PI * r;
              return (
                <button key={pacto.id} onClick={() => onPactoSelect(pacto.id)} className="w-full text-left bg-[#12141D] border border-white/10 hover:border-[#FF5A1F]/50 p-5 rounded-2xl transition flex items-center justify-between shadow-lg">
                  <div className="space-y-2 flex-1 pr-4">
                    <div className="flex items-center space-x-2">
                      <span className="text-xl">{pacto.emoji || '🔥'}</span>
                      <h3 className="font-bold text-base">{pacto.name}</h3>
                    </div>
                    <div className="flex items-center flex-wrap gap-2 text-xs text-gray-300">
                      <span className="bg-[#090A0F] px-2.5 py-1 rounded-lg border border-white/5 font-semibold">{s?.approved ?? 0}/{pacto.target_value} aprobadas</span>
                      <span className="flex items-center space-x-1 text-[#FBBF24] font-semibold">
                        <Clock className="w-3.5 h-3.5" />
                        <span>Quedan {daysLeft(pacto.end_date)} día(s)</span>
                      </span>
                    </div>
                  </div>
                  <div className="relative flex items-center justify-center">
                    <svg className="w-14 h-14 transform -rotate-90" aria-hidden="true">
                      <circle cx="28" cy="28" r={r} stroke="#090A0F" strokeWidth="5" fill="transparent" />
                      <circle cx="28" cy="28" r={r} stroke="#FF5A1F" strokeWidth="5" strokeDasharray={c} strokeDashoffset={c - ratio * c} strokeLinecap="round" fill="transparent" className="transition-all duration-1000 ease-out" />
                    </svg>
                    <span className="absolute text-[11px] font-black text-white">{Math.round(ratio * 100)}%</span>
                  </div>
                </button>
              );
            })
          )}
        </div>
      )}

      {group && (
        <button onClick={() => onGroupSelect(group.id)} className="w-full text-left bg-[#12141D] border border-white/10 p-4 rounded-2xl flex items-center justify-between hover:border-white/20 transition">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 bg-[#FF5A1F]/10 text-[#FF5A1F] rounded-xl"><Users className="w-5 h-5" /></div>
            <div>
              <h4 className="font-bold text-sm">{group.name}</h4>
              <p className="text-xs text-gray-300">Código: <span className="font-mono">{group.invite_code}</span></p>
            </div>
          </div>
          <ChevronRight className="w-5 h-5 text-gray-400" />
        </button>
      )}
    </div>
  );
};
