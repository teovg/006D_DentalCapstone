import { describe, expect, it } from 'vitest';
import { confirmBudgetItems, proposeBudget } from './budgetProposal';
import type { OcrLine } from './ocrTypes';

describe('revisión de presupuesto', () => {
  const { clinic, rows } = proposeBudget('Clínica: Clínica Ejemplo\n\nPieza 16 Endodoncia $48.000\nPieza 26 Restauración $35.000\nTOTAL $83.000');

  it('extrae las filas, conserva el importe y omite el total del documento', () => {
    expect(clinic).toBe('Clínica Ejemplo');
    expect(rows).toEqual([
      { toothCode: '16', description: 'Endodoncia', amount: '48000' },
      { toothCode: '26', description: 'Restauración', amount: '35000' },
    ]);
  });

  it('resuelve el mismo número por el estándar confirmado, sin adivinar un sistema ambiguo', () => {
    expect(confirmBudgetItems(rows, 'fdi')[0]?.toothId).toBe('permanent:maxillary:right:6');
    expect(confirmBudgetItems(rows, 'universal')[0]?.toothId).toBe('permanent:maxillary:left:8');
    expect(() => confirmBudgetItems(rows, 'unknown')).toThrow(/numeración/);
  });

  it('requiere validar cada importe y admite prestaciones sin pieza específica', () => {
    expect(() => confirmBudgetItems([{ toothCode: '16', description: 'Endodoncia', amount: '48O00' }], 'fdi')).toThrow(/importe/);
    expect(confirmBudgetItems([{ toothCode: '', description: 'Limpieza', amount: '18000' }], 'unknown')[0]).toMatchObject({ toothId: null, amountClp: 18000 });
  });

  it('elige la columna final por los encabezados y evita confundir el código administrativo con una pieza', () => {
    const line = (text: string, x: number, y: number): OcrLine => ({ text, x, y, left: x - 0.025, right: x + 0.025, top: y - 0.01, bottom: y + 0.01, score: 0.9 });
    const lines = [line('Pieza',0.05,0.1), line('Prestación',0.3,0.1), line('Arancel',0.6,0.1), line('Convenio',0.75,0.1), line('Valor Final',0.9,0.1),
      line('16.m,0,d',0.05,0.2), line('27-02-100',0.09,0.2), line('[1.2.3] Prestación de prueba',0.3,0.2), line('$20.000',0.6,0.2),line('$18.000',0.75,0.2), line('$17.000',0.9,0.2),line('Totales:',0.5,0.3)];
    const result = proposeBudget({text:'Clínica: Ejemplo',engine:'test',lines});
    expect(result.rows[0]).toMatchObject({toothCode:'16',amount:'17000',baseAmount:'20000',agreementAmount:'18000'});
    expect(result.rows[0]).not.toHaveProperty('surfaces');
  });
});
