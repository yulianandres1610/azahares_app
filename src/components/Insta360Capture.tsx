// Flujo de inspección visual con cámara Insta360: conectar → tomar UNA foto
// 360 del contenedor → subirla como media de la inspección. Se apoya en el
// módulo nativo `src/native/insta360.ts` (SDK de Insta360). Si el módulo nativo
// no está compilado en el build, muestra un aviso en vez de romper.
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { alpha, colors, radius } from '../theme/tokens';
import { AppText, Button, haptic } from './ui';
import { Icon } from './Icon';
import { uploadInspectionMedia } from '../lib/api/inspections';
import {
  capture360,
  connectCamera,
  disconnectCamera,
  getCameraName,
  isInsta360Available,
  onInsta360StateChange,
  type Insta360State,
} from '../native/insta360';
import { useApp } from '../store/AppContext';

type Phase = Insta360State | 'uploading' | 'done';

export function Insta360Capture({
  inspectionId,
  editable,
  onUploaded,
}: {
  inspectionId: string | null;
  editable: boolean;
  onUploaded: () => void | Promise<void>;
}) {
  const { t, showToast } = useApp();
  const es = t.locale === 'es';
  const available = isInsta360Available();
  const [phase, setPhase] = useState<Phase>('disconnected');
  const [progress, setProgress] = useState(0);
  const [cameraName, setCameraName] = useState<string | null>(null);

  useEffect(() => {
    if (!available) return;
    const off = onInsta360StateChange((s) => {
      setPhase((prev) => (prev === 'uploading' || prev === 'done' ? prev : s));
      setCameraName(getCameraName());
    });
    return () => {
      off();
      disconnectCamera().catch(() => {});
    };
  }, [available]);

  // ── SDK no integrado en este build ──────────────────────────
  if (!available) {
    return (
      <View style={{ alignItems: 'center', gap: 14, paddingVertical: 26, paddingHorizontal: 20, backgroundColor: colors.surface, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.line }}>
        <Icon name="alert" size={28} color={colors.amber} />
        <AppText weight="600" style={{ fontSize: 15, color: colors.ink, textAlign: 'center' }}>
          {es ? 'Cámara Insta360 no disponible' : 'Insta360 camera unavailable'}
        </AppText>
        <AppText style={{ fontSize: 13, color: colors.ink60, textAlign: 'center', lineHeight: 19 }}>
          {es
            ? 'El SDK de Insta360 aún no está integrado en esta versión de la app. Usá la cámara del móvil por ahora.'
            : 'The Insta360 SDK is not yet integrated in this build. Use the phone camera for now.'}
        </AppText>
      </View>
    );
  }

  const connect = async () => {
    try {
      setPhase('connecting');
      await connectCamera();
      haptic('success');
    } catch (e: any) {
      setPhase('disconnected');
      showToast(e?.message || t('errorGeneric'), 'error');
    }
  };

  const shoot = async () => {
    if (!inspectionId) return;
    try {
      setPhase('capturing');
      haptic('medium');
      const photo = await capture360();
      setPhase('uploading');
      setProgress(0);
      await uploadInspectionMedia(
        inspectionId,
        'panorama_360',
        photo.uri,
        'image/jpeg',
        (pct) => setProgress(pct),
      );
      setPhase('done');
      haptic('success');
      await onUploaded();
    } catch (e: any) {
      setPhase('connected');
      showToast(e?.message || t('errorGeneric'), 'error');
    }
  };

  const connected = phase === 'connected' || phase === 'capturing' || phase === 'uploading' || phase === 'done';

  return (
    <View style={{ gap: 16 }}>
      {/* Estado de conexión */}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: colors.surface, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.line, padding: 16 }}>
        <View style={{ width: 42, height: 42, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: connected ? alpha(colors.success, 0.12) : colors.line }}>
          <Icon name={connected ? 'check' : 'camera'} size={20} color={connected ? colors.success : colors.ink40} />
        </View>
        <View style={{ flex: 1 }}>
          <AppText weight="600" style={{ fontSize: 14.5, color: colors.ink }}>
            {connected
              ? cameraName || (es ? 'Cámara conectada' : 'Camera connected')
              : phase === 'connecting'
                ? es ? 'Conectando…' : 'Connecting…'
                : es ? 'Cámara desconectada' : 'Camera disconnected'}
          </AppText>
          <AppText style={{ fontSize: 12, color: colors.ink50, marginTop: 2 }}>
            {es ? 'Conectá al WiFi de la cámara Insta360' : 'Connect to the Insta360 camera WiFi'}
          </AppText>
        </View>
      </View>

      {!connected ? (
        <Button icon="camera" onPress={connect} loading={phase === 'connecting'} disabled={!editable}>
          {es ? 'Conectar cámara' : 'Connect camera'}
        </Button>
      ) : phase === 'done' ? (
        <View style={{ alignItems: 'center', gap: 10, paddingVertical: 12 }}>
          <Icon name="check" size={30} color={colors.success} />
          <AppText weight="600" style={{ color: colors.success, fontSize: 15 }}>
            {es ? 'Toma 360 subida' : '360 shot uploaded'}
          </AppText>
          <Button variant="outline" icon="camera" onPress={() => setPhase('connected')} style={{ marginTop: 4 }}>
            {es ? 'Tomar otra' : 'Take another'}
          </Button>
        </View>
      ) : phase === 'uploading' ? (
        <View style={{ alignItems: 'center', gap: 10, paddingVertical: 12 }}>
          <ActivityIndicator color={colors.navy500} />
          <AppText style={{ color: colors.ink60, fontSize: 13 }}>
            {(es ? 'Subiendo… ' : 'Uploading… ') + Math.round(progress * 100) + '%'}
          </AppText>
        </View>
      ) : (
        <Button icon="camera" onPress={shoot} loading={phase === 'capturing'} disabled={!editable}>
          {phase === 'capturing'
            ? es ? 'Capturando 360…' : 'Capturing 360…'
            : es ? 'Tomar foto 360' : 'Take 360 photo'}
        </Button>
      )}
    </View>
  );
}
