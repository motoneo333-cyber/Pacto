import React, { useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Check, Lock, ShieldAlert, Trash2 } from 'lucide-react';
import { GoalType, Frequency, VerificationType, PunishmentCategory, PactoCreateSchema, PunishmentCreateSchema, Pacto } from '../types/pacto';
import { api } from '../lib/api';
import { useToast } from '../lib/toast';
import { useGroupMembers } from '../lib/hooks';

interface PactoWizardProps {
  groupId: string;
  onClose: () => void;
  onPactoCreated: (pacto: Pacto) => void;
}

const GOALS: { id: GoalType; label: string; help: string }[] = [
  { id: 'habit', label: 'Hábito', help: 'Hacer algo N veces (ir al gym, leer…)' },
  { id: 'quantitative', label: 'Cantidad', help: 'Alcanzar N unidades (km, páginas…)' },
  { id: 'abstinence', label: 'Abstinencia', help: 'N días sin hacer algo. Siempre diario.' }
];
const FREQS: { id: Frequency; label: string }[] = [
  { id: 'daily', label: 'Diaria' },
  { id: 'weekly', label: 'Semanal' },
  { id: 'x_days_per_week', label: 'X días/semana' }
];
const VERIFS: { id: VerificationType; label: string; help: string }[] = [
  { id: 'strict_photo', label: 'Foto con GPS', help: 'Foto tomada en el momento; el grupo la aprueba.' },
  { id: 'honor_code', label: 'Palabra de honor', help: 'Sin foto: tú afirmas que cumpliste y el grupo vota.' }
];
const CATS: { id: PunishmentCategory; label: string }[] = [
  { id: 'embarrassment', label: 'Vergüenza' },
  { id: 'service', label: 'Servicio' },
  { id: 'money', label: 'Dinero' },
  { id: 'random', label: 'Sorpresa' }
];
const HOLD_MS = 1200;

