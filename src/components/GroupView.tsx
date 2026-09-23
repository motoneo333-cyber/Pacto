import React, { useState, useEffect } from 'react';
import { ArrowLeft, Users, QrCode, Share2, DollarSign, Plus, CheckCircle, Copy } from 'lucide-react';
import QRCode from 'qrcode';

interface GroupViewProps {
  groupId: string;
  onBack: () => void;
}

export const GroupView: React.FC<GroupViewProps> = ({ groupId, onBack }) => {
  const [qrCanvasUrl, setQrCanvasUrl] = useState<string>('');
  const [copied, setCopied] = useState(false);

  const inviteCode = 'PACTO2025';
  const inviteUrl = `https://pacto.app/grupo/unirse?code=${inviteCode}`;

  useEffect(() => {
    QRCode.toDataURL(inviteUrl, { margin: 1, color: { dark: '#FF5A1F', light: '#16161E' } })
      .then((url) => setQrCanvasUrl(url))
      .catch((err) => console.error(err));
  }, [inviteUrl]);

  const handleCopyLink = () => {
    navigator.clipboard.writeText(inviteUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Kitty (bote contable) records - Rule R8
  const [kittyEntries, setKittyEntries] = useState([
    { id: 'k1', username: 'Carlos', amount: 20, reason: 'Deuda por evidencia fallida', settled: false },
    { id: 'k2', username: 'Sofía', amount: 15, reason: 'Aporte acuerdo común', settled: true }
  ]);

  const toggleSettleKitty = (id: string) => {
    setKittyEntries((prev) =>
      prev.map((k) => (k.id === id ? { ...k, settled: !k.settled } : k))
    );
  };

  return (
    <div className="min-h-screen bg-[#0A0A0F] text-[#F5F5F7] p-4 max-w-md mx-auto space-y-6 pb-12">
      {/* Top Bar */}
      <div className="flex items-center space-x-3">
        <button
          onClick={onBack}
          className="p-2 bg-[#16161E] border border-white/10 rounded-xl text-gray-300 hover:text-white"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-xl font-bold">Los Inquebrantables</h1>
          <p className="text-xs text-gray-400">4 Miembros Activos</p>
        </div>
      </div>

      {/* Invite Link & QR Section */}
      <div className="bg-[#16161E] border border-white/10 p-5 rounded-2xl space-y-4 shadow-xl">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-400 flex items-center space-x-2">
            <Share2 className="w-4 h-4 text-[#FF5A1F]" />
            <span>Invitación al Grupo</span>
          </h3>
          <span className="text-xs font-mono bg-[#0A0A0F] text-[#FF5A1F] px-2 py-1 rounded border border-[#FF5A1F]/30">
            {inviteCode}
          </span>
        </div>

        {qrCanvasUrl && (
          <div className="flex justify-center p-2 bg-[#16161E] rounded-xl border border-white/5">
            <img src={qrCanvasUrl} alt="QR Invitación" className="w-36 h-36 rounded-lg" />
          </div>
        )}

        <button
          onClick={handleCopyLink}
          className="w-full bg-[#0A0A0F] border border-white/10 hover:border-[#FF5A1F] text-xs font-bold py-3 rounded-xl flex items-center justify-center space-x-2 transition"
        >
          {copied ? <CheckCircle className="w-4 h-4 text-[#B4F461]" /> : <Copy className="w-4 h-4 text-[#FF5A1F]" />}
          <span>{copied ? '¡Enlace Copiado!' : 'Copiar Enlace de Invitación'}</span>
        </button>
      </div>

      {/* Kitty Accounting Ledger (Bote Contable) - Rule R8 */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold uppercase tracking-wider text-gray-400 flex items-center space-x-2">
            <DollarSign className="w-4 h-4 text-[#FFC53D]" />
            <span>Bote Contable (Kitty R8)</span>
          </h3>
          <span className="text-xs text-gray-500">Sin dinero real</span>
        </div>

        <div className="bg-[#16161E] border border-white/10 rounded-2xl p-4 space-y-3">
          {kittyEntries.map((item) => (
            <div
              key={item.id}
              className="bg-[#0A0A0F] border border-white/5 p-3 rounded-xl flex items-center justify-between"
            >
              <div>
                <p className="text-xs font-bold text-white">
                  {item.username} debe <span className="text-[#FFC53D]">${item.amount}</span>
                </p>
                <p className="text-[10px] text-gray-400">{item.reason}</p>
              </div>
              <button
                onClick={() => toggleSettleKitty(item.id)}
                className={`text-[10px] font-bold px-3 py-1.5 rounded-lg border transition ${
                  item.settled
                    ? 'bg-[#B4F461]/20 border-[#B4F461] text-[#B4F461]'
                    : 'bg-white/5 border-white/10 text-gray-400 hover:text-white'
                }`}
              >
                {item.settled ? 'Pagado ✓' : 'Marcar Pagado'}
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
