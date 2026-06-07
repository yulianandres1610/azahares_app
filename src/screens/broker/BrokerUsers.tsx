// Equipo (solo owner): usuarios REALES (GET /users) + alta (POST /users).
import React, { useState } from 'react';
import { ActivityIndicator, RefreshControl, ScrollView, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Circle, Defs, RadialGradient as SvgRadial, Stop } from 'react-native-svg';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { alpha, colors, gradients, radius } from '../../theme/tokens';
import { Icon } from '../../components/Icon';
import { AppText, Avatar, Button, Card, Field, IconButton, Screen, Slider, Tap, haptic } from '../../components/ui';
import { useApp } from '../../store/AppContext';
import { useBroker, brokerApi } from '../../store/BrokerStore';
import { CountryCode, FadeUp, Hero, HeroStat, UserBadge, useBkNav } from './ui';

function genPassword() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';
  let p = '';
  for (let i = 0; i < 12; i++) p += chars[Math.floor((i * 9301 + 49297 + Date.now()) % chars.length)];
  return 'Az' + p + '!9';
}

export function BrokerUsers() {
  const { me, showToast } = useApp();
  const { users, loading, refreshUsers } = useBroker();
  const nav = useBkNav();
  const owner = me?.role === 'broker_owner';
  const [q, setQ] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const list = users.filter((u) => `${u.fullName || ''} ${u.email}`.toLowerCase().includes(q.toLowerCase()));

  if (!owner) {
    return (
      <Screen padBottom={108} scroll={false}>
        <Hero><AppText serif weight="600" style={{ fontSize: 26, color: '#fff' }}>Equipo</AppText></Hero>
        <View style={{ alignItems: 'center', paddingVertical: 70, paddingHorizontal: 30 }}>
          <Icon name="lock" size={42} color={colors.ink40} />
          <AppText serif weight="600" style={{ fontSize: 20, color: colors.ink, marginTop: 14 }}>Solo el dueño</AppText>
          <AppText style={{ fontSize: 14, color: colors.ink50, marginTop: 8, textAlign: 'center' }}>La gestión del equipo es exclusiva del rol owner.</AppText>
        </View>
      </Screen>
    );
  }

  const active = users.filter((u) => u.status === 'active').length;
  const onRefresh = async () => { setRefreshing(true); await refreshUsers(); setRefreshing(false); };

  return (
    <Screen padBottom={108} scroll={false}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 130 }} keyboardShouldPersistTaps="handled" refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.navy700} />}>
        <Hero>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <AppText serif weight="600" style={{ fontSize: 26, color: '#fff' }}>Equipo</AppText>
            <IconButton name="plus" variant="glassDark" onPress={() => nav.openOverlay({ type: 'newUser' })} />
          </View>
          <View style={{ flexDirection: 'row', gap: 8, marginTop: 16 }}>
            <HeroStat value={active} label="Activos" />
            <HeroStat value={users.length} label="Usuarios" />
            <HeroStat value={users.filter((u) => u.status === 'invited').length} label="Invitados" tone={colors.amber} />
          </View>
        </Hero>

        <View style={{ padding: 16, paddingBottom: 0 }}>
          <Field icon="search" placeholder="Buscar usuario" value={q} onChangeText={setQ} right={q ? <IconButton name="x" variant="plain" iconSize={16} size={32} onPress={() => setQ('')} /> : undefined} />
        </View>

        {loading && users.length === 0 ? (
          <View style={{ paddingTop: 50, alignItems: 'center' }}><ActivityIndicator color={colors.navy700} /></View>
        ) : (
          <View style={{ paddingHorizontal: 16, paddingTop: 14, gap: 11 }}>
            {list.map((u, i) => (
              <FadeUp key={u.id} delay={i * 40}>
                <Card pad={14} onPress={() => showToast(u.fullName || u.email, 'info')}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 13 }}>
                    <Avatar name={u.fullName || u.email} src={u.avatarUrl} size={46} />
                    <View style={{ flex: 1, minWidth: 0 }}>
                      <AppText weight="700" numberOfLines={1} style={{ fontSize: 14.5, color: colors.ink }}>{u.fullName || u.email}</AppText>
                      <AppText numberOfLines={1} style={{ fontSize: 12.5, color: colors.ink50, marginTop: 2 }}>{u.email}</AppText>
                    </View>
                    <View style={{ alignItems: 'flex-end', gap: 6 }}>
                      <UserBadge status={u.status} size="sm" />
                      <AppText weight="600" style={{ fontSize: 11, color: colors.ink40 }}>{u.role === 'broker_owner' ? 'Owner' : 'Seller'}</AppText>
                    </View>
                  </View>
                </Card>
              </FadeUp>
            ))}
          </View>
        )}
      </ScrollView>
    </Screen>
  );
}

