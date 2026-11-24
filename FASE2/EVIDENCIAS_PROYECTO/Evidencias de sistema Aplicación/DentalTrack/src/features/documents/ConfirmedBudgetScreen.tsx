import { Text, View } from 'react-native';
import { DocumentPreview } from '../../ui/DocumentPreview';
import { FormPage } from '../../ui/FormPage';
import { SubscreenHeader } from '../../ui/SubscreenHeader';
import { typography, uiStyles } from '../../ui/theme';
import type { BudgetCaptureDraft } from './types';
import { TermExplanationButton } from '../education/TermExplanationButton';

const clp = new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP' });

export function ConfirmedBudgetScreen({ budget, onBack }: { budget: BudgetCaptureDraft; onBack: () => void }) {
  return <FormPage contentContainerStyle={uiStyles.page}>
    <SubscreenHeader title="Presupuesto confirmado" subtitle={budget.clinicHint} onBack={onBack} />
    {budget.items?.map((item, index) => <View key={index}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <Text style={[typography.label, { flex: 1 }]}>{item.description}</Text>
        <TermExplanationButton term={item.description} />
      </View>
      <Text style={typography.body}>{item.toothCode ? `Pieza ${item.toothCode}` : 'Toda la dentición'} · {clp.format(item.amountClp)}</Text>
      {item.sourceToothCode ? <Text style={typography.caption}>Referencia original · {item.sourceToothCode}</Text> : null}
      {item.baseAmountClp !== undefined ? <Text style={typography.caption}>Base {clp.format(item.baseAmountClp)} · Convenio {item.agreementAmountClp === undefined ? 'sin registrar' : clp.format(item.agreementAmountClp)}</Text> : null}
    </View>)}
    {budget.localUri
      ? <DocumentPreview label="Imagen del presupuesto" uri={budget.localUri} style={{ height: 230, width: '100%' }} />
      : <Text style={typography.body}>La imagen original ya no está disponible en esta sesión.</Text>}
    <Text style={typography.caption}>Datos guardados en esta instalación de prueba. Un presupuesto confirmado no acredita que se haya realizado una atención.</Text>
  </FormPage>;
}
