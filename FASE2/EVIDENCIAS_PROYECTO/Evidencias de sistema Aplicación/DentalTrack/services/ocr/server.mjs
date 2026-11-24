import { createServer } from 'node:http';
import { Buffer } from 'node:buffer';
import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import process from 'node:process';
import { createWorker } from 'tesseract.js';
import spanish from '@tesseract.js-data/spa';

const port = 8124;
const maxBytes = 8 * 1024 * 1024;
let busy = false;
const python = process.env.DENTALTRACK_OCR_PYTHON ?? fileURLToPath(new URL('../../tmp/paddle-venv/Scripts/python.exe', import.meta.url));
const engine = process.env.DENTALTRACK_OCR_ENGINE ?? (existsSync(python) ? 'paddle' : 'tesseract');

function recognizeWithPaddle(bytes) {
  return new Promise((resolve, reject) => {
    const child = spawn(python, [fileURLToPath(new URL('./paddle_runner.py', import.meta.url))], {
      stdio: ['pipe', 'pipe', 'ignore'], windowsHide: true,
      env: { ...process.env, PYTHONIOENCODING: 'utf-8' },
    });
    const chunks = [];
    let size = 0;
    const timeout = setTimeout(() => { child.kill(); reject(new Error('OCR timeout')); }, 90_000);
    child.on('error', reject);
    child.stdout.on('data', (chunk) => {
      size += chunk.length;
      if (size > 2 * 1024 * 1024) { child.kill(); reject(new Error('OCR output exceeds limit')); }
      else chunks.push(chunk);
    });
    child.stdin.on('error', () => {});
    child.on('close', (code) => {
      clearTimeout(timeout);
      if (code !== 0) return reject(new Error('OCR process failed'));
      try { resolve(JSON.parse(Buffer.concat(chunks).toString('utf8'))); }
      catch { reject(new Error('Invalid OCR response')); }
    });
    child.stdin.end(bytes);
  });
}

const server = createServer({ requestTimeout: 20_000 }, async (request, response) => {
  const { origin, host } = request.headers;
  const send = (status, body) => {
    response.writeHead(status, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' });
    response.end(JSON.stringify(body));
  };

  if (host !== `127.0.0.1:${port}` || (origin && !/^http:\/\/(127\.0\.0\.1|localhost)(:\d+)?$/.test(origin))) {
    return send(403, { error: 'Origen no permitido.' });
  }
  if (origin) {
    response.setHeader('Access-Control-Allow-Origin', origin);
    response.setHeader('Vary', 'Origin');
  }
  if (request.url === '/health' && request.method === 'GET') return send(200, { engine: engine === 'paddle' ? 'paddleocr-v5-latin' : 'tesseract-spa' });
  if (request.url !== '/recognize') return send(404, { error: 'Ruta no encontrada.' });
  if (request.method === 'OPTIONS') {
    response.writeHead(204, { 'Access-Control-Allow-Methods': 'POST', 'Access-Control-Allow-Headers': 'Content-Type' });
    return response.end();
  }
  if (request.method !== 'POST') return send(405, { error: 'Usa POST.' });
  if (busy) return send(503, { error: 'Ya hay una lectura en curso.' });
  if (!['image/png', 'image/jpeg'].includes(request.headers['content-type'])) return send(415, { error: 'Elige una imagen JPG o PNG.' });
  const length = Number(request.headers['content-length']);
  if (!Number.isInteger(length) || length < 1 || length > maxBytes) return send(413, { error: 'La imagen debe ocupar como máximo 8 MB.' });

  busy = true;
  let worker;
  let timer;
  try {
    const chunks = [];
    for await (const chunk of request) chunks.push(chunk);
    const bytes = Buffer.concat(chunks);
    const isPng = bytes.length >= 24 && bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
    const isJpeg = bytes.length >= 4 && bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255;
    if (!isPng && !isJpeg) return send(415, { error: 'El archivo no es una imagen JPG o PNG válida.' });

    if (engine === 'paddle') return send(200, await recognizeWithPaddle(bytes));

    worker = await createWorker(spanish.code, 1, { langPath: spanish.langPath, gzip: spanish.gzip, cacheMethod: 'none', errorHandler: () => {} });
    const result = await Promise.race([
      worker.recognize(bytes),
      new Promise((_, reject) => { timer = setTimeout(() => reject(new Error('OCR timeout')), 30_000); }),
    ]);
    send(200, { text: result.data.text.trim(), lines: [], engine: 'tesseract-spa' });
  } catch {
    if (!response.destroyed) send(422, { error: 'No se pudo leer la imagen. Prueba con una foto más nítida.' });
  } finally {
    clearTimeout(timer);
    try { await worker?.terminate(); } finally { busy = false; }
  }
});

server.listen(port, '127.0.0.1', () => console.log(`OCR local: http://127.0.0.1:${port}`));
