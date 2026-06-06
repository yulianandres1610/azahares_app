// GPS por contenedor: mapa estilizado, card de ubicación (todos los estados),
// hoja de activación y hoja de historial de recorrido. Portado de gps.jsx.
import React, { useState } from 'react';
import { ActivityIndicator, Animated, Linking, Pressable, View } from 'react-native';
import Svg, { Circle, Line, Path, Polyline, Rect, Defs, LinearGradient as SvgGradient, Stop } from 'react-native-svg';
import { alpha, colors, radius, shadows } from '../theme/tokens';
import { Icon } from './Icon';
import { AppText, Button, Card, Field, Sheet, Tap, haptic } from './ui';
import { statusMeta, TYPES } from '../domain';
import type { ContainerGps, GpsFix, GpsSync } from '../lib/api/types';
import type { T } from '../i18n';

// ── Mapa estilizado tipo "Mapbox light + navy" (decorativo) ──────
export function MapCanvas({
  track = [],
  fix,
  status = 'available',
  type = 'fuel',
  height = 190,
  showRoute = false,
}: {
  track?: GpsFix[];
  fix?: GpsFix | null;
  status?: string;
  type?: string;
  height?: number;
  showRoute?: boolean;
}) {
  const meta = statusMeta(status);
  const tIcon = (TYPES[type] ?? TYPES.fuel).icon;
  const W = 700;
  const H = Math.round((height / 360) * 700);
  const vlines = [0.14, 0.3, 0.46, 0.62, 0.78, 0.92];
  const hlines = [0.16, 0.34, 0.52, 0.7, 0.86];
  const px = (x: number) => x * W;
  const py = (y: number) => y * H;
  const routePts = showRoute ? track : [];
  const poly = routePts.map((p) => `${px(p.x)},${py(p.y)}`).join(' ');

  return (
    <View style={{ width: '100%', height, borderRadius: radius.lg, overflow: 'hidden', backgroundColor: '#e9eef6' }}>
      <Svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMid slice" width="100%" height="100%">
        <Defs>
          <SvgGradient id="azmapbg" x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor="#eef2f8" />
            <Stop offset="1" stopColor="#e2e8f2" />
          </SvgGradient>
        </Defs>
        <Rect width={W} height={H} fill="url(#azmapbg)" />
        {/* parques / manzanas */}
        <Rect x={px(0.02)} y={py(0.04)} width={px(0.26)} height={py(0.24)} rx={10} fill="#dbe6dd" />
        <Rect x={px(0.66)} y={py(0.58)} width={px(0.3)} height={py(0.36)} rx={10} fill="#dbe6dd" />
        <Rect x={px(0.5)} y={py(0.06)} width={px(0.46)} height={py(0.16)} rx={8} fill="#e6ebf3" />
        {/* agua */}
        <Path d={`M0 ${py(0.9)} Q ${px(0.3)} ${py(0.82)} ${px(0.6)} ${py(0.92)} T ${W} ${py(0.88)} V ${H} H 0 Z`} fill="#cfe0f0" />
        {/* calles */}
        {vlines.map((x, i) => (
          <Line key={'v' + i} x1={px(x)} y1={0} x2={px(x)} y2={H} stroke="#ffffff" strokeWidth={7} strokeLinecap="round" />
        ))}
        {hlines.map((y, i) => (
          <Line key={'h' + i} x1={0} y1={py(y)} x2={W} y2={py(y)} stroke="#ffffff" strokeWidth={7} strokeLinecap="round" />
        ))}
        {vlines.map((x, i) => (
          <Line key={'vo' + i} x1={px(x)} y1={0} x2={px(x)} y2={H} stroke="#d4ddea" strokeWidth={1.5} />
        ))}
        {hlines.map((y, i) => (
          <Line key={'ho' + i} x1={0} y1={py(y)} x2={W} y2={py(y)} stroke="#d4ddea" strokeWidth={1.5} />
        ))}
        {/* avenidas */}
        <Line x1={px(0.46)} y1={0} x2={px(0.46)} y2={H} stroke="#c2cfe4" strokeWidth={11} strokeLinecap="round" />
        <Line x1={0} y1={py(0.52)} x2={W} y2={py(0.52)} stroke="#c2cfe4" strokeWidth={11} strokeLinecap="round" />
        {/* recorrido */}
        {showRoute && routePts.length > 1 && (
          <>
            <Polyline points={poly} fill="none" stroke={colors.navy700} strokeWidth={6} strokeLinejoin="round" strokeLinecap="round" opacity={0.92} />
            <Polyline points={poly} fill="none" stroke={colors.accent} strokeWidth={2.5} strokeDasharray="2 7" strokeLinecap="round" />
            {routePts.slice(0, -1).map((p, i) => (
              <Circle key={i} cx={px(p.x)} cy={py(p.y)} r={5} fill="#fff" stroke={colors.navy700} strokeWidth={2.5} />
            ))}
          </>
        )}
      </Svg>

      {/* pin único de ESTE contenedor */}
      {fix && (
        <View style={{ position: 'absolute', left: `${fix.x * 100}%`, top: `${fix.y * 100}%`, transform: [{ translateX: -20 }, { translateY: -48 }] }}>
          <View style={{ position: 'absolute', left: 20, bottom: -6, width: 54, height: 54, borderRadius: 999, marginLeft: -27, marginBottom: -27, backgroundColor: alpha(meta.color, 0.22) }} />
          <Pin color={meta.color} icon={tIcon} moving={fix.speed > 0} />
        </View>
      )}
    </View>
  );
}

