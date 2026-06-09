// Vistas imprimibles del catálogo — se renderizan fuera de pantalla y se
// capturan con react-native-view-shot para producir el PDF (páginas LETTER)
// y los PNG verticales para redes, replicando el diseño del catálogo web.
import React from 'react';
import { Image, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Circle, Defs, RadialGradient as SvgRadial, Stop } from 'react-native-svg';
import { Barcode } from '../../components/Label';
import { AppText } from '../../components/ui';
import type { SalesCatalog, SalesCatalogItem } from '../../lib/api/broker';

const GLOBE = require('../../../assets/logo/logo-globe.png');

const NAVY_900 = '#0d1b3d';
const NAVY_700 = '#1e3a8a';
const NAVY_50 = '#eef2f8';
const SLATE_500 = '#64748b';
const SLATE_200 = '#e2e8f0';

const money2 = (n: number) => n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const money0 = (n: number) => n.toLocaleString('en-US', { maximumFractionDigits: 0 });

export type ProductImages = Record<string, string | null>;

export function barcodeNumberFor(cat: SalesCatalog): string {
  const d = new Date(cat.generatedAt);
  const p = (n: number) => String(n).padStart(2, '0');
  return `CAT${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}${p(d.getHours())}${p(d.getMinutes())}`;
}

export function dateLabelFor(cat: SalesCatalog): string {
  return new Date(cat.generatedAt).toLocaleDateString('es', { day: '2-digit', month: 'long', year: 'numeric' });
}

// ════════════════════════════════════════════════════════════════
// PÁGINAS LETTER (para el PDF) — ancho 816px (8.5" × 96dpi)
// ════════════════════════════════════════════════════════════════
const PAGE_W = 816;
const PAGE_H = 1056;