export const PactoWizardView: React.FC<PactoWizardProps> = ({ groupId, onClose, onPactoCreated }) => {
  const toast = useToast();
  const qc = useQueryClient();
  const { data: members = [] } = useGroupMembers(groupId);
  const [step, setStep] = useState(1);
  const [busy, setBusy] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);

  const [name, setName] = useState('');
  const [emoji, setEmoji] = useState('🔥');
  const [goalType, setGoalType] = useState<GoalType>('habit');
  const [target, setTarget] = useState(5);
  const [frequency, setFrequency] = useState<Frequency>('daily');
  const [daysPerWeek, setDaysPerWeek] = useState(3);
  const [days, setDays] = useState(7);
  const [verification, setVerification] = useState<VerificationType>('strict_photo');
  const [punishments, setPunishments] = useState<{ body: string; category: PunishmentCategory; severity: number }[]>([]);
  const [pBody, setPBody] = useState('');
  const [pCat, setPCat] = useState<PunishmentCategory>('embarrassment');
  const [pSev, setPSev] = useState(3);
  const [holdPct, setHoldPct] = useState(0);
  const holdTimer = useRef<number | null>(null);

  const effectiveFrequency: Frequency = goalType === 'abstinence' ? 'daily' : frequency;
  const buildPayload = () => {
    const start = new Date();
    return {
      name: name.trim(), emoji, group_id: groupId, goal_type: goalType, target_value: target,
      frequency: effectiveFrequency, days_per_week: effectiveFrequency === 'x_days_per_week' ? daysPerWeek : undefined,
      verification_type: verification, start_date: start.toISOString(),
      end_date: new Date(start.getTime() + days * 86400000).toISOString()
    };
  };

  const validate = (): string[] => {
    const r = PactoCreateSchema.safeParse(buildPayload());
    return r.success ? [] : r.error.issues.map((i) => i.message);
  };

  const next = () => {
    if (step === 1) {
      const errs = validate();
      if (days < 1 || days > 90) errs.push('La duración debe ser de 1 a 90 días');
      setErrors(errs);
      if (errs.length) return;
    }
    if (step === 3 && punishments.length < 1) {
      setErrors(['Propón al menos un castigo (los demás lo aprobarán)']);
      return;
    }
    setErrors([]);
    setStep(step + 1);
  };

  const addPunishment = () => {
    const r = PunishmentCreateSchema.safeParse({ body: pBody.trim(), category: pCat, severity: pSev });
    if (!r.success) { setErrors(r.error.issues.map((i) => i.message)); return; }
    setErrors([]);
    setPunishments([...punishments, r.data]);
    setPBody('');
  };

  const create = async () => {
    setBusy(true);
    try {
      const payload = buildPayload();
      const pacto = await api.createPacto({
        group_id: groupId, name: payload.name, emoji, goal_type: goalType, target_value: target,
        frequency: effectiveFrequency, days_per_week: payload.days_per_week, verification_type: verification,
        end_date: payload.end_date, punishments
      });
      await qc.invalidateQueries({ queryKey: ['pactos'] });
      toast('Pacto creado. Ahora tus amigos deben firmarlo y aprobar un castigo.');
      onPactoCreated(pacto);
    } catch (e) {
      toast((e as Error).message, 'error');
      setHoldPct(0);
    } finally {
      setBusy(false);
    }
  };

  const startHold = () => {
    if (busy) return;
    const t0 = performance.now();
    const tick = () => {
      const pct = Math.min(100, ((performance.now() - t0) / HOLD_MS) * 100);
      setHoldPct(pct);
      if (pct >= 100) { holdTimer.current = null; create(); return; }
      holdTimer.current = requestAnimationFrame(tick);
    };
    holdTimer.current = requestAnimationFrame(tick);
  };
  const endHold = () => {
    if (holdTimer.current) cancelAnimationFrame(holdTimer.current);
    holdTimer.current = null;
    if (!busy) setHoldPct(0);
  };

  const input = 'w-full bg-[#12141D] border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-[#FF5A1F]';
  const pill = (on: boolean) => `py-3 px-2 rounded-xl text-xs font-bold border transition min-h-[44px] ${on ? 'bg-[#FF5A1F] border-[#FF5A1F] text-white' : 'bg-[#12141D] border-white/10 text-gray-200'}`;
  const label = 'block text-xs font-semibold uppercase text-gray-300 mb-1';

  return (
    <div className="min-h-screen bg-[#090A0F] text-[#F3F4F6] p-4 max-w-md mx-auto space-y-6 pb-28">
      <div className="flex items-center justify-between">
        <button type="button" onClick={step === 1 ? onClose : () => { setErrors([]); setStep(step - 1); }} aria-label="Volver" className="p-2.5 bg-[#12141D] border border-white/10 rounded-xl text-gray-300 hover:text-white focus-visible:ring-2 focus-visible:ring-[#FF5A1F]">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <span className="text-xs font-bold uppercase tracking-wider text-[#FF5A1F]">Paso {step} de 4</span>
      </div>
      <div className="h-1.5 bg-[#12141D] rounded-full overflow-hidden" aria-hidden="true">
        <div className="h-full bg-[#FF5A1F] transition-all" style={{ width: `${step * 25}%` }} />
      </div>

      {errors.length > 0 && (
        <div role="alert" className="p-3 bg-[#F87171]/10 border border-[#F87171] rounded-xl text-xs text-[#F87171] font-semibold space-y-1">
          {errors.map((e) => <div key={e}>{e}</div>)}
        </div>
      )}

      {step === 1 && (
        <div className="space-y-5">
          <h2 className="text-xl font-extrabold">¿Cuál es la meta?</h2>
          <div className="flex space-x-2">
            <div>
              <label htmlFor="emoji" className={label}>Emoji</label>
              <input id="emoji" value={emoji} onChange={(e) => setEmoji(e.target.value)} className={`${input} w-16 text-center text-xl`} />
            </div>
            <div className="flex-1">
              <label htmlFor="pname" className={label}>Nombre del pacto</label>
              <input id="pname" value={name} onChange={(e) => setName(e.target.value)} placeholder="Ej: Gym mañanero" className={input} />
            </div>
          </div>
          <div>
            <span className={label}>Tipo de meta</span>
            <div className="grid grid-cols-3 gap-2">
              {GOALS.map((g) => <button key={g.id} type="button" aria-pressed={goalType === g.id} onClick={() => setGoalType(g.id)} className={pill(goalType === g.id)}>{g.label}</button>)}
            </div>
            <p className="text-xs text-gray-300 mt-1">{GOALS.find((g) => g.id === goalType)?.help}</p>
          </div>
          <div>
            <span className={label}>Frecuencia</span>
            <div className="grid grid-cols-3 gap-2">
              {FREQS.map((f) => {
                const disabled = goalType === 'abstinence' && f.id !== 'daily';
                return <button key={f.id} type="button" disabled={disabled} aria-pressed={effectiveFrequency === f.id} onClick={() => setFrequency(f.id)} className={`${pill(effectiveFrequency === f.id)} disabled:opacity-30`}>{f.label}</button>;
              })}
            </div>
            {effectiveFrequency === 'x_days_per_week' && (
              <div className="mt-2"><label htmlFor="dpw" className={label}>Días por semana</label>
                <input id="dpw" type="number" min={1} max={7} value={daysPerWeek} onChange={(e) => setDaysPerWeek(+e.target.value)} className={input} /></div>
            )}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><label htmlFor="target" className={label}>Meta (evidencias aprobadas)</label>
              <input id="target" type="number" min={1} value={target} onChange={(e) => setTarget(+e.target.value)} className={input} /></div>
            <div><label htmlFor="days" className={label}>Duración (días)</label>
              <input id="days" type="number" min={1} max={90} value={days} onChange={(e) => setDays(+e.target.value)} className={input} /></div>
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="space-y-4">
          <h2 className="text-xl font-extrabold">¿Cómo se verifica?</h2>
          {VERIFS.map((v) => (
            <button key={v.id} type="button" aria-pressed={verification === v.id} onClick={() => setVerification(v.id)}
              className={`w-full text-left p-4 rounded-2xl border transition ${verification === v.id ? 'border-[#FF5A1F] bg-[#FF5A1F]/10' : 'border-white/10 bg-[#12141D]'}`}>
              <div className="font-bold text-sm flex items-center space-x-2"><ShieldAlert className="w-4 h-4 text-[#FF5A1F]" /><span>{v.label}</span></div>
              <p className="text-xs text-gray-300 mt-1">{v.help}</p>
            </button>
          ))}
          <p className="text-xs text-gray-300">En ambos casos el grupo vota cada evidencia. Los empates se rechazan.</p>
        </div>
      )}

      {step === 3 && (
        <div className="space-y-4">
          <h2 className="text-xl font-extrabold">Castigos posibles</h2>
          <p className="text-xs text-gray-300">Si alguien falla, la ruleta elige uno de los castigos que <strong>todos</strong> aprueben. Propón al menos uno; tus amigos podrán añadir y votar.</p>
          <div className="space-y-2">
            {punishments.map((p, i) => (
              <div key={i} className="bg-[#12141D] border border-white/10 rounded-xl p-3 flex items-start justify-between space-x-2">
                <div><div className="text-sm font-bold text-white">{p.body}</div><div className="text-[11px] text-gray-300">{CATS.find((c) => c.id === p.category)?.label} · severidad {p.severity}/5</div></div>
                <button type="button" aria-label="Quitar castigo" onClick={() => setPunishments(punishments.filter((_, j) => j !== i))} className="p-2 text-[#F87171]"><Trash2 className="w-4 h-4" /></button>
              </div>
            ))}
          </div>
          <div className="space-y-2 bg-[#12141D] border border-white/10 rounded-2xl p-4">
            <label htmlFor="pbody" className={label}>Nuevo castigo (10-200 caracteres)</label>
            <input id="pbody" value={pBody} onChange={(e) => setPBody(e.target.value)} placeholder="Ej: Cantar el himno en la plaza" className={input} maxLength={200} />
            <div className="grid grid-cols-4 gap-2">{CATS.map((c) => <button key={c.id} type="button" aria-pressed={pCat === c.id} onClick={() => setPCat(c.id)} className={pill(pCat === c.id)}>{c.label}</button>)}</div>
            <div><label htmlFor="sev" className={label}>Severidad: {pSev}/5</label><input id="sev" type="range" min={1} max={5} value={pSev} onChange={(e) => setPSev(+e.target.value)} className="w-full accent-[#FF5A1F]" /></div>
            <button type="button" onClick={addPunishment} className="w-full bg-[#090A0F] border border-[#FF5A1F] text-[#FF5A1F] font-bold py-2.5 rounded-xl text-xs min-h-[44px]">Añadir castigo</button>
          </div>
        </div>
      )}

      {step === 4 && (
        <div className="space-y-4">
          <h2 className="text-xl font-extrabold">Firma el pacto</h2>
          <div className="bg-[#12141D] border border-white/10 rounded-2xl p-4 space-y-2 text-sm">
            <div className="font-extrabold text-lg">{emoji} {name}</div>
            <div className="text-gray-300 text-xs">{GOALS.find((g) => g.id === goalType)?.label} · {target} evidencias aprobadas en {days} días · {VERIFS.find((v) => v.id === verification)?.label}</div>
            <div className="text-xs text-gray-300">Castigos propuestos: {punishments.length}</div>
            <div className="text-xs text-gray-300">Participan {members.length} miembros del grupo: {members.map((m) => m.username).join(', ')}</div>
          </div>
          <p className="text-xs text-gray-300">Se crea como <strong>borrador</strong>. Empieza cuando todos firmen y aprueben un castigo. Cada nuevo castigo propuesto pide firmar de nuevo.</p>
          <button type="button" onPointerDown={startHold} onPointerUp={endHold} onPointerLeave={endHold} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); create(); } }}
            disabled={busy} aria-label="Mantén pulsado para firmar y crear el pacto"
            className="relative w-full overflow-hidden bg-[#12141D] border-2 border-[#FF5A1F] rounded-2xl py-5 font-extrabold text-sm select-none touch-none min-h-[44px] disabled:opacity-60">
            <span className="absolute inset-y-0 left-0 bg-[#FF5A1F]/40" style={{ width: `${holdPct}%` }} />
            <span className="relative flex items-center justify-center space-x-2"><Lock className="w-4 h-4" /><span>{busy ? 'Creando…' : 'Mantén pulsado para firmar'}</span></span>
          </button>
        </div>
      )}

      {step < 4 && (
        <button type="button" onClick={next} className="w-full bg-[#FF5A1F] text-white font-extrabold py-3.5 rounded-2xl flex items-center justify-center space-x-2 min-h-[44px]">
          <span>Continuar</span><Check className="w-4 h-4" />
        </button>
      )}
    </div>
  );
};
