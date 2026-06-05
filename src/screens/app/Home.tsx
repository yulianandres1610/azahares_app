// Home: dashboard de yarda con clima + gauges (datos reales).
import React, { useEffect, useRef, useState } from 'react';
import { Animated, Easing, ScrollView, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { alpha, colors, gradients, radius, shadows } from '../../theme/tokens';
import { Icon, IconName } from '../../components/Icon';
import { AppText, Avatar, IconButton, Ring, Screen, Tap, haptic } from '../../components/ui';
import { counts, statusMeta } from '../../domain';
import { useApp } from '../../store/AppContext';
import { useNav } from '../../store/ShellNav';
import { useWeather, weatherCondition, weatherIcon } from '../../lib/weather';
import type { T } from '../../i18n';

// Entrada slide-up + fade (azUp del diseño).
function FadeUp({ children, delay = 0, style }: { children: React.ReactNode; delay?: number; style?: any }) {
  const a = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(a, { toValue: 1, duration: 500, delay, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();
  }, [a, delay]);
  return (
    <Animated.View style={[{ opacity: a, transform: [{ translateY: a.interpolate({ inputRange: [0, 1], outputRange: [16, 0] }) }] }, style]}>
      {children}
    </Animated.View>
  );
}

// Flotación infinita (azFloat: 0 -> -7 -> 0).
function Floating({ children, style }: { children: React.ReactNode; style?: any }) {
  const y = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(y, { toValue: 1, duration: 2000, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(y, { toValue: 0, duration: 2000, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [y]);
  return <Animated.View style={[{ transform: [{ translateY: y.interpolate({ inputRange: [0, 1], outputRange: [0, -7] }) }] }, style]}>{children}</Animated.View>;
}

export function Home() {
  const { t, me, containers, notifications } = useApp();
  const nav = useNav();
  const c = counts(containers);
  const [anim, setAnim] = useState(false);
  useEffect(() => {
    const r = setTimeout(() => setAnim(true), 60);
    return () => clearTimeout(r);
  }, []);

  const firstName = (me?.fullName || me?.email || '').split(' ')[0] || '';

  const metrics = [
    { key: 'visual_inspection', n: c.visual, label: t('inVisual') },
    { key: 'refuel_inspection', n: c.refuel, label: t('inRefuel') },
    { key: 'available', n: c.available, label: t('available') },
    { key: 'returning', n: c.returning, label: t('inReturn') },
  ];

  const goFilter = (f: string) => {
    nav.setFilter(f);
    haptic('select');
    nav.setTab('containers');
  };

  return (
    <Screen padBottom={108}>
      {/* greeting */}
      <FadeUp style={{ paddingHorizontal: 20, paddingTop: 6, paddingBottom: 2, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <View style={{ flex: 1, minWidth: 0 }}>
          <AppText weight="500" style={{ fontSize: 13.5, color: colors.ink50 }}>
            {t('yardConsole')}
          </AppText>
          <AppText serif weight="600" style={{ fontSize: 27, color: colors.ink, letterSpacing: -0.3, marginTop: 2 }}>
            {t('hello')}, {firstName} 👋
          </AppText>
        </View>
        <View>
          <IconButton name="bell" variant="surface" onPress={() => nav.openOverlay({ type: 'notifications' })} />
          {notifications.some((n) => !n.read) && (
            <View style={{ position: 'absolute', top: 9, right: 10, width: 8, height: 8, borderRadius: 999, backgroundColor: colors.error, borderWidth: 2, borderColor: colors.surface }} />
          )}
        </View>
        <Tap onPress={() => nav.setTab('profile')}>
          <Avatar name={me?.fullName} src={me?.avatarUrl} size={42} />
        </Tap>
      </FadeUp>

      <WeatherCard t={t} />

      {/* hero stat card */}
      <FadeUp delay={70} style={{ paddingHorizontal: 16, paddingTop: 14 }}>
        <View style={{ borderRadius: radius.xl, overflow: 'hidden', ...shadows.card }}>
          <LinearGradient colors={gradients.navyDeep} start={{ x: 0.1, y: 0 }} end={{ x: 0.9, y: 1 }} style={{ padding: 20 }}>
            <View
              style={{
                position: 'absolute',
                width: 240,
                height: 240,
                borderRadius: 999,
                top: -120,
                right: -90,
                backgroundColor: alpha(colors.accent, 0.22),
              }}
            />
            <View style={{ flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between' }}>
              <View>
                <AppText weight="500" style={{ color: 'rgba(255,255,255,0.62)', fontSize: 13 }}>
                  {t('today')}
                </AppText>
                <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 8, marginTop: 4 }}>
                  <AppText serif weight="600" style={{ fontSize: 46, color: '#fff', lineHeight: 48 }}>
                    {c.total}
                  </AppText>
                  <AppText style={{ color: 'rgba(255,255,255,0.6)', fontSize: 14, marginBottom: 6 }}>
                    {t('containersLc')}
                  </AppText>
                </View>
              </View>
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 6,
                  backgroundColor: alpha(colors.success, 0.18),
                  paddingHorizontal: 11,
                  paddingVertical: 6,
                  borderRadius: 999,
                }}
              >
                <Icon name="sparkle" size={14} color={colors.success} />
                <AppText weight="600" style={{ color: colors.success, fontSize: 12.5 }}>
                  {c.available} {t('available').toLowerCase()}
                </AppText>
              </View>
            </View>

            {/* gauges */}
            <View style={{ flexDirection: 'row', gap: 8, marginTop: 14 }}>
              {metrics.map((m) => {
                const meta = statusMeta(m.key);
                const frac = c.total ? m.n / c.total : 0;
                return (
                  <Tap
                    key={m.key}
                    onPress={() => goFilter(m.key)}
                    style={{
                      flex: 1,
                      backgroundColor: 'rgba(255,255,255,0.07)',
                      borderRadius: 16,
                      paddingVertical: 12,
                      paddingHorizontal: 6,
                      alignItems: 'center',
                      gap: 7,
                    }}
                  >
                    <Ring value={anim ? frac : 0} size={50} stroke={5} color={meta.color} track="rgba(255,255,255,0.12)">
                      <AppText weight="700" style={{ color: '#fff', fontSize: 17 }}>
                        {m.n}
                      </AppText>
                    </Ring>
                    <AppText weight="600" style={{ color: 'rgba(255,255,255,0.7)', fontSize: 10.5, textAlign: 'center' }}>
                      {m.label}
                    </AppText>
                  </Tap>
                );
              })}
            </View>
          </LinearGradient>
        </View>
      </FadeUp>

      {/* CTAs */}
      <FadeUp delay={130} style={{ paddingHorizontal: 16, paddingTop: 12, flexDirection: 'row', gap: 12 }}>
        <Tap onPress={() => nav.openOverlay({ type: 'new' })} hapticKind="medium" style={{ flex: 1.3 }}>
          <View style={{ borderRadius: radius.lg, overflow: 'hidden', minHeight: 94, ...shadows.card }}>
            <LinearGradient colors={gradients.navy} style={{ flex: 1, padding: 16, justifyContent: 'space-between' }}>
              <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.16)', alignItems: 'center', justifyContent: 'center' }}>
                <Icon name="plus" size={24} color="#fff" />
              </View>
              <AppText weight="600" style={{ color: '#fff', fontSize: 15.5 }}>
                {t('newContainer')}
              </AppText>
            </LinearGradient>
          </View>
        </Tap>
        <Tap onPress={() => nav.openOverlay({ type: 'scan' })} hapticKind="medium" style={{ flex: 1 }}>
          <View style={{ borderRadius: radius.lg, backgroundColor: colors.surface, padding: 16, minHeight: 94, justifyContent: 'space-between', ...shadows.card }}>
            <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: alpha(colors.accent, 0.14), alignItems: 'center', justifyContent: 'center' }}>
              <Icon name="qr" size={22} color={colors.accent} />
            </View>
            <AppText weight="600" style={{ color: colors.ink, fontSize: 15.5 }}>
              {t('scanLabel')}
            </AppText>
          </View>
        </Tap>
      </FadeUp>
    </Screen>
  );
}

function Metric({ icon, val, label }: { icon: IconName; val: string; label: string }) {
  return (
    <View style={{ flex: 1, alignItems: 'center', gap: 4 }}>
      <Icon name={icon} size={18} color="rgba(255,255,255,0.8)" />
      <AppText weight="700" style={{ color: '#fff', fontSize: 13.5 }}>
        {val}
      </AppText>
      <AppText weight="600" style={{ color: 'rgba(255,255,255,0.6)', fontSize: 10, letterSpacing: 0.4 }}>
        {label.toUpperCase()}
      </AppText>
    </View>
  );
}

function WeatherCard({ t }: { t: T }) {
  const es = t.locale === 'es';
  const { weather } = useWeather(t('wNow'));
  const SAMPLE_HOURS = [
    { label: t('wNow'), temp: 29, code: 2 },
    { label: '14:00', temp: 30, code: 0 },
    { label: '15:00', temp: 31, code: 0 },
    { label: '16:00', temp: 30, code: 2 },
    { label: '17:00', temp: 28, code: 3 },
    { label: '18:00', temp: 27, code: 3 },
  ];
  const w = weather ?? { tempC: 29, feels: 32, humidity: 68, windKmh: 14, uv: 8, code: 2, city: 'Miami', hours: SAMPLE_HOURS };
  const hours = w.hours.length ? w.hours : SAMPLE_HOURS;
  const cond = weatherCondition(w.code, es);
  const icon = weatherIcon(w.code);
  const uvLevel = w.uv >= 8 ? (es ? 'Alto' : 'High') : w.uv >= 6 ? (es ? 'Mod' : 'Mod') : es ? 'Bajo' : 'Low';
  return (
    <FadeUp delay={40} style={{ paddingHorizontal: 16, paddingTop: 14 }}>
      <View style={{ borderRadius: radius.xl, overflow: 'hidden', ...shadows.card }}>
        <LinearGradient colors={gradients.navyDeep} start={{ x: 0.1, y: 0 }} end={{ x: 0.9, y: 1 }} style={{ padding: 15 }}>
          <View style={{ position: 'absolute', width: 220, height: 220, borderRadius: 999, top: -120, right: -80, backgroundColor: alpha(colors.accent, 0.2) }} />
          <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' }}>
            <View>
              <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
                <AppText serif weight="600" style={{ fontSize: 46, color: '#fff', lineHeight: 44 }}>
                  {w.tempC}
                </AppText>
                <AppText weight="500" style={{ color: '#fff', fontSize: 20, marginTop: 3 }}>
                  °C
                </AppText>
              </View>
              <AppText weight="600" style={{ color: '#fff', fontSize: 14, marginTop: 6 }}>
                {cond}
              </AppText>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 2 }}>
                <Icon name="map" size={12} color="rgba(255,255,255,0.7)" />
                <AppText style={{ color: 'rgba(255,255,255,0.7)', fontSize: 12 }}>
                  {w.city ? `${w.city} · ` : ''}{t('feelsLike')} {w.feels}°
                </AppText>
              </View>
            </View>
            <Floating>
              <Icon name={icon} size={58} color="#fff" />
            </Floating>
          </View>

          <View style={{ flexDirection: 'row', gap: 8, marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.16)' }}>
            <Metric icon="wind" val={`${w.windKmh} km/h`} label={t('wind')} />
            <View style={{ width: 1, backgroundColor: 'rgba(255,255,255,0.14)' }} />
            <Metric icon="droplet" val={`${w.humidity}%`} label={t('humidity')} />
            <View style={{ width: 1, backgroundColor: 'rgba(255,255,255,0.14)' }} />
            <Metric icon="uv" val={`${w.uv} · ${uvLevel}`} label={t('uvIndex')} />
          </View>

          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 12 }} contentContainerStyle={{ gap: 8 }}>
            {hours.map((h, i) => (
              <View
                key={i}
                style={{
                  width: 54,
                  alignItems: 'center',
                  gap: 5,
                  backgroundColor: i === 0 ? 'rgba(255,255,255,0.18)' : 'rgba(255,255,255,0.07)',
                  borderRadius: 13,
                  paddingVertical: 7,
                }}
              >
                <AppText weight="600" style={{ color: 'rgba(255,255,255,0.75)', fontSize: 10.5 }}>
                  {h.label}
                </AppText>
                <Icon name={weatherIcon(h.code)} size={20} color="#fff" />
                <AppText weight="700" style={{ color: '#fff', fontSize: 13 }}>
                  {h.temp}°
                </AppText>
              </View>
            ))}
          </ScrollView>
        </LinearGradient>
      </View>
    </FadeUp>
  );
}
