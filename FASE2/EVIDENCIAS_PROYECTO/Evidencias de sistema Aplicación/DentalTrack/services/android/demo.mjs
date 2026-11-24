import { spawn } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join, resolve } from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';
import { expoArguments, localDemoEnvironment } from './options.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const env = localDemoEnvironment(process.env);
// La demo es explícitamente local; `npm start` conserva el acceso normal de cuentas.
if (process.platform === 'win32' && env.LOCALAPPDATA) {
  const manifest = join(env.LOCALAPPDATA, 'DentalTrackDev', 'toolchain.json');
  if (existsSync(manifest)) {
    const installed = JSON.parse(readFileSync(manifest, 'utf8'));
    env.JAVA_HOME ||= installed.java;
    env.ANDROID_HOME ||= installed.sdk;
  }
  env.ANDROID_HOME ||= join(env.LOCALAPPDATA, 'Android', 'Sdk');
}
if (env.ANDROID_HOME) {
  const pathKey = Object.keys(env).find(key => key.toLowerCase() === 'path') ?? 'PATH';
  env[pathKey] = [join(env.ANDROID_HOME, 'platform-tools'), join(env.ANDROID_HOME, 'emulator'), env[pathKey]].join(process.platform === 'win32' ? ';' : ':');
}
console.log('DentalTrack · demo local Android, sin cuenta ni conexión a Supabase. No borra datos guardados.');
const args = expoArguments(process.argv.slice(2));
const child = spawn(process.execPath, [createRequire(import.meta.url).resolve('expo/bin/cli'), ...args], {
  cwd: root, env, stdio: 'inherit', windowsHide: true,
});
child.on('error', error => { console.error(error.message); process.exitCode = 1; });
child.on('exit', code => { process.exitCode = code ?? 1; });
process.on('SIGINT', () => child.kill('SIGINT'));
process.on('SIGTERM', () => child.kill('SIGTERM'));