function Pin({ color, icon, moving }: { color: string; icon: any; moving: boolean }) {
  return (
    <View style={{ ...shadows.sm }}>
      <Svg width={40} height={48} viewBox="0 0 40 48">
        <Path d="M20 47C20 47 36 28 36 17A16 16 0 1 0 4 17C4 28 20 47 20 47Z" fill={color} />
        <Circle cx={20} cy={17} r={12} fill="#fff" />
      </Svg>
      <View style={{ position: 'absolute', top: 6, left: 0, right: 0, alignItems: 'center' }}>
        <Icon name={icon} size={18} color={color} />
      </View>
      {moving && (
        <View style={{ position: 'absolute', top: -4, right: -6, width: 18, height: 18, borderRadius: 999, backgroundColor: colors.navy700, alignItems: 'center', justifyContent: 'center', ...shadows.sm }}>
          <Icon name="navigation" size={11} color="#fff" />
        </View>
      )}
    </View>
  );
}

// ── meta de estado de sincronización ─────────────────────────────
function syncMeta(sync: GpsSync, t: T): { label: string; color: string } {
  return (
    {
      connected: { label: t('connected'), color: colors.success },
      stale: { label: t('stale'), color: colors.amber },
      nodata: { label: t('noData'), color: colors.ink40 },
      error: { label: t('gpsError'), color: colors.error },
    } as Record<GpsSync, { label: string; color: string }>
  )[sync] || { label: t('noData'), color: colors.ink40 };
}

function SyncChip({ sync, t }: { sync: GpsSync; t: T }) {
  const m = syncMeta(sync, t);
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, height: 26, paddingHorizontal: 10, borderRadius: 999, backgroundColor: alpha(m.color, 0.13) }}>
      <View style={{ width: 7, height: 7, borderRadius: 999, backgroundColor: m.color }} />
      <AppText weight="700" style={{ fontSize: 12, color: m.color }}>{m.label}</AppText>
    </View>
  );
}

const Dot = () => <View style={{ width: 3, height: 3, borderRadius: 999, backgroundColor: colors.ink30 }} />;

function Metric({ icon, label, value, unit }: { icon: any; label: string; value: string | number; unit?: string }) {
  return (
    <View style={{ flex: 1, backgroundColor: colors.bg, borderRadius: 13, paddingVertical: 10, paddingHorizontal: 8, alignItems: 'center' }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 4 }}>
        <Icon name={icon} size={13} color={colors.ink40} />
        <AppText weight="600" style={{ fontSize: 10.5, color: colors.ink40, textTransform: 'uppercase', letterSpacing: 0.3 }}>{label}</AppText>
      </View>
      <AppText weight="700" style={{ fontSize: 15, color: colors.ink }}>
        {value}
        {unit ? <AppText weight="600" style={{ fontSize: 10.5, color: colors.ink40 }}> {unit}</AppText> : null}
      </AppText>
    </View>
  );
}

function ActionBtn({ icon, label, onPress, busy, primary }: { icon: any; label: string; onPress: () => void; busy?: boolean; primary?: boolean }) {
  return (
    <Tap
      onPress={onPress}
      style={{ flex: 1, alignItems: 'center', gap: 5, paddingVertical: 11, paddingHorizontal: 4, borderRadius: 13, backgroundColor: primary ? alpha(colors.navy500, 0.12) : colors.bg }}
    >
      {busy ? <ActivityIndicator size="small" color={primary ? colors.navy700 : colors.ink60} /> : <Icon name={icon} size={19} color={primary ? colors.navy700 : colors.ink60} />}
      <AppText weight="600" style={{ fontSize: 11, color: primary ? colors.navy700 : colors.ink60 }}>{label}</AppText>
    </Tap>
  );
}

