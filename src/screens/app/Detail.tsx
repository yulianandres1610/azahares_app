// Detalle de contenedor + inspección guiada de 3 pasos (API real).
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Dimensions, Image, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { useVideoPlayer, VideoView } from 'expo-video';
import { captureRef } from 'react-native-view-shot';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { alpha, colors, gradients, radius, shadows } from '../../theme/tokens';
import { Icon, IconName } from '../../components/Icon';
import { AppText, Button, Card, CheckMark, IconButton, Progress, Ring, Screen, Segmented, Sheet, StatusBadge, Tap, Field, haptic } from '../../components/ui';
import * as ImagePicker from 'expo-image-picker';
import { ThermalLabel } from '../../components/Label';
import { Insta360Capture } from '../../components/Insta360Capture';
import { PHOTO_SLOTS, TYPES, statusMeta, stepOf, VISUAL_KINDS } from '../../domain';
import { useApp } from '../../store/AppContext';
import { PUBLIC_WEB_URL } from '../../config';
import * as Insp from '../../lib/api/inspections';
import { deleteContainer, enableGps, getContainer, listContainerImages, listLocations } from '../../lib/api/containers';
import type { ContainerImage } from '../../lib/api/containers';
import { RemoteImage } from '../../components/RemoteImage';
import { LocationCard, ActivateSheet, HistorySheet } from '../../components/Gps';
import type { T } from '../../i18n';
import type { Container, ContainerInspection, GpsFix, InspectionLabelData, InspectionMediaKind } from '../../lib/api/types';

