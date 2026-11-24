import * as ImagePicker from 'expo-image-picker';
import { Platform } from 'react-native';

export interface DocumentImage { uri: string; fileName?: string | null }

export async function pickDocumentImage(camera: boolean): Promise<DocumentImage | null> {
  if (camera && Platform.OS !== 'web') {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) throw new Error('Permite usar la cámara o elige una foto de la galería.');
  }
  const options: ImagePicker.ImagePickerOptions = { mediaTypes: ['images'], allowsEditing: false, quality: 1 };
  const result = camera ? await ImagePicker.launchCameraAsync(options) : await ImagePicker.launchImageLibraryAsync(options);
  return result.canceled ? null : result.assets[0] ?? null;
}
