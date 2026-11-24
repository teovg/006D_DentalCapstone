import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const environment = { ...process.env, EXPO_NO_DOTENV: '1', EXPO_NO_TELEMETRY: '1', EXPO_OFFLINE: '1' };
for (const name of ['EXPO_PUBLIC_SUPABASE_URL', 'EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY', 'EXPO_PUBLIC_SUPABASE_ANON_KEY', 'EXPO_PUBLIC_UI_REVIEW']) {
  delete environment[name];
}
const processes = [
  spawn(process.execPath, [fileURLToPath(new URL('./server.mjs', import.meta.url))], { env: environment, stdio: 'inherit', windowsHide: true }),
  spawn(process.execPath, [require.resolve('expo/bin/cli'), 'start', '--clear', '--web', '--localhost', '--port', '8104'], { env: environment, stdio: 'inherit', windowsHide: true }),
];

let stopped = false;
function stop(code) {
  if (stopped) return;
  stopped = true;
  for (const child of processes) if (child.exitCode === null && child.signalCode === null) child.kill();
  process.exitCode = code;
}
for (const child of processes) {
  child.on('error', (error) => { console.error(error.message); stop(1); });
  child.on('exit', (code) => stop(code ?? 0));
}
process.on('SIGINT', () => stop(0));
process.on('SIGTERM', () => stop(0));
