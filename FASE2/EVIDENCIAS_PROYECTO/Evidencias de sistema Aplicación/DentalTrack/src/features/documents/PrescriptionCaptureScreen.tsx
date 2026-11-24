import { useEffect, useRef, useState } from 'react';
import * as ImagePicker from 'expo-image-picker';
import { Text, TextInput, Platform, View } from 'react-native';
import { randomUUID } from 'expo-crypto';
import { AppPressable } from '../../ui/AppPressable';
import { DocumentPreview } from '../../ui/DocumentPreview';
import { FormPage } from '../../ui/FormPage';
import { SubscreenHeader } from '../../ui/SubscreenHeader';
import { colors, typography, uiStyles } from '../../ui/theme';
import { useDirtyDraft } from '../../ui/UnsavedChanges';
import { localOcrAvailable, recognizeBudget } from './budgetOcr';
import { confirmPrescription, proposePrescription, type ConfirmedPrescription, type PrescriptionMedicineDraft } from './prescriptionProposal';
import type { DocumentImage } from './pickDocumentImage';

export function PrescriptionCaptureScreen({ onBack, onConfirm, initialImage }: {
  onBack: () => void;
  onConfirm?: (record: ConfirmedPrescription) => void;
  initialImage?: DocumentImage;
}) {
  const [uri, setUri] = useState<string | null>(initialImage?.uri ?? null);
  const [text, setText] = useState<string | null>(null);
  const [rows, setRows] = useState<readonly PrescriptionMedicineDraft[]>([]);
  const [reviewed, setReviewed] = useState(false);
  const [selected, setSelected] = useState(0);
  const [summary, setSummary] = useState(false);
  const [extras, setExtras] = useState(false);
  const [reading, setReading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const request = useRef<AbortController | null>(null);
  useEffect(() => () => request.current?.abort(), []);
  useDirtyDraft(Boolean(uri || text || rows.length));

  const choose = async (camera: boolean) => {
    if (reading) return;
    setError(null);
    try {
      if (camera && Platform.OS !== 'web') {
        const permission = await ImagePicker.requestCameraPermissionsAsync();
        if (!permission.granted) throw new Error('Puedes elegir una imagen de la galería o permitir el uso de la cámara.');
      }
      const options: ImagePicker.ImagePickerOptions = { mediaTypes: ['images'], allowsEditing: false, quality: 1 };
      const result = camera ? await ImagePicker.launchCameraAsync(options) : await ImagePicker.launchImageLibraryAsync(options);
      if (!result.canceled) { setUri(result.assets[0]?.uri ?? null); setText(null); setRows([]); setSelected(0); setReviewed(false); }
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'No se pudo abrir la imagen.'); }
  };

  const read = async () => {
    if (!uri || request.current) return;
    const controller = new AbortController();
    request.current = controller;
    const timer = setTimeout(() => controller.abort(), 90_000);
    setReading(true); setError(null);
    try {
      const recognized = await recognizeBudget(uri, controller.signal);
      setText(recognized.text); setRows(proposePrescription(recognized.text)); setSelected(0); setSummary(false); setReviewed(false);
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'No se pudo leer la receta.'); }
    finally { clearTimeout(timer); request.current = null; setReading(false); }
  };

  const confirm = () => {
    try {
      confirmPrescription(rows);
      if (!reviewed) throw new Error('Compara cada medicamento y su pauta con la receta antes de confirmar.');
      onConfirm?.({ id: randomUUID(), createdAt: new Date().toISOString(), medicines: rows.map((row) => ({ ...row, name: row.name.trim(), dose: row.dose.trim() })) });
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'No se pudo confirmar.'); }
  };

  const change = (index: number, field: keyof PrescriptionMedicineDraft, value: string) => {
    setRows(current => current.map((item, position) => position === index ? {...item, [field]: value} : item));
    setReviewed(false);
  };
  const medicine = rows[selected];
  const input = (field: 'name' | 'dose' | 'everyHours' | 'days', label: string) => medicine ? <View style={{gap:4,flex:1}}>
    <Text style={typography.caption}>{label}</Text>
    <TextInput accessibilityLabel={`${label}, medicamento ${selected + 1}`} value={medicine[field]} multiline={field === 'name'}
      maxLength={field === 'name' ? 240 : field === 'dose' ? 100 : 3}
      keyboardType={field === 'everyHours' || field === 'days' ? 'number-pad' : 'default'}
      style={[uiStyles.input,{minHeight:field === 'name' ? 64 : 44,paddingVertical:8}]} onChangeText={value => change(selected,field,value)} />
  </View> : null;
  return <View style={{flex:1}}>
    <View style={{paddingHorizontal:16,paddingTop:8}}><SubscreenHeader title={summary ? 'Confirmar receta' : 'Revisar receta'} onBack={() => summary ? setSummary(false) : onBack()} /></View>
    {uri ? <DocumentPreview uri={uri} label="Receta original visible durante la revisión" style={{flex:1,minHeight:120,width:'100%'}} /> : null}
    <FormPage {...(uri ? {outerStyle:{flex:1.25,marginTop:-12,backgroundColor:colors.surface,borderTopLeftRadius:20,borderTopRightRadius:20}} : {})} contentContainerStyle={{padding:16,gap:8}}>
      {text === null ? <>
        <Text style={typography.body}>Elige la receta y comprueba los datos antes de confirmar.</Text>
        <View style={{flexDirection:'row',gap:12}}>
          <AppPressable accessibilityRole="button" disabled={reading} style={[uiStyles.secondaryButton,{flex:1}]} onPress={() => void choose(true)}><Text style={uiStyles.secondaryButtonText}>Tomar foto</Text></AppPressable>
          <AppPressable accessibilityRole="button" disabled={reading} style={[uiStyles.secondaryButton,{flex:1}]} onPress={() => void choose(false)}><Text style={uiStyles.secondaryButtonText}>Elegir receta</Text></AppPressable>
        </View>
        {uri && localOcrAvailable() ? <AppPressable accessibilityRole="button" disabled={reading} style={uiStyles.primaryButton} onPress={() => void read()}><Text style={uiStyles.primaryButtonText}>{reading ? 'Leyendo receta…' : 'Leer receta'}</Text></AppPressable> : null}
      </> : summary ? <>
        {rows.map((row,index) => <View key={index} style={{gap:4,paddingVertical:8,borderBottomWidth:1,borderBottomColor:colors.border}}>
          <Text style={typography.label}>{row.name}</Text><Text style={typography.body}>{row.dose} · cada {row.everyHours} horas · {row.days} días</Text>
        </View>)}
        <AppPressable accessibilityRole="checkbox" accessibilityLabel="Comparé los datos con la receta" accessibilityState={{checked:reviewed}} onPress={() => {setReviewed(value => !value);setError(null);}} style={uiStyles.secondaryButton}><Text style={uiStyles.secondaryButtonText}>{reviewed ? '✓ ' : ''}Comparé los datos con la receta</Text></AppPressable>
        <Text style={typography.caption}>Guardar conserva la transcripción. No programa avisos ni modifica la pauta.</Text>
      </> : <>
        <View style={{flexDirection:'row',gap:8,alignItems:'center'}}>
          <Text style={[typography.label,{flex:1}]}>Medicamento {rows.length ? selected + 1 : 0} de {rows.length}</Text>
          <AppPressable accessibilityRole="button" accessibilityLabel="Medicamento anterior" disabled={!selected} style={uiStyles.secondaryButton} onPress={() => setSelected(selected-1)}><Text>‹</Text></AppPressable>
          <AppPressable accessibilityRole="button" accessibilityLabel="Medicamento siguiente" disabled={selected>=rows.length-1} style={uiStyles.secondaryButton} onPress={() => setSelected(selected+1)}><Text>›</Text></AppPressable>
        </View>
        {medicine ? <View style={{gap:8}}>
          {input('name','Nombre y concentración')}
          {input('dose','Cantidad indicada por toma')}
          <View style={{flexDirection:'row',gap:12}}>{input('everyHours','Intervalo en horas')}{input('days','Duración en días')}</View>
        </View> : <Text style={typography.body}>No se reconoció una pauta completa. Añade un medicamento para transcribirla.</Text>}
        <AppPressable accessibilityRole="button" style={{minHeight:44,justifyContent:'center',alignItems:'center'}} onPress={() => setExtras(!extras)}><Text style={uiStyles.secondaryButtonText}>{extras ? 'Ocultar opciones' : 'Más opciones'}</Text></AppPressable>
        {extras ? <>
          {medicine ? <><Text selectable style={typography.caption}>En el documento · {medicine.sourceInstructions || 'Transcripción manual'}</Text>
          <AppPressable accessibilityRole="button" style={uiStyles.secondaryButton} onPress={() => {setRows(current => current.filter((_,index) => index!==selected));setSelected(0);setReviewed(false);}}><Text style={uiStyles.secondaryButtonText}>Quitar medicamento</Text></AppPressable></> : null}
          <AppPressable accessibilityRole="button" style={uiStyles.secondaryButton} onPress={() => {setSelected(rows.length);setRows(current => [...current,{name:'',dose:'',everyHours:'',days:'',sourceInstructions:''}]);setReviewed(false);}}><Text style={uiStyles.secondaryButtonText}>Añadir medicamento</Text></AppPressable>
        </> : null}
      </>}
      {error ? <Text accessibilityRole="alert" style={[typography.body,{color:colors.urgent}]}>{error}</Text> : null}
    </FormPage>
    {text !== null ? <View style={{paddingHorizontal:16,paddingVertical:12}}>
      {summary ? onConfirm ? <AppPressable accessibilityRole="button" style={uiStyles.primaryButton} onPress={confirm}><Text style={uiStyles.primaryButtonText}>Confirmar receta</Text></AppPressable> : <Text style={typography.caption}>El guardado de recetas en esta cuenta sigue pendiente.</Text>
        : <AppPressable accessibilityRole="button" style={uiStyles.primaryButton} onPress={() => {try {confirmPrescription(rows);setSummary(true);setError(null);} catch(cause) {setError(cause instanceof Error ? cause.message : 'Revisa los datos.');}}}><Text style={uiStyles.primaryButtonText}>Revisar resumen</Text></AppPressable>}
    </View> : null}
  </View>;
}
