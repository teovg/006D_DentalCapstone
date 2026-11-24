import { IndicatedScrollView } from '../../ui/IndicatedScrollView';
import { useMemo, useState } from 'react';
import { Text,  StyleSheet, View } from 'react-native';
import { AppPressable as Pressable } from '../../ui/AppPressable';

import type { ClinicalEvent, ClinicalSession, DentalAppointment } from '../../domain/clinical/types';
import type { PatientTooth } from '../../domain/teeth/types';
import { colors, radii, typography, uiStyles } from '../../ui/theme';
import { AppointmentCalendar } from './AppointmentCalendar';
import type { WorkspaceRoute } from '../workspace/screens';
import { ChoiceField } from '../../ui/ChoiceField';
import { FollowUpActions } from './FollowUpActions';
import { statusPresentation } from '../odontogram/toothPresentation';
import { useListWindow } from '../../ui/listWindow';
import { MoreItemsButton } from '../../ui/MoreItemsButton';

type HistoryFilter = 'all' | 'procedure' | 'control';
type FollowUpSection = 'agenda' | 'treatments' | 'history';

interface HistoryScreenProps {
  events: readonly ClinicalEvent[] | null;
  error: string | null;
  teeth: readonly PatientTooth[];
  sessions: readonly ClinicalSession[] | null;
  sessionsError: string | null;
  appointments: readonly DentalAppointment[] | null;
  appointmentsError: string | null;
  onOpenForm: (route: WorkspaceRoute) => void;
  onOpenRecord: (route: WorkspaceRoute, context: string) => void;
  initialSection?: FollowUpSection;
}

const sections: readonly { id: FollowUpSection; label: string }[] = [
  { id: 'agenda', label: 'Agenda' },
  { id: 'treatments', label: 'Tratamientos' },
  { id: 'history', label: 'Historial' },
];

const filters: readonly { id: HistoryFilter; label: string }[] = [
  { id: 'all', label: 'Todo' },
  { id: 'procedure', label: 'Procedimientos' },
  { id: 'control', label: 'Controles' },
];

const eventLabels: Record<ClinicalEvent['type'], string> = {
  diagnosis: 'Diagnóstico',
  procedure: 'Procedimiento',
  control: 'Control',
  prescription: 'Receta',
  instruction: 'Indicación',
  document: 'Documento',
};

const eventColors: Record<ClinicalEvent['type'], { foreground: string; background: string }> = {
  diagnosis: { foreground: '#7755C7', background: '#F0EBFF' },
  procedure: { foreground: colors.primaryDark, background: colors.accent },
  control: { foreground: colors.healthy, background: colors.successSoft },
  prescription: { foreground: '#9B6010', background: colors.warningSoft },
  instruction: { foreground: '#9B6010', background: colors.warningSoft },
  document: { foreground: '#5D6E84', background: colors.surfaceMuted },
};

