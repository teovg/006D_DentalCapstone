import { useMemo, useState } from 'react';
import { Modal, ScrollView, StyleSheet, Text, View } from 'react-native';
import { AppPressable as Pressable } from '../../ui/AppPressable';
import type { ClinicalSession, DentalAppointment } from '../../domain/clinical/types';
import type { PatientTooth } from '../../domain/teeth/types';
import { Icon } from '../../ui/Icon';
import { colors, typography } from '../../ui/theme';
import { calendarDays, calendarMonth, localDateKey, monthLabel, shiftMonth } from './calendar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface AppointmentCalendarProps {
  appointments: readonly DentalAppointment[] | null;
  appointmentsError: string | null;
  sessions: readonly ClinicalSession[] | null;
  sessionsError: string | null;
  teeth: readonly PatientTooth[];
}

const statusLabels: Record<DentalAppointment['status'], string> = {
  scheduled: 'Agendada', confirmed: 'Confirmada', completed: 'Realizada', cancelled: 'Cancelada', missed: 'No asistida',
};
const weekdays = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];
const weekdayNames = ['lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado', 'domingo'];
function time(value: string): string {
  return new Date(value).toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit', hour12: false });
}

export function AppointmentCalendar({ appointments, appointmentsError, sessions, sessionsError, teeth }: AppointmentCalendarProps) {
  const insets = useSafeAreaInsets();
  const [today] = useState(() => localDateKey(new Date()));
  const [month, setMonth] = useState(() => calendarMonth(new Date()));
  const [selectedDate, setSelectedDate] = useState(today);
  const [detail, setDetail] = useState<DentalAppointment | null>(null);
  const days = useMemo(() => calendarDays(month), [month]);
  const appointmentDates = useMemo(() => new Set((appointments ?? []).filter((a) => a.status !== 'cancelled').map((a) => localDateKey(a.scheduledAt))), [appointments]);
  const sessionDates = useMemo(() => new Set((sessions ?? []).map((s) => localDateKey(s.scheduledAt))), [sessions]);
  const selectedAppointments = (appointments ?? []).filter((a) => localDateKey(a.scheduledAt) === selectedDate);
  const selectedSessions = (sessions ?? []).filter((s) => localDateKey(s.scheduledAt) === selectedDate);
  const toothLabels = (ids: readonly string[]) => ids.map((id) => teeth.find((t) => t.id === id)?.fdi).filter(Boolean).join(', ');
  const select = (key: string) => { setSelectedDate(key); setMonth(key.slice(0, 7)); };

  return <View style={styles.content}>
    <View style={styles.calendar}>
      <View style={styles.toolbar}>
        <Text style={styles.month}>{monthLabel(month)}</Text>
        <View style={styles.controls}>
          <Pressable accessibilityRole="button" accessibilityLabel="Mes anterior" onPress={() => select(`${shiftMonth(month, -1)}-01`)} style={styles.arrow}><Icon name="back" size={18} color={colors.primary} /></Pressable>
          <Pressable accessibilityRole="button" accessibilityLabel="Ir a hoy" onPress={() => select(today)} style={styles.todayButton}><Text style={styles.todayLabel}>Hoy</Text></Pressable>
          <Pressable accessibilityRole="button" accessibilityLabel="Mes siguiente" onPress={() => select(`${shiftMonth(month, 1)}-01`)} style={styles.arrow}><Icon name="chevron" size={18} color={colors.primary} /></Pressable>
        </View>
      </View>
      <View style={styles.grid}>{weekdays.map((label, index) => <View key={weekdayNames[index]} style={styles.weekday}><Text accessibilityLabel={weekdayNames[index]} style={styles.weekdayLabel}>{label}</Text></View>)}</View>
      <View style={styles.grid}>{days.map((day) => {
        const selected = day.key === selectedDate;
        return <Pressable key={day.key} accessibilityRole="button" accessibilityLabel={`${new Date(`${day.key}T12:00:00`).toLocaleDateString('es-CL',{weekday:'long',day:'numeric',month:'long',year:'numeric'})}${appointmentDates.has(day.key) ? ', con citas' : ''}${sessionDates.has(day.key) ? ', con atenciones realizadas' : ''}`} accessibilityState={{ selected }} onPress={() => select(day.key)} style={styles.dayCell}>
          <View style={[styles.dayCircle, day.key === today && styles.dayToday, selected && styles.daySelected]}><Text style={[styles.dayNumber, !day.inMonth && styles.dayOutside, selected && styles.daySelectedLabel]}>{day.day}</Text></View>
          <View style={styles.dots}>{appointmentDates.has(day.key) ? <View style={styles.appointmentDot} /> : null}{sessionDates.has(day.key) ? <View style={styles.sessionDot} /> : null}</View>
        </Pressable>;
      })}</View>
      <View style={styles.legend}><View style={styles.appointmentDot} /><Text style={styles.legendText}>Cita</Text><View style={styles.sessionDot} /><Text style={styles.legendText}>Atención realizada</Text></View>
    </View>
    <Text style={styles.sectionTitle}>{new Date(`${selectedDate}T12:00:00`).toLocaleDateString('es-CL', { weekday: 'long', day: 'numeric', month: 'long' })}</Text>
    {appointmentsError ? <View style={styles.card}><Text accessibilityRole="alert" style={styles.error}>No fue posible consultar tus citas.</Text></View>
      : appointments === null ? <Text style={styles.body}>Consultando citas…</Text>
        : selectedAppointments.length === 0 ? <View style={styles.card}><Text style={styles.cardTitle}>Sin citas para este día</Text></View>
          : selectedAppointments.map((appointment) => <Pressable key={appointment.id} accessibilityRole="button" accessibilityLabel={`Ver cita a las ${time(appointment.scheduledAt)}`} onPress={() => setDetail(appointment)} style={styles.card}>
            <View style={styles.cardTop}><Text style={styles.time}>{time(appointment.scheduledAt)}</Text><Text style={styles.status}>{statusLabels[appointment.status]}</Text><Icon name="chevron" color={colors.primary} size={18} /></View>
            <Text style={styles.cardTitle}>{appointment.locationLabel ?? 'Cita odontológica'}</Text>
            <Text numberOfLines={2} style={styles.body}>{appointment.notes ?? 'Sin notas registradas.'}</Text>
            {appointment.toothIds.length > 0 ? <Text style={styles.teeth}>Piezas FDI: {toothLabels(appointment.toothIds)}</Text> : null}
          </Pressable>)}
    {sessionsError ? <Text accessibilityRole="alert" style={styles.error}>No fue posible consultar las atenciones realizadas.</Text>
      : selectedSessions.length > 0 ? <View style={styles.card}><Text style={styles.cardTitle}>Atenciones realizadas</Text>{selectedSessions.map((session) => <Text key={session.id} style={styles.body}>{time(session.scheduledAt)} · Sesión registrada</Text>)}</View> : null}
    <Modal accessibilityLabel="Detalle de cita" visible={detail !== null} animationType="none" transparent onRequestClose={() => setDetail(null)}>
      <View style={styles.modalBackdrop}><ScrollView accessibilityViewIsModal style={styles.sheet} contentContainerStyle={[styles.sheetContent, { paddingBottom: Math.max(24, insets.bottom + 20) }]}>
        <View style={styles.sheetTop}><Text style={styles.sheetTitle}>Detalle de cita</Text><Pressable accessibilityRole="button" accessibilityLabel="Cerrar detalle de cita" onPress={() => setDetail(null)} style={styles.close}><Text style={styles.todayLabel}>Cerrar</Text></Pressable></View>
        {detail ? <><Text style={styles.time}>{new Date(detail.scheduledAt).toLocaleDateString('es-CL', { day: 'numeric', month: 'long', year: 'numeric' })} · {time(detail.scheduledAt)}</Text><Text style={styles.status}>{statusLabels[detail.status]}</Text>
          <Text style={styles.fieldLabel}>Clínica o lugar</Text><Text style={styles.body}>{detail.locationLabel ?? 'Sin registrar'}</Text>
          <Text style={styles.fieldLabel}>Piezas vinculadas (FDI)</Text><Text style={styles.body}>{toothLabels(detail.toothIds) || 'Sin piezas vinculadas'}</Text>
          <Text style={styles.fieldLabel}>Duración</Text><Text style={styles.body}>{detail.durationMinutes === null ? 'Sin registrar' : `${detail.durationMinutes} minutos`}</Text>
          <Text style={styles.fieldLabel}>Notas de la cita</Text><Text style={styles.body}>{detail.notes ?? 'Sin notas registradas'}</Text>
        </> : null}
      </ScrollView></View>
    </Modal>
  </View>;
}

