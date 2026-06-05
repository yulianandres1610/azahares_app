// Endpoints de notificaciones (reales del backend).
import { apiFetch } from './client';

export interface NotificationDto {
  id: string;
  type: string;
  title: string;
  body: string | null;
  link: string | null;
  metadata: Record<string, unknown> | null;
  readAt: string | null;
  createdAt: string;
}

export function listNotifications(): Promise<{ items: NotificationDto[]; unreadCount: number }> {
  return apiFetch('/notifications');
}

export function markNotifReadApi(id: string): Promise<unknown> {
  return apiFetch(`/notifications/${id}/read`, { method: 'POST' });
}

export function markAllNotifsReadApi(): Promise<unknown> {
  return apiFetch('/notifications/mark-all-read', { method: 'POST' });
}

export function removeNotifApi(id: string): Promise<unknown> {
  return apiFetch(`/notifications/${id}`, { method: 'DELETE' });
}

export function clearNotifsApi(): Promise<unknown> {
  return apiFetch('/notifications', { method: 'DELETE' });
}
