import type { OcrDocument } from "./ocrTypes";

export async function readOcrResponse(response: Response): Promise<OcrDocument> {
  const raw: unknown =
    await response.json().catch(() => { throw new Error("El lector devolvió una respuesta no válida. Puedes reintentar."); });
  if (!raw || typeof raw !== "object")
    throw new Error("El lector devolvió una respuesta no válida. Puedes reintentar.");
  const result = raw as { text?: unknown; error?: unknown; engine?: unknown; lines?: unknown };
  if (!response.ok || typeof result.text !== "string" || typeof result.engine !== "string" || !Array.isArray(result.lines))
    throw new Error(typeof result.error === "string" ? result.error : "No se pudo leer la imagen.");
  const lines = result.lines.filter((line): line is OcrDocument["lines"][number] =>
    line && typeof line.text === "string" &&
    ["x", "y", "left", "right", "top", "bottom", "score"].every(key => typeof line[key] === "number" && Number.isFinite(line[key])),
  );
  return { text: result.text, engine: result.engine, lines };
}
