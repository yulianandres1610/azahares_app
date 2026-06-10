// Shell autenticado: tab bar con FAB central + host de overlays.
import React, { useEffect, useRef, useState } from 'react';
import { Animated, Dimensions, Pressable, View } from 'react-native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, gradients, shadows } from '../../theme/tokens';
import { Icon, IconName } from '../../components/Icon';
import { AppText, Tap, haptic } from '../../components/ui';
import { useApp } from '../../store/AppContext';
import { Overlay, ShellNavProvider, TabId } from '../../store/ShellNav';
import { Home } from './Home';
import { Containers } from './Containers';
import { Inspections } from './Inspections';
import { Profile } from './Profile';
import { NewContainer } from './NewContainer';
import { Detail } from './Detail';
import { Scan } from './Scan';
import { Notifications } from './Notifications';
import { IbcInventory } from './IbcInventory';

const { width: SCREEN_W } = Dimensions.get('window');

export function MainShell() {
  const { t } = useApp();
  const [tab, setTab] = useState<TabId>('home');
  const [overlay, setOverlay] = useState<Overlay>(null);
  const [filter, setFilter] = useState('all');

  // fade del contenido al cambiar de tab (azFade del diseño)
  const fade = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    fade.setValue(0);
    Animated.timing(fade, { toValue: 1, duration: 260, useNativeDriver: true }).start();
  }, [tab, fade]);

  const openOverlay = (o: NonNullable<Overlay>) => {
    haptic('medium');
    setOverlay(o);
  };
  const closeOverlay = () => setOverlay(null);

  return (
    <ShellNavProvider value={{ tab, setTab, overlay, openOverlay, closeOverlay, filter, setFilter }}>
      <View style={{ flex: 1, backgroundColor: colors.bg }}>
        <Animated.View style={{ flex: 1, opacity: fade }}>
          {tab === 'home' && <Home />}
          {tab === 'containers' && <Containers />}
          {tab === 'inspections' && <Inspections />}
          {tab === 'profile' && <Profile />}
        </Animated.View>
        <TabBar tab={tab} setTab={setTab} onScan={() => openOverlay({ type: 'scan' })} t={t} />
        <OverlayHost overlay={overlay} onClose={closeOverlay} />
      </View>
    </ShellNavProvider>
  );
}

function TabBar({ tab, setTab, onScan, t }: { tab: TabId; setTab: (t: TabId) => void; onScan: () => void; t: ReturnType<typeof useApp>['t'] }) {
  const insets = useSafeAreaInsets();
  const pulse = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 1300, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0, duration: 1300, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [pulse]);
  const go = (id: TabId) => {
    haptic('select');
    setTab(id);
  };
  return (
    <View style={{ position: 'absolute', left: 0, right: 0, bottom: 0, paddingBottom: insets.bottom || 0 }}>
      <View style={{ marginHorizontal: 12, marginBottom: 8, borderRadius: 26, height: 64, overflow: 'visible', ...shadows.card }}>
        <BlurView intensity={40} tint="light" style={{ flex: 1, borderRadius: 26, overflow: 'hidden', backgroundColor: 'rgba(255,255,255,0.72)' }}>
          <View style={{ flex: 1, flexDirection: 'row', alignItems: 'stretch' }}>
            <View style={{ flex: 1, flexDirection: 'row' }}>
              <Tab icon="home" label={t('home')} active={tab === 'home'} onPress={() => go('home')} />
              <Tab icon="layers" label={t('containers')} active={tab === 'containers'} onPress={() => go('containers')} />
            </View>
            <View style={{ width: 76 }} />
            <View style={{ flex: 1, flexDirection: 'row' }}>
              <Tab icon="inspect" label={t('inspections')} active={tab === 'inspections'} onPress={() => go('inspections')} />
              <Tab icon="user" label={t('profile')} active={tab === 'profile'} onPress={() => go('profile')} />
            </View>
          </View>
        </BlurView>

        {/* FAB central elevado con anillo pulsante */}
        <View style={{ position: 'absolute', left: '50%', marginLeft: -29, top: -26, width: 58, height: 58 }}>
          <Animated.View
            pointerEvents="none"
            style={{
              position: 'absolute',
              top: -4,
              left: -4,
              right: -4,
              bottom: -4,
              borderRadius: 24,
              borderWidth: 2,
              borderColor: colors.accent,
              opacity: pulse.interpolate({ inputRange: [0, 1], outputRange: [0.5, 0] }),
              transform: [{ scale: pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.18] }) }],
            }}
          />
          <Tap onPress={onScan} hapticKind="medium" scaleTo={0.9}>
            <View style={{ width: 58, height: 58, borderRadius: 20, borderWidth: 4, borderColor: colors.bg, overflow: 'hidden', ...shadows.card }}>
              <LinearGradient colors={gradients.navy} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
                <Icon name="qr" size={26} color="#fff" />
              </LinearGradient>
            </View>
          </Tap>
        </View>
        {/* etiqueta Scan alineada al fondo del bar con las demás */}
        <View style={{ position: 'absolute', left: 0, right: 0, bottom: 9, alignItems: 'center' }} pointerEvents="none">
          <AppText weight="700" style={{ color: colors.navy700, fontSize: 10.5 }}>
            {t('scan')}
          </AppText>
        </View>
      </View>
    </View>
  );
}

