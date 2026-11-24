import { isManualMedicine } from "./timeNoticeRules";
import { Fragment, useState } from "react";
import { TimeNotice } from "./TimeNotice";
import { View } from "react-native";
import {
  Title,
  PIcon,
  Page,
  Button,
  Surface,
  Row,
  Blank,
  Section,
  Status,
  NamedSelect,
} from "./components";
import { Dialog } from "panelui-native/components/dialog";
import { ImageViewer } from "panelui-native/components/image-viewer";
import { Progress } from "panelui-native/components/progress";
import { Separator } from "panelui-native/components/separator";
import { Text } from "panelui-native/primitives/text";
import { Textarea } from "panelui-native/components/textarea";
import { usePreview, longDate, time, shortDate } from "./context";
import { codesFor, budgetTotal, paidTotal, clp } from "./model";
import { Original } from "./capture";
import { AudioNote } from "./AudioNote";
import { TreatmentList, SessionList } from "./lists";
export function RecordScreens() {
  let { location, patient, go, open, edit, back, state } = usePreview();
  let budget = patient.budgets.find((b) => b.id === location.id);
  let prescription = patient.prescriptions.find((p) => p.id === location.id);
  let treatment = patient.treatments.find((t) => t.id === location.id);
  let treatmentBudget = treatment
    ? patient.budgets.find((b) =>
        b.rows.some((r) => r.id === treatment.procedureId),
      )
    : undefined;
  let session = patient.sessions.find((s) => s.id === location.id);
  let [error, setError] = useState("");
  let [cancelPayment, setCancelPayment] = useState("");
  if (location.view === "viewer")
    return (
      <View className="flex-1 bg-card">
        <View className="p-5">
          <Title
            action={
              location.id && !location.id.startsWith("sample:") ? (
                <ImageViewer blur={false} closeLabel="Cerrar original">
                  <ImageViewer.Trigger
                    source={{
                      uri: location.id,
                    }}
                    alt="Documento original"
                    accessibilityRole="button"
                    accessibilityLabel="Ampliar original"
                    className="min-h-12 min-w-12 items-center justify-center"
                  >
                    <PIcon name="search" />
                  </ImageViewer.Trigger>
                </ImageViewer>
              ) : undefined
            }
          >
            {"Documento original"}
          </Title>
        </View>
        <Original uri={location.id ?? ""} large={true} />
      </View>
    );
  if (location.view === "schedule")
    return <TimeNotice prescriptionId={location.id} onClose={back} />;
  if (location.view === "notes" || location.view === "care")
    return <SessionNotes care={location.view === "care"} />;
  if (location.view === "treatments") return <TreatmentList />;
  if (location.view === "sessions") return <SessionList />;
  if (location.view === "reminders")
    return (
      <Page>
        <Title
          action={
            <Button
              variant="outline"
              accessibilityLabel="Añadir recordatorio"
              onPress={() => open({ kind: "reminder" })}
            >
              <PIcon name="plus" />
            </Button>
          }
        >
          Recordatorios
        </Title>
        {patient.reminders.length ? (
          <Surface>
            {patient.reminders.map((r) => (
              <Row
                key={r.id}
                title={r.title}
                description={
                  r.enabled === false
                    ? "Desactivado"
                    : r.kind === "care"
                      ? "Cuidado activo"
                      : r.medicationSchedule
                        ? "Horario de medicamento"
                        : `${longDate(r.at)} · ${time(r.at)}`
                }
                icon={r.kind === "medicine" ? "pill" : "bell"}
                onPress={() => open({ kind: "reminder", id: r.id })}
              />
            ))}
          </Surface>
        ) : (
          <Text muted>No tienes recordatorios próximos.</Text>
        )}
        {patient.prescriptions.length ? (
          <Section title="Medicamentos guardados">
            {patient.prescriptions.map((p) => (
              <Row
                key={p.id}
                title={p.title}
                description="Revisar horarios de sus medicamentos"
                icon="pill"
                onPress={() => go("prescription", p.id)}
              />
            ))}
          </Section>
        ) : null}
      </Page>
    );
  if (location.view === "session" && session)
    return (
      <Page>
        <Title subtitle={`${longDate(session.at)} · ${time(session.at)}`}>
          {session.title}
        </Title>
        <Surface>
          <Status success={true}>{"Atención realizada"}</Status>
          <Text>{session.professional || "Profesional no informado"}</Text>
          <Text muted={true}>
            {codesFor(session.toothIds, state.numbering) || "Sin piezas vinculadas"}
          </Text>
        </Surface>
        <Section title="Tus notas">
          <Text>
            {session.notes || "Todavía no has añadido notas de esta atención."}
          </Text>
          <Button variant="outline" onPress={() => go("notes", session.id)}>
            {"Notas y audio"}
          </Button>
        </Section>
        <Surface>
          <Row
            title="Indicaciones y cuidados"
            description="Conserva lo que te indicó el profesional."
            icon="shield"
            onPress={() => go("care", session.id)}
          />
          <Row
            title="Añadir un recordatorio"
            icon="bell"
            onPress={() =>
              open({
                kind: "reminder",
                sourceId: session.id,
              })
            }
          />
        </Surface>
        {session.treatmentId ? (
          <Button
            variant="ghost"
            onPress={() => go("treatment", session.treatmentId)}
          >
            {"Ver tratamiento vinculado"}
          </Button>
        ) : null}
      </Page>
    );
  if (location.view === "treatment" && treatment)
    return (
      <Page>
        <Title
          action={
            <Button
              variant="ghost"
              accessibilityLabel="Qué significa este tratamiento"
              onPress={() =>
                open({
                  kind: "education",
                  term: treatment.title,
                })
              }
            >
              <PIcon name="info" />
            </Button>
          }
        >
          {treatment.title}
        </Title>
        <Surface>
          <Text muted={true}>
            {"Piezas "}
            {codesFor(treatment.toothIds, state.numbering) || "no especificadas"}
          </Text>
          <NamedSelect
            value={treatment.status}
            onValueChange={async (v) => {
              try {
                await edit(
                  (p) => ({
                    ...p,
                    treatments: p.treatments.map((t) =>
                      t.id === treatment.id
                        ? {
                            ...t,
                            status: v as
                              "planned" | "active" | "paused" | "completed",
                          }
                        : t,
                    ),
                  }),
                  "Estado del tratamiento actualizado",
                );
                setError("");
              } catch (e) {
                setError((e as Error).message);
              }
            }}
            presentation="overlay"
            accessibilityLabel="Estado del tratamiento"
          >
            <NamedSelect.Item value="planned" label="Planificado" />
            <NamedSelect.Item value="active" label="En curso" />
            <NamedSelect.Item value="paused" label="Pausado" />
            <NamedSelect.Item value="completed" label="Completado" />
          </NamedSelect>
          <Text muted={true} size="sm">
            {
              "Cambiar este estado no registra pagos ni modifica automáticamente las piezas."
            }
          </Text>
          {error ? <Text className="text-destructive">{error}</Text> : null}
        </Surface>
        <View className="flex-row gap-2">
          <Button
            className="flex-1"
            onPress={() =>
              open({
                kind: "appointment",
                sourceId: treatment.id,
              })
            }
          >
            {"Nueva cita"}
          </Button>
          <Button
            className="flex-1"
            variant="outline"
            onPress={() =>
              open({
                kind: "session",
                sourceId: treatment.id,
              })
            }
          >
            {"Registrar atención"}
          </Button>
        </View>
        {treatmentBudget ? (
          <Row
            title="Presupuesto de origen"
            description={treatmentBudget.clinic || treatmentBudget.title}
            icon="documents"
            onPress={() => go("budget", treatmentBudget.id)}
          />
        ) : null}
        <Section title="Sesiones y profesionales">
          {patient.sessions.filter((s) => s.treatmentId === treatment.id)
            .length ? (
            patient.sessions
              .filter((s) => s.treatmentId === treatment.id)
              .sort((a, b) => b.at.localeCompare(a.at))
              .map((s) => (
                <Row
                  title={s.title}
                  description={`${shortDate(s.at)} · ${s.professional || "Profesional no informado"}`}
                  icon="calendar"
                  onPress={() => go("session", s.id)}
                  key={s.id}
                />
              ))
          ) : (
            <Text muted={true}>
              {
                "Las atenciones que registres aparecerán aquí. Cada sesión conserva a su profesional."
              }
            </Text>
          )}
        </Section>
      </Page>
    );
  if (
    (location.view === "budget" ||
      location.view === "budget-progress" ||
      location.view === "payments") &&
    budget
  ) {
    let total = budgetTotal(budget),
      paid = paidTotal(budget),
      done = budget.rows.filter((r) => r.done).length;
    return (
      <Page>
        <Title subtitle={budget.clinic}>
          {budget.title}
        </Title>
        <Surface>
          <View className="flex-row gap-4">
            <View className="flex-1 gap-1">
              <Text muted={true} size="sm">
                {"Total presupuestado"}
              </Text>
              <Text className="text-2xl font-semibold" selectable={true}>
                {clp(total)}
              </Text>
            </View>
            <View className="flex-1 gap-1">
              <Text muted={true} size="sm">
                {"Saldo pendiente"}
              </Text>
              <Text className="text-2xl font-semibold" selectable={true}>
                {clp(total - paid)}
              </Text>
            </View>
          </View>
          <Separator />
          <Progress
            value={paid}
            maxValue={Math.max(1, total)}
            label="Pagado"
            valueLabel={clp(paid)}
            showValueLabel={true}
          />
          <Progress
            value={done}
            maxValue={Math.max(1, budget.rows.length)}
            label="Prestaciones realizadas"
            valueLabel={`${done} de ${budget.rows.length}`}
            showValueLabel={true}
          />
        </Surface>
        <Fragment>
          <Button
            onPress={() =>
              open({
                kind: "payment",
                id: budget.id,
              })
            }
            disabled={paid >= total}
          >
            {"Registrar abono"}
          </Button>
          {budget.payments.length ? (
            <Surface>
              {budget.payments.map((p) => (
                <View className="gap-2 py-2" key={p.id}>
                  <Text weight="semibold">{clp(p.amount)}</Text>
                  <Text muted={true} size="sm">
                    {shortDate(p.date)}
                    {" · "}
                    {p.note || "Sin referencia"}
                  </Text>
                  <Text muted={true} size="sm">
                    {p.procedureId
                      ? budget.rows.find((r) => r.id === p.procedureId)?.title
                      : "Al presupuesto general"}
                  </Text>
                  {p.voidedAt ? (
                    <Text muted={true} size="sm">
                      {"Anulado el "}
                      {shortDate(p.voidedAt)}
                      {" · conservado en el registro"}
                    </Text>
                  ) : (
                    <Button
                      variant="ghost"
                      onPress={() => setCancelPayment(p.id)}
                    >
                      {"Anular este abono"}
                    </Button>
                  )}
                  <Separator />
                </View>
              ))}
            </Surface>
          ) : (
            <Text muted={true}>{"No hay abonos registrados."}</Text>
          )}
        </Fragment>
        <Fragment>
          <Section title={`${budget.rows.length} prestaciones`}>
            {budget.rows.map((r) => {
              return (
                <Surface key={r.id}>
                  <View className="flex-row items-start gap-2">
                    <View className="flex-1 gap-2">
                      <Text weight="semibold">{r.title}</Text>
                      <Text muted={true} size="sm">
                        {r.general
                          ? "Toda la dentición"
                          : `Piezas ${codesFor(r.toothIds, state.numbering)}`}{" "}
                        {"· "}
                        {clp(r.amount)}
                      </Text>
                    </View>
                    <Button
                      variant="ghost"
                      accessibilityLabel={`Qué significa ${r.title}`}
                      onPress={() =>
                        open({
                          kind: "education",
                          term: r.title,
                        })
                      }
                    >
                      <PIcon name="info" size={19} />
                    </Button>
                  </View>
                  <Status success={r.done}>
                    {r.done ? "Realizada" : "Presupuestada"}
                  </Status>
                  <Button
                    variant="outline"
                    onPress={async () => {
                      if (!r.done) {
                        open({
                          kind: "session",
                          id: budget.id,
                          sourceId: r.id,
                        });
                        return;
                      }
                      try {
                        await edit(
                          (p) => ({
                            ...p,
                            budgets: p.budgets.map((b) =>
                              b.id === budget.id
                                ? {
                                    ...b,
                                    rows: b.rows.map((row) =>
                                      row.id === r.id
                                        ? {
                                            ...row,
                                            done: false,
                                            sessionId: "",
                                          }
                                        : row,
                                    ),
                                  }
                                : b,
                            ),
                          }),
                          "Avance actualizado",
                        );
                        setError("");
                      } catch (e) {
                        setError((e as Error).message);
                      }
                    }}
                  >
                    {r.done
                      ? "Corregir marca de realización"
                      : "Registrar realización"}
                  </Button>
                </Surface>
              );
            })}
          </Section>
          <Button variant="ghost" onPress={() => go("viewer", budget.image)}>
            {"Abrir original"}
          </Button>
        </Fragment>
        <Dialog
          open={!!cancelPayment}
          onOpenChange={(open) => {
            if (!open) setCancelPayment("");
          }}
        >
          <Dialog.Content>
            <Dialog.Title>{"¿Anular este abono?"}</Dialog.Title>
            <Dialog.Description>
              {
                "Se recalculará el saldo. La realización de las prestaciones se conserva."
              }
            </Dialog.Description>
            <Dialog.Footer>
              <Button variant="outline" onPress={() => setCancelPayment("")}>
                {"Conservar"}
              </Button>
              <Button
                variant="destructive"
                onPress={async () => {
                  try {
                    await edit(
                      (p) => ({
                        ...p,
                        budgets: p.budgets.map((b) =>
                          b.id === budget.id
                            ? {
                                ...b,
                                payments: b.payments.map((x) =>
                                  x.id === cancelPayment
                                    ? {
                                        ...x,
                                        voidedAt: new Date().toISOString(),
                                      }
                                    : x,
                                ),
                              }
                            : b,
                        ),
                      }),
                      "Abono anulado",
                    );
                    setCancelPayment("");
                  } catch (e) {
                    setError((e as Error).message);
                    setCancelPayment("");
                  }
                }}
              >
                {"Anular abono"}
              </Button>
            </Dialog.Footer>
          </Dialog.Content>
        </Dialog>
        {error ? (
          <Text className="text-destructive" accessibilityRole="alert">
            {error}
          </Text>
        ) : null}
      </Page>
    );
  }
  if (location.view === "prescription" && prescription)
    return (
      <Page>
        <Title subtitle={shortDate(prescription.date)}>
          {isManualMedicine(prescription) ? "Medicamento manual" : prescription.title}
        </Title>
        <Status success>{isManualMedicine(prescription) ? "Añadido por ti" : "Datos confirmados"}</Status>
        {prescription.medicines.map((m) => (
          <Surface key={m.id}>
            <View className="flex-row gap-2 items-center">
              <View className="flex-1 gap-1">
                <Text weight="semibold">
                  {m.name} {m.strength ?? ""}
                </Text>
                <Text muted size="sm">
                  {m.quantity
                    ? `${m.quantity} · cada ${m.intervalHours} horas · ${m.days} días`
                    : m.intervalHours && m.days ? `Cada ${m.intervalHours} horas · ${m.days} días` : m.instruction}
                </Text>
              </View>
              <Button
                variant="outline"
                accessibilityLabel={`Horario de ${m.name}`}
                onPress={() =>
                  open({
                    kind: "schedule",
                    sourceId: prescription.id,
                    term: m.id,
                  })
                }
              >
                <PIcon name="calendar" />
              </Button>
            </View>
          </Surface>
        ))}
        {prescription.image ? (
          <Button
            variant="outline"
            onPress={() => go("viewer", prescription.image)}
          >
            Abrir original
          </Button>
        ) : null}
      </Page>
    );
  return (
    <Page>
      <Blank
        title="Este registro no está disponible"
        description="Puede pertenecer a otro perfil o haberse eliminado. Tus otros registros siguen accesibles."
        label="Volver a inicio"
        onPress={() => go("home")}
      />
    </Page>
  );
}
function SessionNotes({ care }: { care: boolean }) {
  let { patient, location, edit, setDirty, go, open } = usePreview();
  let session = patient.sessions.find((s) => s.id === location.id);
  let [notes, setNotes] = useState(
    (care ? session?.care : session?.notes) ?? "",
  );
  let [error, setError] = useState("");
  if (!session)
    return (
      <Page>
        <Blank
          title="Elige primero una atención"
          description="Las notas se relacionan con la sesión en la que recibiste la indicación."
          label="Ir al historial"
          onPress={() => go("sessions")}
        />
      </Page>
    );
  return (
    <Page>
      <Title subtitle={`${session.title} · ${shortDate(session.at)}`}>
        {care ? "Indicaciones y cuidados" : "Notas de esta atención"}
      </Title>
      <Surface>
        <Textarea
          label={care ? "Lo que te indicó el profesional" : "Tus notas"}
          value={notes}
          onChangeText={(v) => {
            setNotes(v);
            setDirty(true);
          }}
          placeholder="Escribe lo que quieres conservar de esta atención."
          rows={6}
        />
        {error ? <Text className="text-destructive">{error}</Text> : null}
        <Button
          onPress={async () => {
            try {
              await edit(
                (p) => ({
                  ...p,
                  sessions: p.sessions.map((s) =>
                    s.id === session.id
                      ? {
                          ...s,
                          ...(care
                            ? {
                                care: notes,
                              }
                            : {
                                notes,
                              }),
                        }
                      : s,
                  ),
                }),
                "Nota guardada",
              );
              go("session", session.id);
            } catch (e) {
              setError((e as Error).message);
            }
          }}
        >
          {care ? "Guardar indicación" : "Guardar nota"}
        </Button>
      </Surface>
      {!care ? (
        <Section title="Audio">
          <Text muted={true} size="sm">
            {
              "Escucha un audio antes de guardarlo. Si grabas a otra persona, pide su permiso."
            }
          </Text>
          <AudioNote
            saved={
              session.audioUri
                ? {
                    uri: session.audioUri,
                    name: session.audioName,
                  }
                : null
            }
            onDirty={() => setDirty(true)}
            onSave={async (audio) => {
              await edit(
                (p) => ({
                  ...p,
                  sessions: p.sessions.map((item) =>
                    item.id === session.id
                      ? {
                          ...item,
                          audioUri: audio?.uri ?? "",
                          audioName: audio?.name ?? "",
                        }
                      : item,
                  ),
                }),
                audio
                  ? "Audio guardado en este dispositivo"
                  : "Audio eliminado",
              );
            }}
          />
        </Section>
      ) : (
        <Button
          variant="outline"
          onPress={() =>
            open({
              kind: "reminder",
              sourceId: session.id,
            })
          }
        >
          {"Preparar un recordatorio"}
        </Button>
      )}
    </Page>
  );
}
