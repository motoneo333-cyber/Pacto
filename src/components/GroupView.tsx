import React, { useState } from 'react';
import { ArrowLeft, Users, Plus, Edit2, Share2, Copy, CheckCircle, ShieldCheck, UserPlus, Trash2 } from 'lucide-react';
import QRCode from 'qrcode';
import { Group } from '../types/pacto';
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
  const [groupName, setGroupName] = useState(currentGroup.name);
  const [groupEmoji, setGroupEmoji] = useState(currentGroup.emoji || '🛡️');
  const [copied, setCopied] = useState(false);

  const inviteUrl = `https://pacto.app/grupo/unirse?code=${currentGroup.invite_code}`;

  const handleSaveGroup = () => {
    updateGroup(currentGroup.id, { name: groupName, emoji: groupEmoji });
    setIsEditing(false);
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(inviteUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="min-h-screen bg-[#090A0F] text-[#F3F4F6] p-4 max-w-md mx-auto space-y-6 pb-12">
      {/* Top Header */}
      <div className="flex items-center justify-between">
        <button
          onClick={onBack}
          className="p-2.5 bg-[#12141D] border border-white/10 rounded-xl text-gray-300 hover:text-white"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <span className="text-xs font-semibold uppercase tracking-wider text-gray-400">
          Gestión de Grupo
        </span>
        <button
          onClick={() => setIsEditing(!isEditing)}
          className="p-2.5 bg-[#12141D] border border-white/10 rounded-xl text-gray-300 hover:text-white"
        >
          <Edit2 className="w-4 h-4 text-[#FF5A1F]" />
        </button>
      </div>

      {/* Group Info Header */}
      <div className="bg-[#12141D] border border-white/10 p-6 rounded-2xl space-y-4 shadow-xl">
        {!isEditing ? (
          <div className="flex items-center space-x-4">
            <div className="w-14 h-14 bg-[#FF5A1F]/10 border border-[#FF5A1F]/30 rounded-2xl flex items-center justify-center text-2xl">
              {currentGroup.emoji || '🛡️'}
            </div>
            <div>
              <h1 className="text-xl font-extrabold">{currentGroup.name}</h1>
              <p className="text-xs text-gray-400 mt-0.5">Código de Invitación: <span className="font-mono text-white">{currentGroup.invite_code}</span></p>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400">Editar Grupo</h3>
            <div className="flex space-x-2">
              <input
                type="text"
                value={groupEmoji}
                onChange={(e) => setGroupEmoji(e.target.value)}
                className="w-12 bg-[#090A0F] border border-white/10 rounded-xl text-center text-xl p-2"
              />
              <input
                type="text"
                value={groupName}
                onChange={(e) => setGroupName(e.target.value)}
                className="flex-1 bg-[#090A0F] border border-white/10 rounded-xl px-4 py-2.5 text-sm font-bold text-white focus:outline-none focus:border-[#FF5A1F]"
              />
            </div>
            <button
              onClick={handleSaveGroup}
              className="w-full bg-[#FF5A1F] text-white font-bold py-2.5 rounded-xl text-xs"
            >
              Guardar Cambios
            </button>
          </div>
        )}
      </div>

      {/* Invite Link Section */}
      <div className="bg-[#12141D] border border-white/10 p-5 rounded-2xl space-y-3 shadow-xl">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-400 flex items-center space-x-2">
            <Share2 className="w-4 h-4 text-[#FF5A1F]" />
            <span>Enlace de Invitación</span>
          </h3>
        </div>

        <button
          onClick={handleCopyLink}
          className="w-full bg-[#090A0F] border border-white/10 hover:border-[#FF5A1F] text-xs font-bold py-3 rounded-xl flex items-center justify-center space-x-2 transition"
        >
          {copied ? <CheckCircle className="w-4 h-4 text-[#34D399]" /> : <Copy className="w-4 h-4 text-[#FF5A1F]" />}
          <span>{copied ? '¡Enlace Copiado!' : 'Copiar Enlace para Unirse'}</span>
        </button>
      </div>

      {/* Group Members List */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-400 flex items-center space-x-2">
            <Users className="w-4 h-4 text-[#FF5A1F]" />
            <span>Miembros del Grupo (4)</span>
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
              <span className="text-[10px] font-semibold bg-white/5 px-2 py-0.5 rounded text-gray-400 border border-white/5">
                {m.role}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
