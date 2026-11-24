import { useEffect, useRef, useState } from 'react';
import { ScrollView, View } from 'react-native';
import { BottomSheet } from 'panelui-native/components/bottom-sheet';
import { Item } from 'panelui-native/components/item';
import { ScrollFade } from 'panelui-native/components/scroll-fade';
import { Tabs } from 'panelui-native/components/tabs';
import { Textarea } from 'panelui-native/components/textarea';
import { Text } from 'panelui-native/primitives/text';
import { permanentTeeth } from '../../domain/teeth/catalog';
import type { ToothStatus } from '../../domain/teeth/types';
import { Blank, Button, HelpLabel, NamedSelect, OptionalSection, PIcon, Row, Section } from './components';
import { shortDate, time, usePreview } from './context';
import { guideColors as colors } from './HomeGuide';
import { clp } from './model';

const labels: Record<ToothStatus, string> = {
  healthy: 'Sin hallazgos registrados', observation: 'En observación',
  in_treatment: 'En tratamiento', urgent: 'Prioridad alta', missing: 'Ausente',
};
const validDate = (value: string) => Number.isFinite(new Date(value).getTime());
const dateLabel = (value: string) => validDate(value) ? shortDate(value) : 'Fecha por revisar';
const whenLabel = (value: string) => validDate(value) ? `${shortDate(value)} · ${time(value)}` : 'Fecha por revisar';
const monthKey = (value: string) => {
  if (!validDate(value)) return '';
  const date = new Date(value);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
};
const copy = { color: colors.ink, fontSize: 15, lineHeight: 22 };
const secondary = { color: colors.muted, fontSize: 13, lineHeight: 19 };
const heading = { color: colors.ink, fontSize: 19, lineHeight: 25, fontWeight: '600' as const };

