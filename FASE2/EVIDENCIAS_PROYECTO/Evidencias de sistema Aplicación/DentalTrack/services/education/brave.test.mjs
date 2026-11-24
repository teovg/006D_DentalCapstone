import { describe, expect, it, vi } from 'vitest';
import { normalizeBraveStream, runBravePilot } from './brave.mjs';

// Contrato sintético: no copiar respuestas de Brave a fixtures persistentes.
const explanation = 'Definición pública sintética con acentos: raíz.';
const citation = { start_index: explanation.length, end_index: explanation.length, number: 1, url: 'https://dental.example.org/concepto', snippet: 'Evidencia sintética.' };
const frame = (content, finish_reason = null) => `data: ${JSON.stringify({ choices: [{ delta: { content }, finish_reason }] })}\n\n`;
const stream = (text = explanation, citations = [citation], finish = 'stop') => frame(text.slice(0, 16)) + frame(text.slice(16)) + citations.map(item => frame(`<citation>${JSON.stringify(item)}</citation>`)).join('') + frame('<usage>{"X-Request-Total-Cost":0.01}</usage>') + frame('', finish) + 'data: [DONE]\n\n';

describe('piloto Answers sin persistencia', () => {
  it('reconstruye texto y marcadores divididos entre eventos, con fuentes trazables y sin aprobar el candidato', () => {
    const result = normalizeBraveStream(stream(), 'Concepto');
    expect(result.status).toBe('candidate');
    expect(result.explanation).toBe(explanation);
    expect(result.publicationApproved).toBe(false);
    expect(result.sources).toEqual([{ id: 'S1', domain: 'dental.example.org', url: citation.url }]);
    expect(result.citationMarkers[0]).toMatchObject({ sourceId: 'S1', startIndex: explanation.length });
    expect(result.costUSD).toBe(0.01);
    expect(result).not.toHaveProperty('snippet');
  });
  it('conserva todas las posiciones sin duplicar la fuente', () => {
    const result = normalizeBraveStream(stream(explanation, [citation, { ...citation, number: 2 }]), 'Concepto');
    expect(result.sources).toHaveLength(1);
    expect(result.citationMarkers).toHaveLength(2);
  });
  it('muestra como máximo tres fuentes después de validar todas las citas',()=>{
    const citations=Array.from({length:5},(_,i)=>({...citation,url:`https://dental.example.org/${i}`}));
    const result=normalizeBraveStream(stream(explanation,citations),'Concepto');
    expect(result.sources).toHaveLength(3);
    expect(result.citationMarkers).toHaveLength(3);
    expect(normalizeBraveStream(stream(explanation,[...citations,{...citation,url:'http://127.0.0.1/private'}]),'Concepto').status).toBe('unavailable');
  });
  it('se abstiene sin citas o ante falta explícita de información, sin sugerencias de relleno', () => {
    for (const text of ['No hay información; quizá era otra palabra.', explanation]) {
      const result = normalizeBraveStream(stream(text, []), 'Concepto');
      expect(result.status).toBe('insufficient_evidence');
      expect(result.explanation).toBe('');
    }
  });
  it('rechaza truncamiento, mensajes incompletos o etiquetas corruptas', () => {
    for (const wire of [stream(explanation, [citation], 'length'), stream().replace('data: [DONE]', ''), frame('Texto<usage>{</usage>') + frame('', 'stop') + 'data: [DONE]', 'data: {invalido}\n\n']) {
      expect(normalizeBraveStream(wire, 'Concepto').status).toBe('unavailable');
      expect(normalizeBraveStream(wire, 'Concepto').explanation).toBe('');
    }
  });
  it('no elimina una cita insegura o mal posicionada para presentar la misma respuesta como válida', () => {
    for (const bad of [{ ...citation, url: 'http://dental.example.org/a' }, { ...citation, url: 'https://127.0.0.1/a' }, { ...citation, end_index: 999 }, { ...citation, start_index: -1 }, { ...citation, snippet: 'ARCHIVED' }]) {
      const result = normalizeBraveStream(stream(explanation, [citation, bad]), 'Concepto');
      expect(result.status).toBe('unavailable');
      expect(result.sources).toEqual([]);
      expect(result.explanation).toBe('');
    }
  });
  it('no publica dosis, HTML o respuestas excesivas aunque incluyan citas', () => {
    for (const text of ['Toma 500 mg cada 12 horas', '<script>alert(1)</script>', 'x'.repeat(1201)]) expect(normalizeBraveStream(stream(text), 'Concepto').status).toBe('unavailable');
  });
  it('envía una sola consulta pública, sin dominios predeterminados, y procesa UTF-8 cortado entre paquetes', async () => {
    const bytes = new TextEncoder().encode(stream());
    const response = new Response(new ReadableStream({ start(controller) { for (const byte of bytes) controller.enqueue(new Uint8Array([byte])); controller.close(); } }));
    const fetchImpl = vi.fn(async () => response);
    const result = await runBravePilot({ term: 'Concepto', apiKey: 'test-only', fetchImpl });
    expect(result.explanation).toBe(explanation);
    const [url, options] = fetchImpl.mock.calls[0];
    expect(url).toBe('https://api.search.brave.com/res/v1/chat/completions');
    expect(options.headers['X-Subscription-Token']).toBe('test-only');
    expect(options.body).not.toContain('test-only');
    expect(options.cache).toBe('no-store');
    expect(JSON.parse(options.body)).toMatchObject({ stream: true, enable_citations: true, enable_research: false, language: 'es' });
    expect(JSON.parse(options.body).messages).toHaveLength(1);
    expect(JSON.parse(options.body)).not.toHaveProperty('include_domains');
  });
  it('no consulta con datos personales, clave ausente o errores que pudieran provocar un fallback', async () => {
    const fetchImpl = vi.fn();
    await expect(runBravePilot({ term: 'Mi tratamiento', apiKey: 'test-only', fetchImpl })).rejects.toThrow();
    await expect(runBravePilot({ term: 'Concepto', apiKey: '', fetchImpl })).rejects.toThrow('BRAVE_ANSWERS_API_KEY');
    expect(fetchImpl).not.toHaveBeenCalled();
    for (const status of [401, 402, 403, 429, 500]) {
      const failure = vi.fn(async () => ({ ok: false, status }));
      await expect(runBravePilot({ term: 'Concepto', apiKey: 'test-only', fetchImpl: failure })).rejects.toThrow(`HTTP ${status}`);
      expect(failure).toHaveBeenCalledTimes(1);
    }
  });
});
