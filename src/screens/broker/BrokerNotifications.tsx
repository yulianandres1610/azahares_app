// Notificaciones del broker — usa las notificaciones REALES del backend
// expuestas por AppContext (GET /notifications).
import React from 'react';
import { Animated, ScrollView, View } from 'react-native';
import { alpha, colors, radius, shadows } from '../../theme/tokens';
import { Icon } from '../../components/Icon';
import { AppText, IconButton, Screen, Tap, haptic } from '../../components/ui';
import { useApp } from '../../store/AppContext';
import { FadeUp, Hero, useHeaderFill } from './ui';

const NK: Record<string, { icon: string; color: string }> = {
  available: { icon: 'checkCircle', color: colors.success },
  refuel: { icon: 'receipt', color: colors.amber },
  coa: { icon: 'seal', color: '#0ea5a0' },
  delivery: { icon: 'wallet', color: colors.navy500 },
  inspection: { icon: 'inspect', color: colors.accent },
  alert: { icon: 'alert', color: colors.error },
  system: { icon: 'sparkle', color: '#8b6fe0' },
};

export function BrokerNotifications({ onClose }: { onClose: () => void }) {
  const { notifications, markNotifRead, markAllNotifsRead, clearNotifs } = useApp();
  const unread = notifications.filter((n) => !n.read).length;
  const hf = useHeaderFill();

  return (
    <Screen scroll={false} padTop={false}>
      <Animated.ScrollView {...hf.scrollProps} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
        <View {...hf.heroLayout}>
        <Hero padBottom={20}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <IconButton name="chevL" variant="glassDark" onPress={onClose} />
            {unread > 0 && (
              <Tap onPress={() => { haptic('success'); markAllNotifsRead(); }} style={{ flexDirection: 'row', alignItems: 'center', gap: 6, height: 36, paddingHorizontal: 13, borderRadius: 999, backgroundColor: 'rgba(255,255,255,0.14)' }}>
                <Icon name="checkDouble" size={17} color="#fff" />
                <AppText weight="600" style={{ color: '#fff', fontSize: 13 }}>Marcar leídas</AppText>
              </Tap>
            )}
          </View>
          <AppText serif weight="600" style={{ fontSize: 27, color: '#fff', marginTop: 14, marginBottom: 2 }}>Notificaciones</AppText>
          <AppText style={{ color: 'rgba(255,255,255,0.62)', fontSize: 13.5 }}>{unread > 0 ? `${unread} sin leer` : 'Estás al día'}</AppText>
        </Hero>
        </View>

        {notifications.length === 0 ? (
          <View style={{ alignItems: 'center', paddingVertical: 70, paddingHorizontal: 30 }}>
            <Icon name="checkCircle" size={42} color={colors.ink40} />
            <AppText serif weight="600" style={{ fontSize: 20, color: colors.ink, marginTop: 14 }}>Estás al día</AppText>
          </View>
        ) : (
          <View style={{ paddingHorizontal: 16, paddingTop: 16, gap: 10 }}>
            {notifications.map((n, i) => {
              const meta = NK[n.kind] || NK.system;
              return (
                <FadeUp key={n.id} delay={i * 50}>
                  <Tap onPress={() => { haptic('light'); markNotifRead(n.id); }}
                    style={{ flexDirection: 'row', gap: 13, padding: 14, borderRadius: radius.lg, backgroundColor: n.read ? colors.surface : alpha(colors.accent, 0.06), borderLeftWidth: 3, borderLeftColor: n.read ? 'transparent' : colors.accent, ...shadows.sm }}>
                    <View style={{ width: 44, height: 44, borderRadius: 13, alignItems: 'center', justifyContent: 'center', backgroundColor: alpha(meta.color, 0.14) }}>
                      <Icon name={meta.icon as any} size={22} color={meta.color} />
                    </View>
                    <View style={{ flex: 1, minWidth: 0 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                        <AppText weight="700" style={{ flex: 1, fontSize: 14.5, color: colors.ink }}>{n.title}</AppText>
                        {!n.read && <View style={{ width: 8, height: 8, borderRadius: 999, backgroundColor: colors.accent }} />}
                      </View>
                      {!!n.body && <AppText style={{ fontSize: 13, color: colors.ink60, marginTop: 3, lineHeight: 19 }}>{n.body}</AppText>}
                      <AppText weight="600" style={{ fontSize: 11.5, color: colors.ink40, marginTop: 7 }}>{n.time}</AppText>
                    </View>
                  </Tap>
                </FadeUp>
              );
            })}
            <Tap onPress={() => { haptic('warn'); clearNotifs(); }} style={{ marginTop: 8, height: 48, borderRadius: radius.md, backgroundColor: alpha(colors.error, 0.09), flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
              <Icon name="trash" size={18} color={colors.error} />
              <AppText weight="600" style={{ fontSize: 14.5, color: colors.error }}>Borrar todo</AppText>
            </Tap>
          </View>
        )}
      </Animated.ScrollView>
      {hf.fill}
    </Screen>
  );
}
