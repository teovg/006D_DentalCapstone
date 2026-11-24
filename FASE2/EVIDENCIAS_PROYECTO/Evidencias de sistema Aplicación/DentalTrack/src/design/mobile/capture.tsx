import {
  MedicationScheduleDialog,
  type MedicineScheduleDraft,
} from "./TimeNotice";
import { scheduleReminder } from "../../features/reminders/deviceReminders";
import { ScrollFade } from "panelui-native/components/scroll-fade";

import { useEffect, useRef, useState } from "react";
import { Image, ScrollView, View } from "react-native";
import {
  Button,
  HelpLabel,
  NumberingControl,
  OptionalSection,
  Blank,
  Notice,
  PIcon,
  Row,
  Surface,
  Title,
} from "./components";
import { Checkbox } from "panelui-native/components/checkbox";
import { ImageViewer } from "panelui-native/components/image-viewer";
import { Input } from "panelui-native/components/input";
import { SplitView } from "panelui-native/components/split-view";
import { Steps } from "panelui-native/components/steps";
import { Text } from "panelui-native/primitives/text";

import { SvgXml } from "react-native-svg";
import { pickDocumentImage } from "./media";
import { recognizeBudget } from "../../features/documents/budgetOcr";
import { proposeBudget } from "../../features/documents/budgetProposal";
import { proposePrescription } from "../../features/documents/prescriptionProposal";
import { makeId, usePreview } from "./context";
import {
  clp,
  codesFor,
  toothIdsFromCodes,
  type Medicine,
  type Procedure,
  type DesignReminder,
  saveReviewedSchedule,
} from "./model";
const sample = (prescription: boolean) =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="600" height="800" viewBox="0 0 600 800"><rect width="600" height="800" fill="white"/><g fill="#16243b" font-family="sans-serif"><text x="42" y="65" font-size="20" font-weight="bold">Clínica de ejemplo</text><text x="42" y="94" font-size="12">DOCUMENTO FICTICIO PARA REVISAR EL DISEÑO</text><path d="M42 115H558" stroke="#d3dbe7"/><text x="42" y="165" font-size="28">${prescription ? "Receta de ejemplo" : "Plan de tratamiento"}</text><text x="42" y="208" font-size="16">Paciente de ejemplo · 15/11/2026</text><text x="42" y="270" font-size="18" font-weight="bold">${prescription ? "Medicamento de ejemplo A" : "Pieza FDI 16"}</text><text x="42" y="304" font-size="17">${prescription ? "Pauta de ejemplo, sin recomendación médica." : "Restauración de resina"}</text><text x="42" y="340" font-size="17">${prescription ? "Revisar la indicación original." : "Valor: $58.000"}</text><path d="M42 370H558" stroke="#d3dbe7"/><text x="42" y="420" font-size="18" font-weight="bold">${prescription ? "Medicamento de ejemplo B" : "Toda la dentición"}</text><text x="42" y="454" font-size="17">${prescription ? "Pauta literal de prueba." : "Aplicación de flúor barniz"}</text><text x="42" y="490" font-size="17">${prescription ? "Sin dosis ni intervalo sugeridos." : "Valor: $30.000"}</text><path d="M42 540H558" stroke="#d3dbe7"/><text x="42" y="598" font-size="22" font-weight="bold">${prescription ? "Solo para explorar la interfaz" : "Total: $88.000"}</text><text x="42" y="730" font-size="12">Sin datos clínicos reales · DentalTrack</text></g></svg>`;
export function Original({
  uri,
  large = false,
  fitWidth = false,
  expanded,
  onExpandedChange,
}: {
  uri: string;
  large?: boolean;
  fitWidth?: boolean;
  expanded?: boolean;
  onExpandedChange?: (open: boolean) => void;
}) {
  const [frameWidth, setFrameWidth] = useState(320);
  const [ratio, setRatio] = useState(0.75);
  useEffect(() => {
    if (uri && !uri.startsWith("sample:"))
      Image.getSize(
        uri,
        (w, h) => {
          if (w > 0 && h > 0) setRatio(w / h);
        },
        () => {},
      );
  }, [uri]);
  if (fitWidth && uri)
    return (
      <View
        className="flex-1 bg-white"
        onLayout={(e) => setFrameWidth(e.nativeEvent.layout.width)}
      >
        <ScrollView showsVerticalScrollIndicator nestedScrollEnabled>
          {uri.startsWith("sample:") ? (
            <SvgXml
              xml={sample(uri === "sample:prescription")}
              width={frameWidth}
              height={(frameWidth * 800) / 600}
            />
          ) : (
            <ImageViewer
              {...(expanded !== undefined ? { open: expanded } : {})}
              {...(onExpandedChange ? { onOpenChange: onExpandedChange } : {})}
              closeLabel="Cerrar original"
              blur={false}
            >
              <ImageViewer.Trigger
                source={{ uri }}
                alt="Original del documento"
                className="w-full"
              >
                <Image
                  source={{ uri }}
                  style={{ width: frameWidth, height: frameWidth / ratio }}
                  resizeMode="contain"
                  accessibilityLabel="Original del documento"
                />
              </ImageViewer.Trigger>
            </ImageViewer>
          )}
        </ScrollView>
      </View>
    );
  if (uri.startsWith("sample:"))
    return (
      <View
        className="flex-1 items-center justify-center bg-white"
        style={{ minHeight: large ? 420 : 160 }}
      >
        <SvgXml
          xml={sample(uri === "sample:prescription")}
          width="100%"
          height="100%"
          preserveAspectRatio="xMidYMid meet"
        />
      </View>
    );
  if (!uri)
    return (
      <Blank
        title="Original no disponible"
        description="Los datos confirmados siguen accesibles."
      />
    );
  return (
    <ImageViewer
      {...(expanded !== undefined ? { open: expanded } : {})}
      {...(onExpandedChange ? { onOpenChange: onExpandedChange } : {})}
      closeLabel="Cerrar original"
      blur={false}
    >
      <ImageViewer.Trigger
        source={{ uri }}
        alt="Original del documento"
        className="flex-1 w-full"
        radius={0}
      >
        <Image
          source={{ uri }}
          style={{ flex: 1, width: "100%", minHeight: large ? 420 : 160 }}
          resizeMode="contain"
          accessibilityLabel="Original del documento"
        />
      </ImageViewer.Trigger>
    </ImageViewer>
  );
}
export function CaptureScreen() {
  const {
    location,
    ui,
    go,
    back,
    edit,
    setDirty,
    open,
    state,
    patient,
    notify,
    notificationScope,
  } = usePreview();

  const [viewerOpen, setViewerOpen] = useState(false);
  const [scheduleDrafts, setScheduleDrafts] = useState<
    Record<string, MedicineScheduleDraft>
  >({});
  const [scheduleMedicine, setScheduleMedicine] = useState<string | null>(null);
  const reviewRef = useRef<ScrollView>(null);
  const prescription = location.id === "prescription";
  const initial =
    ui.captureImage ?? `sample:${prescription ? "prescription" : "budget"}`;
  const [uri, setUri] = useState(initial);
  const [step, setStep] = useState(0);
  const [index, setIndex] = useState(0);
  useEffect(() => {
    reviewRef.current?.scrollTo({ y: 0, animated: false });
  }, [step, index]);
  const [numbering, setNumbering] = useState<"fdi" | "universal">(
    state.numbering,
  );
  const [clinic, setClinic] = useState(
    uri.startsWith("sample:") ? "Clínica de ejemplo" : "",
  );
  const [error, setError] = useState("");
  const [reading, setReading] = useState(false);
  const [sourceCodes, setSourceCodes] = useState<Record<string, string>>({});
  const abort = useRef<AbortController | null>(null);
  useEffect(() => () => abort.current?.abort(), []);
  const [rows, setRows] = useState<Procedure[]>(() =>
    uri.startsWith("sample:")
      ? [
          {
            id: makeId("proposal"),
            title: "Restauración de resina",
            toothIds: toothIdsFromCodes("16"),
            amount: 58000,
            general: false,
            done: false,
          },
          {
            id: makeId("proposal"),
            title: "Aplicación de flúor barniz",
            toothIds: [],
            amount: 30000,
            general: true,
            done: false,
          },
        ]
      : [
          {
            id: makeId("proposal"),
            title: "",
            toothIds: [],
            amount: 0,
            general: false,
            done: false,
          },
        ],
  );
  const [meds, setMeds] = useState<Medicine[]>(() =>
    uri.startsWith("sample:")
      ? [
          {
            id: makeId("med"),
            name: "Medicamento de ejemplo A",
            instruction: "Pauta de ejemplo, sin recomendación médica.",
          },
          {
            id: makeId("med"),
            name: "Medicamento de ejemplo B",
            instruction: "Pauta literal de prueba.",
          },
        ]
      : [{ id: makeId("med"), name: "", instruction: "" }],
  );
  const [title, setTitle] = useState(rows[0]?.title ?? "");
  const [codes, setCodes] = useState(
    codesFor(rows[0]?.toothIds ?? [], numbering),
  );
  const [amount, setAmount] = useState(String(rows[0]?.amount ?? ""));
  const [general, setGeneral] = useState(rows[0]?.general ?? false);
  const items = prescription ? meds : rows;
  const currentMed = meds[index];
  const updateMed = (
    key:
      | "name"
      | "instruction"
      | "strength"
      | "quantity"
      | "intervalHours"
      | "days",
    value: string,
  ) => {
    setDirty(true);
    setMeds((current) =>
      current.map((m, i) => (i === index ? { ...m, [key]: value } : m)),
    );
  };
  const loadRow = (i: number, source = rows) => {
    const row = source[i];
    if (!row) return;
    setTitle(row.title);
    setCodes(
      row.toothIds.length || row.general
        ? codesFor(row.toothIds, numbering)
        : (sourceCodes[row.id] ?? ""),
    );
    setAmount(String(row.amount));
    setGeneral(row.general);
  };
  const validate = (): Procedure[] => {
    if (prescription) {
      if (
        !currentMed?.name.trim() ||
        (!currentMed.instruction.trim() &&
          (!currentMed.quantity ||
            !currentMed.intervalHours ||
            !currentMed.days))
      )
        throw new Error(
          "Completa el nombre y la pauta tal como aparecen en la receta.",
        );
      return rows;
    }
    if (!title.trim()) throw new Error("Escribe la prestación.");
    const value = Number(amount.replace(/\./g, ""));
    if (!Number.isSafeInteger(value) || value < 0)
      throw new Error("Revisa el importe en pesos, sin decimales.");
    const ids = toothIdsFromCodes(codes, numbering);
    if (!ids.length && !general)
      throw new Error(
        "Sin piezas: confirma que la prestación es para toda la dentición.",
      );
    return rows.map((r, i) =>
      i === index
        ? {
            ...r,
            title: title.trim(),
            toothIds: ids,
            amount: value,
            general: !ids.length && general,
          }
        : r,
    );
  };
  const next = (summary = false) => {
    try {
      const nextRows = validate();
      setRows(nextRows);
      setError("");
      if (summary || index === items.length - 1) setStep(2);
      else {
        setIndex(index + 1);
        loadRow(index + 1, nextRows);
      }
    } catch (e) {
      setError((e as Error).message);
    }
  };
  const confirm = async () => {
    try {
      const id = makeId(prescription ? "prescription" : "budget");
      const scheduled: DesignReminder[] = [];
      await edit((p) => {
        const next = prescription
          ? {
              ...p,
              prescriptions: [
                {
                  id,
                  title: "Receta confirmada",
                  origin: "scan" as const,
                  date: new Date().toISOString(),
                  image: uri,
                  medicines: meds,
                },
                ...p.prescriptions,
              ],
            }
          : {
              ...p,
              budgets: [
                {
                  id,
                  title: "Plan de tratamiento",
                  clinic: clinic.trim(),
                  image: uri,
                  rows,
                  payments: [],
                },
                ...p.budgets,
              ],
            };
        let result = next;
        if (prescription)
          for (const med of meds) {
            const draft = scheduleDrafts[med.id];
            if (!draft) continue;
            result = saveReviewedSchedule(result, {
              id: makeId("reminder"),
              prescriptionId: id,
              medicineId: med.id,
              ...draft,
            });
            const reminder = result.reminders.find(
              (r) =>
                r.sourceId === id &&
                r.medicationSchedule?.medicineId === med.id,
            );
            if (reminder) {
              reminder.kind = "medicine";
              reminder.enabled = true;
              scheduled.push(reminder);
            }
          }
        return result;
      }, "Documento confirmado");
      for (const reminder of state.notificationsEnabled ? scheduled : []) {
        const result = await scheduleReminder(
          reminder,
          notificationScope ?? patient.id,
        );
        notify(result.message);
      }
      setDirty(false);
      go(prescription ? "prescription" : "budget", id);
    } catch (e) {
      setError((e as Error).message);
    }
  };
  const scan = async () => {
    setReading(true);
    setError("");
    const controller = new AbortController();
    abort.current = controller;
    const timer = setTimeout(() => controller.abort(), 90000);
    try {
      const result = await recognizeBudget(uri, controller.signal);
      if (prescription) {
        const next = proposePrescription(result.text).map((m) => ({
          id: makeId("med"),
          name: m.name,
          instruction: m.sourceInstructions,
          quantity: m.dose,
          intervalHours: m.everyHours,
          days: m.days,
        }));
        if (!next.length)
          throw new Error(
            "No se reconocieron pautas completas. Puedes añadirlas manualmente mirando el original.",
          );
        setMeds(next);
      } else {
        const proposal = proposeBudget(result);
        if (!proposal.rows.length)
          throw new Error(
            "No se reconocieron prestaciones. Puedes añadirlas manualmente mirando el original.",
          );
        const next = proposal.rows.map((r) => ({
          id: makeId("proposal"),
          title: r.description,
          toothIds: [] as string[],
          amount: Number(r.amount),
          general: false,
          done: false,
        }));
        setRows(next);
        setSourceCodes(
          Object.fromEntries(
            next.map((r, i) => [r.id, proposal.rows[i]!.toothCode]),
          ),
        );
        setClinic(proposal.clinic);
        setTitle(next[0]!.title);
        setCodes(proposal.rows[0]!.toothCode);
        setAmount(String(next[0]!.amount));
        setGeneral(false);
      }
      setIndex(0);
      setStep(1);
      setDirty(true);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      clearTimeout(timer);
      setReading(false);
    }
  };
  const replace = async () => {
    try {
      const image = await pickDocumentImage(false);
      if (image) {
        setUri(image.uri);
        setDirty(true);
        setError("");
        setStep(0);
        setRows([
          {
            id: makeId("proposal"),
            title: "",
            toothIds: [],
            amount: 0,
            general: false,
            done: false,
          },
        ]);
        setMeds([{ id: makeId("med"), name: "", instruction: "" }]);
        setIndex(0);
        setTitle("");
        setCodes("");
        setAmount("");
        setGeneral(false);
        setClinic("");
      }
    } catch (e) {
      setError((e as Error).message);
    }
  };
  const original = (
    <View className="flex-1 min-h-0 bg-muted">
      <Original
        uri={uri}
        expanded={viewerOpen}
        onExpandedChange={setViewerOpen}
      />
      <View
        className="absolute bottom-2 right-2 bg-primary rounded-full border-2 border-white"
        style={{ opacity: 0.96 }}
      >
        <Button
          variant="ghost"
          size="sm"
          onPress={() => setViewerOpen(true)}
          accessibilityLabel="Ampliar original"
        >
          <PIcon name="expand" size={20} onPrimary />
        </Button>
      </View>
    </View>
  );
  const panel = (
    <View className="flex-1 bg-card min-h-0">
      <ScrollFade className="flex-1 min-h-0" edges="both" size={18}>
        <ScrollView
          ref={reviewRef}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator
          contentContainerStyle={{ padding: 20, gap: 16, paddingBottom: 24 }}
        >
          {step === 0 ? (
            <>
              <Title>
                {prescription ? "Prepara tu receta" : "Prepara tu presupuesto"}
              </Title>
              {!prescription ? (
                <>
                  <Text size="sm">Numeración que usa el documento</Text>
                  <NumberingControl
                    guide
                    value={numbering}
                    onChange={(n) => {
                      setNumbering(n);
                      setCodes(codesFor(rows[index]?.toothIds ?? [], n));
                    }}
                  />
                  <OptionalSection title="Añadir clínica" initial={!!clinic}>
                    <Input
                      label="Clínica (opcional)"
                      value={clinic}
                      onChangeText={(v) => {
                        setClinic(v);
                        setDirty(true);
                      }}
                    />
                  </OptionalSection>
                </>
              ) : null}
              <Button
                variant="ghost"
                onPress={() => {
                  void replace();
                }}
              >
                Elegir otra imagen
              </Button>
            </>
          ) : step === 1 ? (
            <>
              <View className="flex-row justify-between items-center gap-3">
                <Text weight="semibold">
                  {prescription ? "Medicamento" : "Prestación"} {index + 1} de{" "}
                  {items.length}
                </Text>
                <View className="flex-row gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    accessibilityLabel="Quitar fila actual"
                    disabled={items.length <= 1}
                    onPress={() => {
                      const nextIndex = Math.min(index, items.length - 2);
                      if (prescription)
                        setMeds((m) => m.filter((_, i) => i !== index));
                      else {
                        const nextRows = rows.filter((_, i) => i !== index);
                        setRows(nextRows);
                        loadRow(nextIndex, nextRows);
                      }
                      setIndex(nextIndex);
                      setDirty(true);
                      setError("");
                    }}
                  >
                    <PIcon name="minus" size={18} />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    accessibilityLabel="Añadir otra fila"
                    onPress={async () => {
                      try {
                        const nextRows = validate();
                        if (prescription) {
                          setMeds((m) => [
                            ...m,
                            { id: makeId("med"), name: "", instruction: "" },
                          ]);
                        } else {
                          const next = [
                            ...nextRows,
                            {
                              id: makeId("proposal"),
                              title: "",
                              toothIds: [],
                              amount: 0,
                              general: false,
                              done: false,
                            },
                          ];
                          setRows(next);
                          loadRow(next.length - 1, next);
                        }
                        setIndex(items.length);
                        setDirty(true);
                        setError("");
                      } catch (e) {
                        setError((e as Error).message);
                      }
                    }}
                  >
                    <PIcon name="plus" size={18} />
                  </Button>
                </View>
              </View>
              {!prescription ? (
                <NumberingControl
                  value={numbering}
                  onChange={(n) => {
                    setNumbering(n);
                    setError("");
                    if (rows[index]?.toothIds.length)
                      setCodes(codesFor(rows[index]!.toothIds, n));
                  }}
                />
              ) : null}
              {prescription ? (
                <>
                  <Input
                    label="Nombre del medicamento"
                    placeholder="Ej.: Amoxicilina (concentración abajo)"
                    value={currentMed?.name ?? ""}
                    onChangeText={(v) => updateMed("name", v)}
                  />
                  <View className="flex-row gap-3">
                    <View className="flex-1">
                      <Input
                        label="Concentración"
                        placeholder="Ej.: 875 mg"
                        value={currentMed?.strength ?? ""}
                        onChangeText={(v) => updateMed("strength", v)}
                      />
                    </View>
                    <View className="flex-1">
                      <Input
                        label="Por toma"
                        placeholder="Ej.: 1 comprimido"
                        value={currentMed?.quantity ?? ""}
                        onChangeText={(v) => updateMed("quantity", v)}
                      />
                    </View>
                  </View>
                  <View className="flex-row gap-3">
                    <View className="flex-1">
                      <Input
                        label="Cada (horas)"
                        placeholder="Según receta"
                        keyboardType="numeric"
                        value={currentMed?.intervalHours ?? ""}
                        onChangeText={(v) => updateMed("intervalHours", v)}
                      />
                    </View>
                    <View className="flex-1">
                      <Input
                        label="Durante (días)"
                        placeholder="Según receta"
                        keyboardType="numeric"
                        value={currentMed?.days ?? ""}
                        onChangeText={(v) => updateMed("days", v)}
                      />
                    </View>
                  </View>
                  {currentMed?.instruction ? (
                    <Text muted size="sm">
                      Texto reconocido para comparar: {currentMed.instruction}
                    </Text>
                  ) : null}
                  <HelpLabel title="Datos según tu receta">
                    Copia la pauta del original. La aplicación no completa ni
                    recomienda una dosis.
                  </HelpLabel>
                </>
              ) : (
                <>
                  <Input
                    label="Prestación"
                    placeholder="Ej.: Cierre de diastema por pieza"
                    value={title}
                    onChangeText={(v) => {
                      setTitle(v);
                      setDirty(true);
                    }}
                  />
                  {title.trim() ? (
                    <Button
                      variant="ghost"
                      onPress={() => open({ kind: "education", term: title })}
                    >
                      Qué significa esta prestación
                    </Button>
                  ) : null}
                  <View className="flex-row gap-3">
                    <View className="flex-1">
                      <Input
                        label={`Piezas (${numbering === "fdi" ? "FDI" : "Universal"})`}
                        value={codes}
                        onChangeText={(v) => {
                          setCodes(v);
                          setGeneral(false);
                          setDirty(true);
                        }}
                        placeholder={
                          numbering === "fdi" ? "Ej.: 16, 26" : "Ej.: 3, 14"
                        }
                      />
                    </View>
                    <View className="flex-1">
                      <Input
                        label="Importe (CLP)"
                        keyboardType="numeric"
                        value={amount}
                        onChangeText={(v) => {
                          setAmount(v);
                          setDirty(true);
                        }}
                      />
                    </View>
                  </View>
                  {!codes.trim() ? (
                    <>
                      <Text muted size="xs">
                        Sin piezas: confirma si corresponde a toda la dentición.
                      </Text>
                      <Checkbox
                        label="Corresponde a toda la dentición"
                        checked={general}
                        onCheckedChange={(v) => {
                          setGeneral(v);
                          setDirty(true);
                        }}
                      />
                    </>
                  ) : (
                    <Text muted size="xs">
                      Deja las piezas vacías si corresponde a toda la dentición.
                    </Text>
                  )}
                </>
              )}
              {error ? (
                <Text className="text-destructive" accessibilityRole="alert">
                  {error}
                </Text>
              ) : null}
            </>
          ) : (
            <>
              <Title>Datos que vas a guardar</Title>
              {prescription ? (
                meds.map((m) => (
                  <Surface key={m.id}>
                    <View className="flex-row items-start gap-2">
                      <View className="flex-1 gap-1">
                        <Text weight="semibold">{m.name}</Text>
                        <Text muted size="sm">
                          {m.quantity
                            ? `${m.strength ?? ""} · ${m.quantity} cada ${m.intervalHours} horas durante ${m.days} días`
                            : m.instruction}
                        </Text>
                      </View>
                      <Button
                        variant="outline"
                        accessibilityLabel={`Preparar horario de ${m.name}`}
                        onPress={() => setScheduleMedicine(m.id)}
                      >
                        <PIcon name="timer" />
                      </Button>
                    </View>
                    {scheduleDrafts[m.id] ? (
                      <Text size="sm" muted>
                        Primera toma:{" "}
                        {new Intl.DateTimeFormat("es-CL", {
                          weekday: "short",
                          hour: "2-digit",
                          minute: "2-digit",
                        }).format(new Date(scheduleDrafts[m.id]!.start))}
                      </Text>
                    ) : null}
                  </Surface>
                ))
              ) : (
                <>
                  {clinic ? (
                    <Text muted size="sm">
                      {clinic}
                    </Text>
                  ) : null}
                  <Text className="text-xl font-semibold">
                    Total {clp(rows.reduce((sum, r) => sum + r.amount, 0))}
                  </Text>
                  {rows.map((r, i) => (
                    <Row
                      key={r.id}
                      title={r.title}
                      description={`${r.general ? "Toda la dentición" : codesFor(r.toothIds, numbering)} · ${clp(r.amount)}`}
                      onPress={async () => {
                        loadRow(i);
                        setIndex(i);
                        setStep(1);
                      }}
                    />
                  ))}

                  <Notice>
                    Confirmar el presupuesto no cambia el estado clínico de tus
                    piezas.
                  </Notice>
                </>
              )}
              {error ? (
                <Text className="text-destructive" accessibilityRole="alert">
                  {error}
                </Text>
              ) : null}
              <Button variant="ghost" onPress={() => setStep(1)}>
                Volver a editar
              </Button>
            </>
          )}
        </ScrollView>
      </ScrollFade>
      {step === 0 ? (
        <View className="px-5 py-3 gap-2 border-t border-border">
          {error ? (
            <Text className="text-destructive" accessibilityRole="alert">
              {error}
            </Text>
          ) : null}
          {!uri.startsWith("sample:") ? (
            <Button disabled={reading} onPress={scan}>
              {reading ? "Leyendo documento…" : "Leer con OCR"}
            </Button>
          ) : null}
          <Button
            disabled={reading}
            variant="outline"
            onPress={() => {
              setError("");
              setStep(1);
              setDirty(true);
            }}
          >
            {uri.startsWith("sample:")
              ? "Revisar lectura de ejemplo"
              : "Añadir datos manualmente"}
          </Button>
        </View>
      ) : null}
      {step === 1 ? (
        <View className="px-4 py-2 border-t border-border">

          <View className="flex-row gap-2">
            <Button
              variant="outline"
              className="flex-1"
              disabled={index === 0}
              onPress={async () => {
                try {
                  const nextRows = validate();
                  setRows(nextRows);
                  setIndex(index - 1);
                  loadRow(index - 1, nextRows);
                  setError("");
                } catch (e) {
                  setError((e as Error).message);
                }
              }}
            >
              Anterior
            </Button>
            <Button className="flex-1" onPress={() => next()}>
              {index === items.length - 1 ? "Revisar datos" : "Siguiente"}
            </Button>
          </View>
        </View>
      ) : step === 2 ? (
        <View className="px-4 py-2 border-t border-border">
          <Button onPress={confirm}>Confirmar datos y guardar</Button>
        </View>
      ) : null}
    </View>
  );
  return (
    <View className="flex-1 min-h-0">
      <View className="px-4 py-2 gap-2 bg-card">
        <View className="flex-row items-center gap-2">
          <Text weight="semibold" className="flex-1">
            {prescription ? "Digitalizar receta" : "Digitalizar presupuesto"}
          </Text>
          <Button variant="ghost" className="px-2" onPress={back}>
            <Text size="sm" className="text-destructive">
              Cancelar
            </Text>
          </Button>
        </View>
        <Steps value={step}>
          {["Capturar", "Revisar", "Preparar"].map((label, i) => (
            <Steps.Item key={label} step={i} className="flex-1 gap-1.5">
              <Steps.Indicator />
              <Steps.Title>{label}</Steps.Title>
            </Steps.Item>
          ))}
        </Steps>
      </View>
      <SplitView
        key={step}
        className="flex-1"
        variant="seam"
        snapPoints={[0.2, 0.4, 0.6]}
        minHeight={100}
        maxHeight={-160}
        defaultSnapIndex={step > 0 ? 0 : 1}
      >
        <SplitView.Top>{original}</SplitView.Top>
        <SplitView.DragArea accessibilityLabel="Cambiar espacio del original y la revisión">
          <SplitView.Handle />
        </SplitView.DragArea>
        <SplitView.Bottom>{panel}</SplitView.Bottom>
      </SplitView>
      {scheduleMedicine && meds.find((m) => m.id === scheduleMedicine) ? (
        <MedicationScheduleDialog
          key={scheduleMedicine}
          medicine={meds.find((m) => m.id === scheduleMedicine)!}
          initial={scheduleDrafts[scheduleMedicine]}
          onClose={() => setScheduleMedicine(null)}
          onConfirm={(draft) => {
            setScheduleDrafts((s) => ({ ...s, [scheduleMedicine]: draft }));
            setDirty(true);
            setScheduleMedicine(null);
          }}
        />
      ) : null}
    </View>
  );
}
