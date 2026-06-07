// Catálogo del día: póster con marca, lista de productos y descarga PDF/PNG/compartir.
// Portado de app/broker-catalog.jsx.
import React, { useState } from 'react';
import { ActivityIndicator, Image, ScrollView, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Circle, Defs, RadialGradient as SvgRadial, Stop } from 'react-native-svg';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { alpha, colors, gradients, radius, shadows } from '../../theme/tokens';
import { Icon } from '../../components/Icon';
import { AppText, IconButton, Screen, Tap, haptic } from '../../components/ui';
import { useApp } from '../../store/AppContext';
import { useBroker } from '../../store/BrokerStore';
import { Hero } from './ui';

const GLOBE = require('../../../assets/logo/logo-globe.png');

export function BrokerCatalog({ onClose }: { onClose: () => void }) {
  const [s] = useBroker();
  const { showToast } = useApp();
  const insets = useSafeAreaInsets();
  const cat = s.catalog;
  const [busy, setBusy] = useState<string | null>(null);
  const today = '7 de junio, 2026';

  const download = (kind: 'pdf' | 'png' | 'share') => {
    if (busy) return;
    setBusy(kind); haptic('medium');
    const labels = { pdf: 'Catálogo-Azahares.pdf', png: 'Catálogo-Azahares.png', share: 'Catálogo' };
    setTimeout(() => {
      setBusy(null); haptic('success');
      showToast(kind === 'share' ? 'Listo para compartir' : `Descargando ${labels[kind]}`, 'success');
    }, 1200);
  };

  return (
    <Screen scroll={false} padTop={false}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 110 }}>
        <Hero padBottom={18}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <IconButton name="chevL" variant="glassDark" onPress={onClose} />
            <IconButton name="share" variant="glassDark" onPress={() => download('share')} />
          </View>
          <AppText serif weight="600" style={{ fontSize: 26, color: '#fff', marginTop: 12 }}>Catálogo</AppText>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 }}>
            <View style={{ width: 7, height: 7, borderRadius: 999, backgroundColor: colors.success }} />
            <AppText style={{ color: 'rgba(255,255,255,0.62)', fontSize: 13 }}>Precios base Azahares · {cat.updated}</AppText>
          </View>
        </Hero>

        {/* póster publicable */}
        <View style={{ padding: 16 }}>
          <View style={{ borderRadius: radius.xl, overflow: 'hidden', backgroundColor: colors.surface, ...shadows.card }}>
            <View style={{ overflow: 'hidden' }}>
              <LinearGradient colors={gradients.navyDeep} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ padding: 20 }}>
                <Svg width={200} height={200} style={{ position: 'absolute', top: -90, right: -50 }}>
                  <Defs><SvgRadial id="catGlow" cx="50%" cy="50%" r="50%"><Stop offset="0" stopColor={colors.accent} stopOpacity={0.45} /><Stop offset="0.7" stopColor={colors.accent} stopOpacity={0} /></SvgRadial></Defs>
                  <Circle cx={100} cy={100} r={100} fill="url(#catGlow)" />
                </Svg>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                  <Image source={GLOBE} style={{ height: 30, width: 30, tintColor: '#fff' }} resizeMode="contain" />
                  <View>
                    <AppText serif weight="600" style={{ fontSize: 18, color: '#fff' }}>Azahares</AppText>
                    <AppText weight="700" style={{ fontSize: 9.5, letterSpacing: 1.4, color: 'rgba(255,255,255,0.6)' }}>IMPORT & EXPORT</AppText>
                  </View>
                </View>
                <View style={{ marginTop: 16 }}>
                  <AppText serif weight="600" style={{ fontSize: 22, color: '#fff' }}>Catálogo de precios</AppText>
                  <AppText style={{ color: 'rgba(255,255,255,0.6)', fontSize: 12.5, marginTop: 2 }}>{today} · Precios FOB en USD</AppText>
                </View>
              </LinearGradient>
            </View>

            <View>
              {cat.items.map((p, i) => {
                const best = Math.min(...p.tiers.map((t) => t.price));
                return (
                  <View key={p.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 13, paddingVertical: 15, paddingHorizontal: 18, borderBottomWidth: i < cat.items.length - 1 ? 1 : 0, borderBottomColor: colors.line }}>
                    <View style={{ width: 42, height: 42, borderRadius: 12, backgroundColor: alpha(colors.navy500, 0.11), alignItems: 'center', justifyContent: 'center' }}>
                      <Icon name={p.icon as any} size={21} color={colors.navy700} />
                    </View>
                    <View style={{ flex: 1, minWidth: 0 }}>
                      <AppText weight="700" style={{ fontSize: 15, color: colors.ink }}>{p.name}</AppText>
                      <AppText weight="600" style={{ fontSize: 11.5, color: colors.ink40, marginTop: 1 }}>{p.code} · por volumen desde ${best.toFixed(2)}</AppText>
                    </View>
                    <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 2 }}>
                      <AppText serif weight="700" style={{ fontSize: 22, color: colors.ink }}>${p.price.toFixed(2)}</AppText>
                      <AppText style={{ fontSize: 11, color: colors.ink50 }}>/{p.unit}</AppText>
                    </View>
                  </View>
                );
              })}
            </View>

            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 14, paddingHorizontal: 18, backgroundColor: alpha(colors.navy500, 0.06) }}>
              <AppText weight="600" style={{ fontSize: 11.5, color: colors.ink50 }}>azaharesfuel.com</AppText>
              <AppText style={{ fontSize: 10.5, color: colors.ink40 }}>Sujeto a disponibilidad</AppText>
            </View>
          </View>

          <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 9, marginTop: 14, marginHorizontal: 4 }}>
            <Icon name="info" size={16} color={colors.accent} />
            <AppText style={{ flex: 1, fontSize: 12.5, lineHeight: 19, color: colors.ink50 }}>Descargá el catálogo del día para enviar a clientes o publicar en redes. Documento generado por Azahares.</AppText>
          </View>
        </View>
      </ScrollView>

      <View style={{ position: 'absolute', left: 0, right: 0, bottom: 0, flexDirection: 'row', gap: 10, paddingHorizontal: 16, paddingTop: 14, paddingBottom: (insets.bottom || 0) + 14, backgroundColor: colors.bg }}>
        <DownloadBtn icon="fileText" label="PDF" busy={busy === 'pdf'} onPress={() => download('pdf')} primary />
        <DownloadBtn icon="image" label="PNG" busy={busy === 'png'} onPress={() => download('png')} primary />
        <DownloadBtn icon="share" label="Compartir" busy={busy === 'share'} onPress={() => download('share')} />
      </View>
    </Screen>
  );
}

function DownloadBtn({ icon, label, onPress, busy, primary }: { icon: string; label: string; onPress: () => void; busy: boolean; primary?: boolean }) {
  const content = (
    <View style={{ height: 52, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
      {busy ? <ActivityIndicator color={primary ? '#fff' : colors.ink} />
        : <>
            <Icon name={icon as any} size={18} color={primary ? '#fff' : colors.ink} />
            <AppText weight="700" style={{ fontSize: 14.5, color: primary ? '#fff' : colors.ink }}>{label}</AppText>
          </>}
    </View>
  );
  return (
    <Tap onPress={onPress} hapticKind="medium" style={{ flex: 1, borderRadius: radius.md, overflow: 'hidden', ...(primary ? shadows.sm : {}) }}>
      {primary
        ? <LinearGradient colors={gradients.navy} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>{content}</LinearGradient>
        : <View style={{ backgroundColor: colors.surface, borderWidth: 1.5, borderColor: colors.line, borderRadius: radius.md, ...shadows.sm }}>{content}</View>}
    </Tap>
  );
}
