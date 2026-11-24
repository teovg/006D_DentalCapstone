import { describe,it,expect } from 'vitest';
import { upcomingReminderTimes, type DeviceReminder } from './reminderPlan';
const timer:DeviceReminder={id:'synthetic',title:'Prueba',kind:'timer',at:'2026-11-17T00:00:00Z'};
describe('device reminder plan',()=>{
 it('plans future timers only and never schedules timeless or disabled care',()=>{
  expect(upcomingReminderTimes(timer,Date.parse('2026-11-16T23:59:00Z'))).toEqual(['2026-11-17T00:00:00.000Z']);
  expect(upcomingReminderTimes(timer,Date.parse('2026-11-17T00:01:00Z'))).toEqual([]);
  expect(upcomingReminderTimes({...timer,kind:'care',at:''},0)).toEqual([]);
  expect(upcomingReminderTimes({...timer,enabled:false},0)).toEqual([]);
 });
 it('uses elapsed hours, excludes the end and omits past doses on restoration',()=>{
  const medicine={...timer,kind:'medicine' as const,medicationSchedule:{medicineId:'m',start:'2026-11-16T10:00:00Z',intervalHours:12,days:2}};
  expect(upcomingReminderTimes(medicine,Date.parse('2026-11-16T12:00:00Z'))).toEqual(['2026-11-16T22:00:00.000Z','2026-11-17T10:00:00.000Z','2026-11-17T22:00:00.000Z']);
 });
 it('rejects invalid schedule data instead of silently scheduling different intervals',()=>{
  for(const hours of [0,-1,Infinity,NaN])expect(()=>upcomingReminderTimes({...timer,medicationSchedule:{medicineId:'m',start:timer.at,intervalHours:hours,days:1}},0)).toThrow();
  expect(()=>upcomingReminderTimes({...timer,at:'not-a-date'},0)).toThrow();
 });
});
