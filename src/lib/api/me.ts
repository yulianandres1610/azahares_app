// Endpoints de perfil + OTP.
import { apiFetch } from './client';
import type { Me } from './types';

export function getMe(): Promise<Me> {
  return apiFetch<Me>('/me');
}

export function updateMe(patch: { fullName?: string; avatarUrl?: string; phone?: string }): Promise<Me> {
  return apiFetch<Me>('/me', { method: 'PATCH', body: patch });
}

// Sube un avatar (multipart). `uri` es un file:// local.
export function uploadAvatar(uri: string, mimeType = 'image/jpeg'): Promise<Me> {
  const form = new FormData();
  const name = uri.split('/').pop() || 'avatar.jpg';
  // @ts-expect-error RN FormData acepta {uri,name,type}
  form.append('file', { uri, name, type: mimeType });
  return apiFetch<Me>('/me/avatar', { method: 'POST', body: form });
}

export function deleteAvatar(): Promise<Me> {
  return apiFetch<Me>('/me/avatar', { method: 'DELETE' });
}

// ── OTP ───────────────────────────────────────────────────────
export function otpLoginSuccess(): Promise<unknown> {
  return apiFetch('/otp/login-success', { method: 'POST' });
}

export function otpSettings(): Promise<{ required?: boolean; enforced?: boolean; enabled?: boolean }> {
  return apiFetch('/otp/settings');
}

export function otpChallenge(): Promise<unknown> {
  return apiFetch('/otp/challenge', { method: 'POST' });
}

export function otpVerifyLogin(token: string): Promise<unknown> {
  return apiFetch('/otp/verify-login', { method: 'POST', body: { token } });
}
