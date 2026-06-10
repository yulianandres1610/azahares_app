// Endpoints de inventario de IBC totes (1000L).
import * as FileSystem from 'expo-file-system/legacy';
import { apiFetch } from './client';
import { putSigned } from './containers';

export type IbcStatus = 'created' | 'available' | 'in_container' | 'damaged' | 'delivered';
export type IbcMediaKind = 'front' | 'back' | 'top' | 'valve' | 'label' | 'seal' | 'other';

export interface IbcListItem {
  id: string;
  ibcNumber: string;
  status: IbcStatus;
  capacityLiters: string;
  sealNumber: string | null;
  lotNumber: string | null;
  productId: string | null;
  productName: string | null;
  providerId: string | null;
  createdAt: string;
  photoCount: number;
}

export interface IbcMedia {
  id: string;
  kind: IbcMediaKind;
  fileName: string;
  mimeType: string | null;
  uploadedAt: string;
  previewUrl: string | null;
}

export interface IbcItem {
  id: string;
  ibcNumber: string;
  publicToken: string | null;
  productId: string | null;
  productName: string | null;
  providerId: string | null;
  capacityLiters: string;
  status: IbcStatus;
  sealNumber: string | null;
  lotNumber: string | null;
  notes: string | null;
  containerId: string | null;
  createdAt: string;
  updatedAt: string;
  media: IbcMedia[];
}

export interface IbcLabelData {
  ibcNumber: string;
  barcodeValue: string;
  publicToken: string;
  productType: string | null;
  providerName: string | null;
  capacityLiters: number;
  sealNumber: string | null;
  lotNumber: string | null;
  status: IbcStatus;
  createdAt: string;
}

export const listIbcs = () => apiFetch<IbcListItem[]>('/ibcs');
export const getIbc = (id: string) => apiFetch<IbcItem>(`/ibcs/${id}`);
export const createIbcs = (dto: {
  productId: string;
  count?: number;
  capacityLiters?: number;
  sealNumber?: string;
  lotNumber?: string;
  notes?: string;
}) => apiFetch<IbcItem[]>('/ibcs', { method: 'POST', body: dto });
export const updateIbc = (
  id: string,
  patch: { status?: IbcStatus; sealNumber?: string; lotNumber?: string; notes?: string; containerId?: string | null },
) => apiFetch<IbcItem>(`/ibcs/${id}`, { method: 'PATCH', body: patch });
export const deleteIbc = (id: string) => apiFetch<{ ok: true }>(`/ibcs/${id}`, { method: 'DELETE' });
export const getIbcLabel = (id: string) => apiFetch<IbcLabelData>(`/ibcs/${id}/label`);
export const deleteIbcMedia = (id: string, mediaId: string) =>
  apiFetch<{ ok: true }>(`/ibcs/${id}/media/${mediaId}`, { method: 'DELETE' });

// Sube una foto de inspección del IBC (signed URL + PUT + registro).
export async function uploadIbcMedia(
  id: string,
  kind: IbcMediaKind,
  fileUri: string,
  mimeType: string,
  onProgress?: (pct: number) => void,
): Promise<IbcMedia> {
  const fileName = fileUri.split('/').pop() || 'media';
  const { uploadUrl, path } = await apiFetch<{ uploadUrl: string; path: string }>(
    `/ibcs/${id}/media/upload-url`,
    { method: 'POST', body: { fileName } },
  );
  await putSigned(uploadUrl, fileUri, mimeType, onProgress);
  const info = await FileSystem.getInfoAsync(fileUri);
  return apiFetch<IbcMedia>(`/ibcs/${id}/media`, {
    method: 'POST',
    body: { kind, storagePath: path, fileName, mimeType, sizeBytes: (info as any).size ?? undefined },
  });
}
