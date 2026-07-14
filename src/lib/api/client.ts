// Cliente HTTP del backend NestJS. Adjunta Bearer token de Supabase.
import { API_URL } from '../../config';
import { getAccessToken } from '../supabase';

export class ApiError extends Error {
  status: number;
  body: unknown;
  constructor(message: string, status: number, body: unknown) {
    super(message);
    this.status = status;
    this.body = body;
  }
}

function extractMessage(body: unknown, fallback: string): string {
  if (body && typeof body === 'object') {
    const m = (body as any).message;
    if (Array.isArray(m)) return m.join(', ');
    if (typeof m === 'string') return m;
    if (typeof (body as any).error === 'string') return (body as any).error;
  }
  return fallback;
}

/**
 * Traduce cualquier error de red/API a un mensaje amistoso y bilingüe para el
 * usuario (403 → "no tenés permiso", 0 → "sin conexión", etc.), en vez de mostrar
 * el texto crudo del backend. `t` es la función de i18n de la app.
 */
export function friendlyError(e: unknown, t: (k: string) => string): string {
  const status = e instanceof ApiError ? e.status : undefined;
  switch (status) {
    case 0:
      return t('errorNetwork');
    case 401:
      return t('errorSession');
    case 403:
      return t('errorNoPermission');
    case 404:
      return t('errorNotFound');
    case 413:
      return t('errorTooLarge');
    default:
      if (status && status >= 500) return t('errorServer');
      // 400/409/422 y demás: el backend suele mandar un mensaje útil y legible.
      if (e instanceof ApiError && typeof e.message === 'string' && e.message && !/^HTTP \d+$/.test(e.message)) {
        return e.message;
      }
      return t('errorGeneric');
  }
}

export interface ApiFetchOpts extends Omit<RequestInit, 'body'> {
  body?: unknown; // se serializa a JSON salvo que sea string/FormData
  auth?: boolean; // default true
}

export async function apiFetch<T = unknown>(path: string, opts: ApiFetchOpts = {}): Promise<T> {
  const { body, auth = true, headers, ...rest } = opts;
  const h: Record<string, string> = { Accept: 'application/json', ...(headers as any) };

  let payload: BodyInit | undefined;
  if (body instanceof FormData) {
    payload = body;
  } else if (typeof body === 'string') {
    payload = body;
    h['Content-Type'] = h['Content-Type'] || 'application/json';
  } else if (body != null) {
    payload = JSON.stringify(body);
    h['Content-Type'] = 'application/json';
  }

  if (auth) {
    const token = await getAccessToken();
    if (!token) throw new ApiError('No auth token', 401, null);
    h.Authorization = `Bearer ${token}`;
  }

  const url = path.startsWith('http') ? path : `${API_URL}${path}`;
  let res: Response;
  try {
    res = await fetch(url, { ...rest, headers: h, body: payload });
  } catch (e) {
    throw new ApiError('Network error', 0, e);
  }

  const text = await res.text();
  let json: unknown = null;
  if (text) {
    try {
      json = JSON.parse(text);
    } catch {
      json = text;
    }
  }

  if (!res.ok) {
    throw new ApiError(extractMessage(json, `HTTP ${res.status}`), res.status, json);
  }
  return json as T;
}
