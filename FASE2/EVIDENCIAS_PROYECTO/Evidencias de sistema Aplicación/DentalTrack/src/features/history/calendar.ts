export interface CalendarDay {
  readonly key: string;
  readonly day: number;
  readonly inMonth: boolean;
}

export function localDateKey(value: Date | string): string {
  const date = typeof value === 'string' ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) throw new Error('Fecha no válida.');
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

export function calendarMonth(date: Date): string {
  return localDateKey(date).slice(0, 7);
}

function monthDate(month: string): Date {
  const match = /^(\d{4})-(\d{2})$/.exec(month);
  if (!match || Number(match[2]) < 1 || Number(match[2]) > 12) throw new Error('Mes no válido.');
  return new Date(Number(match[1]), Number(match[2]) - 1, 1, 12);
}

export function shiftMonth(month: string, offset: number): string {
  const date = monthDate(month);
  date.setMonth(date.getMonth() + offset);
  return calendarMonth(date);
}

export function monthLabel(month: string): string {
  return monthDate(month).toLocaleDateString('es-CL', { month: 'long', year: 'numeric' });
}

export function calendarDays(month: string): readonly CalendarDay[] {
  const first = monthDate(month);
  const mondayOffset = (first.getDay() + 6) % 7;
  return Array.from({ length: 42 }, (_, index) => {
    const date = new Date(first.getFullYear(), first.getMonth(), 1 - mondayOffset + index, 12);
    return { key: localDateKey(date), day: date.getDate(), inMonth: date.getMonth() === first.getMonth() };
  });
}
