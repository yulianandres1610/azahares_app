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
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

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
          needsOtp = !!(s.required || s.enforced);
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
