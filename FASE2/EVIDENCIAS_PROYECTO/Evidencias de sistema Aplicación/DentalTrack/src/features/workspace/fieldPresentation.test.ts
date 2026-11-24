import { describe, expect, it } from 'vitest';
import { fieldFormatError, fieldPresentation } from './fieldPresentation';

describe('base form presentation', () => {
  it('keeps date and time instructions visible beyond placeholders', () => {
    expect(fieldPresentation({label:'Fecha',placeholder:'AAAA-MM-DD'}).hint).toContain('AAAA-MM-DD');
    expect(fieldPresentation({label:'Hora',placeholder:'HH:MM'}).hint).toContain('24 horas');
  });
  it('selects numeric keyboards without modifying the clinical data', () => {
    expect(fieldPresentation({label:'Importe en CLP',numeric:true}).inputMode).toBe('decimal');
    expect(fieldPresentation({label:'Duración en minutos',numeric:true}).inputMode).toBe('numeric');
    expect(fieldPresentation({label:'Dosis indicada'})).toEqual({});
  });
  it('rejects impossible dates and accepts leap days', () => {
    expect(fieldFormatError({placeholder:'AAAA-MM-DD'},'2026-02-30')).not.toBeNull();
    expect(fieldFormatError({placeholder:'AAAA-MM-DD'},'2024-02-29')).toBeNull();
    expect(fieldFormatError({placeholder:'AAAA-MM-DD'},'13/10/2026')).not.toBeNull();
  });
  it('validates populated fields only, without inventing required fields', () => {
    expect(fieldFormatError({placeholder:'AAAA-MM-DD'},'')).toBeNull();
    expect(fieldFormatError({placeholder:'HH:MM'},'24:10')).not.toBeNull();
    expect(fieldFormatError({placeholder:'HH:MM'},'14:30')).toBeNull();
    expect(fieldFormatError({numeric:true},'$ 1.000')).not.toBeNull();
    expect(fieldFormatError({numeric:true},'1000')).toBeNull();
  });
});
