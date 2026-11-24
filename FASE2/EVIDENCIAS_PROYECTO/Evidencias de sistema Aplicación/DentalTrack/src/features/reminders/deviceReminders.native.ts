import { Platform } from "react-native";
import * as Notifications from "expo-notifications";
import Storage from "expo-sqlite/kv-store";
import {
  upcomingReminderTimes,
  type DeviceReminder,
  type SchedulingResult,
} from "./reminderPlan";
export type { DeviceReminder, SchedulingResult } from "./reminderPlan";
const ALERTS = "dentaltrack-alerts-v1",
  CARE = "dentaltrack-care-v1";
const KEY = "dentaltrack.device-notifications.v1";
type Receipt = { fingerprint: string; ids: string[] };
type Registry = { scope: string; receipts: Record<string, Receipt> };
const read = (): Registry => {
  try {
    return JSON.parse(
      Storage.getItemSync(KEY) ?? '{"scope":"","receipts":{}}',
    ) as Registry;
  } catch {
    return { scope: "", receipts: {} };
  }
};
const write = (value: Registry) =>
  Storage.setItemSync(KEY, JSON.stringify(value));
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});
async function channels() {
  if (Platform.OS !== "android") return;
  // Native startup configures alarm sound; Android preserves the user's channel choices.
  const alert = await Notifications.getNotificationChannelAsync(ALERTS);
  if (!alert)
    await Notifications.setNotificationChannelAsync(ALERTS, {
      name: "Medicamentos y temporizadores",
      importance: Notifications.AndroidImportance.HIGH,
      sound: "default",
      audioAttributes: {
        usage: Notifications.AndroidAudioUsage.ALARM,
        contentType: Notifications.AndroidAudioContentType.SONIFICATION,
      },
      lockscreenVisibility: Notifications.AndroidNotificationVisibility.PRIVATE,
    });
  const care = await Notifications.getNotificationChannelAsync(CARE);
  if (!care)
    await Notifications.setNotificationChannelAsync(CARE, {
      name: "Recordatorios activos",
      importance: Notifications.AndroidImportance.LOW,
      sound: null,
      lockscreenVisibility: Notifications.AndroidNotificationVisibility.PRIVATE,
    });
}
export async function ensureNotificationPermission() {
  await channels();
  const current = await Notifications.getPermissionsAsync();
  if (current.granted) return true;
  return (await Notifications.requestPermissionsAsync()).granted;
}
async function remove(ids: string[]) {
  await Promise.all(
    ids.map(async (id) => {
      await Notifications.cancelScheduledNotificationAsync(id);
      await Notifications.dismissNotificationAsync(id);
    }),
  );
}
async function scopeRegistry(scope: string): Promise<Registry> {
  const registry = read();
  if (registry.scope !== scope) {
    await remove(Object.values(registry.receipts).flatMap((r) => r.ids));
    const clean = { scope, receipts: {} };
    write(clean);
    return clean;
  }
  return registry;
}
async function cancelNow(id: string, scope: string) {
  const registry = await scopeRegistry(scope);
  await remove(registry.receipts[id]?.ids ?? []);
  delete registry.receipts[id];
  write(registry);
}
async function clearNow() {
  const registry = read();
  await remove(Object.values(registry.receipts).flatMap((r) => r.ids));
  write({ scope: "", receipts: {} });
}
async function apply(
  reminder: DeviceReminder,
  scope: string,
  requestPermission: boolean,
): Promise<SchedulingResult> {
  let ids: string[] = [];
  try {
    const registry = await scopeRegistry(scope);
    if (reminder.enabled === false) {
      await cancelNow(reminder.id, scope);
      return {
        status: "scheduled",
        notificationIds: [],
        message: "Aviso desactivado en este dispositivo.",
      };
    }
    await channels();
    const allowed = requestPermission
      ? await ensureNotificationPermission()
      : (await Notifications.getPermissionsAsync()).granted;
    if (!allowed)
      return {
        status: "denied",
        notificationIds: [],
        message:
          "Registro guardado. Activa las notificaciones de DentalTrack en los ajustes del dispositivo para recibir el aviso.",
      };
    const times = upcomingReminderTimes(reminder);
    const previous = registry.receipts[reminder.id];
    const previousIds = new Set(previous?.ids ?? []);
    const scheduled = await Notifications.getAllScheduledNotificationsAsync();
    const available = Math.max(
      0,
      (Platform.OS === "ios" ? 60 : 256) -
        scheduled.filter((n) => !previousIds.has(n.identifier)).length,
    );
    const slots = times.slice(0, available);
    if (times.length && !slots.length)
      return {
        status: "error",
        notificationIds: [],
        message:
          "Registro guardado. Hay demasiados avisos pendientes en este dispositivo; desactiva los que ya no uses y vuelve a preparar este horario.",
      };
    const fingerprint = JSON.stringify({
      id: reminder.id,
      title: reminder.title,
      at: reminder.at,
      kind: reminder.kind,
      enabled: reminder.enabled,
      medicationSchedule: reminder.medicationSchedule,
      slots,
    });
    const activeIds = previous?.fingerprint === fingerprint
      ? new Set([
          ...scheduled.map((n) => n.identifier),
          ...(await Notifications.getPresentedNotificationsAsync()).map(
            (n) => n.request.identifier,
          ),
        ])
      : null;
    if (
      previous?.fingerprint === fingerprint &&
      previous.ids.every((id) => activeIds?.has(id))
    )
      return {
        status: "scheduled",
        notificationIds: registry.receipts[reminder.id]!.ids,
        message: "Aviso ya preparado en este dispositivo.",
      };
    if (reminder.kind !== "care" && !times.length) {
      await cancelNow(reminder.id, scope);
      return {
        status: "error",
        notificationIds: [],
        message:
          "La hora del aviso ya pasó. El registro se conserva; elige una hora futura.",
      };
    }
    for (const at of slots) {
      const id = await Notifications.scheduleNotificationAsync({
        content: {
          title: reminder.title,
          body: reminder.medicationSchedule
            ? "Hora según la pauta que confirmaste."
            : "Terminó el tiempo que programaste.",
          sound: "default",
          data: { reminderId: reminder.id },
          autoDismiss: true,
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DATE,
          date: new Date(at),
          channelId: ALERTS,
        },
      });
      ids.push(id);
    }
    const persistent = await Notifications.scheduleNotificationAsync({
      content: {
        title:
          reminder.kind === "care"
            ? "Indicación"
            : reminder.medicationSchedule
              ? "Horario de medicamento"
              : "Temporizador",
        body: reminder.title,
        sound: false,
        data: { reminderId: reminder.id },
        ...(Platform.OS === "android"
          ? { sticky: true, autoDismiss: false }
          : {}),
      },
      trigger: Platform.OS === "android" ? { channelId: CARE } : null,
    });
    ids.push(persistent);
    await remove(registry.receipts[reminder.id]?.ids ?? []);
    registry.receipts[reminder.id] = { fingerprint, ids };
    write(registry);
    return {
      status: "scheduled",
      notificationIds: ids,
      message:
        slots.length < times.length
          ? `Programadas las próximas ${slots.length} tomas. Abre la app para renovar las posteriores.`
          : reminder.kind === "care"
            ? "Indicación activa en las notificaciones del dispositivo."
            : "Avisos programados en este dispositivo. Su entrega depende de los permisos, sonido y ahorro de batería del sistema.",
    };
  } catch {
    if (ids.length) await remove(ids).catch(() => {});
    return {
      status: "error",
      notificationIds: [],
      message:
        "El registro está guardado, pero no se pudo programar el aviso en este dispositivo. Revisa los permisos y vuelve a intentarlo.",
    };
  }
}
let operations: Promise<unknown> = Promise.resolve();
function serialize<T>(action: () => Promise<T>): Promise<T> {
  const next = operations.then(action, action);
  operations = next.catch(() => {});
  return next;
}
export const scheduleReminder = (reminder: DeviceReminder, scope: string) =>
  serialize(() => apply(reminder, scope, true));
export const cancelReminder = (id: string, scope: string) =>
  serialize(() => cancelNow(id, scope));
export const clearDeviceReminders = () => serialize(clearNow);
export function restoreReminders(
  reminders: readonly DeviceReminder[],
  scope: string,
) {
  return serialize(async () => {
    const registry = await scopeRegistry(scope);
    for (const id of Object.keys(registry.receipts))
      if (!reminders.some((r) => r.id === id && r.enabled !== false))
        await cancelNow(id, scope);
    for (const reminder of reminders)
      if (reminder.enabled !== false) await apply(reminder, scope, false);
  });
}
