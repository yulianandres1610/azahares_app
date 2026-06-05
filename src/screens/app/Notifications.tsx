// Centro de notificaciones — fiel a screens-notifications.jsx.
import React, { useRef } from 'react';
import { Animated, Easing, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Swipeable from 'react-native-gesture-handler/Swipeable';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { alpha, colors, gradients, radius, shadows } from '../../theme/tokens';
import { Icon, IconName } from '../../components/Icon';
import { AppText, IconButton, Screen, Tap, haptic } from '../../components/ui';
import { useApp, AppNotification, NotifKind } from '../../store/AppContext';
import { useNav } from '../../store/ShellNav';
import type { T } from '../../i18n';

// Flotación infinita (azFloat) para el ícono del estado vacío.
function FloatBox({ children }: { children: React.ReactNode }) {
  const y = useRef(new Animated.Value(0)).current;
  React.useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(y, { toValue: 1, duration: 2000, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(y, { toValue: 0, duration: 2000, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [y]);
  return <Animated.View style={{ transform: [{ translateY: y.interpolate({ inputRange: [0, 1], outputRange: [0, -7] }) }] }}>{children}</Animated.View>;
}

const KIND: Record<NotifKind, { icon: IconName; color: string }> = {
  refuel: { icon: 'fuel', color: colors.amber },
  available: { icon: 'checkCircle', color: colors.success },
  inspection: { icon: 'camera', color: colors.accent },
  delivery: { icon: 'truck', color: colors.navy500 },
  coa: { icon: 'inspect', color: '#0ea5a0' },
  alert: { icon: 'alert', color: colors.error },
  system: { icon: 'sparkle', color: '#8b6fe0' },
};

export function Notifications({ onClose }: { onClose: () => void }) {
  const { t, notifications, markNotifRead, markAllNotifsRead, removeNotif, clearNotifs, containers } = useApp();
  const nav = useNav();
  const insets = useSafeAreaInsets();
  const unread = notifications.filter((n) => !n.read).length;
  const today = notifications.filter((n) => Date.now() - n.ts < 24 * 36e5);
  const earlier = notifications.filter((n) => Date.now() - n.ts >= 24 * 36e5);

  const open = (n: AppNotification) => {
    markNotifRead(n.id);
    if (n.containerId && containers.some((c) => c.id === n.containerId)) {
      haptic('light');
      onClose();
      nav.openOverlay({ type: 'detail', id: n.containerId });
    }
  };

  return (
    <Screen padTop={false} padBottom={28} bg={colors.bg}>
      {/* hero */}
      <View style={{ borderBottomLeftRadius: 26, borderBottomRightRadius: 26, overflow: 'hidden' }}>
        <LinearGradient colors={gradients.navyDeep} start={{ x: 0.1, y: 0 }} end={{ x: 0.9, y: 1 }} style={{ paddingTop: insets.top + 8, paddingHorizontal: 16, paddingBottom: 20 }}>
          <View style={{ position: 'absolute', width: 240, height: 240, borderRadius: 999, top: -130, right: -70, backgroundColor: alpha(colors.accent, 0.22) }} />
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <IconButton name="chevL" variant="glassDark" color="#fff" onPress={onClose} />
            {notifications.length > 0 && unread > 0 && (
              <Tap onPress={() => { haptic('success'); markAllNotifsRead(); }} style={{ flexDirection: 'row', alignItems: 'center', gap: 6, height: 36, paddingHorizontal: 13, borderRadius: 999, backgroundColor: 'rgba(255,255,255,0.14)' }}>
                <Icon name="checkDouble" size={17} color="#fff" />
                <AppText weight="600" style={{ color: '#fff', fontSize: 13 }}>
                  {t('markAllRead')}
                </AppText>
              </Tap>
            )}
          </View>
          <View style={{ marginTop: 16, flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between' }}>
            <View>
              <AppText serif weight="600" style={{ fontSize: 28, color: '#fff', letterSpacing: -0.2 }}>
                {t('notifications')}
              </AppText>
              <AppText style={{ color: 'rgba(255,255,255,0.62)', fontSize: 13.5, marginTop: 4 }}>
                {unread > 0 ? `${unread} ${t('unreadCount')}` : t('noNotifs')}
              </AppText>
            </View>
            {unread > 0 && (
              <View style={{ minWidth: 40, height: 40, paddingHorizontal: 11, borderRadius: 999, backgroundColor: colors.accent, alignItems: 'center', justifyContent: 'center' }}>
                <AppText weight="800" style={{ color: '#fff', fontSize: 17 }}>
                  {unread}
                </AppText>
              </View>
            )}
          </View>
        </LinearGradient>
      </View>

      {/* empty */}
      {notifications.length === 0 && (
        <View style={{ alignItems: 'center', justifyContent: 'center', paddingVertical: 70, paddingHorizontal: 30 }}>
          <FloatBox>
            <View style={{ width: 88, height: 88, borderRadius: 28, backgroundColor: alpha(colors.success, 0.12), alignItems: 'center', justifyContent: 'center' }}>
              <Icon name="checkCircle" size={42} color={colors.success} />
            </View>
          </FloatBox>
          <AppText serif weight="600" style={{ fontSize: 21, color: colors.ink, marginTop: 22 }}>
            {t('noNotifs')}
          </AppText>
          <AppText style={{ fontSize: 14, color: colors.ink50, marginTop: 8, textAlign: 'center', lineHeight: 21, maxWidth: 260 }}>
            {t('noNotifsSub')}
          </AppText>
        </View>
      )}

      {today.length > 0 && <Group label={t('todayLabel')} items={today} t={t} onOpen={open} onRemove={removeNotif} />}
      {earlier.length > 0 && <Group label={t('earlier')} items={earlier} t={t} onOpen={open} onRemove={removeNotif} />}

      {notifications.length > 0 && (
        <View style={{ paddingHorizontal: 16, paddingTop: 18 }}>
          <Tap onPress={() => { haptic('warn'); clearNotifs(); }} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, height: 48, borderRadius: radius.md, backgroundColor: alpha(colors.error, 0.09) }}>
            <Icon name="trash" size={18} color={colors.error} />
            <AppText weight="600" style={{ color: colors.error, fontSize: 14.5 }}>
              {t('clearAll')}
            </AppText>
          </Tap>
        </View>
      )}
    </Screen>
  );
}

function Group({ label, items, t, onOpen, onRemove }: { label: string; items: AppNotification[]; t: T; onOpen: (n: AppNotification) => void; onRemove: (id: string) => void }) {
  return (
    <View style={{ paddingHorizontal: 16, paddingTop: 20 }}>
      <AppText weight="700" style={{ fontSize: 12, color: colors.ink40, letterSpacing: 0.6, marginHorizontal: 6, marginBottom: 10 }}>
        {label.toUpperCase()}
      </AppText>
      <View style={{ gap: 10 }}>
        {items.map((n, i) => (
          <NotifCard key={n.id} n={n} i={i} t={t} onOpen={onOpen} onRemove={onRemove} />
        ))}
      </View>
    </View>
  );
}

function NotifCard({ n, i, t, onOpen, onRemove }: { n: AppNotification; i: number; t: T; onOpen: (n: AppNotification) => void; onRemove: (id: string) => void }) {
  const meta = KIND[n.kind] || KIND.system;
  const a = useRef(new Animated.Value(0)).current;
  React.useEffect(() => {
    Animated.timing(a, { toValue: 1, duration: 400, delay: i * 50, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();
  }, [a, i]);

  const rightAction = () => (
    <View style={{ backgroundColor: colors.error, justifyContent: 'center', alignItems: 'flex-end', paddingRight: 24, flex: 1, borderRadius: radius.lg, marginLeft: -20 }}>
      <Icon name="trash" size={22} color="#fff" />
    </View>
  );

  return (
    <Animated.View style={{ opacity: a, transform: [{ translateY: a.interpolate({ inputRange: [0, 1], outputRange: [14, 0] }) }] }}>
      <Swipeable
        renderRightActions={rightAction}
        onSwipeableOpen={() => {
          haptic('warn');
          onRemove(n.id);
        }}
        overshootRight={false}
      >
        <Tap
          onPress={() => onOpen(n)}
          hapticKind={null}
          style={{
            flexDirection: 'row',
            gap: 13,
            padding: 14,
            borderRadius: radius.lg,
            backgroundColor: n.read ? colors.surface : '#f1f5fd',
            borderLeftWidth: 3,
            borderLeftColor: n.read ? 'transparent' : colors.accent,
            ...shadows.sm,
          }}
        >
          <View style={{ width: 44, height: 44, borderRadius: 13, alignItems: 'center', justifyContent: 'center', backgroundColor: alpha(meta.color, 0.14) }}>
            <Icon name={meta.icon} size={22} color={meta.color} />
          </View>
          <View style={{ flex: 1, minWidth: 0 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <AppText weight="700" style={{ flex: 1, fontSize: 14.5, color: colors.ink, letterSpacing: -0.2 }}>
                {n.title}
              </AppText>
              {!n.read && <View style={{ width: 8, height: 8, borderRadius: 999, backgroundColor: colors.accent }} />}
            </View>
            <AppText style={{ fontSize: 13, color: colors.ink60, marginTop: 3, lineHeight: 19 }}>
              {n.body}
            </AppText>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 8 }}>
              <AppText weight="600" style={{ fontSize: 11.5, color: colors.ink40 }}>
                {n.time}
              </AppText>
              {n.containerId && (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
                  <AppText weight="600" style={{ fontSize: 11.5, color: meta.color }}>
                    {t('viewContainer')}
                  </AppText>
                  <Icon name="chevR" size={13} color={meta.color} />
                </View>
              )}
            </View>
          </View>
        </Tap>
      </Swipeable>
    </Animated.View>
  );
}
