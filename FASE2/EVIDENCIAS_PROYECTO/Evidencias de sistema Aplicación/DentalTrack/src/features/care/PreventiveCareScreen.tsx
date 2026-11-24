import { IndicatedScrollView } from '../../ui/IndicatedScrollView';
import { useState } from 'react';
import {  StyleSheet, Text, View } from 'react-native';
import { AppPressable as Pressable } from '../../ui/AppPressable';

import { SubscreenHeader } from '../../ui/SubscreenHeader';
import { colors, radii, typography, uiStyles } from '../../ui/theme';
import { Icon } from '../../ui/Icon';

const guides = [
  {
    symbol: '◇',
    title: 'Higiene diaria',
    body: 'Usa una técnica suave y ordenada para recorrer todas las superficies dentales.',
  },
  {
    symbol: '○',
    title: 'Limpieza interdental',
    body: 'Complementa el cepillado con el método indicado por tu profesional.',
  },
  {
    symbol: '□',
    title: 'Controles periódicos',
    body: 'Mantén la frecuencia de controles definida junto a tu odontólogo.',
  },
] as const;

const questions = [
  {
    question: '¿Qué hago si aparece sensibilidad dental?',
    answer: 'La sensibilidad puede tener distintas causas. Evita estímulos que aumenten la molestia y consulta a un odontólogo si persiste, empeora o aparece dolor intenso.',
  },
  {
    question: '¿Cómo cuidar la higiene entre los dientes?',
    answer: 'La seda dental y los cepillos interdentales son opciones habituales. Un profesional puede ayudarte a escoger la alternativa adecuada para tu boca.',
  },
  {
    question: '¿Cada cuánto debo asistir a control?',
    answer: 'La frecuencia depende de tus antecedentes y necesidades. Sigue el calendario acordado con tu profesional tratante.',
  },
] as const;

export function PreventiveCareScreen({ onBack }: { onBack: () => void }) {
  const [openQuestion, setOpenQuestion] = useState<number | null>(null);

  return (
    <IndicatedScrollView contentContainerStyle={styles.content}>
      <SubscreenHeader onBack={onBack} subtitle="Orientación general para el cuidado diario" title="Cuidados preventivos" />

      <View style={styles.notice}>
        <Icon name="info" color={colors.primary} size={24} />
        <Text style={styles.noticeText}>Esta información es educativa y no reemplaza la evaluación ni las indicaciones de un odontólogo.</Text>
      </View>

      <View>
        <Text style={styles.sectionTitle}>Guías para ti</Text>
        <View style={styles.guideGrid}>
          {guides.map((guide) => (
            <View key={guide.title} style={styles.guideCard}>
              <Text style={styles.guideTitle}>{guide.title}</Text>
              <Text style={styles.guideBody}>{guide.body}</Text>
            </View>
          ))}
        </View>
      </View>

      <View>
        <Text style={styles.sectionTitle}>Preguntas frecuentes</Text>
        <View style={styles.questions}>
          {questions.map((item, index) => {
            const expanded = openQuestion === index;
            return (
              <View key={item.question} style={styles.questionCard}>
                <Pressable
                  accessibilityRole="button"
                  accessibilityState={{ expanded }}
                  onPress={() => setOpenQuestion(expanded ? null : index)}
                  style={({ pressed }) => [styles.questionButton, pressed && styles.pressed]}
                >
                  <Text style={styles.questionText}>{item.question}</Text>
                  <Icon name={expanded ? 'minus' : 'plus'} size={20} color={colors.primary} />
                </Pressable>
                {expanded ? <Text style={styles.answer}>{item.answer}</Text> : null}
              </View>
            );
          })}
        </View>
      </View>
    </IndicatedScrollView>
  );
}

const styles = StyleSheet.create({
  content: { ...uiStyles.page },
  notice: { alignItems: 'flex-start', backgroundColor: colors.accent, borderRadius: radii.md, flexDirection: 'row', padding: 16, gap: 12 },
  noticeText: { ...typography.body, color: colors.primaryDark, flex: 1 }, sectionTitle: { ...typography.sectionTitle, marginBottom: 16 },
  guideGrid: { gap: 0 }, guideCard: { borderBottomColor: colors.border, borderBottomWidth: 1, paddingVertical: 20 },
  guideTitle: { ...typography.label }, guideBody: { ...typography.body, marginTop: 8 },
  questions: { gap: 0 }, questionCard: { borderBottomColor: colors.border, borderBottomWidth: 1 },
  questionButton: { alignItems: 'center', flexDirection: 'row', paddingVertical: 16, minHeight: 56, gap: 12 },
  questionText: { ...typography.label, flex: 1 }, answer: { ...typography.body, paddingBottom: 20 }, pressed: { ...uiStyles.pressed },
});
