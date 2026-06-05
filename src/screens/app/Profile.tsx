// Perfil: avatar editable, datos, biometría, idioma, cerrar sesión.
import React, { useState } from 'react';
import { View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { alpha, colors, radius, shadows } from '../../theme/tokens';
import { Icon, IconName } from '../../components/Icon';
import { AppText, Avatar, Button, Card, Field, Screen, Segmented, Sheet, Tap, haptic } from '../../components/ui';
import { useApp } from '../../store/AppContext';
import { updateMe, uploadAvatar } from '../../lib/api/me';

export function Profile() {
  const { t, me, setMe, signOut, biometricEnabled, setBiometricEnabled, localePref, setLocalePref, showToast } = useApp();
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(me?.fullName || '');
  const [phone, setPhone] = useState(me?.phone || '');
  const [savingName, setSavingName] = useState(false);

  const pickAvatar = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) return;
    const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: true, aspect: [1, 1], quality: 0.8 });
    if (res.canceled || !res.assets[0]) return;
    try {
      const updated = await uploadAvatar(res.assets[0].uri, res.assets[0].mimeType || 'image/jpeg');
      setMe(updated);
      showToast(t('done'));
    } catch (e: any) {
      showToast(e?.message || t('errorGeneric'), 'error');
    }
  };

  const saveProfile = async () => {
    setSavingName(true);
    try {
      const updated = await updateMe({ fullName: name.trim(), phone: phone.trim() });
      setMe(updated);
      setEditing(false);
      showToast(t('done'));
    } catch (e: any) {
      showToast(e?.message || t('errorGeneric'), 'error');
    } finally {
      setSavingName(false);
    }
  };

  return (
    <Screen padBottom={120}>
      {/* hero */}
      <View style={{ alignItems: 'center', paddingTop: 24, paddingBottom: 8 }}>
        <Tap onPress={pickAvatar} hapticKind="medium">
          <View>
            <Avatar name={me?.fullName} src={me?.avatarUrl} size={92} />
            <View style={{ position: 'absolute', right: -2, bottom: -2, width: 32, height: 32, borderRadius: 999, backgroundColor: colors.navy700, alignItems: 'center', justifyContent: 'center', borderWidth: 3, borderColor: colors.bg }}>
              <Icon name="camera" size={15} color="#fff" />
            </View>
          </View>
        </Tap>
        <AppText serif weight="600" style={{ fontSize: 24, marginTop: 14 }}>
          {me?.fullName || me?.email}
        </AppText>
        <AppText style={{ color: colors.ink50, fontSize: 13.5, marginTop: 2 }}>{me?.email}</AppText>
        {me?.provider ? (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8, backgroundColor: alpha(colors.navy500, 0.1), paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999 }}>
            <Icon name="map" size={14} color={colors.navy700} />
            <AppText weight="600" style={{ color: colors.navy700, fontSize: 12.5 }}>
              {me.provider}
            </AppText>
          </View>
        ) : null}
        <View style={{ marginTop: 16, width: '100%', paddingHorizontal: 16 }}>
          <Button variant="outline" icon="edit" onPress={() => setEditing(true)}>
            {t('editProfile')}
          </Button>
        </View>
      </View>

      {/* security */}
      <View style={{ paddingHorizontal: 16, paddingTop: 14 }}>
        <SectionLabel>{t('security')}</SectionLabel>
        <Card pad={0}>
          <Row icon="faceid" label={t('biometricUnlock')}>
            <Switch value={biometricEnabled} onChange={setBiometricEnabled} />
          </Row>
          <Divider />
          <Row icon="key" label={t('changePassword')} chevron />
        </Card>
      </View>

      {/* language */}
      <View style={{ paddingHorizontal: 16, paddingTop: 14 }}>
        <SectionLabel>{t('language')}</SectionLabel>
        <Segmented
          options={[
            { value: 'auto', label: 'Auto' },
            { value: 'en', label: 'EN' },
            { value: 'es', label: 'ES' },
          ]}
          value={localePref}
          onChange={(v) => setLocalePref(v as any)}
        />
      </View>

      {/* sign out */}
      <View style={{ paddingHorizontal: 16, paddingTop: 18 }}>
        <Button variant="danger" icon="logout" onPress={signOut}>
          {t('signOut')}
        </Button>
      </View>

      <View style={{ alignItems: 'center', paddingTop: 22 }}>
        <AppText style={{ color: colors.ink40, fontSize: 11 }}>
          Designed by{' '}
          <AppText weight="700" style={{ color: colors.ink50, fontSize: 11 }}>
            Logirapid
          </AppText>
        </AppText>
        <AppText style={{ color: colors.ink30, fontSize: 11, marginTop: 2 }}>
          {t('appVersion')} 1.0.0
        </AppText>
      </View>

      {/* edit sheet */}
      <Sheet open={editing} onClose={() => setEditing(false)} title={t('editProfile')}>
        <View style={{ paddingHorizontal: 20, gap: 16, paddingTop: 6 }}>
          <Field label={t('fullName')} icon="user" value={name} onChangeText={setName} autoCapitalize="words" placeholder={t('fullName')} />
          <Field label={t('phone')} icon="bell" value={phone} onChangeText={setPhone} keyboardType="phone-pad" placeholder="+1 305 ..." />
          <Button onPress={saveProfile} loading={savingName} icon="check">
            {t('save')}
          </Button>
        </View>
      </Sheet>
    </Screen>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <AppText weight="600" style={{ fontSize: 12.5, color: colors.ink50, marginBottom: 9, marginLeft: 4, letterSpacing: 0.3 }}>
      {String(children).toUpperCase()}
    </AppText>
  );
}

function Row({ icon, label, children, chevron }: { icon: IconName; label: string; children?: React.ReactNode; chevron?: boolean }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14 }}>
      <View style={{ width: 34, height: 34, borderRadius: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: alpha(colors.navy500, 0.11) }}>
        <Icon name={icon} size={18} color={colors.navy700} />
      </View>
      <AppText weight="500" style={{ flex: 1, fontSize: 15, color: colors.ink }}>
        {label}
      </AppText>
      {children}
      {chevron && <Icon name="chevR" size={18} color={colors.ink30} />}
    </View>
  );
}

function Divider() {
  return <View style={{ height: 1, backgroundColor: colors.line, marginLeft: 60 }} />;
}

function Switch({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) {
  return (
    <Tap
      onPress={() => {
        haptic('select');
        onChange(!value);
      }}
      hapticKind={null}
    >
      <View
        style={{
          width: 48,
          height: 30,
          borderRadius: 999,
          padding: 3,
          backgroundColor: value ? colors.success : colors.line,
          alignItems: value ? 'flex-end' : 'flex-start',
        }}
      >
        <View style={{ width: 24, height: 24, borderRadius: 999, backgroundColor: '#fff', ...shadows.sm }} />
      </View>
    </Tap>
  );
}
