// Cámara a pantalla completa: foto / video / escaneo (expo-camera).
import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Image, Modal, View } from 'react-native';
import {
  CameraView,
  CameraType,
  useCameraPermissions,
  useMicrophonePermissions,
  BarcodeScanningResult,
} from 'expo-camera';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '../theme/tokens';
import { Icon } from './Icon';
import { AppText, Button, IconButton, Tap, haptic } from './ui';
import { useT } from '../store/AppContext';

export type CaptureMode = 'photo' | 'video' | 'scan';
export interface VideoResult {
  uri: string;
}

export function CameraCapture({
  mode = 'photo',
  title,
  hint,
  onCapture,
  onClose,
}: {
  mode?: CaptureMode;
  title: string;
  hint?: string;
  onCapture: (value: string) => void; // photo/video → uri · scan → rawValue
  onClose: () => void;
}) {
  const t = useT();
  const insets = useSafeAreaInsets();
  const ref = useRef<CameraView>(null);
  const [facing, setFacing] = useState<CameraType>('back');
  const [camPerm, requestCam] = useCameraPermissions();
  const [micPerm, requestMic] = useMicrophonePermissions();
  const [recording, setRecording] = useState(false);
  const [secs, setSecs] = useState(0);
  const [shot, setShot] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const scannedRef = useRef(false);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!camPerm?.granted) requestCam();
    if (mode === 'video' && !micPerm?.granted) requestMic();
    return () => {
      if (timer.current) clearInterval(timer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const takePhoto = async () => {
    if (busy) return;
    setBusy(true);
    haptic('medium');
    try {
      const pic = await ref.current?.takePictureAsync({ quality: 0.8 });
      if (pic?.uri) setShot(pic.uri);
    } catch {
    } finally {
      setBusy(false);
    }
  };

  const toggleVideo = async () => {
    if (!recording) {
      haptic('medium');
      setRecording(true);
      setSecs(0);
      timer.current = setInterval(() => setSecs((s) => s + 1), 1000);
      try {
        const rec = await ref.current?.recordAsync();
        if (rec?.uri) onCapture(rec.uri);
      } catch {}
    } else {
      haptic('success');
      if (timer.current) clearInterval(timer.current);
      setRecording(false);
      ref.current?.stopRecording();
    }
  };

  const onBarcode = (r: BarcodeScanningResult) => {
    if (scannedRef.current) return;
    scannedRef.current = true;
    haptic('success');
    setTimeout(() => onCapture(r.data), 220);
  };

  const mmss = (s: number) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;

  const needsPerm = !camPerm?.granted;

  return (
    <Modal visible animationType="fade" onRequestClose={onClose} statusBarTranslucent>
      <View style={{ flex: 1, backgroundColor: '#05070f' }}>
        {needsPerm ? (
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 30, gap: 16 }}>
            <Icon name="camera" size={48} color="rgba(255,255,255,0.7)" />
            <AppText style={{ color: '#fff', textAlign: 'center' }}>{t('camUnavailable')}</AppText>
            <Button full={false} variant="accent" onPress={() => requestCam()}>
              {t('confirm')}
            </Button>
            <Tap onPress={onClose}>
              <AppText style={{ color: 'rgba(255,255,255,0.6)' }}>{t('cancel')}</AppText>
            </Tap>
          </View>
        ) : shot ? (
          <Image source={{ uri: shot }} style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }} resizeMode="cover" />
        ) : (
          <CameraView
            ref={ref}
            style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
            facing={facing}
            mode={mode === 'video' ? 'video' : 'picture'}
            barcodeScannerSettings={mode === 'scan' ? { barcodeTypes: ['qr', 'code128', 'ean13', 'code39'] } : undefined}
            onBarcodeScanned={mode === 'scan' ? onBarcode : undefined}
          />
        )}

        {/* top bar */}
        <View
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            paddingTop: insets.top + 8,
            paddingHorizontal: 16,
            paddingBottom: 16,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <IconButton name="x" variant="glassDark" color="#fff" onPress={onClose} />
          <View style={{ alignItems: 'center' }}>
            <AppText weight="600" style={{ color: '#fff', fontSize: 15 }}>
              {title}
            </AppText>
            {hint ? <AppText style={{ color: 'rgba(255,255,255,0.8)', fontSize: 12 }}>{hint}</AppText> : null}
          </View>
          <IconButton name="flip" variant="glassDark" color="#fff" onPress={() => setFacing((f) => (f === 'back' ? 'front' : 'back'))} />
        </View>

        {/* scan guides */}
        {mode === 'scan' && !shot && (
          <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center' }}>
            <View style={{ width: 230, height: 230, borderRadius: 28, borderWidth: 2, borderColor: 'rgba(255,255,255,0.5)' }} />
          </View>
        )}
        {mode === 'photo' && !shot && (
          <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center' }}>
            <View style={{ width: '74%', aspectRatio: 4 / 3, borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.4)', borderRadius: 16, borderStyle: 'dashed' }} />
          </View>
        )}

        {/* bottom controls */}
        <View style={{ position: 'absolute', left: 0, right: 0, bottom: 0, paddingBottom: insets.bottom + 30, paddingTop: 22 }}>
          {recording && (
            <View style={{ alignItems: 'center', marginBottom: 16 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: 'rgba(244,63,94,0.9)', paddingHorizontal: 14, paddingVertical: 6, borderRadius: 999 }}>
                <View style={{ width: 9, height: 9, borderRadius: 999, backgroundColor: '#fff' }} />
                <AppText weight="600" style={{ color: '#fff', fontSize: 14 }}>
                  {mmss(secs)}
                </AppText>
              </View>
            </View>
          )}

          {mode === 'scan' ? (
            <AppText style={{ textAlign: 'center', color: 'rgba(255,255,255,0.9)', fontSize: 14, paddingHorizontal: 30 }}>
              {t('scanSub')}
            </AppText>
          ) : shot ? (
            <View style={{ flexDirection: 'row', gap: 12, paddingHorizontal: 20 }}>
              <Button variant="outline" icon="refresh" onPress={() => setShot(null)} style={{ flex: 1 }}>
                {t('retake')}
              </Button>
              <Button variant="success" icon="check" onPress={() => onCapture(shot)} style={{ flex: 1 }}>
                {t('done')}
              </Button>
            </View>
          ) : (
            <View style={{ alignItems: 'center' }}>
              <Tap onPress={mode === 'video' ? toggleVideo : takePhoto} hapticKind={null} scaleTo={0.92}>
                <View style={{ width: 78, height: 78, borderRadius: 999, borderWidth: 5, borderColor: 'rgba(255,255,255,0.9)', alignItems: 'center', justifyContent: 'center' }}>
                  {busy ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <View
                      style={{
                        width: recording ? 30 : 60,
                        height: recording ? 30 : 60,
                        borderRadius: recording ? 9 : 999,
                        backgroundColor: mode === 'video' ? colors.error : '#fff',
                      }}
                    />
                  )}
                </View>
              </Tap>
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
}
