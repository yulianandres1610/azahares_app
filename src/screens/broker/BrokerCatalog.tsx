// Catálogo del día — datos REALES (/products/sales-catalog) y descargas
// funcionales: PDF (expo-print) + imprimir + compartir. El PDF replica el
// diseño del catálogo web (2 páginas: minorista + mayorista, header navy,
// tabla FOB/CIF, escala por contenedores, notas y footer de la empresa).
import React, { useEffect, useMemo, useState } from 'react';
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
import { getSalesCatalog, type SalesCatalog, type SalesCatalogItem } from '../../lib/api/broker';
import { Hero } from './ui';

const GLOBE = require('../../../assets/logo/logo-globe.png');

const money2 = (n: number) => n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const money0 = (n: number) => n.toLocaleString('en-US', { maximumFractionDigits: 0 });
const escapeHtml = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

// ── PDF HTML — réplica del catálogo web (SalesCatalogPdfDoc) ──────────────────
function catalogHtml(cat: SalesCatalog): string {
  const today = new Date(cat.generatedAt);
  const dateLabel = today.toLocaleDateString('es', { day: '2-digit', month: 'long', year: 'numeric' });
  const co = cat.company;
  const contact = [co.phone, co.email, co.website].filter(Boolean).join(' · ');

  const minBuy = (it: SalesCatalogItem) =>
    it.innerQuantity ? `${it.innerQuantity.toLocaleString('en-US')} ${it.unit}` : '—';

  const imageCell = (it: SalesCatalogItem) => {
    const letter = escapeHtml((it.name.charAt(0) || '?').toUpperCase());
    const img = it.imageUrl
      ? `<img src="${it.imageUrl}" style="position:absolute;inset:0;width:100%;height:100%;object-fit:cover" />`
      : '';
    return `<div style="position:relative;width:46px;height:46px;border-radius:6px;background:${NAVY_50};overflow:hidden;display:flex;align-items:center;justify-content:center">
      <span style="font-weight:700;font-size:18px;color:${NAVY_900}">${letter}</span>${img}</div>`;
  };

  const rows = cat.items.map((it, i) => `
    <tr style="border-bottom:0.5px solid ${SLATE_200};${i % 2 ? `background:#fafbfc;` : ''}">
      <td style="padding:7px 6px;width:54px">${imageCell(it)}</td>
      <td style="padding:7px 6px">
        <div style="font-weight:700;font-size:10.5px;color:${NAVY_900}">${escapeHtml(it.name)}</div>
        <div style="font-size:7.5px;color:${SLATE_500};letter-spacing:0.5px;margin-top:2px">${escapeHtml((it.category || '').toUpperCase())}</div>
      </td>
      <td style="padding:7px 6px;font-size:9px;color:#475569">${escapeHtml(it.sku)}</td>
      <td style="padding:7px 6px;font-size:9px;color:#475569;font-weight:700;text-align:right">${minBuy(it)}</td>
      <td style="padding:7px 6px;font-size:9px;color:#475569;text-align:right">USD / ${escapeHtml(it.unit)}</td>
      <td style="padding:7px 6px;font-size:11px;color:#475569;font-weight:700;text-align:right">$${money2(it.basicUnitPrice)}</td>
      <td style="padding:7px 6px;font-size:12px;color:${NAVY_900};font-weight:700;text-align:right">$${money2(it.cifUnitPrice)}</td>
    </tr>`).join('');

  const wholesale = cat.items
    .map((it) => ({ ...it, containerScales: (it.containerScales || []).filter((s) => s.containers > 1) }))
    .filter((it) => it.containerScales.length > 0);

  const scaleSections = wholesale.map((it) => `
    <div style="margin-top:8px;padding:7px;background:#f8fafc;border-radius:4px;border-left:2px solid ${NAVY_700}">
      <div style="font-weight:700;font-size:8px;color:${NAVY_900};letter-spacing:0.6px;margin-bottom:5px">${escapeHtml(it.name)} · ESCALA POR CONTENEDORES (CIF)</div>
      <div style="display:flex;gap:5px">
        ${it.containerScales.map((s) => `
          <div style="flex:1;background:#fff;border:0.5px solid ${SLATE_200};border-radius:3px;padding:6px;text-align:center">
            <div style="font-weight:700;font-size:8px;color:${NAVY_700};letter-spacing:0.4px">${s.containers} ${s.containers === 1 ? 'CONT.' : 'CONTS.'}</div>
            <div style="font-size:7px;color:${SLATE_500};margin-top:2px">${s.totalLiters.toLocaleString('en-US')} ${escapeHtml(it.unit)}</div>
            <div style="font-weight:700;font-size:10px;color:#047857;margin-top:3px">$${money0(s.totalCif)}</div>
            <div style="font-size:6.5px;color:${SLATE_500};margin-top:1px">$${money2(s.cifUnitPrice)} /${escapeHtml(it.unit)}</div>
          </div>`).join('')}
      </div>
    </div>`).join('');

  const header = `
    <div style="background:${NAVY_900};color:#fff;padding:20px 30px;display:flex;align-items:center;justify-content:space-between">
      <div style="display:flex;align-items:center;gap:10px">
        <div style="font-family:Georgia,serif;font-weight:700;font-size:22px">Azahares</div>
        <div style="font-size:9px;letter-spacing:2px;color:rgba(255,255,255,0.65);font-weight:700">IMPORT &amp; EXPORT</div>
      </div>
      <div style="font-size:8px;color:rgba(255,255,255,0.7);letter-spacing:0.8px;text-align:right">CAT${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, '0')}${String(today.getDate()).padStart(2, '0')}</div>
    </div>`;

  const subHeader = (title: string) => `
    <div style="background:${NAVY_50};padding:13px 30px;border-bottom:2px solid ${NAVY_900};display:flex;justify-content:space-between;align-items:center">
      <div style="font-weight:700;font-size:17px;color:${NAVY_900};letter-spacing:1.4px">${title}</div>
      <div style="font-size:11px;color:${NAVY_700};font-weight:700">${dateLabel.toUpperCase()}</div>
    </div>`;

  const footer = `
    <div style="position:fixed;bottom:14px;left:30px;right:30px;display:flex;justify-content:space-between;font-size:8px;color:${SLATE_500};border-top:0.5px solid ${SLATE_200};padding-top:8px">
      <span>${escapeHtml(co.legalName)}</span><span>${escapeHtml(contact)}</span>
    </div>`;

  const page2 = wholesale.length === 0 ? '' : `
    <div style="page-break-before:always">
      ${header}
      ${subHeader('CATÁLOGO DE PRECIOS · MAYORISTAS')}
      <div style="padding:18px 30px 60px">
        <div style="font-size:9px;color:${SLATE_500};line-height:1.5;margin-bottom:14px">
          Precios CIF totales por escala de volumen (10, 20 y 30 contenedores). Los descuentos por mayoreo de la lista básica se aplican automáticamente sobre la cantidad total de litros.
        </div>
        ${scaleSections}
        <div style="margin-top:14px;padding:9px;border-top:0.5px solid ${SLATE_200}">
          <div style="font-weight:700;font-size:8px;color:${SLATE_500};letter-spacing:0.6px;margin-bottom:3px">AVISO LEGAL</div>
          <div style="font-size:8px;color:${SLATE_500};line-height:1.45;text-align:justify">Este documento tiene carácter exclusivamente informativo y no constituye una oferta vinculante de venta. Los precios aquí publicados son referenciales para el día de su emisión y quedan sujetos a confirmación al momento de generar la orden de venta o factura formal. Azahares Import &amp; Export se reserva el derecho de modificar precios y condiciones sin previo aviso por fluctuaciones del mercado internacional de combustibles, variaciones en costos logísticos o cambios regulatorios. Cualquier discrepancia entre este catálogo y la factura emitida prevalecerá esta última.</div>
        </div>
      </div>
      ${footer}
    </div>`;

  return `<!DOCTYPE html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"/>
    <style>@page{margin:0}body{margin:0;font-family:-apple-system,Helvetica,Arial,sans-serif;color:#0f172a}table{width:100%;border-collapse:collapse}</style></head>
    <body>
      ${header}
      ${subHeader('CATÁLOGO DE PRECIOS · MINORISTAS')}
      <div style="padding:18px 30px 60px">
        <div style="font-size:9px;color:${SLATE_500};line-height:1.5;margin-bottom:14px">
          Precios CIF unitarios por contenedor (compra mínima). Incluyen costo del producto y todos los cargos navieros (flete marítimo, THCD, ISPD, seguro). Para volúmenes mayores ver página 2 — Mayoristas, donde aplican descuentos por escala.
        </div>
        <table>
          <thead>
            <tr style="background:${NAVY_900};border-radius:3px">
              <th style="padding:8px 6px;width:54px"></th>
              <th style="padding:8px 6px;color:#fff;font-size:8px;letter-spacing:0.8px;text-align:left">PRODUCTO</th>
              <th style="padding:8px 6px;color:#fff;font-size:8px;letter-spacing:0.8px;text-align:left">SKU</th>
              <th style="padding:8px 6px;color:#fff;font-size:8px;letter-spacing:0.8px;text-align:right">MÍN. COMPRA</th>
              <th style="padding:8px 6px;color:#fff;font-size:8px;letter-spacing:0.8px;text-align:right">UNIDAD</th>
              <th style="padding:8px 6px;color:#fff;font-size:8px;letter-spacing:0.8px;text-align:right">PRECIO FOB</th>
              <th style="padding:8px 6px;color:#fff;font-size:8px;letter-spacing:0.8px;text-align:right">PRECIO CIF</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
        <div style="margin-top:16px;background:${NAVY_50};padding:10px;border-radius:6px;border-left:3px solid ${NAVY_700}">
          <div style="font-size:9px;color:${NAVY_900};line-height:1.4">Precio FOB = costo del producto en USA (no incluye cargos navieros). Precio CIF = FOB + cargos navieros prorrateados (flete marítimo, THCD, ISPD y seguro) sobre la capacidad estándar de un iso tanque de 24,000 litros. El mínimo de compra equivale al contenido de un empaque completo del producto.</div>
        </div>
        <div style="margin-top:10px;background:#fff7ed;border-left:3px solid #c2410c;padding:9px;border-radius:6px">
          <div style="font-weight:700;font-size:9px;color:#9a3412;letter-spacing:0.6px;margin-bottom:3px">ACTUALIZACIÓN DIARIA DE PRECIOS</div>
          <div style="font-size:9px;color:#7c2d12;line-height:1.4">Los precios publicados se actualizan todos los días a las 12:00 del mediodía y son válidos únicamente para la fecha indicada en el encabezado.</div>
        </div>
      </div>
      ${footer}
      ${page2}
    </body></html>`;
}

const NAVY_900 = '#0d1b3d';
const NAVY_700 = '#1e3a8a';
const NAVY_50 = '#eef2f8';
const SLATE_500 = '#64748b';
const SLATE_200 = '#e2e8f0';

const iconForCategory = (cat: string): any => {
  const c = (cat || '').toLowerCase();
  if (c.includes('gasolina') || c.includes('gas')) return 'fuel';
  if (c.includes('diesel') || c.includes('diésel')) return 'droplet';
  return 'fuel';
};

export function BrokerCatalog({ onClose }: { onClose: () => void }) {
  const { showToast } = useApp();
  const insets = useSafeAreaInsets();
  const [cat, setCat] = useState<SalesCatalog | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    getSalesCatalog().then((c) => { if (alive) { setCat(c); setLoading(false); } }).catch(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, []);

  const items = cat?.items || [];
  const dateLabel = useMemo(
    () => (cat ? new Date(cat.generatedAt) : new Date()).toLocaleDateString('es', { day: 'numeric', month: 'long', year: 'numeric' }),
    [cat],
  );
  const timeLabel = useMemo(
    () => (cat ? new Date(cat.generatedAt) : new Date()).toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' }),
    [cat],
  );

  const exportPdf = async () => {
    if (busy || !cat) return;
    setBusy('pdf'); haptic('medium');
    try {
      const { uri } = await Print.printToFileAsync({ html: catalogHtml(cat) });
      if (await Sharing.isAvailableAsync()) await Sharing.shareAsync(uri, { mimeType: 'application/pdf', dialogTitle: 'Catálogo Azahares' });
      haptic('success');
    } catch (e: any) { showToast(e?.message || 'No se pudo generar el PDF', 'error'); }
    finally { setBusy(null); }
  };
  const print = async () => {
    if (busy || !cat) return;
    setBusy('print'); haptic('medium');
    try { await Print.printAsync({ html: catalogHtml(cat) }); } catch { /* cancelado */ }
    finally { setBusy(null); }
  };
  const share = async () => {
    if (busy || !cat) return;
    setBusy('share'); haptic('medium');
    const text = `Catálogo Azahares · ${dateLabel}\n\n`
      + items.map((p) => `${p.name} (${p.sku}): CIF $${money2(p.cifUnitPrice)}/${p.unit}`).join('\n')
      + `\n\nazaharesfuel.com`;
    try { await Share.share({ message: text }); } catch { /* */ }
    finally { setBusy(null); }
  };

  return (
    <Screen scroll={false} padTop={false}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 110 }}>
        <Hero>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <IconButton name="chevL" variant="glassDark" onPress={onClose} />
            <IconButton name="share" variant="glassDark" onPress={share} />
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
              {/* Header navy con halo + branding (igual que el PDF) */}
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

              {/* Filas de producto con FOB + CIF + mínimo de compra */}
              <View>
                {items.map((p, i) => {
                  const wholesale = (p.containerScales || []).filter((s) => s.containers > 1);
                  const best = wholesale.length ? Math.min(...wholesale.map((s) => s.cifUnitPrice)) : null;
                  return (
                    <View key={p.id} style={{ paddingVertical: 14, paddingHorizontal: 18, borderBottomWidth: i < items.length - 1 ? 1 : 0, borderBottomColor: colors.line }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 13 }}>
                        <View style={{ width: 42, height: 42, borderRadius: 12, backgroundColor: alpha(colors.navy500, 0.11), alignItems: 'center', justifyContent: 'center' }}>
                          <Icon name={iconForCategory(p.category)} size={21} color={colors.navy700} />
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
              <AppText style={{ flex: 1, fontSize: 12.5, lineHeight: 19, color: colors.ink50 }}>El PDF incluye 2 páginas: minorista (precio por contenedor) y mayorista (escala 10/20/30 contenedores), con el mismo diseño del catálogo web.</AppText>
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
