import { TemporalInput } from '../../ui/TemporalInput';
import { useRef, useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';
import { AppPressable as Pressable } from '../../ui/AppPressable';
import type { BudgetCaptureDraft } from '../documents/types';
import { Icon } from '../../ui/Icon';
import { SubscreenHeader } from '../../ui/SubscreenHeader';
import { colors, radii, typography, uiStyles } from '../../ui/theme';
import { workspaceDefinition, type WorkspaceRoute } from './screens';
import { ChoiceList } from '../../ui/ChoiceList';
import { FormPage } from '../../ui/FormPage';
import { useDirtyDraft } from '../../ui/UnsavedChanges';
import { fieldFormatError, fieldPresentation } from './fieldPresentation';
import { DocumentPreview } from '../../ui/DocumentPreview';
import { TermExplanationButton } from '../education/TermExplanationButton';

interface Props { route: WorkspaceRoute; onBack: () => void; onNavigate: (route: WorkspaceRoute) => void; capture?: BudgetCaptureDraft; context?: string }

export function WorkspaceScreen({ route, onBack, onNavigate, capture, context }: Props) {
  const definition = workspaceDefinition(route);
  const [fields, setFields] = useState<Record<string, string>>({});
  const [choice, setChoice] = useState<string | null>(null);
  const [reviewing, setReviewing] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const inputs = useRef<Record<string, TextInput | null>>({});
  useDirtyDraft(choice !== null || Object.values(fields).some((value) => value.length > 0));
  const initialValue = (label: string) => label === 'Clínica' ? capture?.clinicHint ?? '' : '';
  const fieldId = (label: string) => encodeURIComponent(label);
  const review = () => {
    const nextErrors: Record<string, string> = {};
    for (const field of definition.fields ?? []) {
      const error = fieldFormatError(field, fields[field.label] ?? initialValue(field.label));
      if (error) nextErrors[field.label] = error;
    }
    setErrors(nextErrors);
    const first = Object.keys(nextErrors)[0];
    if (first) { setReviewing(false); inputs.current[first]?.focus(); }
    else setReviewing(true);
  };
  return <FormPage contentContainerStyle={styles.page}>
    <SubscreenHeader onBack={onBack} title={definition.title} subtitle={definition.subtitle} />
    {context ? <View style={styles.context}><Text style={styles.contextTitle}>Registro seleccionado</Text><Text style={styles.body}>{context}</Text>{route === 'treatment-detail' ? <TermExplanationButton term={context} label="Qué significa" /> : null}</View> : null}
    {capture && (route === 'document-viewer' || route === 'budget-review') ? <View style={styles.imageCard}>{capture.clinicHint ? <Text style={styles.label}>{capture.clinicHint}</Text> : null}<DocumentPreview uri={capture.localUri} label="Captura original del presupuesto" style={styles.image} /><Text style={styles.caption}>{capture.fileName}</Text></View> : null}
    {definition.empty && !(capture && route === 'document-viewer') ? <View style={styles.empty}><Icon name={definition.tab === 'profile' ? 'user' : definition.tab === 'history' ? 'calendar' : 'documents'} size={30} color={colors.primary} /><Text style={styles.body}>{definition.empty}</Text></View> : null}
    {definition.paragraphs?.map((paragraph) => <Text key={paragraph} style={styles.body}>{paragraph}</Text>)}
    {definition.choices ? <ChoiceList label={`Opciones de ${definition.title}`} options={definition.choices.map((item) => ({ id: item, label: item }))} value={choice} onChange={(item) => { setChoice(item); setReviewing(false); }} /> : null}
    {definition.fields ? <View style={styles.form}>{definition.fields.map((field) => {
      const { hint, ...inputProps } = fieldPresentation(field);
      return <View key={field.label} style={styles.field}>
        <Text style={styles.label}>{field.label}</Text>
        {/fecha|AAAA-MM-DD|Fecha y hora/i.test(`${field.label} ${field.placeholder ?? ''}`) || field.label === 'Hora' || field.label === 'Horario preferido' ? <TemporalInput label={field.label} mode={/fecha y hora/i.test(field.placeholder ?? '') ? 'datetime-local' : field.label === 'Hora' || field.label === 'Horario preferido' ? 'time' : 'date'} value={fields[field.label] ?? ''} onChangeText={(value)=>{setFields((current)=>({...current,[field.label]:value}));setReviewing(false);}} /> : <TextInput
          ref={(input) => { inputs.current[field.label] = input; }}
          accessibilityLabel={field.label} accessibilityHint={hint}
          aria-invalid={Boolean(errors[field.label])}
          aria-describedby={errors[field.label] ? `error-${fieldId(field.label)}` : hint ? `hint-${fieldId(field.label)}` : undefined}
          {...inputProps}
          value={fields[field.label] ?? initialValue(field.label)}
          onChangeText={(value) => {
            setFields((current) => ({ ...current, [field.label]: value }));
            setErrors((current) => { const next = {...current}; delete next[field.label]; return next; });
            setReviewing(false);
          }}
          placeholder={field.placeholder ?? field.label} placeholderTextColor={colors.muted}
          multiline={field.multiline ?? false}
          style={[styles.input, field.multiline && styles.multiline, Boolean(errors[field.label]) && styles.invalid]}
        />}
        {hint ? <Text nativeID={`hint-${fieldId(field.label)}`} style={styles.caption}>{hint}</Text> : null}
        {errors[field.label] ? <Text accessibilityRole="alert" nativeID={`error-${fieldId(field.label)}`} style={styles.error}>{errors[field.label]}</Text> : null}
      </View>;
    })}</View> : null}
    {definition.fields || definition.choices ? <View style={styles.draftAction}><Text style={styles.caption}>Puedes revisar los datos; este formulario todavía no los guarda.</Text><Pressable accessibilityRole="button" onPress={review} style={styles.primary}><Text style={styles.primaryText}>Revisar borrador</Text></Pressable></View> : null}
    {reviewing ? <View accessibilityLiveRegion="polite" style={styles.review}><Text style={styles.label}>Borrador sin guardar</Text>{choice ? <Text style={styles.body}>{choice}</Text> : null}{definition.fields?.map((field) => <Text key={field.label} style={styles.body}>{field.label}: {(fields[field.label] ?? initialValue(field.label)) || 'Sin completar'}</Text>)}<Text style={styles.body}>No se ha enviado ni guardado información. Este borrador se descarta al salir de la pantalla.</Text></View> : null}
    {definition.links ? <View style={styles.links}>{definition.links.map((link) => <Pressable key={link.label} accessibilityRole="button" onPress={() => onNavigate(link.to)} style={styles.link}><View style={styles.linkCopy}><Text style={styles.linkTitle}>{link.label}</Text>{link.description ? <Text style={styles.caption}>{link.description}</Text> : null}</View><Icon name="chevron" color={colors.primary} size={18} /></Pressable>)}</View> : null}
  </FormPage>;
}

const styles = StyleSheet.create({
  page: { ...uiStyles.page }, body: { ...typography.body },
  context: { padding: 16, gap: 8, backgroundColor: colors.accent, borderRadius: radii.md },
  contextTitle: { ...typography.label, color: colors.primaryDark },
  empty: { paddingVertical: 24, gap: 16 },
  form: { gap: 24 }, field: { gap: 8 }, label: { ...typography.label }, input: { ...uiStyles.input }, multiline: { minHeight: 112, textAlignVertical: 'top' },
  primary: { ...uiStyles.primaryButton }, primaryText: { ...uiStyles.primaryButtonText },
  draftAction: { gap: 12 }, invalid: { borderColor: colors.urgent }, error: { ...typography.body, color: colors.urgent },
  review: { gap: 8, padding: 16, borderRadius: radii.md, backgroundColor: colors.warningSoft },
  links: { gap: 0 }, link: { ...uiStyles.row }, linkCopy: { flex: 1, minWidth: 0, gap: 4 }, linkTitle: { ...typography.label }, caption: { ...typography.caption },
  imageCard: { gap: 8 }, image: { width: '100%', height: 230, backgroundColor: colors.surfaceMuted, borderRadius: radii.md },
});
