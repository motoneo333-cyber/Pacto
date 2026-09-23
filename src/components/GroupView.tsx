import React, { useState } from 'react';
import { ArrowLeft, Users, Edit2, Share2, Copy, CheckCircle, UserPlus, LogIn } from 'lucide-react';
import { usePactoStore } from '../usePactoStore';

interface GroupViewProps {
  groupId: string;
  onBack: () => void;
}

export const GroupView: React.FC<GroupViewProps> = ({ groupId, onBack }) => {
  const { groups, updateGroup, addGroup } = usePactoStore();

  const currentGroup = groups.find((g) => g.id === groupId) || groups[0] || {
    id: 'g1',
    name: 'Los Inquebrantables',
    emoji: '🛡️',
    invite_code: 'PACTO2025',
    created_by: 'user-demo-id'
  };

  const [isEditing, setIsEditing] = useState(false);
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [joinCodeInput, setJoinCodeInput] = useState('');
  const [groupName, setGroupName] = useState(currentGroup.name);
  const [groupEmoji, setGroupEmoji] = useState(currentGroup.emoji || '🛡️');
  const [copied, setCopied] = useState(false);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const inviteUrl = `https://pacto.app/grupo/unirse?code=${currentGroup.invite_code}`;

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3000);
  };

  const handleSaveGroup = () => {
    updateGroup(currentGroup.id, { name: groupName, emoji: groupEmoji });
    setIsEditing(false);
    showToast('¡Grupo actualizado correctamente!');
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(inviteUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleJoinByCode = () => {
    if (!joinCodeInput.trim()) return;
    const newGroup = {
      id: `g-${Date.now()}`,
      name: `Grupo ${joinCodeInput.toUpperCase()}`,
      emoji: '🔥',
      invite_code: joinCodeInput.toUpperCase(),
      created_by: 'user-demo-id'
    };
    addGroup(newGroup);
    setShowJoinModal(false);
    setJoinCodeInput('');
    showToast(`¡Te has unido al grupo ${newGroup.name}!`);
  };

  return (
    <div className="min-h-screen bg-[#090A0F] text-[#F3F4F6] p-4 max-w-md mx-auto space-y-6 pb-28">
      {/* Top Header */}
      <div className="flex items-center justify-between">
        <button
          onClick={onBack}
          aria-label="Volver"
          className="p-2.5 bg-[#12141D] border border-white/10 rounded-xl text-gray-300 hover:text-white focus-visible:ring-2 focus-visible:ring-[#FF5A1F]"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <span className="text-xs font-bold uppercase tracking-wider text-gray-300">
          Gestión de Grupo
        </span>
        <button
          onClick={() => setIsEditing(!isEditing)}
          aria-label="Editar grupo"
          className="p-2.5 bg-[#12141D] border border-white/10 rounded-xl text-gray-300 hover:text-white focus-visible:ring-2 focus-visible:ring-[#FF5A1F]"
        >
          <Edit2 className="w-4 h-4 text-[#FF5A1F]" />
        </button>
      </div>

      {toastMsg && (
        <div className="p-3 bg-[#34D399]/10 border border-[#34D399] rounded-xl text-xs text-[#34D399] font-bold">
          {toastMsg}
        </div>
      )}

      {/* Group Info Header */}
      <div className="bg-[#12141D] border border-white/10 p-6 rounded-2xl space-y-4 shadow-xl">
        {!isEditing ? (
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="w-14 h-14 bg-[#FF5A1F]/10 border border-[#FF5A1F]/30 rounded-2xl flex items-center justify-center text-2xl">
                {currentGroup.emoji || '🛡️'}
              </div>
              <div>
                <h1 className="text-xl font-extrabold text-white">{currentGroup.name}</h1>
                <p className="text-xs text-gray-300 font-medium mt-0.5">Código: <span className="font-mono text-white font-bold">{currentGroup.invite_code}</span></p>
              </div>
            </div>
            <button
              onClick={() => setShowJoinModal(true)}
              className="p-2.5 bg-[#FF5A1F]/10 border border-[#FF5A1F]/30 rounded-xl text-[#FF5A1F] hover:bg-[#FF5A1F]/20 text-xs font-bold flex items-center space-x-1"
            >
              <UserPlus className="w-4 h-4" />
              <span>Unirse</span>
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-gray-300">Editar Grupo</h3>
            <div className="flex space-x-2">
              <input
                type="text"
                value={groupEmoji}
                onChange={(e) => setGroupEmoji(e.target.value)}
                className="w-12 bg-[#090A0F] border border-white/10 rounded-xl text-center text-xl p-2.5 text-white"
              />
              <input
                type="text"
                value={groupName}
                onChange={(e) => setGroupName(e.target.value)}
                className="flex-1 bg-[#090A0F] border border-white/10 rounded-xl px-4 py-2.5 text-xs font-bold text-white focus:outline-none focus:border-[#FF5A1F]"
              />
            </div>
            <button
              onClick={handleSaveGroup}
              className="w-full bg-[#FF5A1F] hover:bg-[#FF5A1F]/90 text-white font-bold py-2.5 rounded-xl text-xs min-h-[44px]"
            >
              Guardar Cambios
            </button>
          </div>
        )}
      </div>

      {/* Invite Link Section */}
      <div className="bg-[#12141D] border border-white/10 p-5 rounded-2xl space-y-3 shadow-xl">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold uppercase tracking-wider text-gray-300 flex items-center space-x-2">
            <Share2 className="w-4 h-4 text-[#FF5A1F]" />
            <span>Enlace de Invitación Unico</span>
          </h3>
        </div>

        <button
          onClick={handleCopyLink}
          className="w-full bg-[#090A0F] border border-white/10 hover:border-[#FF5A1F] text-xs font-bold py-3.5 rounded-xl flex items-center justify-center space-x-2 transition min-h-[44px]"
        >
          {copied ? <CheckCircle className="w-4 h-4 text-[#34D399]" /> : <Copy className="w-4 h-4 text-[#FF5A1F]" />}
          <span>{copied ? '¡Enlace Copiado!' : 'Copiar Enlace para Unirse'}</span>
        </button>
      </div>

      {/* Members List */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold uppercase tracking-wider text-gray-300 flex items-center space-x-2">
            <Users className="w-4 h-4 text-[#FF5A1F]" />
            <span>Miembros Reales del Grupo (4)</span>
          </h3>
        </div>

        <div className="bg-[#12141D] border border-white/10 rounded-2xl p-4 space-y-2">
          {[
            { id: 'm1', name: 'Carlos (Tú)', role: 'Admin' },
            { id: 'm2', name: 'Sofía R.', role: 'Miembro' },
            { id: 'm3', name: 'Mateo V.', role: 'Miembro' },
            { id: 'm4', name: 'Elena G.', role: 'Miembro' }
          ].map((m) => (
            <div key={m.id} className="bg-[#090A0F] border border-white/5 p-3 rounded-xl flex items-center justify-between">
              <span className="text-xs font-bold text-white">{m.name}</span>
              <span className="text-[11px] font-bold bg-white/5 px-2 py-0.5 rounded text-gray-300 border border-white/5">
                {m.role}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Join Group Modal */}
      {showJoinModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50">
          <div className="bg-[#12141D] border border-white/10 p-6 rounded-2xl max-w-sm w-full space-y-4">
            <h3 className="text-base font-extrabold text-white flex items-center space-x-2">
              <LogIn className="w-5 h-5 text-[#FF5A1F]" />
              <span>Unirse a Grupo por Código</span>
            </h3>
            <p className="text-xs text-gray-300">
              Ingresa el código alfanumérico de 8 caracteres generado por el creador del grupo.
            </p>

            <input
              type="text"
              maxLength={8}
              value={joinCodeInput}
              onChange={(e) => setJoinCodeInput(e.target.value)}
              placeholder="ej: PACTO2025"
              className="w-full bg-[#090A0F] border border-white/10 rounded-xl px-4 py-3 text-xs font-mono font-bold text-center text-white focus:outline-none focus:border-[#FF5A1F] uppercase tracking-widest"
            />

            <div className="flex space-x-2 pt-2">
              <button
                onClick={() => setShowJoinModal(false)}
                className="flex-1 bg-[#090A0F] border border-white/10 text-gray-300 font-bold py-2.5 rounded-xl text-xs min-h-[44px]"
              >
                Cancelar
              </button>
              <button
                onClick={handleJoinByCode}
                className="flex-1 bg-[#FF5A1F] hover:bg-[#FF5A1F]/90 text-white font-bold py-2.5 rounded-xl text-xs min-h-[44px]"
              >
                Unirse
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