function PageHeader({ cat }: { cat: SalesCatalog }) {
  return (
    <View style={{ backgroundColor: NAVY_900, paddingVertical: 20, paddingHorizontal: 30, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
        <Image source={GLOBE} style={{ width: 64, height: 64, tintColor: '#fff' }} resizeMode="contain" />
        <View>
          <AppText serif weight="600" style={{ fontSize: 26, color: '#fff' }}>Azahares</AppText>
          <AppText weight="700" style={{ fontSize: 10, letterSpacing: 2, color: 'rgba(255,255,255,0.65)' }}>IMPORT & EXPORT</AppText>
        </View>
      </View>
      <View style={{ alignItems: 'flex-end' }}>
        <View style={{ backgroundColor: '#fff', borderRadius: 4, padding: 4 }}>
          <Barcode value={barcodeNumberFor(cat)} height={38} fg="#0a0a0a" />
        </View>
        <AppText style={{ fontSize: 8, letterSpacing: 0.8, color: 'rgba(255,255,255,0.8)', marginTop: 5 }}>{barcodeNumberFor(cat)}</AppText>
      </View>
    </View>
  );
}

function SubHeader({ title, cat }: { title: string; cat: SalesCatalog }) {
  return (
    <View style={{ backgroundColor: NAVY_50, paddingHorizontal: 30, paddingVertical: 14, borderBottomWidth: 2, borderBottomColor: NAVY_900, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
      <AppText weight="700" style={{ fontSize: 18, color: NAVY_900, letterSpacing: 1.4 }}>{title}</AppText>
      <AppText weight="700" style={{ fontSize: 11, color: NAVY_700 }}>{dateLabelFor(cat).toUpperCase()}</AppText>
    </View>
  );
}

function PageFooter({ cat }: { cat: SalesCatalog }) {
  const co = cat.company;
  const contact = [co.phone, co.email, co.website].filter(Boolean).join(' · ');
  return (
    <View style={{ position: 'absolute', bottom: 18, left: 30, right: 30, flexDirection: 'row', justifyContent: 'space-between', borderTopWidth: 0.5, borderTopColor: SLATE_200, paddingTop: 8 }}>
      <AppText style={{ fontSize: 8, color: SLATE_500 }}>{co.legalName}</AppText>
      <AppText style={{ fontSize: 8, color: SLATE_500 }}>{contact}</AppText>
    </View>
  );
}

function ProdImage({ it, src }: { it: SalesCatalogItem; src: string | null }) {
  return (
    <View style={{ width: 50, height: 50, borderRadius: 4, backgroundColor: NAVY_50, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' }}>
      {src ? <Image source={{ uri: src }} style={{ width: 50, height: 50 }} resizeMode="cover" />
        : <AppText weight="700" style={{ fontSize: 18, color: NAVY_900 }}>{(it.name.charAt(0) || '?').toUpperCase()}</AppText>}
    </View>
  );
}

export function MinoristaPage({ cat, images }: { cat: SalesCatalog; images: ProductImages }) {
  return (
    <View style={{ width: PAGE_W, minHeight: PAGE_H, backgroundColor: '#fff' }}>
      <PageHeader cat={cat} />
      <SubHeader title="CATÁLOGO DE PRECIOS · MINORISTAS" cat={cat} />
      <View style={{ paddingHorizontal: 30, paddingTop: 18, paddingBottom: 60 }}>
        <AppText style={{ fontSize: 9.5, color: SLATE_500, lineHeight: 14, marginBottom: 14 }}>
          Precios CIF unitarios por contenedor (compra mínima). Incluyen costo del producto y todos los cargos navieros (flete marítimo, THCD, ISPD, seguro). Para volúmenes mayores ver página 2 — Mayoristas, donde aplican descuentos por escala.
        </AppText>

        {/* head */}
        <View style={{ flexDirection: 'row', backgroundColor: NAVY_900, paddingVertical: 8, paddingHorizontal: 6, borderRadius: 3, alignItems: 'center' }}>
          <View style={{ width: 56 }} />
          <Th style={{ flex: 2.1 }}>PRODUCTO</Th>
          <Th style={{ flex: 1.1 }}>SKU</Th>
          <Th style={{ flex: 1, textAlign: 'right' }}>MÍN. COMPRA</Th>
          <Th style={{ flex: 0.8, textAlign: 'right' }}>UNIDAD</Th>
          <Th style={{ flex: 1.2, textAlign: 'right' }}>FOB</Th>
          <Th style={{ flex: 1.3, textAlign: 'right' }}>CIF</Th>
        </View>

        {cat.items.map((it, idx) => {
          const min = it.innerQuantity ? `${it.innerQuantity.toLocaleString('en-US')} ${it.unit}` : '—';
          return (
            <View key={it.id} style={{ flexDirection: 'row', paddingVertical: 8, paddingHorizontal: 6, borderBottomWidth: 0.5, borderBottomColor: SLATE_200, alignItems: 'center', backgroundColor: idx % 2 ? '#fafbfc' : '#fff' }}>
              <View style={{ width: 56 }}><ProdImage it={it} src={images[it.id] ?? null} /></View>
              <View style={{ flex: 2.1, paddingRight: 6 }}>
                <AppText weight="700" style={{ fontSize: 10.5, color: NAVY_900 }}>{it.name}</AppText>
                <AppText style={{ fontSize: 7.5, color: SLATE_500, letterSpacing: 0.5, marginTop: 2 }}>{(it.category || '').toUpperCase()}</AppText>
              </View>
              <AppText style={{ flex: 1.1, fontSize: 9, color: '#475569' }}>{it.sku}</AppText>
              <AppText weight="700" style={{ flex: 1, fontSize: 9, color: '#475569', textAlign: 'right' }}>{min}</AppText>
              <AppText style={{ flex: 0.8, fontSize: 9, color: '#475569', textAlign: 'right' }}>USD / {it.unit}</AppText>
              <AppText weight="700" style={{ flex: 1.2, fontSize: 11, color: '#475569', textAlign: 'right' }}>${money2(it.basicUnitPrice)}</AppText>
              <AppText weight="700" style={{ flex: 1.3, fontSize: 12, color: NAVY_900, textAlign: 'right' }}>${money2(it.cifUnitPrice)}</AppText>
            </View>
          );
        })}

        <NoteBox bg={NAVY_50} border={NAVY_700}>
          <AppText style={{ fontSize: 9, color: NAVY_900, lineHeight: 13 }}>
            Precio FOB = costo del producto en USA (no incluye cargos navieros). Precio CIF = FOB + cargos navieros prorrateados (flete marítimo, THCD, ISPD y seguro) sobre la capacidad estándar de un iso tanque de 24,000 litros. El mínimo de compra equivale al contenido de un empaque completo del producto.
          </AppText>
        </NoteBox>
        <View style={{ marginTop: 10, backgroundColor: '#fff7ed', borderLeftWidth: 3, borderLeftColor: '#c2410c', padding: 9, borderRadius: 6 }}>
          <AppText weight="700" style={{ fontSize: 9, color: '#9a3412', letterSpacing: 0.6, marginBottom: 3 }}>ACTUALIZACIÓN DIARIA DE PRECIOS</AppText>
          <AppText style={{ fontSize: 9, color: '#7c2d12', lineHeight: 13 }}>Los precios publicados se actualizan todos los días a las 12:00 del mediodía y son válidos únicamente para la fecha indicada en el encabezado.</AppText>
        </View>
      </View>
      <PageFooter cat={cat} />
    </View>
  );
}

export function MayoristaPage({ cat }: { cat: SalesCatalog }) {
  const wholesale = cat.items
    .map((it) => ({ ...it, containerScales: (it.containerScales || []).filter((s) => s.containers > 1) }))
    .filter((it) => it.containerScales.length > 0);
  return (
    <View style={{ width: PAGE_W, minHeight: PAGE_H, backgroundColor: '#fff' }}>
      <PageHeader cat={cat} />
      <SubHeader title="CATÁLOGO DE PRECIOS · MAYORISTAS" cat={cat} />
      <View style={{ paddingHorizontal: 30, paddingTop: 18, paddingBottom: 60 }}>
        <AppText style={{ fontSize: 9.5, color: SLATE_500, lineHeight: 14, marginBottom: 14 }}>
          Precios CIF totales por escala de volumen (10, 20 y 30 contenedores). Los descuentos por mayoreo de la lista básica se aplican automáticamente sobre la cantidad total de litros.
        </AppText>
        {wholesale.map((it) => (
          <View key={it.id} style={{ marginTop: 8, padding: 8, backgroundColor: '#f8fafc', borderRadius: 4, borderLeftWidth: 2, borderLeftColor: NAVY_700 }}>
            <AppText weight="700" style={{ fontSize: 8.5, color: NAVY_900, letterSpacing: 0.6, marginBottom: 5 }}>{it.name} · ESCALA POR CONTENEDORES (CIF)</AppText>
            <View style={{ flexDirection: 'row', gap: 5 }}>
              {it.containerScales.map((s) => (
                <View key={s.containers} style={{ flex: 1, backgroundColor: '#fff', borderWidth: 0.5, borderColor: SLATE_200, borderRadius: 3, padding: 6, alignItems: 'center' }}>
                  <AppText weight="700" style={{ fontSize: 8.5, color: NAVY_700, letterSpacing: 0.4 }}>{s.containers} {s.containers === 1 ? 'CONT.' : 'CONTS.'}</AppText>
                  <AppText style={{ fontSize: 7.5, color: SLATE_500, marginTop: 2 }}>{s.totalLiters.toLocaleString('en-US')} {it.unit}</AppText>
                  <AppText weight="700" style={{ fontSize: 11, color: '#047857', marginTop: 3 }}>${money0(s.totalCif)}</AppText>
                  <AppText style={{ fontSize: 7, color: SLATE_500, marginTop: 1 }}>${money2(s.cifUnitPrice)} /{it.unit}</AppText>
                </View>
              ))}
            </View>
          </View>
        ))}
        <View style={{ marginTop: 14, paddingTop: 9, borderTopWidth: 0.5, borderTopColor: SLATE_200 }}>
          <AppText weight="700" style={{ fontSize: 8, color: SLATE_500, letterSpacing: 0.6, marginBottom: 3 }}>AVISO LEGAL</AppText>
          <AppText style={{ fontSize: 8, color: SLATE_500, lineHeight: 12 }}>
            Este documento tiene carácter exclusivamente informativo y no constituye una oferta vinculante de venta. Los precios aquí publicados son referenciales para el día de su emisión y quedan sujetos a confirmación al momento de generar la orden de venta o factura formal. Azahares Import & Export se reserva el derecho de modificar precios y condiciones sin previo aviso por fluctuaciones del mercado internacional de combustibles, variaciones en costos logísticos o cambios regulatorios. Cualquier discrepancia entre este catálogo y la factura emitida prevalecerá esta última.
          </AppText>
        </View>
      </View>
      <PageFooter cat={cat} />
    </View>
  );
}

function Th({ children, style }: { children: React.ReactNode; style?: any }) {
  return <AppText weight="700" style={[{ color: '#fff', fontSize: 8, letterSpacing: 0.8 }, style]}>{children}</AppText>;
}
function NoteBox({ children, bg, border }: { children: React.ReactNode; bg: string; border: string }) {
  return <View style={{ marginTop: 16, backgroundColor: bg, padding: 10, borderRadius: 6, borderLeftWidth: 3, borderLeftColor: border }}>{children}</View>;
}

// ════════════════════════════════════════════════════════════════
// STORIES 1080×1920 (PNG para redes)
// ════════════════════════════════════════════════════════════════
const STORY_W = 1080;
const STORY_H = 1920;

function StoryShell({ cat, mode, children }: { cat: SalesCatalog; mode: 'minorista' | 'mayorista'; children: React.ReactNode }) {
  const co = cat.company;
  const contact = [co.phone, co.email, co.website].filter(Boolean).join(' · ');
  return (
    <View style={{ width: STORY_W, height: STORY_H, backgroundColor: NAVY_900 }}>
      <LinearGradient colors={[NAVY_900, '#1a2f5f', NAVY_900]} start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }} style={{ position: 'absolute', inset: 0 as any }} />
      <Svg width={STORY_W} height={STORY_H} style={{ position: 'absolute', top: 0, left: 0 }}>
        <Defs>
          <SvgRadial id="h1" cx="50%" cy="50%" r="50%"><Stop offset="0" stopColor="#38bdf8" stopOpacity={0.22} /><Stop offset="1" stopColor="#38bdf8" stopOpacity={0} /></SvgRadial>
        </Defs>
        <Circle cx={180} cy={180} r={420} fill="url(#h1)" />
      </Svg>
      <View style={{ alignItems: 'center', paddingTop: 80 }}>
        <Image source={GLOBE} style={{ width: 300, height: 300, tintColor: '#fff' }} resizeMode="contain" />
        <View style={{ width: STORY_W - 360, height: 1.5, backgroundColor: 'rgba(255,255,255,0.18)', marginTop: 40 }} />
        <AppText serif weight="700" style={{ fontSize: 60, color: '#fff', marginTop: 40 }}>
          {mode === 'minorista' ? 'PRECIOS MINORISTAS' : 'PRECIOS MAYORISTAS'}
        </AppText>
        <AppText style={{ fontSize: 26, color: 'rgba(255,255,255,0.7)', marginTop: 14 }}>
          {mode === 'minorista' ? 'Precio por 1 contenedor' : 'Escala 10/20/30 contenedores'} · {dateLabelFor(cat)}
        </AppText>
      </View>
      <View style={{ paddingHorizontal: 60, marginTop: 50 }}>{children}</View>
      {/* footer */}
      <View style={{ position: 'absolute', bottom: 55, left: 0, right: 0, alignItems: 'center', gap: 14 }}>
        <AppText weight="600" style={{ fontSize: 26, color: 'rgba(255,255,255,0.85)' }}>{co.legalName}</AppText>
        {contact ? <AppText style={{ fontSize: 20, color: 'rgba(255,255,255,0.5)' }}>{contact}</AppText> : null}
        <AppText style={{ fontSize: 16, color: 'rgba(255,255,255,0.4)', fontStyle: 'italic' }}>Documento informativo · No constituye oferta vinculante</AppText>
      </View>
    </View>
  );
}

function StoryCardLeft({ it, src }: { it: SalesCatalogItem; src: string | null }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 26, flex: 1, minWidth: 0 }}>
      <View style={{ width: 130, height: 130, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.12)', overflow: 'hidden', alignItems: 'center', justifyContent: 'center' }}>
        {src ? <Image source={{ uri: src }} style={{ width: 130, height: 130 }} resizeMode="cover" />
          : <AppText weight="700" style={{ fontSize: 64, color: '#fff' }}>{(it.name.charAt(0) || '?').toUpperCase()}</AppText>}
      </View>
      <View style={{ flex: 1, minWidth: 0 }}>
        <AppText weight="700" numberOfLines={2} style={{ fontSize: 32, color: '#fff' }}>{it.name}</AppText>
        <AppText weight="600" style={{ fontSize: 17, color: 'rgba(255,255,255,0.55)', letterSpacing: 0.6, marginTop: 6 }}>{(it.category || '').toUpperCase()}</AppText>
        <AppText style={{ fontSize: 16, color: 'rgba(255,255,255,0.45)', marginTop: 4 }}>{it.sku}</AppText>
        {it.innerQuantity ? <AppText weight="600" style={{ fontSize: 16, color: 'rgba(255,255,255,0.7)', marginTop: 6 }}>Mín: {it.innerQuantity.toLocaleString('en-US')} {it.unit}</AppText> : null}
      </View>
    </View>
  );
}

export function MinoristaStory({ cat, images }: { cat: SalesCatalog; images: ProductImages }) {
  const products = cat.items.slice(0, 4);
  return (
    <StoryShell cat={cat} mode="minorista">
      <View style={{ gap: 24 }}>
        {products.map((it) => (
          <View key={it.id} style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.08)', borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.15)', borderRadius: 24, padding: 28 }}>
            <StoryCardLeft it={it} src={images[it.id] ?? null} />
            <View style={{ alignItems: 'flex-end', paddingLeft: 20, borderLeftWidth: 1, borderLeftColor: 'rgba(255,255,255,0.12)' }}>
              <AppText weight="700" style={{ fontSize: 15, color: 'rgba(255,255,255,0.55)', letterSpacing: 0.5 }}>FOB</AppText>
              <AppText weight="600" style={{ fontSize: 30, color: 'rgba(255,255,255,0.88)' }}>${money2(it.basicUnitPrice)}</AppText>
              <View style={{ height: 1, width: 140, backgroundColor: 'rgba(255,255,255,0.12)', marginVertical: 10 }} />
              <AppText weight="700" style={{ fontSize: 15, color: 'rgba(255,255,255,0.7)', letterSpacing: 0.5 }}>CIF · USD/{it.unit}</AppText>
              <AppText weight="800" style={{ fontSize: 46, color: '#fff' }}>${money2(it.cifUnitPrice)}</AppText>
            </View>
          </View>
        ))}
        {cat.items.length > products.length ? (
          <AppText style={{ fontSize: 22, color: 'rgba(255,255,255,0.6)', fontStyle: 'italic', textAlign: 'center', marginTop: 6 }}>
            + {cat.items.length - products.length} productos más en el catálogo completo
          </AppText>
        ) : null}
      </View>
    </StoryShell>
  );
}