export function Detail({ id, onClose }: { id: string; onClose: () => void }) {
  const { t, me, containers, refreshContainers, showToast } = useApp();
  const insets = useSafeAreaInsets();
  const c = containers.find((x) => x.id === id);
  const [ins, setIns] = useState<ContainerInspection | null>(null);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState(0);
  const [histOpen, setHistOpen] = useState(false);
  const [delOpen, setDelOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [gpsOpen, setGpsOpen] = useState(false);
  const [gpsHistOpen, setGpsHistOpen] = useState(false);
  const [dtab, setDtab] = useState<'inspection' | 'container'>('inspection');
  const [track, setTrack] = useState<GpsFix[]>([]);
  const [trackLoading, setTrackLoading] = useState(false);

  // Paso activo. Tras complete-refuel el backend deja el contenedor en
  // refuel_inspection pero la inspección ya tiene refuelCompletedAt → avanzar
  // al paso Etiqueta (donde se marca disponible).
  const active = !c
    ? 0
    : c.status === 'visual_inspection'
    ? 0
    : c.status === 'refuel_inspection'
    ? ins?.refuelCompletedAt
      ? 2
      : 1
    : 2;

  const loadInspection = useCallback(async () => {
    if (!c) return;
    try {
      const list = await Insp.listInspections(c.id);
      const current = list.find((i) => i.stage !== 'completed') || list[0] || null;
      setIns(current);
    } catch (e: any) {
      showToast(e?.message || t('errorGeneric'), 'error');
    } finally {
      setLoading(false);
    }
  }, [c, showToast, t]);

  useEffect(() => {
    loadInspection();
  }, [loadInspection]);
  useEffect(() => {
    setView(active);
  }, [active]);

  const afterStatusChange = useCallback(async () => {
    await Promise.all([refreshContainers(), loadInspection()]);
  }, [refreshContainers, loadInspection]);

  // GPS: activar, sincronizar (re-fetch) y abrir historial de recorrido.
  const onActivateGps = useCallback(async (serial: string) => {
    if (!c) return;
    try {
      await enableGps(c.id, serial);
      await refreshContainers();
      showToast(t('gpsActivated'), 'success');
    } catch (e: any) {
      showToast(e?.message || t('errorGeneric'), 'error');
      throw e;
    }
  }, [c, refreshContainers, showToast, t]);

  const onSyncGps = useCallback(async () => {
    await refreshContainers();
  }, [refreshContainers]);

  const onOpenGpsHistory = useCallback(async () => {
    if (!c) return;
    setGpsHistOpen(true);
    setTrackLoading(true);
    try {
      setTrack(await listLocations(c.id, 50));
    } catch {
      setTrack([]);
    } finally {
      setTrackLoading(false);
    }
  }, [c]);

  if (!c) {
    return (
      <Screen bg={colors.bg}>
        <View style={{ padding: 16 }}>
          <IconButton name="chevL" onPress={onClose} />
        </View>
      </Screen>
    );
  }

  const meta = statusMeta(c.status);
  const tt = TYPES[c.type] ?? { icon: 'cube' as IconName };
  const vc = ins ? ins.media.filter((m) => VISUAL_KINDS.includes(m.kind)).length : 0;
  const steps = [t('visualInspection'), t('refuelInspection'), t('labelAvailable')];
  const overall = Math.round(
    (((active >= 1 ? 1 : vc / 7) + (active >= 2 ? 1 : 0) + (c.status === 'available' || active > 2 ? 1 : 0)) / 3) * 100,
  );

  const metaCells: [string, string][] = [
    [t('type'), t(c.type)],
    [t('size'), c.size || '—'],
    [t('capacity'), c.capacity != null ? `${c.capacity.toLocaleString()} ${c.unit || ''}` : '—'],
    [t('tare'), c.tare != null ? `${c.tare.toLocaleString()} ${c.tareUnit || 'kg'}` : '—'],
  ];

  return (
    <Screen bg={colors.bg} padTop={false} padBottom={24}>
      {/* hero */}
      <View style={{ borderBottomLeftRadius: 26, borderBottomRightRadius: 26, overflow: 'hidden' }}>
        <LinearGradient colors={gradients.navyDeep} start={{ x: 0.1, y: 0 }} end={{ x: 0.9, y: 1 }} style={{ paddingTop: insets.top + 8, paddingHorizontal: 16, paddingBottom: 18 }}>
          <View style={{ position: 'absolute', width: 260, height: 260, borderRadius: 999, top: -130, right: -80, backgroundColor: alpha(colors.accent, 0.2) }} />
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <IconButton name="chevL" variant="glassDark" color="#fff" onPress={onClose} />
            <IconButton name="trash" variant="glassDark" color="#fff" onPress={() => setDelOpen(true)} />
          </View>
          <View style={{ marginTop: 16, flexDirection: 'row', alignItems: 'flex-start', gap: 14 }}>
            <View style={{ width: 56, height: 56, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.12)', alignItems: 'center', justifyContent: 'center' }}>
              <Icon name={tt.icon} size={28} color="#fff" />
            </View>
            <View style={{ flex: 1, minWidth: 0 }}>
              <AppText weight="600" style={{ fontSize: 23, color: '#fff', letterSpacing: -0.2 }}>
                {c.number}
              </AppText>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 7 }}>
                <StatusBadge status={c.status} size="sm" />
                <AppText weight="600" style={{ color: 'rgba(255,255,255,0.7)', fontSize: 12.5 }}>
                  {t('cycle')} {c.cycle ?? 1}
                </AppText>
              </View>
            </View>
            <Ring value={overall / 100} size={56} stroke={6} color="#fff" track="rgba(255,255,255,0.18)">
              <AppText weight="700" style={{ color: '#fff', fontSize: 14 }}>
                {overall}%
              </AppText>
            </Ring>
          </View>
          <View style={{ flexDirection: 'row', gap: 8, marginTop: 16 }}>
            {metaCells.map((m, i) => (
              <View key={i} style={{ flex: 1, backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 12, paddingVertical: 9, paddingHorizontal: 8, alignItems: 'center' }}>
                <AppText weight="600" style={{ color: 'rgba(255,255,255,0.55)', fontSize: 10, letterSpacing: 0.3 }}>
                  {m[0].toUpperCase()}
                </AppText>
                <AppText weight="700" style={{ color: '#fff', fontSize: 13.5, marginTop: 3 }}>
                  {m[1]}
                </AppText>
              </View>
            ))}
          </View>
        </LinearGradient>
      </View>

      {/* switch de vista: Inspección / Contenedor */}
      <View style={{ paddingHorizontal: 16, paddingTop: 14, paddingBottom: 2 }}>
        <Segmented
          value={dtab}
          onChange={(v) => setDtab(v as 'inspection' | 'container')}
          options={[
            { value: 'inspection', label: t('tabInspection') },
            { value: 'container', label: t('tabContainer') },
          ]}
        />
      </View>

      {dtab === 'container' ? (
        <View style={{ paddingHorizontal: 16, paddingTop: 14 }}>
          <ContainerInfoPanel
            c={c}
            t={t}
            providerName={me?.provider?.name ?? '—'}
            onActivateGps={() => setGpsOpen(true)}
            onHistory={onOpenGpsHistory}
            onSync={onSyncGps}
          />
        </View>
      ) : (
        <>
      {/* returning banner */}
      {c.status === 'returning' && (
        <View style={{ paddingHorizontal: 16, paddingTop: 14 }}>
          <View style={{ backgroundColor: alpha('#8b6fe0', 0.14), borderRadius: radius.lg, padding: 16, flexDirection: 'row', alignItems: 'center', gap: 13 }}>
            <Icon name="refresh" size={26} color="#8b6fe0" />
            <AppText weight="500" style={{ flex: 1, fontSize: 13.5, color: colors.ink70 }}>
              {t('startNewCycle')}
            </AppText>
            <Button
              size="sm"
              full={false}
              onPress={async () => {
                try {
                  await Insp.startInspection(c.id);
                  showToast(t('visualInspection'), 'info');
                  afterStatusChange();
                } catch (e: any) {
                  showToast(e?.message || t('errorGeneric'), 'error');
                }
              }}
            >
              {t('startNewCycle')}
            </Button>
          </View>
        </View>
      )}

      {/* stepper */}
      <View style={{ paddingHorizontal: 20, paddingTop: 18, paddingBottom: 6 }}>
        <ReviewStepper steps={steps} current={active} view={view} onPick={setView} />
      </View>

      {/* panels */}
      <View style={{ paddingHorizontal: 16, paddingTop: 8 }}>
        {loading ? (
          <View style={{ paddingVertical: 50, alignItems: 'center' }}>
            <ActivityIndicator color={colors.navy500} />
          </View>
        ) : (
          <>
            {view === 0 && <VisualPanel c={c} ins={ins} editable={c.status === 'visual_inspection'} onChanged={afterStatusChange} reload={loadInspection} />}
            {view === 1 && <RefuelPanel c={c} ins={ins} editable={c.status === 'refuel_inspection'} onChanged={afterStatusChange} reload={loadInspection} />}
            {view === 2 && <LabelPanel c={c} ins={ins} onChanged={afterStatusChange} />}
          </>
        )}
      </View>

      {/* history button */}
      <View style={{ paddingHorizontal: 16, paddingTop: 20 }}>
        <Tap onPress={() => setHistOpen(true)} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: colors.surface, borderRadius: radius.lg, padding: 15, ...shadows.sm }}>
          <View style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: alpha(colors.navy500, 0.11), alignItems: 'center', justifyContent: 'center' }}>
            <Icon name="history" size={19} color={colors.navy700} />
          </View>
          <AppText weight="600" style={{ flex: 1, fontSize: 14.5, color: colors.ink }}>
            {t('cycleHistory')}
          </AppText>
          <AppText weight="600" style={{ fontSize: 12.5, color: colors.ink40 }}>
            {c.cycle ?? 1}
          </AppText>
          <Icon name="chevR" size={18} color={colors.ink30} />
        </Tap>
      </View>
        </>
      )}

      {/* history sheet */}
      <Sheet open={histOpen} onClose={() => setHistOpen(false)} title={t('cycleHistory')}>
        <View style={{ paddingHorizontal: 20, paddingBottom: 28 }}>
          <View style={{ flexDirection: 'row', gap: 14 }}>
            <View style={{ width: 14, height: 14, borderRadius: 999, backgroundColor: colors.accent, marginTop: 4 }} />
            <View style={{ flex: 1 }}>
              <AppText weight="700" style={{ fontSize: 15 }}>
                {t('cycle')} {c.cycle ?? 1}
              </AppText>
              <AppText style={{ fontSize: 13, color: colors.ink50, marginTop: 3 }}>
                {ins?.productType || '—'}
              </AppText>
            </View>
          </View>
        </View>
      </Sheet>

      {/* delete sheet */}
      <Sheet open={delOpen} onClose={() => setDelOpen(false)}>
        <View style={{ paddingHorizontal: 20, paddingBottom: 28, alignItems: 'center' }}>
          <View style={{ width: 64, height: 64, borderRadius: 20, backgroundColor: alpha(colors.error, 0.12), alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
            <Icon name="trash" size={30} color={colors.error} />
          </View>
          <AppText serif weight="600" style={{ fontSize: 20 }}>
            {t('remove')}?
          </AppText>
          <AppText weight="600" style={{ fontSize: 15, color: colors.ink, marginTop: 4 }}>
            {c.number}
          </AppText>
          <AppText style={{ fontSize: 13.5, color: colors.ink50, marginTop: 6, textAlign: 'center' }}>
            {t.locale === 'es'
              ? 'Se eliminará el contenedor y todas sus inspecciones y archivos. Esta acción no se puede deshacer.'
              : 'This deletes the container and all its inspections and files. This cannot be undone.'}
          </AppText>
          <View style={{ flexDirection: 'row', gap: 12, marginTop: 22, width: '100%' }}>
            <Button variant="outline" onPress={() => setDelOpen(false)} style={{ flex: 1 }}>
              {t('cancel')}
            </Button>
            <Button
              variant="danger"
              icon="trash"
              loading={deleting}
              style={{ flex: 1 }}
              onPress={async () => {
                if (deleting) return;
                setDeleting(true);
                try {
                  await deleteContainer(c.id);
                  haptic('success');
                  setDelOpen(false);
                  showToast(`${c.number} · ${t('remove')}`, 'warn');
                  onClose();
                  refreshContainers();
                } catch (e: any) {
                  showToast(e?.message || t('errorGeneric'), 'error');
                } finally {
                  setDeleting(false);
                }
              }}
            >
              {t('remove')}
            </Button>
          </View>
        </View>
      </Sheet>
      {/* GPS: hoja de activación + hoja de historial de recorrido */}
      <ActivateSheet open={gpsOpen} onClose={() => setGpsOpen(false)} t={t} onSubmit={onActivateGps} />
      <HistorySheet open={gpsHistOpen} onClose={() => setGpsHistOpen(false)} t={t} status={c.status} type={c.type} track={track} loading={trackLoading} />
    </Screen>
  );
}

