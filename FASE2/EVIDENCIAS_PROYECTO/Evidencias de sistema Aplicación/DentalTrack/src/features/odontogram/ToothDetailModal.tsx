import { IndicatedScrollView } from '../../ui/IndicatedScrollView';
import { useState } from 'react';
import { Text, TextInput, ActivityIndicator, KeyboardAvoidingView, Modal, Platform,  StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppPressable as Pressable } from '../../ui/AppPressable';

import type { PatientTooth, ToothDetail, ToothStatus } from '../../domain/teeth/types';
import type { DentalAppointment } from '../../domain/clinical/types';
import { colors, typography, uiStyles } from '../../ui/theme';
import { statusPresentation } from './toothPresentation';
import { ChoiceField } from '../../ui/ChoiceField';
import { sessionProgress } from './sessionProgress';
import { TermExplanationButton } from '../education/TermExplanationButton';

interface ToothDetailModalProps {
  tooth: PatientTooth | null;
  detail: ToothDetail | null;
  loading: boolean;
  error: string | null;
  onClose: () => void;
  onSave: (status: ToothStatus, summary: string) => Promise<void>;
  numbering: 'fdi' | 'universal';
  appointments?: readonly DentalAppointment[];
  appointmentsError?: boolean;
}

const editableStatuses: readonly ToothStatus[] = ['healthy', 'observation', 'in_treatment', 'urgent', 'missing'];

function EmptyState({ children }: { children: string }) {
  return <Text style={styles.empty}>{children}</Text>;
}

