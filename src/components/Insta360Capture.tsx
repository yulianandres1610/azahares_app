// Inspección visual con cámara Insta360: emparejar (WiFi) → conectar → GRABAR un
// video 360 recorriendo el contenedor (empezar/parar) → subirlo. Se apoya en el
// módulo nativo `src/native/insta360.ts`. Si el módulo no está compilado en el
// build, muestra un aviso en vez de romper.
import React, { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Linking, Modal, View } from 'react-native';
import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake';
import * as FileSystem from 'expo-file-system/legacy';
import { alpha, colors, radius } from '../theme/tokens';
import { AppText, Button, Tap, haptic } from './ui';
import { GlobeSpinner } from './GlobeSpinner';
import { Icon } from './Icon';
import { deleteInspectionMedia, uploadInspectionMedia } from '../lib/api/inspections';
import type { InspectionMedia } from '../lib/api/types';
import {
  connectCamera,
  deleteFromCamera,
  disconnectCamera,
  getCameraName,
  getInsta360State,
  Insta360PlayerNative,
  isInsta360Available,
  onInsta360DownloadProgress,
  onInsta360StateChange,
  onInsta360StitchProgress,
  startRecording,
  stitchToMp4,
  stopRecording,
  type Insta360State,
} from '../native/insta360';
import { useApp } from '../store/AppContext';

type Phase = Insta360State | 'processing' | 'stitching' | 'uploading' | 'done';