// ── Pestaña "Contenedor": datos, fotos de creación, specs + GPS ──
const SIDE_KEYS: string[] = ['sideFront', 'sideRight', 'sideBack', 'sideLeft'];
function ContainerInfoPanel({
  c,
  t,
  providerName,
  onActivateGps,
  onHistory,
  onSync,
}: {
  c: Container;
  t: T;
  providerName: string;
  onActivateGps: () => void;
  onHistory: () => void;
  onSync: () => Promise<void>;
}) {
  // Traemos el detalle completo: la lista no incluye rent/owned (precio).
  const [full, setFull] = useState<Container>(c);
  useEffect(() => {
    let alive = true;
    setFull(c);
    getContainer(c.id)
      .then((r) => alive && setFull(r))
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [c.id]);
  const cc = full;
  const meta = statusMeta(cc.status);
  const tt = TYPES[cc.type] ?? { icon: 'cube' as IconName };
  const [imgs, setImgs] = useState<ContainerImage[]>([]);
  const [imgsLoading, setImgsLoading] = useState(true);
  useEffect(() => {
    let alive = true;
    setImgsLoading(true);
    listContainerImages(c.id)
      .then((r) => alive && setImgs(r))
      .catch(() => alive && setImgs([]))
      .finally(() => alive && setImgsLoading(false));
    return () => {
      alive = false;
    };
  }, [c.id]);

  const tileW = (Dimensions.get('window').width - 32 - 32 - 10) / 2;
  const tileH = Math.round(tileW * 0.81);
  const photos = imgs.slice(0, 4);

  return (
    <View style={{ gap: 14 }}>
      {/* yarda + estado */}
      <Card pad={0}>
        <InfoRow icon="map" label={t('yard')} value={providerName} accent />
        <InfoRow icon={meta.icon} label={t('currentState')} valueNode={<StatusBadge status={cc.status} size="sm" />} />
        <InfoRow icon="refresh" label={t('cycle')} value={`${t('cycle')} ${cc.cycle ?? 1}`} />
        <InfoRow icon="clock" label={t('lastUpdate')} value={t.rel(cc.updatedAt)} last />
      </Card>

      {/* fotos de creación */}
      <Card pad={16}>
        <CardHead icon="camera" title={t('creationPhotos')} sub={t('creationPhotosSub')} />
        {imgsLoading ? (
          <View style={{ height: 120, alignItems: 'center', justifyContent: 'center' }}>
            <ActivityIndicator color={colors.navy500} />
          </View>
        ) : photos.length ? (
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 14 }}>
            {photos.map((im, i) => (
              <CreationPhoto key={im.id} url={im.url} label={t(SIDE_KEYS[i] ?? 'photoOpt')} w={tileW} h={tileH} />
            ))}
          </View>
        ) : (
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 14 }}>
            {SIDE_KEYS.map((k) => (
              <View key={k} style={{ width: tileW, height: tileH, borderRadius: 14, borderWidth: 1.5, borderColor: colors.line, borderStyle: 'dashed', alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surface }}>
                <View style={{ width: 38, height: 38, borderRadius: 11, backgroundColor: alpha(colors.accent, 0.12), alignItems: 'center', justifyContent: 'center' }}>
                  <Icon name="camera" size={20} color={colors.accent} />
                </View>
                <AppText weight="600" style={{ fontSize: 11, color: colors.ink50, marginTop: 6 }}>{t(k)}</AppText>
              </View>
            ))}
          </View>
        )}
      </Card>

      {/* especificaciones */}
      <Card pad={0}>
        <View style={{ paddingHorizontal: 16, paddingTop: 14, paddingBottom: 4 }}>
          <CardHead icon={tt.icon} title={t('specsTitle')} />
        </View>
        <InfoRow icon="box" label={t('type')} value={`${t(cc.type)} · ${cc.size || '—'}`} />
        <InfoRow icon="droplet" label={t('capacity')} value={cc.capacity != null ? `${cc.capacity.toLocaleString()} ${cc.unit || ''}` : '—'} />
        <InfoRow icon="cube" label={t('tare')} value={cc.tare != null ? `${cc.tare.toLocaleString()} ${cc.tareUnit || 'kg'}` : '—'} />
        <InfoRow icon={cc.ownership === 'owned' ? 'key' : 'history'} label={t('ownerInfo')} value={t(cc.ownership || 'owned')} />
        <InfoRow
          icon="dollar"
          label={cc.ownership === 'rented' ? t('monthlyRate') : t('purchasePrice')}
          value={cc.price ? `${Number(cc.price).toLocaleString()} ${cc.currency || 'USD'}${cc.ownership === 'rented' ? '/mo' : ''}` : '—'}
          last
        />
      </Card>

      {/* GPS */}
      <LocationCard c={cc} t={t} onActivate={onActivateGps} onHistory={onHistory} onSync={onSync} />
    </View>
  );
}