export function ToothDetailModal({ tooth, detail, loading, error, onClose, onSave, numbering, appointments = [], appointmentsError = false }: ToothDetailModalProps) {
  const [editing, setEditing] = useState(false);
  const [status, setStatus] = useState<ToothStatus>(tooth?.status ?? 'healthy');
  const [summary, setSummary] = useState(tooth?.summary ?? '');
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [confirmDiscard, setConfirmDiscard] = useState(false);
  const insets = useSafeAreaInsets();

  if (!tooth) return null;
  const presentation = statusPresentation[tooth.status];
  const close = () => {
    if (saving) return;
    if (editing && (status !== tooth.status || summary !== tooth.summary)) setConfirmDiscard(true);
    else onClose();
  };

  const save = async () => {
    if (!summary.trim()) {
      setSaveError('Agrega una descripción breve del estado registrado.');
      return;
    }
    setSaving(true);
    setSaveError(null);
    try {
      await onSave(status, summary.trim());
      setEditing(false);
    } catch {
      setSaveError('No fue posible guardar el cambio. Revisa tu conexión e inténtalo nuevamente.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal animationType="none" accessibilityLabel={`Detalle de pieza ${numbering === 'fdi' ? tooth.fdi : tooth.universal}`} transparent visible onRequestClose={close}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.backdrop}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Cerrar detalle"
          disabled={saving}
          onPress={close}
          style={StyleSheet.absoluteFill}
        />
        <View accessibilityViewIsModal style={styles.sheet}>
          <View style={styles.handle} />
          <View style={styles.headerRow}>
            <View style={styles.headerCopy}>
              <Text accessibilityRole="header" style={styles.title}>Pieza {numbering === 'fdi' ? tooth.fdi : `#${tooth.universal}`}</Text>
              <Text style={styles.subtitle}>{tooth.name}</Text>
            </View>
            <Pressable accessibilityRole="button" disabled={saving} onPress={close} style={styles.closeButton}>
              <Text style={styles.closeText}>Cerrar</Text>
            </Pressable>
          </View>
          {confirmDiscard ? <View style={styles.discard}><Text accessibilityRole="alert" style={styles.fieldValue}>Hay cambios sin guardar.</Text><Pressable accessibilityRole="button" onPress={() => setConfirmDiscard(false)} style={uiStyles.primaryButton}><Text style={uiStyles.primaryButtonText}>Seguir editando</Text></Pressable><Pressable accessibilityRole="button" onPress={onClose} style={uiStyles.secondaryButton}><Text style={uiStyles.secondaryButtonText}>Descartar y cerrar</Text></Pressable></View> : null}

          {loading ? (
            <ActivityIndicator accessibilityLabel="Cargando detalle de pieza" color={colors.primary} style={styles.loader} />
          ) : error ? (
            <Text accessibilityRole="alert" style={styles.error}>{error}</Text>
          ) : detail ? (
            <IndicatedScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={[styles.content, {paddingBottom: Math.max(24, insets.bottom + 20)}]}>
              <View style={styles.statusCard}>
                <View style={styles.statusHeading}>
                  <View style={styles.statusCopy}>
                    <Text style={styles.label}>Estado actual</Text>
                    <View style={styles.statusLabel}><View style={[styles.statusMarker, { backgroundColor: presentation.color }]} /><Text style={styles.statusTitle}>{presentation.label}</Text></View>
                  </View>
                  {!editing ? (
                    <Pressable accessibilityRole="button" onPress={() => { setStatus(detail.tooth.status); setSummary(detail.tooth.summary); setSaveError(null); setEditing(true); }} style={styles.editButton}>
                      <Text style={styles.editButtonText}>Editar</Text>
                    </Pressable>
                  ) : null}
                </View>
                {!editing ? <Text style={styles.body}>{detail.tooth.summary}</Text> : (
                  <View style={styles.editor}>
                    <Text style={styles.editorLabel}>Selecciona el estado</Text>
                    <ChoiceField label="Estado dental" value={status} disabled={saving} onChange={setStatus}
                      options={editableStatuses.map((value) => ({ id: value, label: statusPresentation[value].label, color: statusPresentation[value].color }))} />
                    <Text style={typography.caption}>Registra lo indicado por tu profesional. Un presupuesto o una cita no acreditan que el tratamiento haya comenzado.</Text>
                    <Text style={styles.editorLabel}>Descripción</Text>
                    <TextInput
                      accessibilityLabel="Descripción del estado de la pieza"
                      editable={!saving}
                      multiline
                      onChangeText={setSummary}
                      placeholder="Describe la información que deseas recordar"
                      placeholderTextColor={colors.muted}
                      style={styles.summaryInput}
                      value={summary}
                    />
                    {saveError ? <Text accessibilityRole="alert" style={styles.saveError}>{saveError}</Text> : null}
                    <View style={styles.editorActions}>
                      <Pressable accessibilityRole="button" accessibilityState={{ disabled: saving }} disabled={saving} onPress={() => { setEditing(false); setConfirmDiscard(false); }} style={styles.cancelButton}>
                        <Text style={styles.cancelButtonText}>Cancelar</Text>
                      </Pressable>
                      <Pressable accessibilityRole="button" accessibilityState={{ disabled: saving }} disabled={saving} onPress={save} style={[styles.saveButton, saving && styles.disabled]}>
                        <Text style={styles.saveButtonText}>{saving ? 'Guardando…' : 'Guardar cambio'}</Text>
                      </Pressable>
                    </View>
                  </View>
                )}
              </View>

              <View style={styles.grid}>
                <View style={styles.dataCard}>
                  <Text style={styles.label}>FDI / ISO 3950</Text>
                  <Text style={styles.dataValue}>{tooth.fdi}</Text>
                </View>
                <View style={styles.dataCard}>
                  <Text style={styles.label}>Universal / ADA</Text>
                  <Text style={styles.dataValue}>#{tooth.universal}</Text>
                </View>
              </View>

              <View style={styles.sectionCard}>
                {detail.budgetedProcedures?.length ? <View style={{ gap: 12 }}>
                    <Text style={styles.sectionTitle}>Prestaciones presupuestadas</Text>
                    {detail.budgetedProcedures.map((item, index) => <View key={index} style={{ gap: 4 }}>
                      <Text style={styles.fieldValue}>{item.description}</Text>
                      <Text style={styles.body}>{item.clinic} · ${item.amountClp.toLocaleString('es-CL')}</Text>
                      <TermExplanationButton term={item.description} label="Explicar esta prestación" disabled={editing} />
                    </View>)}
                  </View> : null}
                  <Text style={styles.sectionTitle}>Tratamiento vinculado</Text>
                {detail.currentTreatment ? (
                  <>
                    <View style={styles.treatmentHeading}>
                      <Text style={[styles.fieldValue, { flex: 1 }]}>{detail.currentTreatment.title}</Text>
                      <TermExplanationButton term={detail.currentTreatment.title} disabled={editing} />
                    </View>
                    <Text style={styles.body}>
                      {sessionProgress(detail.currentTreatment.completedSessions, detail.currentTreatment.totalSessions)}
                    </Text>
                    <Text style={styles.fieldLabel}>Profesionales en sus sesiones</Text>
                    {detail.currentTreatment.professionalNames.length ? detail.currentTreatment.professionalNames.map((name) => (
                      <Text key={name} style={styles.body}>{name}</Text>
                    )) : <EmptyState>Sin profesionales registrados.</EmptyState>}
                    {editing ? <Text style={styles.body}>Guarda o cancela la edición antes de abrir una explicación.</Text> : null}
                  </>
                ) : (
                  <EmptyState>No hay tratamiento activo vinculado.</EmptyState>
                )}
              </View>

              <View style={styles.sectionCard}>
                <Text style={styles.sectionTitle}>Citas vinculadas</Text>
                {appointmentsError ? <Text accessibilityRole="alert" style={styles.body}>No se pudieron consultar las citas de esta pieza.</Text> : appointments.length ? appointments.map(appointment => <View key={appointment.id} style={styles.listItem}>
                  <Text style={styles.itemTitle}>{new Date(appointment.scheduledAt).toLocaleString('es-CL', {dateStyle:'medium',timeStyle:'short'})}</Text>
                  <Text style={styles.body}>{appointment.locationLabel || 'Cita odontológica'} · {appointment.notes || 'Sin notas'}</Text>
                </View>) : <EmptyState>No hay citas vinculadas.</EmptyState>}
              </View>
              <View style={styles.sectionCard}>
                <Text style={styles.sectionTitle}>Historial de intervenciones</Text>
                {detail.events.length ? detail.events.map((event) => (
                  <View key={event.id} style={styles.listItem}>
                    <Text style={styles.itemTitle}>{event.title}</Text>
                    <Text style={styles.body}>{new Date(`${event.date.slice(0,10)}T12:00:00`).toLocaleDateString('es-CL', {day:'numeric',month:'short',year:'numeric'})} · {event.details}</Text>
                    {event.professionalName ? <Text style={styles.body}>Profesional: {event.professionalName}</Text> : null}
                  </View>
                )) : <EmptyState>No hay intervenciones registradas.</EmptyState>}
              </View>

              <View style={styles.sectionCard}>
                <Text style={styles.sectionTitle}>Radiografías y documentos</Text>
                {detail.documents.length ? detail.documents.map((document) => (
                  <View key={document.id} style={styles.listItem}>
                    <Text style={styles.itemTitle}>{document.name}</Text>
                    <Text style={styles.body}>
                      {document.kind === 'xray' ? 'Radiografía' : 'Documento'} · {document.availability === 'available' ? 'Archivo disponible' : 'Archivo original no disponible'}
                    </Text>
                  </View>
                )) : <EmptyState>No hay archivos vinculados.</EmptyState>}
              </View>

              <View style={styles.sectionCard}>
                <Text style={styles.sectionTitle}>Notas e indicaciones</Text>
                {detail.notes.length ? detail.notes.map((note) => (
                  <View key={note.id} style={styles.listItem}>
                    <Text style={styles.itemTitle}>{note.title}</Text>
                    <Text style={styles.body}>{note.body}</Text>
                  </View>
                )) : <EmptyState>No hay notas ni indicaciones registradas.</EmptyState>}
              </View>

            </IndicatedScrollView>
          ) : null}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { backgroundColor: colors.scrim, flex: 1, justifyContent: 'flex-end' },
  discard: { margin: 20, gap: 12, padding: 16, backgroundColor: colors.warningSoft, borderRadius: 12 },
  sheet: { alignSelf: 'center', width: '100%', maxWidth: 720, backgroundColor: colors.background, borderTopLeftRadius: 20, borderTopRightRadius: 20, height: '86%', paddingTop: 8 },
  handle: { alignSelf: 'center', backgroundColor: colors.border, borderRadius: 3, height: 5, marginBottom: 16, width: 44 },
  headerRow: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 20, gap: 12 },
  headerCopy: { flex: 1, minWidth: 0 }, title: { ...typography.taskTitle }, subtitle: { ...typography.body, marginTop: 4 },
  closeButton: { minHeight: 48, paddingHorizontal: 12, justifyContent: 'center' }, closeText: { color: colors.primaryDark, fontSize: 14, fontWeight: '500' },
  loader: { margin: 48 }, error: { ...typography.body, color: colors.urgent, margin: 20 },
  content: { gap: 24, padding: 20, paddingBottom: 40 },
  statusCard: { paddingVertical: 16, borderBottomColor: colors.border, borderBottomWidth: 1 },
  statusHeading: { alignItems: 'flex-start', flexDirection: 'row', justifyContent: 'space-between', gap: 12 }, statusCopy: { flex: 1 },
  label: { ...typography.caption }, statusTitle: { color: colors.ink, fontSize: 20, fontWeight: '600', lineHeight: 28, flexShrink: 1 },
  statusLabel: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 8 }, statusMarker: { width: 8, height: 8, borderRadius: 4 },
  editButton: { ...uiStyles.secondaryButton, alignSelf: 'flex-start', marginTop: 8 }, editButtonText: { ...uiStyles.secondaryButtonText },
  editor: { marginTop: 20, gap: 8 }, editorLabel: { ...typography.label, marginTop: 8 },
  summaryInput: { ...uiStyles.input, minHeight: 112, textAlignVertical: 'top' }, saveError: { ...typography.body, color: colors.urgent },
  editorActions: { flexDirection: 'row', gap: 8, marginTop: 12 }, cancelButton: { ...uiStyles.secondaryButton, flex: 1 }, cancelButtonText: { ...uiStyles.secondaryButtonText },
  saveButton: { ...uiStyles.primaryButton, flex: 1 }, saveButtonText: { ...uiStyles.primaryButtonText }, disabled: { opacity: 0.55 },
  body: { ...typography.body, marginTop: 4 }, grid: { flexDirection: 'row', gap: 24 }, dataCard: { flex: 1, paddingVertical: 8 },
  dataValue: { color: colors.ink, fontSize: 26, fontWeight: '500', marginTop: 8, fontVariant: ['tabular-nums'] },
  sectionCard: { borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 24 }, sectionTitle: { ...typography.sectionTitle, marginBottom: 8 },
  fieldLabel: { ...typography.caption, marginTop: 12 }, fieldValue: { ...typography.label, marginTop: 4 },
  treatmentHeading: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  listItem: { marginTop: 12, paddingBottom: 12 }, itemTitle: { ...typography.label }, empty: { ...typography.body, marginTop: 8 },
});
