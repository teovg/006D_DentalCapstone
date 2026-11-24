import { useState } from 'react';
import { Modal, Text, View } from 'react-native';
import { AppPressable } from './AppPressable';
import { ChoiceField } from './ChoiceField';
import { colors, uiStyles, typography } from './theme';
import { calendarDays, shiftMonth, monthLabel } from '../features/history/calendar';
export interface TemporalInputProps { value: string; onChangeText: (value: string) => void; label: string; mode: 'date' | 'time' | 'datetime-local'; disabled?: boolean }
export function TemporalInput({ value, onChangeText, label, mode, disabled }: TemporalInputProps) {
  const [open, setOpen] = useState(false);
  const [month, setMonth] = useState(value.slice(0, 7) || new Date().toISOString().slice(0, 7));
  if (mode === 'datetime-local') return <View style={{ gap: 8 }}>
    <TemporalInput mode="date" label={`${label}, fecha`} value={value.slice(0, 10)} disabled={disabled ?? false} onChangeText={(date) => onChangeText(`${date}T${value.slice(11, 16) || '09:00'}`)} />
    <TemporalInput mode="time" label={`${label}, hora`} value={value.slice(11, 16)} disabled={disabled ?? false} onChangeText={(time) => onChangeText(`${value.slice(0, 10) || new Date().toLocaleDateString('sv-SE')}T${time}`)} />
  </View>;
  if (mode === 'time') return <View style={{ flexDirection: 'row', gap: 8 }}>
    <View style={{flex:1}}><ChoiceField disabled={disabled ?? false} label={`${label}, hora`} value={value.slice(0,2) || '09'} options={Array.from({length:24},(_,i)=>({id:String(i).padStart(2,'0'),label:String(i).padStart(2,'0')}))} onChange={(hour)=>onChangeText(`${hour}:${value.slice(3,5)||'00'}`)} /></View>
    <View style={{flex:1}}><ChoiceField disabled={disabled ?? false} label={`${label}, minutos`} value={value.slice(3,5)||'00'} options={Array.from({length:60},(_,i)=>({id:String(i).padStart(2,'0'),label:String(i).padStart(2,'0')}))} onChange={(minute)=>onChangeText(`${value.slice(0,2)||'09'}:${minute}`)} /></View>
  </View>;
  return <>
    <AppPressable accessibilityRole="button" accessibilityLabel={label} disabled={disabled ?? false} onPress={()=>setOpen(true)} style={uiStyles.input}><Text style={typography.label}>{value || 'Elegir fecha'}</Text></AppPressable>
    <Modal visible={open} transparent onRequestClose={()=>setOpen(false)}><View style={{flex:1,justifyContent:'center',padding:20,backgroundColor:colors.scrim}}><View style={{backgroundColor:colors.surface,padding:20,borderRadius:16,gap:12}}>
      <View style={{flexDirection:'row',justifyContent:'space-between'}}><AppPressable onPress={()=>setMonth(shiftMonth(month,-1))}><Text>Anterior</Text></AppPressable><Text>{monthLabel(month)}</Text><AppPressable onPress={()=>setMonth(shiftMonth(month,1))}><Text>Siguiente</Text></AppPressable></View>
      <View style={{flexDirection:'row'}}>{['L','M','M','J','V','S','D'].map((day,index)=><Text key={index} style={{width:'14.2857%',textAlign:'center',color:colors.muted}}>{day}</Text>)}</View>
      <View style={{flexDirection:'row',flexWrap:'wrap'}}>{calendarDays(month).map(day=><AppPressable key={day.key} accessibilityRole="button" accessibilityLabel={day.key} accessibilityState={{selected:day.key===value}} onPress={()=>{onChangeText(day.key);setOpen(false);}} style={{width:'14.2857%',minHeight:44,alignItems:'center',justifyContent:'center',backgroundColor:day.key===value?colors.accent:undefined}}><Text style={{color:day.inMonth?colors.ink:colors.muted}}>{day.day}</Text></AppPressable>)}</View>
      <AppPressable onPress={()=>setOpen(false)} style={uiStyles.secondaryButton}><Text>Cerrar</Text></AppPressable>
    </View></View></Modal>
  </>;
}
