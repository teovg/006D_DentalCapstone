import { Text, View } from 'react-native';
import { FormPage } from '../../ui/FormPage';
import { SubscreenHeader } from '../../ui/SubscreenHeader';
import { typography, uiStyles } from '../../ui/theme';
import type { ConfirmedPrescription } from './prescriptionProposal';

export function ConfirmedPrescriptionScreen({ prescription, onBack }: { prescription: ConfirmedPrescription; onBack: () => void }) {
  return <FormPage contentContainerStyle={uiStyles.page}>
    <SubscreenHeader title="Receta confirmada" onBack={onBack} />
    {prescription.medicines.map((medicine, index) => <View key={index} style={{ gap: 8 }}>
      <Text selectable style={typography.label}>{medicine.name}</Text>
      <Text style={typography.body}>{medicine.dose} · cada {medicine.everyHours} horas · durante {medicine.days} días</Text>
      <Text selectable style={typography.caption}>Transcripción original · {medicine.sourceInstructions || 'Ingresada manualmente'}</Text>
    </View>)}
    <Text style={typography.caption}>Datos transcritos y confirmados por el usuario. Este registro no programa avisos.</Text>
  </FormPage>;
}
