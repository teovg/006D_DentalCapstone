import { Platform } from 'react-native';

export const isHomeGuideRequested = () => Platform.OS !== 'web' ||
  new URLSearchParams(globalThis.location.search).get('inicio') !== 'actual';
