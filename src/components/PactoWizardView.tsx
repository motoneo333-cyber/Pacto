import React, { useState } from 'react';
import { ArrowLeft, Plus, Trash2, Sparkles, CheckCircle2 } from 'lucide-react';
import { GoalType, Frequency, VerificationType } from '../types/pacto';

interface PactoWizardProps {
  groupId: string;
  onClose: () => void;
  onPactoCreated: (newPacto: any) => void;
}

export const PactoWizardView: React.FC<PactoWizardProps> = ({ groupId, onClose, onPactoCreated }) => {
  const [step, setStep] = useState<number>(1);

  // Step 1: Real Custom Goal Config
  const [name, setName] = useState('');
  const [emoji, setEmoji] = useState('🔥');
  const [goalType, setGoalType] = useState<GoalType>('habit');
  const [targetValue, setTargetValue] = useState<number>(5);
  const [frequency, setFrequency] = useState<Frequency>('daily');

  // Step 2: Verification
  const [verificationType, setVerificationType] = useState<VerificationType>('strict_photo');

  // Step 3: Real Punishment Proposals
  const [punishmentBody, setPunishmentBody] = useState('');
  const [punishments, setPunishments] = useState<Array<{ id: string; body: string; approved: boolean }>>([
    { id: '1', body: 'Subir video realizando 50 flexiones en público', approved: true },
    { id: '2', body: 'Invitar el almuerzo al grupo la próxima semana', approved: true }
  ]);

  // Step 4: Digital Signature
  const [signed, setSigned] = useState(false);

  const handleAddPunishment = () => {
    if (punishmentBody.trim().length < 10) {
      alert('El castigo debe tener al menos 10 caracteres (R3)');
      return;
    }
    setPunishments([...punishments, { id: Date.now().toString(), body: punishmentBody.trim(), approved: true }]);
    setPunishmentBody('');
  };

  const handleRemovePunishment = (id: string) => {
    setPunishments(punishments.filter((p) => p.id !== id));
  };

  const handleFinish = () => {
    if (!signed) {
      alert('Debes firmar el pacto para completarlo');
      return;
    }

    const newPacto = {
      id: `pacto-${Date.now()}`,
      group_id: groupId,
      name: name.trim(),
      emoji: emoji || '🔥',
      goal_type: goalType,
      target_value: Number(targetValue),
      frequency,
      verification_type: verificationType,
      status: 'active' as const,
      start_date: new Date().toISOString(),
      end_date: new Date(Date.now() + 7 * 86400000).toISOString()
    };

    onPactoCreated(newPacto);
  };

  return (
    <div className="min-h-screen bg-[#090A0F] text-[#F3F4F6] p-4 max-w-md mx-auto space-y-6 pb-12">
      {/* Top Header */}
      <div className="flex items-center justify-between">
        <button
          onClick={step === 1 ? onClose : () => setStep(step - 1)}
          className="p-2.5 bg-[#12141D] border border-white/10 rounded-xl text-gray-300 hover:text-white"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <span className="text-xs font-bold uppercase tracking-wider text-[#FF5A1F]">
          Paso {step} de 4
        </span>
      </div>

      {/* Progress Bar */}
      <div className="w-full bg-[#12141D] h-1.5 rounded-full overflow-hidden border border-white/5">
        <div
          className="bg-[#FF5A1F] h-full transition-all duration-300"
          style={{ width: `${(step / 4) * 100}%` }}
        />
      </div>

      {/* Step 1: Goal Config */}
      {step === 1 && (
        <div className="space-y-4">
          <h2 className="text-lg font-extrabold text-white">1. Configura tu Meta Real</h2>

          <div className="space-y-3">
            <div>
              <label className="block text-xs font-semibold uppercase text-gray-400 mb-1">Emoji e Identificador</label>
              <div className="flex space-x-2">
                <input
                  type="text"
                  value={emoji}
                  onChange={(e) => setEmoji(e.target.value)}
                  className="w-12 bg-[#12141D] border border-white/10 rounded-xl text-center text-xl p-2.5 text-white"
                />
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="ej: Leer 20 páginas al día"
                  className="flex-1 bg-[#12141D] border border-white/10 rounded-xl px-4 py-2.5 text-sm font-semibold text-white focus:outline-none focus:border-[#FF5A1F]"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase text-gray-400 mb-1">Tipo de Meta (R1)</label>
              <div className="grid grid-cols-3 gap-2">
                {(['habit', 'quantitative', 'abstinence'] as GoalType[]).map((type) => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => {
                      setGoalType(type);
                      if (type === 'abstinence') setFrequency('daily');
                    }}
                    className={`py-2.5 px-2 rounded-xl text-xs font-bold border capitalize transition ${
                      goalType === type
                        ? 'bg-[#FF5A1F]/20 border-[#FF5A1F] text-[#FF5A1F]'
                        : 'bg-[#12141D] border-white/5 text-gray-400'
                    }`}
                  >
                    {type}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase text-gray-400 mb-1">Valor Objetivo (Días / Ocasiones)</label>
              <input
                type="number"
                min="1"
                value={targetValue}
                onChange={(e) => setTargetValue(parseInt(e.target.value) || 1)}
                className="w-full bg-[#12141D] border border-white/10 rounded-xl px-4 py-2.5 text-sm font-bold text-white focus:outline-none focus:border-[#FF5A1F]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase text-gray-400 mb-1">Frecuencia (R2)</label>
              <div className="grid grid-cols-3 gap-2">
                {(['daily', 'weekly', 'x_days_per_week'] as Frequency[]).map((freq) => (
                  <button
                    key={freq}
                    type="button"
                    disabled={goalType === 'abstinence' && freq !== 'daily'}
                    onClick={() => setFrequency(freq)}
                    className={`py-2.5 px-2 rounded-xl text-xs font-bold border capitalize transition ${
                      frequency === freq
                        ? 'bg-[#FF5A1F]/20 border-[#FF5A1F] text-[#FF5A1F]'
                        : 'bg-[#12141D] border-white/5 text-gray-400 disabled:opacity-30'
                    }`}
                  >
                    {freq}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <button
            disabled={!name.trim()}
            onClick={() => setStep(2)}
            className="w-full bg-[#FF5A1F] hover:bg-[#FF5A1F]/90 text-white font-bold py-3.5 rounded-xl disabled:opacity-40 transition shadow-lg"
          >
            Siguiente: Método de Verificación
          </button>
        </div>
      )}

      {/* Step 2: Verification Type */}
      {step === 2 && (
        <div className="space-y-4">
          <h2 className="text-lg font-extrabold text-white">2. Método de Verificación</h2>

          <div className="space-y-3">
            {[
              { id: 'strict_photo', title: 'Foto Estricta en App (MediaDevices)', desc: 'Rechaza fotos de galería (R5). Exige captura con marca de agua y GPS.' },
              { id: 'honor_code', title: 'Código de Honor', desc: 'Basado en la palabra del grupo sin obligar a subir fotografía.' }
            ].map((method) => (
              <div
                key={method.id}
                onClick={() => setVerificationType(method.id as VerificationType)}
                className={`p-4 rounded-xl border cursor-pointer transition ${
                  verificationType === method.id
                    ? 'bg-[#FF5A1F]/20 border-[#FF5A1F]'
                    : 'bg-[#12141D] border-white/5 hover:border-white/20'
                }`}
              >
                <h3 className="font-bold text-sm text-white">{method.title}</h3>
                <p className="text-xs text-gray-400 mt-1">{method.desc}</p>
              </div>
            ))}
          </div>

          <button
            onClick={() => setStep(3)}
            className="w-full bg-[#FF5A1F] hover:bg-[#FF5A1F]/90 text-white font-bold py-3.5 rounded-xl transition shadow-lg"
          >
            Siguiente: Pozo de Castigos
          </button>
        </div>
      )}

      {/* Step 3: Punishments */}
      {step === 3 && (
        <div className="space-y-4">
          <h2 className="text-lg font-extrabold text-white">3. Pozo de Castigos Reales (R3)</h2>
          <p className="text-xs text-gray-400">
            Ingresa castigos reales. Todos deben aprobarlos por unanimidad antes de activar el pacto.
          </p>

          <div className="flex space-x-2">
            <input
              type="text"
              value={punishmentBody}
              onChange={(e) => setPunishmentBody(e.target.value)}
              placeholder="Escribe un castigo tangible..."
              className="flex-1 bg-[#12141D] border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-[#FF5A1F]"
            />
            <button
              onClick={handleAddPunishment}
              className="bg-[#FF5A1F] hover:bg-[#FF5A1F]/90 text-white font-bold px-4 rounded-xl text-xs flex items-center space-x-1"
            >
              <Plus className="w-4 h-4" />
              <span>Añadir</span>
            </button>
          </div>

          <div className="space-y-2">
            {punishments.map((p) => (
              <div key={p.id} className="bg-[#12141D] border border-white/5 p-3 rounded-xl flex items-center justify-between">
                <span className="text-xs font-semibold text-gray-200">{p.body}</span>
                <button
                  onClick={() => handleRemovePunishment(p.id)}
                  className="text-gray-500 hover:text-[#F87171] p-1"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>

          <button
            disabled={punishments.length === 0}
            onClick={() => setStep(4)}
            className="w-full bg-[#FF5A1F] hover:bg-[#FF5A1F]/90 text-white font-bold py-3.5 rounded-xl disabled:opacity-40 transition shadow-lg"
          >
            Siguiente: Ceremonia de Firma
          </button>
        </div>
      )}

      {/* Step 4: Digital Signature */}
      {step === 4 && (
        <div className="space-y-6 text-center">
          <div className="p-5 bg-[#12141D] border border-white/10 rounded-2xl space-y-2 text-left">
            <div className="flex items-center space-x-2 text-[#FF5A1F]">
              <Sparkles className="w-5 h-5" />
              <h2 className="text-base font-extrabold text-white">Acuerdo de Compromiso Real</h2>
            </div>
            <p className="text-xs text-gray-400">
              Al firmar digitalmente, aceptas que si no alcanzas la meta objetivo, la ruleta te asignará de forma aleatoria e inmodificable uno de los castigos acordados.
            </p>
          </div>

          <div
            onClick={() => setSigned(!signed)}
            className={`p-6 rounded-2xl border-2 border-dashed cursor-pointer transition flex flex-col items-center justify-center space-y-2 ${
              signed
                ? 'bg-[#34D399]/10 border-[#34D399] text-[#34D399]'
                : 'bg-[#12141D] border-white/20 hover:border-[#FF5A1F] text-gray-400'
            }`}
          >
            <CheckCircle2 className="w-10 h-10" />
            <span className="font-extrabold text-sm">
              {signed ? '¡PACTO FIRMADO Y REGISTRADO!' : 'Toca aquí para Firmar Digitalmente'}
            </span>
          </div>

          <button
            disabled={!signed}
            onClick={handleFinish}
            className="w-full bg-[#FF5A1F] hover:bg-[#FF5A1F]/90 text-white font-extrabold py-4 rounded-xl disabled:opacity-40 shadow-xl transition"
          >
            Activar Pacto Real Ahora
          </button>
        </div>
      )}
    </div>
  );
};
