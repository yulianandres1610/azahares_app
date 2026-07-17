// Endpoints de contenedores + mapeo entre el shape del backend y el de la UI.
import * as FileSystem from 'expo-file-system/legacy';
import { apiFetch } from './client';
import { getAccessToken } from '../supabase';
import { API_URL } from '../../config';
import type { Container, ContainerGps, GpsFix, GpsSync } from './types';

// ── Mapeo backend → UI ───────────────────────────────────────
const UNIT_SHORT: Record<string, string> = { liters: 'L', gallons: 'gal', cubic_meters: 'm³' };
const UNIT_LONG: Record<string, string> = { L: 'liters', gal: 'gallons', 'm³': 'cubic_meters' };
const TYPE_TO_UI: Record<string, string> = { refrigerated: 'reefer', fuel: 'fuel', dry: 'dry' };
const TYPE_TO_API: Record<string, string> = { reefer: 'refrigerated', fuel: 'fuel', dry: 'dry' };

// ── GPS helpers ──────────────────────────────────────────────
const SYNC_MAP: Record<string, GpsSync> = {
  ok: 'connected',
  stale: 'stale',
  no_data: 'nodata',
  not_linked: 'nodata',
  not_configured: 'nodata',
  resolution_failed: 'error',
  api_error: 'error',
};

function degToCompass(deg: number | null | undefined): string {
  if (deg == null || !Number.isFinite(deg)) return '—';
  const dirs = ['N', 'NE', 'E', 'SE', 'S', 'SO', 'O', 'NO'];
  return dirs[Math.round(((deg % 360) / 45)) % 8];
}

// Proyección decorativa lat/lng → 0..1 (para el mapa estilizado, no geográfico).
function frac(n: number): number {
  const f = Math.abs(n) % 1;
  return 0.12 + f * 0.76; // mantener el pin dentro de los márgenes visibles
}