// Foto de creación: descarga vía expo-file-system y muestra desde archivo local.
function CreationPhoto({ url, label, w, h }: { url: string | null; label: string; w: number; h: number }) {
  return (
    <View style={{ width: w, height: h, borderRadius: 14, overflow: 'hidden', backgroundColor: '#1c2740' }}>
      <RemoteImage url={url} />
      <View style={{ position: 'absolute', top: 8, left: 8, backgroundColor: 'rgba(8,14,33,0.55)', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 999 }}>
        <AppText weight="600" style={{ fontSize: 11, color: '#fff' }}>{label}</AppText>
      </View>
    </View>
  );
}

function CardHead({ icon, title, sub }: { icon: IconName; title: string; sub?: string }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
      <View style={{ width: 34, height: 34, borderRadius: 10, backgroundColor: alpha(colors.navy500, 0.11), alignItems: 'center', justifyContent: 'center' }}>
        <Icon name={icon} size={18} color={colors.navy700} />
      </View>
      <View style={{ flex: 1, minWidth: 0 }}>
        <AppText weight="700" style={{ fontSize: 15.5, color: colors.ink }}>{title}</AppText>
        {sub ? <AppText style={{ fontSize: 12, color: colors.ink50, marginTop: 1 }}>{sub}</AppText> : null}
      </View>
    </View>
  );
}

function InfoRow({
  icon,
  label,
  value,
  valueNode,
  accent,
  last,
}: {
  icon: IconName;
  label: string;
  value?: string;
  valueNode?: React.ReactNode;
  accent?: boolean;
  last?: boolean;
}) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 13, paddingHorizontal: 16, borderBottomWidth: last ? 0 : 1, borderBottomColor: colors.line }}>
      <View style={{ width: 32, height: 32, borderRadius: 9, backgroundColor: accent ? alpha(colors.accent, 0.13) : alpha(colors.ink, 0.05), alignItems: 'center', justifyContent: 'center' }}>
        <Icon name={icon} size={17} color={accent ? colors.accent : colors.ink50} />
      </View>
      <AppText weight="500" style={{ flex: 1, fontSize: 13.5, color: colors.ink50 }}>{label}</AppText>
      {valueNode || (
        <AppText weight="600" style={{ fontSize: 14, color: colors.ink, textAlign: 'right', maxWidth: '58%' }}>
          {value}
        </AppText>
      )}
    </View>
  );
}

// ── stepper que permite revisar pasos alcanzados ─────────────
function ReviewStepper({ steps, current, view, onPick }: { steps: string[]; current: number; view: number; onPick: (i: number) => void }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
      {steps.map((label, i) => {
        const done = i < current;
        const activeStep = i === current;
        const reachable = i <= current;
        const isView = i === view;
        const circle = (
          <View style={{ alignItems: 'center', gap: 7, width: 92 }}>
            <View
              style={{
                width: 34,
                height: 34,
                borderRadius: 999,
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: done ? colors.success : activeStep ? 'transparent' : colors.surface,
                borderWidth: !done && !activeStep ? 1.5 : isView ? 4 : 0,
                borderColor: isView ? alpha(colors.accent, 0.3) : colors.line,
                overflow: 'hidden',
              }}
            >
              {activeStep && <LinearGradient colors={gradients.navy} style={{ position: 'absolute', width: 34, height: 34 }} />}
              {done ? <CheckMark size={17} /> : <AppText weight="700" style={{ color: activeStep ? '#fff' : colors.ink40, fontSize: 14 }}>{i + 1}</AppText>}
            </View>
            <AppText weight="600" style={{ fontSize: 11, color: isView ? colors.ink : colors.ink40, textAlign: 'center' }}>
              {label}
            </AppText>
          </View>
        );
        return (
          <React.Fragment key={i}>
            {reachable ? (
              <Tap onPress={() => onPick(i)} hapticKind="select">
                {circle}
              </Tap>
            ) : (
              circle
            )}
            {i < steps.length - 1 && (
              <View style={{ flex: 1, height: 2, marginTop: 17, marginHorizontal: 6, borderRadius: 999, backgroundColor: i < current ? colors.success : colors.line }} />
            )}
          </React.Fragment>
        );
      })}
    </View>
  );
}

