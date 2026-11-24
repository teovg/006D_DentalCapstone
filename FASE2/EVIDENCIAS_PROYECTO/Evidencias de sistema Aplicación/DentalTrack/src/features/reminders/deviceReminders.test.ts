import { beforeEach, describe, expect, it, vi } from "vitest";
import { scheduleReminder, restoreReminders, cancelReminder, clearDeviceReminders } from "./deviceReminders.native";
const mock = vi.hoisted(() => ({
  saved: new Map<string, string>(),
  pending: new Set<string>(),
  shown: new Set<string>(),
  permission: true,
  sequence: 0,
  failAt: 0,
  schedule: vi.fn(),
}));
vi.mock("react-native", () => ({ Platform: { OS: "android" } }));
vi.mock("expo-sqlite/kv-store", () => ({ default: {
  getItemSync: (key: string) => mock.saved.get(key) ?? null,
  setItemSync: (key: string, value: string) => mock.saved.set(key, value),
} }));
vi.mock("expo-notifications", () => ({
  setNotificationHandler: vi.fn(),
  getNotificationChannelAsync: async () => ({ id: "existing-native-channel" }),
  getPermissionsAsync: async () => ({ granted: mock.permission }),
  requestPermissionsAsync: async () => ({ granted: mock.permission }),
  getAllScheduledNotificationsAsync: async () => [...mock.pending].map(identifier => ({ identifier })),
  getPresentedNotificationsAsync: async () => [...mock.shown].map(identifier => ({ request: { identifier } })),
  scheduleNotificationAsync: mock.schedule,
  cancelScheduledNotificationAsync: async (id: string) => { mock.pending.delete(id); },
  dismissNotificationAsync: async (id: string) => { mock.shown.delete(id); },
  SchedulableTriggerInputTypes: { DATE: "date" },
}));
const timer = () => ({ id: "synthetic-timer", title: "Prueba de temporizador", kind: "timer" as const, at: new Date(Date.now()+60000).toISOString() });
beforeEach(() => {
  mock.saved.clear(); mock.pending.clear(); mock.shown.clear();
  mock.permission = true; mock.sequence = 0; mock.failAt = 0; mock.schedule.mockReset();
  mock.schedule.mockImplementation(async (request: { trigger: { type?: string } | null }) => {
    const next = ++mock.sequence;
    if (next === mock.failAt) throw new Error("synthetic scheduler failure");
    const id = `notification-${next}`;
    (request.trigger?.type ? mock.pending : mock.shown).add(id);
    return id;
  });
});
describe("device notification receipts", () => {
  it("avoids duplicate schedules, repairs dismissed notices and cancels all receipts", async () => {
    const reminder = timer();
    expect((await scheduleReminder(reminder, "account-a::patient-a")).status).toBe("scheduled");
    expect(mock.schedule).toHaveBeenNthCalledWith(1, expect.objectContaining({ content: expect.objectContaining({ autoDismiss: true }) }));
    expect(mock.schedule).toHaveBeenNthCalledWith(2, expect.objectContaining({ content: expect.objectContaining({ sticky: true, autoDismiss: false, body: reminder.title }) }));
    await restoreReminders([reminder], "account-a::patient-a");
    expect(mock.schedule).toHaveBeenCalledTimes(2);
    mock.shown.clear();
    await restoreReminders([reminder], "account-a::patient-a");
    expect(mock.pending.size).toBe(1); expect(mock.shown.size).toBe(1);
    await cancelReminder(reminder.id, "account-a::patient-a");
    expect(mock.pending.size + mock.shown.size).toBe(0);
  });
  it("clears a different patient's notifications before creating a timeless care notice", async () => {
    await scheduleReminder(timer(), "account-a::patient-a");
    await scheduleReminder({ id: "care", title: "Indicación sintética", at: "", kind: "care" }, "account-b::patient-b");
    expect(mock.pending.size).toBe(0); expect(mock.shown.size).toBe(1);
    await clearDeviceReminders();
    expect(mock.shown.size).toBe(0);
  });
  it("reports denied permission without claiming a native schedule", async () => {
    mock.permission = false;
    const result = await scheduleReminder(timer(), "account-a::patient-a");
    expect(result.status).toBe("denied"); expect(result.notificationIds).toEqual([]);
    expect(mock.schedule).not.toHaveBeenCalled();
  });
  it("rolls back a partial schedule when creating its active notice fails", async () => {
    mock.failAt = 2;
    const result = await scheduleReminder(timer(), "account-a::patient-a");
    expect(result.status).toBe("error"); expect(mock.pending.size + mock.shown.size).toBe(0);
  });
  it("does not claim a timer was scheduled when the device queue has reached its limit", async () => {
    for (let i=0;i<256;i++) mock.pending.add(`other-${i}`);
    const result = await scheduleReminder(timer(), "account-a::patient-a");
    expect(result.status).toBe("error");
    expect(mock.schedule).not.toHaveBeenCalled();
    expect(mock.pending.size).toBe(256);
  });
  it("waits for an in-flight schedule before clearing on sign-out", async () => {
    let release!: () => void;
    let began!: () => void;
    const gate = new Promise<void>(resolve => { release = resolve; });
    const started = new Promise<void>(resolve => { began = resolve; });
    mock.schedule.mockImplementationOnce(async () => {
      began();
      await gate;
      mock.pending.add("delayed-notification");
      return "delayed-notification";
    });
    const scheduling = scheduleReminder(timer(), "account-a::patient-a");
    await started;
    const clearing = clearDeviceReminders();
    release();
    await Promise.all([scheduling, clearing]);
    expect(mock.pending.size + mock.shown.size).toBe(0);
  });
});
