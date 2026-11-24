import { expect, it } from 'vitest';
import { confirmPrescription, proposePrescription } from './prescriptionProposal';

it('transcribe dos pautas impresas conservando cantidades e instrucciones sin pautar horarios', () => {
  const rows = proposePrescription('Producto de prueba A 100 mg\nTomar 2 comprimidos cada 8 hrs por 5 días\nProducto de prueba B 10 mg\nTomar 1 comprimido cada 24 hrs por 2 días');
  expect(rows).toHaveLength(2);
  expect(rows[0]).toMatchObject({ dose: '2 comprimidos', everyHours: '8', days: '5' });
  expect(rows[1]).toMatchObject({ dose: '1 comprimido', everyHours: '24', days: '2' });
  expect(() => confirmPrescription(rows)).not.toThrow();
});

it('no completa una pauta incompleta ni confirma un intervalo vacío', () => {
  expect(proposePrescription('Producto de prueba 100mg\nTomar según indicación')).toEqual([]);
  expect(() => confirmPrescription([{ name: 'Producto de prueba', dose: '1 unidad', everyHours: '', days: '3', sourceInstructions: '' }])).toThrow(/Completa/);
});