const styles = StyleSheet.create({
  content: { gap: 16 }, calendar: { paddingVertical: 4 },
  toolbar: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8, marginBottom: 8 },
  month: { ...typography.sectionTitle }, controls: { alignItems: 'center', flexDirection: 'row' },
  arrow: { minHeight: 48, minWidth: 48, alignItems: 'center', justifyContent: 'center' }, todayButton: { paddingHorizontal: 12, minHeight: 48, justifyContent: 'center' }, todayLabel: { color: colors.primaryDark, fontSize: 14, fontWeight: '500' },
  grid: { flexDirection: 'row', flexWrap: 'wrap' }, weekday: { width: '14.285714%', alignItems: 'center', paddingVertical: 8 }, weekdayLabel: { ...typography.caption },
  dayCell: { width: '14.285714%', minHeight: 44, alignItems: 'center', justifyContent: 'center', paddingVertical: 1 },
  dayCircle: { minWidth: 34, minHeight: 34, borderRadius: 8, paddingHorizontal: 4, alignItems: 'center', justifyContent: 'center' },
  dayToday: { backgroundColor: colors.accent }, daySelected: { backgroundColor: colors.primary },
  dayNumber: { color: colors.ink, fontSize: 15, fontWeight: '500' }, dayOutside: { color: colors.muted }, daySelectedLabel: { color: colors.surface, fontWeight: '600' },
  dots: { flexDirection: 'row', gap: 4, height: 8, alignItems: 'center' }, appointmentDot: { width: 5, height: 5, borderRadius: 3, backgroundColor: colors.primary }, sessionDot: { width: 5, height: 5, borderRadius: 0, backgroundColor: colors.healthy },
  legend: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, alignItems: 'center', justifyContent: 'center', paddingTop: 8 }, legendText: { ...typography.caption, marginRight: 8 },
  sectionTitle: { ...typography.sectionTitle }, card: { paddingVertical: 16, gap: 8, borderTopWidth: 1, borderTopColor: colors.border, minHeight: 64 },
  cardTop: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 8, justifyContent: 'space-between' },
  time: { color: colors.primaryDark, fontSize: 16, fontWeight: '600', fontVariant: ['tabular-nums'] }, status: { ...typography.caption },
  cardTitle: { ...typography.label }, body: { ...typography.body }, teeth: { ...typography.caption, color: colors.primaryDark }, error: { ...typography.body, color: colors.urgent },
  modalBackdrop: { flex: 1, backgroundColor: colors.scrim, justifyContent: 'flex-end' },
  sheet: { alignSelf: 'center', width: '100%', maxWidth: 720, flexGrow: 0, maxHeight: '85%', backgroundColor: colors.background, borderTopLeftRadius: 20, borderTopRightRadius: 20 },
  sheetContent: { padding: 20, paddingBottom: 40 }, sheetTop: { flexDirection: 'row', gap: 12, justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
  sheetTitle: { ...typography.taskTitle, flex: 1, minWidth: 0 }, close: { paddingHorizontal: 12, minHeight: 48, justifyContent: 'center' }, fieldLabel: { ...typography.label, marginTop: 24, marginBottom: 8 },
});
