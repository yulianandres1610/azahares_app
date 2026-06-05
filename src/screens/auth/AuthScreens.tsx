// Pantallas de auth portadas de screens-auth.jsx con integración real.
import React, { useEffect, useRef, useState } from 'react';
import { Animated, Easing, TextInput, View } from 'react-native';
import * as LocalAuthentication from 'expo-local-authentication';
import { LinearGradient } from 'expo-linear-gradient';
import { alpha, colors, fonts, radius } from '../../theme/tokens';
import { AuthBackdrop, Logo } from '../../components/AuthBackdrop';
import { GlobeSpinner } from '../../components/GlobeSpinner';
import { Icon, IconName } from '../../components/Icon';
import { AppText, Button, Screen, Tap, haptic } from '../../components/ui';
import { useApp } from '../../store/AppContext';
import { otpChallenge, otpVerifyLogin } from '../../lib/api/me';
import { supabase } from '../../lib/supabase';

// ── GlassField ───────────────────────────────────────────────
function GlassField({
  icon,
  right,
  value,
  onChangeText,
  placeholder,
  secureTextEntry,
  keyboardType,
  autoFocus,
}: {
  icon: IconName;
  right?: React.ReactNode;
  value: string;
  onChangeText: (v: string) => void;
  placeholder?: string;
  secureTextEntry?: boolean;
  keyboardType?: React.ComponentProps<typeof TextInput>['keyboardType'];
  autoFocus?: boolean;
}) {
  const [focus, setFocus] = useState(false);
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        height: 52,
        borderRadius: radius.md,
        borderWidth: 1.5,
        borderColor: focus ? colors.accent : 'rgba(255,255,255,0.16)',
        backgroundColor: focus ? 'rgba(255,255,255,0.12)' : 'rgba(255,255,255,0.07)',
        paddingHorizontal: 14,
      }}
    >
      <Icon name={icon} size={19} color={focus ? colors.accent : 'rgba(255,255,255,0.55)'} />
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor="rgba(255,255,255,0.4)"
        secureTextEntry={secureTextEntry}
        keyboardType={keyboardType}
        autoFocus={autoFocus}
        autoCapitalize="none"
        autoCorrect={false}
        onFocus={() => setFocus(true)}
        onBlur={() => setFocus(false)}
        style={{ flex: 1, marginLeft: 10, fontFamily: fonts.sans, fontSize: 16, color: '#fff' }}
      />
      {right}
    </View>
  );
}

function FadeUp({ children, delay = 0, style }: { children: React.ReactNode; delay?: number; style?: any }) {
  const a = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(a, { toValue: 1, duration: 600, delay, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();
  }, [a, delay]);
  return (
    <Animated.View
      style={[{ opacity: a, transform: [{ translateY: a.interpolate({ inputRange: [0, 1], outputRange: [16, 0] }) }] }, style]}
    >
      {children}
    </Animated.View>
  );
}

function Footer() {
  return (
    <AppText style={{ textAlign: 'center', paddingVertical: 14, color: 'rgba(255,255,255,0.3)', fontSize: 11 }}>
      Designed by{' '}
      <AppText weight="700" style={{ color: 'rgba(255,255,255,0.55)', fontSize: 11 }}>
        Logirapid
      </AppText>
    </AppText>
  );
}

// ── Splash ───────────────────────────────────────────────────
export function Splash() {
  return (
    <View style={{ flex: 1 }}>
      <AuthBackdrop />
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <GlobeSpinner size={260} />
        <AppText style={{ marginTop: 10, color: 'rgba(255,255,255,0.5)', fontSize: 12, letterSpacing: 3 }}>
          IMPORT & EXPORT
        </AppText>
      </View>
      <View style={{ position: 'absolute', bottom: 46, left: 0, right: 0, alignItems: 'center' }}>
        <AppText style={{ color: 'rgba(255,255,255,0.32)', fontSize: 10.5, letterSpacing: 0.5 }}>Designed by</AppText>
        <AppText weight="700" style={{ color: 'rgba(255,255,255,0.62)', fontSize: 13.5, letterSpacing: 0.5, marginTop: 3 }}>
          Logirapid
        </AppText>
      </View>
    </View>
  );
}

