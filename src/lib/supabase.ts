// Cliente Supabase para React Native. La sesión (incluye el refresh token
// de larga duración) se persiste cifrada en expo-secure-store (Keychain /
// Keystore) vía SecureStoreAdapter, no en AsyncStorage en texto plano.
import 'react-native-url-polyfill/auto';
import { createClient } from '@supabase/supabase-js';
import { AppState } from 'react-native';
import { SUPABASE_ANON_KEY, SUPABASE_URL } from '../config';
import { SecureStoreAdapter } from './secure-storage';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: SecureStoreAdapter,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

// Refresca el token automáticamente mientras la app está en foreground.
AppState.addEventListener('change', (state) => {
  if (state === 'active') supabase.auth.startAutoRefresh();
  else supabase.auth.stopAutoRefresh();
});

export async function getAccessToken(): Promise<string | null> {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) {
    const { data } = await supabase.auth.refreshSession();
    return data.session?.access_token ?? null;
  }
  const expiresAt = session.expires_at ?? 0;
  const nowSec = Math.floor(Date.now() / 1000);
  if (expiresAt - nowSec < 60) {
    const { data } = await supabase.auth.refreshSession();
    return data.session?.access_token ?? session.access_token;
  }
  return session.access_token;
}
