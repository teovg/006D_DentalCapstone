import { Text } from 'react-native';

import { AppPressable } from './AppPressable';
import { uiStyles } from './theme';

export function MoreItemsButton({ remaining, nextCount, onPress }: { remaining: number; nextCount: number; onPress: () => void }) {
  if (remaining === 0) return null;
  return <AppPressable accessibilityRole="button" onPress={onPress} style={uiStyles.secondaryButton}>
    <Text style={uiStyles.secondaryButtonText}>Ver {nextCount} más · {remaining.toLocaleString('es-CL')} restantes</Text>
  </AppPressable>;
}
