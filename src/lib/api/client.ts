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
