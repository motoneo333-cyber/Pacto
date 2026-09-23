import React, { useState } from 'react';
import { ArrowLeft, Check, Lock, ShieldAlert, Sparkles, CheckCircle2 } from 'lucide-react';
import { GoalType, Frequency, VerificationType } from '../types/pacto';

interface PactoWizardProps {
  groupId: string;
  onClose: () => void;
  onPactoCreated: (newPacto: any) => void;
}

export const PactoWizardView: React.FC<PactoWizardProps> = ({ groupId, onClose, onPactoCreated }) => {
  const [step, setStep] = useState<number>(1);

  // Step 1: Goal Config
  const [name, setName] = useState('');
  const [emoji, setEmoji] = useState('🔥');
  const [goalType, setGoalType] = useState<GoalType>('habit');
  const [targetValue, setTargetValue] = useState<number>(5);
  const [frequency, setFrequency] = useState<Frequency>('daily');

  // Step 2: Verification
  const [verificationType, setVerificationType] = useState<VerificationType>('strict_photo');

  // Step 3: Punishment Proposal & Approval (Rule R3)
  const [punishmentBody, setPunishmentBody] = useState('');
  const [punishments, setPunishments] = useState<Array<{ id: string; body: string; approved: boolean }>>([
    { id: '1', body: 'Cantar el himno en la plaza pública', approved: true },
    { id: '2', body: 'Invitar una cena a todo el grupo', approved: true }
  ]);

  // Step 4: Digital Signature
  const [signed, setSigned] = useState(false);

  const handleAddPunishment = () => {
    if (punishmentBody.length < 10) {
      alert('El castigo debe tener al menos 10 caracteres (R3)');
      return;
    }
    setPunishments([...punishments, { id: Date.now().toString(), body: punishmentBody, approved: true }]);
    setPunishmentBody('');
  };

  const handleFinish = () => {
    if (!signed) {
      alert('Debes firmar el pacto para completarlo');
      return;
    }

    const newPacto = {
      id: `pacto-${Date.now()}`,
      group_id: groupId,
      name,
      emoji,
      goal_type: goalType,
      target_value: targetValue,
      frequency,
      verification_type: verificationType,
      status: 'active',
      start_date: new Date().toISOString(),
      end_date: new Date(Date.now() + 7 * 86400000).toISOString()
    };

    onPactoCreated(newPacto);
  };

  return (
    <div className="min-h-screen bg-[#0A0A0F] text-[#F5F5F7] p-4 max-w-md mx-auto space-y-6 pb-12">
      {/* Top Header */}
      <div className="flex items-center justify-between">
        <button
          onClick={step === 1 ? onClose : () => setStep(step - 1)}
          className="p-2 bg-[#16161E] border border-white/10 rounded-xl text-gray-300"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <span className="text-xs font-bold uppercase tracking-wider text-[#FF5A1F]">
          Paso {step} de 4
        </span>
      </div>

      {/* Progress Bar */}
      <div className="w-full bg-[#16161E] h-2 rounded-full overflow-hidden">
        <div
          className="bg-[#FF5A1F] h-full transition-all duration-300"
          style={{ width: `${(step / 4) * 100}%` }}
        />
      </div>

      {/* Step 1: Goal Config */}
      {step === 1 && (
        <div className="space-y-4">
          <h2 className="text-xl font-extrabold">1. Configura la Meta</h2>

          <div>
            <label className="block text-xs font-semibold uppercase text-gray-400 mb-1">Nombre del Pacto</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="ej: Gym 5 días por semana"
              className="w-full bg-[#16161E] border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[#FF5A1F]"
            />
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
                    if (type === 'abstinence') setFrequency('daily'); // R2
                  }}
                  className={`py-3 px-2 rounded-xl text-xs font-bold border capitalize transition ${
                    goalType === type
                      ? 'bg-[#FF5A1F]/20 border-[#FF5A1F] text-[#FF5A1F]'
                      : 'bg-[#16161E] border-white/5 text-gray-400'
                  }`}
                >
                  {type}
                </button>
              ))}
            </div>
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
                  className={`py-3 px-2 rounded-xl text-xs font-bold border capitalize transition ${
                    frequency === freq
                      ? 'bg-[#FF5A1F]/20 border-[#FF5A1F] text-[#FF5A1F]'
                      : 'bg-[#16161E] border-white/5 text-gray-400 disabled:opacity-30'
                  }`}
                >
                  {freq}
                </button>
              ))}
            </div>
          </div>

          <button
            disabled={!name}
            onClick={() => setStep(2)}
            className="w-full bg-[#FF5A1F] text-white font-bold py-3.5 rounded-xl disabled:opacity-40"
          >
            Siguiente: Verificación
          </button>
        </div>
      )}

      {/* Step 2: Verification Type */}
      {step === 2 && (
        <div className="space-y-4">
          <h2 className="text-xl font-extrabold">2. Método de Verificación</h2>

          <div className="space-y-3">
            {[
              { id: 'strict_photo', title: 'Foto Estricta en App (MediaDevices)', desc: 'Rechaza fotos de galería (R5). Requiere cámara en vivo.' },
              { id: 'honor_code', title: 'Código de Honor', desc: 'No exige foto, basándose en la palabra del grupo.' }
            ].map((method) => (
              <div
                key={method.id}
                onClick={() => setVerificationType(method.id as VerificationType)}
                className={`p-4 rounded-xl border cursor-pointer transition ${
                  verificationType === method.id
                    ? 'bg-[#FF5A1F]/20 border-[#FF5A1F]'
                    : 'bg-[#16161E] border-white/5'
                }`}
              >
                <h3 className="font-bold text-sm text-white">{method.title}</h3>
                <p className="text-xs text-gray-400 mt-1">{method.desc}</p>
              </div>
            ))}
          </div>

          <button
            onClick={() => setStep(3)}
            className="w-full bg-[#FF5A1F] text-white font-bold py-3.5 rounded-xl"
          >
            Siguiente: Pozo de Castigos
          </button>
        </div>
      )}

      {/* Step 3: Punishments */}
      {step === 3 && (
        <div className="space-y-4">
          <h2 className="text-xl font-extrabold">3. Pozo de Castigos (R3)</h2>
          <p className="text-xs text-gray-400">
            Cada miembro debe proponer y aprobar unánimemente los castigos.
          </p>

          <div className="flex space-x-2">
            <input
              type="text"
              value={punishmentBody}
              onChange={(e) => setPunishmentBody(e.target.value)}
              placeholder="ej: Subir video haciendo 50 flexiones"
              className="flex-1 bg-[#16161E] border border-white/10 rounded-xl px-4 py-3 text-xs text-white focus:outline-none focus:border-[#FF5A1F]"
            />
            <button
              onClick={handleAddPunishment}
              className="bg-[#FF5A1F] text-white font-bold px-4 rounded-xl text-xs"
            >
              Añadir
            </button>
          </div>

          <div className="space-y-2">
            {punishments.map((p) => (
              <div key={p.id} className="bg-[#16161E] border border-white/5 p-3 rounded-xl flex items-center justify-between">
                <span className="text-xs font-medium text-gray-200">{p.body}</span>
                <span className="text-[10px] bg-[#B4F461]/20 text-[#B4F461] px-2 py-0.5 rounded font-bold">
                  Aprobado Unánime ✓
                </span>
              </div>
            ))}
          </div>

          <button
            disabled={punishments.length === 0}
            onClick={() => setStep(4)}
            className="w-full bg-[#FF5A1F] text-white font-bold py-3.5 rounded-xl disabled:opacity-40"
          >
            Siguiente: Ceremomia de Firma
          </button>
        </div>
      )}

      {/* Step 4: Digital Signature Ceremony */}
      {step === 4 && (
        <div className="space-y-6 text-center">
          <div className="p-4 bg-[#FF5A1F]/10 border border-[#FF5A1F] rounded-2xl space-y-2">
            <Sparkles className="w-8 h-8 text-[#FF5A1F] mx-auto" />
            <h2 className="text-xl font-extrabold">Ceremonia de Firma</h2>
            <p className="text-xs text-gray-300">
              Al firmar, declaras que aceptas la meta y las consecuencias asignadas por la ruleta en caso de incumplimiento.
            </p>
          </div>

          <div
            onClick={() => setSigned(!signed)}
            className={`p-6 rounded-2xl border-2 border-dashed cursor-pointer transition flex flex-col items-center justify-center space-y-2 ${
              signed
                ? 'bg-[#B4F461]/10 border-[#B4F461] text-[#B4F461]'
                : 'bg-[#16161E] border-white/20 hover:border-[#FF5A1F] text-gray-400'
            }`}
          >
            <CheckCircle2 className="w-10 h-10" />
            <span className="font-bold text-sm">
              {signed ? '¡PACTO FIRMADO Y SELLADO!' : 'Toca aquí para Firmar Digitalmente'}
            </span>
          </div>

          <button
            disabled={!signed}
            onClick={handleFinish}
            className="w-full bg-[#FF5A1F] text-white font-extrabold py-4 rounded-xl disabled:opacity-40 shadow-xl"
          >
            Activar Pacto Ahora
          </button>
        </div>
      )}
    </div>
  );
};
