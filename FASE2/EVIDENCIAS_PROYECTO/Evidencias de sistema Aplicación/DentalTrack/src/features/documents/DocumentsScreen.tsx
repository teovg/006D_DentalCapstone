import { IndicatedScrollView } from '../../ui/IndicatedScrollView';
import { useMemo, useState } from 'react';
import { Modal, Text, TextInput, StyleSheet, View } from 'react-native';
import { AppPressable as Pressable } from '../../ui/AppPressable';

import { ScreenHeader } from '../../ui/ScreenHeader';
import { colors, radii, typography, uiStyles } from '../../ui/theme';
import { Icon } from '../../ui/Icon';
import type { BudgetCaptureDraft } from './types';
import type { WorkspaceRoute } from '../workspace/screens';
import { ChoiceField } from '../../ui/ChoiceField';
import { useListWindow } from '../../ui/listWindow';
import { MoreItemsButton } from '../../ui/MoreItemsButton';
import type { ConfirmedPrescription } from './prescriptionProposal';
import { pickDocumentImage, type DocumentImage } from './pickDocumentImage';

const categories = ['Todos', 'Radiografías', 'Presupuestos', 'Recetas', 'Informes'] as const;
type DocumentCategory = (typeof categories)[number];

interface DocumentsScreenProps {
  onOpenCapture: (image?: DocumentImage) => void;
  onCapturePrescription?: (image: DocumentImage) => void;
  drafts: readonly BudgetCaptureDraft[];
  onNavigate: (route: WorkspaceRoute) => void;
  onOpenDraft: (draft: BudgetCaptureDraft) => void;
  prescriptions?: readonly ConfirmedPrescription[];
  onOpenPrescription?: (prescription: ConfirmedPrescription) => void;
}

