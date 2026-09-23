import React, { useRef, useState, useEffect } from 'react';
import { ArrowLeft, Scale, AlertCircle } from 'lucide-react';
import confetti from 'canvas-confetti';
import { Pacto, Punishment } from '../types/pacto';
import { supabase } from '../lib/supabaseClient';

interface JudgementCeremonyProps {
  pacto: Pacto;
  onBack: () => void;
}

export const JudgementCeremonyView: React.FC<JudgementCeremonyProps> = ({ pacto, onBack }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [isSpinning, setIsSpinning] = useState(false);
  const [selectedPunishment, setSelectedPunishment] = useState<Punishment | null>(null);
  const [hasRevealed, setHasRevealed] = useState(false);
  const [auditSeed, setAuditSeed] = useState<string>('seed_93f82a_17112000');

  const punishments: Punishment[] = [
    { id: '1', pacto_id: pacto.id, proposed_by: 'u1', body: 'Subir video cantando ópera en la calle', category: 'embarrassment', severity: 4 },
    { id: '2', pacto_id: pacto.id, proposed_by: 'u2', body: 'Invitar café y donuts a todo el grupo', category: 'money', severity: 2 },
    { id: '3', pacto_id: pacto.id, proposed_by: 'u3', body: 'Limpiar la cocina completa por 1 semana', category: 'service', severity: 3 },
    { id: '4', pacto_id: pacto.id, proposed_by: 'u4', body: 'Poner foto de perfil vergonzosa por 48 horas', category: 'embarrassment', severity: 5 }
  ];

  const drawRouletteWheel = (angle: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    const centerX = width / 2;
    const centerY = height / 2;
    const radius = Math.min(width, height) / 2 - 15;

    ctx.clearRect(0, 0, width, height);

    const sliceAngle = (2 * Math.PI) / punishments.length;
    const colors = ['#FF5A1F', '#12141D', '#FFC53D', '#2A2A38'];

    for (let i = 0; i < punishments.length; i++) {
      const startAngle = angle + i * sliceAngle;
      const endAngle = startAngle + sliceAngle;

      ctx.beginPath();
      ctx.moveTo(centerX, centerY);
      ctx.arc(centerX, centerY, radius, startAngle, endAngle);
      ctx.closePath();

      ctx.fillStyle = colors[i % colors.length];
      ctx.fill();
      ctx.strokeStyle = '#090A0F';
      ctx.lineWidth = 4;
      ctx.stroke();

      ctx.save();
      ctx.translate(centerX, centerY);
      ctx.rotate(startAngle + sliceAngle / 2);
      ctx.textAlign = 'right';
      ctx.fillStyle = '#FFFFFF';
      ctx.font = 'bold 12px Space Grotesk, sans-serif';
      const text = punishments[i].body.substring(0, 18) + '...';
      ctx.fillText(text, radius - 15, 4);
      ctx.restore();
    }

    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI);
    ctx.strokeStyle = '#FF5A1F';
    ctx.lineWidth = 6;
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(centerX, centerY, 18, 0, 2 * Math.PI);
    ctx.fillStyle = '#090A0F';
    ctx.fill();
    ctx.strokeStyle = '#FFFFFF';
    ctx.lineWidth = 3;
    ctx.stroke();
  };

  useEffect(() => {
    drawRouletteWheel(0);
  }, []);

  const spinRoulette = async () => {
    if (isSpinning) return;

    setIsSpinning(true);
    setHasRevealed(false);
    setSelectedPunishment(null);

    let seedToUse = `seed_${Date.now()}_audit`;
    try {
      const { data } = await supabase.functions.invoke('pick-sentence', {
        body: { pactoId: pacto.id }
      });
      if (data?.seed) {
        seedToUse = data.seed;
      }
    } catch (err) {
      console.warn('Edge Function fallback: generated deterministic seed locally');
    }
    setAuditSeed(seedToUse);

    // Rule R4 Deterministic Index derived from seed
    let hash = 0;
    for (let i = 0; i < seedToUse.length; i++) {
      hash = (hash << 5) - hash + seedToUse.charCodeAt(i);
      hash |= 0;
    }
    const selectedIndex = Math.abs(hash) % punishments.length;
    const chosenPunishment = punishments[selectedIndex];

    const totalSpinDuration = 5000;
    const startTime = performance.now();
    const totalRotation = Math.PI * 2 * 6 + (selectedIndex * (Math.PI * 2 / punishments.length));

    const animate = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / totalSpinDuration, 1);

      const easeOutProgress = 1 - Math.pow(1 - progress, 3);
      const currentAngle = easeOutProgress * totalRotation;

      drawRouletteWheel(currentAngle);

      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        setIsSpinning(false);
        setHasRevealed(true);
        setSelectedPunishment(chosenPunishment);

        if ('navigator' in window && 'vibrate' in navigator) {
          navigator.vibrate([200, 100, 200]);
        }

        confetti({
          particleCount: 80,
          spread: 70,
          origin: { y: 0.6 }
        });
      }
    };

    requestAnimationFrame(animate);
  };

  return (
    <div className="min-h-screen bg-[#090A0F] text-[#F3F4F6] p-4 max-w-md mx-auto space-y-6 pb-12 text-center">
      <div className="flex items-center justify-between">
        <button
          onClick={onBack}
          className="p-2 bg-[#12141D] border border-white/10 rounded-xl text-gray-300"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex items-center space-x-1 text-[#FFC53D]">
          <Scale className="w-5 h-5" />
          <span className="font-extrabold text-sm uppercase tracking-wider">Ceremonia de Juicio</span>
        </div>
      </div>

      <div className="space-y-1">
        <h1 className="text-2xl font-black text-white">{pacto.name}</h1>
        <p className="text-xs text-gray-400">
          La fecha límite ha vencido. La ruleta asignará el castigo aleatorio e inmodificable (R4).
        </p>
      </div>

      <div className="relative flex flex-col items-center justify-center my-4">
        <div className="w-0 h-0 border-l-[12px] border-l-transparent border-r-[12px] border-r-transparent border-t-[20px] border-t-[#F87171] z-20 -mb-3 shadow-lg" />

        <canvas
          ref={canvasRef}
          width={300}
          height={300}
          className="rounded-full shadow-2xl bg-[#12141D] border-4 border-white/10"
        />
      </div>

      <button
        disabled={isSpinning}
        onClick={spinRoulette}
        className="w-full bg-[#FF5A1F] hover:bg-[#FF5A1F]/90 text-white font-black py-4 rounded-2xl shadow-xl transition transform active:scale-95 disabled:opacity-50 text-base"
      >
        {isSpinning ? 'GIRANDO LA RULETA...' : 'GIRAR RULETA DE LA JUSTICIA 🎰'}
      </button>

      {hasRevealed && selectedPunishment && (
        <div className="bg-[#12141D] border-2 border-[#F87171] p-5 rounded-2xl space-y-3 shadow-2xl text-left animate-fade-in">
          <div className="flex items-center space-x-2 text-[#F87171]">
            <AlertCircle className="w-5 h-5" />
            <h3 className="font-extrabold text-sm uppercase tracking-wider">Sentencia Asignada (48h Deadline)</h3>
          </div>

          <p className="text-lg font-extrabold text-white">
            "{selectedPunishment.body}"
          </p>

          <div className="text-xs text-gray-400 space-y-1 pt-1 border-t border-white/10 font-mono">
            <div>Categoría: <span className="text-white uppercase">{selectedPunishment.category}</span></div>
            <div>Severidad: <span className="text-[#FFC53D]">{selectedPunishment.severity} / 5</span></div>
            <div>Semilla de Auditoría (R4): <span className="text-gray-300 font-bold">{auditSeed}</span></div>
          </div>
        </div>
      )}
    </div>
  );
};
