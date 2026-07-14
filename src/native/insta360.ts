// Puente JS ↔ módulo nativo del SDK de Insta360 (iOS).
//
// El módulo nativo "Insta360" envuelve el INSCameraSDK (Objective-C/Swift).
// Aquí solo definimos la interfaz que consume la app; mientras el módulo nativo
// no esté compilado en el dev build, `requireOptionalNativeModule` devuelve null
// e `isInsta360Available()` es false — la UI muestra el aviso correspondiente
// en vez de romper.
//
// Flujo que expone el módulo nativo (ver Fase 2 / integración del SDK):
//   connect()      → INSCameraManager.socket().setup() + heartbeat
//   capture360()   → setOptions(photoSubMode=.single) → takePicture → fetchResource
//   disconnect()   → INSCameraManager.socket().shutdown()
import { requireOptionalNativeModule, requireNativeView } from 'expo';
import type { ComponentType } from 'react';

export type Insta360State =
  | 'disconnected'
  | 'connecting'
  | 'connected'
  | 'recording'
  | 'downloading';

export interface Insta360Video {
  /** file:// local del video 360 ya descargado del dispositivo (.insv/.mp4). */
  uri: string;
  /** Ruta del archivo EN la cámara (para borrarlo tras subir). */
  remoteUri?: string;
  ext?: string;
}

export interface Insta360NativeModule {
  /** Estado actual de la conexión con la cámara. */
  getState(): Insta360State;
  /** Conecta a la cámara por WiFi (hotspot del dispositivo) y arranca el heartbeat. */
  connect(): Promise<void>;
  /** Cierra la conexión. */
  disconnect(): Promise<void>;
  /** Inicia la grabación de video 360 (en la SD de la cámara). */
  startRecording(): Promise<void>;
  /** Detiene la grabación, descarga el video y devuelve su file:// local. */
  stopRecording(): Promise<Insta360Video>;
  /** Borra un archivo de la SD de la cámara (libera memoria tras subir). */
  deleteFromCamera(uri: string): Promise<void>;
  /** Une (stitch) un .insv en un MP4 equirectangular estándar (web + app). */
  stitchToMp4(insvPath: string): Promise<{ uri: string }>;
  /** Nombre/modelo de la cámara conectada (X5, X4, ONE X2, …), si hay. */
  getCameraName(): string | null;
  addListener(event: 'stateChange' | 'downloadProgress' | 'stitchProgress', listener: (payload: any) => void): { remove(): void };
}

const native = requireOptionalNativeModule<Insta360NativeModule>('Insta360');

/** true solo si el módulo nativo del SDK está compilado en este build. */
export function isInsta360Available(): boolean {
  return native != null;
}

/** Vista nativa del reproductor 360 esférico (null si el SDK no está).
 *  Prop `source` = ruta del archivo .insv local. */
export const Insta360PlayerNative: ComponentType<{ source: string; style?: any }> | null =
  native != null
    ? (requireNativeView('Insta360') as ComponentType<{ source: string; style?: any }>)
    : null;

export function getInsta360State(): Insta360State {
  return native ? native.getState() : 'disconnected';
}

export function getCameraName(): string | null {
  return native ? native.getCameraName() : null;
}

export async function connectCamera(): Promise<void> {
  if (!native) throw new Error('INSTA360_NOT_AVAILABLE');
  console.log('[Insta360] connectCamera() → llamando native.connect()');
  try {
    await native.connect();
    console.log('[Insta360] connectCamera() → OK (connected)');
  } catch (e: any) {
    console.log('[Insta360] connectCamera() → ERROR:', e?.message ?? e);
    throw e;
  }
}

export async function disconnectCamera(): Promise<void> {
  if (!native) return;
  return native.disconnect();
}

export async function startRecording(): Promise<void> {
  if (!native) throw new Error('INSTA360_NOT_AVAILABLE');
  return native.startRecording();
}

export async function stopRecording(): Promise<Insta360Video> {
  if (!native) throw new Error('INSTA360_NOT_AVAILABLE');
  return native.stopRecording();
}

export async function deleteFromCamera(uri: string): Promise<void> {
  if (!native || !uri) return;
  return native.deleteFromCamera(uri);
}

export async function stitchToMp4(insvPath: string): Promise<{ uri: string }> {
  if (!native) throw new Error('INSTA360_NOT_AVAILABLE');
  return native.stitchToMp4(insvPath);
}

export function onInsta360StitchProgress(listener: (progress: number) => void): () => void {
  if (!native) return () => {};
  const sub = native.addListener('stitchProgress', (payload: any) => {
    listener(typeof payload === 'number' ? payload : (payload?.progress ?? 0));
  });
  return () => sub.remove();
}

export function onInsta360StateChange(
  listener: (state: Insta360State) => void,
): () => void {
  if (!native) return () => {};
  const sub = native.addListener('stateChange', (payload: any) => {
    // El módulo nativo emite { state: "..." }. Aceptamos también un string suelto.
    const state = (typeof payload === 'string' ? payload : payload?.state) as Insta360State;
    console.log('[Insta360] stateChange →', state);
    listener(state);
  });
  return () => sub.remove();
}

export function onInsta360DownloadProgress(
  listener: (progress: number) => void,
): () => void {
  if (!native) return () => {};
  const sub = native.addListener('downloadProgress', (payload: any) => {
    listener(typeof payload === 'number' ? payload : (payload?.progress ?? 0));
  });
  return () => sub.remove();
}
