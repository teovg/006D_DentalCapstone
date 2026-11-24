import 'react-native-url-polyfill/auto';
import 'expo-sqlite/localStorage/install';

import { createClient } from '@supabase/supabase-js';
import { registerPasswordRecovery } from './passwordRecovery';

export function createDentalTrackSupabaseClient(url: string, publishableKey: string) {
  return registerPasswordRecovery(createClient(url, publishableKey, {
    auth: {
      storage: localStorage,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
    },
  }), localStorage);
}