// ── Login ────────────────────────────────────────────────────
export function Login({ onForgot, onBiometric }: { onForgot: () => void; onBiometric: () => void }) {
  const { t, signIn, biometricEnabled, biometricType, showToast } = useApp();
  const [email, setEmail] = useState('');
  const [pass, setPass] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (busy) return;
    if (!email.trim() || !pass) {
      showToast(t('email') + ' / ' + t('password'), 'warn');
      return;
    }
    setBusy(true);
    haptic('medium');
    try {
      await signIn(email, pass); // el store cambia la fase (otp/ready/pending)
    } catch (e: any) {
      haptic('warn');
      showToast(e?.message || t('errorGeneric'), 'error');
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={{ flex: 1 }}>
      <AuthBackdrop />
      <Screen bg="transparent">
        <View style={{ paddingHorizontal: 24, flexGrow: 1, minHeight: 560 }}>
          <FadeUp style={{ paddingTop: 56, alignItems: 'center' }}>
            <Logo height={82} />
          </FadeUp>

          <FadeUp delay={120} style={{ marginTop: 40 }}>
            <View
              style={{
                borderRadius: radius.xl,
                padding: 22,
                backgroundColor: 'rgba(255,255,255,0.06)',
                borderWidth: 1.5,
                borderColor: 'rgba(255,255,255,0.22)',
              }}
            >
              <View style={{ marginBottom: 18 }}>
                <AppText serif weight="600" style={{ fontSize: 25, color: '#fff', letterSpacing: -0.2 }}>
                  {t('welcome')}
                </AppText>
                <AppText style={{ color: 'rgba(255,255,255,0.55)', fontSize: 13.5, marginTop: 5 }}>
                  {t('platformTagline')}
                </AppText>
              </View>
              <View style={{ gap: 14 }}>
                <GlassField icon="mail" placeholder={t('email')} value={email} onChangeText={setEmail} keyboardType="email-address" />
                <GlassField
                  icon="lock"
                  placeholder={t('password')}
                  value={pass}
                  onChangeText={setPass}
                  secureTextEntry={!showPass}
                  right={
                    <Tap onPress={() => setShowPass((v) => !v)} style={{ padding: 8 }}>
                      <Icon name={showPass ? 'eyeOff' : 'eye'} size={19} color="rgba(255,255,255,0.6)" />
                    </Tap>
                  }
                />
              </View>
              <View style={{ alignItems: 'flex-end', marginTop: 12 }}>
                <Tap onPress={onForgot}>
                  <AppText weight="600" style={{ color: colors.accent, fontSize: 13.5 }}>
                    {t('forgot')}
                  </AppText>
                </Tap>
              </View>
            </View>
          </FadeUp>

          <FadeUp delay={180} style={{ marginTop: 22 }}>
            <Tap onPress={submit} disabled={busy} hapticKind="medium">
              <View
                style={{
                  height: 54,
                  borderRadius: radius.md,
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 9,
                  backgroundColor: 'rgba(255,255,255,0.13)',
                  borderWidth: 1.5,
                  borderColor: 'rgba(255,255,255,0.28)',
                  opacity: busy ? 0.7 : 1,
                }}
              >
                <AppText weight="600" style={{ color: '#fff', fontSize: 16, letterSpacing: 0.2 }}>
                  {busy ? t('loading') : t('signIn')}
                </AppText>
                {!busy && <Icon name="arrowR" size={20} color="#fff" />}
              </View>
            </Tap>
          </FadeUp>

          {biometricEnabled && (
            <FadeUp delay={240} style={{ marginTop: 22 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 18 }}>
                <View style={{ flex: 1, height: 1, backgroundColor: 'rgba(255,255,255,0.16)' }} />
                <AppText style={{ color: 'rgba(255,255,255,0.4)', fontSize: 12 }}>{t('or')}</AppText>
                <View style={{ flex: 1, height: 1, backgroundColor: 'rgba(255,255,255,0.16)' }} />
              </View>
              <Tap onPress={onBiometric} hapticKind="medium">
                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 10,
                    height: 54,
                    borderRadius: radius.md,
                    borderWidth: 1.5,
                    borderColor: 'rgba(255,255,255,0.22)',
                    backgroundColor: 'rgba(255,255,255,0.06)',
                  }}
                >
                  <Icon name={biometricType === 'fingerprint' ? 'fingerprint' : 'faceid'} size={22} color="#fff" />
                  <AppText weight="600" style={{ color: '#fff', fontSize: 15 }}>
                    {biometricType === 'fingerprint' ? t('useFingerprint') : t('useBiometric')}
                  </AppText>
                </View>
              </Tap>
            </FadeUp>
          )}

          <View style={{ flex: 1 }} />
          <Footer />
        </View>
      </Screen>
    </View>
  );
}

