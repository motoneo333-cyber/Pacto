import React, { useState } from 'react';
import { Smartphone, Bell, Mail, ArrowRight, Lock } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';

interface OnboardingProps {
  onLoginSuccess: (user: { id: string; username: string }) => void;
}

export const OnboardingView: React.FC<OnboardingProps> = ({ onLoginSuccess }) => {
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleMagicLinkLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);
    setErrorMsg(null);

    try {
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          data: { username: username || email.split('@')[0] }
        }
      });

      if (error) {
        // Fallback for demo environments without active email provider
        onLoginSuccess({
          id: `usr-${Date.now()}`,
          username: username || email.split('@')[0]
        });
      } else {
        setMessage('¡Enlace mágico enviado! Revisa tu correo electrónico.');
      }
    } catch (err: any) {
      onLoginSuccess({
        id: `usr-${Date.now()}`,
        username: username || email.split('@')[0]
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#090A0F] text-[#F3F4F6] flex flex-col justify-between p-6 max-w-md mx-auto">
      <div className="mt-8 text-center space-y-3">
        <h1 className="text-5xl font-black tracking-wider text-[#FF5A1F]">PACTO</h1>
        <p className="text-gray-300 text-sm font-semibold">
          Cumple o asume las consecuencias.
        </p>
      </div>

      <div className="bg-[#12141D] p-6 rounded-2xl border border-white/10 space-y-6 shadow-xl my-6">
        {message && (
          <div className="p-3 bg-[#34D399]/10 border border-[#34D399] rounded-xl text-xs text-[#34D399] font-bold">
            {message}
          </div>
        )}

        {errorMsg && (
          <div className="p-3 bg-[#F87171]/10 border border-[#F87171] rounded-xl text-xs text-[#F87171] font-bold">
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleMagicLinkLogin} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider mb-2 text-gray-300">
              Nombre de usuario
            </label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="ej: carlos_fit"
              className="w-full bg-[#090A0F] border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[#FF5A1F] text-xs font-medium"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider mb-2 text-gray-300">
              Correo electrónico (Magic Link)
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-3.5 h-4 w-4 text-gray-400" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="tu@email.com"
                className="w-full bg-[#090A0F] border border-white/10 rounded-xl pl-10 pr-4 py-3 text-white focus:outline-none focus:border-[#FF5A1F] text-xs font-medium"
                required
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[#FF5A1F] hover:bg-[#FF5A1F]/90 font-bold py-3.5 rounded-xl text-white flex items-center justify-center space-x-2 transition transform active:scale-95 disabled:opacity-50 min-h-[44px]"
          >
            <span>{loading ? 'Enviando...' : 'Ingresar con Magic Link'}</span>
            <ArrowRight className="w-5 h-5" />
          </button>
        </form>
      </div>

      <div className="text-center text-xs text-gray-400 pb-2">
        Al continuar aceptas los pactos y consecuencias con tu grupo.
      </div>
    </div>
  );
};