export function DocumentsScreen({ onOpenCapture, onCapturePrescription, drafts, onNavigate, onOpenDraft, prescriptions = [], onOpenPrescription }: DocumentsScreenProps) {
  const [source, setSource] = useState<'budget' | 'prescription' | null>(null);
  const [sourceError, setSourceError] = useState<string | null>(null);
  const choose = async (camera: boolean) => {
    try {
      setSourceError(null);
      const image = await pickDocumentImage(camera);
      if (!image) return;
      setSource(null);
      if (source === 'prescription') onCapturePrescription?.(image);
      else onOpenCapture(image);
    } catch (cause) { setSourceError(cause instanceof Error ? cause.message : 'No se pudo abrir la imagen.'); }
  };
  const [category, setCategory] = useState<DocumentCategory>('Todos');
  const [search, setSearch] = useState('');
  const emptyDescription = useMemo(() => {
    if (search.trim()) return `No encontramos documentos para “${search.trim()}”.`;
    if (category !== 'Todos') return `Aún no hay documentos en ${category.toLowerCase()}.`;
    return 'Aún no hay documentos en tu biblioteca.';
  }, [category, search]);
  const visibleDrafts = drafts.filter((draft) => {
    if (category !== 'Todos' && category !== 'Presupuestos') return false;
    const query = search.trim().toLowerCase();
    return !query || draft.fileName.toLowerCase().includes(query) || draft.clinicHint.toLowerCase().includes(query);
  });
  const draftWindow = useListWindow(visibleDrafts, `${category}:${search}`);
  const visiblePrescriptions = prescriptions.filter((item) => ['Todos', 'Recetas'].includes(category) &&
    (!search.trim() || item.medicines.some((medicine) => medicine.name.toLowerCase().includes(search.trim().toLowerCase()))));

  return (
    <><IndicatedScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <ScreenHeader compact title="Documentos" />

      <Pressable accessibilityRole="button" onPress={() => { setSourceError(null); setSource('budget'); }} style={({ pressed }) => [styles.captureAction, pressed && styles.pressed]}>
        <View style={styles.captureIcon}><Icon name="camera" color={colors.primary} /></View>
        <View style={styles.captureCopy}>
          <Text style={styles.captureTitle}>Digitalizar presupuesto</Text>
          <Text style={styles.captureBody}>Fotografía tu presupuesto o elígelo de la galería.</Text>
        </View>
        <Icon name="chevron" color={colors.primary} size={18} />
      </Pressable>

      <View style={styles.searchBox}>
        <Icon name="search" size={20} color={colors.muted} />
        <TextInput
          accessibilityLabel="Buscar documentos"
          returnKeyType="search"
          autoCorrect={false}
          onChangeText={setSearch}
          placeholder="Buscar documentos"
          placeholderTextColor={colors.muted}
          style={styles.searchInput}
          value={search}
        />
      </View>

      <View style={styles.secondaryActions}>
        <Pressable accessibilityRole="button" onPress={() => onNavigate('document-type')} style={({ pressed }) => [styles.secondaryAction, pressed && styles.pressed]}><Text style={styles.secondaryActionText}>Otros documentos</Text></Pressable>
      <Pressable accessibilityRole="button" onPress={() => { setSourceError(null); setSource('prescription'); }} style={({ pressed }) => [styles.secondaryAction, pressed && styles.pressed]}><Text style={styles.secondaryActionText}>Digitalizar receta</Text></Pressable>
      </View>

      <View style={styles.categoryField}>
        <Text style={typography.label}>Tipo de documento</Text>
        <ChoiceField label="Tipo de documento" options={categories.map((item) => ({ id: item, label: item }))} value={category} onChange={setCategory} />
      </View>

      {visiblePrescriptions.map((item) => <Pressable key={item.id} accessibilityRole="button" style={styles.documentCard} onPress={() => onOpenPrescription?.(item)}>
        <Icon name="documents" color={colors.primary} />
        <View style={styles.documentCopy}><Text style={styles.documentTitle}>Receta confirmada</Text><Text style={styles.documentMeta}>{item.medicines.length} medicamentos · {new Date(item.createdAt).toLocaleDateString('es-CL')}</Text></View>
        <Icon name="chevron" color={colors.primary} />
      </Pressable>)}
      {visibleDrafts.length > 0 ? <View style={styles.documentList}>
        {draftWindow.items.map((draft) => (
          <Pressable accessibilityRole="button" onPress={() => onOpenDraft(draft)} key={draft.id} style={styles.documentCard}>
            <View style={styles.documentIcon}><Icon name="documents" color={colors.healthy} /></View>
            <View style={styles.documentCopy}>
              <Text numberOfLines={1} style={styles.documentTitle}>{draft.clinicHint || draft.fileName}</Text>
              <Text numberOfLines={1} style={styles.documentMeta}>
                Presupuesto · {draft.numberingSystem === 'fdi' ? 'FDI' : draft.numberingSystem === 'universal' ? 'Universal' : 'Numeración por revisar'}
              </Text>
              <View style={styles.draftBadge}><Text style={styles.draftBadgeText}>{draft.status === 'confirmed' ? 'Presupuesto confirmado' : 'Captura preparada para OCR'}</Text></View>
            </View>
          </Pressable>
        ))}
        <MoreItemsButton remaining={draftWindow.remaining} nextCount={draftWindow.nextCount} onPress={draftWindow.loadMore} />
      </View> : visiblePrescriptions.length === 0 ? <View style={styles.emptyCard}>
        <View style={styles.emptyIcon}><Icon name="documents" size={32} color={colors.primary} /></View>
        <Text style={styles.emptyTitle}>{search.trim() ? 'Sin resultados' : category === 'Todos' ? 'Sin capturas preparadas' : `Sin ${category.toLowerCase()}`}</Text>
        <Text style={styles.emptyBody}>{emptyDescription}</Text>
        {search.trim() ? <Pressable accessibilityRole="button" onPress={() => setSearch('')} style={styles.emptyAction}><Text style={styles.emptyActionText}>Limpiar búsqueda</Text></Pressable>
          : category === 'Recetas' ? <Pressable accessibilityRole="button" onPress={() => onNavigate('prescription-capture')} style={styles.emptyAction}><Text style={styles.emptyActionText}>Preparar una receta</Text></Pressable>
          : category === 'Radiografías' || category === 'Informes' ? <Pressable accessibilityRole="button" onPress={() => onNavigate('document-type')} style={styles.emptyAction}><Text style={styles.emptyActionText}>Ver opciones de archivos</Text></Pressable>
          : <Text style={styles.emptyBody}>Usa «Digitalizar presupuesto» para preparar tu primera captura.</Text>}
      </View> : null}
      <Text style={styles.sessionNote}>Las imágenes de las capturas permanecen disponibles durante esta sesión.</Text>
    </IndicatedScrollView>
    <Modal visible={source !== null} transparent animationType="slide" onRequestClose={() => setSource(null)}>
      <View style={{flex:1,justifyContent:'flex-end',backgroundColor:colors.scrim}}>
        <View style={{backgroundColor:colors.surface,padding:24,gap:16,borderTopLeftRadius:20,borderTopRightRadius:20,width:'100%',maxWidth:720,alignSelf:'center'}}>
          <Text accessibilityRole="header" style={typography.sectionTitle}>{source === 'prescription' ? 'Añadir receta' : 'Añadir presupuesto'}</Text>
          <Pressable accessibilityRole="button" style={uiStyles.primaryButton} onPress={() => void choose(true)}><Text style={uiStyles.primaryButtonText}>Tomar foto</Text></Pressable>
          <Pressable accessibilityRole="button" style={uiStyles.secondaryButton} onPress={() => void choose(false)}><Text style={uiStyles.secondaryButtonText}>Elegir de galería</Text></Pressable>
          {sourceError ? <Text accessibilityRole="alert" style={{color:colors.urgent}}>{sourceError}</Text> : null}
          <Pressable accessibilityRole="button" style={uiStyles.secondaryButton} onPress={() => setSource(null)}><Text style={uiStyles.secondaryButtonText}>Cancelar</Text></Pressable>
        </View>
      </View>
    </Modal></>
  );
}

