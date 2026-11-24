export interface DeviceReminder {
  id: string;
  title: string;
  at: string;
  kind?: "timer" | "medicine" | "care";
  enabled?: boolean;
  medicationSchedule?: {
    medicineId: string;
    start: string;
    intervalHours: number;
    days: number;
  };
}
export interface SchedulingResult {
  status: "scheduled" | "denied" | "unsupported" | "error";
  notificationIds: string[];
  message: string;
}
export function upcomingReminderTimes(
  reminder: DeviceReminder,
  now = Date.now(),
): string[] {
  if (reminder.enabled === false || reminder.kind === "care") return [];
  const schedule = reminder.medicationSchedule;
  if (!schedule) {
    const at = new Date(reminder.at).getTime();
    if (!Number.isFinite(at))
      throw new Error("Indica una fecha válida para el aviso.");
    return at > now ? [new Date(at).toISOString()] : [];
  }
  const start = new Date(schedule.start).getTime();
  const step = schedule.intervalHours * 3600000;
  const duration = schedule.days * 86400000;
  if (
    !Number.isFinite(start) ||
    !Number.isFinite(step) ||
    !Number.isFinite(duration) ||
    step < 60000 ||
    step > 168 * 3600000 ||
    duration <= 0 ||
    duration > 365 * 86400000
  )
    throw new Error("Revisa inicio, intervalo y duración de la pauta.");
  const result: string[] = [];
  for (let at = start; at < start + duration; at += step)
    if (at > now) result.push(new Date(at).toISOString());
  return result;
}
