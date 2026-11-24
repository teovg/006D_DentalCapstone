import { describe, expect, it } from 'vitest';
import { calendarDays, calendarMonth, localDateKey, monthLabel, shiftMonth } from './calendar';

describe('calendario de seguimiento', () => {
  it('usa semanas que comienzan el lunes y completa las filas', () => {
    const days = calendarDays('2026-10');
    expect(days[0]?.key).toBe('2026-09-28');
    expect(days.at(-1)?.key).toBe('2026-11-08');
    expect(days.filter((day) => day.inMonth)).toHaveLength(31);
    expect(days.length % 7).toBe(0);
  });
  it('mantiene seis semanas al cambiar de mes para evitar saltos de altura', () => {
    expect(calendarDays('2026-11')).toHaveLength(42);
    expect(calendarDays('2026-12')).toHaveLength(42);
  });
  it('representa correctamente febrero bisiesto', () => {
    expect(calendarDays('2028-02').filter((day) => day.inMonth)).toHaveLength(29);
  });
  it('cambia de año y conserva la fecha local sin convertirla a UTC', () => {
    expect(shiftMonth('2026-12', 1)).toBe('2027-01');
    expect(shiftMonth('2026-01', -1)).toBe('2025-12');
    expect(localDateKey(new Date(2026, 9, 13, 0))).toBe('2026-10-13');
    expect(calendarMonth(new Date(2026, 9, 13))).toBe('2026-10');
    expect(monthLabel('2026-10')).toContain('octubre');
  });
  it('rechaza meses y fechas inválidos', () => {
    expect(() => calendarDays('2026-13')).toThrow('Mes no válido');
    expect(() => localDateKey('no-es-fecha')).toThrow('Fecha no válida');
  });
});