export function ToothGuide() {
  const { sheet, patient, edit, setDirty, open, go } = usePreview();
  const [toothId] = useState(sheet?.id);
  const tooth = permanentTeeth.find(t => t.id === toothId);
  const existing = patient.toothStates[toothId ?? ''];
  const [status, setStatus] = useState(existing?.status ?? '');
  const [note, setNote] = useState(existing?.note ?? '');
  const [tab, setTab] = useState('activity');
  const [month, setMonth] = useState('all');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const busy = useRef(false);
  const [now] = useState(Date.now);
  const changed = status !== (existing?.status ?? '') || note !== (existing?.note ?? '');
  useEffect(() => { setDirty(changed); }, [changed, setDirty]);
  if (!tooth) return <Blank title="Pieza no disponible" description="Vuelve al mapa para seleccionar una pieza." />;

  const appointments = patient.appointments.filter(a => a.toothIds.includes(tooth.id) && a.status === 'scheduled');
  const upcoming = appointments.filter(a => validDate(a.at) && new Date(a.at).getTime() >= now)
    .sort((a, b) => new Date(a.at).getTime() - new Date(b.at).getTime());
  const past = appointments.filter(a => !validDate(a.at) || new Date(a.at).getTime() < now)
    .sort((a, b) => (new Date(b.at).getTime() || 0) - (new Date(a.at).getTime() || 0));
  const sessions = patient.sessions.filter(s => s.toothIds.includes(tooth.id))
    .sort((a, b) => (new Date(b.at).getTime() || 0) - (new Date(a.at).getTime() || 0));
  const months = [...new Set(sessions.map(s => monthKey(s.at)).filter(Boolean))].sort().reverse();
  const selectedMonth = months.includes(month) ? month : 'all';
  const filteredSessions = sessions.filter(s => selectedMonth === 'all' || monthKey(s.at) === selectedMonth);
  const treatments = patient.treatments.filter(t => t.toothIds.includes(tooth.id) && !t.procedureId);
  const linked = patient.budgets.flatMap(budget => budget.rows
    .filter(row => row.general || row.toothIds.includes(tooth.id)).map(row => ({ budget, row })));
  const save = async () => {
    if (busy.current || !changed) return;
    if (!status || !(status in labels)) { setError('Selecciona un estado antes de guardar.'); return; }
    busy.current = true;
    setSaving(true);
    setError('');
    try {
      await edit(p => ({ ...p, toothStates: { ...p.toothStates, [tooth.id]: { status: status as ToothStatus, note } } }), 'Información de la pieza guardada');
      setDirty(false);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'No se pudo guardar. Tus cambios siguen aquí.');
    } finally { busy.current = false; setSaving(false); }
  };

  return <View style={{ flex: 1, backgroundColor: colors.background }}>
    <View style={{ paddingHorizontal: 20, paddingVertical: 8, gap: 4 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <HelpLabel title="Estado">Una cita o un presupuesto no cambia el estado de esta pieza. En observación indica seguimiento pendiente.</HelpLabel>
        <View style={{ flex: 1 }}><NamedSelect value={status} onValueChange={value => { if (!busy.current) { setStatus(value); setError(''); } }}
          presentation="overlay" placeholder="Selecciona un estado" accessibilityLabel="Estado de la pieza" hideLabel disabled={saving}>
          {Object.entries(labels).map(([value, label]) => <NamedSelect.Item key={value} value={value} label={label} />)}
        </NamedSelect></View>
      </View>
      {changed ? <Text style={secondary}>Tienes cambios sin guardar.</Text> : null}
      {error ? <Text accessibilityRole="alert" className="text-destructive">{error}</Text> : null}
    </View>
    <View style={{ paddingHorizontal: 20, borderBottomWidth: 1, borderColor: colors.rule }}>
      <Tabs defaultValue="activity" value={tab} onValueChange={setTab} variant="underline" size="sm">
        <Tabs.List accessibilityLabel="Secciones de la pieza"><Tabs.Trigger value="activity">Actividad</Tabs.Trigger><Tabs.Trigger value="budget">Presupuesto</Tabs.Trigger><Tabs.Trigger value="notes">Notas</Tabs.Trigger></Tabs.List>
      </Tabs>
    </View>
    {tab === 'activity' ? <>
      <View style={{ paddingHorizontal: 20, paddingTop: 14, gap: 8 }}>
          <View style={{ gap: 8 }}><Text style={heading}>{upcoming.length > 1 ? 'Próximas citas' : 'Tu próxima cita'}</Text>
            {upcoming.length ? <View style={{maxHeight:160}}><ScrollFade size={14} edges="both"><ScrollView style={{maxHeight:160}} nestedScrollEnabled showsVerticalScrollIndicator>{upcoming.map(a => <Item key={a.id} onPress={() => open({ kind: 'appointment', id: a.id })}
              accessibilityLabel={`Ver cita: ${a.title}, ${whenLabel(a.at)}`} className="px-0 py-3 rounded-none min-h-12">
              <Item.Content><View style={{ flexDirection: 'row', gap: 18 }}>
                <View style={{ width: 88 }}><Text style={{ ...heading, fontSize: 27, lineHeight: 34, fontVariant: ['tabular-nums'] }}>{time(a.at)}</Text><Text style={secondary}>{dateLabel(a.at)}</Text></View>
                <View style={{ flex: 1, gap: 4 }}><Text style={{ ...copy, fontWeight: '600' }}>{a.title}</Text>{a.place ? <Text style={secondary}>{a.place}</Text> : null}</View>
              </View></Item.Content><PIcon name="chevron" size={16} />
            </Item>)}</ScrollView></ScrollFade></View> : <Text style={secondary}>No hay citas próximas vinculadas.</Text>}
          </View>

        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <Text style={{ ...heading, flex: 1 }}>Atenciones</Text>
          {months.length > 1 ? <View style={{ maxWidth: '60%' }}><NamedSelect value={selectedMonth} onValueChange={setMonth} presentation="overlay" accessibilityLabel="Mes de las atenciones" hideLabel>
            <NamedSelect.Item value="all" label="Todos los meses" />
            {months.map(key => <NamedSelect.Item key={key} value={key} label={new Intl.DateTimeFormat('es-CL', { month: 'long', year: 'numeric' }).format(new Date(`${key}-01T12:00:00`))} />)}
          </NamedSelect></View> : null}
        </View>
      </View>
    </> : null}
    <BottomSheet.Body keyboardShouldPersistTaps="handled" nestedScrollEnabled showsVerticalScrollIndicator>
      <View style={{ paddingHorizontal: 20, paddingTop: 16, paddingBottom: 24, gap: 18 }}>
        {tab === 'activity' ? <>
          <View style={{ gap: 8 }}>
            {filteredSessions.length ? <View style={{ borderWidth: 1, borderColor: colors.rule, borderRadius: 8, overflow: 'hidden' }}><ScrollFade size={18} edges="both">
              <ScrollView style={{ maxHeight: 200 }} nestedScrollEnabled showsVerticalScrollIndicator>
                {filteredSessions.map(s => <Row key={s.id} title={s.title} description={`${dateLabel(s.at)} · ${s.professional || 'Profesional no informado'}`} icon="calendar" onPress={() => go('session', s.id)} />)}
              </ScrollView>
            </ScrollFade></View> : <Text style={secondary}>{sessions.length ? 'No hay atenciones en este mes.' : 'No hay atenciones registradas para esta pieza.'}</Text>}
          </View>
          {treatments.length ? <Section title={<Text style={heading}>Tratamientos adicionales</Text>}>{treatments.map(t => <Row key={t.id} title={t.title} icon="tooth" onPress={() => go('treatment', t.id)} />)}</Section> : null}
          {past.length ? <OptionalSection title="Citas pasadas sin atención registrada"><Section title="" bounded>{past.map(a => <Row key={a.id} title={a.title} description={whenLabel(a.at)} icon="calendar" onPress={() => open({ kind: 'appointment', id: a.id })} />)}</Section></OptionalSection> : null}
        </> : tab === 'budget' ? <>
          {linked.length ? linked.map(({ budget, row }) => { const assigned = budget.payments.filter(p => !p.voidedAt && p.procedureId === row.id).reduce((sum,p)=>sum+p.amount,0); return <View key={`${budget.id}-${row.id}`} style={{ borderBottomWidth: 1, borderColor: colors.rule, paddingBottom: 12, gap: 4 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <View style={{ flex: 1 }}><Item onPress={() => go('budget', budget.id)} accessibilityLabel={`Ver presupuesto: ${budget.title}, ${row.title}, ${clp(row.amount)}`} className="px-0 py-3 rounded-none min-h-12">
                <Item.Content><Item.Title style={copy}>{row.title}</Item.Title><Item.Description style={secondary}>{budget.title}{row.general ? ' · Alcance general' : ''}</Item.Description>
                  <Text style={{ ...heading, fontSize: 23, lineHeight: 30, marginTop: 6, fontVariant: ['tabular-nums'] }}>{clp(row.amount)}</Text>
                  <Text style={secondary}>{row.done ? 'Realizada' : 'Pendiente'}</Text>
                  <View style={{flexDirection:'row',gap:16,marginTop:8}}>
                    <View style={{flex:1}}><Text style={secondary}>Pagado asignado</Text><Text style={copy}>{clp(assigned)}</Text></View>
                    <View style={{flex:1}}><Text style={secondary}>Saldo de la prestación</Text><Text style={copy}>{clp(row.amount-assigned)}</Text></View>
                  </View>
                </Item.Content><PIcon name="chevron" size={16} />
              </Item></View>
              <Button variant="ghost" accessibilityLabel={`Qué significa: ${row.title}`} onPress={() => open({ kind: 'education', term: row.title })}><PIcon name="info" size={18} /></Button>
            </View>
          </View>; }) : <Text style={secondary}>No hay prestaciones presupuestadas vinculadas a esta pieza.</Text>}
        </> : <Textarea label="Nota personal (opcional)" placeholder="Algo que quieras recordar de esta pieza" value={note}
          editable={!saving} onChangeText={value => { if (!busy.current) { setNote(value); setError(''); } }} />}
      </View>
    </BottomSheet.Body>
    {changed ? <BottomSheet.Footer className="flex-row items-center">
      <Button variant="outline" className="flex-1" disabled={saving} onPress={() => { if (busy.current) return; setStatus(existing?.status ?? ''); setNote(existing?.note ?? ''); setError(''); setDirty(false); }}>Cancelar</Button>
      <Button className="flex-1" loading={saving} disabled={saving} onPress={save}>{saving ? 'Guardando…' : 'Guardar'}</Button>
    </BottomSheet.Footer> : null}
  </View>;
}
