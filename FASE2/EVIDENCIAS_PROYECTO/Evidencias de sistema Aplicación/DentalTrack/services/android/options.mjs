export function localDemoEnvironment(source) {
  const env = { ...source, EXPO_NO_DOTENV: '1', EXPO_NO_TELEMETRY: '1' };
  for (const key of Object.keys(env)) {
    if (key.startsWith('EXPO_PUBLIC_SUPABASE_') || key === 'EXPO_PUBLIC_UI_REVIEW') delete env[key];
  }
  return env;
}

export function expoArguments(args) {
  if (args.includes('--serve')) return ['start', '--dev-client', '--localhost', '--port', '8081', '--max-workers', '1', ...args.filter(arg => arg !== '--serve')];
  return ['run:android', ...(args.includes('--no-bundler') ? [] : ['--port', '8081']), ...args];
}
