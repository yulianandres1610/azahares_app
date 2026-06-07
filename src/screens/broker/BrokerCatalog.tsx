// Catálogo del día — datos REALES (/products/sales-catalog vía store) y
// descargas funcionales: PDF (expo-print) + imprimir + compartir.
import React, { useState } from 'react';
import { ActivityIndicator, Image, ScrollView, Share, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import Svg, { Circle, Defs, RadialGradient as SvgRadial, Stop } from 'react-native-svg';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { alpha, colors, gradients, radius, shadows } from '../../theme/tokens';
import { Icon } from '../../components/Icon';
import { AppText, IconButton, Screen, Tap, haptic } from '../../components/ui';
import { useApp } from '../../store/AppContext';
import { useBroker } from '../../store/BrokerStore';
import { Hero } from './ui';

const GLOBE = require('../../../assets/logo/logo-globe.png');

function catalogHtml(items: { name: string; code: string; unit: string; price: number; tiers: { price: number }[] }[], today: string) {
  const rows = items.map((p) => {
    const best = Math.min(...p.tiers.map((t) => t.price));
    return `<tr><td style="padding:10px 14px"><b>${p.name}</b><div style="color:#667;font-size:11px">${p.code} · por volumen desde $${best.toFixed(2)}</div></td><td style="padding:10px 14px;text-align:right;font-weight:700;font-size:18px">$${p.price.toFixed(2)}<span style="font-size:11px;color:#667">/${p.unit}</span></td></tr>`;
  }).join('');
  return `<html><head><meta name="viewport" content="width=device-width,initial-scale=1"/></head><body style="font-family:-apple-system,Helvetica,Arial;margin:0;color:#101d3b">
    <div style="background:linear-gradient(135deg,#0d1b3d,#1c2f63);color:#fff;padding:28px 24px">
      <div style="font-size:22px;font-weight:700">Azahares <span style="font-size:11px;letter-spacing:2px;opacity:.7">IMPORT &amp; EXPORT</span></div>
      <div style="font-size:26px;font-weight:700;margin-top:16px">Catálogo de precios</div>
      <div style="opacity:.7;margin-top:4px">${today} · Precios FOB en USD</div>
    </div>
    <table style="width:100%;border-collapse:collapse">${rows}</table>
    <div style="padding:14px 24px;color:#667;font-size:12px;display:flex;justify-content:space-between"><span>azaharesfuel.com</span><span>Sujeto a disponibilidad</span></div>
  </body></html>`;
}

export function BrokerCatalog({ onClose }: { onClose: () => void }) {
  const { catalog } = useBroker();
  const { showToast } = useApp();
  const insets = useSafeAreaInsets();
  const items = catalog?.items || [];
  const [busy, setBusy] = useState<string | null>(null);
  const today = new Date().toLocaleDateString('es', { day: 'numeric', month: 'long', year: 'numeric' });

  const exportPdf = async () => {
    if (busy || items.length === 0) return;
    setBusy('pdf'); haptic('medium');
    try {
      const { uri } = await Print.printToFileAsync({ html: catalogHtml(items, today) });
      if (await Sharing.isAvailableAsync()) await Sharing.shareAsync(uri, { mimeType: 'application/pdf', dialogTitle: 'Catálogo Azahares' });
      haptic('success');
    } catch (e: any) { showToast(e?.message || 'No se pudo generar el PDF', 'error'); }
    finally { setBusy(null); }
  };
  const print = async () => {
    if (busy || items.length === 0) return;
    setBusy('print'); haptic('medium');
    try { await Print.printAsync({ html: catalogHtml(items, today) }); } catch { /* cancelado */ }
    finally { setBusy(null); }
  };
  const share = async () => {
    if (busy || items.length === 0) return;
    setBusy('share'); haptic('medium');
    const text = `Catálogo Azahares · ${today}\n\n` + items.map((p) => `${p.name} (${p.code}): $${p.price.toFixed(2)}/${p.unit}`).join('\n');
    try { await Share.share({ message: text }); } catch { /* */ }
    finally { setBusy(null); }
  };

  return (
    <Screen scroll={false} padTop={false}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 110 }}>
        <Hero padBottom={18}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <IconButton name="chevL" variant="glassDark" onPress={onClose} />
            <IconButton name="share" variant="glassDark" onPress={share} />
          </View>
          <AppText serif weight="600" style={{ fontSize: 26, color: '#fff', marginTop: 12 }}>Catálogo</AppText>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 }}>
            <View style={{ width: 7, height: 7, borderRadius: 999, backgroundColor: colors.success }} />
            <AppText style={{ color: 'rgba(255,255,255,0.62)', fontSize: 13 }}>Precios base Azahares{catalog?.updated ? ` · ${catalog.updated}` : ''}</AppText>
          </View>
        </Hero>

        {items.length === 0 ? (
          <View style={{ paddingTop: 60, alignItems: 'center' }}><ActivityIndicator color={colors.navy700} /></View>
        ) : (
          <View style={{ padding: 16 }}>
            <View style={{ borderRadius: radius.xl, overflow: 'hidden', backgroundColor: colors.surface, ...shadows.card }}>
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

              <View>
                {items.map((p, i) => {
                  const best = Math.min(...p.tiers.map((t) => t.price));
                  return (
                    <View key={p.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 13, paddingVertical: 15, paddingHorizontal: 18, borderBottomWidth: i < items.length - 1 ? 1 : 0, borderBottomColor: colors.line }}>
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
        )}
      </ScrollView>

      <View style={{ position: 'absolute', left: 0, right: 0, bottom: 0, flexDirection: 'row', gap: 10, paddingHorizontal: 16, paddingTop: 14, paddingBottom: (insets.bottom || 0) + 14, backgroundColor: colors.bg }}>
        <DownloadBtn icon="fileText" label="PDF" busy={busy === 'pdf'} onPress={exportPdf} primary />
        <DownloadBtn icon="printer" label="Imprimir" busy={busy === 'print'} onPress={print} primary />
        <DownloadBtn icon="share" label="Compartir" busy={busy === 'share'} onPress={share} />
      </View>
    </Screen>
  );
}

function DownloadBtn({ icon, label, onPress, busy, primary }: { icon: string; label: string; onPress: () => void; busy: boolean; primary?: boolean }) {
  const content = (
    <View style={{ height: 52, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
      {busy ? <ActivityIndicator color={primary ? '#fff' : colors.ink} />
        : <><Icon name={icon as any} size={18} color={primary ? '#fff' : colors.ink} /><AppText weight="700" style={{ fontSize: 14.5, color: primary ? '#fff' : colors.ink }}>{label}</AppText></>}
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