// ── Paso 1: Visual ───────────────────────────────────────────
function VisualPanel({
  c,
  ins,
  editable,
  onChanged,
  reload,
}: {
  c: Container;
  ins: ContainerInspection | null;
  editable: boolean;
  onChanged: () => void;
  reload: () => Promise<void>;
}) {
  const { t, showToast } = useApp();
  const [uploads, setUploads] = useState<Record<string, number>>({});
  const [unavailOpen, setUnavailOpen] = useState(false);
  const [unavailReason, setUnavailReason] = useState('');
  const [unavailBusy, setUnavailBusy] = useState(false);
  // Método de captura de la inspección visual: cámara del móvil (7 fotos) o
  // una sola toma 360 con cámara Insta360. Si ya hay un video 360 subido,
  // abrimos el método Insta360 para mostrarlo (no los slots de fotos vacíos).
  const hasPano = !!ins?.media.some((m) => m.kind === 'panorama_360');
  const [method, setMethod] = useState<'phone' | 'insta360'>(hasPano ? 'insta360' : 'phone');
  const es = t.locale === 'es';
  useEffect(() => {
    if (hasPano) setMethod('insta360');
  }, [hasPano]);
  const byKind = useMemo(() => {
    const m: Record<string, string | null> = {};
    ins?.media.forEach((x) => (m[x.kind] = x.url));
    return m;
  }, [ins]);
  const vc = ins ? ins.media.filter((m) => VISUAL_KINDS.includes(m.kind)).length : 0;
  const left = 7 - vc;

  const upload = async (slot: InspectionMediaKind, uri: string, mime?: string | null) => {
    if (!ins) return;
    setUploads((u) => ({ ...u, [slot]: 0 }));
    try {
      await Insp.uploadInspectionMedia(ins.id, slot, uri, mime || 'image/jpeg', (pct) => setUploads((u) => ({ ...u, [slot]: pct })));
      haptic('success');
      await reload();
    } catch (e: any) {
      showToast(e?.message || t('errorGeneric'), 'error');
    } finally {
      setUploads((u) => {
        const n = { ...u };
        delete n[slot];
        return n;
      });
    }
  };

  // Captura con la cámara nativa de iOS (confiable).
  const capture = async (slot: InspectionMediaKind) => {
    if (!editable) {
      showToast(t.locale === 'es' ? 'Esta inspección es de solo lectura' : 'This inspection is read-only', 'warn');
      return;
    }
    if (uploads[slot] != null) return;
    const cam = await ImagePicker.requestCameraPermissionsAsync();
    if (!cam.granted) {
      showToast(t('camUnavailable'), 'warn');
      return;
    }
    const res = await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], quality: 0.8 });
    if (res.canceled || !res.assets?.[0]) return;
    const a = res.assets[0];
    upload(slot, a.uri, a.mimeType);
  };

  return (
    <View>
      {editable && (
        <View style={{ flexDirection: 'row', gap: 10, marginBottom: 16 }}>
          {([
            { key: 'phone', icon: 'camera' as IconName, label: es ? 'Cámara del móvil' : 'Phone camera' },
            { key: 'insta360', icon: 'scan' as IconName, label: 'Insta360 · 360°' },
          ] as const).map((opt) => {
            const active = method === opt.key;
            return (
              <Tap key={opt.key} onPress={() => setMethod(opt.key)} hapticKind="light" style={{ flex: 1 }}>
                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 8,
                    height: 46,
                    borderRadius: radius.md,
                    borderWidth: 1.5,
                    borderColor: active ? colors.navy500 : colors.line,
                    backgroundColor: active ? alpha(colors.navy500, 0.08) : colors.surface,
                  }}
                >
                  <Icon name={opt.icon} size={17} color={active ? colors.navy500 : colors.ink50} />
                  <AppText weight="600" style={{ fontSize: 13, color: active ? colors.navy500 : colors.ink60 }}>
                    {opt.label}
                  </AppText>
                </View>
              </Tap>
            );
          })}
        </View>
      )}

      {method === 'insta360' ? (
        <Insta360Capture
          inspectionId={ins?.id ?? null}
          editable={editable}
          onUploaded={reload}
          existingPano={ins?.media.find((m) => m.kind === 'panorama_360') ?? null}
          onComplete={async () => {
            if (!ins) return;
            try {
              await Insp.completeVisual(ins.id);
              showToast(t('refuelInspection'), 'info');
              onChanged();
            } catch (e: any) {
              showToast(e?.message || t('errorGeneric'), 'error');
            }
          }}
        />
      ) : (
        <>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
            {PHOTO_SLOTS.map((slot) => {
              const data = byKind[slot.key];
              const up = uploads[slot.key];
              const full = slot.key === 'interior';
              return (
                <PhotoTile
                  key={slot.key}
                  label={t.slot(slot.key)}
                  data={data}
                  uploading={up}
                  editable={editable}
                  full={full}
                  onPress={() => capture(slot.key)}
                />
              );
            })}
          </View>

          {editable && (
            <View style={{ marginTop: 18, gap: 10 }}>
              <Button
                disabled={vc < 7}
                icon="check"
                onPress={async () => {
                  if (!ins) return;
                  try {
                    await Insp.completeVisual(ins.id);
                    showToast(t('refuelInspection'), 'info');
                    onChanged();
                  } catch (e: any) {
                    showToast(e?.message || t('errorGeneric'), 'error');
                  }
                }}
              >
                {t('completeVisual')} {vc < 7 ? `(${left})` : ''}
              </Button>
              <Button variant="danger" icon="alert" onPress={() => setUnavailOpen(true)}>
                {t('markUnavailable')}
              </Button>
            </View>
          )}
        </>
      )}

      {/* Marcar NO DISPONIBLE — motivo obligatorio */}
      <Sheet open={unavailOpen} onClose={() => !unavailBusy && setUnavailOpen(false)} title={t('markUnavailable')}>
        <View style={{ gap: 14 }}>
          <AppText style={{ fontSize: 13.5, color: colors.ink60, lineHeight: 19 }}>
            {t('markUnavailableHint')}
          </AppText>
          <Field
            label={t('reason')}
            value={unavailReason}
            onChangeText={setUnavailReason}
            placeholder={t('reasonPlaceholder')}
            autoCapitalize="sentences"
            autoFocus
          />
          <Button
            variant="danger"
            icon="alert"
            disabled={!unavailReason.trim() || unavailBusy}
            onPress={async () => {
              if (!ins || !unavailReason.trim()) return;
              setUnavailBusy(true);
              try {
                await Insp.markUnavailable(ins.id, unavailReason.trim());
                showToast(t('markedUnavailable'), 'success');
                setUnavailOpen(false);
                setUnavailReason('');
                onChanged();
              } catch (e: any) {
                showToast(e?.message || t('errorGeneric'), 'error');
              } finally {
                setUnavailBusy(false);
              }
            }}
          >
            {t('markUnavailable')}
          </Button>
        </View>
      </Sheet>
    </View>
  );
}

