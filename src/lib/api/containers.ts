// Endpoints de contenedores.
import * as FileSystem from 'expo-file-system/legacy';
import { apiFetch } from './client';
import { getAccessToken } from '../supabase';
import { API_URL } from '../../config';
import type { Container } from './types';

export function listContainers(): Promise<Container[]> {
  return apiFetch<Container[]>('/containers');
}

export function getContainer(id: string): Promise<Container> {
  return apiFetch<Container>(`/containers/${id}`);
}

export interface CreateContainerDto {
  number: string;
  type: string;
  size?: string;
  capacity?: number;
  unit?: string;
  tare?: number;
  tareUnit?: string;
  ownership?: string;
  price?: number | null;
  currency?: string;
}

export function createContainer(dto: CreateContainerDto): Promise<Container> {
  return apiFetch<Container>('/containers', { method: 'POST', body: dto });
}

export function updateContainer(id: string, patch: Partial<CreateContainerDto> & { status?: string }): Promise<Container> {
  return apiFetch<Container>(`/containers/${id}`, { method: 'PATCH', body: patch });
}

// Subida de imagen de contenedor (2 pasos: signed URL + PUT + registrar).
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
    body: {
      storagePath: path,
      fileName,
      mimeType,
      sizeBytes: (info as any).size ?? undefined,
    },
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
    {
      httpMethod: 'PUT',
      uploadType: FileSystem.FileSystemUploadType.BINARY_CONTENT,
      headers,
    },
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