function Tab({ icon, label, active, onPress }: { icon: IconName; label: string; active: boolean; onPress: () => void }) {
  const scale = useRef(new Animated.Value(1)).current;
  const dot = useRef(new Animated.Value(active ? 1 : 0)).current;
  const first = useRef(true);

  useEffect(() => {
    if (active) {
      // pop del ícono (azTabPop: 0.7 -> 1.22 -> 1) — solo al activarse, no en el montaje inicial
      if (!first.current) {
        scale.setValue(0.7);
        Animated.sequence([
          Animated.timing(scale, { toValue: 1.22, duration: 140, useNativeDriver: true }),
          Animated.spring(scale, { toValue: 1, useNativeDriver: true, friction: 5, tension: 140 }),
        ]).start();
      }
      Animated.spring(dot, { toValue: 1, useNativeDriver: true, friction: 5, tension: 160 }).start();
    } else {
      Animated.timing(scale, { toValue: 1, duration: 120, useNativeDriver: true }).start();
      Animated.timing(dot, { toValue: 0, duration: 120, useNativeDriver: true }).start();
    }
    first.current = false;
  }, [active, scale, dot]);

  return (
    <Pressable
      onPress={() => {
        haptic('select');
        onPress();
      }}
      style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 4 }}
    >
      <Animated.View style={{ transform: [{ translateY: active ? -1 : 0 }, { scale }] }}>
        <Icon name={icon} size={25} color={active ? colors.navy700 : colors.ink40} strokeWidth={active ? 2.3 : 1.85} />
      </Animated.View>
      <View style={{ height: 6, justifyContent: 'center', marginVertical: 1 }}>
        <Animated.View style={{ width: 5, height: 5, borderRadius: 999, backgroundColor: colors.accent, opacity: dot, transform: [{ scale: dot }] }} />
      </View>
      <AppText weight={active ? '700' : '500'} style={{ fontSize: 10.5, lineHeight: 13, color: active ? colors.navy700 : colors.ink40 }}>
        {label}
      </AppText>
    </Pressable>
  );
}

function OverlayHost({ overlay, onClose }: { overlay: Overlay; onClose: () => void }) {
  const [shown, setShown] = useState<Overlay>(overlay);
  const slide = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (overlay) {
      setShown(overlay);
      slide.setValue(overlay.type === 'scan' ? 0 : 1);
      Animated.timing(slide, { toValue: 0, duration: 280, useNativeDriver: true }).start();
    } else if (shown) {
      Animated.timing(slide, { toValue: 1, duration: 280, useNativeDriver: true }).start(() => setShown(null));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [overlay]);

  if (!shown) return null;
  const translateX = slide.interpolate({ inputRange: [0, 1], outputRange: [0, SCREEN_W] });

  return (
    <Animated.View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, transform: [{ translateX }] }}>
      {shown.type === 'new' && <NewContainer onClose={onClose} />}
      {shown.type === 'detail' && <Detail id={shown.id} onClose={onClose} />}
      {shown.type === 'scan' && <Scan onClose={onClose} />}
      {shown.type === 'notifications' && <Notifications onClose={onClose} />}
      {shown.type === 'ibcs' && <IbcInventory onClose={onClose} />}
    </Animated.View>
  );
}
