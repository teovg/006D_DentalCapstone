import { upcomingReminderTimes } from "../../features/reminders/reminderPlan";
import { HomeGuide } from "./HomeGuide";
import { isHomeGuideRequested } from "./homeGuideRequested";
import { Progress } from "panelui-native/components/progress";
import { isManualMedicine } from "./timeNoticeRules";
import { useEffect, useState } from "react";
import { View } from "react-native";
import {
  Button,
  NumberingControl,
  NamedSelect,
  Blank,
  Notice,
  Page,
  PIcon,
  Row,
  Section,
  Status,
  Surface,
  Title,
  useInk,
} from "./components";
import { Fab } from "panelui-native/components/fab";
import { Input } from "panelui-native/components/input";
import { DatePicker } from "panelui-native/components/date-picker";
import { Planner } from "panelui-native/components/planner";
import { Separator } from "panelui-native/components/separator";
import { Skeleton } from "panelui-native/components/skeleton";
import { Switch } from "panelui-native/components/switch";
import { Tabs } from "panelui-native/components/tabs";
import { Text } from "panelui-native/primitives/text";
import { Dialog } from "panelui-native/components/dialog";
import { DentalArchChart } from "../../features/odontogram/DentalArchChart";
import { statusPresentation } from "../../features/odontogram/toothPresentation";
import { longDate, shortDate, time, usePreview } from "./context";
import { teethFor, createDesignState, budgetTotal, paidTotal, clp } from "./model";
import { TreatmentList, SessionList } from "./lists";
import { RecordScreens } from "./recordScreens";
import { CaptureScreen } from "./capture";
export function PreviewScreens() {
  const { location, patient, state, scenario, setScenario } = usePreview();
  if (scenario === "loading")
    return (
      <Page>
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-44 w-full" />
        <Skeleton className="h-20 w-full" />
        <Button variant="outline" onPress={() => setScenario("normal")}>
          Terminar ejemplo de carga
        </Button>
      </Page>
    );
  if (scenario === "load-error")
    return (
      <Page>
        <Blank
          title="No pudimos cargar tus registros"
          description="Tu información sigue guardada. Puedes volver a intentarlo."
          label="Reintentar"
          onPress={() => setScenario("normal")}
        />
      </Page>
    );
  if (location.view === "capture") return <CaptureScreen />;
  if (location.view === "home") return isHomeGuideRequested() && state.numberingConfirmed ? <HomeGuide /> : <Home />;
  if (location.view === "odontogram") return <Mouth />;
  if (location.view === "history") return <FollowUp />;
  if (location.view === "documents") return <Library />;
  if (["login", "register", "recover", "onboarding"].includes(location.view))
    return <Access />;
  if (
    [
      "profile",
      "account",
      "patient",
      "preferences",
      "privacy",
      "plan",
      "family",
    ].includes(location.view)
  )
    return <Settings key={`${location.view}-${patient.id}`} />;
  if (location.view === "notifications") return <Notifications />;
  return <RecordScreens />;
}
function Home() {
  const { patient, state, setState, open, go, confirmNumbering, notify } =
    usePreview();
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 30000);
    return () => clearInterval(timer);
  }, []);
  const next = patient.appointments
    .filter((a) => a.status === "scheduled" && new Date(a.at).getTime() > now)
    .sort((a, b) => a.at.localeCompare(b.at))[0];
  const reminders = patient.reminders.flatMap((reminder) => {
    if (reminder.enabled === false) return [];
    if (reminder.kind === "care") return [{ reminder, nextAt: null as string | null }];
    try {
      const nextAt = upcomingReminderTimes(reminder, now)[0];
      return nextAt ? [{ reminder, nextAt }] : [];
    } catch { return []; }
  }).sort((a, b) => (a.nextAt ? Date.parse(a.nextAt) : Infinity) - (b.nextAt ? Date.parse(b.nextAt) : Infinity));
  const latest = [...patient.sessions].filter((session) => new Date(session.at).getTime() <= now)
    .sort((a, b) => b.at.localeCompare(a.at))[0];
  return (
    <Page>
      <Dialog open={!state.numberingConfirmed} onOpenChange={() => {}}>
        <Dialog.Content>
          <Dialog.Title>Elige cómo ver tus piezas</Dialog.Title>
          <NumberingControl
            guide
            value={state.numbering}
            onChange={(numbering) => setState((s) => ({ ...s, numbering }))}
          />
          <Text muted size="sm">
            Puedes cambiarlo después en Perfil → Numeración. Cada documento
            confirma su propia numeración.
          </Text>
          <Dialog.Footer>
            <Button
              onPress={async () => {
                try {
                  await confirmNumbering?.(state.numbering);
                  setState((s) => ({ ...s, numberingConfirmed: true }));
                } catch (e) {
                  notify((e as Error).message);
                }
              }}
            >
              Usar esta numeración
            </Button>
          </Dialog.Footer>
        </Dialog.Content>
      </Dialog>
      <Title subtitle={longDate(new Date())}>{`Hola, ${patient.name}.`}</Title>
      <View className="rounded-xl border border-primary bg-secondary p-4 gap-3">
        <View className="flex-row items-center gap-2">
          <PIcon name="calendar" />
          <Text weight="semibold">Tu próxima visita</Text>
        </View>
        {next ? (
          <>
            <Text className="text-xl font-semibold">{longDate(next.at)}</Text>
            <Text>
              {time(next.at)} · {next.title}
            </Text>
            <Text muted size="sm">
              {next.place || "Lugar por confirmar"}
            </Text>
            <Button
              variant="outline"
              onPress={() => open({ kind: "appointment", id: next.id })}
            >
              Ver mi cita
            </Button>
          </>
        ) : (
          <Text muted>No tienes citas próximas.</Text>
        )}
      </View>
      <Section title="Recordatorios y cuidados">
        {reminders.length ? reminders.slice(0, 3).map(({ reminder: r, nextAt }) => {
          const minutes = nextAt ? Math.max(1, Math.ceil((Date.parse(nextAt) - now) / 60000)) : 0;
          const remaining = minutes < 60 ? `${minutes} min` : `${Math.floor(minutes / 60)} h${minutes % 60 ? ` ${minutes % 60} min` : ""}`;
          return <Row key={r.id} title={r.title}
            description={r.kind === "care" ? "Cuidado activo" : `${shortDate(nextAt!)} · ${time(nextAt!)} · en ${remaining}`}
            icon={r.medicationSchedule || r.kind === "medicine" ? "pill" : "bell"}
            onPress={() => open({ kind: "reminder", id: r.id })} />;
        }) : <View className="gap-1">
          <Text muted>No tienes recordatorios activos.</Text>
          <Button variant="ghost" onPress={() => open({ kind: "reminder" })}>Preparar un recordatorio</Button>
        </View>}
        {reminders.length > 3 ? <Button variant="ghost" onPress={() => go("reminders")}>Ver los {reminders.length} recordatorios</Button> : null}
      </Section>
      <Section title="Tu presupuesto">
        {patient.budgets.slice(0, 2).map((b) => {
          const done = b.rows.filter((r) => r.done).length;
          const pending = b.rows.length - done;
          const paid = paidTotal(b);
          return <View key={b.id} className="gap-3 border-b border-border pb-4">
            <Row title={b.title} description={`${pending} ${pending === 1 ? "prestación pendiente" : "prestaciones pendientes"}`}
              onPress={() => go("budget", b.id)} />
            <Progress value={done} maxValue={Math.max(1, b.rows.length)} label="Prestaciones realizadas"
              valueLabel={`${done} de ${b.rows.length}`} showValueLabel />
            <View className="flex-row gap-4">
              <View className="flex-1 gap-1"><Text muted size="sm">Saldo pendiente</Text><Text weight="semibold">{clp(budgetTotal(b) - paid)}</Text></View>
              <View className="flex-1 gap-1"><Text muted size="sm">Pagado</Text><Text weight="semibold">{clp(paid)}</Text></View>
            </View>
          </View>;
        })}
        {patient.budgets.length > 2 ? <Button variant="ghost" onPress={() => go("treatments")}>Ver todos los presupuestos</Button> : null}
        {!patient.budgets.length ? <View className="gap-1"><Text muted>Aún no tienes un presupuesto guardado.</Text>
          <Button variant="outline" onPress={() => go("capture")}>Añadir tu primer presupuesto</Button></View> : null}
      </Section>
      {latest ? <Section title="Última atención">
        <Row title={latest.title} description={`${shortDate(latest.at)}${latest.professional ? ` · ${latest.professional}` : ""}`}
          icon="tooth" onPress={() => go("session", latest.id)} />
        {latest.care ? <View className="gap-1"><Text weight="semibold" size="sm">Indicaciones registradas</Text><Text numberOfLines={3}>{latest.care}</Text></View> : null}
      </Section> : null}
    </Page>
  );
}
function Mouth() {
  const { patient, state, setState, open } = usePreview();
  const c = useInk();
  const teeth = teethFor(patient);
  const [display, setDisplay] = useState("map");
  const legend = [
    ["Sin marca clínica", c.secondary],
    ["Observación", "#C98216"],
    ["En tratamiento", "#2672C9"],
    ["Prioridad", "#C84444"],
    ["Ausente", "#7D8B90"],
    ["Presupuestada", "#7854B8"],
  ];
  return (
    <Page compact bottomPadding={16}>
      <View className="flex-row items-end gap-3">
        <View className="flex-1 gap-2">
          <Text size="sm" weight="semibold">
            Dentición permanente
          </Text>
          <NumberingControl
            value={state.numbering}
            onChange={(numbering) =>
              setState((s) => ({ ...s, numbering, numberingConfirmed: true }))
            }
          />
        </View>
        <Button
          variant="ghost"
          size="sm"
          accessibilityLabel={
            display === "map"
              ? "Cambiar a lista de piezas"
              : "Cambiar al mapa dental"
          }
          onPress={() => setDisplay((d) => (d === "map" ? "list" : "map"))}
        >
          <PIcon name={display === "map" ? "documents" : "tooth"} size={18} />
        </Button>
      </View>
      <View
        className="flex-row flex-wrap gap-x-4 gap-y-2"
        accessibilityLabel="Leyenda del odontograma"
      >
        {legend.map(([label, color]) => (
          <View key={label} className="flex-row items-center gap-1.5">
            <View
              style={{
                width: 9,
                height: 9,
                borderRadius: label === "Presupuestada" ? 2 : 8,
                backgroundColor:
                  label === "Presupuestada" ? "transparent" : color,
                borderColor: color,
                borderWidth: label === "Presupuestada" ? 2 : 0,
              }}
            />
            <Text muted size="xs">
              {label}
            </Text>
          </View>
        ))}
      </View>
      {display === "map" ? (
        <View className="px-1 py-1 items-center">
          <View style={{ width: "100%", maxWidth: 300 }}>
            <DentalArchChart
              teeth={teeth}
              numbering={state.numbering}
              statusLabel={(t) =>
                patient.toothStates[t.id]
                  ? statusPresentation[t.status].label
                  : "Sin información clínica registrada"
              }
              onSelect={(t) => open({ kind: "tooth", id: t.id })}
            />
          </View>
        </View>
      ) : (
        <Surface>
          {teeth.map((t) => (
            <Row
              key={t.id}
              title={`Pieza ${t[state.numbering]} · ${t.name}`}
              description={`${patient.toothStates[t.id] ? "Información registrada" : "Sin información registrada"}${t.budgetedProcedureCount ? ` · ${t.budgetedProcedureCount} presupuestada` : ""}`}
              icon="tooth"
              onPress={() => open({ kind: "tooth", id: t.id })}
            />
          ))}
        </Surface>
      )}
      {!Object.keys(patient.toothStates).length ? (
        <Text muted size="sm">
          Aún no hay estados clínicos registrados. Un presupuesto no determina
          el estado de una pieza.
        </Text>
      ) : null}
    </Page>
  );
}
function FollowUp() {
  const { patient, ui, setUI, go, open } = usePreview();
  const [now] = useState(() => Date.now());
  const sameDay = (a: string, b: Date) =>
    new Date(a).toDateString() === b.toDateString();
  const records = [
    ...patient.appointments
      .filter((a) => a.status !== "cancelled")
      .map((a) => ({
        id: a.id,
        at: a.at,
        title: a.title,
        type: "appointment" as const,
      })),
    ...patient.sessions.map((a) => ({
      id: a.id,
      at: a.at,
      title: a.title,
      type: "session" as const,
    })),
  ];
  const selectedRecords = records
    .filter((r) => sameDay(r.at, ui.agendaDay))
    .sort((a, b) => a.at.localeCompare(b.at));
  const entries = [
    ...patient.appointments
      .filter((a) => a.status === "scheduled")
      .map((a) => ({
        id: a.id,
        date: new Date(a.at),
        label: a.title,
        category: new Date(a.at).getTime() >= now ? "appointment" : "past",
      })),
    ...patient.sessions.map((s) => ({
      id: s.id,
      date: new Date(s.at),
      label: s.title,
      category: "session",
    })),
  ];
  return (
    <View className="flex-1">
      <View className="px-5 pt-2">
        <Tabs
          value={ui.historyTab}
          onValueChange={(v) => {
            if (v === "agenda" || v === "treatments" || v === "history")
              setUI((s) => ({ ...s, historyTab: v }));
          }}
          defaultValue="agenda"
          variant="underline"
        >
          <Tabs.List>
            <Tabs.Trigger value="agenda">Agenda</Tabs.Trigger>
            <Tabs.Trigger value="treatments">Tratamientos</Tabs.Trigger>
            <Tabs.Trigger value="history">Historial</Tabs.Trigger>
          </Tabs.List>
        </Tabs>
      </View>
      {ui.historyTab === "agenda" ? (
        <Page compact bottomPadding={88}>
          <View className="gap-1 border border-border rounded-xl px-3 py-2">
            <Text weight="semibold">{longDate(ui.agendaDay)}</Text>
            {selectedRecords.length ? (
              selectedRecords.map((r) => (
                <Row
                  key={`${r.type}-${r.id}`}
                  title={r.title}
                  description={`${time(r.at)} · ${r.type === "session" ? "Atención realizada" : new Date(r.at).getTime() >= now ? "Próxima cita" : "Cita pasada"}`}
                  icon="calendar"
                  onPress={() =>
                    r.type === "session"
                      ? go("session", r.id)
                      : open({ kind: "appointment", id: r.id })
                  }
                />
              ))
            ) : (
              <Text muted size="sm">
                No hay registros para este día.
              </Text>
            )}
          </View>
          <View className="py-1">
            <Planner
              frame={false}
              month={ui.agendaMonth}
              onMonthChange={(month) =>
                setUI((s) => ({ ...s, agendaMonth: month, agendaDay: month }))
              }
              selected={ui.agendaDay}
              onSelectedChange={(day) => {
                if (day) setUI((s) => ({ ...s, agendaDay: day }));
              }}
              locale="es-CL"
              weekStartsOn={1}
              entries={entries}
              categories={[
                { id: "appointment", label: "Próxima cita", color: "#176c82" },
                {
                  id: "session",
                  label: "Atención realizada",
                  color: "#2672c9",
                },
                { id: "past", label: "Cita pasada", color: "#52696e" },
              ]}
            >
              <Planner.Header>
                <Planner.Title size="lg" weight="semibold">
                  {new Intl.DateTimeFormat("es-CL", { month: "long", year: "numeric" }).format(ui.agendaMonth).replace(/^./, (letter) => letter.toLocaleUpperCase("es-CL"))}
                </Planner.Title>
                <Planner.Today>Hoy</Planner.Today>
                <Planner.Nav />
              </Planner.Header>
              <Planner.Grid
                renderDay={({ date, entries, isSelected, isInMonth }) => (
                  <Button
                    variant={isSelected ? "secondary" : "ghost"}
                    className="flex-1 h-10 min-w-0 min-h-10 px-0 py-1"
                    style={{
                      borderWidth: isSelected ? 2 : 1,
                      borderColor: isSelected ? "#176c82" : entries.some(e=>e.category==="session") ? "#2672c9" : entries.some(e=>e.category==="appointment") ? "#176c82" : entries.length ? "#52696e" : "transparent",
                      backgroundColor: entries.some(
                        (e) => e.category === "session",
                      )
                        ? "#e6eefa"
                        : entries.some((e) => e.category === "appointment")
                          ? "#dcebe8"
                          : entries.length
                            ? "#f1f3f5"
                            : undefined,
                    }}
                    accessibilityLabel={`${longDate(date)}, ${entries.length} registros${entries.length ? `: ${[...new Set(entries.map(e => e.category === "session" ? "Atención realizada" : e.category === "appointment" ? "Próxima cita" : "Cita pasada"))].join(", ")}` : ""}`}
                    accessibilityState={{ selected: isSelected }}
                    onPress={() =>
                      setUI((s) => ({
                        ...s,
                        agendaDay: date,
                        ...(!isInMonth ? { agendaMonth: date } : {}),
                      }))
                    }
                  >
                    <View className="items-center">
                      <Text
                        size="sm"
                        muted={!isInMonth}
                        weight={isSelected ? "semibold" : "normal"}
                      >
                        {date.getDate()}
                      </Text>
                    </View>
                  </Button>
                )}
              />
              <View className="flex-row flex-wrap gap-3 py-3 border-t border-border">
                {[
                  ["Próxima cita", "#176c82", "#dcebe8"],
                  ["Atención realizada", "#2672c9", "#e6eefa"],
                  ["Cita pasada", "#52696e", "#f1f3f5"],
                ].map(([label, color, fill]) => (
                  <View key={label} className="flex-row items-center gap-1">
                    <View
                      style={{
                        width: 12,
                        height: 12,
                        backgroundColor: fill,
                        borderWidth: 1,
                        borderColor: color,
                        borderRadius: 3,
                      }}
                    />
                    <Text muted size="xs">
                      {label}
                    </Text>
                  </View>
                ))}
              </View>
            </Planner>
          </View>
          <Button variant="ghost" onPress={() => go("reminders")}>
            Ver recordatorios
          </Button>
        </Page>
      ) : ui.historyTab === "treatments" ? (
        <TreatmentList />
      ) : (
        <SessionList />
      )}
      <Fab.Group
        variant="surface"
        className="absolute bottom-4 right-4"
        accessibilityLabel="Añadir a seguimiento"
        icon={<PIcon name="plus" />}
      >
        <Fab.Action
          icon={<PIcon name="calendar" />}
          label="Nueva cita"
          onPress={() => open({ kind: "appointment" })}
        />
        <Fab.Action
          icon={<PIcon name="tooth" />}
          label="Registrar atención"
          onPress={() => open({ kind: "session" })}
        />
        <Fab.Action
          icon={<PIcon name="bell" />}
          label="Avisos y horarios"
          onPress={() => open({ kind: "reminder" })}
        />
      </Fab.Group>
    </View>
  );
}
function Library() {
  const { patient, ui, setUI, go, open } = usePreview();
  const docs = [
    ...patient.budgets.map((b) => ({
      id: b.id,
      title: b.title,
      type: "budget",
      description: b.clinic,
    })),
    ...patient.prescriptions.map((p) => ({
      id: p.id,
      title: isManualMedicine(p) ? p.medicines[0]?.name || p.title : p.title,
      type: "prescription",
      manual: isManualMedicine(p),
      description: `${p.medicines.map(m=>m.name).slice(0,2).join(", ")} · ${shortDate(p.date)}`,
    })),
    ...patient.attachments.map((a) => ({
      id: a.id,
      title: a.title,
      type: a.type,
      description: shortDate(a.date),
    })),
  ].filter(
    (d) =>
      (ui.documentFilter === "all" || d.type === ui.documentFilter) &&
      (d.title + " " + d.description)
        .toLocaleLowerCase("es")
        .includes(ui.documentSearch.toLocaleLowerCase("es")),
  );
  return (
    <View className="flex-1">
      <Page bottomPadding={100}>
        <Input
          accessibilityLabel="Buscar documentos"
          placeholder="Buscar un documento"
          value={ui.documentSearch}
          onChangeText={(v) => setUI((s) => ({ ...s, documentSearch: v }))}
          startContent={<PIcon name="search" size={19} />}
        />
        <NamedSelect
          value={ui.documentFilter}
          onValueChange={(v) => setUI((s) => ({ ...s, documentFilter: v }))}
          presentation="overlay"
          accessibilityLabel="Tipo de documento"
          hideLabel
        >
          <NamedSelect.Item value="all" label="Todos los documentos" />
          <NamedSelect.Item value="budget" label="Presupuestos" />
          <NamedSelect.Item value="prescription" label="Recetas y medicamentos" />
          <NamedSelect.Item value="xray" label="Radiografías" />
          <NamedSelect.Item value="other" label="Otros archivos" />
        </NamedSelect>
        {docs.length ? (
          <View>
            {docs.map((d) => (
              <View key={d.id}>
                <Row
                  title={d.title}
                  description={
                    (d.type === "budget"
                      ? "Presupuesto"
                      : d.type === "prescription"
                        ? ("manual" in d && d.manual ? "Medicamento manual" : "Receta")
                        : d.type === "xray"
                          ? "Radiografía"
                          : "Archivo") +
                    (d.description ? " · " + d.description : "")
                  }
                  icon={
                    d.type === "prescription"
                      ? "pill"
                      : d.type === "xray"
                        ? "xray"
                        : "documents"
                  }
                  onPress={() =>
                    d.type === "budget"
                      ? go("budget", d.id)
                      : d.type === "prescription"
                        ? go("prescription", d.id)
                        : go(
                            "viewer",
                            patient.attachments.find((a) => a.id === d.id)
                              ?.image ?? "",
                          )
                  }
                />
                <Separator />
              </View>
            ))}
          </View>
        ) : (
          <View className="gap-3 items-center pt-10 pb-8 px-5">
            <View className="bg-secondary rounded-full p-5">
              <PIcon name="documents" size={32} />
            </View>
            <Text className="text-xl font-semibold text-center">
              {ui.documentSearch
                ? "No encontramos coincidencias"
                : "Tu biblioteca está lista"}
            </Text>
            <Text muted className="text-center">
              {ui.documentSearch
                ? "Prueba con otro nombre o cambia el filtro."
                : "Guarda un presupuesto, una receta o una radiografía para tenerlos a mano."}
            </Text>
          </View>
        )}
        <Button variant="ghost" onPress={() => go("privacy")}>
          ¿Dónde quedan mis archivos?
        </Button>
      </Page>
      <Fab
        extended
        icon={<PIcon name="camera" />}
        className="absolute bottom-4 right-4"
        variant="surface"
        onPress={() => open({ kind: "source" })}
        accessibilityLabel="Escanear documento"
      >
        Escanear
      </Fab>
    </View>
  );
}
function Access() {
  const { location, go, setState, setDirty, notify, setUI } = usePreview();
  const [name, setName] = useState("");
  const [birthDate, setBirthDate] = useState<Date>();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const register = location.view === "register";
  const recovery = location.view === "recover";
  const onboarding = location.view === "onboarding";
  const submit = () => {
    if (onboarding) {
      if (!name.trim()) {
        setError("Escribe el nombre del perfil.");
        return;
      }
      setState((s) => ({
        ...s,
        accountName: name.trim(),
        patients: s.patients.map((p) =>
          p.id === s.activePatientId
            ? {
                ...p,
                name: name.trim(),
                birthDate: birthDate
                  ? `${birthDate.getFullYear()}-${String(birthDate.getMonth() + 1).padStart(2, "0")}-${String(birthDate.getDate()).padStart(2, "0")}`
                  : "",
              }
            : p,
        ),
      }));
      setDirty(false);
      go("home");
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError("Revisa tu correo.");
      return;
    }
    if (!recovery && password.length < 8) {
      setError("Usa al menos 8 caracteres para continuar.");
      return;
    }
    if (recovery) {
      notify("Solicitud de recuperación simulada; no se envió un correo.");
      return;
    }
    setPassword("");
    if (register) {
      setState(createDesignState(false));
      setUI((s) => ({
        ...s,
        documentSearch: "",
        documentFilter: "all",
        historySearch: "",
        historyGroup: "all",
        treatmentGrouping: "treatment",
      }));
    }
    go(register ? "onboarding" : "home");
  };
  return (
    <Page>
      <View className="pt-6 gap-3">
        <PIcon name="tooth" size={48} />
        <Text className="text-3xl font-bold tracking-tight">
          {onboarding
            ? "Empecemos por ti"
            : recovery
              ? "Recupera el acceso"
              : register
                ? "Tu historia dental empieza aquí"
                : "Qué bueno verte"}
        </Text>
        <Text muted>
          {onboarding
            ? "Este perfil reúne tus registros. Más adelante puedes añadir a tu familia."
            : recovery
              ? "Te mostraremos cómo recuperar tu cuenta."
              : "Organiza tu cuidado dental, a tu ritmo."}
        </Text>
      </View>
      <Surface>
        {onboarding ? (
          <View className="gap-4">
            <Input
              label="Nombre del paciente"
              value={name}
              onChangeText={setName}
            />
            <Text size="sm">Fecha de nacimiento (opcional)</Text>
            <DatePicker
              selected={birthDate}
              onSelect={setBirthDate}
              maxDate={new Date()}
              startMonth={new Date(1900, 0, 1)}
              captionLayout="dropdown"
              locale="es-CL"
              placeholder="Seleccionar fecha"
              format={(d) =>
                d
                  ? new Intl.DateTimeFormat("es-CL", {
                      dateStyle: "medium",
                    }).format(d)
                  : ""
              }
            />
            <Text muted size="sm">
              Mapa disponible: dentición permanente. No presupone el estado ni
              la presencia de las piezas.
            </Text>
          </View>
        ) : (
          <>
            <Input
              label="Correo electrónico"
              autoCapitalize="none"
              keyboardType="email-address"
              value={email}
              onChangeText={setEmail}
            />
            {!recovery ? (
              <View className="gap-1">
                <Input
                  label="Contraseña"
                  secureTextEntry={!showPassword}
                  value={password}
                  onChangeText={setPassword}
                  description={register ? "Al menos 8 caracteres." : ""}
                />
                <Button
                  variant="ghost"
                  onPress={() => setShowPassword((v) => !v)}
                >
                  {showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
                </Button>
              </View>
            ) : null}
          </>
        )}
        {error ? (
          <Text className="text-destructive" accessibilityRole="alert">
            {error}
          </Text>
        ) : null}
        <Button fullWidth onPress={submit}>
          {onboarding
            ? "Crear mi perfil"
            : recovery
              ? "Solicitar recuperación"
              : register
                ? "Crear cuenta"
                : "Entrar"}
        </Button>
        <Notice>
          Acceso simulado de la propuesta. No uses tu contraseña real.
        </Notice>
      </Surface>
      {!onboarding ? (
        <Button
          variant="ghost"
          onPress={() => {
            setError("");
            go(register ? "login" : "register");
          }}
        >
          {register ? "Ya tengo cuenta" : "Crear una cuenta"}
        </Button>
      ) : null}
      {!recovery && !onboarding ? (
        <Button variant="ghost" onPress={() => go("recover")}>
          Olvidé mi contraseña
        </Button>
      ) : null}
      {recovery ? (
        <Button variant="outline" onPress={() => go("login")}>
          Volver a iniciar sesión
        </Button>
      ) : null}
    </Page>
  );
}
function Settings() {
  const {
    production,
    persistence,
    confirmNumbering,
    signOut,
    patient,
    state,
    setState,
    location,
    go,
    open,
    notify,
    edit,
    editState,
    setDirty,
  } = usePreview();
  const [name, setName] = useState(
    location.view === "account" ? state.accountName : patient.name,
  );
  const [error, setError] = useState("");
  if (production && location.view === "plan")
    return (
      <Page>
        <Title>Free y Premium</Title>
        <Text>
          Free: 6 lecturas OCR al mes. Premium: 20 lecturas, sin anuncios y modo
          familiar.
        </Text>
        <Notice>
          Planes previstos. La activación y el consumo mensual aún no están
          disponibles.
        </Notice>
      </Page>
    );
  if (location.view === "plan")
    return (
      <Page>
        <Title subtitle="Elige según cómo cuidas de ti y de tu familia.">
          Tu plan
        </Title>
        {(["free", "premium"] as const).map((plan) => (
          <Surface key={plan}>
            <View className="flex-row justify-between">
              <Text className="text-xl font-semibold">
                {plan === "free" ? "Free" : "Premium"}
              </Text>
              {state.plan === plan ? (
                <Status success>Seleccionado</Status>
              ) : null}
            </View>
            <Text className="text-3xl font-semibold">
              {plan === "free" ? "6" : "20"} <Text muted>lecturas al mes</Text>
            </Text>
            <Text muted>Presupuestos y recetas combinados por cuenta.</Text>
            <Separator />
            <Text>
              {plan === "free"
                ? "Gestión personal y registros manuales."
                : "Sin anuncios y con Modo Familiar."}
            </Text>
            <Button
              variant={state.plan === plan ? "outline" : "primary"}
              onPress={() => {
                if (plan === "free" && state.patients.length > 1) {
                  notify(
                    "Conservamos los perfiles existentes. La bajada de plan requiere revisión.",
                  );
                  return;
                }
                setState((s) => ({ ...s, plan }));
                notify("Plan cambiado en la vista de prueba; sin cobros.");
              }}
            >
              {state.plan === plan
                ? "Mantener este plan"
                : `Probar ${plan === "free" ? "Free" : "Premium"}`}
            </Button>
          </Surface>
        ))}
        <Notice>
          Comparación de beneficios. No hay una compra ni un contador de consumo
          conectado.
        </Notice>
      </Page>
    );
  if (location.view === "family")
    return (
      <Page>
        <Title
          action={
            <Button
              variant="outline"
              accessibilityLabel={
                state.plan === "premium"
                  ? "Añadir perfil familiar"
                  : "Ver Premium"
              }
              onPress={() =>
                state.plan === "premium" ? open({ kind: "family" }) : go("plan")
              }
            >
              {state.plan === "premium" ? (
                <PIcon name="plus" />
              ) : (
                <Text>Ver Premium</Text>
              )}
            </Button>
          }
        >
          Mi familia
        </Title>
        <Surface>
          {state.patients.map((p) => (
            <Row
              key={p.id}
              title={p.name}
              description={
                state.activePatientId === p.id
                  ? "Perfil actual"
                  : "Historial independiente"
              }
              icon="user"
              onPress={() => {
                setState((s) => ({ ...s, activePatientId: p.id }));
                go("home");
              }}
            />
          ))}
        </Surface>
        {state.plan === "free" ? (
          <Notice>
            Modo Familiar está incluido en Premium. Puedes explorar el plan
            antes de añadir un perfil.
          </Notice>
        ) : (
          <Button onPress={() => open({ kind: "family" })}>
            Añadir familiar
          </Button>
        )}
      </Page>
    );
  if (location.view === "account" || location.view === "patient")
    return (
      <Page>
        <Title>
          {location.view === "account" ? "Tu cuenta" : "Perfil dental"}
        </Title>
        <Surface>
          <Input
            label="Nombre"
            value={name}
            onChangeText={(v) => {
              setName(v);
              setDirty(true);
            }}
          />
          <Text muted size="sm">
            Cuenta y perfil dental se mantienen separados.
          </Text>
          {location.view === "patient" ? (
            <View className="gap-2">
              <Text size="sm" weight="medium">
                Dentición
              </Text>
              <Text>Permanente</Text>
              <Text muted size="sm">
                El mapa interactivo disponible corresponde a dentición
                permanente.
              </Text>
            </View>
          ) : null}
          {error ? <Text className="text-destructive">{error}</Text> : null}
          <Button
            onPress={async () => {
              try {
                if (!name.trim()) throw new Error("Escribe un nombre.");
                if (location.view === "account") {
                  await editState(
                    (s) => ({ ...s, accountName: name.trim() }),
                    "Nombre de cuenta actualizado",
                  );
                } else
                  await edit(
                    (p) => ({ ...p, name: name.trim() }),
                    "Nombre actualizado",
                  );
                go("profile");
              } catch (e) {
                setError((e as Error).message);
              }
            }}
          >
            Guardar cambios
          </Button>
        </Surface>
      </Page>
    );
  if (location.view === "preferences")
    return (
      <Page>
        <Title>Preferencias</Title>
        <Surface>
          <View className="gap-2">
            <Text>Numeración visible</Text>
            <NamedSelect
              value={state.numbering}
              onValueChange={(v) =>
                setState((s) => ({
                  ...s,
                  numbering: v === "universal" ? "universal" : "fdi",
                }))
              }
              presentation="overlay"
            >
              <NamedSelect.Item value="fdi" label="FDI / ISO 3950" />
              <NamedSelect.Item value="universal" label="Universal / ADA" />
            </NamedSelect>
          </View>
          <Separator />
          <View className="flex-row items-center justify-between gap-3">
            <Text className="flex-1">Mostrar avisos en la aplicación</Text>
            <Switch
              value={state.notificationsEnabled}
              onValueChange={async (value) => {
                try {
                  await editState((s) => ({
                    ...s,
                    notificationsEnabled: value,
                  }));
                } catch (e) {
                  notify((e as Error).message);
                }
              }}
              accessibilityLabel="Mostrar avisos"
            />
          </View>
          <Text muted size="sm">
            Esta preferencia visual no concede permisos ni programa
            notificaciones.
          </Text>
        </Surface>
      </Page>
    );
  if (location.view === "privacy")
    return (
      <Page>
        <Title>Privacidad y archivos</Title>
        <Surface>
          <Section title="Cada cosa en su lugar">
            <Text>
              Los datos confirmados y sus archivos originales son cosas
              distintas.
            </Text>
            <Row
              title="Datos del registro"
              description="Piezas, prestaciones, citas e indicaciones que confirmes."
              icon="shield"
            />
            <Row
              title="Original del documento"
              description={persistence === "remote" ? "Se guarda de forma privada en tu cuenta. Puedes abrirlo al iniciar sesión en otro dispositivo." : production ? "Se conserva en este equipo y no se sincroniza con otros dispositivos." : "La vista de prueba no conserva archivos al recargar."}
            />
          </Section>
        </Surface>
        <Notice>
          {persistence === "remote" ? "Los datos y originales que guardas se sincronizan de forma privada en tu cuenta. El OCR se procesa en el equipo que ejecuta el lector local." : production ? "Tus datos y originales se conservan solo en este equipo. No se sincronizan con otros dispositivos." : "Esta vista de prueba usa datos temporales. Se reinician al recargar."}
        </Notice>
      </Page>
    );
  return (
    <Page>
      <Title subtitle="Cuenta y preferencias">{patient.name}</Title>
      <View>
        <Row
          title="Perfil dental"
          description="Tu nombre y dentición"
          icon="tooth"
          onPress={() => go("patient")}
        />
        <Separator />
        <Row
          title="Mi familia"
          description="Perfiles independientes"
          icon="user"
          onPress={() => go("family")}
        />
        <Separator />
        <Row
          title="Cuenta"
          description="Datos de acceso y cuenta"
          icon="user"
          onPress={() => go("account")}
        />
      </View>
      <View>
        <View className="gap-4 py-3">
          <Text weight="semibold">Numeración</Text>
          <NumberingControl
            guide
            value={state.numbering}
            onChange={async (numbering) => {
              try {
                await confirmNumbering?.(numbering);
                setState((s) => ({
                  ...s,
                  numbering,
                  numberingConfirmed: true,
                }));
              } catch (e) {
                notify((e as Error).message);
              }
            }}
          />
          <View className="flex-row items-center justify-between">
            <Text>Avisos en la aplicación</Text>
            <Switch
              accessibilityLabel="Avisos en la aplicación"
              value={state.notificationsEnabled}
              onValueChange={async (notificationsEnabled) => {
                try {
                  await editState((s) => ({ ...s, notificationsEnabled }));
                } catch (e) {
                  notify((e as Error).message);
                }
              }}
            />
          </View>
        </View>
        <Separator />
        <Row
          title="Privacidad y archivos"
          description="Tus documentos y dónde se conservan"
          icon="shield"
          onPress={() => go("privacy")}
        />
        <Separator />
        <Row
          title="Free y Premium"
          description={
            state.plan === "free"
              ? "Plan Free · 6 lecturas al mes"
              : "Plan Premium · 20 lecturas al mes"
          }
          icon="documents"
          onPress={() => go("plan")}
        />
        <Separator />
      </View>
      <Button
        variant="destructive"
        onPress={async () => {
          if (signOut) await signOut();
          else if (!production) go("login");
        }}
      >
        Cerrar sesión
      </Button>
    </Page>
  );
}
function Notifications() {
  const { patient, go } = usePreview();
  return (
    <Page>
      <Title>Notificaciones</Title>
      {patient.reminders.length ? (
        <Surface>
          {patient.reminders.map((r) => (
            <Row
              key={r.id}
              title={r.title}
              description={`${shortDate(r.at)} · ${time(r.at)}`}
              icon="bell"
              onPress={() => go("reminders")}
            />
          ))}
        </Surface>
      ) : (
        <Blank
          title="Todo al día"
          description="Aquí podrás consultar los avisos vinculados a tus registros."
        />
      )}
      <Text muted size="sm">
        Puedes cambiar los avisos en Perfil.
      </Text>
    </Page>
  );
}
