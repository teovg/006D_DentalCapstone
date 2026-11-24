import type { TextInputProps } from 'react-native';

/** Presentation hints only; this does not prescribe clinical requirements or doses. */
export function fieldPresentation(field: { label: string; placeholder?: string; numeric?: boolean }): { hint?: string; inputMode?: TextInputProps['inputMode']; autoComplete?: TextInputProps['autoComplete'] } {
  if (field.placeholder === 'AAAA-MM-DD') return { hint: 'Formato: AAAA-MM-DD. Ejemplo: 2026-10-13.' };
  if (field.placeholder === 'HH:MM') return { hint: 'Formato de 24 horas: HH:MM. Ejemplo: 14:30.' };
  if (field.label === 'Nombre' || field.label === 'Nombre del paciente') return { autoComplete: 'name' };
  if (field.numeric) return { inputMode: field.label === 'Duración en minutos' ? 'numeric' : 'decimal', hint: field.label.includes('CLP') ? 'Importe en pesos chilenos, sin el símbolo $ ni separadores de miles.' : 'Introduce solo el valor numérico.' };
  if (field.label === 'Piezas FDI') return { hint: 'Separa las piezas con comas, por ejemplo: 16, 26.' };
  return {};
}

export function fieldFormatError(field: { placeholder?: string; numeric?: boolean }, value: string): string | null {
  const clean = value.trim();
  if (!clean) return null; // Required fields belong to the future save contract, not this UI prototype.
  if (field.placeholder === 'AAAA-MM-DD') {
    const parts = /^(\d{4})-(\d{2})-(\d{2})$/.exec(clean);
    const date = new Date(`${clean}T12:00:00`);
    if (!parts || Number.isNaN(date.getTime()) || date.getFullYear() !== Number(parts[1]) || date.getMonth() + 1 !== Number(parts[2]) || date.getDate() !== Number(parts[3])) return 'Usa una fecha válida en formato AAAA-MM-DD.';
  }
  if (field.placeholder === 'HH:MM' && !/^([01]\d|2[0-3]):[0-5]\d$/.test(clean)) return 'Usa una hora válida de 24 horas, por ejemplo: 14:30.';
  if (field.numeric && !/^\d+(?:[.,]\d+)?$/.test(clean)) return 'Introduce un valor numérico, sin símbolos ni separadores de miles.';
  return null;
}
