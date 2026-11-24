import { TemporalInput } from '../../ui/TemporalInput';
import { useRef, useState } from 'react';
import { Text, TextInput, View } from 'react-native';
import { randomUUID } from 'expo-crypto';
import { findPermanentToothByFdi } from '../../domain/teeth/catalog';
import type { CreateAppointmentInput } from '../../domain/clinical/types';
import { AppPressable } from '../../ui/AppPressable';
import { FormPage } from '../../ui/FormPage';
import { SubscreenHeader } from '../../ui/SubscreenHeader';
import { colors, typography, uiStyles } from '../../ui/theme';
import { useDirtyDraft } from '../../ui/UnsavedChanges';

const fields = [
  { key: 'date', label: 'Fecha de la cita', placeholder: 'AAAA-MM-DD', max: 10 },
  { key: 'time', label: 'Hora de la cita', placeholder: 'HH:MM', max: 5 },
  { key: 'location', label: 'Clínica o lugar', placeholder: 'Dónde será la atención', max: 120 },
  { key: 'reason', label: 'Motivo de la cita', placeholder: 'Ej. Control', max: 180 },
  { key: 'teeth', label: 'Piezas FDI de la cita (opcional)', placeholder: 'Ej. 16, 26', max: 100 },
] as const;

export function AppointmentForm({ onSave, onBack, embedded = false }: {
  onSave: (input: CreateAppointmentInput) => Promise<void>;
  onBack: () => void;
  embedded?: boolean;
}) {
  const [values, setValues] = useState({ date: '', time: '', location: '', reason: '', teeth: '' });
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const requestId = useRef<string | null>(null);
  const inFlight = useRef(false);
  useDirtyDraft(!saved && Object.values(values).some(Boolean));

  const save = async () => {
    if (inFlight.current || saved) return;
    const scheduled = new Date(`${values.date}T${values.time}:00`);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(values.date) || !/^([01]\d|2[0-3]):[0-5]\d$/.test(values.time) ||
      !Number.isFinite(scheduled.getTime()) || scheduled.getTime() <= Date.now() ||
      scheduled.getDate() !== Number(values.date.slice(-2))) {
      setError('Escribe una fecha y una hora futuras válidas.'); return;
    }
    if (!values.location.trim() || !values.reason.trim()) { setError('Completa el lugar y el motivo de la cita.'); return; }
    const toothIds: string[] = [];
    for (const code of values.teeth.trim().split(/[\s,]+/).filter(Boolean)) {
      const tooth = findPermanentToothByFdi(code);
      if (!tooth) { setError(`Revisa la pieza FDI ${code}.`); return; }
      toothIds.push(tooth.id);
    }
    inFlight.current = true;
    setSaving(true); setError(null);
    try {
      requestId.current ??= randomUUID();
      await onSave({ id: requestId.current, scheduledAt: scheduled.toISOString(), location: values.location.trim(), reason: values.reason.trim(), toothIds: [...new Set(toothIds)] });
      setSaved(true);
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'No se pudo guardar la cita.'); }
    finally { inFlight.current = false; setSaving(false); }
  };

  const form = <View style={{ gap: 16 }}>
    {saved ? <>
      <Text accessibilityLiveRegion="polite" style={typography.label}>Cita guardada en tu agenda</Text>
      <AppPressable accessibilityRole="button" style={uiStyles.primaryButton} onPress={onBack}><Text style={uiStyles.primaryButtonText}>Ver agenda</Text></AppPressable>
    </> : <>
      <Text style={typography.body}>Completa los datos y confírmalos antes de guardar. Se usará la zona horaria de este dispositivo.</Text>
      {fields.map(({ key, label, placeholder, max }) => <View key={key} style={{ gap: 6 }}>
        <Text style={typography.label}>{label}</Text>
        {key === 'date' || key === 'time' ? <TemporalInput label={label} mode={key === 'date' ? 'date' : 'time'} value={values[key]} disabled={saving} onChangeText={(value) => setValues((current) => ({ ...current, [key]: value }))} /> : <TextInput accessibilityLabel={label} value={values[key]} placeholder={placeholder} placeholderTextColor={colors.muted}
          style={uiStyles.input} maxLength={max} editable={!saving} onChangeText={(value) => setValues((current) => ({ ...current, [key]: value }))} />}
      </View>)}
      {error ? <Text accessibilityRole="alert" style={[typography.body, { color: colors.urgent }]}>{error}</Text> : null}
      <AppPressable accessibilityRole="button" disabled={saving} style={uiStyles.primaryButton} onPress={() => void save()}>
        <Text style={uiStyles.primaryButtonText}>{saving ? 'Guardando…' : 'Confirmar y guardar cita'}</Text>
      </AppPressable>
    </>}
  </View>;
  if (embedded) return form;
  return <FormPage contentContainerStyle={uiStyles.page}><SubscreenHeader title="Nueva cita" onBack={onBack} />{form}</FormPage>;
}
