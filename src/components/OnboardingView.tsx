import React, { useState } from 'react';
import { Mail, ArrowRight, Globe } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';

export const OnboardingView: React.FC = () => {
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleMagicLink = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);
    setErrorMsg(null);
    const clean = username.trim().toLowerCase();
    if (!/^[a-z0-9_]{3,20}$/.test(clean)) {
      setErrorMsg('El usuario debe tener 3-20 caracteres: letras minúsculas, números o _');
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: { emailRedirectTo: window.location.origin, data: { username: clean } }
    });
    setLoading(false);
    if (error) setErrorMsg(error.message);
    else setMessage('¡Enlace mágico enviado! Revisa tu correo y ábrelo en este dispositivo.');
  };

  const handleGoogle = async () => {
    setErrorMsg(null);
    const { error } = await supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: window.location.origin } });
    if (error) setErrorMsg(error.message);
  };

  return (
    <div className="min-h-screen bg-[#090A0F] text-[#F3F4F6] flex flex-col justify-center p-6 max-w-md mx-auto space-y-6">
      <div className="text-center space-y-3">
        <h1 className="text-5xl font-black tracking-wider text-[#FF5A1F]">PACTO</h1>
        <p className="text-gray-300 text-sm font-semibold">Cumple o asume las consecuencias.</p>
      </div>

      <div className="bg-[#12141D] p-6 rounded-2xl border border-white/10 space-y-5 shadow-xl">
        {message && (
          <div role="status" className="p-3 bg-[#34D399]/10 border border-[#34D399] rounded-xl text-xs text-[#34D399] font-bold">{message}</div>
        )}
        {errorMsg && (
          <div role="alert" className="p-3 bg-[#F87171]/10 border border-[#F87171] rounded-xl text-xs text-[#F87171] font-bold">{errorMsg}</div>
        )}

        <form onSubmit={handleMagicLink} className="space-y-4">
          <div>
            <label htmlFor="username" className="block text-xs font-semibold uppercase tracking-wider mb-2 text-gray-300">Nombre de usuario</label>
            <input
              id="username" type="text" value={username} onChange={(e) => setUsername(e.target.value)} placeholder="ej: carlos_fit" required
              className="w-full bg-[#090A0F] border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-[#FF5A1F]"
            />
          </div>
          <div>
            <label htmlFor="email" className="block text-xs font-semibold uppercase tracking-wider mb-2 text-gray-300">Correo electrónico</label>
            <input
              id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="tu@correo.com" required
              className="w-full bg-[#090A0F] border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-[#FF5A1F]"
            />
          </div>
          <button
            type="submit" disabled={loading}
            className="w-full bg-[#FF5A1F] text-white font-extrabold py-3.5 rounded-xl flex items-center justify-center space-x-2 disabled:opacity-50 min-h-[44px]"
          >
            <Mail className="w-4 h-4" />
            <span>{loading ? 'Enviando…' : 'Entrar con enlace mágico'}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        <div className="flex items-center space-x-3 text-xs text-gray-400"><div className="flex-1 h-px bg-white/10" /><span>o</span><div className="flex-1 h-px bg-white/10" /></div>

        <button
          type="button" onClick={handleGoogle}
          className="w-full bg-[#090A0F] border border-white/10 hover:border-white/30 text-gray-100 font-bold py-3 rounded-xl text-sm flex items-center justify-center space-x-2 min-h-[44px]"
        >
          <Globe className="w-4 h-4" />
          <span>Continuar con Google</span>
        </button>
      </div>

      <p className="text-center text-xs text-gray-400">
        Al entrar aceptas las <a href="/terminos" className="underline">condiciones</a> y la <a href="/privacidad" className="underline">política de privacidad</a>: tus fotos y ubicación se usan solo para verificar pactos con tu grupo.
      </p>
    </div>
  );
};
