import { spawn } from 'node:child_process';
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { dirname, extname, resolve, sep } from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const output = resolve(root, 'dist-demo-clase');
const env = { ...process.env, EXPO_NO_DOTENV: '1', EXPO_NO_TELEMETRY: '1', EXPO_OFFLINE: '1' };
for (const key of Object.keys(env)) if (key.startsWith('EXPO_PUBLIC_SUPABASE_') || key === 'EXPO_PUBLIC_UI_REVIEW') delete env[key];
const children = [];
let server;
let stopping = false;
function stop(code = 0) {
  if (stopping) return;
  stopping = true;
  server?.close();
  for (const child of children) if (child.exitCode === null) child.kill();
  process.exitCode = code;
}
process.on('SIGINT', () => stop());
process.on('SIGTERM', () => stop());

const build = spawn(process.execPath, [createRequire(import.meta.url).resolve('expo/bin/cli'), 'export', '--platform', 'web', '--output-dir', output], { cwd: root, env, stdio: 'inherit', windowsHide: true });
children.push(build);
build.on('error', error => { console.error(error.message); stop(1); });
build.on('exit', async code => {
  if (code !== 0) { stop(code ?? 1); return; }
  const health = await fetch('http://127.0.0.1:8124/health', { signal: AbortSignal.timeout(1500) }).then(r => r.ok).catch(() => false);
  if (!health) {
    const ocr = spawn(process.execPath, [resolve(root, 'services/ocr/server.mjs')], { cwd: root, env, stdio: 'inherit', windowsHide: true });
    children.push(ocr);
    ocr.on('error', error => { console.error(error.message); stop(1); });
    ocr.on('exit', exit => { if (!stopping) stop(exit ?? 1); });
  }
  const types = { '.html':'text/html; charset=utf-8', '.js':'text/javascript', '.css':'text/css', '.json':'application/json', '.png':'image/png', '.jpg':'image/jpeg', '.svg':'image/svg+xml', '.ttf':'font/ttf', '.woff2':'font/woff2', '.ico':'image/x-icon' };
  server = createServer(async (request, response) => {
    try {
      if (!['GET','HEAD'].includes(request.method)) { response.writeHead(405); response.end(); return; }
      const url = new URL(request.url, 'http://127.0.0.1:8106');
      const path = resolve(output, `.${decodeURIComponent(url.pathname === '/' ? '/index.html' : url.pathname)}`);
      if (!path.startsWith(output + sep)) { response.writeHead(403); response.end(); return; }
      const data = await readFile(path);
      response.writeHead(200, { 'Content-Type': types[extname(path)] ?? 'application/octet-stream', 'Cache-Control':'no-store', 'X-Content-Type-Options':'nosniff' });
      response.end(request.method === 'HEAD' ? undefined : data);
    } catch { response.writeHead(404); response.end('Archivo no encontrado'); }
  });
  server.on('error', error => { console.error(error.message); stop(1); });
  server.listen(8106, '127.0.0.1', () => console.log('Demo local compilada: http://127.0.0.1:8106 · OCR: http://127.0.0.1:8124/health · Ctrl+C para terminar'));
});
