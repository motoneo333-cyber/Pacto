const DAY = 86400000;
const dayKey = (d: Date) => d.toISOString().slice(0, 10);

/** Dias seguidos con evidencia (no rechazada), contando hasta hoy; si hoy aun no subes, cuenta desde ayer. */
export function streak(entryDates: string[], now: Date = new Date()): number {
  const days = new Set(entryDates.map((d) => d.slice(0, 10)));
  let cursor = new Date(now);
  if (!days.has(dayKey(cursor))) cursor = new Date(cursor.getTime() - DAY);
  let n = 0;
  while (days.has(dayKey(cursor))) {
    n++;
    cursor = new Date(cursor.getTime() - DAY);
  }
  return n;
}

export function daysLeft(endDate: string, now: Date = new Date()): number {
  return Math.max(0, Math.ceil((new Date(endDate).getTime() - now.getTime()) / DAY));
}

export function progressRatio(approved: number, target: number): number {
  return target > 0 ? Math.min(1, approved / target) : 0;
}

/** 'ok' cumple ya, 'behind' le falta ritmo, 'danger' no llega si sigue asi. */
export function paceStatus(approved: number, target: number, startDate: string, endDate: string, now: Date = new Date()): 'ok' | 'behind' | 'danger' {
  if (approved >= target) return 'ok';
  const total = Math.max(1, new Date(endDate).getTime() - new Date(startDate).getTime());
  const elapsed = Math.min(1, Math.max(0, (now.getTime() - new Date(startDate).getTime()) / total));
  const expected = target * elapsed;
  if (approved >= expected - 0.5) return 'ok';
  const remainingDays = Math.max(0, (new Date(endDate).getTime() - now.getTime()) / DAY);
  return target - approved > remainingDays + 1 ? 'danger' : 'behind';
}
