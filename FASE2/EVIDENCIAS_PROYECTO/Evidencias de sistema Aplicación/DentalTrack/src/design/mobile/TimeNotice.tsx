import { useState } from "react";
import { ScrollView, View, useWindowDimensions } from "react-native";
import { Dialog } from "panelui-native/components/dialog";
import { Input } from "panelui-native/components/input";
import { DateTimePicker } from "panelui-native/components/date-time-picker";
import { ScrollFade } from "panelui-native/components/scroll-fade";
import { Text } from "panelui-native/primitives/text";
import { Tabs } from "panelui-native/components/tabs";
import { Button, OptionalSection, Row } from "./components";
import { makeId, shortDate, time, usePreview } from "./context";
import {
  medicationPreview,
  saveReviewedSchedule,
  type Medicine,
  type DesignReminder,
} from "./model";
import {
  timerAt,
  timerDuration,
  unscheduledMedicines,
  groupedSchedule,
  medicineReminder,
  isManualMedicine,
} from "./timeNoticeRules";
import {
  scheduleReminder,
  cancelReminder,
} from "../../features/reminders/deviceReminders";
export interface MedicineScheduleDraft {
  start: string;
  intervalHours: number;
  days: number;
}
function SchedulePreview({ times }: { times: readonly string[] }) {
  const groups = groupedSchedule(times);
  return (
    <View className="gap-2 border border-border rounded-xl p-3">
      <Text weight="semibold">Horario de tomas</Text>
      {groups.slice(0, 3).map((g) => (
        <View key={g.day} className="gap-1">
          <Text size="sm" weight="medium">
            {g.day}
          </Text>
          <Text size="sm">{g.times.join(" · ")}</Text>
        </View>
      ))}
      {groups.length > 3 ? (
        <OptionalSection title={`Ver los ${groups.length - 3} días restantes`}>
          <ScrollView style={{ maxHeight: 140 }} nestedScrollEnabled>
            {groups.slice(3).map((g) => (
              <Text size="sm" key={g.day}>
                {g.day}: {g.times.join(" · ")}
              </Text>
            ))}
          </ScrollView>
        </OptionalSection>
      ) : null}
    </View>
  );
}
export function MedicationScheduleDialog({
  medicine,
  initial,
  onConfirm,
  onClose,
  onDeactivate,
  confirmLabel = "Usar horario",
}: {
  medicine: Medicine;
  initial?: MedicineScheduleDraft | undefined;
  onConfirm: (draft: MedicineScheduleDraft) => void | Promise<void>;
  onDeactivate?: (() => Promise<void>) | undefined;
  confirmLabel?: string;
  onClose: () => void;
}) {
  const [start, setStart] = useState(() =>
    initial ? new Date(initial.start) : new Date(),
  );
  const [interval, setInterval] = useState(
    String(initial?.intervalHours ?? medicine.intervalHours ?? ""),
  );
  const [days, setDays] = useState(
    String(initial?.days ?? medicine.days ?? ""),
  );
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  let times: string[] = [];
  try {
    times = medicationPreview(
      start.toISOString(),
      Number(interval),
      Number(days),
    );
  } catch {
    /* The confirmed action presents validation. */
  }
  const { height } = useWindowDimensions();
  return (
    <Dialog
      open
      onOpenChange={(v) => {
        if (!v && !saving) onClose();
      }}
    >
      <Dialog.Content className="max-w-full">
        <Dialog.Title>{medicine.name}</Dialog.Title>
        <ScrollFade size={14} edges="both">
          <ScrollView
            style={{ maxHeight: Math.max(180, height - (onDeactivate ? 320 : 260)) }}
            keyboardShouldPersistTaps="handled"
          >
            <View className="gap-3 py-2">
              <Text size="sm" weight="medium">
                Primera toma
              </Text>
              <DateTimePicker
                value={start}
                onValueChange={setStart}
                locale="es-CL"
                hourCycle={24}
                layout="wheel"
                presentation="dialog"
                doneLabel="Listo"
                timeLabel="Hora"
                format={(v) =>
                  `${shortDate(v.toISOString())} · ${time(v.toISOString())}`
                }
              />
              <OptionalSection
                title={`Pauta: cada ${interval || "—"} h durante ${days || "—"} días`}
                initial={!interval || !days}
              >
                <View className="flex-row gap-3">
                  <Input
                    containerClassName="flex-1 min-w-0 w-auto"
                    label="Cada (horas)"
                    placeholder="Ej.: 12"
                    keyboardType="decimal-pad"
                    value={interval}
                    onChangeText={setInterval}
                  />
                  <Input
                    containerClassName="flex-1 min-w-0 w-auto"
                    label="Durante (días)"
                    placeholder="Ej.: 7"
                    keyboardType="number-pad"
                    value={days}
                    onChangeText={setDays}
                  />
                </View>
              </OptionalSection>
              {times.length ? <SchedulePreview times={times} /> : null}
              {error ? (
                <Text accessibilityRole="alert" className="text-destructive">
                  {error}
                </Text>
              ) : null}
            </View>
          </ScrollView>
        </ScrollFade>
        <Dialog.Footer>
          <View className="w-full gap-2"><View className="flex-row gap-2 w-full">
            <Button variant="outline" className="flex-1" disabled={saving} onPress={onClose}>
              Cancelar
            </Button>
            <Button
              className="flex-1"
              loading={saving}
              onPress={async () => {
                if (saving) return;
                setSaving(true);
                try {
                  medicationPreview(
                    start.toISOString(),
                    Number(interval),
                    Number(days),
                  );
                  await onConfirm({
                    start: start.toISOString(),
                    intervalHours: Number(interval),
                    days: Number(days),
                  });
                } catch (e) {
                  setError((e as Error).message);
                } finally { setSaving(false); }
              }}
            >
              {confirmLabel}
            </Button>
          </View>
          {onDeactivate ? <Button variant="ghost" disabled={saving} onPress={async()=>{setSaving(true);try{await onDeactivate();}catch(e){setError((e as Error).message);}finally{setSaving(false);}}}><Text className="text-destructive">Desactivar recordatorio</Text></Button> : null}
          </View>
        </Dialog.Footer>
      </Dialog.Content>
    </Dialog>
  );
}
export function TimeNotice({
  prescriptionId,
  medicineId,
  reminderId,
  onClose,
}: {
  prescriptionId?: string | undefined;
  medicineId?: string | undefined;
  reminderId?: string | undefined;
  onClose: () => void;
}) {
  const { patient, state, edit, notify, notificationScope, setDirty } = usePreview();
  const existing = patient.reminders.find((r) => r.id === reminderId) ?? medicineReminder(patient, prescriptionId, medicineId);
  const source = patient.prescriptions.find(
    (p) => p.id === (prescriptionId ?? existing?.sourceId),
  );
  const target =
    source?.medicines.find(
      (m) => m.id === (medicineId ?? existing?.medicationSchedule?.medicineId),
    ) ?? source?.medicines[0];
  const [selected, setSelected] = useState(
    source && target ? { p: source, m: target } : undefined,
  );
  const [mode, setMode] = useState<"timer" | "medicine" | "care">(
    source || existing?.medicationSchedule
      ? "medicine"
      : (existing?.kind ?? "timer"),
  );
  const [name, setName] = useState(target?.name ?? existing?.title ?? "");
  const [minutes, setMinutes] = useState("");
  const [hours, setHours] = useState("");
  const [interval, setInterval] = useState(
    String(
      existing?.medicationSchedule?.intervalHours ??
        target?.intervalHours ??
        "",
    ),
  );
  const [days, setDays] = useState(
    String(existing?.medicationSchedule?.days ?? target?.days ?? ""),
  );
  const [start, setStart] = useState(() =>
    existing ? new Date(existing.at) : new Date(),
  );
  const [preview, setPreview] = useState<string[]>([]);
  const [suggest, setSuggest] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  const { height } = useWindowDimensions();
  const scope = notificationScope ?? patient.id;
  const change = (fn: () => void) => {
    fn();
    setPreview([]);
    setDirty(true);
  };
  const persist = async (draft?: MedicineScheduleDraft) => {
    setBusy(true);
    setError("");
    let reminder: DesignReminder | undefined;
    try {
      if (!name.trim())
        throw new Error(
          mode === "medicine"
            ? "Escribe el nombre del medicamento."
            : "Escribe qué quieres recordar.",
        );
      await edit((p) => {
        if (mode !== "medicine") {
          reminder = {
            id: existing?.id ?? makeId(),
            title: name.trim(),
            at: mode === "care" ? new Date().toISOString() : preview[0]!,
            kind: mode,
            enabled: true,
            sourceId: existing?.sourceId ?? "",
            destination: "draft",
          };
          return {
            ...p,
            reminders: [
              reminder,
              ...p.reminders.filter((r) => r.id !== reminder!.id),
            ],
          };
        }
        if (!draft) throw new Error("Revisa la primera toma y la pauta.");
        let result = p;
        let rx = selected?.p.id;
        let med = selected?.m.id;
        if (!rx || !med) {
          rx = makeId();
          med = makeId();
          result = {
            ...p,
            prescriptions: [
              {
                id: rx,
                title: "Medicamento añadido manualmente",
                origin: "manual",
                date: new Date().toISOString(),
                image: "",
                medicines: [
                  {
                    id: med,
                    name: name.trim(),
                    instruction: "",
                    intervalHours: String(draft.intervalHours),
                    days: String(draft.days),
                  },
                ],
              },
              ...p.prescriptions,
            ],
          };
        }
        result = saveReviewedSchedule(result, {
          id: existing?.id ?? makeId(),
          prescriptionId: rx,
          medicineId: med,
          ...draft,
        });
        reminder = result.reminders.find(
          (r) => r.sourceId === rx && r.medicationSchedule?.medicineId === med,
        );
        if (reminder) {
          reminder.kind = "medicine";
          reminder.enabled = true;
        }
        return result;
      }, "Recordatorio guardado");
      setSaved(true);
      setDirty(false);
      if (reminder && state.notificationsEnabled) {
        const result = await scheduleReminder(reminder, scope);
        notify(result.message);
      }
      if (!state.notificationsEnabled) notify("Guardado. Los avisos están desactivados en Perfil.");
      onClose();
    } catch (e) {
      setError((e as Error).message);
      if (source && target) throw e;
    } finally {
      setBusy(false);
    }
  };
  const deactivate = async () => {
    if (!existing) return;
    await edit(p=>({...p,reminders:p.reminders.map(r=>r.id===existing.id?{...r,enabled:false}:r)}),"Recordatorio desactivado");
    await cancelReminder(existing.id,scope);
    onClose();
  };
  if (source && target)
    return (
      <MedicationScheduleDialog
        medicine={selected?.m ?? target}
        initial={
          existing?.medicationSchedule
            ? { ...existing.medicationSchedule }
            : undefined
        }
        onClose={onClose}
        onConfirm={persist}
        confirmLabel="Guardar horario"
        onDeactivate={existing && existing.enabled !== false ? deactivate : undefined}
      />
    );
  return (
    <Dialog
      open
      onOpenChange={(v) => {
        if (!v && !busy) onClose();
      }}
    >
      <Dialog.Content className="max-w-full">
        <Dialog.Title>
          {existing ? "Editar recordatorio" : "Recordatorios"}
        </Dialog.Title>
        <Tabs
          defaultValue="timer"
          value={mode}
          variant="segmented"
          size="sm"
          onValueChange={(m) => {
            if (m === "timer" || m === "medicine" || m === "care")
              change(() => setMode(m));
          }}
        >
          <Tabs.List>
          <Tabs.Trigger value="timer" className="min-h-12 px-0" labelClassName="text-xs">
            Temporizador
          </Tabs.Trigger>
          <Tabs.Trigger value="medicine" className="min-h-12 px-0" labelClassName="text-xs">
            Medicamento
          </Tabs.Trigger>
          <Tabs.Trigger value="care" className="min-h-12 px-0" labelClassName="text-xs">
            Cuidado
          </Tabs.Trigger>
          </Tabs.List>
        </Tabs>
        <ScrollFade size={14} edges="both">
          <ScrollView
            style={{ height: Math.min(360, Math.max(220, height - 300)) }}
            keyboardShouldPersistTaps="handled"
          >
            <View className="gap-3 py-2">
              <Input
                label={
                  mode === "medicine" ? "Medicamento" : "Qué quieres recordar"
                }
                placeholder={
                  mode === "medicine"
                    ? "Ej.: Nombre indicado en tu receta"
                    : mode === "care"
                      ? "Ej.: Evitar masticar por el lado indicado"
                      : "Ej.: Retirar compresa"
                }
                value={name}
                onFocus={() => setSuggest(true)}
                onChangeText={(v) => change(() => setName(v))}
              />
              {mode === "medicine" && suggest
                ? unscheduledMedicines(patient)
                    .filter((x) =>
                      x.m.name
                        .toLocaleLowerCase()
                        .includes(name.toLocaleLowerCase()),
                    )
                    .map((x) => (
                      <Row
                        key={`${x.p.id}:${x.m.id}`}
                        title={x.m.name}
                        description={isManualMedicine(x.p) ? "Medicamento manual · sin horario" : "Receta guardada · sin horario"}
                        icon="pill"
                        onPress={() => {
                          change(() => {
                            setSelected(x);
                            setName(x.m.name);
                            setInterval(x.m.intervalHours ?? "");
                            setDays(x.m.days ?? "");
                            setSuggest(false);
                          });
                        }}
                      />
                    ))
                : null}
              {mode === "timer" ? (
                <View className="flex-row gap-3">
                  <Input
                    containerClassName="flex-1 min-w-0 w-auto"
                    label="Horas"
                    placeholder="0"
                    keyboardType="number-pad"
                    value={hours}
                    onChangeText={(v) => change(() => setHours(v))}
                  />
                  <Input
                    containerClassName="flex-1 min-w-0 w-auto"
                    label="Minutos"
                    placeholder="0"
                    keyboardType="number-pad"
                    value={minutes}
                    onChangeText={(v) => change(() => setMinutes(v))}
                  />
                </View>
              ) : mode === "medicine" ? (
                <>
                  <Text size="sm" weight="medium">
                    Primera toma
                  </Text>
                  <DateTimePicker
                    value={start}
                    onValueChange={(v) => change(() => setStart(v))}
                    locale="es-CL"
                    hourCycle={24}
                    layout="wheel"
                    presentation="dialog"
                    doneLabel="Listo"
                    timeLabel="Hora"
                  />
                  <View className="flex-row gap-3">
                    <Input
                      containerClassName="flex-1 min-w-0 w-auto"
                      label="Cada (horas)"
                      placeholder="Ej.: 12"
                      keyboardType="decimal-pad"
                      value={interval}
                      onChangeText={(v) => change(() => setInterval(v))}
                    />
                    <Input
                      containerClassName="flex-1 min-w-0 w-auto"
                      label="Durante (días)"
                      placeholder="Ej.: 7"
                      keyboardType="number-pad"
                      value={days}
                      onChangeText={(v) => change(() => setDays(v))}
                    />
                  </View>
                </>
              ) : null}
              {preview.length ? (
                mode === "medicine" ? (
                  <SchedulePreview times={preview} />
                ) : (
                  <Text>
                    Termina a las {time(preview[0]!)} · {shortDate(preview[0]!)}
                  </Text>
                )
              ) : null}
              {error ? (
                <Text accessibilityRole="alert" className="text-destructive">
                  {error}
                </Text>
              ) : null}
              {saved ? (
                <Text size="sm">
                  Guardado. Revisa el resultado de la programación en este
                  dispositivo.
                </Text>
              ) : null}
            </View>
          </ScrollView>
        </ScrollFade>
        <Dialog.Footer>
          <View className="w-full gap-2">
            <View className="flex-row gap-2">
              <Button
                variant="outline"
                className="flex-1"
                disabled={busy}
                onPress={onClose}
              >
                Cancelar
              </Button>
              <Button
                className="flex-1"
                loading={busy}
                onPress={() => {
                  try {
                    if (!name.trim())
                      throw new Error("Escribe qué quieres recordar.");
                    if (mode !== "care" && !preview.length) {
                      setPreview(
                        mode === "timer"
                          ? [
                              timerAt(
                                timerDuration(hours, minutes),
                              ),
                            ]
                          : medicationPreview(
                              start.toISOString(),
                              Number(interval),
                              Number(days),
                            ),
                      );
                      return;
                    }
                    void persist(
                      mode === "medicine"
                        ? {
                            start: start.toISOString(),
                            intervalHours: Number(interval),
                            days: Number(days),
                          }
                        : undefined,
                    );
                  } catch (e) {
                    setError((e as Error).message);
                  }
                }}
              >
                {mode === "care" || preview.length ? "Guardar" : "Ver horario"}
              </Button>
            </View>
            {existing ? (
              <Button
                variant="ghost"
                disabled={busy}
                onPress={async () => {
                  try {
                    await edit(
                      (p) => ({
                        ...p,
                        reminders: p.reminders.map((r) =>
                          r.id === existing.id ? { ...r, enabled: false } : r,
                        ),
                      }),
                      "Recordatorio desactivado",
                    );
                    await cancelReminder(existing.id, scope);
                    onClose();
                  } catch (e) {
                    setError((e as Error).message);
                  }
                }}
              >
                Desactivar recordatorio
              </Button>
            ) : null}
          </View>
        </Dialog.Footer>
      </Dialog.Content>
    </Dialog>
  );
}
