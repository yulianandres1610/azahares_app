// Endpoints de contenedores + mapeo entre el shape del backend y el de la UI.
import * as FileSystem from 'expo-file-system/legacy';
import { apiFetch } from './client';
import { getAccessToken } from '../supabase';
import { API_URL } from '../../config';
import type { Container } from './types';

// ── Mapeo backend → UI ───────────────────────────────────────
const UNIT_SHORT: Record<string, string> = { liters: 'L', gallons: 'gal', cubic_meters: 'm³' };
const UNIT_LONG: Record<string, string> = { L: 'liters', gal: 'gallons', 'm³': 'cubic_meters' };
const TYPE_TO_UI: Record<string, string> = { refrigerated: 'reefer', fuel: 'fuel', dry: 'dry' };
const TYPE_TO_API: Record<string, string> = { reefer: 'refrigerated', fuel: 'fuel', dry: 'dry' };

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
    price: raw.price ?? null,
    currency: raw.currency ?? 'USD',
    status: raw.status,
    cycle: raw.cycle ?? null,
    updatedAt: raw.updatedAt ?? raw.createdAt ?? null,
    photoUrl: raw.photoUrl ?? null,
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
