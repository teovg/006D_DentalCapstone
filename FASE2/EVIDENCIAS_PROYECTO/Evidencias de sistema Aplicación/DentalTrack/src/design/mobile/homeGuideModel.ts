import type { DesignPatient, DesignReminder } from './model';
import { budgetTotal, paidTotal } from './model';
import { upcomingReminderTimes } from '../../features/reminders/reminderPlan';

export function guideSummary(patient: DesignPatient, now: number) {
  const care = patient.reminders.filter(r => r.enabled !== false && r.kind === 'care');
  const invalid: DesignReminder[] = [];
  const timed = patient.reminders.flatMap(reminder => {
    if (reminder.enabled === false || reminder.kind === 'care') return [];
    try {
      const at = upcomingReminderTimes(reminder, now)[0];
      return at ? [{ reminder, at }] : [];
    } catch {
      invalid.push(reminder);
      return [];
    }
  }).sort((a,b) => Date.parse(a.at) - Date.parse(b.at));
  const budgets = [...patient.budgets].sort((a,b) => {
    const active = (budget: typeof a) => Number(budget.rows.some(r => !r.done) || budgetTotal(budget) > paidTotal(budget));
    return active(b) - active(a);
  });
  const next = [...patient.appointments].filter(a => a.status === 'scheduled' && Date.parse(a.at) > now)
    .sort((a,b) => Date.parse(a.at) - Date.parse(b.at))[0];
  const latest = [...patient.sessions].filter(s => Date.parse(s.at) <= now)
    .sort((a,b) => Date.parse(b.at) - Date.parse(a.at))[0];
  return { care, timed, invalid, budgets, next, latest };
}

export function guideWhen(at: string, now: number) {
  const date = new Date(at);
  const today = new Date(now);
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  if (date.toDateString() === today.toDateString()) return 'Hoy';
  if (date.toDateString() === tomorrow.toDateString()) return 'Mañana';
  return new Intl.DateTimeFormat('es-CL', { weekday: 'short', day: 'numeric', month: 'short' }).format(date);
}
