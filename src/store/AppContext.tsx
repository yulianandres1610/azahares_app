// Store central: sesión/auth, datos (contenedores), i18n y toast.
import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { AppState as RNAppState } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { supabase } from '../lib/supabase';
import { getMe, otpLoginSuccess, otpSettings } from '../lib/api/me';
import { listContainers } from '../lib/api/containers';
import {
  listNotifications,
  markNotifReadApi,
  markAllNotifsReadApi,
  removeNotifApi,
  clearNotifsApi,
  type NotificationDto,
} from '../lib/api/notifications';
import { ensureNotifPermission, presentLocal } from '../lib/notify';
import type { Container, Me } from '../lib/api/types';
import { CONFIG_OK } from '../config';
import { deviceLocale, makeT, type Locale, type T } from '../i18n';

type SessionPhase = 'loading' | 'unauth' | 'locked' | 'otp' | 'pending' | 'ready';
type LocalePref = 'auto' | 'en' | 'es';
type BiometricType = 'face' | 'fingerprint';

export interface Toast {
  msg: string;
  tone?: 'success' | 'warn' | 'error' | 'info';
  duration?: number;
}

interface AppState {
  phase: SessionPhase;
  me: Me | null;
  containers: Container[];
  containersLoading: boolean;
  containersError: string | null;
  locale: Locale;
  localePref: LocalePref;
  t: T;
  toast: Toast | null;
  biometricType: BiometricType;
  biometricEnabled: boolean;
  configOk: boolean;
  notifications: AppNotification[];

  // acciones
  bootstrap: () => Promise<void>;
  signIn: (email: string, password: string) => Promise<{ needsOtp: boolean }>;
  onOtpVerified: () => Promise<void>;
  unlock: () => Promise<void>;
  signOut: () => Promise<void>;
  refreshContainers: () => Promise<void>;
  setMe: (me: Me) => void;
  setLocalePref: (p: LocalePref) => void;
  setBiometricType: (b: BiometricType) => void;
  setBiometricEnabled: (v: boolean) => void;
  showToast: (msg: string, tone?: Toast['tone']) => void;
  refreshNotifications: () => Promise<void>;
  markNotifRead: (id: string) => void;
  markAllNotifsRead: () => void;
  removeNotif: (id: string) => void;
  clearNotifs: () => void;
}

export type NotifKind = 'refuel' | 'available' | 'inspection' | 'delivery' | 'coa' | 'alert' | 'system';
export interface AppNotification {
  id: string;
  kind: NotifKind;
  title: string;
  body: string;
  containerId: string | null;
  time: string;
  ts: number;
  read: boolean;
}

// Mapea el `type` del backend al kind de la UI (ícono + color).
function kindFromType(type: string): NotifKind {
  const x = (type || '').toLowerCase();
  if (x.includes('refuel')) return 'refuel';
  if (x.includes('available') || x.includes('disponible')) return 'available';
  if (x.includes('coa')) return 'coa';
  if (x.includes('visual') || x.includes('inspec')) return 'inspection';
  if (x.includes('deliver') || x.includes('entreg') || x.includes('transit') || x.includes('vessel') || x.startsWith('container_') || x.includes('return') || x.includes('retorno'))
    return 'delivery';
  if (x.includes('maint') || x.includes('alert')) return 'alert';
  return 'system';
}

function relTime(iso: string, es: boolean): string {
  const ts = new Date(iso).getTime();
  const m = Math.floor((Date.now() - ts) / 60000);
  if (m < 1) return es ? 'ahora' : 'now';
  if (m < 60) return es ? `hace ${m}m` : `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return es ? `hace ${h}h` : `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d === 1) return es ? 'Ayer' : 'Yesterday';
  return es ? `hace ${d}d` : `${d}d ago`;
}

function mapNotif(dto: NotificationDto, es: boolean): AppNotification {
  const md = (dto.metadata || {}) as Record<string, unknown>;
  const containerId = (md.containerId as string) || (md.container_id as string) || null;
  return {
    id: dto.id,
    kind: kindFromType(dto.type),
    title: dto.title,
    body: dto.body || '',
    containerId,
    time: relTime(dto.createdAt, es),
    ts: new Date(dto.createdAt).getTime(),
    read: !!dto.readAt,
  };
}

