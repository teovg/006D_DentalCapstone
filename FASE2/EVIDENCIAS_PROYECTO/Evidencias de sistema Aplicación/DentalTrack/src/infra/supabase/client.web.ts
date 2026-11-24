import 'react-native-url-polyfill/auto';
import { createClient } from '@supabase/supabase-js';
import { registerPasswordRecovery } from './passwordRecovery';

// Browsers already provide localStorage. The native SQLite polyfill would pull
// its WASM worker into development web builds even though it is never needed.
export function createDentalTrackSupabaseClient(url: string, publishableKey: string) {
  return registerPasswordRecovery(createClient(url, publishableKey, {
    auth: {
      storage: localStorage,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true,
    },
  }), localStorage, window.location.href);
}