// Barra de progreso moderna (track + fill animado con gradiente navy).
function ProgressBar({ value }: { value: number }) {
  const w = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(w, {
      toValue: Math.max(0, Math.min(1, value)),
      duration: 250,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
  }, [value, w]);
  return (
    <View style={{ height: 8, borderRadius: 4, backgroundColor: alpha(colors.navy500, 0.12), overflow: 'hidden' }}>
      <Animated.View
        style={{
          height: '100%',
          borderRadius: 4,
          backgroundColor: colors.navy500,
          width: w.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }),
        }}
      />
    </View>
  );
}

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
  ensureInspectionId,
  editable,
  onUploaded,
  existingPano,
  onComplete,
}: {
  inspectionId: string | null;
  /**
   * Garantiza que exista una inspección justo antes de subir y devuelve su id.
   * Cubre el caso en que la carga inicial falló (el iPhone estaba en el WiFi de
   * la cámara, sin internet) y `inspectionId` quedó en null: recarga (y crea si
   * de verdad falta) para no perder el video ya grabado.
   */
  ensureInspectionId?: () => Promise<string | null>;
  editable: boolean;
  onUploaded: () => void | Promise<void>;
  /** Video 360 ya subido en esta inspección (persistencia entre pestañas). */
  existingPano?: InspectionMedia | null;
  /** Completa la inspección visual (pasa al paso refuel). */
  onComplete?: () => void | Promise<void>;
}) {
  const { t, showToast } = useApp();
  const es = t.locale === 'es';
  const available = isInsta360Available();
  // La conexión vive a nivel nativo (global). Al montar reflejamos el estado
  // real: si ya estaba conectada (volviste a la pestaña), seguimos conectados.
  const [phase, setPhase] = useState<Phase>(() => {
    if (existingPano) return 'done'; // ya hay un video 360 subido → persistir
    return available ? (getInsta360State() as Phase) : 'disconnected';
  });
  const [progress, setProgress] = useState(0);
  const [cameraName, setCameraName] = useState<string | null>(available ? getCameraName() : null);
  const [connectError, setConnectError] = useState<string | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const [videoUri, setVideoUri] = useState<string | null>(null);
  const [media, setMedia] = useState<InspectionMedia | null>(existingPano ?? null);
  const [loadingVideo, setLoadingVideo] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const [deleteMsg, setDeleteMsg] = useState<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!available) return;
    const off = onInsta360StateChange((s) => {
      // El listener solo refleja la CONEXIÓN; durante un flujo activo
      // (grabar/procesar/subir/listo) manda el propio componente.
      setPhase((prev) => {
        const busy =
          prev === 'recording' ||
          prev === 'processing' ||
          prev === 'downloading' ||
          prev === 'uploading' ||
          prev === 'done';
        return busy ? prev : (s as Phase);
      });
      setCameraName(getCameraName());
    });
    const offProg = onInsta360DownloadProgress((p) => setProgress(p)); // 0-1
    const offStitch = onInsta360StitchProgress((p) => setProgress(p)); // 0-1
    return () => {
      off();
      offProg();
      offStitch();
      if (timerRef.current) clearInterval(timerRef.current);
      // NO desconectamos al desmontar: la conexión es PERSISTENTE hasta que el
      // usuario toque "Desconectar" (puede cambiar de pestaña sin perderla).
    };
  }, [available]);

  // Mantiene la pantalla encendida mientras la cámara está en uso, para que el
  // bloqueo automático no suspenda la app y corte la conexión (videos largos).
  useEffect(() => {
    const active = phase !== 'disconnected' && phase !== 'connecting';
    if (active) activateKeepAwakeAsync('insta360').catch(() => {});
    else deactivateKeepAwake('insta360').catch(() => {});
    return () => {
      deactivateKeepAwake('insta360').catch(() => {});
    };
  }, [phase]);

  // Persistencia: si la inspección ya tiene un video 360 subido, reflejamos el
  // estado "subido" (no volvemos a "grabar" al cambiar de pestaña).
  useEffect(() => {
    if (existingPano) {
      setMedia(existingPano);
      setPhase((prev) =>
        prev === 'recording' || prev === 'processing' || prev === 'uploading' ? prev : 'done',
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [existingPano?.id]);

  // Descarga el video ya subido (de Supabase) para verlo en el visor 360.
  const viewExisting = async () => {
    if (!media?.url || loadingVideo) return;
    setLoadingVideo(true);
    try {
      const dest = FileSystem.cacheDirectory + `pano360-${media.id}.mp4`;
      const info = await FileSystem.getInfoAsync(dest);
      if (!info.exists) await FileSystem.downloadAsync(media.url, dest);
      setVideoUri(dest);
    } catch (e: any) {
      showToast(e?.message || t('errorGeneric'), 'error');
    } finally {
      setLoadingVideo(false);
    }
  };

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
    // Feedback inmediato (sin delay): la UI pasa a "Procesando" al instante.
    // Detener SIEMPRE debe funcionar aunque falte inspección o cambie `editable`:
    // primero paramos la cámara y luego decidimos si podemos subir.
    setPhase('processing');
    setProgress(0);
    haptic('medium');
    try {
      const video = await stopRecording();
      setVideoUri(video.uri); // .insv → visor 360 esférico en la app (se conserva aunque falle la subida)
      // La inspección puede no estar cargada si al abrir el detalle el iPhone ya
      // estaba en el WiFi de la cámara (sin internet). Antes de subir, la
      // resolvemos (recargar/crear) para no perder el video ya grabado.
      let inspId = inspectionId;
      if (!inspId && ensureInspectionId) {
        setPhase('processing');
        try {
          inspId = await ensureInspectionId();
        } catch {
          inspId = null;
        }
      }
      if (!inspId) {
        setPhase('connected');
        showToast(
          es
            ? 'No hay una inspección activa para subir el video. Revisá tu conexión y volvé a intentar.'
            : 'No active inspection to upload the video. Check your connection and try again.',
          'error',
        );
        return;
      }
      // Une el .insv (doble ojo de pez) a un MP4 equirectangular estándar, que
      // se ve en la web y en cualquier player. El .insv se conserva para el
      // visor esférico de la app. Si el "unir" falla o tarda demasiado, NO
      // dejamos la inspección trabada: subimos el video crudo como .mp4 (en la
      // web podría no navegarse, pero el flujo se completa).
      setPhase('stitching');
      setProgress(0);
      let uploadUri = video.uri;
      try {
        // Carrera contra un timeout: si el stitch se cuelga, seguimos con el crudo.
        const eq = await Promise.race([
          stitchToMp4(video.uri),
          new Promise<never>((_, rej) => setTimeout(() => rej(new Error('STITCH_TIMEOUT')), 180000)),
        ]);
        uploadUri = eq.uri;
      } catch (stitchErr) {
        // Fallback: copiar el video a extensión .mp4 (Supabase valida el MIME por
        // la extensión). El visor esférico de la app usa el .insv original.
        try {
          const raw = video.uri.replace('file://', '');
          const dot = raw.lastIndexOf('.');
          const mp4Path = (dot > 0 ? raw.slice(0, dot) : raw) + '-raw.mp4';
          await FileSystem.copyAsync({ from: video.uri, to: 'file://' + mp4Path });
          uploadUri = 'file://' + mp4Path;
        } catch {
          uploadUri = video.uri;
        }
        showToast(
          es ? 'No se pudo unir el 360; se subió el video sin unir.' : 'Could not stitch 360; uploaded raw video.',
          'warn',
        );
      }
      setPhase('uploading');
      setProgress(0);
      // putSigned reporta 0-100 → normalizamos a 0-1.
      const saved = await uploadInspectionMedia(inspId, 'panorama_360', uploadUri, 'video/mp4', (pct) =>
        setProgress(pct / 100),
      );
      setMedia(saved);
      setPhase('done');
      haptic('success');
      // Libera memoria: borra el video de la SD de la cámara tras subir OK.
      // El resultado se muestra de forma persistente para diagnóstico.
      setDeleteMsg(es ? 'Borrando de la cámara…' : 'Deleting from camera…');
      if (video.remoteUri) {
        deleteFromCamera(video.remoteUri)
          .then(() => setDeleteMsg('✓ ' + (es ? 'Borrado de la cámara' : 'Deleted from camera')))
          .catch((e: any) =>
            setDeleteMsg('✗ ' + (es ? 'No se borró: ' : 'Not deleted: ') + (e?.message ?? '')),
          );
      } else {
        setDeleteMsg('✗ ' + (es ? 'remoteUri vacío (la cámara no devolvió la ruta)' : 'empty remoteUri'));
      }
      await onUploaded();
    } catch (e: any) {
      setPhase('connected');
      showToast(e?.message || t('errorGeneric'), 'error');
    }
  };

  // Desconecta explícitamente (la conexión es persistente hasta que se pida).
  const disconnect = async () => {
    await disconnectCamera().catch(() => {});
    setPhase('disconnected');
    setVideoUri(null);
    setMedia(null);
  };

  // Elimina el video subido y vuelve a grabar.
  const deleteAndRedo = async () => {
    if (deleting) return;
    setDeleting(true);
    try {
      if (media && inspectionId) {
        await deleteInspectionMedia(inspectionId, media.id);
        await onUploaded();
      }
      setMedia(null);
      setVideoUri(null);
      setProgress(0);
      setPhase('connected');
    } catch (e: any) {
      showToast(e?.message || t('errorGeneric'), 'error');
    } finally {
      setDeleting(false);
    }
  };

  const connected =
    phase === 'connected' ||
    phase === 'recording' ||
    phase === 'processing' ||
    phase === 'downloading' ||
    phase === 'uploading' ||
    phase === 'done';
  const connecting = phase === 'connecting';
  const busy = phase === 'processing' || phase === 'downloading' || phase === 'stitching' || phase === 'uploading';

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
        <View style={{ gap: 12 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Icon name="check" size={20} color={colors.success} />
            <AppText weight="600" style={{ color: colors.success, fontSize: 15 }}>
              {es ? 'Video 360 subido' : '360 video uploaded'}
            </AppText>
          </View>
          {deleteMsg && (
            <AppText style={{ fontSize: 11.5, color: deleteMsg.startsWith('✗') ? colors.error : colors.ink50 }}>
              {deleteMsg}
            </AppText>
          )}
          {/* Video ya subido (persistido) pero aún no descargado para el visor */}
          {!videoUri && media && (
            <Button variant="outline" icon="video" onPress={viewExisting} loading={loadingVideo} disabled={!media.url}>
              {es ? 'Ver video 360' : 'View 360 video'}
            </Button>
          )}

          {/* Visor 360 esférico navegable (arrastrar para mirar alrededor) */}
          {videoUri && Insta360PlayerNative && !fullscreen && (
            <View style={{ width: '100%', aspectRatio: 1, borderRadius: radius.lg, overflow: 'hidden', backgroundColor: '#000' }}>
              <Insta360PlayerNative source={videoUri} style={{ flex: 1 }} />
              {/* Botón pantalla completa (esquina, no interfiere con el arrastre) */}
              <Tap
                onPress={() => setFullscreen(true)}
                style={{ position: 'absolute', top: 10, right: 10, width: 38, height: 38, borderRadius: 12, backgroundColor: 'rgba(0,0,0,0.55)', alignItems: 'center', justifyContent: 'center' }}
              >
                <Icon name="scan" size={18} color="#fff" />
              </Tap>
            </View>
          )}
          <AppText style={{ fontSize: 12, color: colors.ink50, textAlign: 'center' }}>
            {es ? 'Arrastrá para mirar en 360°. Tocá ⤢ para pantalla completa. Podés eliminarlo y volver a grabar.' : 'Drag to look around in 360°. Tap ⤢ for full screen. You can delete it and record again.'}
          </AppText>

          {/* Pantalla completa */}
          <Modal visible={fullscreen} animationType="fade" supportedOrientations={['portrait', 'landscape']} onRequestClose={() => setFullscreen(false)}>
            <View style={{ flex: 1, backgroundColor: '#000' }}>
              {videoUri && Insta360PlayerNative && (
                <Insta360PlayerNative source={videoUri} style={{ flex: 1 }} />
              )}
              <Tap
                onPress={() => setFullscreen(false)}
                style={{ position: 'absolute', top: 54, right: 18, width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(0,0,0,0.6)', alignItems: 'center', justifyContent: 'center' }}
              >
                <Icon name="x" size={22} color="#fff" />
              </Tap>
            </View>
          </Modal>
          {editable && onComplete && (
            <Button icon="check" onPress={onComplete}>
              {es ? 'Completar inspección visual' : 'Complete visual inspection'}
            </Button>
          )}
          <Button variant="danger" icon="trash" onPress={deleteAndRedo} loading={deleting} disabled={!editable}>
            {es ? 'Eliminar y grabar de nuevo' : 'Delete and record again'}
          </Button>
        </View>
      ) : busy ? (
        <View style={{ alignItems: 'center', gap: 14, paddingVertical: 16, paddingHorizontal: 6 }}>
          <GlobeSpinner size={54} />
          <AppText weight="600" style={{ color: colors.ink, fontSize: 15 }}>
            {(
              {
                processing: es ? 'Procesando video 360…' : 'Processing 360 video…',
                downloading: es ? 'Descargando de la cámara…' : 'Downloading from camera…',
                stitching: es ? 'Uniendo el video 360…' : 'Stitching 360 video…',
                uploading: es ? 'Subiendo al sistema…' : 'Uploading…',
              } as Record<string, string>
            )[phase] ?? ''}
          </AppText>
          <View style={{ width: '100%', gap: 6 }}>
            <ProgressBar value={progress} />
            <AppText style={{ color: colors.ink50, fontSize: 12, textAlign: 'right' }}>
              {phase === 'processing' && progress === 0
                ? (es ? 'Preparando…' : 'Preparing…')
                : `${Math.round(Math.max(0, Math.min(1, progress)) * 100)}%`}
            </AppText>
          </View>
        </View>
      ) : phase === 'recording' ? (
        // Detener NUNCA se deshabilita: una grabación en curso debe poder pararse
        // y subirse siempre (no depende de `editable`).
        <Button variant="danger" icon="check" onPress={stopRec}>
          {es ? 'Detener y subir' : 'Stop and upload'}
        </Button>
      ) : (
        <Button icon="video" onPress={startRec} disabled={!editable}>
          {es ? 'Empezar a grabar' : 'Start recording'}
        </Button>
      )}

      {/* Desconectar (la conexión persiste hasta que se toque aquí) */}
      {phase !== 'recording' && !busy && (
        <Tap onPress={disconnect} style={{ alignSelf: 'center', paddingVertical: 8, paddingHorizontal: 16 }}>
          <AppText weight="600" style={{ color: colors.ink50, fontSize: 13.5 }}>
            {es ? 'Desconectar cámara' : 'Disconnect camera'}
          </AppText>
        </Tap>
      )}
    </View>
  );
}