const Ctx = createContext<AppState | null>(null);

const BIO_ENABLED_KEY = 'az.biometricEnabled';
const BIO_TYPE_KEY = 'az.biometricType';
const LOCALE_PREF_KEY = 'az.localePref';

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [phase, setPhase] = useState<SessionPhase>('loading');
  const [me, setMeState] = useState<Me | null>(null);
  const [containers, setContainers] = useState<Container[]>([]);
  const [containersLoading, setContainersLoading] = useState(false);
  const [containersError, setContainersError] = useState<string | null>(null);
  const [localePref, setLocalePrefState] = useState<LocalePref>('auto');
  const [locale, setLocale] = useState<Locale>(deviceLocale());
  const [toast, setToast] = useState<Toast | null>(null);
  const [biometricType, setBiometricTypeState] = useState<BiometricType>('face');
  const [biometricEnabled, setBiometricEnabledState] = useState(false);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const localeRef = useRef<Locale>(locale);
  localeRef.current = locale;
  const seenNotifIds = useRef<Set<string>>(new Set());
  const notifInit = useRef(false);

  const refreshNotifications = useCallback(async () => {
    try {
      const { items } = await listNotifications();
      const es = localeRef.current === 'es';
      const mapped = (items || []).map((d) => mapNotif(d, es));
      // Sonar por notificaciones nuevas sin leer (no en la línea base).
      if (notifInit.current) {
        const fresh = mapped.filter((n) => !n.read && !seenNotifIds.current.has(n.id));
        fresh.forEach((n) => presentLocal(n.title, n.body));
      } else {
        notifInit.current = true;
      }
      mapped.forEach((n) => seenNotifIds.current.add(n.id));
      setNotifications(mapped);
    } catch {
      // sin notificaciones / error → no romper
    }
  }, []);

  const markNotifRead = useCallback((id: string) => {
    setNotifications((ns) => ns.map((n) => (n.id === id ? { ...n, read: true } : n)));
    markNotifReadApi(id).catch(() => {});
  }, []);
  const markAllNotifsRead = useCallback(() => {
    setNotifications((ns) => ns.map((n) => ({ ...n, read: true })));
    markAllNotifsReadApi().catch(() => {});
  }, []);
  const removeNotif = useCallback((id: string) => {
    setNotifications((ns) => ns.filter((n) => n.id !== id));
    removeNotifApi(id).catch(() => {});
  }, []);
  const clearNotifs = useCallback(() => {
    setNotifications([]);
    clearNotifsApi().catch(() => {});
  }, []);

  const t = useMemo(() => makeT(locale), [locale]);

  const showToast = useCallback((msg: string, tone: Toast['tone'] = 'success') => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToast({ msg, tone });
    toastTimer.current = setTimeout(() => setToast(null), 2400);
  }, []);

  const refreshContainers = useCallback(async () => {
    setContainersLoading(true);
    setContainersError(null);
    try {
      const data = await listContainers();
      setContainers(Array.isArray(data) ? data : []);
    } catch (e: any) {
      setContainersError(e?.message || 'Error');
    } finally {
      setContainersLoading(false);
    }
  }, []);

  // Resuelve el estado de sesión a partir de /me (rol + OTP).
  const resolveSession = useCallback(async (): Promise<void> => {
    try {
      const profile = await getMe();
      setMeState(profile);
      if (profile.role === 'pending') {
        setPhase('pending');
        return;
      }
      if (profile.otpRequired || profile.otpEnforced) {
        setPhase('otp');
        return;
      }
      setPhase('ready');
      refreshContainers();
      refreshNotifications();
    } catch {
      // sin perfil válido → desautenticado
      setPhase('unauth');
    }
  }, [refreshContainers, refreshNotifications]);

  const bootstrap = useCallback(async () => {
    // preferencias locales
    try {
      const [be, bt, lp] = await Promise.all([
        SecureStore.getItemAsync(BIO_ENABLED_KEY),
        SecureStore.getItemAsync(BIO_TYPE_KEY),
        SecureStore.getItemAsync(LOCALE_PREF_KEY),
      ]);
      if (be) setBiometricEnabledState(be === '1');
      if (bt === 'face' || bt === 'fingerprint') setBiometricTypeState(bt);
      if (lp === 'auto' || lp === 'en' || lp === 'es') {
        setLocalePrefState(lp);
        setLocale(lp === 'auto' ? deviceLocale() : lp);
      }
    } catch {}

    if (!CONFIG_OK) {
      setPhase('unauth');
      return;
    }
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session) {
      setPhase('unauth');
      return;
    }
    // Si la biometría está activada, exigir desbloqueo antes de entrar.
    const bioPref = (await SecureStore.getItemAsync(BIO_ENABLED_KEY)) === '1';
    if (bioPref) {
      setPhase('locked');
      return;
    }
    await resolveSession();
  }, [resolveSession]);

  const unlock = useCallback(async () => {
    await resolveSession();
  }, [resolveSession]);

  const signIn = useCallback(
    async (email: string, password: string): Promise<{ needsOtp: boolean }> => {
      const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
      if (error) throw new Error(error.message);
      try {
        await otpLoginSuccess();
      } catch {}
      // decide si pide OTP
      let needsOtp = false;
      try {
        const profile = await getMe();
        setMeState(profile);
        if (profile.role === 'pending') {
          setPhase('pending');
          return { needsOtp: false };
        }
        needsOtp = !!(profile.otpRequired || profile.otpEnforced);
      } catch {
        try {
          const s = await otpSettings();
          needsOtp = !!s.enabled;
        } catch {}
      }
      if (needsOtp) {
        setPhase('otp');
      } else {
        setPhase('ready');
        refreshContainers();
        refreshNotifications();
      }
      return { needsOtp };
    },
    [refreshContainers, refreshNotifications],
  );

  const onOtpVerified = useCallback(async () => {
    setPhase('ready');
    await refreshContainers();
    refreshNotifications();
  }, [refreshContainers, refreshNotifications]);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    setMeState(null);
    setContainers([]);
    setPhase('unauth');
  }, []);

  const setMe = useCallback((m: Me) => setMeState(m), []);

  const setLocalePref = useCallback((p: LocalePref) => {
    setLocalePrefState(p);
    setLocale(p === 'auto' ? deviceLocale() : p);
    SecureStore.setItemAsync(LOCALE_PREF_KEY, p).catch(() => {});
  }, []);

  const setBiometricType = useCallback((b: BiometricType) => {
    setBiometricTypeState(b);
    SecureStore.setItemAsync(BIO_TYPE_KEY, b).catch(() => {});
  }, []);

  const setBiometricEnabled = useCallback((v: boolean) => {
    setBiometricEnabledState(v);
    SecureStore.setItemAsync(BIO_ENABLED_KEY, v ? '1' : '0').catch(() => {});
  }, []);

  useEffect(() => {
    bootstrap();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Polling de notificaciones (suenan las nuevas): al volver a la app + cada 60s.
  useEffect(() => {
    if (phase !== 'ready') return;
    ensureNotifPermission();
    const sub = RNAppState.addEventListener('change', (st) => {
      if (st === 'active') refreshNotifications();
    });
    const iv = setInterval(() => refreshNotifications(), 60000);
    return () => {
      sub.remove();
      clearInterval(iv);
    };
  }, [phase, refreshNotifications]);

  const value: AppState = {
    phase,
    me,
    containers,
    containersLoading,
    containersError,
    locale,
    localePref,
    t,
    toast,
    biometricType,
    biometricEnabled,
    configOk: CONFIG_OK,
    bootstrap,
    signIn,
    onOtpVerified,
    unlock,
    signOut,
    refreshContainers,
    setMe,
    setLocalePref,
    setBiometricType,
    setBiometricEnabled,
    showToast,
    notifications,
    refreshNotifications,
    markNotifRead,
    markAllNotifsRead,
    removeNotif,
    clearNotifs,
  };

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useApp(): AppState {
  const v = useContext(Ctx);
  if (!v) throw new Error('useApp must be used within AppProvider');
  return v;
}

export function useT(): T {
  return useApp().t;
}
