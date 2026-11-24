import type { DeviceReminder, SchedulingResult } from "./reminderPlan";
export type { DeviceReminder, SchedulingResult } from "./reminderPlan";
export const ensureNotificationPermission = async () => false;
export const scheduleReminder = async (
  _reminder: DeviceReminder,
  _scope: string,
): Promise<SchedulingResult> => ({
  status: "unsupported",
  notificationIds: [],
  message:
    "Guardado en tu cuenta. Para recibir avisos del dispositivo, abre DentalTrack en Android y actívalos allí.",
});
export const cancelReminder = async (_id: string, _scope: string) => {};
export const restoreReminders = async (
  _reminders: readonly DeviceReminder[],
  _scope: string,
) => {};
export const clearDeviceReminders = async () => {};
