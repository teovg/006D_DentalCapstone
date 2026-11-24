import { useState } from 'react';
import { Image, Modal, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import { AppPressable } from './AppPressable';
import { Icon } from './Icon';
import { colors, typography } from './theme';

export function DocumentPreview({ uri, label, style }: { uri: string; label: string; style: StyleProp<ViewStyle> }) {
  const [failedUri, setFailedUri] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(false);
  return <View style={[style, styles.frame]}>
    {failedUri === uri ? <View accessibilityRole="alert" style={styles.error}>
      <Icon name="documents" color={colors.primary} size={28} />
      <Text style={styles.title}>No se pudo abrir el archivo</Text>
      <Text style={styles.body}>Vuelve a seleccionarlo desde el dispositivo.</Text>
    </View> : <><Image accessibilityLabel={label} source={{ uri }} resizeMode="contain" onError={() => setFailedUri(uri)} style={StyleSheet.absoluteFill} />
      <AppPressable accessibilityRole="button" accessibilityLabel={`Ampliar ${label}`} onPress={() => setExpanded(true)} style={{position:'absolute',right:8,top:8,padding:10,minHeight:44,backgroundColor:colors.surface,borderRadius:8}}><Icon name="search" size={20} /></AppPressable>
    </>}
    <Modal visible={expanded} transparent={false} onRequestClose={() => setExpanded(false)}>
      <View style={{flex:1,backgroundColor:colors.background,padding:16}}>
        <AppPressable accessibilityRole="button" onPress={() => setExpanded(false)} style={{minHeight:48,alignSelf:'flex-end',justifyContent:'center',padding:12}}><Text style={styles.title}>Cerrar imagen</Text></AppPressable>
        <Image accessibilityLabel={label} source={{uri}} resizeMode="contain" style={{flex:1}} />
      </View>
    </Modal>
  </View>;
}

const styles = StyleSheet.create({
  frame: { overflow: 'hidden', backgroundColor: colors.surfaceMuted },
  error: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 16, gap: 8 },
  title: { ...typography.label, textAlign: 'center' }, body: { ...typography.body, textAlign: 'center' },
});
