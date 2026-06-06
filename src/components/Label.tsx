// Etiqueta térmica 4×2 horizontal (alto contraste) con QR real + barcode.
import React from 'react';
import { Dimensions, View } from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import RNBarcode from 'react-native-barcode-svg';
import { fonts } from '../theme/tokens';
import { AppText } from './ui';
import { PUBLIC_WEB_URL } from '../config';
import type { InspectionLabelData } from '../lib/api/types';
import type { T } from '../i18n';

// Code128 real (escaneable) — react-native-barcode-svg sobre react-native-svg.
export function Barcode({ value, height = 30, fg = '#0a0a0a' }: { value: string; height?: number; fg?: string }) {
  // Ancho disponible en la columna izquierda de la etiqueta térmica (aprox.).
  const maxWidth = Math.max(150, Math.round(Dimensions.get('window').width - 168));
  const code = (value || '0').toString().slice(0, 48);
  return (
    <RNBarcode
      value={code}
      format="CODE128"
      maxWidth={maxWidth}
      height={height}
      singleBarWidth={1.4}
      lineColor={fg}
      backgroundColor="transparent"
    />
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
