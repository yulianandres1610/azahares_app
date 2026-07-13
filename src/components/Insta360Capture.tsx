// Inspección visual con cámara Insta360: emparejar (WiFi) → conectar → GRABAR un
// video 360 recorriendo el contenedor (empezar/parar) → subirlo. Se apoya en el
// módulo nativo `src/native/insta360.ts`. Si el módulo no está compilado en el
// build, muestra un aviso en vez de romper.
import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Linking, View } from 'react-native';
import { alpha, colors, radius } from '../theme/tokens';
import { AppText, Button, Tap, haptic } from './ui';
import { Icon } from './Icon';
import { uploadInspectionMedia } from '../lib/api/inspections';
import {
  connectCamera,
  disconnectCamera,
  getCameraName,
  isInsta360Available,
  onInsta360DownloadProgress,
  onInsta360StateChange,
  startRecording,
  stopRecording,
  type Insta360State,
} from '../native/insta360';
import { useApp } from '../store/AppContext';

type Phase = Insta360State | 'uploading' | 'done';

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

function fmtTime(s: number): string {
  const m = Math.floor(s / 60);
  const ss = s % 60;
  return `${m}:${ss.toString().padStart(2, '0')}`;
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
  const [elapsed, setElapsed] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!available) return;
    const off = onInsta360StateChange((s) => {
      setPhase((prev) =>
        prev === 'recording' || prev === 'uploading' || prev === 'done' ? prev : (s as Phase),
      );
      setCameraName(getCameraName());
    });
    const offProg = onInsta360DownloadProgress((p) => setProgress(p));
    return () => {
      off();
      offProg();
      if (timerRef.current) clearInterval(timerRef.current);
      disconnectCamera().catch(() => {});
    };
  }, [available]);

  // Cronómetro de grabación.
  useEffect(() => {
    if (phase === 'recording') {
      setElapsed(0);
      timerRef.current = setInterval(() => setElapsed((e) => e + 1), 1000);
    } else if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    return () => {
      if (timerRef.current && phase !== 'recording') clearInterval(timerRef.current);
    };
  }, [phase]);

  if (!available) {
    return (
      <View style={{ alignItems: 'center', gap: 14, paddingVertical: 26, paddingHorizontal: 20, backgroundColor: colors.surface, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.line }}>
        <Icon name="alert" size={28} color={colors.amber} />
        <AppText weight="600" style={{ fontSize: 15, color: colors.ink, textAlign: 'center' }}>
          {es ? 'Cámara Insta360 no disponible' : 'Insta360 camera unavailable'}
        </AppText>
        <AppText style={{ fontSize: 13, color: colors.ink60, textAlign: 'center', lineHeight: 19 }}>
          {es
            ? 'El SDK de Insta360 no está integrado en esta versión. Usá la cámara del móvil por ahora.'
            : 'The Insta360 SDK is not integrated in this build. Use the phone camera for now.'}
        </AppText>
      </View>
    );
  }

  const connect = async () => {
    setConnectError(null);
    try {
      setPhase('connecting');
      await connectCamera();
      setPhase('connected');
      setCameraName(getCameraName());
      haptic('success');
    } catch (e: any) {
      setPhase('disconnected');
      const code = e?.message || '';
      if (code === 'TIMEOUT' || code === 'CONNECT_FAILED' || code === 'NOT_CONNECTED') {
        setConnectError(
          es
            ? 'No encontramos la cámara. Verificá que esté encendida y que tu iPhone esté unido a su red WiFi.'
            : "Camera not found. Make sure it's on and your iPhone is joined to its WiFi network.",
        );
      } else {
        showToast(code || t('errorGeneric'), 'error');
      }
    }
  };

  const startRec = async () => {
    try {
      await startRecording();
      setPhase('recording');
      haptic('medium');
    } catch (e: any) {
      showToast(e?.message || t('errorGeneric'), 'error');
    }
  };

  const stopRec = async () => {
    if (!inspectionId) return;
    try {
      haptic('medium');
      const video = await stopRecording(); // pasa a 'downloading' vía evento
      setPhase('uploading');
      setProgress(0);
      const ext = video.ext || 'mp4';
      const mime = ext === 'mp4' ? 'video/mp4' : 'application/octet-stream';
      await uploadInspectionMedia(inspectionId, 'panorama_360', video.uri, mime, (pct) =>
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

  const connected =
    phase === 'connected' || phase === 'recording' || phase === 'downloading' || phase === 'uploading' || phase === 'done';
  const connecting = phase === 'connecting';

  // ── No conectada: emparejamiento guiado ─────────────────────
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
          {[
            es ? 'Encendé la cámara y activá su WiFi.' : 'Turn on the camera and enable its WiFi.',
            es ? 'Unite a la red WiFi de la cámara (empieza por “Insta360…”).' : 'Join the camera’s WiFi (starts with “Insta360…”).',
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
          {connecting ? (es ? 'Conectando…' : 'Connecting…') : es ? 'Conectar cámara' : 'Connect camera'}
        </Button>
      </View>
    );
  }

  // ── Conectada: grabar / parar / subir ───────────────────────
  return (
    <View style={{ gap: 16 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: alpha(colors.success, 0.1), borderRadius: radius.lg, borderWidth: 1, borderColor: alpha(colors.success, 0.3), padding: 16 }}>
        <View style={{ width: 42, height: 42, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: alpha(colors.success, 0.16) }}>
          <Icon name="check" size={20} color={colors.success} />
        </View>
        <View style={{ flex: 1 }}>
          <AppText weight="600" style={{ fontSize: 14.5, color: colors.ink }}>
            {cameraName || (es ? 'Cámara conectada' : 'Camera connected')}
          </AppText>
          <AppText style={{ fontSize: 12, color: colors.ink50, marginTop: 2 }}>
            {es ? 'Grabá un video 360 recorriendo el contenedor' : 'Record a 360 video around the container'}
          </AppText>
        </View>
      </View>

      {phase === 'recording' && (
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, backgroundColor: alpha(colors.error, 0.1), borderRadius: radius.lg, padding: 14 }}>
          <View style={{ width: 12, height: 12, borderRadius: 6, backgroundColor: colors.error }} />
          <AppText weight="700" style={{ fontSize: 16, color: colors.error }}>
            {(es ? 'Grabando  ' : 'Recording  ') + fmtTime(elapsed)}
          </AppText>
        </View>
      )}

      {phase === 'done' ? (
        <View style={{ alignItems: 'center', gap: 10, paddingVertical: 12 }}>
          <Icon name="check" size={30} color={colors.success} />
          <AppText weight="600" style={{ color: colors.success, fontSize: 15 }}>
            {es ? 'Video 360 subido' : '360 video uploaded'}
          </AppText>
          <Button variant="outline" icon="video" onPress={() => setPhase('connected')} style={{ marginTop: 4 }}>
            {es ? 'Grabar otro' : 'Record another'}
          </Button>
        </View>
      ) : phase === 'downloading' || phase === 'uploading' ? (
        <View style={{ alignItems: 'center', gap: 10, paddingVertical: 12 }}>
          <ActivityIndicator color={colors.navy500} />
          <AppText style={{ color: colors.ink60, fontSize: 13 }}>
            {(phase === 'downloading'
              ? es ? 'Descargando video… ' : 'Downloading video… '
              : es ? 'Subiendo… ' : 'Uploading… ') + Math.round(progress * 100) + '%'}
          </AppText>
        </View>
      ) : phase === 'recording' ? (
        <Button variant="danger" icon="check" onPress={stopRec} disabled={!editable}>
          {es ? 'Detener y subir' : 'Stop and upload'}
        </Button>
      ) : (
        <Button icon="video" onPress={startRec} disabled={!editable}>
          {es ? 'Empezar a grabar' : 'Start recording'}
        </Button>
      )}
    </View>
  );
}
