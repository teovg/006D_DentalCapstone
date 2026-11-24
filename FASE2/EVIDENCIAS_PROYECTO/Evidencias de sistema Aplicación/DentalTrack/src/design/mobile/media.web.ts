import { pickDocumentImage as pick } from "../../features/documents/pickDocumentImage";
export async function durableUri(uri: string): Promise<string> {
  if (!uri.startsWith("blob:")) return uri;
  const blob = await (await fetch(uri)).blob();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () =>
      reject(
        new Error("No se pudo conservar el archivo. Vuelve a seleccionarlo."),
      );
    reader.readAsDataURL(blob);
  });
}
export async function pickDocumentImage(camera: boolean) {
  const result = await pick(camera);
  return result ? { ...result, uri: await durableUri(result.uri) } : null;
}
