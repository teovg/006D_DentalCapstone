import { IndicatedScrollView } from '../../ui/IndicatedScrollView';
import { useRef, useState } from 'react';
import { Text,  StyleSheet, View } from 'react-native';
import { AppPressable as Pressable } from '../../ui/AppPressable';
import type { DentalRepository } from '../../core/data/DentalRepository';
import type { PatientTooth, ToothDetail } from '../../domain/teeth/types';
import type { DentalAppointment } from '../../domain/clinical/types';
import { colors, radii, typography, uiStyles } from '../../ui/theme';
import { Icon } from '../../ui/Icon';
import { DentalArchChart } from './DentalArchChart';
import { ToothDetailModal } from './ToothDetailModal';
import { statusPresentation } from './toothPresentation';

interface OdontogramScreenProps {
  teeth: readonly PatientTooth[];
  repository: DentalRepository;
  onToothUpdated: (tooth: PatientTooth) => void;
}

export function OdontogramScreen({ teeth, repository, onToothUpdated }: OdontogramScreenProps) {
  const [numbering, setNumbering] = useState<'fdi' | 'universal'>('fdi');
  const [selectedTooth, setSelectedTooth] = useState<PatientTooth | null>(null);
  const [detail, setDetail] = useState<ToothDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [showList, setShowList] = useState(false);
  const [appointments, setAppointments] = useState<readonly DentalAppointment[]>([]);
  const [appointmentsError, setAppointmentsError] = useState(false);
  const requestId = useRef(0);

  const selectTooth = async (tooth: PatientTooth) => {
    const request = ++requestId.current;
    setSelectedTooth(tooth);
    setDetail(null);
    setDetailError(null);
    setDetailLoading(true);
    setAppointments([]);
    setAppointmentsError(false);
    try {
      const [result, agenda] = await Promise.allSettled([repository.getToothDetail(tooth.id), repository.listAppointments()]);
      if (request === requestId.current) {
        if (result.status === 'rejected') throw result.reason;
        setDetail(result.value);
        if (agenda.status === 'fulfilled') setAppointments(agenda.value.filter(item => item.toothIds.includes(tooth.id) && item.status !== 'cancelled'));
        else setAppointmentsError(true);
      }
    } catch {
      if (request === requestId.current) setDetailError('No fue posible cargar el detalle de esta pieza.');
    } finally {
      if (request === requestId.current) setDetailLoading(false);
    }
  };

  const updateTooth = async (status: PatientTooth['status'], summary: string) => {
    if (!selectedTooth) return;
    const updated = await repository.updateTooth(selectedTooth.id, { status, summary });
    setSelectedTooth(updated);
    setDetail((current) => current ? { ...current, tooth: updated } : current);
    onToothUpdated(updated);
  };

  return <>
    <IndicatedScrollView accessibilityLabel="Odontograma personal" showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
      <View style={styles.controls}>
        <Text style={styles.dentition}>Dentición permanente</Text>
        <View accessibilityLabel="Sistema de numeración dental" style={styles.segment}>
          {(['fdi','universal'] as const).map((value) => <Pressable key={value} accessibilityRole="button" accessibilityState={{selected:numbering===value}} aria-pressed={numbering===value} onPress={() => setNumbering(value)} style={[styles.segmentButton,numbering===value && styles.segmentSelected]}><Text style={[styles.segmentText,numbering===value && styles.segmentTextSelected]}>{value==='fdi'?'FDI':'Universal'}</Text></Pressable>)}
        </View>
      </View>
      <View accessibilityLabel="Leyenda de estados dentales" style={styles.legend}>
        {Object.entries(statusPresentation).map(([key,item]) => <View key={key} style={styles.legendItem}><View style={[styles.dot,{backgroundColor:item.color}]} /><Text style={styles.legendText}>{item.label}</Text></View>)}
        <View style={styles.legendItem}><View style={[styles.dot, { backgroundColor: "#7854B8" }]} /><Text style={styles.legendText}>Presupuestada</Text></View>
      </View>
      <View style={styles.chart}>
        <DentalArchChart teeth={teeth} numbering={numbering} onSelect={selectTooth} {...(selectedTooth ? {selectedId:selectedTooth.id}: {})} />
      </View>
      <View style={styles.hint}><Icon name="info" size={16} color={colors.muted} /><Text style={styles.hintText}>Toca una pieza para ver su historia y tratamiento.</Text></View>
      <Text style={styles.orientation}>Vista del paciente · {numbering==='fdi'?'FDI / ISO 3950':'Universal / ADA'}</Text>
      <Pressable accessibilityRole="button" accessibilityState={{expanded:showList}} onPress={() => setShowList((value) => !value)} style={styles.listToggle}><Text style={styles.listToggleText}>{showList?'Ocultar lista de piezas':'Ver piezas en lista'}</Text></Pressable>
      {showList ? <View>{teeth.map((tooth) => <Pressable key={tooth.id} accessibilityRole="button" onPress={() => selectTooth(tooth)} style={({pressed}) => [styles.listRow,pressed && {opacity:0.6}]}><Text style={styles.listNumber}>{numbering==='fdi'?tooth.fdi:tooth.universal}</Text><View style={styles.listCopy}><Text style={styles.listName}>{tooth.name}</Text><Text style={styles.listStatus}>{statusPresentation[tooth.status].label}</Text></View><Icon name="chevron" size={18} color={colors.muted} /></Pressable>)}</View>:null}
    </IndicatedScrollView>
    <ToothDetailModal appointments={appointments} appointmentsError={appointmentsError} numbering={numbering} detail={detail} error={detailError} key={selectedTooth?.id ?? 'closed'} loading={detailLoading} onClose={() => { requestId.current++; setSelectedTooth(null); }} onSave={updateTooth} tooth={selectedTooth} />
  </>;
}

const styles = StyleSheet.create({
  content: { ...uiStyles.page, paddingTop: 8, gap: 0 },
  controls: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', marginBottom: 8 },
  dentition: { ...typography.body, color: colors.ink },
  segment: { flexDirection: 'row', backgroundColor: colors.surfaceMuted, borderRadius: radii.sm, padding: 4 },
  segmentButton: { minHeight: 48, paddingHorizontal: 14, alignItems: 'center', justifyContent: 'center', borderRadius: 6 },
  segmentSelected: { backgroundColor: colors.primary }, segmentText: { color: colors.muted, fontSize: 13, fontWeight: '500' }, segmentTextSelected: { color: colors.surface },
  legend: { flexDirection: 'row', flexWrap: 'wrap', columnGap: 12, rowGap: 4, marginBottom: 12 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 }, dot: { height: 8, width: 8, borderRadius: 4 }, legendText: { ...typography.caption },
  chart: { backgroundColor: colors.surface, borderRadius: radii.lg, paddingHorizontal: 4, paddingVertical: 4, width: '100%', maxWidth: 328, alignSelf: 'center' },
  hint: { flexDirection: 'row', gap: 8, justifyContent: 'center', alignItems: 'center', marginTop: 20 },
  hintText: { ...typography.body, flexShrink: 1 }, orientation: { ...typography.caption, textAlign: 'center', marginTop: 8 },
  listToggle: { minHeight: 48, justifyContent: 'center', alignItems: 'center', marginTop: 12 }, listToggleText: { color: colors.primaryDark, fontSize: 14, fontWeight: '500' },
  listRow: { ...uiStyles.row }, listNumber: { fontSize: 18, fontWeight: '500', color: colors.primary, width: 32 }, listCopy: { flex: 1 }, listName: { ...typography.label }, listStatus: { ...typography.caption, marginTop: 4 },
});
