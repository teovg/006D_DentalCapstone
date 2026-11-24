import { Fragment } from "react";
import { Text } from "panelui-native/primitives/text";
import { View } from "react-native";
import {
  Section,
  Surface,
  Row,
  Blank,
  HelpLabel,
  Button,
  PIcon,
  Page,
  NamedSelect,
} from "./components";
import { Progress } from "panelui-native/components/progress";
import { Input } from "panelui-native/components/input";
import { usePreview, shortDate } from "./context";
import { clp, budgetTotal, paidTotal, codesFor } from "./model";
export function TreatmentList() {
  let { patient, state, go, open } = usePreview();
  return (
    <Page bottomPadding={88}>
      <View className="gap-5">
        <Section title="Presupuestos">
          {patient.budgets.length ? (
            patient.budgets.map((b) => (
              <Surface key={b.id}>
                <Row
                  title={b.title}
                  description={`${b.rows.length} prestaciones · ${clp(budgetTotal(b) - paidTotal(b))} de saldo`}
                  onPress={() => go("budget-progress", b.id)}
                />
                <Progress
                  value={b.rows.filter((r) => r.done).length}
                  maxValue={Math.max(1, b.rows.length)}
                  label="Prestaciones realizadas"
                  valueLabel={`${b.rows.filter((r) => r.done).length} de ${b.rows.length}`}
                  showValueLabel={true}
                />
                {b.rows.map((r) => (
                  <Row
                    title={r.title}
                    description={r.done ? "Realizada" : "Pendiente"}
                    icon={r.done ? "check" : "tooth"}
                    trailing={
                      <View className="items-end">
                        <Text>{clp(r.amount)}</Text>
                        <Text muted={true} size="xs">
                          {b.payments
                            .filter(
                              (p) => !p.voidedAt && p.procedureId === r.id,
                            )
                            .reduce((n, p) => n + p.amount, 0) >= r.amount &&
                          r.amount > 0
                            ? "Pago asignado"
                            : "Sin pago asignado"}
                        </Text>
                      </View>
                    }
                    onPress={() => go("budget", b.id)}
                    key={r.id}
                  />
                ))}
              </Surface>
            ))
          ) : (
            <Blank
              title="Aún no hay presupuestos"
              description="Digitaliza uno para seguir sus prestaciones y pagos."
              label="Ir a documentos"
              onPress={() => go("documents")}
            />
          )}
        </Section>
        <Section
          title={
            <HelpLabel title="Tratamientos sin presupuesto">
              {
                "Tratamientos que no figuran en un presupuesto guardado, por ejemplo una prestación adicional acordada en consulta."
              }
            </HelpLabel>
          }
          action={
            <Button
              variant="ghost"
              accessibilityLabel="Añadir tratamiento sin presupuesto"
              onPress={() =>
                open({
                  kind: "treatment",
                })
              }
            >
              <PIcon name="plus" />
            </Button>
          }
        >
          {patient.treatments.filter((t) => !t.procedureId).length ? (
            <Surface>
              {patient.treatments
                .filter((t) => !t.procedureId)
                .map((t) => (
                  <Row
                    title={t.title}
                    description={`${codesFor(t.toothIds, state.numbering) || "General"} · ${t.status === "planned" ? "Planificado" : t.status === "active" ? "En curso" : t.status === "completed" ? "Completado" : "Pausado"}`}
                    icon="tooth"
                    onPress={() => go("treatment", t.id)}
                    key={t.id}
                  />
                ))}
            </Surface>
          ) : (
            <Blank
              title="Cada tratamiento tiene su historia"
              description="Úsalo si no tienes un presupuesto que incluya ese tratamiento."
            />
          )}
        </Section>
      </View>
    </Page>
  );
}
export function SessionList() {
  let { patient, go, open, ui, setUI } = usePreview();
  let query = ui.historySearch ?? "";
  let year = ui.historyYear ?? "all",
    month = ui.historyMonth ?? "all";
  let years = [
    ...new Set(
      patient.sessions.map((s) => String(new Date(s.at).getFullYear())),
    ),
  ]
    .sort()
    .reverse();
  let setQuery = (value: string) =>
    setUI((s) => ({
      ...s,
      historySearch: value,
    }));
  let sessions = patient.sessions
    .filter(
      (s) =>
        (year === "all" || String(new Date(s.at).getFullYear()) === year) &&
        (month === "all" || String(new Date(s.at).getMonth()) === month) &&
        `${s.title} ${s.professional}`
          .toLocaleLowerCase("es")
          .includes(query.trim().toLocaleLowerCase("es")),
    )
    .sort((a, b) => b.at.localeCompare(a.at));
  return (
    <Page
      bottomPadding={88}
      header={
        patient.sessions.length ? (
          <Fragment>

            <Input
              label="Buscar en el historial"
              placeholder="Atención o profesional"
              value={query}
              onChangeText={setQuery}
            />
            <View className="flex-row gap-3">
              <View className="flex-1">
                <NamedSelect
                  value={year}
                  onValueChange={(historyYear) =>
                    setUI((s) => ({
                      ...s,
                      historyYear,
                    }))
                  }
                  accessibilityLabel="Año"
                >
                  <NamedSelect.Item value="all" label="Todos" />
                  {years.map((y) => (
                    <NamedSelect.Item value={y} label={y} key={y} />
                  ))}
                </NamedSelect>
              </View>
              <View className="flex-1">
                <NamedSelect
                  value={month}
                  onValueChange={(historyMonth) =>
                    setUI((s) => ({
                      ...s,
                      historyMonth,
                    }))
                  }
                  accessibilityLabel="Mes"
                >
                  <NamedSelect.Item value="all" label="Todos" />
                  {Array.from(
                    {
                      length: 12,
                    },
                    (_, m) => (
                      <NamedSelect.Item
                        value={String(m)}
                        label={new Intl.DateTimeFormat("es-CL", {
                          month: "long",
                        }).format(new Date(2026, m, 1))}
                        key={m}
                      />
                    ),
                  )}
                </NamedSelect>
              </View>
            </View>
          </Fragment>
        ) : null
      }
    >
      {patient.sessions.length ? (
        <Fragment>
          {sessions.length ? (
            <Surface>
              {sessions.map((s) => (
                <Row
                  title={s.title}
                  description={`${shortDate(s.at)} · ${s.professional || "Profesional no informado"}`}
                  icon="calendar"
                  onPress={() => go("session", s.id)}
                  key={s.id}
                />
              ))}
            </Surface>
          ) : (
            <Blank
              title="Sin coincidencias"
              description="Prueba otro nombre o cambia el filtro."
              label="Limpiar filtros"
              onPress={() => {
                setQuery("");
                setUI((s) => ({
                  ...s,
                  historyMonth: "all",
                  historyYear: "all",
                }));
              }}
            />
          )}
        </Fragment>
      ) : (
        <Blank
          title="Tu historial empieza aquí"
          description="Registra una atención cuando ya haya ocurrido."
          label="Registrar atención"
          onPress={() =>
            open({
              kind: "session",
            })
          }
        />
      )}
    </Page>
  );
}