// ── Card de ubicación insertada en el detalle ────────────────────
export function LocationCard({
  c,
  t,
  onActivate,
  onHistory,
  onSync,
}: {
  c: { id: string; status: string; type: string; gps: ContainerGps };
  t: T;
  onActivate: () => void;
  onHistory: () => void;
  onSync: () => Promise<void>;
}) {
  const g = c.gps;
  const [syncing, setSyncing] = useState(false);

  const doSync = async () => {
    if (syncing) return;
    setSyncing(true);
    haptic('light');
    try {
      await onSync();
      haptic('success');
    } finally {
      setSyncing(false);
    }
  };

  const Head = (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 14 }}>
      <View style={{ width: 34, height: 34, borderRadius: 10, backgroundColor: alpha(colors.navy500, 0.11), alignItems: 'center', justifyContent: 'center' }}>
        <Icon name={g.enabled ? 'gps' : 'gpsOff'} size={19} color={colors.navy700} />
      </View>
      <AppText weight="700" style={{ flex: 1, fontSize: 16, color: colors.ink }}>{t('location')}</AppText>
      {g.enabled && <SyncChip sync={g.sync} t={t} />}
    </View>
  );

  // (a) desactivado
  if (!g.enabled) {
    return (
      <Card pad={16}>
        {Head}
        <View style={{ borderRadius: radius.lg, backgroundColor: colors.bg, paddingVertical: 26, paddingHorizontal: 18, alignItems: 'center' }}>
          <View style={{ width: 56, height: 56, borderRadius: 18, backgroundColor: alpha(colors.ink, 0.06), alignItems: 'center', justifyContent: 'center' }}>
            <Icon name="gpsOff" size={28} color={colors.ink40} />
          </View>
          <AppText weight="600" style={{ fontSize: 14.5, color: colors.ink, marginTop: 12 }}>{t('gpsOff')}</AppText>
          <AppText style={{ fontSize: 13, color: colors.ink50, lineHeight: 19, textAlign: 'center', maxWidth: 240, marginTop: 4 }}>{t('gpsOffSub')}</AppText>
          <View style={{ width: '100%', marginTop: 14 }}>
            <Button variant="primary" icon="gps" onPress={onActivate}>{t('enableGps')}</Button>
          </View>
        </View>
      </Card>
    );
  }

  // (c) activado, esperando primera señal
  if (g.enabled && !g.lastFix) {
    return (
      <Card pad={16}>
        {Head}
        <View style={{ borderRadius: radius.lg, overflow: 'hidden', height: 170, backgroundColor: '#e6ecf4', alignItems: 'center', justifyContent: 'center' }}>
          <View style={{ width: 44, height: 44, borderRadius: 999, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center', ...shadows.sm }}>
            <Icon name="satellite" size={22} color={colors.accent} />
          </View>
          <AppText weight="600" style={{ fontSize: 14, color: colors.ink, marginTop: 12 }}>{t('waitingSignal')}</AppText>
          <AppText style={{ fontSize: 12.5, color: colors.ink50, textAlign: 'center', maxWidth: 250, lineHeight: 18, marginTop: 4, paddingHorizontal: 16 }}>{t('waitingSignalSub')}</AppText>
        </View>
        <View style={{ marginTop: 12 }}>
          <Button variant="soft" icon="refresh" loading={syncing} onPress={doSync}>{t('syncNow')}</Button>
        </View>
      </Card>
    );
  }

  // (b) activo con ubicación
  const f = g.lastFix as GpsFix;
  const moving = f.speed > 0;
  const meta = statusMeta(c.status);
  const openDirections = () => {
    haptic('light');
    Linking.openURL(`http://maps.apple.com/?daddr=${f.lat},${f.lng}`).catch(() => {});
  };

  return (
    <Card pad={16}>
      {Head}
      <View>
        <MapCanvas track={g.track} fix={f} status={c.status} type={c.type} height={190} />
        {g.geofence && (
          <View style={{ position: 'absolute', top: 10, left: 10, flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 6, paddingHorizontal: 11, borderRadius: 999, backgroundColor: 'rgba(255,255,255,0.86)', ...shadows.sm }}>
            <Icon name="crosshair" size={14} color={colors.success} />
            <AppText weight="600" style={{ fontSize: 12, color: colors.ink }}>{t('insideGeofence')} {g.geofence.name} · {g.geofence.distanceM} m</AppText>
          </View>
        )}
        {moving && (
          <View style={{ position: 'absolute', top: 10, right: 10, flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 6, paddingHorizontal: 11, borderRadius: 999, backgroundColor: 'rgba(13,27,61,0.84)' }}>
            <Icon name="navigation" size={13} color="#fff" />
            <AppText weight="700" style={{ fontSize: 12, color: '#fff' }}>{f.speed} km/h · {f.heading}</AppText>
          </View>
        )}
      </View>

      {/* dirección + meta */}
      <View style={{ marginTop: 14, flexDirection: 'row', alignItems: 'flex-start', gap: 11 }}>
        <View style={{ width: 30, height: 30, borderRadius: 9, backgroundColor: alpha(meta.color, 0.13), alignItems: 'center', justifyContent: 'center', marginTop: 1 }}>
          <Icon name="mapPin2" size={17} color={meta.color} />
        </View>
        <View style={{ flex: 1, minWidth: 0 }}>
          <AppText weight="600" style={{ fontSize: 14, color: colors.ink, lineHeight: 19 }}>{f.address || '—'}</AppText>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 7, marginTop: 3, flexWrap: 'wrap' }}>
            <AppText style={{ fontSize: 12.5, color: colors.ink50 }}>{t('updatedAgo')} {t.rel(f.ts)}</AppText>
            <Dot />
            <AppText style={{ fontSize: 12.5, color: colors.ink50 }}>{moving ? `${f.speed} km/h · ${f.heading}` : t('stationary')}</AppText>
          </View>
        </View>
      </View>

      {/* métricas */}
      <View style={{ flexDirection: 'row', gap: 8, marginTop: 14 }}>
        <Metric icon="gauge" label={t('speed')} value={moving ? `${f.speed}` : '0'} unit="km/h" />
        <Metric icon="navigation" label={t('heading')} value={f.heading} />
        <Metric icon="crosshair" label={t('accuracy')} value={f.accuracy != null ? `±${f.accuracy}` : '—'} unit={f.accuracy != null ? 'm' : undefined} />
      </View>

      {/* acciones */}
      <View style={{ flexDirection: 'row', gap: 8, marginTop: 14 }}>
        <ActionBtn icon="refresh" label={t('syncNow')} onPress={doSync} busy={syncing} primary />
        <ActionBtn icon="navigation" label={t('getDirections')} onPress={openDirections} />
        <ActionBtn icon="route" label={t('viewHistory')} onPress={onHistory} />
      </View>
    </Card>
  );
}

