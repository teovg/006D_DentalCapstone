import { useEffect, useRef, useState, type ReactNode } from 'react';
import * as ImagePicker from 'expo-image-picker';
import { ActivityIndicator, Platform, Text, TextInput, View, type TextInputProps, type StyleProp, type ViewStyle } from 'react-native';
import { AppPressable } from '../../ui/AppPressable';
import { FormPage } from '../../ui/FormPage';
import { SubscreenHeader } from '../../ui/SubscreenHeader';
import { DocumentPreview } from '../../ui/DocumentPreview';
import { ChoiceList } from '../../ui/ChoiceList';
import { useDirtyDraft } from '../../ui/UnsavedChanges';
import { colors, typography, uiStyles } from '../../ui/theme';
import { localOcrAvailable, recognizeBudget } from './budgetOcr';
import { confirmBudgetItems, proposeBudget, type BudgetRowDraft } from './budgetProposal';
import type { BudgetCaptureDraft, DentalNumberingSystem } from './types';
import type { DocumentImage } from './pickDocumentImage';
import { TermExplanationButton } from '../education/TermExplanationButton';

interface Props {
  onBack: () => void;
  onSaveDraft: (draft: BudgetCaptureDraft) => void;
  canConfirmLocally?: boolean;
  capture?: BudgetCaptureDraft;
  initialImage?: DocumentImage;
}
const emptyRow: BudgetRowDraft = { toothCode: '', description: '', amount: '' };
export function DocumentCaptureScreen({ onBack, onSaveDraft, canConfirmLocally = false, capture, initialImage }: Props) {
  const [step, setStep] = useState(0);
  const [numbering, setNumbering] = useState<DentalNumberingSystem | null>(capture?.numberingSystem ?? null);
  const [asset, setAsset] = useState<DocumentImage | null>(initialImage ?? (capture?.localUri ? { uri: capture.localUri, fileName: capture.fileName } : null));
  const [clinic, setClinic] = useState(capture?.clinicHint ?? '');
  const [text, setText] = useState<string | null>(capture?.review?.text ?? null);
  const [rows, setRows] = useState<readonly BudgetRowDraft[]>(capture?.review?.rows ?? []);
  const [index, setIndex] = useState(0);
  const [reading, setReading] = useState(false);
  const [showText, setShowText] = useState(false);
  const [extras, setExtras] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const request = useRef<AbortController | null>(null);
  useDirtyDraft(Boolean(asset || clinic || rows.length));
  useEffect(() => () => request.current?.abort(), []);
  const choose = async (camera: boolean) => {
    setError(null);
    try {
      if (camera && Platform.OS !== 'web') {
        const permission = await ImagePicker.requestCameraPermissionsAsync();
        if (!permission.granted) throw new Error('Permite usar la cámara o elige una foto.');
      }
      const options: ImagePicker.ImagePickerOptions = { mediaTypes: ['images'], allowsEditing: false, quality: 1 };
      const result = camera ? await ImagePicker.launchCameraAsync(options) : await ImagePicker.launchImageLibraryAsync(options);
      if (!result.canceled && result.assets[0]) { setAsset(result.assets[0]); setText(null); setRows([]); setIndex(0); }
    } catch { setError('No se pudo abrir la imagen. Inténtalo de nuevo.'); }
  };
  const read = async () => {
    if (!asset || !numbering) { setError('Selecciona una foto y su numeración.'); return; }
    setStep(1); setError(null);
    if (text !== null) return;
    if (!localOcrAvailable()) { setRows([{ ...emptyRow }]); return; }
    const controller = new AbortController(); request.current = controller; setReading(true);
    const timer = setTimeout(() => controller.abort(), 100_000);
    try {
      const result = await recognizeBudget(asset.uri, controller.signal);
      const proposal = proposeBudget(result);
      setText(result.text); setClinic((current) => current || proposal.clinic);
      setRows(proposal.rows.length ? proposal.rows : [{ ...emptyRow }]);
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'No se pudo leer la foto.'); }
    finally { clearTimeout(timer); request.current = null; setReading(false); }
  };
  const review = () => {
    try {
      confirmBudgetItems(rows, numbering ?? 'unknown');
      if (!clinic.trim()) throw new Error('Indica la clínica del presupuesto.');
      setError(null); setStep(2);
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : 'Revisa los datos.';
      const invalidRow = message.match(/Prestación (\d+)/);
      if (invalidRow) setIndex(Number(invalidRow[1]) - 1);
      setError(message);
    }
  };
  const save = () => {
    if (!asset || !numbering) return;
    try {
      const items = confirmBudgetItems(rows, numbering);
      onSaveDraft({ id: capture?.id ?? `budget-${Date.now()}`, localUri: asset.uri,
        fileName: asset.fileName ?? 'Presupuesto.jpg', numberingSystem: numbering, clinicHint: clinic.trim(),
        createdAt: capture?.createdAt ?? new Date().toISOString(), status: canConfirmLocally ? 'confirmed' : 'ready_for_ocr',
        ...(canConfirmLocally ? { items } : { review: { text: text ?? '', rows } }),
      });
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'No se pudo guardar.'); }
  };
  const row = rows[index];
  const update = (field: keyof BudgetRowDraft, value: string) => setRows((current) => current.map((item, position) => position === index ? { ...item, [field]: value } : item));
  return <View style={{ flex: 1 }}>
    <View style={{ paddingHorizontal: 20, paddingTop: 8 }}><SubscreenHeader title={['Añadir presupuesto', 'Revisar prestaciones', 'Confirmar presupuesto'][step]!}
      onBack={() => { if (!reading) { if (step) setStep(step - 1); else onBack(); } }} />
      <Text style={typography.caption}>Paso {step + 1} de 3 · {['Captura', 'Revisión', 'Confirmación'][step]}</Text></View>
    {step > 0 && asset ? <DocumentPreview uri={asset.uri} label="Presupuesto original visible durante la revisión" style={{ flex: 1, minHeight: 120, width: '100%' }} /> : null}
    <FormPage {...(step > 0 ? { outerStyle: { flex: 1.25, marginTop: -12, borderTopLeftRadius: 20, borderTopRightRadius: 20, backgroundColor: colors.surface, overflow: 'hidden' as const } } : {})} contentContainerStyle={{ padding: 16, gap: 8 }}>
      {step === 0 ? <>
        <Text style={typography.sectionTitle}>Tu presupuesto, en tu odontograma</Text>
        <View style={{ flexDirection: 'row', gap: 12 }}><CaptureAction style={{ flex: 1 }} onPress={() => void choose(true)}>Tomar foto</CaptureAction><CaptureAction variant="outline" style={{ flex: 1 }} onPress={() => void choose(false)}>Elegir foto</CaptureAction></View>
        {asset ? <DocumentPreview uri={asset.uri} label="Presupuesto seleccionado" style={{ height: 130, width: '100%' }} /> : null}
        <Text style={typography.label}>Numeración del documento</Text>
        <ChoiceList label="Numeración del presupuesto" value={numbering} onChange={setNumbering} options={[
          { id: 'fdi', label: 'FDI / ISO 3950', description: 'Piezas como 16, 26, 36' },
          { id: 'universal', label: 'Universal / ADA', description: 'Piezas como 3, 14, 19' },
          { id: 'unknown', label: 'No estoy seguro', description: 'Confírmala antes de vincular piezas' },
        ]} />
      </> : <>
        {reading ? <Text>Estamos leyendo tu presupuesto…</Text> : step === 1 ? <>
          <TextInput accessibilityLabel="Clínica" placeholder="Nombre de la clínica" value={clinic} maxLength={120} onChangeText={setClinic} style={[uiStyles.input, {minHeight:44,paddingVertical:8}]} />
          {row ? <View style={{ gap: 8 }}>
            <View style={{flexDirection:'row',alignItems:'center',gap:8}}>
              <Text style={[typography.label,{flex:1}]}>Prestación {index + 1} de {rows.length}</Text>
              <TermExplanationButton term={row.description} />
              <CaptureAction variant="ghost" accessibilityLabel="Prestación anterior" disabled={!index} onPress={() => setIndex(index - 1)}>‹</CaptureAction>
              <CaptureAction variant="outline" accessibilityLabel="Prestación siguiente" disabled={index >= rows.length - 1} onPress={() => setIndex(index + 1)}>›</CaptureAction>
            </View>
            <TextInput accessibilityLabel="Prestación" value={row.description} onChangeText={(value) => update('description', value)} multiline maxLength={180} style={[uiStyles.input, {minHeight:56,paddingVertical:8}]} />
            <View style={{flexDirection:'row',gap:12}}>
              <View style={{flex:1}}><LabeledInput label="Pieza" value={row.toothCode} onChangeText={(value) => update('toothCode', value)} maxLength={2} keyboardType="number-pad" /></View>
              <View style={{flex:2}}><LabeledInput label="Valor final en pesos" keyboardType="number-pad" value={row.amount} onChangeText={(value) => update('amount', value)} maxLength={9} /></View>
            </View>
            <Text style={typography.caption}>Pieza vacía = toda la dentición.</Text>
          </View> : null}
          {error && !rows.length ? <CaptureAction onPress={() => void read()}>Reintentar lectura</CaptureAction> : null}
          <CaptureAction variant="ghost" onPress={() => setExtras(!extras)}>{extras ? 'Ocultar opciones' : 'Más opciones'}</CaptureAction>
          {extras ? <>
            {row ? <CaptureAction variant="ghost" accessibilityLabel="Quitar prestación" onPress={() => { setRows(rows.filter((_, position) => position !== index)); setIndex(Math.max(0, index - 1)); }}>Quitar prestación</CaptureAction> : null}
            <CaptureAction variant="ghost" onPress={() => { setRows([...rows, { ...emptyRow }]); setIndex(rows.length); }}>Añadir prestación</CaptureAction>
            <CaptureAction variant="ghost" onPress={() => setShowText(!showText)}>{showText ? 'Ocultar texto reconocido' : 'Ver texto reconocido'}</CaptureAction>
            {showText ? <Text selectable>{text}</Text> : null}
          </> : null}
        </> : <>
          <Text style={typography.sectionTitle}>{clinic}</Text>
          <Text style={typography.body}>Revisa el resumen. Las piezas se vincularán con las prestaciones de este presupuesto.</Text>
          {rows.map((item, position) => <View key={position} style={{ gap: 4, paddingVertical: 8 }}><Text style={typography.label}>{item.toothCode ? `Pieza ${item.toothCode} · ` : ''}{item.description}</Text><Text>${Number(item.amount).toLocaleString('es-CL')}</Text></View>)}
          <Text style={typography.sectionTitle}>Total ${rows.reduce((sum, item) => sum + Number(item.amount), 0).toLocaleString('es-CL')}</Text>
        </>}
      </>}
      {error ? <Text accessibilityRole="alert" style={{ color: colors.urgent }}>{error}</Text> : null}
    </FormPage>
    <View style={{ paddingHorizontal: 20, paddingVertical: 12 }}><CaptureAction disabled={reading} loading={reading} onPress={() => { if (step === 0) void read(); else if (step === 1) review(); else save(); }}>{['Leer presupuesto', 'Revisar resumen', canConfirmLocally ? 'Confirmar y vincular piezas' : 'Guardar borrador'][step]}</CaptureAction></View>
  </View>;
}