function mapFix(raw: any): GpsFix | null {
  if (raw == null) return null;
  const lat = raw.lat != null ? Number(raw.lat) : raw.lastLat != null ? Number(raw.lastLat) : null;
  const lng = raw.lng != null ? Number(raw.lng) : raw.lastLng != null ? Number(raw.lastLng) : null;
  if (lat == null || lng == null || !Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  const seen = raw.lastSeenAt ?? raw.recordedAt ?? raw.receivedAt ?? raw.ts ?? null;
  const mph = raw.lastSpeedMph != null ? Number(raw.lastSpeedMph) : raw.speedMph != null ? Number(raw.speedMph) : 0;
  const deg = raw.lastHeadingDeg != null ? Number(raw.lastHeadingDeg) : raw.headingDeg != null ? Number(raw.headingDeg) : null;
  return {
    lat,
    lng,
    x: frac(lng),
    y: frac(lat),
    address: raw.lastAddress ?? raw.address ?? null,
    ts: seen ? Date.parse(seen) : null,
    speed: Math.round((mph || 0) * 1.60934),
    heading: degToCompass(deg),
    accuracy: null,
  };
}

function mapGps(raw: any): ContainerGps {
  const g = raw ?? {};
  const fix = mapFix(g);
  return {
    enabled: !!g.enabled,
    assetId: g.samsaraAssetId ?? null,
    gatewaySerial: g.samsaraGatewaySerial ?? null,
    lastFix: fix,
    sync: SYNC_MAP[g.lastSyncStatus as string] ?? 'nodata',
    geofence: g.currentGeofence ? { name: g.currentGeofence.name, distanceM: Math.round(g.currentGeofence.distanceM) } : null,
    track: [],
  };
}

function mapContainer(raw: any): Container {
  return {
    id: raw.id,
    number: raw.containerNumber ?? raw.number ?? '',
    type: TYPE_TO_UI[raw.type] ?? raw.type,
    size: raw.size ?? null,
    capacity: raw.capacityValue != null ? Number(raw.capacityValue) : raw.capacity ?? null,
    unit: UNIT_SHORT[raw.capacityUnit] ?? raw.capacityUnit ?? raw.unit ?? null,
    tare: raw.tareWeightKg != null ? Number(raw.tareWeightKg) : raw.tare ?? null,
    tareUnit: raw.tareWeightUnit ?? raw.tareUnit ?? 'kg',
    ownership: raw.ownership ?? null,
    // El detalle (getContainer) trae rent/owned; la lista no. Derivamos el precio.
    price:
      raw.rent?.cost != null
        ? Number(raw.rent.cost)
        : raw.owned?.purchaseCost != null
        ? Number(raw.owned.purchaseCost)
        : raw.price ?? null,
    currency: raw.currency ?? 'USD',
    status: raw.status,
    cycle: raw.cycle ?? null,
    visualPhotos: raw.visualPhotos ?? 0,
    updatedAt: raw.updatedAt ?? raw.createdAt ?? null,
    photoUrl: raw.photoUrl ?? null,
    gps: mapGps(raw.gps),
  };
}

export async function listContainers(): Promise<Container[]> {
  const rows = await apiFetch<any[]>('/containers');
  return Array.isArray(rows) ? rows.map(mapContainer) : [];
}

export async function getContainer(id: string): Promise<Container> {
  const raw = await apiFetch<any>(`/containers/${id}`);
  return mapContainer(raw);
}

export function deleteContainer(id: string): Promise<unknown> {
  return apiFetch(`/containers/${id}`, { method: 'DELETE' });
}

// Activar / vincular GPS de un contenedor existente. Igual que en la web:
// se vincula con el SERIAL del gateway (el asset lo resuelve el backend).
export async function enableGps(id: string, gatewaySerial: string): Promise<Container> {
  const body = { gpsEnabled: true, samsaraGatewaySerial: gatewaySerial.trim() };
  const raw = await apiFetch<any>(`/containers/${id}`, { method: 'PATCH', body });
  return mapContainer(raw);
}

// Fotos de creación (registro) del contenedor.
export interface ContainerImage {
  id: string;
  url: string | null;
  fileName: string;
}
export async function listContainerImages(id: string): Promise<ContainerImage[]> {
  const rows = await apiFetch<any[]>(`/containers/${id}/images`);
  return Array.isArray(rows)
    ? rows.map((r) => ({ id: r.id, url: r.signedUrl ?? null, fileName: r.fileName }))
    : [];
}

// Elimina una foto de creación (el backend borra de Storage + BD y audita).
export async function deleteContainerImage(containerId: string, imageId: string): Promise<void> {
  await apiFetch<void>(`/containers/${containerId}/images/${imageId}`, { method: 'DELETE' });
}

// Historial de ubicaciones (recorrido) de un contenedor.
export async function listLocations(id: string, limit = 50): Promise<GpsFix[]> {
  const rows = await apiFetch<any[]>(`/containers/${id}/locations?limit=${limit}`);
  return Array.isArray(rows) ? rows.map(mapFix).filter((f): f is GpsFix => f != null) : [];
}

// Input de la UI (wizard) — campos amigables.
export interface NewContainerInput {
  number: string;
  type: string; // fuel | dry | reefer
  size: string;
  capacity: number;
  unit: string; // L | gal | m³
  tare: number;
  tareUnit: string; // kg | lb
  ownership: string; // owned | rented
  price: number | null;
  gpsEnabled?: boolean;
  gpsSerial?: string; // serial del gateway (el backend resuelve el asset)
}

export async function createContainer(input: NewContainerInput): Promise<Container> {
  const apiType = TYPE_TO_API[input.type] ?? input.type;
  // unidad de capacidad: combustible L/gal; seco/refrigerado siempre m³
  const capacityUnit = apiType === 'fuel' ? UNIT_LONG[input.unit] ?? 'liters' : 'cubic_meters';
  const body: any = {
    containerNumber: input.number,
    type: apiType,
    size: input.size,
    capacityValue: input.capacity,
    capacityUnit,
    tareWeightKg: input.tare,
    tareWeightUnit: input.tareUnit,
    ownership: input.ownership,
  };
  if (input.gpsEnabled && input.gpsSerial && input.gpsSerial.trim()) {
    body.gpsEnabled = true;
    body.samsaraGatewaySerial = input.gpsSerial.trim();
  }
  const price = input.price ?? 0;
  if (input.ownership === 'rented') {
    body.rent = { cost: price, period: 'monthly' };
  } else {
    body.owned = {
      purchaseCost: price,
      purchasedAt: new Date().toISOString().slice(0, 10),
      annualDepreciationPct: 0,
    };
  }
  const raw = await apiFetch<any>('/containers', { method: 'POST', body });
  return mapContainer(raw);
}

// Subida de imagen de contenedor (2 pasos).
export async function uploadContainerImage(
  containerId: string,
  fileUri: string,
  mimeType: string,
  onProgress?: (pct: number) => void,
): Promise<void> {
  const fileName = fileUri.split('/').pop() || 'photo.jpg';
  const { uploadUrl, path } = await apiFetch<{ uploadUrl: string; path: string }>(
    `/containers/${containerId}/images/upload-url`,
    { method: 'POST', body: { fileName, mimeType } },
  );
  await putSigned(uploadUrl, fileUri, mimeType, onProgress);
  const info = await FileSystem.getInfoAsync(fileUri);
  await apiFetch(`/containers/${containerId}/images`, {
    method: 'POST',
    body: { storagePath: path, fileName, mimeType, sizeBytes: (info as any).size ?? undefined },
  });
}

// PUT binario a una signed URL con progreso (expo-file-system).
export async function putSigned(
  uploadUrl: string,
  fileUri: string,
  mimeType: string,
  onProgress?: (pct: number) => void,
): Promise<void> {
  const headers: Record<string, string> = { 'Content-Type': mimeType, 'x-upsert': 'false' };
  const task = FileSystem.createUploadTask(
    uploadUrl,
    fileUri,
    { httpMethod: 'PUT', uploadType: FileSystem.FileSystemUploadType.BINARY_CONTENT, headers },
    (data) => {
      if (onProgress && data.totalBytesExpectedToSend > 0) {
        onProgress(Math.round((data.totalBytesSent / data.totalBytesExpectedToSend) * 100));
      }
    },
  );
  const res = await task.uploadAsync();
  if (!res || res.status < 200 || res.status >= 300) {
    throw new Error(`Upload PUT falló (${res?.status}): ${res?.body}`);
  }
}

export { API_URL, getAccessToken };
