import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { recognizeBudget } from './budgetOcr';
const image = vi.hoisted(() => ({ exists: true, type: 'image/jpeg', size: 3, bytes: vi.fn(async () => new Uint8Array([1,2,3])) }));
vi.mock('expo-file-system', () => ({ File: class { exists=image.exists; type=image.type; size=image.size; bytes=image.bytes; } }));
const request = vi.fn();
beforeEach(() => {
  vi.stubGlobal('__DEV__', true); vi.stubGlobal('fetch', request); vi.stubEnv('EXPO_PUBLIC_OCR_ENDPOINT', '');
  request.mockReset(); image.exists=true; image.type='image/jpeg'; image.size=3;
});
afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); });
describe('Android local OCR transport', () => {
  it('sends local image bytes and returns only structurally valid OCR lines', async () => {
    const line = { text: 'Prestación sintética', x:1,y:2,left:0,right:10,top:0,bottom:5,score:0.9 };
    request.mockResolvedValue(new Response(JSON.stringify({ text: line.text, engine:'synthetic-test', lines:[line,{text:'invalid'}] })));
    expect(await recognizeBudget('file:///synthetic.jpg', new AbortController().signal)).toEqual({text:line.text,engine:'synthetic-test',lines:[line]});
    expect(request).toHaveBeenCalledWith('http://127.0.0.1:8124/recognize', expect.objectContaining({method:'POST',headers:{'Content-Type':'image/jpeg'},body:expect.any(ArrayBuffer)}));
  });
  it('rejects nonlocal images, oversized images and release builds before transmitting', async () => {
    const signal = new AbortController().signal;
    await expect(recognizeBudget('https://example.com/image.jpg',signal)).rejects.toThrow('imagen local');
    image.size=9*1024*1024;
    await expect(recognizeBudget('file:///synthetic.jpg',signal)).rejects.toThrow('8 MB');
    vi.stubGlobal('__DEV__', false);
    await expect(recognizeBudget('file:///synthetic.jpg',signal)).rejects.toThrow('compilación de desarrollo');
    expect(request).not.toHaveBeenCalled();
  });
  it('keeps connection failures and invalid server responses as errors', async () => {
    request.mockRejectedValueOnce(new Error('synthetic offline'));
    await expect(recognizeBudget('file:///synthetic.jpg',new AbortController().signal)).rejects.toThrow('conectar');
    request.mockResolvedValueOnce(new Response('unparseable'));
    await expect(recognizeBudget('file:///synthetic.jpg',new AbortController().signal)).rejects.toThrow('respuesta no válida');
    request.mockResolvedValueOnce(new Response('null'));
    await expect(recognizeBudget('file:///synthetic.jpg',new AbortController().signal)).rejects.toThrow('respuesta no válida');
    request.mockResolvedValueOnce(new Response(JSON.stringify({error:'Lectura ocupada'}),{status:503}));
    await expect(recognizeBudget('file:///synthetic.jpg',new AbortController().signal)).rejects.toThrow('Lectura ocupada');
  });
});
