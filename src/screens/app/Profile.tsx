// Perfil — fiel a screens-profile.jsx (hero navy, secciones, sheets).
import React, { useEffect, useState } from 'react';
import { Image, Modal, Pressable, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { alpha, colors, gradients, radius, shadows } from '../../theme/tokens';
import { Icon, IconName } from '../../components/Icon';
import { AppText, Avatar, CheckMark, Field, IconButton, Screen, Sheet, Tap, haptic } from '../../components/ui';
import { deviceLocale } from '../../i18n';
import { useApp } from '../../store/AppContext';
import { updateMe, uploadAvatar, deleteAvatar } from '../../lib/api/me';
import { supabase } from '../../lib/supabase';

const GLOBE = require('../../../assets/logo/logo-globe.png');

export function Profile() {
  const { t, me, setMe, signOut, biometricEnabled, setBiometricEnabled, localePref, setLocalePref, showToast } = useApp();
  const insets = useSafeAreaInsets();
  const [editOpen, setEditOpen] = useState(false);
  const [langOpen, setLangOpen] = useState(false);
  const [avatarSheet, setAvatarSheet] = useState(false);
  const [pwOpen, setPwOpen] = useState(false);

  const langLabel = { auto: 'Auto', en: 'English', es: 'Español' }[localePref];

  const es = t.locale === 'es';

  const handleAsset = async (res: ImagePicker.ImagePickerResult) => {
    if (res.canceled || !res.assets?.[0]) return;
    try {
      const a = res.assets[0];
      const updated = await uploadAvatar(a.uri, a.mimeType || 'image/jpeg');
      setMe(updated);
      haptic('success');
      showToast(t('done'));
    } catch (e: any) {
      showToast(e?.message || t('errorGeneric'), 'error');
    }
  };

  // Cierra el sheet y, tras la animación de cierre, abre el picker
  // (en iOS no se puede presentar el picker mientras el modal se cierra).
  const takePhoto = () => {
    setAvatarSheet(false);
    setTimeout(async () => {
      const perm = await ImagePicker.requestCameraPermissionsAsync();
      if (!perm.granted) {
        showToast(es ? 'Permiso de cámara denegado' : 'Camera permission denied', 'warn');
        return;
      }
      const res = await ImagePicker.launchCameraAsync({ allowsEditing: true, aspect: [1, 1], quality: 0.8 });
      handleAsset(res);
    }, 450);
  };

  const pickFromGallery = () => {
    setAvatarSheet(false);
    setTimeout(async () => {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) {
        showToast(es ? 'Permiso de galería denegado' : 'Photo library permission denied', 'warn');
        return;
      }
      const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: true, aspect: [1, 1], quality: 0.8 });
      handleAsset(res);
    }, 450);
  };

  const removeAvatar = async () => {
    setAvatarSheet(false);
    try {
      const updated = await deleteAvatar();
      setMe(updated);
    } catch (e: any) {
      showToast(e?.message || t('errorGeneric'), 'error');
    }
  };

  return (
    <Screen padTop={false} padBottom={132}>
      {/* hero */}
      <View style={{ borderBottomLeftRadius: 26, borderBottomRightRadius: 26, overflow: 'hidden' }}>
        <LinearGradient colors={gradients.navyDeep} start={{ x: 0.1, y: 0 }} end={{ x: 0.9, y: 1 }} style={{ paddingTop: insets.top + 14, paddingHorizontal: 20, paddingBottom: 26, alignItems: 'center' }}>
          <View style={{ position: 'absolute', width: 240, height: 240, borderRadius: 999, top: -120, left: -60, backgroundColor: alpha(colors.accent, 0.2) }} />
          <View style={{ alignSelf: 'flex-end' }}>
            <IconButton name="edit" variant="glassDark" color="#fff" onPress={() => setEditOpen(true)} />
          </View>
          <Tap onPress={() => setAvatarSheet(true)} hapticKind="light" style={{ marginTop: 4 }}>
            <View>
              <Avatar name={me?.fullName} src={me?.avatarUrl} size={92} />
              <View style={{ position: 'absolute', bottom: 0, right: 0, width: 30, height: 30, borderRadius: 999, backgroundColor: colors.accent, borderWidth: 3, borderColor: colors.navy900, alignItems: 'center', justifyContent: 'center' }}>
                <Icon name="camera" size={15} color="#fff" />
              </View>
            </View>
          </Tap>
          <AppText serif weight="600" style={{ fontSize: 23, color: '#fff', marginTop: 14 }}>
            {me?.fullName || me?.email}
          </AppText>
          <AppText style={{ color: 'rgba(255,255,255,0.65)', fontSize: 13.5, marginTop: 3 }}>{me?.email}</AppText>
          {me?.provider ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 7, marginTop: 12, backgroundColor: 'rgba(255,255,255,0.1)', paddingHorizontal: 13, paddingVertical: 7, borderRadius: 999 }}>
              <Icon name="map" size={15} color={colors.accent} />
              <AppText weight="600" style={{ color: '#fff', fontSize: 12.5 }}>
                {me.provider}
              </AppText>
            </View>
          ) : null}
        </LinearGradient>
      </View>

      {/* security */}
      <Section title={t('security')}>
        <Row icon="faceid" label={t('biometricUnlock')} right={<Switch on={biometricEnabled} onChange={(v) => { haptic('select'); setBiometricEnabled(v); }} />} />
        <Row icon="lock" label={t('changePassword')} chevron onPress={() => setPwOpen(true)} last />
      </Section>

      {/* account */}
      <Section title={t('account')}>
        <Row icon="settings" label={t('language')} value={langLabel} chevron onPress={() => setLangOpen(true)} />
        <Row icon="user" label={t('editProfile')} chevron onPress={() => setEditOpen(true)} last />
      </Section>

      {/* sign out */}
      <View style={{ paddingHorizontal: 16, paddingTop: 8 }}>
        <Tap onPress={signOut} hapticKind="medium" style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 9, height: 52, borderRadius: radius.md, backgroundColor: alpha(colors.error, 0.1) }}>
          <Icon name="logout" size={20} color={colors.error} />
          <AppText weight="600" style={{ color: colors.error, fontSize: 15 }}>
            {t('signOut')}
          </AppText>
        </Tap>
      </View>

      {/* footer */}
      <View style={{ alignItems: 'center', paddingTop: 20, paddingBottom: 10, gap: 8 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 7 }}>
          <Image source={GLOBE} style={{ width: 16, height: 16, opacity: 0.55, tintColor: colors.ink40 }} resizeMode="contain" />
          <AppText weight="600" style={{ color: colors.ink40, fontSize: 11.5 }}>
            Azahares · v1.0.0
          </AppText>
        </View>
        <AppText style={{ color: colors.ink30, fontSize: 11 }}>
          Designed by{' '}
          <AppText weight="700" style={{ color: colors.ink50, fontSize: 11 }}>
            Logirapid
          </AppText>
        </AppText>
      </View>

      {/* language sheet */}
      <Sheet open={langOpen} onClose={() => setLangOpen(false)} title={t('language')}>
        <View style={{ paddingHorizontal: 16, paddingBottom: 28 }}>
          {([
            ['auto', `Auto (${deviceLocale() === 'es' ? 'Español' : 'English'})`],
            ['en', 'English'],
            ['es', 'Español'],
          ] as const).map(([k, lab]) => (
            <Tap
              key={k}
              hapticKind="select"
              onPress={() => {
                setLocalePref(k);
                setLangOpen(false);
              }}
              style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 15, paddingHorizontal: 8, borderBottomWidth: 1, borderBottomColor: colors.line }}
            >
              <AppText weight="600" style={{ flex: 1, fontSize: 15.5, color: colors.ink }}>
                {lab}
              </AppText>
              {localePref === k && <CheckMark size={20} color={colors.accent} />}
            </Tap>
          ))}
        </View>
      </Sheet>

      {/* edit sheet */}
      <EditSheet open={editOpen} onClose={() => setEditOpen(false)} />

      {/* change password sheet */}
      <PasswordSheet open={pwOpen} onClose={() => setPwOpen(false)} />

      {/* avatar sheet */}
      <Sheet open={avatarSheet} onClose={() => setAvatarSheet(false)} title={t('editProfile')}>
        <View style={{ paddingHorizontal: 16, paddingBottom: 28, gap: 10 }}>
          <SheetAction icon="camera" label={es ? 'Tomar foto' : 'Take photo'} onPress={takePhoto} />
          <SheetAction icon="image" label={es ? 'Elegir de galería' : 'Choose from gallery'} onPress={pickFromGallery} />
          {me?.avatarUrl ? <SheetAction icon="trash" label={t('remove')} danger onPress={removeAvatar} /> : null}
        </View>
      </Sheet>
    </Screen>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={{ paddingHorizontal: 16, paddingTop: 22 }}>
      <AppText weight="700" style={{ fontSize: 12, color: colors.ink40, letterSpacing: 0.6, marginHorizontal: 6, marginBottom: 9 }}>
        {title.toUpperCase()}
      </AppText>
      <View style={{ backgroundColor: colors.surface, borderRadius: radius.lg, overflow: 'hidden', ...shadows.sm }}>{children}</View>
    </View>
  );
}

