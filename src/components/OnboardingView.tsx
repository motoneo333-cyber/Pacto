import React, { useState, useEffect } from 'react';
import { Mail, ArrowRight, Globe } from 'lucide-react';
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

  useEffect(() => {
    const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session?.user) {
        const userId = session.user.id;
        const userUsername =
          session.user.user_metadata?.username ||
          username ||
          session.user.email?.split('@')[0] ||
          'usuario_pacto';

        // Upsert dynamic profile record into Supabase
        await supabase.from('profiles').upsert(
          {
            id: userId,
            username: userUsername,
            avatar_url: session.user.user_metadata?.avatar_url || null,
            installed_pwa: true
          },
          { onConflict: 'id' }
        );

        onLoginSuccess({ id: userId, username: userUsername });
      }
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, [username, onLoginSuccess]);

  const handleMagicLinkLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);
    setErrorMsg(null);

    try {
      const cleanUsername = username.trim().toLowerCase() || email.split('@')[0];
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: window.location.origin,
          data: { username: cleanUsername }
        }
      });

      if (error) {
        setErrorMsg(error.message);
        // Fallback for offline or non-connected database environments
        const fallbackId = `user-${Date.now()}`;
        onLoginSuccess({ id: fallbackId, username: cleanUsername });
      } else {
        setMessage('¡Enlace mágico enviado! Revisa tu correo electrónico.');
      }
    } catch (err: any) {
      const cleanUsername = username.trim().toLowerCase() || email.split('@')[0];
      onLoginSuccess({ id: `user-${Date.now()}`, username: cleanUsername });
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: window.location.origin
        }
      });
      if (error) setErrorMsg(error.message);
    } catch (err: any) {
      setErrorMsg(err.message || 'Error al conectar con Google');
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

        <button
          type="button"
          onClick={handleGoogleLogin}
          disabled={loading}
          className="w-full bg-white text-black font-bold py-3.5 rounded-xl flex items-center justify-center space-x-2 transition transform active:scale-95 disabled:opacity-50 min-h-[44px]"
        >
          <Globe className="w-5 h-5 text-red-500" />
          <span>Continuar con Google</span>
        </button>

        <div className="flex items-center space-x-2 my-2">
          <div className="flex-1 h-px bg-white/10"></div>
          <span className="text-xs text-gray-400 font-semibold uppercase">o con email</span>
          <div className="flex-1 h-px bg-white/10"></div>
        </div>

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
