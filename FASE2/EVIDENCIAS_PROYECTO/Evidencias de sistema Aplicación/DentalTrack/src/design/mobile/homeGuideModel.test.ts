import { describe, expect, it } from 'vitest';
import { newPatient, type DesignReminder } from './model';
import { guideSummary, guideWhen } from './homeGuideModel';

const now = new Date('2026-11-16T12:00:00Z').getTime();
const reminder = (id: string, kind: DesignReminder['kind'] = 'timer'): DesignReminder => ({ id, kind, title: id, at: '2026-11-17T12:00:00Z', sourceId: '', destination: 'draft' });
describe('resumen de Guía personal', () => {
  it('conserva cuidados aunque existan más de tres avisos', () => {
    const p = newPatient('test','Test');
    p.reminders = [reminder('a'),reminder('b'),reminder('c'),reminder('d'),reminder('cuidado','care')];
    expect(guideSummary(p, now).care.map(r=>r.id)).toEqual(['cuidado']);
    expect(guideSummary(p, now).timed).toHaveLength(4);
  });
  it('distingue pauta inválida, desactivada y caducada', () => {
    const p = newPatient('test','Test');
    p.reminders = [{...reminder('bad'), at:'invalid'}, {...reminder('off'),enabled:false}, {...reminder('past'),at:'2020-01-01'}];
    const result = guideSummary(p,now);
    expect(result.invalid.map(r=>r.id)).toEqual(['bad']);
    expect(result.timed).toEqual([]);
  });
  it('prioriza presupuesto pendiente sin mutar el orden original', () => {
    const p = newPatient('test','Test');
    p.budgets = ['cerrado','pendiente'].map((id,i)=>({id,title:id,clinic:'',image:'',payments:[],rows:[{id,title:id,toothIds:[],amount:0,general:true,done:i===0}]}));
    expect(guideSummary(p,now).budgets.map(b=>b.id)).toEqual(['pendiente','cerrado']);
    expect(p.budgets[0]?.id).toBe('cerrado');
  });
  it('calcula la próxima toma y no utiliza el inicio pasado', () => {
    const p = newPatient('test','Test');
    p.reminders = [{...reminder('med','medicine'),medicationSchedule:{medicineId:'m',start:'2026-11-16T00:00:00Z',intervalHours:8,days:2}}];
    expect(guideSummary(p,now).timed[0]?.at).toBe('2026-11-16T16:00:00.000Z');
  });
  it('cuenta vacía no inventa actividad', () => {
    const s = guideSummary(newPatient('test','Test'),now);
    expect(s.next).toBeUndefined(); expect(s.latest).toBeUndefined(); expect(s.budgets).toEqual([]);
  });
  it('distingue mañana al cruzar un fin de mes local', () => {
    const local = new Date(2026,10,30,12).getTime();
    expect(guideWhen(new Date(2026,11,1,9).toISOString(),local)).toBe('Mañana');
  });
});
