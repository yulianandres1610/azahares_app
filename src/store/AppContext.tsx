// Store central: sesión/auth, datos (contenedores), i18n y toast.
import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import * as SecureStore from 'expo-secure-store';
import { supabase } from '../lib/supabase';
import { getMe, otpLoginSuccess, otpSettings } from '../lib/api/me';
import { listContainers } from '../lib/api/containers';
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

function seedNotifications(): AppNotification[] {
  const now = Date.now();
  return [
    { id: 'n1', kind: 'refuel', title: 'Inspección refuel lista', body: 'Un contenedor pasó la inspección de refuel. Revisá sellos y nivel.', containerId: null, time: 'hace 8m', ts: now - 48e4, read: false },
    { id: 'n2', kind: 'available', title: 'Contenedor disponible', body: 'Un contenedor quedó etiquetado y listo para despacho.', containerId: null, time: 'hace 1h', ts: now - 36e5, read: false },
    { id: 'n3', kind: 'coa', title: 'COA cargado', body: 'Se agregó el certificado de análisis a un contenedor.', containerId: null, time: 'hace 3h', ts: now - 108e5, read: false },
    { id: 'n4', kind: 'inspection', title: 'Inspección visual asignada', body: 'Te asignaron como empleado de yarda de un contenedor.', containerId: null, time: 'Hoy, 8:10', ts: now - 5e6, read: true },
    { id: 'n5', kind: 'delivery', title: 'Marcado entregado', body: 'Un contenedor está en retorno. Iniciará un nuevo ciclo al llegar.', containerId: null, time: 'Ayer', ts: now - 9e7, read: true },
    { id: 'n7', kind: 'system', title: 'Nueva versión 1.0', body: 'Subidas más rápidas y cola offline para fotos y video.', containerId: null, time: 'hace 2d', ts: now - 17e7, read: true },
  ];
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
  const [notifications, setNotifications] = useState<AppNotification[]>(() => seedNotifications());
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const markNotifRead = useCallback((id: string) => {
    setNotifications((ns) => ns.map((n) => (n.id === id ? { ...n, read: true } : n)));
  }, []);
  const markAllNotifsRead = useCallback(() => {
    setNotifications((ns) => ns.map((n) => ({ ...n, read: true })));
  }, []);
  const removeNotif = useCallback((id: string) => {
    setNotifications((ns) => ns.filter((n) => n.id !== id));
  }, []);
  const clearNotifs = useCallback(() => setNotifications([]), []);

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
    } catch {
      // sin perfil válido → desautenticado
      setPhase('unauth');
    }
  }, [refreshContainers]);

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
      }
      return { needsOtp };
    },
    [refreshContainers],
  );

  const onOtpVerified = useCallback(async () => {
    setPhase('ready');
    await refreshContainers();
  }, [refreshContainers]);

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