function PhotoTile({
  label,
  data,
  uploading,
  editable,
  full,
  onPress,
}: {
  label: string;
  data: string | null | undefined;
  uploading?: number;
  editable: boolean;
  full?: boolean;
  onPress: () => void;
}) {
  const { t } = useApp();
  const has = !!data;
  // Dimensiones en píxeles explícitas (aspectRatio + % colapsaba dentro del wrap).
  const gridW = Dimensions.get('window').width - 32; // padding 16*2
  const colW = (gridW - 10) / 2; // dos columnas, gap 10
  const w = full ? gridW : colW;
  const h = full ? Math.round(gridW / 2) : Math.round(colW * 0.81);
  return (
    <Tap
      onPress={onPress}
      hapticKind={null}
      style={{
        width: w,
        height: h,
        borderRadius: 16,
        overflow: 'hidden',
        backgroundColor: has ? '#1c2740' : colors.surface,
        borderWidth: has ? 0 : 1.5,
        borderColor: colors.line,
        borderStyle: has ? 'solid' : 'dashed',
      }}
    >
      {has && uploading == null && <RemoteImage url={data!} />}
      <View style={{ position: 'absolute', top: 8, left: 8, flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: has ? 'rgba(8,14,33,0.55)' : 'transparent', paddingHorizontal: has ? 8 : 0, paddingVertical: has ? 4 : 0, borderRadius: 999 }}>
        {has && <CheckMark size={13} color={colors.success} />}
        <AppText weight="600" style={{ fontSize: 11, color: has ? '#fff' : colors.ink50 }}>
          {label}
        </AppText>
      </View>
      {!has && uploading == null && (
        <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center' }}>
          <View style={{ width: 38, height: 38, borderRadius: 11, backgroundColor: editable ? alpha(colors.accent, 0.12) : colors.bg, alignItems: 'center', justifyContent: 'center' }}>
            <Icon name="camera" size={20} color={editable ? colors.accent : colors.ink30} />
          </View>
        </View>
      )}
      {uploading != null && (
        <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(13,27,61,0.86)', alignItems: 'center', justifyContent: 'center', gap: 9, padding: 14 }}>
          <Icon name="upload" size={20} color="#fff" />
          <View style={{ width: '78%' }}>
            <Progress value={uploading} color={colors.accent} height={6} />
          </View>
          <AppText weight="700" style={{ color: '#fff', fontSize: 12 }}>
            {t('uploading')} {uploading}%
          </AppText>
        </View>
      )}
      {has && editable && uploading == null && (
        <View style={{ position: 'absolute', bottom: 8, right: 8, width: 30, height: 30, borderRadius: 999, backgroundColor: 'rgba(8,14,33,0.6)', alignItems: 'center', justifyContent: 'center' }}>
          <Icon name="refresh" size={16} color="#fff" />
        </View>
      )}
    </Tap>
  );
}

