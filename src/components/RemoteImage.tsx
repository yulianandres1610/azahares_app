// Imagen remota robusta: descarga el binario con expo-file-system (la misma red
// que la app usa para SUBIR fotos y que sí funciona en el dispositivo) y lo
// muestra desde un archivo local. Evita el cargador de imágenes nativo de RN /
// expo-image, que en este build (New Architecture) se queda colgado al traer
// las signed URLs del storage de Supabase.
import React, { useEffect, useState } from 'react';
import { Image, StyleProp, View, ImageStyle } from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';
import { colors } from '../theme/tokens';
import { Icon } from './Icon';
import { GlobeSpinner } from './GlobeSpinner';

const DIR = FileSystem.cacheDirectory + 'imgcache/';

function keyFor(url: string): string {
  // Clave estable por la RUTA del objeto (sin el token), para cachear entre
  // sesiones aunque la signed URL cambie de token.
  const path = url.split('?')[0];
  let h = 2166136261;
  for (let i = 0; i < path.length; i++) {
    h ^= path.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  const ext = path.toLowerCase().endsWith('.png') ? '.png' : '.jpg';
  return (h >>> 0).toString(16) + ext;
}

export function useLocalImage(url: string | null | undefined) {
  const [uri, setUri] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (!url) {
      setUri(null);
      setErr(null);
      return;
    }
    let alive = true;
    setUri(null);
    setErr(null);
    const to = setTimeout(() => alive && setErr((e) => e ?? 'timeout'), 30000);
    (async () => {
      try {
        const dest = DIR + keyFor(url);
        const info = await FileSystem.getInfoAsync(dest);
        if (info.exists && (info.size ?? 0) > 0) {
          if (alive) setUri(dest);
          return;
        }
        await FileSystem.makeDirectoryAsync(DIR, { intermediates: true }).catch(() => {});
        // Estrategia 1: expo-file-system (la red que ya funciona para subir).
        try {
          const res = await FileSystem.downloadAsync(url, dest);
          if (alive && res.status >= 200 && res.status < 300) {
            setUri(res.uri);
            return;
          }
          if (alive && res.status) {
            setErr('http ' + res.status);
            return;
          }
        } catch (e1: any) {
          // Estrategia 2: fetch → base64 (misma red que auth/API, que sí funciona).
          try {
            const r = await fetch(url);
            if (!r.ok) {
              if (alive) setErr('fetch ' + r.status);
              return;
            }
            const blob = await r.blob();
            const b64: string = await new Promise((resolve, reject) => {
              const fr = new FileReader();
              fr.onload = () => resolve(String(fr.result));
              fr.onerror = () => reject(new Error('reader'));
              fr.readAsDataURL(blob);
            });
            if (alive) setUri(b64);
            return;
          } catch (e2: any) {
            if (alive) setErr('dl:' + String(e1?.message || e1).slice(0, 40));
            return;
          }
        }
      } catch (e: any) {
        if (alive) setErr(String(e?.message || e).slice(0, 50));
      } finally {
        clearTimeout(to);
      }
    })();
    return () => {
      alive = false;
      clearTimeout(to);
    };
  }, [url]);

  return { uri, err };
}

export function RemoteImage({
  url,
  style,
  rounded = 0,
}: {
  url: string | null | undefined;
  style?: StyleProp<ImageStyle>;
  rounded?: number;
}) {
  const { uri, err } = useLocalImage(url);
  return (
    <>
      {uri && <Image source={{ uri }} style={[{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, width: '100%', height: '100%', borderRadius: rounded }, style]} resizeMode="cover" />}
      {!uri && (
        <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center' }}>
          {err || !url ? <Icon name="image" size={26} color="rgba(255,255,255,0.4)" /> : <GlobeSpinner size={34} showHalo={false} />}
        </View>
      )}
    </>
  );
}