export function NewUser({ onClose }: { onClose: () => void }) {
  const { me, showToast } = useApp();
  const { refreshUsers } = useBroker();
  const insets = useSafeAreaInsets();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [country, setCountry] = useState('+53');
  const [phone, setPhone] = useState('');
  const [role, setRole] = useState<'broker_seller' | 'broker_owner'>('broker_seller');
  const [commission, setCommission] = useState(4);
  const [busy, setBusy] = useState(false);
  const valid = !!(name.trim() && /\S+@\S+\.\S+/.test(email) && phone.replace(/\D/g, '').length >= 6) && !busy;
  const initials = (name.trim() || '?').split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase();
  const isSeller = role === 'broker_seller';

  const submit = async () => {
    setBusy(true); haptic('success');
    try {
      await brokerApi.createUser({
        fullName: name.trim(), email: email.trim(), password: genPassword(), role,
        phone: country + ' ' + phone, organizationId: me?.organization?.id,
      });
      await refreshUsers();
      onClose();
      showToast('Usuario creado · ' + name.trim(), 'success');
    } catch (e: any) {
      setBusy(false);
      showToast(e?.message || 'No se pudo crear el usuario', 'error');
    }
  };

  return (
    <Screen scroll={false} padTop={false}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 120 }} keyboardShouldPersistTaps="handled">
        <View style={{ borderBottomLeftRadius: 26, borderBottomRightRadius: 26, overflow: 'hidden' }}>
          <LinearGradient colors={gradients.navyDeep} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
            <Svg width={220} height={220} style={{ position: 'absolute', top: -110, right: -50 }}>
              <Defs><SvgRadial id="nuGlow" cx="50%" cy="50%" r="50%"><Stop offset="0" stopColor={colors.accent} stopOpacity={0.4} /><Stop offset="0.7" stopColor={colors.accent} stopOpacity={0} /></SvgRadial></Defs>
              <Circle cx={110} cy={110} r={110} fill="url(#nuGlow)" />
            </Svg>
            <View style={{ paddingTop: insets.top + 2, paddingHorizontal: 16, paddingBottom: 20 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                <View style={{ width: 40 }} />
                <AppText serif weight="600" style={{ fontSize: 20, color: '#fff', flex: 1, textAlign: 'center' }}>Nuevo usuario</AppText>
                <IconButton name="x" variant="glassDark" onPress={onClose} />
              </View>
              <View style={{ alignItems: 'center', marginTop: 14 }}>
                <View style={{ width: 64, height: 64, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.14)', alignItems: 'center', justifyContent: 'center' }}>
                  <AppText serif weight="700" style={{ color: '#fff', fontSize: 24 }}>{initials}</AppText>
                </View>
                <AppText serif weight="600" style={{ color: '#fff', fontSize: 18, marginTop: 10 }}>{name.trim() || 'Nombre del usuario'}</AppText>
                <AppText style={{ color: 'rgba(255,255,255,0.6)', fontSize: 12.5, marginTop: 2 }}>{isSeller ? 'Vendedor' : 'Dueño'}{isSeller ? ` · ${commission}% comisión` : ''}</AppText>
              </View>
            </View>
          </LinearGradient>
        </View>

        <View style={{ padding: 16, gap: 16 }}>
          <View style={{ flexDirection: 'row', gap: 12 }}>
            {([['broker_seller', 'user', 'Vendedor', 'Gestiona sus clientes y órdenes'], ['broker_owner', 'key', 'Dueño', 'Acceso completo al broker']] as const).map(([r, ic, lab, desc]) => {
              const on = role === r;
              const inner = (
                <View style={{ minHeight: 104, justifyContent: 'space-between' }}>
                  <View style={{ width: 38, height: 38, borderRadius: 11, alignItems: 'center', justifyContent: 'center', backgroundColor: on ? 'rgba(255,255,255,0.16)' : alpha(colors.accent, 0.12) }}>
                    <Icon name={ic as any} size={20} color={on ? '#fff' : colors.accent} />
                  </View>
                  <View>
                    <AppText weight="700" style={{ fontSize: 14.5, color: on ? '#fff' : colors.ink60 }}>{lab}</AppText>
                    <AppText weight="500" style={{ fontSize: 11, color: on ? 'rgba(255,255,255,0.82)' : colors.ink50, marginTop: 2, lineHeight: 15 }}>{desc}</AppText>
                  </View>
                </View>
              );
              return (
                <Tap key={r} hapticKind="select" onPress={() => setRole(r as any)} style={{ flex: 1, borderRadius: radius.lg, overflow: 'hidden' }}>
                  {on
                    ? <LinearGradient colors={gradients.navy} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ padding: 14 }}>{inner}</LinearGradient>
                    : <View style={{ padding: 14, backgroundColor: colors.surface, borderWidth: 1.5, borderColor: colors.line, borderRadius: radius.lg }}>{inner}</View>}
                </Tap>
              );
            })}
          </View>

          <Field label="Nombre completo" icon="user" value={name} onChangeText={setName} autoCapitalize="words" />
          <Field label="Email" icon="mail" value={email} onChangeText={setEmail} keyboardType="email-address" />
          <View>
            <AppText weight="600" style={{ fontSize: 13, color: colors.ink60, marginBottom: 7, marginLeft: 2 }}>Teléfono</AppText>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <CountryCode value={country} onChange={setCountry} />
              <View style={{ flex: 1 }}><Field icon="dollar" placeholder="5 234 5678" value={phone} onChangeText={(v) => setPhone(v.replace(/[^\d\s]/g, ''))} keyboardType="phone-pad" /></View>
            </View>
          </View>

          {isSeller && (
            <FadeUp>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10, marginLeft: 2 }}>
                <AppText weight="600" style={{ fontSize: 13, color: colors.ink60 }}>Comisión del vendedor</AppText>
                <AppText serif weight="700" style={{ fontSize: 20, color: colors.navy700 }}>{commission}%</AppText>
              </View>
              <Slider min={0} max={15} step={0.5} value={commission} onChange={setCommission} />
              <View style={{ flexDirection: 'row', gap: 8, marginTop: 10 }}>
                {[3, 4, 5, 6].map((v) => (
                  <Tap key={v} hapticKind="select" onPress={() => setCommission(v)} style={{ flex: 1, height: 34, borderRadius: 999, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                    {commission === v
                      ? <LinearGradient colors={gradients.navy} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={{ position: 'absolute', inset: 0 as any }} />
                      : <View style={{ position: 'absolute', inset: 0 as any, backgroundColor: alpha(colors.navy500, 0.1) }} />}
                    <AppText weight="600" style={{ fontSize: 12.5, color: commission === v ? '#fff' : colors.navy700 }}>{v}%</AppText>
                  </Tap>
                ))}
              </View>
            </FadeUp>
          )}
        </View>
      </ScrollView>

      <View style={{ position: 'absolute', left: 0, right: 0, bottom: 0, paddingHorizontal: 16, paddingTop: 16, paddingBottom: (insets.bottom || 0) + 16, backgroundColor: colors.bg }}>
        <Button variant="primary" icon="send" disabled={!valid} loading={busy} onPress={submit}>Crear usuario</Button>
      </View>
    </Screen>
  );
}
