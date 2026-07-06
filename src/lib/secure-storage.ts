// Adaptador de almacenamiento para la sesión de Supabase respaldado en
// expo-secure-store (Keychain iOS / Keystore Android). Reemplaza a
// AsyncStorage, que guarda el refresh token en texto plano y es extraíble
// con acceso físico / backups.
//
// SecureStore tiene un límite de ~2KB por valor; el token de Supabase
// (access + refresh + user) suele superarlo, así que fragmentamos el valor
// en chunks. Además migramos de forma transparente cualquier sesión previa
// que haya quedado en AsyncStorage (para no desloguear a los usuarios
// existentes) y la borramos de ahí.
import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';

const CHUNK_SIZE = 1800; // < 2048 bytes (JWT/base64 son ASCII: 1 char ≈ 1 byte)

// SecureStore solo acepta claves [A-Za-z0-9._-]. Las claves de Supabase
// (p. ej. sb-<ref>-auth-token) ya cumplen, pero saneamos por las dudas.
function safeKey(key: string): string {
  return key.replace(/[^A-Za-z0-9._-]/g, '_');
}

const countKey = (key: string) => `${safeKey(key)}.__n`;
const chunkKey = (key: string, i: number) => `${safeKey(key)}.${i}`;

async function clearChunks(key: string): Promise<void> {
  const nRaw = await SecureStore.getItemAsync(countKey(key));
  const n = nRaw ? parseInt(nRaw, 10) : 0;
  const deletions: Promise<void>[] = [SecureStore.deleteItemAsync(countKey(key))];
  for (let i = 0; i < n; i++) deletions.push(SecureStore.deleteItemAsync(chunkKey(key, i)));
  await Promise.all(deletions);
}

async function writeChunks(key: string, value: string): Promise<void> {
  await clearChunks(key);
  const chunks: string[] = [];
  for (let i = 0; i < value.length; i += CHUNK_SIZE) {
    chunks.push(value.slice(i, i + CHUNK_SIZE));
  }
  await Promise.all(
    chunks.map((c, i) => SecureStore.setItemAsync(chunkKey(key, i), c)),
  );
  await SecureStore.setItemAsync(countKey(key), String(chunks.length));
}

async function readChunks(key: string): Promise<string | null> {
  const nRaw = await SecureStore.getItemAsync(countKey(key));
  if (!nRaw) return null;
  const n = parseInt(nRaw, 10);
  if (!Number.isFinite(n) || n <= 0) return null;
  const parts: string[] = [];
  for (let i = 0; i < n; i++) {
    const part = await SecureStore.getItemAsync(chunkKey(key, i));
    if (part == null) return null; // fragmento faltante → sesión corrupta
    parts.push(part);
  }
  return parts.join('');
}

export const SecureStoreAdapter = {
  async getItem(key: string): Promise<string | null> {
    const fromSecure = await readChunks(key);
    if (fromSecure != null) return fromSecure;

    // Migración transparente desde AsyncStorage (sesiones previas).
    try {
      const legacy = await AsyncStorage.getItem(key);
      if (legacy != null) {
        await writeChunks(key, legacy);
        await AsyncStorage.removeItem(key);
        return legacy;
      }
    } catch {
      // AsyncStorage no disponible: ignoramos.
    }
    return null;
  },

  async setItem(key: string, value: string): Promise<void> {
    await writeChunks(key, value);
  },

  async removeItem(key: string): Promise<void> {
    await clearChunks(key);
    try {
      await AsyncStorage.removeItem(key);
    } catch {
      // ignore
    }
  },
};
