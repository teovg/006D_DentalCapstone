import { isIP } from 'node:net';

// Servidor/CLI: la evaluación rechazó publicar resúmenes generados automáticamente.
export const publicCases = [
  'Restauración de resina', 'Cierre de diastema', 'Flúor barniz', 'Endodoncia',
  'Corona dental', 'Ortodoncia', 'Raspado y alisado radicular', 'Puente dental',
  'Implante dental', 'Término inexistente zxqv',
];
export function publicTerm(value) {
  if (typeof value !== 'string' || /[\r\n]/.test(value)) throw new Error('Usa un nombre odontológico público.');
  const term = value.trim().replace(/\s+/g, ' ');
  if (!term || term.length > 80 || term.split(' ').length > 8 || !/^[\p{L}\p{M} ()-]+$/u.test(term) || /\b(mi|me|tengo|debo|dosis|tomar|siento|paciente|rut|necesito|soy|ignora\w*|instrucciones|recomi\w*|agenda\w*|alarma|recordatorio)\b/i.test(term)) {
    throw new Error('Usa solo un nombre odontológico público, sin preguntas, pauta ni datos personales.');
  }
  return term;
}

export function publicSourceUrl(value) {
  if (typeof value !== 'string') return null;
  let url;
  try { url = new URL(value); } catch { return null; }
  const host = url.hostname.toLowerCase().replace(/^www\./, '').replace(/\.$/, '');
  if (url.protocol !== 'https:' || url.username || url.password || url.port || isIP(host.replace(/^\[|\]$/g, '')) || !host.includes('.') || /\.(?:local|localhost|internal)$/i.test(host) || /(?:login|\/app\/|\/admin\/)/i.test(url.pathname)) return null;
  return { domain: host, url: url.href };
}

function readSource(result) {
  if (!result || typeof result.title !== 'string' || !result.title.trim() || typeof result.content !== 'string' || !result.content.trim()) return null;
  if (/\bARCHIVED\b|\bdocumento archivado\b/i.test(`${result.title} ${result.content}`)) return null;
  const location = publicSourceUrl(result.url);
  return location ? { ...location, title: result.title.trim(), attribution: 'search_result' } : null;
}

export function normalizeSearchAnswer(body, term, now = new Date()) {
  const empty = { status: 'insufficient_evidence', term, explanation: '', sources: [], provider: 'tavily-search', retrievedAt: now.toISOString(), sourcePolicyVersion: '2026-11-15-sources-only', automaticExplanationApproved: false };
  if (!Array.isArray(body?.results) || !body.results.length) return empty;
  const sources = body.results.map(readSource);
  if (sources.some(source => !source) || sources.length > 3) return { ...empty, reason: 'unaccepted_sources' };
  // Coincidencia textual filtra resultados ajenos; no verifica respaldo clínico.
  const normalize = text => text.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase();
  const words = normalize(term).match(/[a-z]+/g)?.filter(word => !['de', 'y', 'en', 'el', 'la'].includes(word)) ?? [];
  if (!words.length) return empty;
  const relevant = sources.filter((_, index) => {
    const text = normalize(`${body.results[index].title} ${body.results[index].content}`);
    const tokens = text.match(/[a-z]+/g) ?? [];
    return words.every(word => tokens.some(token => token === word || (word.length >= 5 && token.startsWith(word.slice(0, 7)))));
  });
  if (!relevant.length) return empty;
  // Ni answer ni extractos pasan a la salida pública: solo enlaces para ampliar.
  return { ...empty, status: 'sources_only', sources: [...new Map(relevant.map(source => [source.url, source])).values()], attribution: 'search_results_not_verified_explanations' };
}

export async function runEducationPilot({ term: input, apiKey, keyless = false, fetchImpl = fetch }) {
  const term = publicTerm(input);
  if (!apiKey?.trim() && !keyless) throw new Error('Falta TAVILY_API_KEY en el archivo local del piloto.');
  const headers = { 'Content-Type': 'application/json' };
  if (apiKey?.trim()) headers.Authorization = `Bearer ${apiKey.trim()}`;
  else headers['X-Tavily-Access-Mode'] = 'keyless';
  const response = await fetchImpl('https://api.tavily.com/search', {
    method: 'POST', headers, redirect: 'error', signal: AbortSignal.timeout(35_000),
    body: JSON.stringify({
      query: `Qué es ${term} en odontología`,
      search_depth: 'basic', auto_parameters: false, include_answer: false,
      max_results: 3, include_raw_content: false, include_images: false,
      topic: 'general', language: 'es', filter_by_language: true, include_usage: true,
    }),
  });
  if (!response.ok) throw new Error(`Búsqueda educativa: HTTP ${response.status}. Revisa acceso/cupo; no se reintentó ni cambió a un plan de pago.`);
  return normalizeSearchAnswer(await response.json(), term);
}
