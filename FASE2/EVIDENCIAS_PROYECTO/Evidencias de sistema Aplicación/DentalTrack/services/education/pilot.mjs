import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';
import { publicCases, runEducationPilot } from './web.mjs';
import { runBravePilot } from './brave.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const envFile = resolve(root, '.env.education.local');
if (existsSync(envFile)) process.loadEnvFile(envFile);
const caseIndex = Number(process.argv[2] ?? '1') - 1;
if (!Number.isInteger(caseIndex) || !publicCases[caseIndex]) {
  console.error('Elige un caso público del 1 al 10; no se aceptan documentos o datos personales.');
  process.exitCode = 1;
} else {
  try {
    const term = publicCases[caseIndex];
    const providerIndex = process.argv.indexOf('--provider');
    const provider = providerIndex < 0 ? 'tavily' : process.argv[providerIndex + 1];
    if (!['tavily', 'brave'].includes(provider)) throw new Error('Elige --provider tavily o --provider brave.');
    if (provider === 'brave') {
      const result = await runBravePilot({ term, apiKey: process.env.BRAVE_ANSWERS_API_KEY });
      console.log(JSON.stringify({ term, status: result.status, sources: result.sources.length, nominalCostUSD: result.costUSD, publicationApproved: false, savedToFile: false }));
      if (process.argv.includes('--show')) {
        console.log(result.explanation);
        for (const source of result.sources) console.log(`${source.id}: ${source.url}`);
      }
    } else {
      const result = await runEducationPilot({ term, apiKey: process.env.TAVILY_API_KEY, keyless: process.argv.includes('--keyless') });
      const directory = resolve(root, 'tmp/ayuda-web-evidencias/piloto-web');
      mkdirSync(directory, { recursive: true });
      const output = resolve(directory, `caso-${caseIndex + 1}.json`);
      writeFileSync(output, JSON.stringify({ checkedAt: new Date().toISOString(), case: caseIndex + 1, result, review: 'Evaluación cerrada: solo referencias encontradas. La generación automática no está aprobada; no se devuelve una explicación generada.' }, null, 2));
      console.log(`Caso ${caseIndex + 1}: ${result.status}. Resultado para revisión: ${output}`);
    }
  } catch (error) {
    console.error(error.name === 'TimeoutError' ? 'El piloto agotó su tiempo de espera. No se reintentó; una repetición puede consumir créditos.' : error.message);
    process.exitCode = 1;
  }
}
