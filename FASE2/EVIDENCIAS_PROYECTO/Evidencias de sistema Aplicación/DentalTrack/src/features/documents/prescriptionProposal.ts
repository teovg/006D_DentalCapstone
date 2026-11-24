export interface PrescriptionMedicineDraft {
  readonly name: string;
  readonly dose: string;
  readonly everyHours: string;
  readonly days: string;
  readonly sourceInstructions: string;
}

export function proposePrescription(text: string): PrescriptionMedicineDraft[] {
  const lines = text.split(/\r?\n/).map((line) => line.replace(/^[|\s]+/, '').trim()).filter(Boolean);
  return lines.flatMap((line, index) => {
    const regimen = line.match(/\b(?:tomar|usar|aplicar)\s+(.+?)\s+cada\s+(\d+)\s*(?:hrs?|horas?)\b.*?\bpor\s+(\d+)\s+d[ií]as?\b/i);
    const name = lines[index - 1];
    if (!regimen || !name || !/\b\d+\s*(?:mg|mcg|g|ml)\b/i.test(name)) return [];
    return [{ name, dose: regimen[1]!.trim(), everyHours: regimen[2]!, days: regimen[3]!, sourceInstructions: line }];
  });
}

export function confirmPrescription(rows: readonly PrescriptionMedicineDraft[]): void {
  if (!rows.length) throw new Error('Añade al menos un medicamento y su pauta.');
  for (const [index, row] of rows.entries()) {
    if (!row.name.trim() || !row.dose.trim() || !/^[1-9]\d{0,2}$/.test(row.everyHours) || !/^[1-9]\d{0,2}$/.test(row.days)) {
      throw new Error(`Medicamento ${index + 1}. Completa el nombre, la dosis indicada, el intervalo y la duración.`);
    }
  }
}

export interface ConfirmedPrescription {
  readonly id: string;
  readonly createdAt: string;
  readonly medicines: readonly PrescriptionMedicineDraft[];
}