// ── Paso 2: Refuel ───────────────────────────────────────────
function RefuelPanel({
  c,
  ins,
  editable,
  onChanged,
  reload,
}: {
  c: Container;
  ins: ContainerInspection | null;
  editable: boolean;
  onChanged: () => void;
  reload: () => Promise<void>;
}) {
  const { t, showToast } = useApp();
  const [vup, setVup] = useState<number | null>(null);
  const [sealTop, setSealTop] = useState(ins?.sealTop || '');
  const [sealBottom, setSealBottom] = useState(ins?.sealBottom || '');
  const [fuelLevel, setFuelLevel] = useState(ins?.fuelLevel || '');
  const [inspector, setInspector] = useState(ins?.inspectorName || '');
  const [company, setCompany] = useState(ins?.inspectionCompany || '');
  const [product, setProduct] = useState(ins?.productType || '');

  const video = ins?.media.find((m) => m.kind === 'refuel_video');
  const hasVideo = !!video;
  const videoH = Math.round(((Dimensions.get('window').width - 32) * 9) / 16);
  const canComplete = hasVideo && sealTop.trim() && sealBottom.trim();

  const saveData = async () => {
    if (!ins || !editable) return;
    try {
      await Insp.updateInspection(ins.id, { inspectorName: inspector, inspectionCompany: company, productType: product });
    } catch {}
  };

  const uploadVideo = async (uri: string, mime = 'video/mp4') => {
    if (!ins) return;
    setVup(0);
    try {
      await Insp.uploadInspectionMedia(ins.id, 'refuel_video', uri, mime, (pct) => setVup(pct));
      haptic('success');
      await reload();
    } catch (e: any) {
      showToast(e?.message || t('errorGeneric'), 'error');
    } finally {
      setVup(null);
    }
  };

  // Graba el video con la cámara nativa de iOS (confiable).
  const recordVideo = async () => {
    if (!editable) return;
    const cam = await ImagePicker.requestCameraPermissionsAsync();
    if (!cam.granted) {
      showToast(t('camUnavailable'), 'warn');
      return;
    }
    const res = await ImagePicker.launchCameraAsync({
      mediaTypes: ['videos'],
      videoMaxDuration: 120,
      quality: 1,
    });
    if (res.canceled || !res.assets?.[0]) return;
    const a = res.assets[0];
    uploadVideo(a.uri, a.mimeType || 'video/quicktime');
  };

  return (
    <View style={{ gap: 16 }}>
      {/* video */}
      <View>
        <PanelLabel icon="video" text={t('refuelVideo')} req={t('required')} />
        {!hasVideo && vup == null && (
          <Tap onPress={recordVideo} hapticKind={null} style={{ width: '100%', height: videoH, borderRadius: radius.lg, borderWidth: 1.5, borderColor: colors.line, borderStyle: 'dashed', backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center', gap: 10 }}>
            <View style={{ width: 52, height: 52, borderRadius: 999, backgroundColor: alpha(colors.error, 0.12), alignItems: 'center', justifyContent: 'center' }}>
              <Icon name="video" size={26} color={colors.error} />
            </View>
            <AppText weight="600" style={{ fontSize: 14, color: colors.ink70 }}>
              {t('recordVideo')}
            </AppText>
            <AppText style={{ fontSize: 11.5, color: colors.ink40 }}>mp4 · ≤500MB</AppText>
          </Tap>
        )}
        {vup != null && (
          <View style={{ width: '100%', height: videoH, borderRadius: radius.lg, backgroundColor: 'rgba(13,27,61,0.9)', alignItems: 'center', justifyContent: 'center', gap: 12, padding: 20 }}>
            <Icon name="upload" size={26} color="#fff" />
            <View style={{ width: '70%' }}>
              <Progress value={vup} color={colors.accent} height={8} />
            </View>
            <AppText weight="700" style={{ color: '#fff', fontSize: 13 }}>
              {t('uploading')} · {vup}%
            </AppText>
          </View>
        )}
        {hasVideo && video?.url && (
          <View style={{ borderRadius: radius.lg, overflow: 'hidden', height: videoH, backgroundColor: '#1c2740' }}>
            <VideoPreview uri={video.url} height={videoH} />
            <View style={{ position: 'absolute', top: 10, left: 10, flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: 'rgba(16,185,129,0.92)', paddingHorizontal: 9, paddingVertical: 4, borderRadius: 999 }}>
              <CheckMark size={13} />
              <AppText weight="700" style={{ color: '#fff', fontSize: 11.5 }}>
                {t('refuelVideo')}
              </AppText>
            </View>
            {editable && (
              <Tap
                onPress={async () => {
                  if (!ins || !video) return;
                  try {
                    await Insp.deleteInspectionMedia(ins.id, video.id);
                    await reload();
                  } catch {}
                }}
                style={{ position: 'absolute', top: 8, right: 8, width: 30, height: 30, borderRadius: 999, backgroundColor: 'rgba(8,14,33,0.6)', alignItems: 'center', justifyContent: 'center' }}
              >
                <Icon name="trash" size={16} color="#fff" />
              </Tap>
            )}
          </View>
        )}
      </View>

      {/* seals */}
      <View style={{ flexDirection: 'row', gap: 12 }}>
        <View style={{ flex: 1 }}>
          <PanelLabel icon="seal" text={t('sealTop')} req={t('required')} />
          <Field value={sealTop} onChangeText={(v) => setSealTop(v.toUpperCase())} placeholder="SL-•••••" invalid={editable && !sealTop.trim()} />
        </View>
        <View style={{ flex: 1 }}>
          <PanelLabel icon="seal" text={t('sealBottom')} req={t('required')} />
          <Field value={sealBottom} onChangeText={(v) => setSealBottom(v.toUpperCase())} placeholder="SL-•••••" invalid={editable && !sealBottom.trim()} />
        </View>
      </View>

      {/* fuel level */}
      <View>
        <PanelLabel icon="fuel" text={t('fuelLevel')} />
        <View style={{ flexDirection: 'row', gap: 8 }}>
          {['25%', '50%', '75%', '98%', '100%'].map((lv) => {
            const on = fuelLevel === lv;
            return (
              <Tap
                key={lv}
                hapticKind="select"
                onPress={() => editable && setFuelLevel(lv)}
                style={{ flex: 1, height: 46, borderRadius: 12, alignItems: 'center', justifyContent: 'center', overflow: 'hidden', backgroundColor: on ? 'transparent' : colors.surface, borderWidth: on ? 0 : 1.5, borderColor: colors.line }}
              >
                {on && <LinearGradient colors={gradients.navy} style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }} />}
                <AppText weight="700" style={{ fontSize: 13.5, color: on ? '#fff' : colors.ink60 }}>
                  {lv}
                </AppText>
              </Tap>
            );
          })}
        </View>
      </View>

      {/* inspector data */}
      <Card pad={16}>
        <DataField label={t('inspector')} value={inspector} onChangeText={setInspector} onBlur={saveData} editable={editable} placeholder="M. Rivas" />
        <DataField label={t('company')} value={company} onChangeText={setCompany} onBlur={saveData} editable={editable} placeholder="SGS" />
        <DataField label={t('product')} value={product} onChangeText={setProduct} onBlur={saveData} editable={editable} placeholder="Diesel B5" last />
      </Card>

      {editable && (
        <>
          <Button
            disabled={!canComplete}
            icon="check"
            onPress={async () => {
              if (!ins) return;
              try {
                await saveData();
                await Insp.completeRefuel(ins.id, { sealTop: sealTop.trim(), sealBottom: sealBottom.trim(), fuelLevel: fuelLevel || undefined });
                showToast(t('labelAvailable'), 'success');
                onChanged();
              } catch (e: any) {
                showToast(e?.message || t('errorGeneric'), 'error');
              }
            }}
          >
            {t('completeRefuel')}
          </Button>
          {!canComplete && (
            <AppText weight="600" style={{ textAlign: 'center', fontSize: 12.5, color: colors.amber, marginTop: -8 }}>
              {!hasVideo ? t('videoRequired') : t('sealRequired')}
            </AppText>
          )}
        </>
      )}
    </View>
  );
}

function PanelLabel({ icon, text, req }: { icon: IconName; text: string; req?: string }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 9, marginLeft: 2 }}>
      <Icon name={icon} size={17} color={colors.navy700} />
      <AppText weight="600" style={{ color: colors.ink, fontSize: 14 }}>
        {text}
      </AppText>
      {req ? (
        <View style={{ backgroundColor: alpha(req.length > 8 ? colors.ink40 : colors.error, 0.12), paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 }}>
          <AppText weight="700" style={{ color: req.length > 8 ? colors.ink40 : colors.error, fontSize: 8, letterSpacing: 0.4 }}>
            {req.toUpperCase()}
          </AppText>
        </View>
      ) : null}
    </View>
  );
}

function DataField({
  label,
  value,
  onChangeText,
  onBlur,
  editable,
  placeholder,
  last,
}: {
  label: string;
  value: string;
  onChangeText: (v: string) => void;
  onBlur?: () => void;
  editable: boolean;
  placeholder?: string;
  last?: boolean;
}) {
  return (
    <View style={{ paddingBottom: last ? 0 : 14, marginBottom: last ? 0 : 0, borderBottomWidth: last ? 0 : 1, borderBottomColor: colors.line }}>
      <Field label={label} value={value} onChangeText={onChangeText} onBlur={onBlur} placeholder={placeholder} />
    </View>
  );
}

