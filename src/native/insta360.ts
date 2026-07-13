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
import { requireOptionalNativeModule } from 'expo';

export type Insta360State =
  | 'disconnected'
  | 'connecting'
  | 'connected'
  | 'capturing';

export interface Insta360Photo {
  /** file:// local de la toma 360 equirectangular ya descargada del dispositivo. */
  uri: string;
  /** Ancho/alto de la equirectangular (para el visor 360), si el SDK los provee. */
  width?: number;
  height?: number;
}

export interface Insta360NativeModule {
  /** Estado actual de la conexión con la cámara. */
  getState(): Insta360State;
  /** Conecta a la cámara por WiFi (hotspot del dispositivo) y arranca el heartbeat. */
  connect(): Promise<void>;
  /** Cierra la conexión. */
  disconnect(): Promise<void>;
  /** Toma una foto 360 en modo single y la descarga a un archivo local. */
  capture360(): Promise<Insta360Photo>;
  /** Nombre/modelo de la cámara conectada (X5, X4, ONE X2, …), si hay. */
  getCameraName(): string | null;
  addListener(event: 'stateChange', listener: (state: Insta360State) => void): { remove(): void };
}

const native = requireOptionalNativeModule<Insta360NativeModule>('Insta360');

/** true solo si el módulo nativo del SDK está compilado en este build. */
export function isInsta360Available(): boolean {
  return native != null;
}

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

export async function capture360(): Promise<Insta360Photo> {
  if (!native) throw new Error('INSTA360_NOT_AVAILABLE');
  return native.capture360();
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