function Row({
  icon,
  label,
  value,
  right,
  chevron,
  onPress,
  last,
}: {
  icon: IconName;
  label: string;
  value?: string;
  right?: React.ReactNode;
  chevron?: boolean;
  onPress?: () => void;
  last?: boolean;
}) {
  const content = (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 13, paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: last ? 0 : 1, borderBottomColor: colors.line }}>
      <View style={{ width: 34, height: 34, borderRadius: 10, backgroundColor: alpha(colors.navy500, 0.11), alignItems: 'center', justifyContent: 'center' }}>
        <Icon name={icon} size={18} color={colors.navy700} />
      </View>
      <AppText weight="600" style={{ flex: 1, fontSize: 15, color: colors.ink }}>
        {label}
      </AppText>
      {value ? <AppText weight="500" style={{ fontSize: 13.5, color: colors.ink50 }}>{value}</AppText> : null}
      {right}
      {chevron && <Icon name="chevR" size={18} color={colors.ink30} />}
    </View>
  );
  if (onPress) {
    return (
      <Tap onPress={onPress} hapticKind="light">
        {content}
      </Tap>
    );
  }
  return content;
}

function Switch({ on, onChange }: { on: boolean; onChange: (v: boolean) => void }) {
  return (
    <Tap onPress={() => onChange(!on)} hapticKind={null}>
      <View style={{ width: 50, height: 30, borderRadius: 999, padding: 3, backgroundColor: on ? colors.success : colors.line, alignItems: on ? 'flex-end' : 'flex-start' }}>
        <View style={{ width: 24, height: 24, borderRadius: 999, backgroundColor: '#fff', ...shadows.sm }} />
      </View>
    </Tap>
  );
}

