import { IndicatedScrollView } from '../../ui/IndicatedScrollView';
import { useMemo, useState } from 'react';
import {  StyleSheet, Text, View } from 'react-native';
import { AppPressable as Pressable } from '../../ui/AppPressable';
import type { AppRoute } from '../../app/navigation';
import type { DentalAppointment } from '../../domain/clinical/types';
import type { PatientTooth } from '../../domain/teeth/types';
import { colors, typography } from '../../ui/theme';
import { Icon, type IconName } from '../../ui/Icon';
import { SmileIllustration } from '../../ui/SmileIllustration';
import { summarizeTeeth } from './dashboardSummary';

interface DashboardScreenProps {
  displayName: string | null;
  teeth: readonly PatientTooth[];
  appointments: readonly DentalAppointment[] | null;
  appointmentsError: string | null;
  onNavigate: (route: AppRoute) => void;
}

export function DashboardScreen({ displayName, teeth, appointments, appointmentsError, onNavigate }: DashboardScreenProps) {
  const summary = useMemo(() => summarizeTeeth(teeth), [teeth]);
  const [now] = useState(() => Date.now());
  const upcomingAppointment = appointments?.find((appointment) =>
    (appointment.status === 'scheduled' || appointment.status === 'confirmed') && new Date(appointment.scheduledAt).getTime() >= now);
  const appointmentDate = upcomingAppointment ? new Date(upcomingAppointment.scheduledAt) : null;

  return (
    <IndicatedScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
      <View style={styles.greeting}>
        <Text accessibilityRole="header" style={styles.title}>{displayName ? `Hola, ${displayName}` : 'Tu historial dental'}</Text>
        <Text style={styles.subtitle}>Tu historial y próximas atenciones, en un solo lugar.</Text>
      </View>
      <View style={styles.feature}>
        <View style={styles.featureContent}>
          <View style={styles.featureCopy}>
            <Text accessibilityRole="header" style={styles.featureTitle}>Tu registro dental</Text>
            <Text style={styles.featureBody}>Consulta cada pieza y su tratamiento.</Text>
          </View>
          <SmileIllustration />
        </View>
        <Pressable accessibilityRole="button" accessibilityLabel="Ver odontograma completo" onPress={() => onNavigate('odontogram')} style={({ pressed }) => [styles.featureButton, pressed && styles.pressed]}>
          <Text style={styles.featureButtonText}>Ver odontograma</Text><Icon name="chevron" size={17} color={colors.surface} />
        </Pressable>
      </View>
      <View style={styles.summary}>
        <Text accessibilityRole="header" style={styles.sectionTitle}>Tu registro actual</Text>
        <View style={styles.metrics}>
          <View style={styles.metric}><Text style={styles.metricValue}>{summary.healthy}<Text style={styles.metricTotal}> / {summary.total}</Text></Text><Text style={styles.metricLabel}>Sin hallazgos registrados</Text></View>
          <View style={styles.metric}><Text style={styles.metricValue}>{summary.treatmentOrPriority}</Text><Text style={styles.metricLabel}>En tratamiento o prioridad</Text></View>
        </View>
        <View style={styles.observation}><View style={styles.statusDot} /><Text style={styles.observationText}>{summary.observation} {summary.observation === 1 ? 'pieza en observación' : 'piezas en observación'}</Text></View>
      </View>
      <View style={styles.agenda}>
        <View style={styles.sectionHeading}>
          <Text accessibilityRole="header" style={styles.sectionTitle}>Próxima atención</Text>
          <Pressable accessibilityRole="button" onPress={() => onNavigate('history')} style={({ pressed }) => [styles.textButton, pressed && styles.pressed]}><Text style={styles.link}>Ver agenda</Text></Pressable>
        </View>
        <Pressable accessibilityRole="button" accessibilityLabel="Abrir calendario de citas" onPress={() => onNavigate('history')} style={({ pressed }) => [styles.appointment, pressed && styles.rowPressed]}>
          {appointmentDate ? <View style={styles.dateBlock}><Text style={styles.dateDay}>{appointmentDate.getDate()}</Text><Text style={styles.dateMonth}>{appointmentDate.toLocaleDateString('es-CL', { month: 'short' }).replace('.', '').toLocaleUpperCase('es-CL')}</Text></View> : <View style={styles.emptyCalendar}><Icon name="calendar" size={28} color={colors.muted} /></View>}
          <View style={styles.appointmentCopy}>
            {appointmentsError ? <Text accessibilityRole="alert" style={styles.errorText}>No pudimos consultar tus citas. Abre la agenda para revisar la conexión.</Text> : appointments === null ? <Text style={styles.body}>Consultando tus citas…</Text> : upcomingAppointment && appointmentDate ? <>
              <Text style={styles.rowTitle}>{upcomingAppointment.notes ?? 'Cita odontológica'}</Text>
              <Text style={styles.body}>{upcomingAppointment.locationLabel ?? 'Lugar sin registrar'}</Text>
              <Text style={styles.appointmentTime}>{appointmentDate.toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit', hour12: false })} h</Text>
            </> : <><Text style={styles.rowTitle}>Sin próximas citas</Text><Text style={styles.body}>Consulta tus atenciones o registra una fecha en la agenda.</Text></>}
          </View>
          <Icon name="chevron" size={18} color={colors.muted} />
        </Pressable>
      </View>
      <View style={styles.actions}>
        <ActionRow icon="camera" title="Digitalizar presupuesto" description="Añade una foto de tu presupuesto dental." onPress={() => onNavigate('document-capture')} />
        <ActionRow icon="shield" title="Guías de salud oral" description="Consulta cuidados y preguntas frecuentes." onPress={() => onNavigate('preventive-care')} last />
      </View>
    </IndicatedScrollView>
  );
}

function ActionRow({ icon, title, description, onPress, last = false }: { icon: IconName; title: string; description: string; onPress: () => void; last?: boolean }) {
  return <Pressable accessibilityRole="button" onPress={onPress} style={({ pressed }) => [styles.actionRow, !last && styles.rowDivider, pressed && styles.rowPressed]}><Icon name={icon} size={24} color={colors.primary} /><View style={styles.actionCopy}><Text style={styles.rowTitle}>{title}</Text><Text style={styles.body}>{description}</Text></View><Icon name="chevron" size={18} color={colors.muted} /></Pressable>;
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 20, paddingTop: 20, paddingBottom: 24 },
  greeting: { marginBottom: 24 },
  title: { ...typography.pageTitle, fontSize: 34, lineHeight: 43 },
  subtitle: { color: colors.muted, fontSize: 14, lineHeight: 21, marginTop: 8 },
  feature: { backgroundColor: colors.accent, borderRadius: 16, padding: 20, marginBottom: 28 },
  featureContent: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  featureCopy: { flex: 1.25, minWidth: 0 },
  featureTitle: { color: colors.featureInk, fontSize: 22, fontWeight: '500', lineHeight: 28 },
  featureBody: { color: colors.featureInk, fontSize: 14, lineHeight: 21, marginTop: 8 },
  featureButton: { alignSelf: 'flex-start', alignItems: 'center', flexDirection: 'row', gap: 12, minHeight: 48, backgroundColor: colors.primary, borderRadius: 10, paddingHorizontal: 16, paddingVertical: 12, marginTop: 12 },
  featureButtonText: { color: colors.surface, fontSize: 14, fontWeight: '600', flexShrink: 1 },
  pressed: { opacity: 0.65 },
  summary: { marginBottom: 24 },
  sectionTitle: { color: colors.ink, fontSize: 17, fontWeight: '600', flexShrink: 1 },
  metrics: { flexDirection: 'row', gap: 24, marginTop: 16 },
  metric: { flex: 1, minWidth: 0 },
  metricValue: { color: colors.ink, fontSize: 30, fontWeight: '500', fontVariant: ['tabular-nums'] },
  metricTotal: { color: colors.muted, fontSize: 20, fontWeight: '400' },
  metricLabel: { color: colors.muted, fontSize: 13, lineHeight: 19, marginTop: 4 },
  observation: { flexDirection: 'row', gap: 8, alignItems: 'center', marginTop: 16 },
  statusDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: colors.observation },
  observationText: { color: colors.muted, fontSize: 13, lineHeight: 19, flexShrink: 1 },
  agenda: { marginBottom: 16 },
  sectionHeading: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  textButton: { minHeight: 48, minWidth: 80, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4 },
  link: { color: colors.primary, fontSize: 13, fontWeight: '600' },
  appointment: { flexDirection: 'row', alignItems: 'center', gap: 16, paddingVertical: 16, borderTopWidth: 1, borderBottomWidth: 1, borderColor: colors.border, minHeight: 96 },
  dateBlock: { alignItems: 'center', minWidth: 48 },
  dateDay: { color: colors.primary, fontSize: 32, fontWeight: '500', fontVariant: ['tabular-nums'] },
  dateMonth: { color: colors.primary, fontSize: 12, fontWeight: '600', marginTop: 2 },
  emptyCalendar: { minWidth: 48, alignItems: 'center' },
  appointmentCopy: { flex: 1, minWidth: 0 },
  rowTitle: { color: colors.ink, fontSize: 15, fontWeight: '500', lineHeight: 21 },
  body: { color: colors.muted, fontSize: 13, lineHeight: 20, marginTop: 4 },
  appointmentTime: { color: colors.primary, fontSize: 13, fontWeight: '600', marginTop: 4 },
  errorText: { color: colors.urgent, fontSize: 13, lineHeight: 20 },
  actions: { marginTop: 4 },
  actionRow: { flexDirection: 'row', alignItems: 'center', gap: 16, paddingVertical: 20, minHeight: 80 },
  actionCopy: { flex: 1, minWidth: 0 },
  rowDivider: { borderBottomColor: colors.border, borderBottomWidth: 1 },
  rowPressed: { backgroundColor: colors.surfaceMuted },
});
