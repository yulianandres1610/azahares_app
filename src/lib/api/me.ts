// Endpoints de perfil + OTP.
import * as FileSystem from 'expo-file-system/legacy';
import { apiFetch } from './client';
import type { Me } from './types';

export function getMe(): Promise<Me> {
  return apiFetch<Me>('/me');
}

export function updateMe(patch: { fullName?: string; avatarUrl?: string; phone?: string }): Promise<Me> {
  return apiFetch<Me>('/me', { method: 'PATCH', body: patch });
}

// Sube un avatar. El backend espera JSON { dataBase64, contentType } (no
// multipart): leemos el archivo local file:// como base64 con expo-file-system
// (subida robusta bajo la nueva arquitectura de RN, donde fetch + FormData de
// archivos falla con "Network request failed").
export async function uploadAvatar(uri: string, mimeType = 'image/jpeg'): Promise<Me> {
  const dataBase64 = await FileSystem.readAsStringAsync(uri, {
    encoding: FileSystem.EncodingType.Base64,
  });
  return apiFetch<Me>('/me/avatar', {
    method: 'POST',
    body: { dataBase64, contentType: mimeType },
  });
}

export function deleteAvatar(): Promise<Me> {
  return apiFetch<Me>('/me/avatar', { method: 'DELETE' });
}

// Guarda el token de push remoto del dispositivo.
export function savePushToken(token: string): Promise<unknown> {
  return apiFetch('/notifications/push-token', { method: 'POST', body: { token } });
}

// ── OTP ───────────────────────────────────────────────────────
export function otpLoginSuccess(): Promise<unknown> {
  return apiFetch('/otp/login-success', { method: 'POST' });
}

export interface OtpSettings {
  enabled: boolean;
  methods: string[]; // ['totp','email','sms']
  otpEmail: string | null;
  otpPhone: string | null;
  totpVerified: boolean;
  defaultEmail: string | null;
  backupCodesRemaining: number;
}

export function otpSettings(): Promise<OtpSettings> {
  return apiFetch<OtpSettings>('/otp/settings');
}

// Envía un código por email/sms. Para el login la acción es 'login_2fa'
// (debe coincidir con lo que valida verify-login en el backend).
export function otpChallenge(
  channel: 'email' | 'sms' = 'email',
  action = 'login_2fa',
): Promise<{ ok: true; channel: string; sentTo: string }> {
  return apiFetch('/otp/challenge', { method: 'POST', body: { channel, action } });
}

export function otpVerifyLogin(token: string): Promise<unknown> {
  return apiFetch('/otp/verify-login', { method: 'POST', body: { token } });
}
