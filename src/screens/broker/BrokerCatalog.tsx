// Catálogo del día — datos REALES (/products/sales-catalog). El PDF y los PNG
// para redes se generan capturando vistas nativas (react-native-view-shot) que
// replican 1:1 el diseño del catálogo web: header con logo blanco + código de
// barras Code128, tabla FOB/CIF con imagen de producto, escala mayorista, etc.
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Image, ScrollView, Share, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system/legacy';
import { captureRef } from 'react-native-view-shot';
import Svg, { Circle, Defs, RadialGradient as SvgRadial, Stop } from 'react-native-svg';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { alpha, colors, gradients, radius, shadows } from '../../theme/tokens';
import { Icon } from '../../components/Icon';
import { AppText, IconButton, Screen, Tap, haptic } from '../../components/ui';
import { useApp } from '../../store/AppContext';
import { getSalesCatalog, type SalesCatalog } from '../../lib/api/broker';
import { Hero } from './ui';
import {
  MayoristaPage, MayoristaStory, MinoristaPage, MinoristaStory, dateLabelFor, type ProductImages,
} from './CatalogPrintable';

const GLOBE = require('../../../assets/logo/logo-globe.png');
const money2 = (n: number) => n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const IMG_DIR = FileSystem.cacheDirectory + 'catimg/';
async function localizeImages(items: SalesCatalog['items']): Promise<ProductImages> {
  const out: ProductImages = {};
  await FileSystem.makeDirectoryAsync(IMG_DIR, { intermediates: true }).catch(() => {});
  await Promise.all(items.map(async (it) => {
    if (!it.imageUrl) { out[it.id] = null; return; }
    try {
      const dest = IMG_DIR + it.id + '.img';
      const info = await FileSystem.getInfoAsync(dest);
      if (!(info.exists && (info.size ?? 0) > 0)) await FileSystem.downloadAsync(it.imageUrl, dest);
      out[it.id] = dest;
    } catch { out[it.id] = null; }
  }));
  return out;
}

const iconForCategory = (cat: string): any => {
  const c = (cat || '').toLowerCase();
  if (c.includes('diesel') || c.includes('diésel')) return 'droplet';
  return 'fuel';
};

