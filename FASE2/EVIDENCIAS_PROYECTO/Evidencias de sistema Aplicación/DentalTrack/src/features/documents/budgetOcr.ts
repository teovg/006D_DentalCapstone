import { File } from 'expo-file-system';
import type { OcrDocument } from './ocrTypes';
import { readOcrResponse } from './ocrResponse';

export function localOcrAvailable(): boolean {
  return typeof __DEV__ !== 'undefined' && __DEV__;
}

export async function recognizeBudget(uri: string, signal: AbortSignal): Promise<OcrDocument> {
  if (!localOcrAvailable() || !/^(file:|content:)/.test(uri))
    throw new Error('Selecciona una imagen local. El lector Android necesita la compilación de desarrollo y el servicio OCR conectado.');
  const endpoint = process.env.EXPO_PUBLIC_OCR_ENDPOINT || 'http://127.0.0.1:8124';
  if (!/^http:\/\/(127\.0\.0\.1|localhost|10\.0\.2\.2):8124\/?$/.test(endpoint))
    throw new Error('El lector de desarrollo solo admite el servicio local del computador.');
  const image = new File(uri);
  if (!image.exists || !['image/jpeg', 'image/png'].includes(image.type) || image.size < 1 || image.size > 8 * 1024 * 1024)
    throw new Error('Elige una imagen JPG o PNG de hasta 8 MB.');
  const bytes = await image.bytes().catch(() => { throw new Error('No se pudo abrir la imagen local. Vuelve a seleccionarla.'); });
  if (signal.aborted) throw new Error('La lectura se interrumpió o tardó demasiado. Puedes reintentar.');
  const response = await fetch(`${endpoint.replace(/\/$/, '')}/recognize`, {
    method: 'POST', headers: { 'Content-Type': image.type }, body: new Uint8Array(bytes).buffer, signal,
  }).catch(() => { throw new Error(signal.aborted ? 'La lectura se interrumpió o tardó demasiado. Puedes reintentar.' : 'No se pudo conectar al lector local. Comprueba que esté iniciado y conectado al dispositivo.'); });
  return readOcrResponse(response);
}
