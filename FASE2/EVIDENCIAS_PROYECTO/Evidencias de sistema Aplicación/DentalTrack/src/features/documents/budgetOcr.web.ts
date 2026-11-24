import type { OcrDocument } from './ocrTypes';
import { readOcrResponse } from './ocrResponse';

export function localOcrAvailable(): boolean {
  return typeof window !== 'undefined' && window.location.protocol === 'http:' &&
    ['127.0.0.1', 'localhost'].includes(window.location.hostname);
}

export async function recognizeBudget(uri: string, signal: AbortSignal): Promise<OcrDocument> {
  if (!localOcrAvailable() || !/^(blob:|data:image\/)/.test(uri)) {
    throw new Error('Selecciona una imagen local en el navegador del computador.');
  }
  const image = await (await fetch(uri, { signal })).blob();
  if (!['image/jpeg', 'image/png'].includes(image.type) || image.size > 8 * 1024 * 1024) {
    throw new Error('Elige una imagen JPG o PNG de hasta 8 MB.');
  }
  const response = await fetch('http://127.0.0.1:8124/recognize', {
    method: 'POST', headers: { 'Content-Type': image.type }, body: image, signal,
  }).catch(() => { throw new Error(signal.aborted ? 'La lectura se interrumpió o tardó demasiado. Puedes reintentar.' : 'No se pudo conectar al lector local. Comprueba que esté iniciado.'); });
  return readOcrResponse(response);
}
