import { describe, it, expect } from 'vitest';
import { streak, daysLeft, progressRatio, paceStatus } from './lib/pactoMath';

const at = (iso: string) => new Date(iso);

describe('pactoMath', () => {
  it('streak: cuenta dias seguidos hasta hoy', () => {
    expect(streak(['2026-01-08', '2026-01-09', '2026-01-10'], at('2026-01-10T12:00:00Z'))).toBe(3);
  });
  it('streak: si hoy aun no subes, sigue contando desde ayer', () => {
    expect(streak(['2026-01-08', '2026-01-09'], at('2026-01-10T12:00:00Z'))).toBe(2);
  });
  it('streak: un hueco corta la racha', () => {
    expect(streak(['2026-01-05', '2026-01-09', '2026-01-10'], at('2026-01-10T12:00:00Z'))).toBe(2);
  });
  it('streak: sin evidencias es 0', () => {
    expect(streak([], at('2026-01-10T12:00:00Z'))).toBe(0);
  });
  it('daysLeft nunca es negativo', () => {
    expect(daysLeft('2026-01-01T00:00:00Z', at('2026-01-10T00:00:00Z'))).toBe(0);
    expect(daysLeft('2026-01-13T00:00:00Z', at('2026-01-10T00:00:00Z'))).toBe(3);
  });
  it('progressRatio se limita a 1 y tolera meta 0', () => {
    expect(progressRatio(7, 5)).toBe(1);
    expect(progressRatio(1, 4)).toBe(0.25);
    expect(progressRatio(1, 0)).toBe(0);
  });
  it('paceStatus: ok / behind / danger', () => {
    const start = '2026-01-01T00:00:00Z';
    const end = '2026-01-11T00:00:00Z';
    expect(paceStatus(5, 5, start, end, at('2026-01-03T00:00:00Z'))).toBe('ok');
    expect(paceStatus(4, 10, start, end, at('2026-01-06T00:00:00Z'))).toBe('behind');
    expect(paceStatus(0, 10, start, end, at('2026-01-10T00:00:00Z'))).toBe('danger');
  });
});