// ── Switch (toggle) ──────────────────────────────────────────────
export function Switch({ on, onChange }: { on: boolean; onChange: (v: boolean) => void }) {
  const x = React.useRef(new Animated.Value(on ? 1 : 0)).current;
  React.useEffect(() => {
    Animated.timing(x, { toValue: on ? 1 : 0, duration: 220, useNativeDriver: false }).start();
  }, [on, x]);
  const left = x.interpolate({ inputRange: [0, 1], outputRange: [3, 23] });
  return (
    <Pressable onPress={() => onChange(!on)} style={{ width: 50, height: 30, borderRadius: 999, backgroundColor: on ? colors.success : colors.line }}>
      <Animated.View style={{ position: 'absolute', top: 3, left, width: 24, height: 24, borderRadius: 999, backgroundColor: '#fff', ...shadows.sm }} />
    </Pressable>
  );
}

// ── Hoja de activación / vinculación de GPS ──────────────────────
export function ActivateSheet({
  open,
  onClose,
  t,
  onSubmit,
}: {
  open: boolean;
  onClose: () => void;
  t: T;
  onSubmit: (serial: string) => Promise<void>;
}) {
  const [serial, setSerial] = useState('');
  const [active, setActive] = useState(true);
  const [busy, setBusy] = useState(false);
  React.useEffect(() => {
    if (open) {
      setSerial('');
      setActive(true);
      setBusy(false);
    }
  }, [open]);

  const valid = serial.trim().length >= 4 && active;
  const submit = async () => {
    if (!valid || busy) return;
    setBusy(true);
    haptic('medium');
    try {
      await onSubmit(serial.trim());
      haptic('success');
      onClose();
    } finally {
      setBusy(false);
    }
  };

  return (
    <Sheet open={open} onClose={onClose} title={t('activateGps')}>
      <View style={{ paddingHorizontal: 16, paddingTop: 6, paddingBottom: 8, gap: 16 }}>
        <Field label={t('gatewaySerial')} icon="gps" placeholder="G4NS-5RG-FDB" value={serial} onChangeText={(v) => setSerial(v.toUpperCase())} hint={t('gatewayReqHint')} autoCapitalize="characters" autoFocus />
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: colors.bg, borderRadius: 14, paddingVertical: 13, paddingHorizontal: 15 }}>
          <View style={{ width: 34, height: 34, borderRadius: 10, backgroundColor: alpha(colors.success, 0.14), alignItems: 'center', justifyContent: 'center' }}>
            <Icon name="gps" size={18} color={colors.success} />
          </View>
          <AppText weight="600" style={{ flex: 1, fontSize: 14.5, color: colors.ink }}>{t('trackingActive')}</AppText>
          <Switch on={active} onChange={(v) => { haptic('select'); setActive(v); }} />
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 9, paddingHorizontal: 2 }}>
          <Icon name="info" size={16} color={colors.accent} />
          <AppText style={{ flex: 1, fontSize: 12.5, color: colors.ink50, lineHeight: 19 }}>{t('activateNote')}</AppText>
        </View>
        <Button variant="primary" icon="gps" disabled={!valid || busy} loading={busy} onPress={submit}>{t('activate')}</Button>
      </View>
    </Sheet>
  );
}