export function BrokerCatalog({ onClose }: { onClose: () => void }) {
  const { showToast } = useApp();
  const insets = useSafeAreaInsets();
  const [cat, setCat] = useState<SalesCatalog | null>(null);
  const [images, setImages] = useState<ProductImages>({});
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);

  // refs de las vistas imprimibles fuera de pantalla
  const minPageRef = useRef<View>(null);
  const mayPageRef = useRef<View>(null);
  const minStoryRef = useRef<View>(null);
  const mayStoryRef = useRef<View>(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const c = await getSalesCatalog();
        if (!alive) return;
        setCat(c);
        setLoading(false);
        const imgs = await localizeImages(c.items);
        if (alive) setImages(imgs);
      } catch { if (alive) setLoading(false); }
    })();
    return () => { alive = false; };
  }, []);

  const items = cat?.items || [];
  const hasWholesale = items.some((it) => (it.containerScales || []).some((s) => s.containers > 1));
  const dateLabel = useMemo(() => (cat ? dateLabelFor(cat) : ''), [cat]);
  const timeLabel = useMemo(
    () => (cat ? new Date(cat.generatedAt) : new Date()).toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' }),
    [cat],
  );

  const capture = (ref: React.RefObject<View | null>) =>
    captureRef(ref as React.RefObject<View>, { format: 'png', quality: 1, result: 'base64' });

  const buildPdf = async (): Promise<string> => {
    const p1 = await capture(minPageRef);
    const p2 = hasWholesale ? await capture(mayPageRef) : null;
    const html = `<!DOCTYPE html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"/>
      <style>@page{margin:0}body{margin:0}img{display:block;width:100%}</style></head><body>
      <img src="data:image/png;base64,${p1}"/>
      ${p2 ? `<div style="page-break-before:always"></div><img src="data:image/png;base64,${p2}"/>` : ''}
      </body></html>`;
    const { uri } = await Print.printToFileAsync({ html, width: 612, height: 792 });
    return uri;
  };

  const exportPdf = async () => {
    if (busy || !cat) return;
    setBusy('pdf'); haptic('medium');
    try {
      const uri = await buildPdf();
      if (await Sharing.isAvailableAsync()) await Sharing.shareAsync(uri, { mimeType: 'application/pdf', dialogTitle: 'Catálogo Azahares' });
      haptic('success');
    } catch (e: any) { showToast(e?.message || 'No se pudo generar el PDF', 'error'); }
    finally { setBusy(null); }
  };
  const print = async () => {
    if (busy || !cat) return;
    setBusy('print'); haptic('medium');
    try {
      const p1 = await capture(minPageRef);
      const p2 = hasWholesale ? await capture(mayPageRef) : null;
      const html = `<!DOCTYPE html><html><head><style>@page{margin:0}body{margin:0}img{display:block;width:100%}</style></head><body>
        <img src="data:image/png;base64,${p1}"/>${p2 ? `<div style="page-break-before:always"></div><img src="data:image/png;base64,${p2}"/>` : ''}</body></html>`;
      await Print.printAsync({ html, width: 612, height: 792 });
    } catch { /* cancelado */ }
    finally { setBusy(null); }
  };
  const exportPng = async () => {
    if (busy || !cat) return;
    setBusy('png'); haptic('medium');
    try {
      const u1 = await captureRef(minStoryRef, { format: 'png', quality: 1, result: 'tmpfile' });
      if (await Sharing.isAvailableAsync()) await Sharing.shareAsync(u1, { mimeType: 'image/png', dialogTitle: 'Catálogo minorista' });
      if (hasWholesale) {
        const u2 = await captureRef(mayStoryRef, { format: 'png', quality: 1, result: 'tmpfile' });
        if (await Sharing.isAvailableAsync()) await Sharing.shareAsync(u2, { mimeType: 'image/png', dialogTitle: 'Catálogo mayorista' });
      }
      haptic('success');
    } catch (e: any) { showToast(e?.message || 'No se pudieron generar los PNG', 'error'); }
    finally { setBusy(null); }
  };
  const shareText = async () => {
    if (!cat) return;
    const text = `Catálogo Azahares · ${dateLabel}\n\n`
      + items.map((p) => `${p.name} (${p.sku}): CIF $${money2(p.cifUnitPrice)}/${p.unit}`).join('\n')
      + `\n\nazaharesfuel.com`;
    try { await Share.share({ message: text }); } catch { /* */ }
  };

  return (
    <Screen scroll={false} padTop={false}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 110 }}>
        <Hero>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <IconButton name="chevL" variant="glassDark" onPress={onClose} />
            <IconButton name="share" variant="glassDark" onPress={shareText} />
          </View>
          <AppText serif weight="600" style={{ fontSize: 26, color: '#fff', marginTop: 12 }}>Catálogo</AppText>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 }}>
            <View style={{ width: 7, height: 7, borderRadius: 999, backgroundColor: colors.success }} />
            <AppText style={{ color: 'rgba(255,255,255,0.62)', fontSize: 13 }}>Precios base Azahares · {timeLabel}</AppText>
          </View>
        </Hero>

        {loading ? (
          <View style={{ paddingTop: 60, alignItems: 'center' }}><ActivityIndicator color={colors.navy700} /></View>
        ) : items.length === 0 ? (
          <View style={{ paddingTop: 60, alignItems: 'center' }}>
            <Icon name="inbox" size={40} color={colors.ink40} />
            <AppText weight="500" style={{ fontSize: 15, color: colors.ink40, marginTop: 12 }}>Sin productos en el catálogo</AppText>
          </View>
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
                  <AppText style={{ color: 'rgba(255,255,255,0.6)', fontSize: 12.5, marginTop: 2 }}>{dateLabel} · Precios CIF en USD</AppText>
                </View>
              </LinearGradient>

              <View>
                {items.map((p, i) => {
                  const wholesale = (p.containerScales || []).filter((s) => s.containers > 1);
                  const best = wholesale.length ? Math.min(...wholesale.map((s) => s.cifUnitPrice)) : null;
                  return (
                    <View key={p.id} style={{ paddingVertical: 14, paddingHorizontal: 18, borderBottomWidth: i < items.length - 1 ? 1 : 0, borderBottomColor: colors.line }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 13 }}>
                        <View style={{ width: 42, height: 42, borderRadius: 12, backgroundColor: alpha(colors.navy500, 0.11), alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                          {images[p.id] ? <Image source={{ uri: images[p.id] as string }} style={{ width: 42, height: 42 }} resizeMode="cover" />
                            : <Icon name={iconForCategory(p.category)} size={21} color={colors.navy700} />}
                        </View>
                        <View style={{ flex: 1, minWidth: 0 }}>
                          <AppText weight="700" numberOfLines={2} style={{ fontSize: 14.5, color: colors.ink }}>{p.name}</AppText>
                          <AppText weight="600" style={{ fontSize: 11, color: colors.ink40, marginTop: 2 }}>
                            {p.sku}{p.innerQuantity ? ` · Mín. ${p.innerQuantity.toLocaleString('en-US')} ${p.unit}` : ''}
                          </AppText>
                        </View>
                        <View style={{ alignItems: 'flex-end' }}>
                          <AppText weight="600" style={{ fontSize: 11, color: colors.ink40 }}>FOB ${money2(p.basicUnitPrice)}</AppText>
                          <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 2, marginTop: 1 }}>
                            <AppText serif weight="700" style={{ fontSize: 21, color: colors.ink }}>${money2(p.cifUnitPrice)}</AppText>
                            <AppText style={{ fontSize: 10.5, color: colors.ink50 }}>/{p.unit}</AppText>
                          </View>
                          <AppText weight="700" style={{ fontSize: 9, letterSpacing: 0.5, color: colors.navy700, marginTop: 1 }}>CIF · USD</AppText>
                        </View>
                      </View>
                      {best != null && (
                        <View style={{ marginTop: 8, alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: alpha(colors.success, 0.1), paddingHorizontal: 9, paddingVertical: 3, borderRadius: 999 }}>
                          <Icon name="trendUp" size={12} color={colors.success} />
                          <AppText weight="700" style={{ fontSize: 10.5, color: colors.success }}>Por volumen desde ${money2(best)}/{p.unit}</AppText>
                        </View>
                      )}
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
              <AppText style={{ flex: 1, fontSize: 12.5, lineHeight: 19, color: colors.ink50 }}>
                PDF: 2 páginas (minorista + mayorista) con header, logo y código de barras igual que la web. PNG: 2 imágenes verticales listas para redes.
              </AppText>
            </View>
          </View>
        )}
      </ScrollView>

      <View style={{ position: 'absolute', left: 0, right: 0, bottom: 0, flexDirection: 'row', gap: 10, paddingHorizontal: 16, paddingTop: 14, paddingBottom: (insets.bottom || 0) + 14, backgroundColor: colors.bg }}>
        <DownloadBtn icon="fileText" label="PDF" busy={busy === 'pdf'} onPress={exportPdf} primary />
        <DownloadBtn icon="printer" label="Imprimir" busy={busy === 'print'} onPress={print} primary />
        <DownloadBtn icon="image" label="PNG" busy={busy === 'png'} onPress={exportPng} />
      </View>

      {/* Vistas imprimibles fuera de pantalla — se capturan a PNG. */}
      {cat ? (
        <View style={{ position: 'absolute', left: -10000, top: 0 }} pointerEvents="none">
          <View ref={minPageRef} collapsable={false}><MinoristaPage cat={cat} images={images} /></View>
          {hasWholesale ? <View ref={mayPageRef} collapsable={false}><MayoristaPage cat={cat} /></View> : null}
          <View ref={minStoryRef} collapsable={false}><MinoristaStory cat={cat} images={images} /></View>
          {hasWholesale ? <View ref={mayStoryRef} collapsable={false}><MayoristaStory cat={cat} images={images} /></View> : null}
        </View>
      ) : null}
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
