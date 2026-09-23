import React, { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Award, AlertTriangle, History, ArrowLeft, Shield, Trash2, X, Lock, LogOut, Bell, Pencil } from 'lucide-react';
import { api } from '../lib/api';
import { useSession } from '../lib/session';
import { useToast } from '../lib/toast';
import { usePactos, useStandings } from '../lib/hooks';
import { enablePush, pushSupported } from '../lib/push';

export const ProfileView: React.FC<{ onBack: () => void }> = ({ onBack }) => {
  const { user, profile, signOut } = useSession();
  const toast = useToast();
  const qc = useQueryClient();
  const { data: pactos = [] } = usePactos();
  const { data: standings = [] } = useStandings();
  const [showPrivacy, setShowPrivacy] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);

  if (!profile || !user) return null;

  const history = pactos
    .filter((p) => p.status === 'judging' || p.status === 'completed')
    .map((p) => ({ pacto: p, s: standings.find((x) => x.pacto_id === p.id && x.user_id === user.id) }))
    .filter((x) => x.s);

  const saveName = async () => {
    try {
      await api.updateProfile(user.id, { username: name.trim().toLowerCase() });
      await qc.invalidateQueries({ queryKey: ['profile'] });
      setEditing(false);
      toast('Nombre actualizado');
    } catch (e) { toast((e as Error).message, 'error'); }
  };

  const notifications = async () => {
    try { await enablePush(user.id); toast('Notificaciones activadas'); }
    catch (e) { toast((e as Error).message, 'error'); }
  };

  const deleteAccount = async () => {
    setBusy(true);
    try {
      await api.deleteAccount(user.id);
      await signOut();
    } catch (e) {
      toast((e as Error).message, 'error');
      setBusy(false);
    }
  };

  const iconBtn = 'p-2.5 bg-[#12141D] border border-white/10 rounded-xl text-gray-300 hover:text-white focus-visible:ring-2 focus-visible:ring-[#FF5A1F]';

  return (
    <div className="min-h-screen bg-[#090A0F] text-[#F3F4F6] p-4 max-w-md mx-auto space-y-6 pb-28">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <button onClick={onBack} aria-label="Volver" className={iconBtn}><ArrowLeft className="w-5 h-5" /></button>
          <h1 className="text-lg font-bold text-white">Perfil de honor</h1>
        </div>
        <button onClick={() => setShowPrivacy(true)} aria-label="Privacidad y datos" className={iconBtn}><Lock className="w-4 h-4 text-[#FF5A1F]" /></button>
      </div>

      <div className="bg-[#12141D] border border-white/10 rounded-2xl p-6 text-center space-y-4 shadow-xl">
        <div className="w-20 h-20 mx-auto bg-[#FF5A1F]/20 border-2 border-[#FF5A1F] rounded-full flex items-center justify-center text-2xl font-black text-[#FF5A1F]">
          {profile.username.slice(0, 2).toUpperCase()}
        </div>
        {editing ? (
          <div className="flex space-x-2">
            <input aria-label="Nuevo nombre de usuario" value={name} onChange={(e) => setName(e.target.value)} className="flex-1 bg-[#090A0F] border border-white/10 rounded-xl px-3 py-2 text-sm text-white" />
            <button onClick={saveName} className="px-4 bg-[#FF5A1F] rounded-xl text-xs font-bold min-h-[44px]">Guardar</button>
          </div>
        ) : (
          <div>
            <h2 className="text-2xl font-black text-white">{profile.username}</h2>
            <button onClick={() => { setName(profile.username); setEditing(true); }} className="text-xs text-gray-300 inline-flex items-center space-x-1 mt-1"><Pencil className="w-3 h-3" /><span>Cambiar nombre</span></button>
          </div>
        )}
        <div className="grid grid-cols-2 gap-3 pt-2">
          <div className="bg-[#090A0F] border border-[#34D399]/30 p-4 rounded-xl flex flex-col items-center">
            <Award className="w-6 h-6 text-[#34D399] mb-1" /><span className="text-2xl font-black text-[#34D399]">{profile.honor_points}</span>
            <span className="text-[11px] font-bold text-gray-300 uppercase tracking-wider mt-0.5">Puntos de honor</span>
          </div>
          <div className="bg-[#090A0F] border border-[#F87171]/30 p-4 rounded-xl flex flex-col items-center">
            <AlertTriangle className="w-6 h-6 text-[#F87171] mb-1" /><span className="text-2xl font-black text-[#F87171]">{profile.shame_count}</span>
            <span className="text-[11px] font-bold text-gray-300 uppercase tracking-wider mt-0.5">Marcas de deshonra</span>
          </div>
        </div>
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold uppercase tracking-wider text-gray-300 flex items-center space-x-2"><History className="w-4 h-4 text-[#FF5A1F]" /><span>Historial</span></h3>
          <span className="text-xs text-gray-300 font-semibold">{history.length} pactos</span>
        </div>
        {history.length === 0 && <div className="bg-[#12141D] border border-white/5 p-4 rounded-xl text-xs text-gray-300">Aún no has terminado ningún pacto.</div>}
        {history.map(({ pacto, s }) => (
          <div key={pacto.id} className="bg-[#12141D] border border-white/5 p-4 rounded-xl">
            <h4 className="font-bold text-xs text-white">{pacto.emoji} {pacto.name}</h4>
            <p className={`text-xs mt-0.5 font-semibold ${s!.met ? 'text-[#34D399]' : 'text-[#F87171]'}`}>{s!.met ? `Cumplido (${s!.approved}/${s!.target}) · +10 honor` : `Fallado (${s!.approved}/${s!.target})`}</p>
          </div>
        ))}
      </div>

      <div className="space-y-2">
        {pushSupported() && (
          <button onClick={notifications} className="w-full bg-[#12141D] border border-white/10 text-gray-100 font-bold py-3 rounded-xl text-xs flex items-center justify-center space-x-2 min-h-[44px]"><Bell className="w-4 h-4 text-[#FF5A1F]" /><span>Activar notificaciones</span></button>
        )}
        <button onClick={signOut} className="w-full bg-[#12141D] border border-white/10 text-gray-100 font-bold py-3 rounded-xl text-xs flex items-center justify-center space-x-2 min-h-[44px]"><LogOut className="w-4 h-4" /><span>Cerrar sesión</span></button>
      </div>

      {showPrivacy && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50" role="dialog" aria-modal="true" aria-label="Privacidad y datos">
          <div className="bg-[#12141D] border border-white/10 p-6 rounded-2xl max-w-sm w-full space-y-4 text-left">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-extrabold text-white flex items-center space-x-2"><Shield className="w-5 h-5 text-[#FF5A1F]" /><span>Privacidad y datos</span></h3>
              <button onClick={() => { setShowPrivacy(false); setConfirmDelete(false); }} aria-label="Cerrar" className="text-gray-400 hover:text-white"><X className="w-5 h-5" /></button>
            </div>
            <p className="text-xs text-gray-300 leading-relaxed">
              Guardamos tu correo, tu nombre de usuario, tus fotos de evidencia y su ubicación GPS. Solo los miembros de tus pactos pueden verlas. Puedes borrar todo cuando quieras.
            </p>
            {!confirmDelete ? (
              <button onClick={() => setConfirmDelete(true)} className="w-full bg-[#F87171]/10 border border-[#F87171] text-[#F87171] font-bold py-2.5 rounded-xl text-xs flex items-center justify-center space-x-2 min-h-[44px]">
                <Trash2 className="w-4 h-4" /><span>Borrar mi cuenta y mis fotos</span>
              </button>
            ) : (
              <div className="space-y-2">
                <p className="text-xs text-[#F87171] font-bold">Esto es permanente: se borran tu cuenta, tus fotos y tus votos.</p>
                <button disabled={busy} onClick={deleteAccount} className="w-full bg-[#F87171] text-white font-extrabold py-2.5 rounded-xl text-xs min-h-[44px] disabled:opacity-50">{busy ? 'Borrando…' : 'Sí, borrar todo'}</button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
