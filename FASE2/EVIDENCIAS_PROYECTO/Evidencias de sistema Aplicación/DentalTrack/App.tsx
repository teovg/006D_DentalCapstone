import { Platform } from 'react-native';
import './src/design/mobile/global.css';
import { PanelUIProvider } from 'panelui-native/provider';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AppShell } from './src/app/AppShell';

// Isolated UI fixtures are opt-in and unreachable in production exports/native apps.
export default function App() {
  if (__DEV__ && Platform.OS === 'web' && process.env.EXPO_PUBLIC_UI_REVIEW === 'true') {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { UIReview } = require('./src/dev/UIReview.web') as typeof import('./src/dev/UIReview.web');
    return <SafeAreaProvider><PanelUIProvider><UIReview /></PanelUIProvider></SafeAreaProvider>;
  }
  return <SafeAreaProvider><PanelUIProvider><AppShell /></PanelUIProvider></SafeAreaProvider>;
}
