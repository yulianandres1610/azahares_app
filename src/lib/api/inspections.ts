// Endpoints de inspecciones de contenedor.
import * as FileSystem from 'expo-file-system/legacy';
import { apiFetch } from './client';
import { putSigned } from './containers';
import type { ContainerInspection, InspectionLabelData, InspectionMedia, InspectionMediaKind } from './types';

export function listInspections(containerId: string): Promise<ContainerInspection[]> {
  return apiFetch<ContainerInspection[]>(`/containers/${containerId}/inspections`);
}

export function startInspection(containerId: string): Promise<ContainerInspection> {
  return apiFetch<ContainerInspection>(`/containers/${containerId}/inspections/start`, { method: 'POST' });
}

export function markDelivered(containerId: string): Promise<ContainerInspection> {
  return apiFetch<ContainerInspection>(`/containers/${containerId}/inspections/delivered`, { method: 'POST' });
}

export function updateInspection(
  id: string,
  patch: { inspectorName?: string; inspectionCompany?: string; productType?: string; notes?: string },
): Promise<ContainerInspection> {
  return apiFetch<ContainerInspection>(`/container-inspections/${id}`, { method: 'PATCH', body: patch });
}

export function completeVisual(id: string): Promise<ContainerInspection> {
  return apiFetch<ContainerInspection>(`/container-inspections/${id}/complete-visual`, { method: 'POST' });
}

export function completeRefuel(
  id: string,
  dto: { sealTop: string; sealBottom?: string; fuelLevel?: string },
): Promise<ContainerInspection> {
  return apiFetch<ContainerInspection>(`/container-inspections/${id}/complete-refuel`, { method: 'POST', body: dto });
}

export function markAvailable(
  id: string,
  dto: { inspectorName?: string; inspectionCompany?: string; productType?: string } = {},
): Promise<ContainerInspection> {
  return apiFetch<ContainerInspection>(`/container-inspections/${id}/mark-available`, { method: 'POST', body: dto });
}

export function getInspectionLabel(id: string): Promise<InspectionLabelData> {
  return apiFetch<InspectionLabelData>(`/container-inspections/${id}/label`);
}

export function deleteInspection(id: string): Promise<{ ok: true }> {
  return apiFetch<{ ok: true }>(`/container-inspections/${id}`, { method: 'DELETE' });
}

export function deleteInspectionMedia(id: string, mediaId: string): Promise<void> {
  return apiFetch<void>(`/container-inspections/${id}/media/${mediaId}`, { method: 'DELETE' });
}

// Sube media (foto/video/coa) en 2 pasos con progreso, luego registra.
export async function uploadInspectionMedia(
  inspectionId: string,
  kind: InspectionMediaKind,
  fileUri: string,
  mimeType: string,
  onProgress?: (pct: number) => void,
): Promise<InspectionMedia> {
  const fileName = fileUri.split('/').pop() || 'media';
  const { uploadUrl, path } = await apiFetch<{ uploadUrl: string; path: string }>(
    `/container-inspections/${inspectionId}/media/upload-url`,
    { method: 'POST', body: { fileName } },
  );
  await putSigned(uploadUrl, fileUri, mimeType, onProgress);
  const info = await FileSystem.getInfoAsync(fileUri);
  return apiFetch<InspectionMedia>(`/container-inspections/${inspectionId}/media`, {
    method: 'POST',
    body: {
      kind,
      storagePath: path,
      fileName,
      mimeType,
      sizeBytes: (info as any).size ?? undefined,
    },
  });
}

// Detalle público por token (QR) — sin auth.
export function getPublicInspection(token: string): Promise<unknown> {
  return apiFetch(`/public/inspections/${token}`, { auth: false });
}