const styles = StyleSheet.create({
  content: { ...uiStyles.page, paddingTop: 8, gap: 16 },
  captureAction: { alignItems: 'center', backgroundColor: colors.accent, borderRadius: radii.lg, flexDirection: 'row', padding: 16, gap: 12, minHeight: 88 },
  captureIcon: { alignItems: 'center', justifyContent: 'center', width: 32 },
  captureCopy: { flex: 1 }, captureTitle: { ...typography.sectionTitle }, captureBody: { ...typography.body, marginTop: 4 },
  pressed: { ...uiStyles.pressed },
  searchBox: { ...uiStyles.input, alignItems: 'center', flexDirection: 'row', paddingVertical: 0, gap: 10 },
  searchInput: { color: colors.ink, flex: 1, minWidth: 0, minHeight: 48, fontSize: 16, paddingVertical: 12 },
  categoryField: { gap: 8 },
  secondaryActions: { flexDirection: 'row', gap: 12, alignItems: 'stretch' },
  secondaryAction: { minHeight: 48, flex: 1, minWidth: 0, justifyContent: 'center', borderBottomWidth: 1, borderBottomColor: colors.border }, secondaryActionText: { color: colors.primaryDark, fontSize: 14, lineHeight: 21, fontWeight: '500' },
  emptyCard: { alignItems: 'center', paddingVertical: 32, paddingHorizontal: 16 },
  emptyIcon: { alignItems: 'center', justifyContent: 'center', width: 48, height: 48 },
  emptyTitle: { ...typography.sectionTitle, marginTop: 16, textAlign: 'center' },
  emptyBody: { ...typography.body, marginTop: 8, textAlign: 'center' },
  sessionNote: { ...typography.caption },
  emptyAction: { ...uiStyles.secondaryButton, marginTop: 24 }, emptyActionText: { ...uiStyles.secondaryButtonText },
  documentList: { gap: 0 }, documentCard: { ...uiStyles.row },
  documentIcon: { alignItems: 'center', justifyContent: 'center', width: 32 }, documentCopy: { flex: 1, minWidth: 0 },
  documentTitle: { ...typography.label }, documentMeta: { ...typography.caption, marginTop: 4 },
  draftBadge: { alignSelf: 'flex-start', marginTop: 8 }, draftBadgeText: { ...typography.caption, color: colors.primaryDark },
});
