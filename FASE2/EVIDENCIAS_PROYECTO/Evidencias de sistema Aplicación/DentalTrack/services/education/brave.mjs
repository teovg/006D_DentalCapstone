import { publicSourceUrl, publicTerm } from './web.mjs';

// Piloto de servidor/CLI: sin almacenamiento, caché o conexión a la ficha del paciente.
export function normalizeBraveStream(wire, term) {
  const empty = { status: 'unavailable', term, explanation: '', sources: [], citationMarkers: [], provider: 'brave-answers', publicationApproved: false };
  let content = '';
  let finished = false;
  let done = false;
  try {
    for (const line of wire.split(/\r?\n/)) {
      if (!line.startsWith('data:')) continue;
      const data = line.slice(5).trim();
      if (data === '[DONE]') { done = true; continue; }
      if (!data) continue;
      const chunk = JSON.parse(data);
      if (chunk.error) return empty;
      content += chunk.choices?.[0]?.delta?.content ?? '';
      const reason = chunk.choices?.[0]?.finish_reason;
      if (reason && reason !== 'stop') return { ...empty, reason: 'incomplete_answer' };
      if (reason === 'stop') finished = true;
    }
    if (!done || !finished) return { ...empty, reason: 'incomplete_stream' };
    const citations = [...content.matchAll(/<citation>([\s\S]*?)<\/citation>/g)].map(match => JSON.parse(match[1]));
    const usageTags = [...content.matchAll(/<usage>([\s\S]*?)<\/usage>/g)];
    const usage = usageTags.length ? JSON.parse(usageTags.at(-1)[1]) : {};
    const cost = usage['X-Request-Total-Cost'];
    const costUSD = typeof cost === 'number' && Number.isFinite(cost) && cost >= 0 ? cost : null;
    const answer = content.replace(/<(citation|usage)>[\s\S]*?<\/\1>/g, '');
    if (!answer.trim() || answer.length > 1200 || /<[^>]+>|https?:\/\/|\b\d+\s*(?:mg|ml|horas?|días?)\b/i.test(answer)) return { ...empty, reason: 'unexpected_answer', costUSD };
    if (!citations.length || /^\s*(?:no\s+(?:se|hay|existe|encontr)|the sources)/i.test(answer)) return { ...empty, status: 'insufficient_evidence', costUSD };
    const sources = [];
    const citationMarkers = [];
    for (const citation of citations) {
      const location = publicSourceUrl(citation.url);
      if (!location || !Number.isInteger(citation.start_index) || !Number.isInteger(citation.end_index) || citation.start_index < 0 || citation.end_index < citation.start_index || citation.end_index > answer.length || /\bARCHIVED\b|\bdocumento archivado\b/i.test(citation.snippet ?? '')) return { ...empty, reason: 'unaccepted_citation', costUSD };
      let source = sources.find(item => item.url === location.url);
      if (!source) { source = { id: `S${sources.length + 1}`, ...location }; sources.push(source); }
      // Son posiciones del proveedor, no prueba de respaldo semántico de cada frase.
      citationMarkers.push({ sourceId: source.id, startIndex: citation.start_index, endIndex: citation.end_index });
    }
    const displayedSources=sources.slice(0,3);
    return { ...empty, status: 'candidate', explanation: answer, format: 'provider_text', sources:displayedSources, citationMarkers:citationMarkers.filter(marker=>displayedSources.some(source=>source.id===marker.sourceId)), costUSD };
  } catch {
    return { ...empty, reason: 'invalid_stream' };
  }
}

export async function runBravePilot({ term: input, apiKey, fetchImpl = fetch }) {
  const term = publicTerm(input);
  if (!apiKey?.trim()) throw new Error('Falta BRAVE_ANSWERS_API_KEY en el archivo privado.');
  const response = await fetchImpl('https://api.search.brave.com/res/v1/chat/completions', {
    method: 'POST', redirect: 'error', cache: 'no-store', signal: AbortSignal.timeout(45_000),
    headers: { 'Content-Type': 'application/json', 'X-Subscription-Token': apiKey.trim() },
    body: JSON.stringify({
      model: 'brave', messages: [{ role: 'user', content: `Define ${term} como prestación odontológica en español, en dos frases breves y sencillas, sin negritas ni listas. Solo qué es; evita edades, pasos, materiales concretos, precios y adjetivos comerciales. No recomiendes tratamientos ni garantices resultados. Si no hay información, indícalo sin sugerir otros términos.` }],
      stream: true, language: 'es', enable_citations: true, enable_research: false,
      max_completion_tokens: 512, web_search_options: { search_context_size: 'low' },
    }),
  });
  if (!response.ok) throw new Error(`Brave Answers: HTTP ${response.status}. Sin reintento ni cambio de proveedor o plan.`);
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let wire = '';
  let bytes = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      bytes += value.byteLength;
      if (bytes > 500_000) throw new Error('Answers devolvió una respuesta excesiva.');
      wire += decoder.decode(value, { stream: true });
    }
    wire += decoder.decode();
    return normalizeBraveStream(wire, term);
  } finally {
    await reader.cancel().catch(() => {});
    reader.releaseLock();
  }
}
