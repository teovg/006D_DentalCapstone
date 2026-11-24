import { useEffect, useState, type ReactNode } from 'react';
import { View } from 'react-native';
import { Text } from 'panelui-native/primitives/text';
import { Item } from 'panelui-native/components/item';
import { Progress } from 'panelui-native/components/progress';
import { Button, Page, PIcon } from './components';
import { longDate, shortDate, time, usePreview } from './context';
import { budgetTotal, paidTotal, clp } from './model';
import { guideSummary, guideWhen } from './homeGuideModel';

export const guideColors = { background: '#f6f4ef', ink: '#173c45', muted: '#52696e', rule: '#cbd7d5', primary: '#176c82' };

function Copy({ children, small = false, muted = false }: { children: ReactNode; small?: boolean; muted?: boolean }) {
  return <Text style={{color: muted ? guideColors.muted : guideColors.ink, fontSize: small ? 13 : 15, lineHeight: small ? 19 : 22}}>{children}</Text>;
}
function Heading({ children }: { children: ReactNode }) {
  return <Text style={{color: guideColors.ink,fontSize:19,lineHeight:25,fontWeight:'600'}}>{children}</Text>;
}
function GuideRow({title,description,onPress}: {title:string;description?:string;onPress:()=>void}) {
  return <Item onPress={onPress} accessibilityLabel={[title,description].filter(Boolean).join('. ')} className="min-h-12 py-2 px-0 rounded-none">
    <Item.Content><Item.Title style={{color:guideColors.ink}}>{title}</Item.Title>
      {description ? <Item.Description style={{color:guideColors.muted}}>{description}</Item.Description> : null}
    </Item.Content><PIcon name="chevron" size={17}/>
  </Item>;
}
export function HomeGuide() {
  const {patient,open,go} = usePreview();
  const [now,setNow] = useState(Date.now);
  useEffect(()=>{const id=setInterval(()=>setNow(Date.now()),30000);return ()=>clearInterval(id);},[]);
  const {next,latest,care,timed,invalid,budgets}=guideSummary(patient,now);
  const firstBudget=budgets[0];
  return <View style={{flex:1,backgroundColor:guideColors.background}}><Page compact>
    <View style={{gap:5,marginBottom:10}}>
      <Text style={{color:guideColors.ink,fontSize:30,lineHeight:37,fontWeight:'600',letterSpacing:-0.7}}>Hola, {patient.name}.</Text>
      <Copy small muted>{longDate(new Date(now))}</Copy>
    </View>
    <View style={{gap:12}}>
      <Heading>Tu próxima visita</Heading>
      {next ? <>
        <Item onPress={()=>open({kind:'appointment',id:next.id})} accessibilityLabel={`Ver mi cita: ${next.title}, ${shortDate(next.at)}, ${time(next.at)}`} className="py-3 px-0 rounded-none min-h-12" style={{borderBottomWidth:1,borderColor:guideColors.rule}}>
        <Item.Content><View style={{flexDirection:'row',gap:18}}>
          <View style={{width:112,gap:5}}><Copy small muted>{guideWhen(next.at,now)} · {shortDate(next.at)}</Copy>
            <Text style={{fontSize:32,lineHeight:38,fontWeight:'600',color:guideColors.ink,fontVariant:['tabular-nums']}}>{time(next.at)}</Text>
          </View>
          <View style={{flex:1,gap:5,paddingTop:2}}><Text style={{color:guideColors.ink,fontSize:16,lineHeight:23,fontWeight:'600'}}>{next.title}</Text>
            {next.place ? <Copy small muted>{next.place}</Copy> : null}
          </View>
        </View></Item.Content><PIcon name="chevron" size={16}/>
        </Item>
      </> : <View style={{gap:6}}><Copy muted>No tienes una visita programada.</Copy>
        <Button variant="ghost" className="self-start" onPress={()=>open({kind:'appointment'})}>Añadir cita</Button></View>}
    </View>
    <View style={{gap:8,marginTop:8}}>
      <Heading>Cuidados y recordatorios</Heading>
      {!timed.length && !care.length && !invalid.length ? <>
        <Copy muted>No tienes recordatorios activos.</Copy>
        <Button variant="ghost" className="self-start px-0" onPress={()=>open({kind:'reminder'})}><PIcon name="plus" size={17}/><Text style={{color:guideColors.primary}}>Preparar un recordatorio</Text></Button>
      </> : <>
        {timed.slice(0,2).map(({reminder:r,at})=><GuideRow key={r.id} title={r.title}
          description={`${guideWhen(at,now)} · ${time(at)}${r.nativeStatus==='denied' ? ' · Permiso pendiente' : r.nativeStatus==='error' ? ' · Revisar aviso' : ''}`}
          onPress={()=>open({kind:'reminder',id:r.id})}/>)}
        {care.slice(0,2).map(r=><GuideRow key={r.id} title={r.title} description="Cuidado activo" onPress={()=>open({kind:'reminder',id:r.id})}/>)}
        {invalid.map(r=><GuideRow key={r.id} title={r.title} description="Revisa la fecha o la pauta del recordatorio" onPress={()=>open({kind:'reminder',id:r.id})}/>)}
        {timed.length>2 || care.length>2 ? <Button variant="ghost" className="self-start" onPress={()=>go('reminders')}>Ver todos los recordatorios</Button> : null}
      </>}
    </View>
    <View style={{gap:12,marginTop:8}}>
      {firstBudget ? <>
        <GuideRow title={firstBudget.title} onPress={()=>go('budget',firstBudget.id)}/>
        <Progress value={firstBudget.rows.filter(r=>r.done).length} maxValue={Math.max(1,firstBudget.rows.length)}
          label="Prestaciones realizadas" valueLabel={`${firstBudget.rows.filter(r=>r.done).length} de ${firstBudget.rows.length}`} showValueLabel/>
        <View style={{flexDirection:'row',gap:20}}>
          <View style={{flex:1,gap:5}}><Copy small muted>Saldo pendiente</Copy><Text style={{fontSize:23,lineHeight:30,color:guideColors.ink,fontWeight:'600'}}>{clp(budgetTotal(firstBudget)-paidTotal(firstBudget))}</Text></View>
          <View style={{flex:1,gap:5}}><Copy small muted>Pagado</Copy><Text style={{fontSize:23,lineHeight:30,color:guideColors.ink,fontWeight:'600'}}>{clp(paidTotal(firstBudget))}</Text></View>
        </View>
        {budgets.length>1 ? <Button variant="ghost" className="self-start" onPress={()=>go('treatments')}>Ver los {budgets.length} presupuestos</Button> : null}
      </> : <><Heading>Tu presupuesto</Heading><Copy muted>Aquí podrás seguir tus prestaciones y pagos.</Copy>
        <Button variant="outline" onPress={()=>go('capture')}>Añadir tu primer presupuesto</Button></>}
    </View>
    {latest ? <View style={{gap:8,marginTop:10,borderTopWidth:1,borderColor:guideColors.rule,paddingTop:12}}>
      <Heading>Última atención</Heading>
      <GuideRow title={latest.title} description={shortDate(latest.at)} onPress={()=>go('session',latest.id)}/>
      {latest.care ? <><Copy small muted>Indicaciones registradas</Copy><Copy>{latest.care}</Copy></> : null}
    </View> : null}
  </Page></View>;
}