// ── Forgot ───────────────────────────────────────────────────
export function Forgot({ onBack }: { onBack: () => void }) {
  const { t, showToast } = useApp();
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const valid = /.+@.+\..+/.test(email);

  const submit = async () => {
    if (!valid || busy) return;
    setBusy(true);
    haptic('medium');
    try {
      await supabase.auth.resetPasswordForEmail(email.trim());
      setSent(true);
      haptic('success');
    } catch (e: any) {
      showToast(e?.message || t('errorGeneric'), 'error');
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={{ flex: 1 }}>
      <AuthBackdrop />
      <Screen bg="transparent">
        <View style={{ paddingHorizontal: 24, flexGrow: 1, minHeight: 560 }}>
          <Tap
            onPress={onBack}
            style={{
              marginTop: 14,
              width: 42,
              height: 42,
              borderRadius: 999,
              backgroundColor: 'rgba(255,255,255,0.12)',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Icon name="chevL" size={22} color="#fff" />
          </Tap>

          {!sent ? (
            <>
              <FadeUp style={{ marginTop: 34 }}>
                <View
                  style={{
                    width: 66,
                    height: 66,
                    borderRadius: 20,
                    backgroundColor: 'rgba(255,255,255,0.1)',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginBottom: 22,
                  }}
                >
                  <Icon name="lock" size={30} color="#fff" />
                </View>
                <AppText serif weight="600" style={{ fontSize: 30, color: '#fff', letterSpacing: -0.4 }}>
                  {t('forgotTitle')}
                </AppText>
                <AppText style={{ color: 'rgba(255,255,255,0.62)', fontSize: 15, marginTop: 11, lineHeight: 23 }}>
                  {t('forgotSub')}
                </AppText>
              </FadeUp>

              <FadeUp delay={80} style={{ marginTop: 26 }}>
                <View
                  style={{
                    borderRadius: radius.xl,
                    padding: 20,
                    backgroundColor: 'rgba(255,255,255,0.06)',
                    borderWidth: 1.5,
                    borderColor: 'rgba(255,255,255,0.22)',
                  }}
                >
                  <GlassField icon="mail" placeholder={t('email')} value={email} onChangeText={setEmail} keyboardType="email-address" />
                </View>
              </FadeUp>

              <FadeUp delay={140} style={{ marginTop: 22 }}>
                <Tap onPress={submit} disabled={busy || !valid} hapticKind="medium" style={{ opacity: !valid ? 0.5 : 1 }}>
                  <View
                    style={{
                      height: 54,
                      borderRadius: radius.md,
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 9,
                      backgroundColor: 'rgba(255,255,255,0.13)',
                      borderWidth: 1.5,
                      borderColor: 'rgba(255,255,255,0.28)',
                    }}
                  >
                    <AppText weight="600" style={{ color: '#fff', fontSize: 16 }}>
                      {busy ? t('loading') : t('sendLink')}
                    </AppText>
                    {!busy && <Icon name="arrowR" size={20} color="#fff" />}
                  </View>
                </Tap>
              </FadeUp>
            </>
          ) : (
            <FadeUp style={{ marginTop: 40, alignItems: 'center' }}>
              <View
                style={{
                  width: 96,
                  height: 96,
                  borderRadius: 30,
                  backgroundColor: alpha(colors.success, 0.16),
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Icon name="mail" size={46} color={colors.success} />
              </View>
              <AppText serif weight="600" style={{ fontSize: 28, color: '#fff', marginTop: 28 }}>
                {t('sentTitle')}
              </AppText>
              <AppText style={{ color: 'rgba(255,255,255,0.62)', fontSize: 15, marginTop: 11, lineHeight: 23, textAlign: 'center', maxWidth: 300 }}>
                {t('sentSub')} {email}
              </AppText>
              <View style={{ width: '100%', marginTop: 30 }}>
                <Button onPress={onBack} variant="primary" icon="check">
                  {t('backToLogin')}
                </Button>
              </View>
            </FadeUp>
          )}

          <View style={{ flex: 1 }} />
          <Footer />
        </View>
      </Screen>
    </View>
  );
}

// ── OTP ──────────────────────────────────────────────────────
export function OTP() {
  const { t, onOtpVerified, showToast, me } = useApp();
  const [code, setCode] = useState<string[]>(['', '', '', '', '', '']);
  const [count, setCount] = useState(28);
  const [busy, setBusy] = useState(false);
  const refs = useRef<(TextInput | null)[]>([]);

  useEffect(() => {
    const i = setInterval(() => setCount((c) => (c > 0 ? c - 1 : 0)), 1000);
    return () => clearInterval(i);
  }, []);
  useEffect(() => {
    // pide el código al backend al montar
    otpChallenge().catch(() => {});
    const tm = setTimeout(() => refs.current[0]?.focus(), 400);
    return () => clearTimeout(tm);
  }, []);

  const full = code.join('');

  const verify = async () => {
    if (busy) return;
    setBusy(true);
    haptic('medium');
    try {
      await otpVerifyLogin(full);
      haptic('success');
      await onOtpVerified();
    } catch (e: any) {
      haptic('warn');
      showToast(e?.message || t('errorGeneric'), 'error');
      setCode(['', '', '', '', '', '']);
      refs.current[0]?.focus();
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => {
    if (full.length === 6) verify();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [full]);

  const set = (i: number, v: string) => {
    const digits = v.replace(/\D/g, '');
    if (digits.length > 1) {
      const arr = digits.slice(0, 6).split('');
      const next = ['', '', '', '', '', ''].map((_, k) => arr[k] || '');
      setCode(next);
      haptic('light');
      refs.current[Math.min(arr.length, 5)]?.focus();
      return;
    }
    const next = [...code];
    next[i] = digits;
    setCode(next);
    if (digits) {
      haptic('select');
      refs.current[i + 1]?.focus();
    }
  };

  const resend = async () => {
    setCount(28);
    haptic('light');
    try {
      await otpChallenge();
    } catch {}
  };

  return (
    <View style={{ flex: 1 }}>
      <AuthBackdrop />
      <Screen bg="transparent">
        <View style={{ paddingHorizontal: 24 }}>
          <FadeUp style={{ marginTop: 40 }}>
            <View
              style={{
                width: 60,
                height: 60,
                borderRadius: 18,
                backgroundColor: 'rgba(255,255,255,0.1)',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: 22,
              }}
            >
              <Icon name="lock" size={28} color="#fff" />
            </View>
            <AppText serif weight="600" style={{ fontSize: 32, color: '#fff', letterSpacing: -0.6 }}>
              {t('otpTitle')}
            </AppText>
            <AppText style={{ color: 'rgba(255,255,255,0.62)', fontSize: 15, marginTop: 10, lineHeight: 22 }}>
              {t('otpSub')}{'\n'}
              <AppText weight="600" style={{ color: '#fff', fontSize: 15 }}>
                {me?.email || ''}
              </AppText>
            </AppText>
          </FadeUp>

          <FadeUp delay={100} style={{ flexDirection: 'row', gap: 10, marginTop: 34 }}>
            {code.map((d, i) => (
              <TextInput
                key={i}
                ref={(el) => {
                  refs.current[i] = el;
                }}
                value={d}
                inputMode="numeric"
                maxLength={6}
                onChangeText={(v) => set(i, v)}
                onKeyPress={({ nativeEvent }) => {
                  if (nativeEvent.key === 'Backspace' && !code[i] && refs.current[i - 1]) refs.current[i - 1]?.focus();
                }}
                style={{
                  flex: 1,
                  height: 62,
                  textAlign: 'center',
                  fontSize: 26,
                  fontFamily: fonts.sansBold,
                  color: '#fff',
                  borderRadius: radius.md,
                  borderWidth: 1.5,
                  borderColor: d ? colors.accent : 'rgba(255,255,255,0.18)',
                  backgroundColor: d ? 'rgba(100,136,224,0.18)' : 'rgba(255,255,255,0.06)',
                }}
              />
            ))}
          </FadeUp>

          <FadeUp delay={160} style={{ marginTop: 30 }}>
            <Button onPress={verify} disabled={busy || full.length < 6} variant="accent">
              {busy ? t('loading') : t('verify')}
            </Button>
          </FadeUp>

          <View style={{ alignItems: 'center', marginTop: 22 }}>
            {count > 0 ? (
              <AppText style={{ color: 'rgba(255,255,255,0.55)', fontSize: 14 }}>
                {t('resendIn')}{' '}
                <AppText weight="700" style={{ color: '#fff', fontSize: 14 }}>
                  0:{String(count).padStart(2, '0')}
                </AppText>
              </AppText>
            ) : (
              <Tap onPress={resend}>
                <AppText weight="600" style={{ color: colors.accent, fontSize: 14 }}>
                  {t('resend')}
                </AppText>
              </Tap>
            )}
          </View>
        </View>
      </Screen>
    </View>
  );
}

// ── Biometric ────────────────────────────────────────────────
export function Biometric({ onCancel, onSuccess }: { onCancel: () => void; onSuccess: () => Promise<void> | void }) {
  const { t, biometricType } = useApp();
  const [state, setState] = useState<'idle' | 'scanning' | 'ok' | 'denied'>('idle');
  const isFinger = biometricType === 'fingerprint';

  const scan = async () => {
    if (state !== 'idle' && state !== 'denied') return;
    setState('scanning');
    haptic('medium');
    try {
      const res = await LocalAuthentication.authenticateAsync({
        promptMessage: t('bioPrompt'),
        cancelLabel: t('bioCancel'),
        disableDeviceFallback: false,
      });
      if (res.success) {
        setState('ok');
        haptic('success');
        setTimeout(() => onSuccess(), 600);
      } else {
        setState('denied');
        haptic('warn');
        setTimeout(() => setState('idle'), 1400);
      }
    } catch {
      setState('denied');
      setTimeout(() => setState('idle'), 1400);
    }
  };

  // intenta automáticamente al entrar
  useEffect(() => {
    const tm = setTimeout(scan, 350);
    return () => clearTimeout(tm);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const title = state === 'ok' ? t('done') : state === 'denied' ? t('bioDenied') : t('bioPrompt');
  const subtitle =
    state === 'idle' ? t('bioScan') : state === 'scanning' ? t('bioVerifying') : state === 'denied' ? t('bioScan') : t('bioSub');

  return (
    <View style={{ flex: 1 }}>
      <AuthBackdrop />
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 }}>
        <View style={{ position: 'absolute', top: 70 }}>
          <Logo height={24} />
        </View>

        {state === 'scanning' ? (
          <View style={{ width: 170, height: 170, alignItems: 'center', justifyContent: 'center' }}>
            <GlobeSpinner size={168} />
          </View>
        ) : (
          <Tap onPress={scan} disabled={state === 'ok'} scaleTo={0.94}>
            <View
              style={{
                width: 150,
                height: 150,
                borderRadius: 999,
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: state === 'ok' ? colors.success : state === 'denied' ? colors.error : 'rgba(255,255,255,0.08)',
                borderWidth: 2,
                borderColor: 'rgba(255,255,255,0.16)',
              }}
            >
              {state === 'ok' ? (
                <Icon name="check" size={66} color="#fff" />
              ) : state === 'denied' ? (
                <Icon name="x" size={62} color="#fff" />
              ) : (
                <Icon name={isFinger ? 'fingerprint' : 'faceid'} size={66} color="#fff" />
              )}
            </View>
          </Tap>
        )}

        <AppText serif weight="600" style={{ fontSize: 26, color: state === 'denied' ? '#ffd9df' : '#fff', marginTop: 38 }}>
          {title}
        </AppText>
        <AppText style={{ color: 'rgba(255,255,255,0.6)', fontSize: 14.5, marginTop: 10, textAlign: 'center', maxWidth: 260 }}>
          {subtitle}
        </AppText>
        <Tap onPress={onCancel} style={{ position: 'absolute', bottom: 56 }}>
          <AppText weight="600" style={{ color: 'rgba(255,255,255,0.7)', fontSize: 14.5 }}>
            {t('bioCancel')}
          </AppText>
        </Tap>
      </View>
    </View>
  );
}

// ── Pending ──────────────────────────────────────────────────
export function Pending() {
  const { t, signOut } = useApp();
  return (
    <View style={{ flex: 1 }}>
      <AuthBackdrop />
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 30 }}>
        <View
          style={{
            width: 96,
            height: 96,
            borderRadius: 30,
            backgroundColor: alpha(colors.amber, 0.16),
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Icon name="clock" size={46} color={colors.amber} />
        </View>
        <AppText serif weight="600" style={{ fontSize: 28, color: '#fff', marginTop: 30, textAlign: 'center' }}>
          {t('pendingTitle')}
        </AppText>
        <AppText style={{ color: 'rgba(255,255,255,0.62)', fontSize: 15, marginTop: 12, lineHeight: 23, textAlign: 'center', maxWidth: 300 }}>
          {t('pendingSub')}
        </AppText>
        <Tap onPress={signOut} style={{ marginTop: 30 }}>
          <AppText weight="600" style={{ color: colors.accent, fontSize: 15 }}>
            {t('signOut')}
          </AppText>
        </Tap>
      </View>
    </View>
  );
}
