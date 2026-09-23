import React, { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Users, Edit2, Share2, Copy, CheckCircle, UserPlus, Plus } from 'lucide-react';
import { api } from '../lib/api';
import { useSession } from '../lib/session';
import { useToast } from '../lib/toast';
import { useActiveGroup, useGroupMembers } from '../lib/hooks';

interface GroupViewProps {
  groupId?: string; // 'nuevo' o undefined = sin grupo elegido
  onBack: () => void;
  onGroupChosen: (id: string) => void;
}

export const GroupView: React.FC<GroupViewProps> = ({ groupId, onBack, onGroupChosen }) => {
  const { user } = useSession();
  const toast = useToast();
  const qc = useQueryClient();
  const { groups, active, setActive } = useActiveGroup();
  const group = groups.find((g) => g.id === groupId) ?? (groupId === 'nuevo' ? null : active);
  const { data: members = [] } = useGroupMembers(group?.id);

  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState('');
  const [emoji, setEmoji] = useState('🛡️');
  const [joinCode, setJoinCode] = useState('');
  const [copied, setCopied] = useState(false);
  const [busy, setBusy] = useState(false);

  const amAdmin = members.some((m) => m.user_id === user?.id && m.role === 'admin');
  const inviteText = group ? `Únete a mi grupo en PACTO con el código ${group.invite_code} — ${window.location.origin}/grupo/unirse?code=${group.invite_code}` : '';

  const run = async (fn: () => Promise<void>) => {
    setBusy(true);
    try { await fn(); } catch (e) { toast((e as Error).message, 'error'); } finally { setBusy(false); }
  };

  const handleCreate = () => run(async () => {
    const g = await api.createGroup(name, emoji);
    await qc.invalidateQueries({ queryKey: ['groups'] });
    setActive(g.id);
    setName('');
    toast(`Grupo “${g.name}” creado. Comparte el código ${g.invite_code}`);
    onGroupChosen(g.id);
  });

  const handleJoin = () => run(async () => {
    const g = await api.joinGroup(joinCode);
    await qc.invalidateQueries({ queryKey: ['groups'] });
    setActive(g.id);
    setJoinCode('');
    toast(`Te uniste a ${g.name}`);
    onGroupChosen(g.id);
  });

  const handleSave = () => run(async () => {
    await api.updateGroup(group!.id, { name, emoji });
    await qc.invalidateQueries({ queryKey: ['groups'] });
    setIsEditing(false);
    toast('Grupo actualizado');
  });

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(inviteText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch { toast('No se pudo copiar. Copia el código a mano.', 'error'); }
  };

  const field = 'bg-[#090A0F] border border-white/10 rounded-xl px-4 py-2.5 text-sm font-bold text-white focus:outline-none focus:border-[#FF5A1F]';
  const btn = 'w-full bg-[#FF5A1F] text-white font-bold py-2.5 rounded-xl text-xs min-h-[44px] disabled:opacity-50';

  return (
    <div className="min-h-screen bg-[#090A0F] text-[#F3F4F6] p-4 max-w-md mx-auto space-y-6 pb-28">
      <div className="flex items-center justify-between">
        <button onClick={onBack} aria-label="Volver" className="p-2.5 bg-[#12141D] border border-white/10 rounded-xl text-gray-300 hover:text-white focus-visible:ring-2 focus-visible:ring-[#FF5A1F]">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <span className="text-xs font-bold uppercase tracking-wider text-gray-300">Grupo</span>
        {group && amAdmin ? (
          <button onClick={() => { setName(group.name); setEmoji(group.emoji ?? '🛡️'); setIsEditing(!isEditing); }} aria-label="Editar grupo" className="p-2.5 bg-[#12141D] border border-white/10 rounded-xl focus-visible:ring-2 focus-visible:ring-[#FF5A1F]">
            <Edit2 className="w-4 h-4 text-[#FF5A1F]" />
          </button>
        ) : <span className="w-10" />}
      </div>

      {group && (
        <>
          <div className="bg-[#12141D] border border-white/10 p-6 rounded-2xl space-y-4 shadow-xl">
            {!isEditing ? (
              <div className="flex items-center space-x-4">
                <div className="w-14 h-14 bg-[#FF5A1F]/10 border border-[#FF5A1F]/30 rounded-2xl flex items-center justify-center text-2xl">{group.emoji || '🛡️'}</div>
                <div>
                  <h1 className="text-xl font-extrabold text-white">{group.name}</h1>
                  <p className="text-xs text-gray-300 font-medium mt-0.5">Código: <span className="font-mono text-white font-bold">{group.invite_code}</span></p>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex space-x-2">
                  <input aria-label="Emoji" value={emoji} onChange={(e) => setEmoji(e.target.value)} className={`w-14 text-center text-xl ${field}`} />
                  <input aria-label="Nombre del grupo" value={name} onChange={(e) => setName(e.target.value)} className={`flex-1 ${field}`} />
                </div>
                <button onClick={handleSave} disabled={busy} className={btn}>Guardar cambios</button>
              </div>
            )}
          </div>

          <div className="bg-[#12141D] border border-white/10 p-5 rounded-2xl space-y-3 shadow-xl">
            <h3 className="text-xs font-bold uppercase tracking-wider text-gray-300 flex items-center space-x-2">
              <Share2 className="w-4 h-4 text-[#FF5A1F]" /><span>Invitar amigos</span>
            </h3>
            <button onClick={handleCopy} className="w-full bg-[#090A0F] border border-white/10 hover:border-[#FF5A1F] text-xs font-bold py-3.5 rounded-xl flex items-center justify-center space-x-2 min-h-[44px]">
              {copied ? <CheckCircle className="w-4 h-4 text-[#34D399]" /> : <Copy className="w-4 h-4 text-[#FF5A1F]" />}
              <span>{copied ? '¡Copiado!' : 'Copiar invitación'}</span>
            </button>
          </div>

          <div className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-gray-300 flex items-center space-x-2">
              <Users className="w-4 h-4 text-[#FF5A1F]" /><span>Miembros ({members.length})</span>
            </h3>
            <div className="bg-[#12141D] border border-white/10 rounded-2xl p-4 space-y-2">
              {members.map((m) => (
                <div key={m.user_id} className="bg-[#090A0F] border border-white/5 p-3 rounded-xl flex items-center justify-between">
                  <span className="text-xs font-bold text-white">{m.username}{m.user_id === user?.id ? ' (tú)' : ''}</span>
                  <span className="text-[11px] font-bold bg-white/5 px-2 py-0.5 rounded text-gray-300 border border-white/5">{m.role === 'admin' ? 'Admin' : 'Miembro'}</span>
                </div>
              ))}
            </div>
          </div>

          {groups.length > 1 && (
            <div className="space-y-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-gray-300">Mis grupos</h3>
              {groups.map((g) => (
                <button key={g.id} onClick={() => { setActive(g.id); onGroupChosen(g.id); }} className={`w-full text-left p-3 rounded-xl border text-xs font-bold ${g.id === group.id ? 'border-[#FF5A1F] text-[#FF5A1F]' : 'border-white/10 text-gray-200'} bg-[#12141D]`}>
                  {g.emoji} {g.name}
                </button>
              ))}
            </div>
          )}
        </>
      )}

      <div className="bg-[#12141D] border border-white/10 p-5 rounded-2xl space-y-3 shadow-xl">
        <h3 className="text-xs font-bold uppercase tracking-wider text-gray-300 flex items-center space-x-2"><Plus className="w-4 h-4 text-[#FF5A1F]" /><span>Crear un grupo nuevo</span></h3>
        <div className="flex space-x-2">
          <input aria-label="Emoji del grupo" value={emoji} onChange={(e) => setEmoji(e.target.value)} className={`w-14 text-center text-xl ${field}`} />
          <input aria-label="Nombre del grupo nuevo" value={name} onChange={(e) => setName(e.target.value)} placeholder="Nombre del grupo" className={`flex-1 ${field}`} />
        </div>
        <button onClick={handleCreate} disabled={busy || name.trim().length < 2} className={btn}>Crear grupo</button>
      </div>

      <div className="bg-[#12141D] border border-white/10 p-5 rounded-2xl space-y-3 shadow-xl">
        <h3 className="text-xs font-bold uppercase tracking-wider text-gray-300 flex items-center space-x-2"><UserPlus className="w-4 h-4 text-[#FF5A1F]" /><span>Unirme con un código</span></h3>
        <input aria-label="Código de invitación" maxLength={8} value={joinCode} onChange={(e) => setJoinCode(e.target.value.toUpperCase())} placeholder="CÓDIGO" className={`w-full text-center font-mono tracking-widest ${field}`} />
        <button onClick={handleJoin} disabled={busy || joinCode.trim().length < 4} className={btn}>Unirme</button>
      </div>
    </div>
  );
};
