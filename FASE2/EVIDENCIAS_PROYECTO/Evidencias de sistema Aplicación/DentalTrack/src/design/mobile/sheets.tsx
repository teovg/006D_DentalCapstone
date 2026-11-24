import { TimeNotice } from "./TimeNotice";
import { ToothGuide } from "./ToothGuide";
import { isHomeGuideRequested } from "./homeGuideRequested";
import { guideColors } from "./HomeGuide";
import { ModalBackground } from "./ModalBackground";
import { useState } from "react";
import {
  Linking,
  ScrollView,
  View,
  useWindowDimensions as usePhoneDimensions,
} from "react-native";
import { BottomSheet } from "panelui-native/components/bottom-sheet";
import {
  Button,
  HelpLabel,
  OptionalSection,
  NamedSelect,
  Blank,
  Notice,
  PIcon,
  Row,
  Section,
  Status,
} from "./components";
import { Checkbox } from "panelui-native/components/checkbox";
import { TagInput } from "panelui-native/components/tag-input";
import { DatePicker } from "panelui-native/components/date-picker";
import { DateTimePicker } from "panelui-native/components/date-time-picker";
import { Dialog } from "panelui-native/components/dialog";
import { Input } from "panelui-native/components/input";
import { Separator } from "panelui-native/components/separator";
import { Steps } from "panelui-native/components/steps";
import { Text } from "panelui-native/primitives/text";
import { Textarea } from "panelui-native/components/textarea";
import { useEducation } from "../../features/education/useEducation";
import { permanentTeeth } from "../../domain/teeth/catalog";
import type { ToothStatus } from "../../domain/teeth/types";
import { pickDocumentImage } from "./media";
import { makeId, shortDate, time, usePreview } from "./context";
import {
  budgetTotal,
  clp,
  codesFor,
  newPatient,
  paidTotal,
  recordPayment,
  recordSession,
  toothIdsFromCodes,
  type DesignAppointment,
  type DesignSession,
  type DesignTreatment,
} from "./model";
const titles = {
  actions: "Añadir a tu seguimiento",
  appointment: "Tu cita dental",
  session: "Registrar atención",
  reminder: "Avisos y horarios",
  schedule: "Horarios de medicamentos",
  treatment: "Tratamiento",
  tooth: "Detalle dental",
  payment: "Registrar abono",
  source: "Añadir documento",
  education: "Qué significa",
  "patient-picker": "Cambiar perfil",
  family: "Nuevo perfil familiar",
  preview: "Revisar la propuesta",
};
export function PreviewSheets() {
  const { sheet, close, education, closeEducation, state } = usePreview();
  const selectedTooth =
    sheet?.kind === "tooth"
      ? permanentTeeth.find((t) => t.id === sheet.id)
      : undefined;
  const heading = selectedTooth
    ? `Pieza ${selectedTooth[state.numbering]}`
    : sheet?.kind === "reminder" && sheet.id
      ? "Editar recordatorio"
      : sheet
        ? titles[sheet.kind]
        : "";
  const guideTooth = !!selectedTooth && isHomeGuideRequested();
  const { height } = usePhoneDimensions();
  const sheetHeight = Math.min(height - 100, 820);
  return (
    <>
      <BottomSheet
        open={
          !!sheet &&
          sheet.kind !== "reminder" &&
          sheet.kind !== "treatment" &&
          sheet.kind !== "schedule"
        }
        onOpenChange={(open) => {
          if (!open) close();
        }}
      >
        <BottomSheet.Content
          accessibilityLabel={heading || "Detalle"}
          size={
            sheet &&
            [
              "appointment",
              "session",
              "treatment",
              "tooth",
              "education",
              "payment",
              "reminder",
              "family",
            ].includes(sheet.kind)
              ? sheetHeight
              : "auto"
          }
          className="max-w-full self-center w-full"
          style={guideTooth ? { backgroundColor: guideColors.background } : undefined}
          showClose={education === null}
        >
          <BottomSheet.Header
            title={
              selectedTooth ? (
                <View className="flex-row items-center gap-3">
                  <Text className="text-lg font-semibold" style={guideTooth ? {color:guideColors.ink,fontSize:27,lineHeight:34} : undefined}>{heading}</Text>
                  <View className="flex-1">
                    <Text muted size="xs">
                      {selectedTooth.name}
                    </Text>
                    <Text muted size="xs">
                      FDI {selectedTooth.fdi} · Universal{" "}
                      {selectedTooth.universal}
                    </Text>
                  </View>
                </View>
              ) : (
                heading
              )
            }
          />
          {sheet?.kind === "tooth" ? (
            <ModalBackground fill inactive={education !== null}>
              {guideTooth ? <ToothGuide key={sheet.id} /> : <Tooth key={sheet.id} />}
            </ModalBackground>
          ) : sheet &&
            ![
              "tooth",
              "source",
              "education",
              "actions",
              "patient-picker",
              "preview",
            ].includes(sheet.kind) ? (
            <ModalBackground fill inactive={education !== null}>
              <Editor
                key={`${sheet.kind}-${sheet.id ?? ""}-${sheet.sourceId ?? ""}`}
              />
            </ModalBackground>
          ) : (
            <BottomSheet.Body
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator
            >
              <ModalBackground inactive={education !== null}>
                {sheet ? (
                  <SheetBody
                    key={`${sheet.kind}-${sheet.id ?? ""}-${sheet.sourceId ?? ""}-${sheet.term ?? ""}`}
                  />
                ) : null}
              </ModalBackground>
            </BottomSheet.Body>
          )}
        </BottomSheet.Content>
      </BottomSheet>
      {sheet?.kind === "reminder" ? (
        <TimeNotice
          key={sheet.id ?? "new"}
          reminderId={sheet.id}
          onClose={close}
        />
      ) : null}
      {sheet?.kind === "schedule" ? (
        <TimeNotice
          key={sheet.sourceId ?? "schedule"}
          prescriptionId={sheet.sourceId}
          medicineId={sheet.term}
          onClose={close}
        />
      ) : null}
      {sheet?.kind === "treatment" ? (
        <Dialog
          open
          onOpenChange={(v) => {
            if (!v) close();
          }}
        >
          <Dialog.Content>
            <Dialog.Title>Tratamiento sin presupuesto</Dialog.Title>
            <Editor compact key={sheet.id ?? "new"} />
          </Dialog.Content>
        </Dialog>
      ) : null}
      <BottomSheet
        open={education !== null}
        onOpenChange={(open) => {
          if (!open) closeEducation();
        }}
      >
        <BottomSheet.Content
          accessibilityLabel="Qué significa"
          size={sheetHeight}
          className="max-w-full self-center w-full"
        >
          <BottomSheet.Header title="Qué significa" />
          <BottomSheet.Body>
            <Education term={education ?? ""} />
          </BottomSheet.Body>
          <BottomSheet.Footer>
            <Button fullWidth variant="outline" onPress={closeEducation}>
              Volver
            </Button>
          </BottomSheet.Footer>
        </BottomSheet.Content>
      </BottomSheet>
    </>
  );
}
function SheetBody() {
  const { sheet } = usePreview();
  if (!sheet) return null;
  switch (sheet.kind) {
    case "tooth":
      return <Tooth />;
    case "source":
      return <Source />;
    case "education":
      return <Education term={sheet.term ?? ""} />;
    case "actions":
      return <Actions />;
    case "patient-picker":
      return <PatientPicker />;
    case "preview":
      return null;
    default:
      return <Editor />;
  }
}
function Actions() {
  const { open } = usePreview();
  return (
    <View className="px-5 pb-3">
      <Row
        title="Nueva cita"
        description="Una visita futura, sin registrar una atención."
        icon="calendar"
        onPress={() => open({ kind: "appointment" })}
      />
      <Separator />
      <Row
        title="Registrar atención"
        description="Una visita que ya ocurrió."
        icon="tooth"
        onPress={() => open({ kind: "session" })}
      />
      <Separator />
      <Row
        title="Recordatorio"
        description="Prepara un aviso para tu cuidado."
        icon="bell"
        onPress={() => open({ kind: "reminder" })}
      />
    </View>
  );
}
function PatientPicker() {
  const { state, setState, go, close, open } = usePreview();
  return (
    <View className="px-5 pb-4 gap-3">
      {state.patients.map((p) => (
        <Row
          key={p.id}
          title={p.name}
          description={
            state.activePatientId === p.id
              ? "Perfil actual"
              : "Registros independientes"
          }
          icon="user"
          onPress={async () => {
            setState((s) => ({ ...s, activePatientId: p.id }));
            close();
            go("home");
          }}
        />
      ))}
      <Button
        variant="outline"
        onPress={() =>
          state.plan === "premium" ? open({ kind: "family" }) : go("plan")
        }
      >
        Añadir un familiar
      </Button>
    </View>
  );
}
function Source() {
  const { go, setUI, close, edit, production, persistence } = usePreview();
  const [type, setType] = useState("budget");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const choose = async (camera: boolean) => {
    setBusy(true);
    setError("");
    try {
      const image = await pickDocumentImage(camera);
      if (!image) return;
      if (type === "xray" || type === "other") {
        await edit(
          (p) => ({
            ...p,
            attachments: [
              {
                id: makeId("file"),
                title:
                  image.fileName ||
                  (type === "xray" ? "Radiografía" : "Archivo"),
                image: image.uri,
                type,
                date: new Date().toISOString(),
              },
              ...p.attachments,
            ],
          }),
          "Archivo añadido",
        );
        close();
        go("documents");
        return;
      }
      setUI((s) => ({ ...s, captureImage: image.uri }));
      close();
      go("capture", type);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <View className="px-5 pb-5 gap-4">
      <Text size="sm" weight="medium">
        ¿Qué vas a añadir?
      </Text>
      <NamedSelect value={type} onValueChange={setType} presentation="inline">
        <NamedSelect.Item value="budget" label="Presupuesto dental" />
        <NamedSelect.Item value="prescription" label="Receta médica" />
        <NamedSelect.Item value="xray" label="Radiografía (imagen)" />
        <NamedSelect.Item value="other" label="Otra imagen" />
      </NamedSelect>
      <View className="flex-row gap-3">
        <Button
          className="flex-1"
          onPress={async () => {
            void choose(true);
          }}
          loading={busy}
          startContent={<PIcon name="camera" size={19} onPrimary />}
        >
          Tomar foto
        </Button>
        <Button
          className="flex-1"
          variant="outline"
          disabled={busy}
          onPress={async () => {
            void choose(false);
          }}
        >
          Elegir imagen
        </Button>
      </View>
      {error ? (
        <Text className="text-destructive" accessibilityRole="alert">
          {error}
        </Text>
      ) : null}
      {!production ? (
        <Button
          variant="ghost"
          disabled={type === "xray" || type === "other"}
          onPress={async () => {
            setUI((s) => ({ ...s, captureImage: `sample:${type}` }));
            close();
            go("capture", type);
          }}
        >
          Explorar con documento de ejemplo
        </Button>
      ) : null}
      <Text muted size="xs">
        {production
          ? persistence === "remote" ? "Recorta la imagen: deja solo lo necesario y oculta datos personales innecesarios. El OCR se procesa en el equipo del lector. Al confirmar, el original se guarda de forma privada en tu cuenta." : "Recorta la imagen: deja solo lo necesario y oculta datos personales innecesarios. El OCR se procesa en el equipo del lector. El original y los datos se conservan solo en este equipo."
          : "Explora una lectura de ejemplo para revisar el diseño."}
      </Text>
    </View>
  );
}
function Education({ term }: { term: string }) {
  const [error, setError] = useState("");
  const { scenario } = usePreview();
  const { entries, remote } = useEducation(term, scenario === "offline");
  return (
    <View className="p-5 gap-5">
      <Text className="text-2xl font-semibold">
        {term || "Concepto dental"}
      </Text>
      {entries.length ? (
        entries.map((e) => (
          <View className="gap-4" key={e.id}>
            <Status>Resumen guardado</Status>
            <Text className="leading-7">{e.answer}</Text>
            <Separator />
            <View className="gap-1">
              <Text weight="semibold">{e.source.institution}</Text>
              <Text size="sm" muted>
                {e.source.title}
              </Text>
              <Text size="xs" muted>
                Revisado el {shortDate(e.reviewedAt + "T12:00:00")}
              </Text>
            </View>
            <Button
              variant="outline"
              onPress={async () => {
                if (scenario === "offline") {
                  setError(
                    "Sin conexión para abrir la fuente. Puedes seguir leyendo el resumen guardado.",
                  );
                  return;
                }
                void Linking.openURL(e.source.url).catch(() =>
                  setError("No se pudo abrir el enlace. Puedes reintentarlo."),
                );
              }}
            >
              Leer la fuente original
            </Button>
          </View>
        ))
      ) : remote.status === "loading" ? (
        <Text>Cargando explicación y fuentes…</Text>
      ) : remote.status === "answered" ? (
        <View className="gap-3">
          <Status>Explicación generada</Status>
          <Text>{remote.explanation}</Text>
          {remote.sources.map((source) => (
            <Button
              key={source.id}
              variant="outline"
              onPress={() => {
                void Linking.openURL(source.url).catch(() =>
                  setError(
                    "No se pudo abrir la fuente. Reintenta cuando tengas conexión.",
                  ),
                );
              }}
            >
              Leer fuente · {source.domain}
            </Button>
          ))}
        </View>
      ) : (
        <Text muted>
          {remote.message ||
            "No encontramos evidencia suficiente para explicar este término. Comprueba cómo aparece en el documento."}
        </Text>
      )}
      {error ? <Text className="text-destructive">{error}</Text> : null}
      <Notice>
        Información general para entender el término. No determina el
        diagnóstico ni el tratamiento de tu caso.
      </Notice>
    </View>
  );
}
function Tooth() {
  const { sheet, patient, edit, setDirty, open, go } = usePreview();
  const [toothId] = useState(sheet?.id);
  const [now] = useState(() => Date.now());
  const tooth = permanentTeeth.find((t) => t.id === toothId);
  const existing = patient.toothStates[toothId ?? ""];
  const [status, setStatus] = useState(existing?.status ?? "");
  const [note, setNote] = useState(existing?.note ?? "");
  const [error, setError] = useState("");
  if (!tooth)
    return (
      <Blank
        title="Pieza no disponible"
        description="Vuelve al mapa para seleccionar una pieza."
      />
    );
  const labels: Record<ToothStatus, string> = {
    healthy: "Sin hallazgos registrados",
    observation: "En observación",
    in_treatment: "En tratamiento",
    urgent: "Prioridad alta",
    missing: "Ausente",
  };
  const linked = patient.budgets.flatMap((b) =>
    b.rows
      .filter((r) => r.general || r.toothIds.includes(tooth.id))
      .map((row) => ({ row, budget: b })),
  );
  return (
    <>
      <BottomSheet.Body
        nestedScrollEnabled
        showsVerticalScrollIndicator
        keyboardShouldPersistTaps="handled"
      >
        <View className="px-5 py-3 gap-4">
          <HelpLabel title="Estado de la pieza">
            Observación es seguimiento pendiente. En tratamiento indica atención
            en curso. Una cita o presupuesto no cambia este dato.
          </HelpLabel>
          <NamedSelect
            value={status}
            placeholder="Selecciona un estado"
            onValueChange={(v) => {
              setStatus(v);
              setDirty(true);
            }}
            presentation="overlay"
            accessibilityLabel="Estado de la pieza"
            hideLabel
          >
            {Object.entries(labels).map(([value, label]) => (
              <NamedSelect.Item key={value} value={value} label={label} />
            ))}
          </NamedSelect>
          <OptionalSection title="Notas personales">
            {" "}
            <Textarea
              label="Nota personal (opcional)"
              value={note}
              onChangeText={(v) => {
                setNote(v);
                setDirty(true);
              }}
            />
          </OptionalSection>
          {error ? <Text className="text-destructive">{error}</Text> : null}
          <Separator />
          {linked.length ? (
            <Section title="Prestaciones presupuestadas">
              {linked.length ? (
                linked.map(({ row, budget }) => (
                  <View key={row.id} className="gap-3">
                    <View className="flex-row items-start gap-2">
                      <Text className="flex-1 font-medium">{row.title}</Text>
                      <Button
                        variant="ghost"
                        size="sm"
                        onPress={() =>
                          open({ kind: "education", term: row.title })
                        }
                        accessibilityLabel="Qué significa esta prestación"
                      >
                        <PIcon name="info" size={18} />
                      </Button>
                    </View>
                    <Text size="sm" muted>
                      {budget.clinic || "Clínica no indicada"} ·{" "}
                      {clp(row.amount)}
                    </Text>
                    <Button
                      variant="outline"
                      onPress={() => go("budget", budget.id)}
                    >
                      Ver presupuesto
                    </Button>
                  </View>
                ))
              ) : (
                <Text muted size="sm">
                  Sin prestaciones presupuestadas para esta pieza.
                </Text>
              )}
            </Section>
          ) : null}
          {patient.appointments.some(
            (a) =>
              a.toothIds.includes(tooth.id) &&
              a.status === "scheduled" &&
              new Date(a.at).getTime() >= now,
          ) ? (
            <Section title="Próximas citas" bounded>
              {patient.appointments
                .filter(
                  (a) =>
                    a.toothIds.includes(tooth.id) &&
                    a.status === "scheduled" &&
                    new Date(a.at).getTime() >= now,
                )
                .map((a) => (
                  <Row
                    key={a.id}
                    title={a.title}
                    description={`${shortDate(a.at)} · ${time(a.at)}`}
                    icon="calendar"
                    onPress={() => open({ kind: "appointment", id: a.id })}
                  />
                ))}
            </Section>
          ) : null}
          {patient.treatments.some((t) => t.toothIds.includes(tooth.id)) ? (
            <Section title="Tratamientos">
              {patient.treatments
                .filter((t) => t.toothIds.includes(tooth.id))
                .map((t) => (
                  <Row
                    key={t.id}
                    title={t.title}
                    icon="tooth"
                    onPress={() => go("treatment", t.id)}
                  />
                ))}
            </Section>
          ) : null}
          {patient.appointments.some(
            (a) =>
              a.toothIds.includes(tooth.id) &&
              a.status === "scheduled" &&
              new Date(a.at).getTime() < now,
          ) ? (
            <OptionalSection title="Citas pasadas sin atención registrada">
              <View style={{ maxHeight: 200 }}>
                <ScrollView nestedScrollEnabled showsVerticalScrollIndicator>
                  {patient.appointments
                    .filter(
                      (a) =>
                        a.toothIds.includes(tooth.id) &&
                        a.status === "scheduled" &&
                        new Date(a.at).getTime() < now,
                    )
                    .map((a) => (
                      <Row
                        key={a.id}
                        title={a.title}
                        description={`${shortDate(a.at)} · ${time(a.at)}`}
                        icon="calendar"
                        onPress={() => open({ kind: "appointment", id: a.id })}
                      />
                    ))}
                </ScrollView>
              </View>
            </OptionalSection>
          ) : null}
          {patient.sessions.some((a) => a.toothIds.includes(tooth.id)) ? (
            <OptionalSection title="Atenciones realizadas">
              <Section title="" bounded>
                {patient.sessions
                  .filter((a) => a.toothIds.includes(tooth.id))
                  .map((a) => (
                    <Row
                      key={a.id}
                      title={a.title}
                      description={`${shortDate(a.at)} · ${a.professional || "Profesional no informado"}`}
                      icon="calendar"
                      onPress={() => go("session", a.id)}
                    />
                  ))}
              </Section>
            </OptionalSection>
          ) : null}
        </View>
      </BottomSheet.Body>
      {status !== (existing?.status ?? "") ||
      note !== (existing?.note ?? "") ? (
        <BottomSheet.Footer>
          <Button
            onPress={async () => {
              try {
                if (!status)
                  throw new Error("Selecciona un estado antes de guardar.");
                await edit(
                  (p) => ({
                    ...p,
                    toothStates: {
                      ...p.toothStates,
                      [tooth.id]: { status: status as ToothStatus, note },
                    },
                  }),
                  "Información de la pieza guardada",
                );
              } catch (e) {
                setError((e as Error).message);
              }
            }}
          >
            Guardar cambio
          </Button>
          <Button
            variant="ghost"
            onPress={async () => {
              setDirty(false);
              setStatus(existing?.status ?? "");
              setNote(existing?.note ?? "");
            }}
          >
            Cancelar edición
          </Button>
        </BottomSheet.Footer>
      ) : null}
    </>
  );
}
function Pieces({
  value,
  onChange,
  onError,
}: {
  value: string;
  onChange: (value: string) => void;
  onError: (message: string) => void;
}) {
  const { state } = usePreview();
  const [error, setError] = useState("");
  const ids = toothIdsFromCodes(value);
  const tags = codesFor(ids, state.numbering)
    .split(/[,\s]+/)
    .filter(Boolean);
  const report = (message: string) => {
    setError(message);
    onError(message);
  };
  return (
    <TagInput
      label={`Piezas (${state.numbering === "fdi" ? "FDI" : "Universal"})`}
      placeholder={state.numbering === "fdi" ? "Ej.: 16, 26" : "Ej.: 3, 14"}
      value={tags}
      onValueChange={(next) => {
        report("");
        onChange(codesFor(toothIdsFromCodes(next.join(","), state.numbering)));
      }}
      validate={(tag) =>
        permanentTeeth.some((t) => t[state.numbering] === tag.replace(/^#/, ""))
      }
      onReject={(tag, reason) =>
        report(
          reason === "invalid"
            ? `La pieza ${tag} no corresponde a ${state.numbering === "fdi" ? "FDI" : "Universal"}. Revisa la numeración en Perfil → Preferencias.`
            : "Esa pieza ya está añadida.",
        )
      }
      onInputValueChange={(text) => {
        if (!text.trim()) report("");
      }}
      errorMessage={error}
      description="Escribe un número y pulsa Enter o coma. Puedes quitarlo con ×."
    />
  );
}
function Editor({compact = false}: {compact?: boolean} = {}) {
  const {
    open,
    sheet: currentSheet,
    patient,
    state,
    edit,
    editState,
    close,
    go,
    notify,
    setDirty,
    ui,
    setUI,
    scenario,
    setScenario,
  } = usePreview();
  // The sheet remains mounted during its exit animation after context closes it.
  const [sheet] = useState(currentSheet!);
  const kind = sheet.kind;
  const appointment = patient.appointments.find((a) => a.id === sheet?.id);
  const originAppointment = patient.appointments.find(
    (a) => a.id === sheet?.sourceId,
  );
  const originTreatment = patient.treatments.find(
    (t) => t.id === sheet?.sourceId,
  );
  const budget = patient.budgets.find((b) => b.id === sheet?.id);
  const row = budget?.rows.find((r) => r.id === sheet?.sourceId);
  const rowTreatment = row
    ? patient.treatments.find((t) => t.procedureId === row.id)
    : undefined;
  const reminder = patient.reminders.find((r) => r.id === sheet?.id);
  const sourceSession = patient.sessions.find(
    (s) => s.id === (sheet?.sourceId ?? reminder?.sourceId),
  );
  const [title, setTitle] = useState(
    appointment?.title ??
      originAppointment?.title ??
      originTreatment?.title ??
      row?.title ??
      reminder?.title ??
      sourceSession?.title ??
      "",
  );
  const [place, setPlace] = useState(appointment?.place ?? "");
  const [professional, setProfessional] = useState(
    appointment?.professional ?? originAppointment?.professional ?? "",
  );
  const [codes, setCodes] = useState(
    codesFor(
      appointment?.toothIds ??
        originAppointment?.toothIds ??
        originTreatment?.toothIds ??
        row?.toothIds ??
        [],
    ),
  );
  const [treatmentId, setTreatmentId] = useState(
    appointment?.treatmentId ??
      originAppointment?.treatmentId ??
      originTreatment?.id ??
      rowTreatment?.id ??
      "",
  );
  const [piecesError, setPiecesError] = useState("");
  const [linkId, setLinkId] = useState("new");
  const [amount, setAmount] = useState("");
  const [reference, setReference] = useState("");
  const [procedureId, setProcedureId] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [when, setWhen] = useState(() =>
    appointment
      ? new Date(appointment.at)
      : reminder
        ? new Date(reminder.at)
        : kind === "appointment"
          ? new Date(
              ui.agendaDay.getFullYear(),
              ui.agendaDay.getMonth(),
              ui.agendaDay.getDate(),
              new Date().getHours() + 1,
              0,
            )
          : new Date(),
  );
  const [id] = useState(() => makeId(kind));
  const [stage, setStage] = useState(appointment ? 1 : 0);
  const [editingAppointment, setEditingAppointment] = useState(!appointment);
  const [birthDate, setBirthDate] = useState<Date>();
  const update = (set: (value: string) => void) => (value: string) => {
    set(value);
    setDirty(true);
  };
  const save = async () => {
    if (saving) return;
    setSaving(true);
    setError("");
    try {
      if (kind === "family") {
        if (state.plan !== "premium")
          throw new Error("Para añadir un familiar, explora Premium primero.");
        if (!title.trim()) throw new Error("Escribe el nombre del perfil.");
        await editState((s) => ({
          ...s,
          patients: [
            ...s.patients,
            {
              ...newPatient(id, title.trim()),
              birthDate: birthDate
                ? `${birthDate.getFullYear()}-${String(birthDate.getMonth() + 1).padStart(2, "0")}-${String(birthDate.getDate()).padStart(2, "0")}`
                : "",
            },
          ],
        }));
        setDirty(false);
        close();
        notify("Perfil familiar añadido");
        return;
      }
      if (kind === "payment") {
        if (!budget) throw new Error("Presupuesto no disponible.");
        const value = Number(amount.replace(/\./g, ""));
        await edit(
          (p) => ({
            ...p,
            budgets: p.budgets.map((b) =>
              b.id === budget.id
                ? recordPayment(b, {
                    id,
                    amount: value,
                    date: when.toISOString(),
                    note: reference,
                    procedureId,
                  })
                : b,
            ),
          }),
          "Abono registrado",
        );
        close();
        return;
      }
      if (!title.trim())
        throw new Error("Escribe un nombre o motivo para continuar.");
      if (piecesError) throw new Error(piecesError);
      const toothIds = toothIdsFromCodes(codes);
      if (kind === "appointment") {
        const record: DesignAppointment = {
          id: appointment?.id ?? id,
          title: title.trim(),
          at: when.toISOString(),
          place: place.trim(),
          professional: professional.trim(),
          toothIds,
          treatmentId,
          status: appointment?.status ?? "scheduled",
        };
        await edit(
          (p) => ({
            ...p,
            appointments: [
              ...p.appointments.filter((a) => a.id !== record.id),
              record,
            ],
          }),
          "Cita guardada",
        );
        setUI((s) => ({ ...s, agendaDay: when, agendaMonth: when }));
        close();
        return;
      }
      if (kind === "session") {
        if (!confirmed) throw new Error("Confirma que la atención ya ocurrió.");
        const record: DesignSession = {
          id,
          title: title.trim(),
          at: when.toISOString(),
          professional: professional.trim(),
          toothIds,
          treatmentId,
          appointmentId: originAppointment?.id ?? "",
          notes: reference,
          audioName: "",
        };
        await edit((p) => {
          const attended = recordSession(p, record);
          return row && budget
            ? {
                ...attended,
                budgets: attended.budgets.map((b) =>
                  b.id === budget.id
                    ? {
                        ...b,
                        rows: b.rows.map((item) =>
                          item.id === row.id
                            ? { ...item, done: true, sessionId: record.id }
                            : item,
                        ),
                      }
                    : b,
                ),
              }
            : attended;
        }, "Atención registrada");
        close();
        go("session", id);
        return;
      }
      if (kind === "treatment") {
        const existing = row
          ? patient.treatments.find((t) => t.procedureId === row.id)
          : undefined;
        if (existing) {
          setDirty(false);
          close();
          go("treatment", existing.id);
          return;
        }
        const record: DesignTreatment = {
          id: linkId === "new" ? id : linkId,
          title: title.trim(),
          toothIds,
          status: "planned",
          procedureId: row?.id ?? "",
        };
        await edit(
          (p) => ({
            ...p,
            treatments:
              linkId === "new"
                ? [...p.treatments, record]
                : p.treatments.map((t) =>
                    t.id === linkId
                      ? { ...t, procedureId: record.procedureId }
                      : t,
                  ),
          }),
          "Tratamiento vinculado",
        );
        close();
        go("treatment", record.id);
        return;
      }
      if (kind === "reminder") {
        await edit(
          (p) => ({
            ...p,
            reminders: [
              {
                ...reminder,
                id: reminder?.id ?? id,
                title: title.trim(),
                at: when.toISOString(),
                destination: "draft",
                sourceId: sheet?.sourceId ?? reminder?.sourceId ?? "",
              },
              ...p.reminders.filter((r) => r.id !== reminder?.id),
            ],
          }),
          "Recordatorio guardado, sin programar",
        );
        close();
        return;
      }
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSaving(false);
    }
  };
  return (
    <>
      <BottomSheet.Body
        {...(compact ? {style:{maxHeight:360}} : {})}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator
      >
        <View className={compact ? "py-3 gap-3" : "px-5 py-3 gap-3"}>
          {kind === "reminder" && sourceSession ? (
            <Text muted size="sm">
              Atención: {sourceSession.title} · {shortDate(sourceSession.at)}
            </Text>
          ) : null}
          {kind === "appointment" && editingAppointment ? (
            <Steps value={stage}>
              {["Datos", "Confirmar"].map((label, i) => (
                <Steps.Item key={label} step={i} className="flex-1 gap-1.5">
                  <Steps.Indicator />
                  <Steps.Title>{label}</Steps.Title>
                </Steps.Item>
              ))}
            </Steps>
          ) : null}
          {kind !== "appointment" || stage === 0 ? (
            <>
              {kind === "family" ? (
                <>
                  <Input
                    label="Nombre del familiar"
                    value={title}
                    onChangeText={update(setTitle)}
                  />
                  <Text size="sm" weight="medium">
                    Fecha de nacimiento (opcional)
                  </Text>
                  <DatePicker
                    {...(birthDate ? { selected: birthDate } : {})}
                    onSelect={(date) => {
                      setBirthDate(date);
                      setDirty(true);
                    }}
                    maxDate={new Date()}
                    captionLayout="dropdown"
                    locale="es-CL"
                    placeholder="Elegir fecha"
                  />
                  <Notice>
                    Cada perfil empieza sin registros y mantiene su historial
                    separado.
                  </Notice>
                  {state.plan !== "premium" ? (
                    <Button
                      variant="outline"
                      onPress={async () => {
                        setDirty(false);
                        go("plan");
                      }}
                    >
                      Ver Premium
                    </Button>
                  ) : null}
                </>
              ) : kind === "payment" ? (
                <>
                  <Text muted>
                    {budget?.title ?? "Presupuesto no disponible"}
                  </Text>
                  <Text className="text-2xl font-semibold">
                    Saldo{" "}
                    {budget ? clp(budgetTotal(budget) - paidTotal(budget)) : ""}
                  </Text>
                  <Input
                    label="Monto del abono (CLP)"
                    keyboardType="numeric"
                    value={amount}
                    onChangeText={update(setAmount)}
                  />
                  <Text size="sm" weight="medium">
                    Asignación
                  </Text>
                  <NamedSelect
                    value={procedureId}
                    onValueChange={update(setProcedureId)}
                    presentation="overlay"
                    placeholder="Al presupuesto general"
                  >
                    <NamedSelect.Item value="" label="Al presupuesto general" />
                    {budget?.rows.map((r) => (
                      <NamedSelect.Item
                        key={r.id}
                        value={r.id}
                        label={`${r.title} · ${clp(r.amount)}`}
                      />
                    ))}
                  </NamedSelect>
                  <Input
                    label="Referencia (opcional)"
                    value={reference}
                    onChangeText={update(setReference)}
                  />
                </>
              ) : (
                <>
                  <Input
                    label={
                      kind === "appointment"
                        ? "Motivo de la cita"
                        : kind === "treatment"
                          ? "Nombre del tratamiento"
                          : kind === "reminder"
                            ? "Qué quieres recordar"
                            : "Motivo de la atención"
                    }
                    value={title}
                    onChangeText={update(setTitle)}
                    placeholder={
                      kind === "appointment" ? "Ej.: Control dental" : undefined
                    }
                  />
                  {kind !== "reminder" ? (
                    <OptionalSection title="Añadir piezas" initial={!!codes}>
                      <Pieces
                        value={codes}
                        onChange={update(setCodes)}
                        onError={setPiecesError}
                      />
                    </OptionalSection>
                  ) : null}
                  {kind === "treatment" && row ? (
                    <>
                      <Notice>
                        Esta prestación sigue presupuestada. Vincularla no
                        indica que haya comenzado ni que esté pagada.
                      </Notice>
                      <NamedSelect
                        value={linkId}
                        onValueChange={update(setLinkId)}
                        presentation="overlay"
                        accessibilityLabel="Crear o vincular tratamiento"
                      >
                        <NamedSelect.Item
                          value="new"
                          label="Crear tratamiento planificado"
                        />
                        {patient.treatments
                          .filter((t) => !t.procedureId)
                          .map((t) => (
                            <NamedSelect.Item
                              key={t.id}
                              value={t.id}
                              label={`Vincular a ${t.title}`}
                            />
                          ))}
                      </NamedSelect>
                    </>
                  ) : null}
                  {["appointment", "session"].includes(kind) ? (
                    <OptionalSection
                      title="Añadir profesional, lugar o tratamiento"
                      initial={!!professional || !!place || !!treatmentId}
                    >
                      <Input
                        label="Profesional (opcional)"
                        value={professional}
                        onChangeText={update(setProfessional)}
                      />
                      {kind === "appointment" ? (
                        <Input
                          label="Clínica o lugar (opcional)"
                          value={place}
                          onChangeText={update(setPlace)}
                        />
                      ) : null}
                      <NamedSelect
                        value={treatmentId}
                        onValueChange={update(setTreatmentId)}
                        presentation="overlay"
                        placeholder="Sin tratamiento vinculado"
                        accessibilityLabel="Tratamiento vinculado"
                      >
                        <NamedSelect.Item
                          value=""
                          label="Sin tratamiento vinculado"
                        />
                        {patient.treatments.map((t) => (
                          <NamedSelect.Item
                            key={t.id}
                            value={t.id}
                            label={t.title}
                          />
                        ))}
                      </NamedSelect>
                    </OptionalSection>
                  ) : null}
                </>
              )}
            </>
          ) : null}
          {kind !== "family" &&
          kind !== "treatment" &&
          !(kind === "reminder" && reminder?.medicationSchedule) &&
          (kind !== "appointment" || stage === 0) ? (
            <View className="gap-2">
              <Text size="sm" weight="medium">
                {kind === "session"
                  ? "Fecha de la atención"
                  : kind === "payment"
                    ? "Fecha del abono"
                    : "Fecha y hora"}
              </Text>
              <View className="w-full">
                <DateTimePicker
                  value={when}
                  onValueChange={(v) => {
                    setWhen(v);
                    setDirty(true);
                  }}
                  presentation="dialog"
                  layout="wheel"
                  locale="es-CL"
                  hourCycle={24}
                  doneLabel="Listo"
                  timeLabel="Hora"
                  weekStartsOn={1}
                  format={(d) =>
                    `${shortDate(d.toISOString())} · ${time(d.toISOString())}`
                  }
                />
              </View>
            </View>
          ) : null}
          {kind === "reminder" && reminder?.medicationSchedule ? (
            <View className="gap-2">
              <Text muted size="sm">
                Horarios vinculados a la receta, desde{" "}
                {shortDate(reminder.medicationSchedule.start)} a las{" "}
                {time(reminder.medicationSchedule.start)}.
              </Text>
              <Button
                variant="outline"
                onPress={() =>
                  open({ kind: "schedule", sourceId: reminder.sourceId })
                }
              >
                Revisar horarios de la receta
              </Button>
            </View>
          ) : null}
          {kind === "appointment" && stage === 1 ? (
            <View className="gap-2">
              <Row
                title={title}
                description={place || "Sin lugar indicado"}
                icon="calendar"
              />
              <Row
                title={`${shortDate(when.toISOString())} · ${time(when.toISOString())}`}
                description="Fecha y hora elegidas por ti"
                icon="calendar"
              />
              <Row
                title={codes ? `Piezas ${codes}` : "Sin piezas vinculadas"}
                description={professional || "Profesional no informado"}
                icon="tooth"
              />
              <Text muted size="sm">
                Una cita no registra una atención ni cambia el estado de las
                piezas.
              </Text>
            </View>
          ) : null}
          {kind === "session" ? (
            <>
              <OptionalSection title="Añadir nota personal" initial={!!reference}><Textarea
                label="Nota personal"
                placeholder="Algo que quieras recordar de esta atención"
                value={reference}
                onChangeText={update(setReference)}
              /></OptionalSection>
              <Checkbox
                checked={confirmed}
                onCheckedChange={(v) => {
                  setConfirmed(v);
                  setDirty(true);
                }}
                label="Confirmo que esta atención ya ocurrió"
              />
            </>
          ) : null}
          {kind === "reminder" ? (
            <Notice>
              Se guarda un aviso preparado. No crea una alarma del teléfono ni
              muestra un envío a Reloj como confirmado.
            </Notice>
          ) : null}
          {error ? (
            <View className="gap-2">
              <Text className="text-destructive" accessibilityRole="alert">
                {error}
              </Text>
              {scenario === "save-error" || scenario === "offline" ? (
                <Button
                  variant="outline"
                  onPress={async () => {
                    setScenario("normal");
                    setError("");
                  }}
                >
                  Restablecer conexión de prueba
                </Button>
              ) : null}
            </View>
          ) : null}
        </View>
      </BottomSheet.Body>
      <BottomSheet.Footer
        className={
          kind === "appointment" && editingAppointment && stage > 0
            ? "flex-row items-center"
            : ""
        }
      >
        {kind === "appointment" && editingAppointment && stage > 0 ? (
          <Button variant="outline" onPress={() => setStage((s) => s - 1)}>
            Anterior
          </Button>
        ) : null}
        {kind === "appointment" && !editingAppointment ? (
          <>
            <Button
              variant="outline"
              onPress={() => {
                setEditingAppointment(true);
                setStage(0);
              }}
            >
              Editar cita
            </Button>
            {appointment?.status === "scheduled" ? (
              <Button
                onPress={() =>
                  open({ kind: "session", sourceId: appointment.id })
                }
              >
                Registrar atención
              </Button>
            ) : null}
          </>
        ) : kind === "appointment" && stage < 1 ? (
          <Button
            fullWidth
            onPress={async () => {
              if (piecesError) {
                setError(piecesError);
                return;
              }
              if (!title.trim()) {
                setError("Escribe el motivo para continuar.");
                return;
              }
              setError("");
              setStage((s) => s + 1);
            }}
          >
            Continuar
          </Button>
        ) : (
          <Button
            fullWidth={
              !(kind === "appointment" && editingAppointment && stage > 0)
            }
            className="flex-1"
            onPress={save}
            disabled={saving}
          >
            {saving
              ? "Guardando…"
              : kind === "payment"
                ? "Guardar abono"
                : kind === "session"
                  ? "Confirmar atención"
                  : kind === "family"
                    ? "Crear perfil"
                    : kind === "treatment"
                      ? "Guardar tratamiento"
                      : "Guardar"}
          </Button>
        )}
        {appointment?.status === "scheduled" ? (
          <Button variant="destructive" onPress={() => setConfirmCancel(true)}>
            Cancelar cita
          </Button>
        ) : null}
        <Dialog open={confirmCancel} onOpenChange={setConfirmCancel}>
          <Dialog.Content>
            <View className="gap-2">
              <Dialog.Title>¿Cancelar esta cita?</Dialog.Title>
              <Dialog.Description>
                El registro se conservará como cancelado.
              </Dialog.Description>
            </View>
            <Dialog.Footer>
              <Button variant="outline" onPress={() => setConfirmCancel(false)}>
                Conservar
              </Button>
              <Button
                variant="destructive"
                onPress={async () => {
                  try {
                    await edit(
                      (p) => ({
                        ...p,
                        appointments: p.appointments.map((a) =>
                          a.id === appointment?.id
                            ? { ...a, status: "cancelled" }
                            : a,
                        ),
                      }),
                      "Cita cancelada",
                    );
                    setConfirmCancel(false);
                    close();
                  } catch (e) {
                    setError((e as Error).message);
                    setConfirmCancel(false);
                  }
                }}
              >
                Confirmar cancelación
              </Button>
            </Dialog.Footer>
          </Dialog.Content>
        </Dialog>
      </BottomSheet.Footer>
    </>
  );
}
