// Etiqueta térmica 4×2 horizontal (alto contraste) con QR real + barcode.
import React, { useMemo } from 'react';
import { View } from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import Svg, { Rect } from 'react-native-svg';
import { fonts } from '../theme/tokens';
import { AppText } from './ui';
import { PUBLIC_WEB_URL } from '../config';
import type { InspectionLabelData } from '../lib/api/types';
import type { T } from '../i18n';

function hash(str: string) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}
function rng(seed: number) {
  let x = seed || 123456789;
  return () => {
    x ^= x << 13;
    x ^= x >>> 17;
    x ^= x << 5;
    return ((x >>> 0) % 1000) / 1000;
  };
}

export function Barcode({ value, height = 30, fg = '#0a0a0a' }: { value: string; height?: number; fg?: string }) {
  const segs = useMemo(() => {
    const r = rng(hash(value || 'x'));
    const arr: { w: number; black: boolean }[] = [];
    let black = true;
    for (let i = 0; i < 42; i++) {
      arr.push({ w: 1 + Math.floor(r() * 3), black });
      black = !black;
    }
    arr[0].black = true;
    arr[arr.length - 1].black = true;
    return arr;
  }, [value]);
  const total = segs.reduce((a, s) => a + s.w, 0);
  const W = 200;
  let x = 0;
  return (
    <Svg width="100%" height={height} viewBox={`0 0 ${W} ${height}`} preserveAspectRatio="none">
      {segs.map((s, i) => {
        const w = (s.w / total) * W;
        const rect = s.black ? <Rect key={i} x={x} y={0} width={w} height={height} fill={fg} /> : null;
        x += w;
        return rect;
      })}
    </Svg>
  );
}

export function ThermalLabel({ data, t }: { data: InspectionLabelData; t: T }) {
  const qrUrl = `${PUBLIC_WEB_URL}/inspeccion/${data.publicToken ?? ''}`;
  const row = (k: string, v: string | null) => (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 8, marginBottom: 2.5 }}>
      <AppText style={{ color: '#444', fontSize: 9.5, letterSpacing: 0.3, fontFamily: fonts.sans }}>{k.toUpperCase()}</AppText>
      <AppText weight="700" style={{ color: '#000', fontSize: 9.5, textAlign: 'right', flexShrink: 1 }}>
        {v || '—'}
      </AppText>
    </View>
  );

  return (
    <View
      style={{
        width: '100%',
        minHeight: 168,
        backgroundColor: '#fff',
        borderRadius: 10,
        padding: 14,
        flexDirection: 'row',
        gap: 12,
        borderWidth: 1,
        borderColor: '#e5e5e5',
      }}
    >
      {/* left */}
      <View style={{ flex: 1, minWidth: 0 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderBottomWidth: 2, borderBottomColor: '#000', paddingBottom: 5, marginBottom: 6 }}>
          <AppText weight="800" style={{ fontSize: 12, color: '#000' }}>
            AZAHARES
          </AppText>
          <AppText weight="700" style={{ fontSize: 8.5, letterSpacing: 1, color: '#000' }}>
            INSPECTION
          </AppText>
        </View>
        <AppText weight="800" style={{ fontSize: 14, color: '#000' }}>
          {data.inspectionNumber}
        </AppText>
        <AppText weight="700" style={{ fontSize: 10, color: '#000', marginBottom: 7 }}>
          {data.containerNumber} · {t('cycle')} {data.cycle}
        </AppText>
        <View style={{ flex: 1 }}>
          {row(t('product'), data.productType)}
          {row(t('sealTop'), data.sealTop ?? data.sealNumber)}
          {row(t('sealBottom'), data.sealBottom)}
          {row(t('fuelLevel'), data.fuelLevel)}
          {row(t('inspector'), data.inspectorName)}
        </View>
        <View style={{ borderTopWidth: 1, borderTopColor: '#999', borderStyle: 'dashed', paddingTop: 5, marginTop: 4 }}>
          <Barcode value={data.barcodeValue || data.inspectionNumber + data.containerNumber} height={30} />
          <AppText style={{ fontSize: 8, letterSpacing: 2, textAlign: 'center', marginTop: 3, color: '#222' }}>
            {(data.barcodeValue || data.inspectionNumber).replace(/-/g, '')}
          </AppText>
        </View>
      </View>
      {/* right QR */}
      <View style={{ width: 96, alignItems: 'center', justifyContent: 'center', borderLeftWidth: 1, borderLeftColor: '#999', borderStyle: 'dashed', paddingLeft: 10 }}>
        {data.publicToken ? <QRCode value={qrUrl} size={86} backgroundColor="#fff" color="#0a0a0a" /> : null}
        <AppText style={{ fontSize: 7, color: '#444', marginTop: 5, textAlign: 'center' }}>
          azaharesfuel.com/{'\n'}inspeccion/{(data.publicToken || '').slice(0, 6)}
        </AppText>
      </View>
    </View>
  );
}