// ── Hoja de historial de recorrido ───────────────────────────────
export function HistorySheet({
  open,
  onClose,
  t,
  status,
  type,
  track,
  loading,
}: {
  open: boolean;
  onClose: () => void;
  t: T;
  status: string;
  type: string;
  track: GpsFix[];
  loading: boolean;
}) {
  const pts = [...track].reverse(); // más recientes primero
  return (
    <Sheet open={open} onClose={onClose} title={t('routeHistory')}>
      <View style={{ paddingHorizontal: 16, paddingBottom: 8 }}>
        <AppText style={{ fontSize: 13, color: colors.ink50, marginBottom: 12 }}>{t('lastPositions')}</AppText>
        {loading ? (
          <View style={{ height: 120, borderRadius: radius.lg, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center' }}>
            <ActivityIndicator color={colors.navy500} />
          </View>
        ) : track.length > 1 ? (
          <MapCanvas track={track} fix={track[track.length - 1]} status={status} type={type} height={200} showRoute />
        ) : (
          <View style={{ height: 120, borderRadius: radius.lg, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center' }}>
            <AppText weight="500" style={{ fontSize: 13.5, color: colors.ink40 }}>{t('noRouteYet')}</AppText>
          </View>
        )}
      </View>
      <View style={{ paddingHorizontal: 20, paddingTop: 16, paddingBottom: 24 }}>
        {pts.map((p, i) => {
          const moving = p.speed > 0;
          return (
            <View key={i} style={{ flexDirection: 'row', gap: 14, alignItems: 'stretch' }}>
              <View style={{ alignItems: 'center' }}>
                <View style={{ width: 13, height: 13, borderRadius: 999, marginTop: 4, backgroundColor: i === 0 ? colors.accent : colors.surface, borderWidth: i === 0 ? 3 : 2, borderColor: i === 0 ? alpha(colors.accent, 0.3) : colors.line }} />
                {i < pts.length - 1 && <View style={{ flex: 1, width: 2, backgroundColor: colors.line, marginVertical: 3 }} />}
              </View>
              <View style={{ flex: 1, paddingBottom: 20 }}>
                <AppText weight="600" style={{ fontSize: 14, color: colors.ink, lineHeight: 19 }}>{p.address || `${p.lat.toFixed(4)}, ${p.lng.toFixed(4)}`}</AppText>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 7, marginTop: 3 }}>
                  <AppText style={{ fontSize: 12.5, color: colors.ink50 }}>{t.rel(p.ts)}</AppText>
                  <Dot />
                  <AppText weight={moving ? '600' : '400'} style={{ fontSize: 12.5, color: moving ? colors.navy700 : colors.ink50 }}>{moving ? `${p.speed} km/h` : t('stationary')}</AppText>
                </View>
              </View>
            </View>
          );
        })}
      </View>
    </Sheet>
  );
}
