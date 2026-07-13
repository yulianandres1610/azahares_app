// Pantallas de auth portadas de screens-auth.jsx con integración real.
import React, { useEffect, useRef, useState } from 'react';
import { Animated, Dimensions, Easing, TextInput, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';

const LOGO_W = Dimensions.get('window').width - 28;
import * as LocalAuthentication from 'expo-local-authentication';
import { LinearGradient } from 'expo-linear-gradient';
import { alpha, colors, fonts, radius } from '../../theme/tokens';
import { AuthBackdrop, Logo } from '../../components/AuthBackdrop';
import { GlobeSpinner } from '../../components/GlobeSpinner';
import { Icon, IconName } from '../../components/Icon';
import { AppText, Button, Screen, Tap, haptic } from '../../components/ui';
import { useApp } from '../../store/AppContext';
import { otpChallenge, otpSettings, otpVerifyLogin } from '../../lib/api/me';
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
// ── Logos de marca (react-native-svg) ────────────────────────
function GoogleLogo({ size = 20 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
      <Path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
      <Path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
      <Path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
    </Svg>
  );
}

function AppleLogo({ size = 20 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path
        fill="#fff"
        d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.53 4.08zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"
      />
    </Svg>
  );
}

function SocialButton({
  children,
  onPress,
  disabled,
}: {
  children: React.ReactNode;
  onPress: () => void;
  disabled?: boolean;
}) {
  return (
    <Tap onPress={onPress} disabled={disabled} scaleTo={0.94} style={{ flex: 1 }}>
      <View
        style={{
          height: 52,
          borderRadius: radius.md,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: 'rgba(255,255,255,0.08)',
          borderWidth: 1.5,
          borderColor: 'rgba(255,255,255,0.20)',
          opacity: disabled ? 0.5 : 1,
        }}
      >
        {children}
      </View>
    </Tap>
  );
}

export function Login({ onForgot }: { onForgot: () => void }) {
  const { t, signIn, showToast, biometricType, biometricAvailable, loginWithBiometrics } = useApp();
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

  // Google/Apple todavía no están habilitados (igual que el login web): se
  // muestran para paridad de diseño y quedan listos para activar.
  const handleSocial = (provider: string) => () => {
    showToast(`${provider} — ${t('comingSoon')}`, 'info');
  };

  const handleBiometric = async () => {
    if (busy) return;
    if (!biometricAvailable) {
      showToast(t('bioNeedLoginFirst'), 'info');
      return;
    }
    setBusy(true);
    try {
      await loginWithBiometrics();
    } catch (e: any) {
      if (e?.message === 'NO_CREDS') showToast(t('bioNeedLoginFirst'), 'info');
      else if (e?.message !== 'BIO_CANCELLED') {
        haptic('warn');
        showToast(e?.message || t('errorGeneric'), 'error');
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={{ flex: 1 }}>
      <AuthBackdrop />
      <Screen bg="transparent">
        <View style={{ paddingHorizontal: 24, flexGrow: 1, minHeight: 560 }}>
          <FadeUp style={{ paddingTop: 48, alignItems: 'center', marginHorizontal: -24 }}>
            <Logo width={LOGO_W} height={LOGO_W / 4.2} />
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
                {busy ? (
                  <GlobeSpinner size={34} showHalo={false} />
                ) : (
                  <>
                    <AppText weight="600" style={{ color: '#fff', fontSize: 16, letterSpacing: 0.2 }}>
                      {t('signIn')}
                    </AppText>
                    <Icon name="arrowR" size={20} color="#fff" />
                  </>
                )}
              </View>
            </Tap>
          </FadeUp>

          <FadeUp delay={220} style={{ marginTop: 22 }}>
            {/* Divisor "o continúa con" */}
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <View style={{ flex: 1, height: 1, backgroundColor: 'rgba(255,255,255,0.14)' }} />
              <AppText style={{ color: 'rgba(255,255,255,0.5)', fontSize: 12.5 }}>
                {t('orContinue')}
              </AppText>
              <View style={{ flex: 1, height: 1, backgroundColor: 'rgba(255,255,255,0.14)' }} />
            </View>

            {/* Botones sociales + biométrico */}
            <View style={{ flexDirection: 'row', gap: 12, marginTop: 16 }}>
              <SocialButton onPress={handleSocial('Google')} disabled={busy}>
                <GoogleLogo size={21} />
              </SocialButton>
              <SocialButton onPress={handleSocial('Apple')} disabled={busy}>
                <AppleLogo size={22} />
              </SocialButton>
              <SocialButton onPress={handleBiometric} disabled={busy}>
                <Icon
                  name={biometricType === 'fingerprint' ? 'fingerprint' : 'faceid'}
                  size={23}
                  color="#fff"
                />
              </SocialButton>
            </View>
          </FadeUp>

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
                    {busy ? (
                      <GlobeSpinner size={32} showHalo={false} />
                    ) : (
                      <>
                        <AppText weight="600" style={{ color: '#fff', fontSize: 16 }}>
                          {t('sendLink')}
                        </AppText>
                        <Icon name="arrowR" size={20} color="#fff" />
                      </>
                    )}
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
  const [count, setCount] = useState(0);
  const [busy, setBusy] = useState(false);
  const [sending, setSending] = useState(false);
  const [hasTotp, setHasTotp] = useState(false);
  const [sentTo, setSentTo] = useState<string | null>(null);
  const refs = useRef<(TextInput | null)[]>([]);
  const es = t.locale === 'es';

  // cooldown del reenvío de email
  useEffect(() => {
    if (count <= 0) return;
    const i = setInterval(() => setCount((c) => (c > 0 ? c - 1 : 0)), 1000);
    return () => clearInterval(i);
  }, [count]);

  const sendEmail = async () => {
    if (sending || count > 0) return;
    setSending(true);
    haptic('light');
    try {
      const r = await otpChallenge('email', 'login_2fa');
      setSentTo(r.sentTo);
      setCount(30);
      showToast(`${t('sentSub')} ${r.sentTo}`, 'success');
    } catch (e: any) {
      haptic('warn');
      showToast(e?.message || t('errorGeneric'), 'error');
    } finally {
      setSending(false);
    }
  };

  // Al montar: leer métodos. Si NO hay Authenticator, mandar email automático.
  useEffect(() => {
    let mounted = true;
    otpSettings()
      .then((s) => {
        if (!mounted) return;
        const totp = !!(s.methods?.includes('totp') && s.totpVerified);
        setHasTotp(totp);
        if (!totp) sendEmail();
      })
      .catch(() => {});
    const tm = setTimeout(() => refs.current[0]?.focus(), 400);
    return () => {
      mounted = false;
      clearTimeout(tm);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

  const emailLabel =
    count > 0
      ? `${t('resendIn')} 0:${String(count).padStart(2, '0')}`
      : sentTo
      ? es
        ? 'Reenviar código al email'
        : 'Resend code to email'
      : es
      ? 'Enviar código a mi email'
      : 'Send code to my email';

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
              {sentTo
                ? `${t('sentSub')} `
                : `${t('otpSub')} `}
              <AppText weight="600" style={{ color: '#fff', fontSize: 15 }}>
                {sentTo || me?.email || ''}
              </AppText>
            </AppText>
          </FadeUp>

          {/* método: Authenticator (si está) */}
          {hasTotp && (
            <FadeUp delay={60} style={{ marginTop: 18 }}>
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 11,
                  padding: 13,
                  borderRadius: radius.md,
                  backgroundColor: 'rgba(255,255,255,0.07)',
                  borderWidth: 1,
                  borderColor: 'rgba(255,255,255,0.16)',
                }}
              >
                <Icon name="lock" size={20} color={colors.accent} />
                <View style={{ flex: 1 }}>
                  <AppText weight="700" style={{ color: '#fff', fontSize: 13 }}>
                    Authenticator
                  </AppText>
                  <AppText style={{ color: 'rgba(255,255,255,0.6)', fontSize: 12, marginTop: 1 }}>
                    {es ? 'Abrí tu app y copiá el código actual.' : 'Open your app and copy the current code.'}
                  </AppText>
                </View>
              </View>
            </FadeUp>
          )}

          {/* botón enviar/reenviar email */}
          <FadeUp delay={90} style={{ marginTop: 12 }}>
            <Tap onPress={sendEmail} disabled={sending || count > 0} hapticKind={null}>
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                  height: 46,
                  borderRadius: radius.md,
                  borderWidth: 1.5,
                  borderColor: 'rgba(255,255,255,0.22)',
                  backgroundColor: 'rgba(255,255,255,0.06)',
                  opacity: sending || count > 0 ? 0.6 : 1,
                }}
              >
                <Icon name="mail" size={18} color="#fff" />
                <AppText weight="600" style={{ color: '#fff', fontSize: 14 }}>
                  {sending ? t('loading') : emailLabel}
                </AppText>
              </View>
            </Tap>
          </FadeUp>

          {/* inputs */}
          <FadeUp delay={130} style={{ flexDirection: 'row', gap: 10, marginTop: 22 }}>
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

          <FadeUp delay={170} style={{ marginTop: 24 }}>
            <Button onPress={verify} disabled={busy || full.length < 6} variant="accent">
              {busy ? <GlobeSpinner size={32} showHalo={false} /> : t('verify')}
            </Button>
          </FadeUp>
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
        <View style={{ position: 'absolute', bottom: 56, left: 0, right: 0, alignItems: 'center' }}>
          <Tap onPress={onCancel}>
            <AppText weight="600" style={{ color: 'rgba(255,255,255,0.7)', fontSize: 14.5 }}>
              {t('bioCancel')}
            </AppText>
          </Tap>
        </View>
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