// ── Paso 3: Etiqueta + disponible ────────────────────────────
function LabelPanel({ c, ins, onChanged }: { c: Container; ins: ContainerInspection | null; onChanged: () => void }) {
  const { t, showToast } = useApp();
  const [label, setLabel] = useState<InspectionLabelData | null>(null);
  const [labelError, setLabelError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const labelRef = useRef<View>(null);
  const isAvailable = ['available', 'in_transit', 'in_vessel', 'delivered'].includes(c.status);
  const es = t.locale === 'es';

  const loadLabel = useCallback(() => {
    if (!ins) {
      // Sin inspección abierta no se puede generar la etiqueta: NO la marcamos
      // como hecha, mostramos un error claro de inspección incompleta.
      setLabelError(es ? 'Inspección no completada.' : 'Inspection not completed.');
      return;
    }
    setLabelError(null);
    setLabel(null);
    Insp.getInspectionLabel(ins.id)
      .then(setLabel)
      .catch((e: any) => setLabelError(e?.message || t('errorGeneric')));
  }, [ins, es, t]);

  useEffect(() => {
    loadLabel();
  }, [loadLabel]);

  // Captura la etiqueta renderizada (con QR + barcode reales) como PNG.
  const capture = async (result: 'tmpfile' | 'data-uri') => {
    return captureRef(labelRef, { format: 'png', quality: 1, result });
  };

  const onShare = async () => {
    if (busy) return;
    setBusy(true);
    try {
      const uri = await capture('tmpfile');
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri, { mimeType: 'image/png', dialogTitle: t('thermalLabel') });
      }
    } catch (e: any) {
      showToast(e?.message || t('errorGeneric'), 'error');
    } finally {
      setBusy(false);
    }
  };

  const onPrint = async () => {
    if (busy) return;
    setBusy(true);
    try {
      const dataUri = await capture('data-uri');
      await Print.printAsync({
        html: `<html><body style="margin:0;display:flex;align-items:center;justify-content:center;padding:24px"><img src="${dataUri}" style="width:100%;max-width:520px"/></body></html>`,
      });
    } catch (e: any) {
      showToast(e?.message || t('errorGeneric'), 'error');
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={{ gap: 16 }}>
      <View>
        <PanelLabel icon="printer" text={t('thermalLabel')} />
        {/* ref para capturar la etiqueta como imagen al imprimir/compartir */}
        <View ref={labelRef} collapsable={false} style={{ backgroundColor: '#fff', borderRadius: radius.lg }}>
          {label ? (
            <ThermalLabel data={label} t={t} />
          ) : labelError ? (
            <View style={{ alignItems: 'center', gap: 12, paddingVertical: 26, paddingHorizontal: 20 }}>
              <Icon name="alert" size={26} color={colors.amber} />
              <AppText style={{ color: colors.ink60, fontSize: 13, textAlign: 'center' }}>
                {labelError}
              </AppText>
              <Tap onPress={loadLabel} hapticKind="light">
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 7, paddingVertical: 9, paddingHorizontal: 18, borderRadius: radius.md, borderWidth: 1.5, borderColor: colors.line }}>
                  <Icon name="refresh" size={16} color={colors.navy500} />
                  <AppText weight="600" style={{ color: colors.navy500, fontSize: 13.5 }}>
                    {es ? 'Reintentar' : 'Retry'}
                  </AppText>
                </View>
              </Tap>
            </View>
          ) : (
            <ActivityIndicator color={colors.navy500} style={{ marginVertical: 20 }} />
          )}
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 10 }}>
          <Icon name="qr" size={14} color={colors.ink40} />
          <AppText style={{ color: colors.ink40, fontSize: 11.5 }}>{t('scanToView')}</AppText>
        </View>
      </View>

      <View style={{ flexDirection: 'row', gap: 12 }}>
        <Button variant="outline" icon="share" onPress={onShare} loading={busy} style={{ flex: 1 }}>
          {es ? 'Compartir' : 'Share'}
        </Button>
        <Button variant="primary" icon="printer" onPress={onPrint} loading={busy} style={{ flex: 1 }}>
          {es ? 'Imprimir' : 'Print'}
        </Button>
      </View>

      <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 10, backgroundColor: alpha(colors.amber, 0.11), borderRadius: 14, padding: 14 }}>
        <Icon name="info" size={18} color={colors.amber} />
        <AppText weight="500" style={{ flex: 1, fontSize: 12.5, color: colors.ink70, lineHeight: 19 }}>
          {t('coaLater')}
        </AppText>
      </View>

      {!isAvailable && c.status !== 'returning' && (
        <Button
          variant="success"
          icon="checkCircle"
          onPress={async () => {
            if (!ins) return;
            try {
              await Insp.markAvailable(ins.id);
              showToast(t('available'), 'success');
              onChanged();
            } catch (e: any) {
              showToast(e?.message || t('errorGeneric'), 'error');
            }
          }}
        >
          {t('markAvailable')}
        </Button>
      )}
      {isAvailable && (
        <View style={{ gap: 11 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: alpha(colors.success, 0.12), borderRadius: 14, padding: 13 }}>
            <CheckMark size={20} color={colors.success} />
            <AppText weight="600" style={{ fontSize: 14, color: colors.success }}>
              {t.status('available')}
            </AppText>
          </View>
          {c.status === 'available' && (
            <Button
              icon="truck"
              onPress={async () => {
                try {
                  await Insp.markDelivered(c.id);
                  showToast(`${t('delivered')} → ${t.status('returning')}`, 'info');
                  onChanged();
                } catch (e: any) {
                  showToast(e?.message || t('errorGeneric'), 'error');
                }
              }}
            >
              {t('markDelivered')}
            </Button>
          )}
        </View>
      )}
    </View>
  );
}

// Preview de video con controles nativos (expo-video).
function VideoPreview({ uri, height }: { uri: string; height: number }) {
  const player = useVideoPlayer(uri, (p) => {
    p.loop = false;
    p.muted = false;
  });
  return <VideoView player={player} style={{ width: '100%', height }} contentFit="cover" nativeControls />;
}