export function MayoristaStory({ cat, images }: { cat: SalesCatalog; images: ProductImages }) {
  const products = cat.items
    .map((it) => ({ ...it, containerScales: (it.containerScales || []).filter((s) => s.containers > 1) }))
    .filter((it) => it.containerScales.length > 0)
    .slice(0, 3);
  return (
    <StoryShell cat={cat} mode="mayorista">
      <View style={{ gap: 22 }}>
        {products.map((it) => (
          <View key={it.id}>
            <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.08)', borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.15)', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 26 }}>
              <StoryCardLeft it={it} src={images[it.id] ?? null} />
              <View style={{ alignItems: 'flex-end' }}>
                <AppText weight="700" style={{ fontSize: 14, color: 'rgba(255,255,255,0.55)' }}>DESDE</AppText>
                <AppText weight="700" style={{ fontSize: 30, color: 'rgba(255,255,255,0.85)' }}>${money2(it.cifUnitPrice)}</AppText>
                <AppText style={{ fontSize: 15, color: 'rgba(255,255,255,0.55)' }}>USD / {it.unit}</AppText>
              </View>
            </View>
            <View style={{ flexDirection: 'row', gap: 0, backgroundColor: 'rgba(255,255,255,0.06)', borderWidth: 1.5, borderTopWidth: 0, borderColor: 'rgba(255,255,255,0.15)', borderBottomLeftRadius: 24, borderBottomRightRadius: 24, paddingVertical: 18 }}>
              {it.containerScales.map((s) => (
                <View key={s.containers} style={{ flex: 1, alignItems: 'center' }}>
                  <AppText weight="800" style={{ fontSize: 22, color: 'rgba(255,255,255,0.85)' }}>{s.containers} CONTS.</AppText>
                  <AppText style={{ fontSize: 15, color: 'rgba(255,255,255,0.55)', marginTop: 3 }}>{s.totalLiters.toLocaleString('en-US')} {it.unit}</AppText>
                  <AppText weight="800" style={{ fontSize: 28, color: '#86efac', marginTop: 6 }}>${money0(s.totalCif)}</AppText>
                  <AppText weight="600" style={{ fontSize: 13, color: 'rgba(134,239,172,0.7)', marginTop: 2 }}>${money2(s.cifUnitPrice)} /{it.unit}</AppText>
                </View>
              ))}
            </View>
          </View>
        ))}
      </View>
    </StoryShell>
  );
}
