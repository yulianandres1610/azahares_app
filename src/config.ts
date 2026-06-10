// Configuración pública. Los valores vienen de variables EXPO_PUBLIC_* (.env).
export const SUPABASE_URL =
  process.env.EXPO_PUBLIC_SUPABASE_URL ?? 'https://xxxxxxxxxxxx.supabase.co';
export const SUPABASE_ANON_KEY =
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '';
export const API_URL =
  process.env.EXPO_PUBLIC_API_URL ?? 'https://api.azaharesfuel.com';

// Link público para el QR de la etiqueta (mismo dominio que la web).
export const PUBLIC_WEB_URL = 'https://azaharesfuel.com';

// Token público de Mapbox (pk.*) para la Static Images API del mapa de GPS.
// Mismo token que usa la web (NEXT_PUBLIC_MAPBOX_TOKEN). Si está vacío, el
// mapa cae al render decorativo SVG.
export const MAPBOX_TOKEN = process.env.EXPO_PUBLIC_MAPBOX_TOKEN ?? '';

export const CONFIG_OK =
  SUPABASE_URL.includes('.supabase.co') &&
  !SUPABASE_URL.includes('xxxxxxxx') &&
  SUPABASE_ANON_KEY.length > 20;