function LabeledInput({ label, style, ...props }: TextInputProps & { label: string }) {
  return <View style={{ gap: 6 }}>
    <Text style={typography.caption}>{label}</Text>
    <TextInput {...props} accessibilityLabel={props.accessibilityLabel ?? label}
      placeholderTextColor={colors.muted} style={[uiStyles.input, {minHeight:44,paddingVertical:8}, style]} />
  </View>;
}

function CaptureAction({ children, onPress, variant = 'primary', disabled = false, loading = false, style, accessibilityLabel }: {
  children: ReactNode;
  onPress: () => void;
  variant?: 'primary' | 'outline' | 'ghost';
  disabled?: boolean;
  loading?: boolean;
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
}) {
  return <AppPressable accessibilityRole="button" disabled={disabled || loading}
    accessibilityState={{ busy: loading }} {...(accessibilityLabel ? { accessibilityLabel } : {})}
    onPress={onPress} style={[
      variant === 'primary' ? uiStyles.primaryButton : variant === 'outline' ? uiStyles.secondaryButton : { minHeight: 48, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 8 },
      { flexDirection: 'row', gap: 8 }, style,
    ]}>
    {loading ? <ActivityIndicator color={variant === 'primary' ? colors.surface : colors.primary} /> : null}
    <Text style={variant === 'primary' ? uiStyles.primaryButtonText : uiStyles.secondaryButtonText}>{children}</Text>
  </AppPressable>;
}