function SheetAction({ icon, label, onPress, danger }: { icon: IconName; label: string; onPress: () => void; danger?: boolean }) {
  return (
    <Tap onPress={onPress} hapticKind="light" style={{ flexDirection: 'row', alignItems: 'center', gap: 13, paddingHorizontal: 16, paddingVertical: 15, borderRadius: 14, backgroundColor: danger ? alpha(colors.error, 0.09) : colors.bg }}>
      <Icon name={icon} size={20} color={danger ? colors.error : colors.ink} />
      <AppText weight="600" style={{ fontSize: 15, color: danger ? colors.error : colors.ink }}>
        {label}
      </AppText>
    </Tap>
  );
}

const COUNTRIES = [
  { c: 'US', flag: '🇺🇸', dial: '+1' },
  { c: 'MX', flag: '🇲🇽', dial: '+52' },
  { c: 'CR', flag: '🇨🇷', dial: '+506' },
  { c: 'CO', flag: '🇨🇴', dial: '+57' },
  { c: 'PA', flag: '🇵🇦', dial: '+507' },
  { c: 'ES', flag: '🇪🇸', dial: '+34' },
  { c: 'DO', flag: '🇩🇴', dial: '+1809' },
  { c: 'VE', flag: '🇻🇪', dial: '+58' },
];

function EditSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { t, me, setMe, showToast } = useApp();
  const [name, setName] = useState(me?.fullName || '');
  const [phone, setPhone] = useState(me?.phone || '');
  const [country, setCountry] = useState('US');
  const [countryOpen, setCountryOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const cur = COUNTRIES.find((x) => x.c === country) || COUNTRIES[0];

  useEffect(() => {
    if (open) {
      setName(me?.fullName || '');
      setPhone(me?.phone || '');
    }
  }, [open, me]);

  const save = async () => {
    setBusy(true);
    try {
      const updated = await updateMe({ fullName: name.trim(), phone: phone.trim() });
      setMe(updated);
      onClose();
      haptic('success');
      showToast(t('save'), 'success');
    } catch (e: any) {
      showToast(e?.message || t('errorGeneric'), 'error');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Sheet open={open} onClose={onClose} title={t('editProfile')}>
      <View style={{ paddingHorizontal: 16, paddingBottom: 28, gap: 16, paddingTop: 8 }}>
        <Field label={t('fullName')} icon="user" value={name} onChangeText={setName} autoCapitalize="words" />
        <Field label={t('email')} icon="mail" value={me?.email || ''} onChangeText={() => {}} />
        {/* phone con selector de país */}
        <View>
          <AppText weight="600" style={{ fontSize: 13, color: colors.ink60, marginBottom: 7, marginLeft: 2 }}>
            {t('phone')}
          </AppText>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <Tap onPress={() => setCountryOpen(true)} hapticKind="light" style={{ flexDirection: 'row', alignItems: 'center', gap: 7, height: 52, paddingHorizontal: 12, borderRadius: radius.md, borderWidth: 1.5, borderColor: colors.line, backgroundColor: colors.surface }}>
              <AppText style={{ fontSize: 20 }}>{cur.flag}</AppText>
              <AppText weight="700" style={{ fontSize: 15, color: colors.ink }}>
                {cur.dial}
              </AppText>
              <Icon name="chevD" size={16} color={colors.ink40} />
            </Tap>
            <View style={{ flex: 1 }}>
              <Field value={phone} onChangeText={(v) => setPhone(v.replace(/[^\d\s]/g, ''))} placeholder="305 555 0142" keyboardType="phone-pad" />
            </View>
          </View>
        </View>
        <Tap onPress={save} hapticKind="medium">
          <View style={{ height: 54, borderRadius: radius.md, overflow: 'hidden', opacity: busy ? 0.7 : 1 }}>
            <LinearGradient colors={gradients.navy} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 9 }}>
              <Icon name="check" size={20} color="#fff" />
              <AppText weight="600" style={{ color: '#fff', fontSize: 16 }}>
                {busy ? t('loading') : t('save')}
              </AppText>
            </LinearGradient>
          </View>
        </Tap>
      </View>

      {/* country picker modal */}
      <Modal transparent visible={countryOpen} animationType="fade" onRequestClose={() => setCountryOpen(false)}>
        <Pressable onPress={() => setCountryOpen(false)} style={{ flex: 1, backgroundColor: 'rgba(8,14,33,0.5)', alignItems: 'center', justifyContent: 'center', padding: 30 }}>
          <View style={{ width: '100%', maxWidth: 320, backgroundColor: colors.surface, borderRadius: radius.lg, overflow: 'hidden', ...shadows.card }}>
            {COUNTRIES.map((x) => (
              <Tap
                key={x.c}
                hapticKind="select"
                onPress={() => {
                  setCountry(x.c);
                  setCountryOpen(false);
                }}
                style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 16, paddingVertical: 13, borderBottomWidth: 1, borderBottomColor: colors.line, backgroundColor: x.c === country ? alpha(colors.accent, 0.08) : 'transparent' }}
              >
                <AppText style={{ fontSize: 19 }}>{x.flag}</AppText>
                <AppText weight="600" style={{ flex: 1, fontSize: 14, color: colors.ink }}>
                  {x.c}
                </AppText>
                <AppText weight="600" style={{ fontSize: 13.5, color: colors.ink50 }}>
                  {x.dial}
                </AppText>
                {x.c === country && <CheckMark size={16} color={colors.accent} />}
              </Tap>
            ))}
          </View>
        </Pressable>
      </Modal>
    </Sheet>
  );
}

// ── Campo de contraseña con mostrar/ocultar ──────────────────
function PwField({
  label,
  value,
  onChangeText,
  error,
  autoFocus,
}: {
  label: string;
  value: string;
  onChangeText: (v: string) => void;
  error?: boolean;
  autoFocus?: boolean;
}) {
  const [show, setShow] = useState(false);
  return (
    <Field
      label={label}
      icon="lock"
      value={value}
      onChangeText={onChangeText}
      secureTextEntry={!show}
      invalid={error}
      autoFocus={autoFocus}
      placeholder="••••••••"
      right={
        <Tap onPress={() => setShow((v) => !v)} style={{ padding: 8 }} hapticKind={null}>
          <Icon name={show ? 'eyeOff' : 'eye'} size={19} color={colors.ink40} />
        </Tap>
      }
    />
  );
}

function scorePw(pw: string): number {
  let s = 0;
  if (pw.length >= 8) s++;
  if (/[A-Z]/.test(pw)) s++;
  if (/[0-9]/.test(pw)) s++;
  if (/[^A-Za-z0-9]/.test(pw) || pw.length >= 12) s++;
  return s; // 0..4
}

function PasswordSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { t, me, showToast } = useApp();
  const [cur, setCur] = useState('');
  const [pw, setPw] = useState('');
  const [confirm, setConfirm] = useState('');
  const [curErr, setCurErr] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (open) {
      setCur('');
      setPw('');
      setConfirm('');
      setCurErr(false);
    }
  }, [open]);

  const reqs = [
    { key: 'pwReq8', ok: pw.length >= 8 },
    { key: 'pwReqUpper', ok: /[A-Z]/.test(pw) },
    { key: 'pwReqNum', ok: /[0-9]/.test(pw) },
    { key: 'pwReqMatch', ok: pw.length > 0 && pw === confirm },
  ];
  const score = scorePw(pw);
  const allOk = reqs.every((r) => r.ok) && cur.length > 0;
  const mismatch = confirm.length > 0 && confirm !== pw;
  const strengthLabel = [t('pwWeak'), t('pwWeak'), t('pwFair'), t('pwGood'), t('pwStrong')][score];
  const strengthColor = [colors.error, colors.error, colors.amber, colors.accent, colors.success][score];

  const submit = async () => {
    if (!allOk || busy) return;
    setBusy(true);
    try {
      // 1) verificar la contraseña actual reautenticando
      const { error: signErr } = await supabase.auth.signInWithPassword({ email: me?.email || '', password: cur });
      if (signErr) {
        setCurErr(true);
        haptic('warn');
        showToast(t('wrongCurrent'), 'error');
        setBusy(false);
        return;
      }
      // 2) actualizar la contraseña
      const { error: updErr } = await supabase.auth.updateUser({ password: pw });
      if (updErr) throw new Error(updErr.message);
      haptic('success');
      onClose();
      showToast(t('pwUpdated'), 'success');
    } catch (e: any) {
      showToast(e?.message || t('errorGeneric'), 'error');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Sheet open={open} onClose={onClose} title={t('changePassword')}>
      <View style={{ paddingHorizontal: 16, paddingBottom: 12, gap: 16 }}>
        <PwField label={t('currentPassword')} value={cur} onChangeText={(v) => { setCur(v); setCurErr(false); }} error={curErr} autoFocus />
        <View style={{ height: 1, backgroundColor: colors.line, marginHorizontal: -16 }} />
        <PwField label={t('newPassword')} value={pw} onChangeText={setPw} />

        {pw.length > 0 && (
          <View style={{ marginTop: -4 }}>
            <View style={{ flexDirection: 'row', gap: 5, marginBottom: 7 }}>
              {[0, 1, 2, 3].map((i) => (
                <View key={i} style={{ flex: 1, height: 5, borderRadius: 999, backgroundColor: i < score ? strengthColor : colors.line }} />
              ))}
            </View>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <AppText weight="500" style={{ fontSize: 12, color: colors.ink50 }}>
                {t('pwStrength')}
              </AppText>
              <AppText weight="700" style={{ fontSize: 12, color: strengthColor }}>
                {strengthLabel}
              </AppText>
            </View>
          </View>
        )}

        <PwField label={t('confirmPassword')} value={confirm} onChangeText={setConfirm} error={mismatch} />
        {mismatch && (
          <AppText weight="600" style={{ fontSize: 12.5, color: colors.error, marginTop: -8, marginLeft: 2 }}>
            {t('pwMismatch')}
          </AppText>
        )}

        {/* checklist de requisitos */}
        <View style={{ backgroundColor: colors.bg, borderRadius: 14, padding: 12, gap: 9 }}>
          {reqs.map((r) => (
            <View key={r.key} style={{ flexDirection: 'row', alignItems: 'center', gap: 9 }}>
              <View style={{ width: 18, height: 18, borderRadius: 999, alignItems: 'center', justifyContent: 'center', backgroundColor: r.ok ? colors.success : colors.line }}>
                {r.ok ? <CheckMark size={11} /> : <View style={{ width: 5, height: 5, borderRadius: 999, backgroundColor: colors.ink30 }} />}
              </View>
              <AppText weight="500" style={{ fontSize: 13, color: r.ok ? colors.ink : colors.ink50 }}>
                {t(r.key)}
              </AppText>
            </View>
          ))}
        </View>

        <Tap onPress={submit} hapticKind="medium" disabled={!allOk || busy} style={{ opacity: !allOk || busy ? 0.5 : 1 }}>
          <View style={{ height: 54, borderRadius: radius.md, overflow: 'hidden' }}>
            <LinearGradient colors={gradients.navy} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 9 }}>
              <Icon name="lock" size={20} color="#fff" />
              <AppText weight="600" style={{ color: '#fff', fontSize: 16 }}>
                {busy ? t('loading') : t('updatePassword')}
              </AppText>
            </LinearGradient>
          </View>
        </Tap>
      </View>
    </Sheet>
  );
}
