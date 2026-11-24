import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { Modal, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { AppPressable } from './AppPressable';
import { colors, typography, uiStyles } from './theme';

interface NavigationGuard {
  setDirty: (dirty: boolean) => void;
  navigate: (action: () => void) => void;
}
const GuardContext = createContext<NavigationGuard | null>(null);

/** In-memory forms cannot silently lose input when tabs or Android back are used. */
export function UnsavedChangesProvider({ children }: { children: ReactNode }) {
  const dirty = useRef(false);
  const [pending, setPending] = useState<(() => void) | null>(null);
  const setDirty = useCallback((value: boolean) => { dirty.current = value; }, []);
  const navigate = useCallback((action: () => void) => {
    if (dirty.current) setPending(() => action);
    else action();
  }, []);
  useEffect(() => {
    if (Platform.OS !== 'web') return;
    const warn = (event: BeforeUnloadEvent) => {
      if (!dirty.current) return;
      event.preventDefault();
      event.returnValue = '';
    };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, []);
  return <GuardContext.Provider value={{ setDirty, navigate }}>
    {children}
    <Modal visible={pending !== null} transparent animationType="none" accessibilityLabel="Cambios sin guardar" onRequestClose={() => setPending(null)}>
      <View style={styles.backdrop}>
        <ScrollView accessibilityViewIsModal style={styles.dialog} contentContainerStyle={styles.dialogContent}>
          <Text accessibilityRole="header" style={typography.sectionTitle}>¿Salir sin guardar?</Text>
          <Text style={typography.body}>Los cambios de este borrador se perderán. Puedes seguir editándolo o descartarlo.</Text>
          <AppPressable accessibilityRole="button" onPress={() => setPending(null)} style={uiStyles.primaryButton}><Text style={uiStyles.primaryButtonText}>Seguir editando</Text></AppPressable>
          <AppPressable accessibilityRole="button" onPress={() => { dirty.current = false; const action = pending; setPending(null); action?.(); }} style={uiStyles.secondaryButton}><Text style={uiStyles.secondaryButtonText}>Descartar y salir</Text></AppPressable>
        </ScrollView>
      </View>
    </Modal>
  </GuardContext.Provider>;
}

export function useGuardedNavigation() {
  const guard = useContext(GuardContext);
  if (!guard) throw new Error('Navigation guard requires UnsavedChangesProvider');
  return guard.navigate;
}

export function useDirtyDraft(dirty: boolean) {
  const setDirty = useContext(GuardContext)?.setDirty;
  useEffect(() => {
    setDirty?.(dirty);
    return () => setDirty?.(false);
  }, [dirty, setDirty]);
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, justifyContent: 'center', backgroundColor: colors.scrim, padding: 24 },
  dialog: { width: '100%', maxWidth: 420, maxHeight: '100%', flexGrow: 0, alignSelf: 'center', borderRadius: 16, backgroundColor: colors.background },
  dialogContent: { padding: 24, gap: 16 },
});