function formatEventDate(value: string): string {
  return new Date(value).toLocaleDateString('es-CL', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

export function HistoryScreen({ events, error, teeth, sessions, sessionsError, appointments, appointmentsError, onOpenForm, onOpenRecord, initialSection = 'agenda' }: HistoryScreenProps) {
  const [section, setSection] = useState<FollowUpSection>(initialSection);
  const [filter, setFilter] = useState<HistoryFilter>('all');
  const toothFdiById = useMemo(
    () => new Map(teeth.map((tooth) => [tooth.id, tooth.fdi])),
    [teeth],
  );
  const visibleEvents = useMemo(
    () => events?.filter((event) => filter === 'all' || event.type === filter) ?? [],
    [events, filter],
  );
  const trackedTeeth = useMemo(
    () => teeth.filter((tooth) => tooth.status === 'in_treatment' || tooth.status === 'observation' || tooth.status === 'urgent'),
    [teeth],
  );
  const eventWindow = useListWindow(visibleEvents, filter);

  return (
    <View style={styles.screen}>
    <IndicatedScrollView accessibilityLabel="Seguimiento dental" contentContainerStyle={styles.content}>
      <View accessibilityLabel="Secciones de seguimiento" style={styles.sectionTabs}>
        {sections.map((item) => {
          const selected = section === item.id;
          return (
            <Pressable
              accessibilityRole="button"
              accessibilityState={{ selected }}
              aria-pressed={selected}
              key={item.id}
              onPress={() => setSection(item.id)}
              style={[styles.sectionTab, selected && styles.sectionTabSelected]}
            >
              <Text style={[styles.sectionTabText, selected && styles.sectionTabTextSelected]}>{item.label}</Text>
            </Pressable>
          );
        })}
      </View>

      {section === 'history' ? <View style={styles.filterField}>
        <Text style={typography.label}>Tipo de evento</Text>
        <ChoiceField label="Tipo de evento" options={filters} value={filter} onChange={setFilter} />
      </View> : null}

      {section === 'agenda' ? (
        <AppointmentCalendar appointments={appointments} appointmentsError={appointmentsError} sessions={sessions} sessionsError={sessionsError} teeth={teeth} />
      ) : section === 'treatments' ? (
        trackedTeeth.length === 0 ? (
          <View style={styles.stateCard}><Text style={styles.stateTitle}>Sin tratamientos en seguimiento</Text><Text style={styles.stateBody}>Cuando registres una prestación o cambies el estado de una pieza, aparecerá aquí.</Text></View>
        ) : (
          <View style={styles.cardsList}><Text style={styles.stateBody}>Piezas con tratamiento, observación o prioridad registrada. El estado no confirma que exista un tratamiento activo.</Text>{trackedTeeth.map((tooth) => (
            <Pressable accessibilityRole="button" onPress={() => onOpenRecord('treatment-detail', `Pieza ${tooth.fdi} · ${tooth.name}\n${tooth.summary}`)} key={tooth.id} style={styles.followCard}>
              <View style={styles.toothBadge}><Text style={styles.toothBadgeText}>{tooth.fdi}</Text></View>
              <View style={styles.followCardCopy}><Text style={styles.followCardTitle}>Pieza {tooth.fdi} · {tooth.name}</Text><Text style={styles.followCardStatus}>{statusPresentation[tooth.status].label}</Text><Text numberOfLines={2} style={styles.followCardBody}>{tooth.summary}</Text></View>
            </Pressable>
          ))}</View>
        )
      ) : error ? (
        <View style={styles.stateCard}>
          <Text accessibilityRole="alert" style={styles.errorTitle}>No fue posible cargar el historial</Text>
          <Text style={styles.stateBody}>{error}</Text>
        </View>
      ) : events === null ? (
        <View style={styles.stateCard}>
          <Text style={styles.stateTitle}>Cargando historial…</Text>
        </View>
      ) : visibleEvents.length === 0 ? (
        <View style={styles.stateCard}>
          <Text style={styles.stateTitle}>Sin eventos para mostrar</Text>
          <Text style={styles.stateBody}>
            {events.length === 0
              ? 'Todavía no hay eventos clínicos registrados.'
              : 'No hay eventos que coincidan con este filtro.'}
          </Text>
        </View>
      ) : (
        <View style={styles.timeline}>
          {eventWindow.items.map((event, index) => {
            const eventColor = eventColors[event.type];
            const toothLabels = event.toothIds
              .map((id) => toothFdiById.get(id))
              .filter((value): value is string => Boolean(value));
            return (
              <View key={event.id} style={styles.eventRow}>
                <View style={styles.rail}>
                  <View style={styles.dot} />
                  {index < visibleEvents.length - 1 ? <View style={styles.line} /> : null}
                </View>
                <Pressable accessibilityRole="button" onPress={() => onOpenRecord('event-detail', [
                  event.title, formatEventDate(event.occurredAt), `Piezas FDI: ${toothLabels.join(', ') || 'Sin piezas vinculadas'}`,
                  event.professionalName ? `Profesional: ${event.professionalName}` : null,
                  event.personalNotes ? `Notas personales: ${event.personalNotes}` : null,
                ].filter(Boolean).join('\n'))} style={styles.eventCard}>
                  <View style={styles.eventMeta}>
                    <View style={[styles.eventBadge, { backgroundColor: eventColor.background }]}>
                      <Text style={[styles.eventType, { color: eventColor.foreground }]}>{eventLabels[event.type]}</Text>
                    </View>
                    <Text style={styles.eventDate}>{formatEventDate(event.occurredAt)}</Text>
                  </View>
                  <Text style={styles.eventTitle}>{event.title}</Text>
                  <Text style={styles.eventTeeth}>
                    {toothLabels.length > 0
                      ? `Piezas FDI: ${toothLabels.join(', ')}`
                      : 'Sin piezas vinculadas'}
                  </Text>
                </Pressable>
              </View>
            );
          })}
          <MoreItemsButton remaining={eventWindow.remaining} nextCount={eventWindow.nextCount} onPress={eventWindow.loadMore} />
        </View>
      )}

    </IndicatedScrollView>
    <FollowUpActions onSelect={onOpenForm} />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  // Trailing scroll space lets the last record move fully above the floating action.
  content: { ...uiStyles.page, paddingTop: 8, paddingBottom: 96, gap: 16 },
  filterField: { gap: 8 },
  sectionTabs: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: colors.border },
  sectionTab: { alignItems: 'center', justifyContent: 'center', flex: 1, minHeight: 48, paddingVertical: 12, borderBottomWidth: 2, borderBottomColor: 'transparent' },
  sectionTabSelected: { borderBottomColor: colors.primary },
  sectionTabText: { color: colors.muted, fontSize: 14, fontWeight: '500' }, sectionTabTextSelected: { color: colors.primaryDark },
  stateCard: { paddingVertical: 24 }, stateTitle: { ...typography.sectionTitle }, errorTitle: { ...typography.sectionTitle, color: colors.urgent },
  stateBody: { ...typography.body, marginTop: 8 },
  timeline: { gap: 0 }, cardsList: { gap: 0 }, followCard: { ...uiStyles.row },
  followCardCopy: { flex: 1, minWidth: 0 }, followCardTitle: { ...typography.label }, followCardBody: { ...typography.body, marginTop: 4 },
  followCardStatus: { ...typography.caption, marginTop: 4, color: colors.primaryDark },
  toothBadge: { alignItems: 'center', backgroundColor: colors.accent, borderRadius: radii.sm, minHeight: 48, justifyContent: 'center', width: 48 },
  toothBadgeText: { color: colors.primaryDark, fontSize: 18, fontWeight: '500' },
  eventRow: { flexDirection: 'row', minHeight: 104 }, rail: { alignItems: 'center', width: 24 },
  dot: { backgroundColor: colors.primary, borderRadius: 4, height: 8, marginTop: 20, width: 8 },
  line: { backgroundColor: colors.border, flex: 1, width: 1 },
  eventCard: { flex: 1, marginBottom: 12, paddingVertical: 16, paddingLeft: 12, borderBottomWidth: 1, borderBottomColor: colors.border },
  eventMeta: { alignItems: 'center', flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'space-between' },
  eventBadge: { borderRadius: 4, paddingHorizontal: 8, paddingVertical: 4 },
  eventType: { fontSize: 12, fontWeight: '500' }, eventDate: { ...typography.caption },
  eventTitle: { ...typography.label, marginTop: 8 }, eventTeeth: { ...typography.body, marginTop: 4 },
});
