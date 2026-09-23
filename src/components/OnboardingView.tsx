import React, { useState, useEffect } from 'react';
import { Smartphone, Bell, ShieldCheck, Mail, LogIn, ArrowRight } from 'lucide-react';

interface OnboardingProps {
  onLoginSuccess: (user: { id: string; username: string }) => void;
}

export const OnboardingView: React.FC<OnboardingProps> = ({ onLoginSuccess }) => {
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [installPrompt, setInstallPrompt] = useState<any>(null);
  const [isIOS, setIsIOS] = useState(false);
  const [showIOSModal, setShowIOSModal] = useState(false);
  const [pushStatus, setPushStatus] = useState<string>('prompt');

  useEffect(() => {
    // Check iOS Safari
    const userAgent = window.navigator.userAgent.toLowerCase();
    const isIosDevice = /iphone|ipad|ipod/.test(userAgent);
    setIsIOS(isIosDevice);

    // Listen for PWA installation prompt
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setInstallPrompt(e);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
  }, []);

  const handleInstallClick = () => {
    if (isIOS) {
      setShowIOSModal(true);
    } else if (installPrompt) {
      installPrompt.prompt();
      installPrompt.userChoice.then(() => {
        setInstallPrompt(null);
      });
    } else {
      alert('La app ya está instalada o el navegador no soporta instalación directa.');
    }
  };

  const handlePushPermission = async () => {
    if ('Notification' in window) {
      const permission = await Notification.requestPermission();
      setPushStatus(permission);
    } else {
      alert('Las notificaciones Push no están soportadas en este navegador.');
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || username.length < 3) {
      alert('El nombre de usuario debe tener al menos 3 caracteres');
      return;
    }
    // Simulate login/register
    onLoginSuccess({ id: 'user-demo-id', username });
  };

  return (
    <div className="min-h-screen bg-[#0A0A0F] text-[#F5F5F7] flex flex-col justify-between p-6 max-w-md mx-auto">
      {/* Header Branding */}
      <div className="mt-8 text-center space-y-3">
        <h1 className="text-5xl font-extrabold tracking-wider text-[#FF5A1F]">PACTO</h1>
        <p className="text-[#F5F5F7]/80 text-sm font-medium">
          Cumple o asume las consecuencias.
        </p>
      </div>

      {/* Main Card */}
      <div className="bg-[#16161E] p-6 rounded-2xl border border-white/10 space-y-6 shadow-xl my-6">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider mb-2 text-gray-400">
              Nombre de usuario
            </label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="ej: carlos_fit"
              className="w-full bg-[#0A0A0F] border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[#FF5A1F] transition"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider mb-2 text-gray-400">
              Correo electrónico (Magic Link / OAuth)
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-3.5 h-5 w-5 text-gray-500" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="tu@email.com"
                className="w-full bg-[#0A0A0F] border border-white/10 rounded-xl pl-10 pr-4 py-3 text-white focus:outline-none focus:border-[#FF5A1F] transition"
                required
              />
            </div>
          </div>

          <button
            type="submit"
            className="w-full bg-[#FF5A1F] hover:bg-[#FF5A1F]/90 font-bold py-3.5 rounded-xl text-white flex items-center justify-center space-x-2 transition transform active:scale-95"
          >
            <span>Ingresar a PACTO</span>
            <ArrowRight className="w-5 h-5" />
          </button>
        </form>

        <div className="border-t border-white/10 pt-4 space-y-3">
          {/* Custom PWA Install Button (Always visible on iOS as mandated) */}
          <button
            onClick={handleInstallClick}
            className="w-full bg-[#16161E] border border-[#FF5A1F] text-[#FF5A1F] hover:bg-[#FF5A1F]/10 font-medium py-3 rounded-xl flex items-center justify-center space-x-2 transition"
          >
            <Smartphone className="w-5 h-5" />
            <span>Instalar Aplicación (PWA)</span>
          </button>

          {/* Push notification setup */}
          <button
            onClick={handlePushPermission}
            className="w-full bg-[#0A0A0F] border border-white/10 text-gray-300 hover:text-white font-medium py-2.5 rounded-xl text-xs flex items-center justify-center space-x-2 transition"
          >
            <Bell className="w-4 h-4 text-[#B4F461]" />
            <span>
              {pushStatus === 'granted'
                ? 'Notificaciones Push Activadas ✓'
                : 'Activar Notificaciones Push'}
            </span>
          </button>
        </div>
      </div>

      {/* iOS Safari A2HS Modal */}
      {showIOSModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50">
          <div className="bg-[#16161E] border border-[#FF5A1F] p-6 rounded-2xl max-w-sm w-full space-y-4 text-center">
            <Smartphone className="w-12 h-12 text-[#FF5A1F] mx-auto" />
            <h3 className="text-xl font-bold">Instalar PACTO en iOS</h3>
            <p className="text-sm text-gray-300">
              Para agregar PACTO a tu pantalla de inicio en iOS Safari:
            </p>
            <ol className="text-left text-xs space-y-2 text-gray-400 bg-[#0A0A0F] p-3 rounded-xl border border-white/5">
              <li>1. Toca el botón <strong>Compartir</strong> en la barra inferior.</li>
              <li>2. Selecciona <strong>"Añadir a pantalla de inicio"</strong>.</li>
              <li>3. Toca <strong>Añadir</strong> arriba a la derecha.</li>
            </ol>
            <button
              onClick={() => setShowIOSModal(false)}
              className="w-full bg-[#FF5A1F] text-white font-bold py-2.5 rounded-xl"
            >
              Entendido
            </button>
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="text-center text-xs text-gray-500 pb-2">
        Al continuar aceptas los pactos y consecuencias con tu grupo.
      </div>
    </div>
  );
};
