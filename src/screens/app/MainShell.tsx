// Shell autenticado: tab bar con FAB central + host de overlays.
import React, { useEffect, useRef, useState } from 'react';
import { Animated, Dimensions, View } from 'react-native';
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

const { width: SCREEN_W } = Dimensions.get('window');

export function MainShell() {
  const { t } = useApp();
  const [tab, setTab] = useState<TabId>('home');
  const [overlay, setOverlay] = useState<Overlay>(null);
  const [filter, setFilter] = useState('all');

  const openOverlay = (o: NonNullable<Overlay>) => {
    haptic('medium');
    setOverlay(o);
  };
  const closeOverlay = () => setOverlay(null);

  return (
    <ShellNavProvider value={{ tab, setTab, overlay, openOverlay, closeOverlay, filter, setFilter }}>
      <View style={{ flex: 1, backgroundColor: colors.bg }}>
        <View style={{ flex: 1 }}>
          {tab === 'home' && <Home />}
          {tab === 'containers' && <Containers />}
          {tab === 'inspections' && <Inspections />}
          {tab === 'profile' && <Profile />}
        </View>
        <TabBar tab={tab} setTab={setTab} onScan={() => openOverlay({ type: 'scan' })} t={t} />
        <OverlayHost overlay={overlay} onClose={closeOverlay} />
      </View>
    </ShellNavProvider>
  );
}

function TabBar({ tab, setTab, onScan, t }: { tab: TabId; setTab: (t: TabId) => void; onScan: () => void; t: ReturnType<typeof useApp>['t'] }) {
  const insets = useSafeAreaInsets();
  const go = (id: TabId) => {
    haptic('select');
    setTab(id);
  };
  return (
    <View style={{ position: 'absolute', left: 0, right: 0, bottom: 0, paddingBottom: insets.bottom || 0 }}>
      <View style={{ marginHorizontal: 12, marginBottom: 8, borderRadius: 26, height: 64, overflow: 'visible', ...shadows.card }}>
        <BlurView intensity={40} tint="light" style={{ flex: 1, borderRadius: 26, overflow: 'hidden', backgroundColor: 'rgba(255,255,255,0.72)' }}>
          <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center' }}>
            <View style={{ flex: 1, flexDirection: 'row' }}>
              <Tab id="home" icon="home" label={t('home')} active={tab === 'home'} onPress={() => go('home')} />
              <Tab id="containers" icon="layers" label={t('containers')} active={tab === 'containers'} onPress={() => go('containers')} />
            </View>
            <View style={{ width: 76 }} />
            <View style={{ flex: 1, flexDirection: 'row' }}>
              <Tab id="inspections" icon="inspect" label={t('inspections')} active={tab === 'inspections'} onPress={() => go('inspections')} />
              <Tab id="profile" icon="user" label={t('profile')} active={tab === 'profile'} onPress={() => go('profile')} />
            </View>
          </View>
        </BlurView>

        {/* FAB central */}
        <View style={{ position: 'absolute', left: '50%', top: -26, marginLeft: -29, alignItems: 'center' }}>
          <Tap onPress={onScan} hapticKind="medium" scaleTo={0.9}>
            <View style={{ width: 58, height: 58, borderRadius: 20, borderWidth: 4, borderColor: colors.bg, overflow: 'hidden', ...shadows.card }}>
              <LinearGradient colors={gradients.navy} style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
                <Icon name="qr" size={26} color="#fff" />
              </LinearGradient>
            </View>
          </Tap>
          <AppText weight="700" style={{ color: colors.navy700, fontSize: 10.5, marginTop: 3 }}>
            {t('scan')}
          </AppText>
        </View>
      </View>
    </View>
  );
}

function Tab({ icon, label, active, onPress }: { id: TabId; icon: IconName; label: string; active: boolean; onPress: () => void }) {
  return (
    <Tap onPress={onPress} hapticKind={null} style={{ flex: 1, alignItems: 'center', gap: 4, paddingVertical: 7 }}>
      <View style={{ alignItems: 'center' }}>
        <Icon name={icon} size={27} color={active ? colors.navy700 : colors.ink40} strokeWidth={active ? 2.3 : 1.85} />
        {active && <View style={{ position: 'absolute', bottom: -6, width: 5, height: 5, borderRadius: 999, backgroundColor: colors.accent }} />}
      </View>
      <AppText weight={active ? '700' : '500'} style={{ fontSize: 10.5, color: active ? colors.navy700 : colors.ink40 }}>
        {label}
      </AppText>
    </Tap>
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
    </Animated.View>
  );
}
