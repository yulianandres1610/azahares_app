// Flujo de inspección visual con cámara Insta360: emparejar (WiFi) → conectar →
// tomar UNA foto 360 → subirla como media de la inspección. Se apoya en el
// módulo nativo `src/native/insta360.ts` (SDK de Insta360). Si el módulo nativo
// no está compilado en el build, muestra un aviso en vez de romper.
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Linking, View } from 'react-native';
import { alpha, colors, radius } from '../theme/tokens';
import { AppText, Button, Tap, haptic } from './ui';
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

// Abre los ajustes de WiFi de iOS (con fallback a los ajustes de la app).
async function openWifiSettings() {
  try {
    await Linking.openURL('App-Prefs:root=WIFI');
  } catch {
    try {
      await Linking.openSettings();
    } catch {
      /* noop */
    }
  }
}

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
  const [connectError, setConnectError] = useState<string | null>(null);

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
    setConnectError(null);
    try {
      setPhase('connecting');
      await connectCamera();
      // connect() resuelve cuando la cámara quedó Connected. Avanzamos la UI
      // aquí (sin depender solo del evento stateChange).
      setPhase('connected');
      setCameraName(getCameraName());
      haptic('success');
    } catch (e: any) {
      setPhase('disconnected');
      // Timeout / no encontrada → casi siempre es que el iPhone no está en el
      // WiFi de la cámara. Mostramos la guía de emparejamiento, no un toast seco.
      const code = e?.message || '';
      if (code === 'TIMEOUT' || code === 'CONNECT_FAILED' || code === 'NOT_CONNECTED') {
        setConnectError(
          es
            ? 'No encontramos la cámara. Verificá que esté encendida y que tu iPhone esté unido a su red WiFi.'
            : "Camera not found. Make sure it's on and your iPhone is joined to its WiFi network.",
        );
      } else if (code !== 'BIO_CANCELLED') {
        showToast(code || t('errorGeneric'), 'error');
      }
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
      await uploadInspectionMedia(inspectionId, 'panorama_360', photo.uri, 'image/jpeg', (pct) =>
        setProgress(pct),
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
  const connecting = phase === 'connecting';

  // ── No conectada: flujo de emparejamiento guiado ────────────
  if (!connected) {
    return (
      <View style={{ gap: 14 }}>
        <View style={{ backgroundColor: colors.surface, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.line, padding: 18, gap: 14 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <Icon name="scan" size={20} color={colors.navy500} />
            <AppText weight="700" style={{ fontSize: 15, color: colors.ink }}>
              {es ? 'Emparejar cámara Insta360' : 'Pair Insta360 camera'}
            </AppText>
          </View>

          {/* Pasos */}
          {[
            es ? 'Encendé la cámara y activá su WiFi.' : 'Turn on the camera and enable its WiFi.',
            es ? 'Unite a la red WiFi de la cámara (empieza por “Insta360…”).' : 'Join the camera’s WiFi network (starts with “Insta360…”).',
            es ? 'Volvé y tocá “Conectar cámara”.' : 'Come back and tap “Connect camera”.',
          ].map((step, i) => (
            <View key={i} style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 10 }}>
              <View style={{ width: 22, height: 22, borderRadius: 11, backgroundColor: alpha(colors.navy500, 0.12), alignItems: 'center', justifyContent: 'center' }}>
                <AppText weight="700" style={{ fontSize: 12, color: colors.navy500 }}>{i + 1}</AppText>
              </View>
              <AppText style={{ flex: 1, fontSize: 13.5, color: colors.ink70, lineHeight: 19 }}>{step}</AppText>
            </View>
          ))}

          {connectError && (
            <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 9, backgroundColor: alpha(colors.amber, 0.12), borderRadius: 12, padding: 12 }}>
              <Icon name="alert" size={17} color={colors.amber} />
              <AppText style={{ flex: 1, fontSize: 12.5, color: colors.ink70, lineHeight: 18 }}>{connectError}</AppText>
            </View>
          )}
        </View>

        <Button variant="outline" icon="settings" onPress={openWifiSettings} disabled={connecting}>
          {es ? 'Abrir ajustes de WiFi' : 'Open WiFi settings'}
        </Button>
        <Button icon="scan" onPress={connect} loading={connecting} disabled={!editable}>
          {connecting
            ? es ? 'Conectando…' : 'Connecting…'
            : es ? 'Conectar cámara' : 'Connect camera'}
        </Button>
      </View>
    );
  }

  // ── Conectada: capturar / subir ─────────────────────────────
  return (
    <View style={{ gap: 16 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: alpha(colors.success, 0.10), borderRadius: radius.lg, borderWidth: 1, borderColor: alpha(colors.success, 0.3), padding: 16 }}>
        <View style={{ width: 42, height: 42, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: alpha(colors.success, 0.16) }}>
          <Icon name="check" size={20} color={colors.success} />
        </View>
        <View style={{ flex: 1 }}>
          <AppText weight="600" style={{ fontSize: 14.5, color: colors.ink }}>
            {cameraName || (es ? 'Cámara conectada' : 'Camera connected')}
          </AppText>
          <AppText style={{ fontSize: 12, color: colors.ink50, marginTop: 2 }}>
            {es ? 'Lista para tomar la foto 360' : 'Ready to take the 360 photo'}
          </AppText>
        </View>
      </View>

      {phase === 'done' ? (
        <View style={{ alignItems: 'center', gap: 10, paddingVertical: 12 }}>
          <Icon name="check" size={30} color={colors.success} />
          <AppText weight="600" style={{ color: colors.success, fontSize: 15 }}>
            {es ? 'Toma 360 subida' : '360 shot uploaded'}
          </AppText>
          <Button variant="outline" icon="scan" onPress={() => setPhase('connected')} style={{ marginTop: 4 }}>
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
        <Button icon="scan" onPress={shoot} loading={phase === 'capturing'} disabled={!editable}>
          {phase === 'capturing'
            ? es ? 'Capturando 360…' : 'Capturing 360…'
            : es ? 'Tomar foto 360' : 'Take 360 photo'}
        </Button>
      )}
    </View>
  );
}
