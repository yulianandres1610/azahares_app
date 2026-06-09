// WhatsApp (Evolution) — mismo backend que el perfil web.
// Permite ver el estado de la instance vinculada y conectar/desconectar.
import { apiFetch } from './client';

export interface WhatsappInstance {
  status: 'disconnected' | 'connecting' | 'connected' | 'error';
  instanceName: string;
  phoneNumber: string | null;
  displayName: string | null;
  profilePictureUrl: string | null;
  lastConnectedAt: string | null;
  lastDisconnectReason: string | null;
}

export interface WhatsappQr {
  qrDataUrl: string | null;
  pairingCode: string | null;
  generatedAt: string;
}

export interface WhatsappDisconnectResult {
  logoutOk: boolean;
  deleteOk: boolean;
  error: string | null;
}

export function getMyWhatsappInstance(): Promise<WhatsappInstance | null> {
  return apiFetch<WhatsappInstance | null>('/whatsapp/me');
}

export function connectWhatsapp(): Promise<WhatsappQr> {
  return apiFetch<WhatsappQr>('/whatsapp/connect', { method: 'POST' });
}

export function refreshWhatsappStatus(): Promise<WhatsappInstance> {
  return apiFetch<WhatsappInstance>('/whatsapp/status');
}

export function disconnectWhatsapp(): Promise<WhatsappDisconnectResult> {
  return apiFetch<WhatsappDisconnectResult>('/whatsapp/disconnect', { method: 'DELETE' });
}
