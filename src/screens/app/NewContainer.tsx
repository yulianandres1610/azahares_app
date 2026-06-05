// Wizard "Nuevo contenedor" (4 pasos) con creación real + fotos.
import React, { useState } from 'react';
import { Image, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { alpha, colors, gradients, radius, shadows } from '../../theme/tokens';
import { Icon, IconName } from '../../components/Icon';
import { AppText, Button, Card, CheckMark, Field, IconButton, Screen, Segmented, Tap, haptic } from '../../components/ui';
import { Stepper } from '../../components/Stepper';
import { CameraCapture } from '../../components/Camera';
import { TYPES } from '../../domain';
import { useApp } from '../../store/AppContext';
import { useNav } from '../../store/ShellNav';
import { createContainer, uploadContainerImage } from '../../lib/api/containers';
import { startInspection } from '../../lib/api/inspections';

export function NewContainer({ onClose }: { onClose: () => void }) {
  const { t, refreshContainers, showToast } = useApp();
  const nav = useNav();
  const insets = useSafeAreaInsets();
  const [step, setStep] = useState(0);
  const [busy, setBusy] = useState(false);
  const [cam, setCam] = useState<number | null>(null);
  const [d, setD] = useState({
    number: '',
    type: 'fuel',
    size: '20ft',
    capacity: '',
    unit: 'L',
    tare: '',
    tareUnit: 'kg',
    ownership: 'owned',
    price: '',
    currency: 'USD',
    photos: [null, null, null, null] as (string | null)[],
  });
  const set = (k: keyof typeof d, v: any) => setD((p) => ({ ...p, [k]: v }));

  const pickType = (ty: string) => {
    haptic('select');
    setD((p) => ({ ...p, type: ty, unit: ty === 'fuel' ? (p.unit === 'gal' ? 'gal' : 'L') : ['m³', 'kg'].includes(p.unit) ? p.unit : 'm³' }));
  };
  const unitOptions = d.type === 'fuel' ? ['L', 'gal'] : ['m³', 'kg'];
  const photoCount = d.photos.filter(Boolean).length;
  const SIDES = [t('sideFront'), t('sideRight'), t('sideBack'), t('sideLeft')];
  const steps = [t('identity'), t('spec'), t('ownerShort'), t('review')];
  const LAST = 3;
  const canNext = step === 0 ? d.number.trim().length >= 4 : step === 1 ? !!(d.capacity && d.tare) : step === 2 ? !!String(d.price).trim() : photoCount === 4;

  const next = () => {
    if (step < LAST) {
      haptic('light');
      setStep(step + 1);
    } else {
      create();
    }
  };

  const create = async () => {
    setBusy(true);
    try {
      const container = await createContainer({
        number: d.number,
        type: d.type,
        size: d.size,
        capacity: Number(d.capacity),
        unit: d.unit,
        tare: Number(d.tare),
        tareUnit: d.tareUnit,
        ownership: d.ownership,
        price: d.price ? Number(d.price) : null,
        currency: d.currency,
      });
      // subir las 4 fotos de registro
      for (const uri of d.photos) {
        if (uri) {
          try {
            await uploadContainerImage(container.id, uri, 'image/jpeg');
          } catch {}
        }
      }
      // iniciar el ciclo de inspección (primer estado: visual)
      try {
        await startInspection(container.id);
      } catch {}
      haptic('success');
      showToast(`${d.number} · ${t('visualInspection')}`, 'success');
      await refreshContainers();
      onClose();
      nav.openOverlay({ type: 'detail', id: container.id });
    } catch (e: any) {
      haptic('warn');
      showToast(e?.message || t('errorGeneric'), 'error');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen bg={colors.bg} padBottom={0} contentStyle={{ paddingBottom: 120 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'flex-end', paddingHorizontal: 16, paddingTop: 6, paddingBottom: 12 }}>
        <IconButton name="x" variant="plain" onPress={onClose} />
      </View>

      <View style={{ paddingHorizontal: 16, paddingBottom: 16 }}>
        <Stepper steps={steps} current={step} onPick={(i) => i <= step && setStep(i)} large />
      </View>

      <View style={{ paddingHorizontal: 16 }}>
        {step === 0 && (
          <View style={{ gap: 20 }}>
            <Field label={t('number')} icon="box" placeholder="AZ-IT-204XXX" value={d.number} onChangeText={(v) => set('number', v.toUpperCase())} autoFocus />
            <View>
              <AppText weight="600" style={{ fontSize: 13, color: colors.ink60, marginBottom: 9, marginLeft: 2 }}>
                {t('type')}
              </AppText>
              <View style={{ flexDirection: 'row', gap: 10 }}>
                {['fuel', 'dry', 'reefer'].map((ty) => {
                  const on = d.type === ty;
                  return (
                    <Tap key={ty} onPress={() => pickType(ty)} hapticKind={null} style={{ flex: 1, borderRadius: radius.md, overflow: 'hidden', ...(on ? shadows.sm : {}) }}>
                      <View style={{ paddingVertical: 16, paddingHorizontal: 8, alignItems: 'center', gap: 9, backgroundColor: on ? 'transparent' : colors.surface, borderWidth: on ? 0 : 1.5, borderColor: colors.line, borderRadius: radius.md }}>
                        {on && <LinearGradient colors={gradients.navy} style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }} />}
                        <Icon name={TYPES[ty].icon} size={26} color={on ? '#fff' : colors.ink60} />
                        <AppText weight="600" style={{ fontSize: 13, color: on ? '#fff' : colors.ink60 }}>
                          {t(ty)}
                        </AppText>
                      </View>
                    </Tap>
                  );
                })}
              </View>
            </View>
          </View>
        )}

        {step === 1 && (
          <View style={{ gap: 20 }}>
            <View>
              <AppText weight="600" style={{ fontSize: 13, color: colors.ink60, marginBottom: 9, marginLeft: 2 }}>
                {t('size')}
              </AppText>
              <Segmented options={['20ft', '40ft', '45ft']} value={d.size} onChange={(v) => set('size', v)} />
            </View>
            <View style={{ flexDirection: 'row', gap: 12 }}>
              <View style={{ flex: 1.6 }}>
                <Field label={t('capacity')} icon="droplet" placeholder="24000" value={d.capacity} onChangeText={(v) => set('capacity', v.replace(/\D/g, ''))} keyboardType="number-pad" />
              </View>
              <View style={{ flex: 1 }}>
                <AppText weight="600" style={{ fontSize: 13, color: colors.ink60, marginBottom: 9, marginLeft: 2 }}>
                  {t('unit')}
                </AppText>
                <Segmented options={unitOptions} value={d.unit} onChange={(v) => set('unit', v)} />
              </View>
            </View>
            <View style={{ flexDirection: 'row', gap: 12 }}>
              <View style={{ flex: 1.6 }}>
                <Field label={t('tareWeight')} icon="cube" placeholder="3850" value={d.tare} onChangeText={(v) => set('tare', v.replace(/\D/g, ''))} keyboardType="number-pad" />
              </View>
              <View style={{ flex: 1 }}>
                <AppText weight="600" style={{ fontSize: 13, color: colors.ink60, marginBottom: 9, marginLeft: 2 }}>
                  {t('unit')}
                </AppText>
                <Segmented options={['kg', 'lb']} value={d.tareUnit} onChange={(v) => set('tareUnit', v)} />
              </View>
            </View>
          </View>
        )}

        {step === 2 && (
          <View style={{ gap: 22 }}>
            <View style={{ flexDirection: 'row', gap: 12 }}>
              {(['owned', 'rented'] as const).map((o) => {
                const on = d.ownership === o;
                const ic: IconName = o === 'owned' ? 'key' : 'history';
                return (
                  <Tap key={o} onPress={() => { haptic('select'); set('ownership', o); }} hapticKind={null} style={{ flex: 1, borderRadius: radius.lg, overflow: 'hidden', ...(on ? shadows.card : {}) }}>
                    <View style={{ minHeight: 120, padding: 16, justifyContent: 'space-between', backgroundColor: on ? 'transparent' : colors.surface, borderWidth: on ? 0 : 1.5, borderColor: colors.line, borderRadius: radius.lg }}>
                      {on && <LinearGradient colors={gradients.navy} style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }} />}
                      <View style={{ width: 42, height: 42, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: on ? 'rgba(255,255,255,0.16)' : alpha(colors.accent, 0.12) }}>
                        <Icon name={ic} size={22} color={on ? '#fff' : colors.accent} />
                      </View>
                      <View>
                        <AppText weight="700" style={{ fontSize: 15.5, color: on ? '#fff' : colors.ink }}>
                          {t(o)}
                        </AppText>
                        <AppText style={{ fontSize: 11.5, color: on ? 'rgba(255,255,255,0.82)' : colors.ink50, marginTop: 3 }}>
                          {t(o === 'owned' ? 'ownedDesc' : 'rentedDesc')}
                        </AppText>
                      </View>
                    </View>
                  </Tap>
                );
              })}
            </View>
            <View style={{ flexDirection: 'row', gap: 12 }}>
              <View style={{ flex: 1.6 }}>
                <Field label={d.ownership === 'owned' ? t('purchasePrice') : t('monthlyRate')} icon="dollar" placeholder="12500" value={d.price} onChangeText={(v) => set('price', v.replace(/[^\d]/g, ''))} keyboardType="number-pad" />
              </View>
              <View style={{ flex: 1 }}>
                <AppText weight="600" style={{ fontSize: 13, color: colors.ink60, marginBottom: 9, marginLeft: 2 }}>
                  {t('currency')}
                </AppText>
                <Segmented options={['USD', 'EUR', 'MXN']} value={d.currency} onChange={(v) => set('currency', v)} />
              </View>
            </View>
          </View>
        )}

        {step === 3 && (
          <View style={{ gap: 16 }}>
            <Card pad={0}>
              <ReviewRow icon="box" label={t('number')} value={d.number || '—'} />
              <ReviewRow icon={TYPES[d.type].icon} label={t('type')} value={`${t(d.type)} · ${d.size}`} />
              <ReviewRow icon="droplet" label={t('capacity')} value={`${Number(d.capacity || 0).toLocaleString()} ${d.unit}`} />
              <ReviewRow icon="cube" label={t('tare')} value={`${Number(d.tare || 0).toLocaleString()} ${d.tareUnit}`} />
              <ReviewRow icon={d.ownership === 'owned' ? 'key' : 'history'} label={t('ownership')} value={t(d.ownership)} />
              <ReviewRow icon="dollar" label={d.ownership === 'owned' ? t('purchasePrice') : t('monthlyRate')} value={d.price ? `${Number(d.price).toLocaleString()} ${d.currency}` : '—'} last />
            </Card>

            <View>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10, marginLeft: 2 }}>
                <AppText weight="600" style={{ fontSize: 13, color: colors.ink60 }}>
                  {t('containerPhotos')}
                </AppText>
                <AppText weight="700" style={{ fontSize: 11.5, color: photoCount === 4 ? colors.success : colors.error }}>
                  {photoCount}/4
                </AppText>
              </View>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
                {SIDES.map((label, i) => {
                  const data = d.photos[i];
                  return (
                    <Tap key={i} onPress={() => setCam(i)} hapticKind={null} style={{ width: '48%', aspectRatio: 4 / 3.1, borderRadius: 16, overflow: 'hidden', backgroundColor: data ? '#1c2740' : colors.surface, borderWidth: data ? 0 : 1.5, borderColor: colors.line, borderStyle: data ? 'solid' : 'dashed' }}>
                      {data && <Image source={{ uri: data }} style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }} resizeMode="cover" />}
                      <View style={{ position: 'absolute', top: 8, left: 8, flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: data ? 'rgba(8,14,33,0.55)' : 'transparent', paddingHorizontal: data ? 8 : 0, paddingVertical: data ? 4 : 0, borderRadius: 999 }}>
                        {data && <CheckMark size={13} color={colors.success} />}
                        <AppText weight="600" style={{ fontSize: 11, color: data ? '#fff' : colors.ink50 }}>
                          {label}
                        </AppText>
                      </View>
                      {!data && (
                        <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center' }}>
                          <View style={{ width: 38, height: 38, borderRadius: 11, backgroundColor: alpha(colors.accent, 0.12), alignItems: 'center', justifyContent: 'center' }}>
                            <Icon name="camera" size={20} color={colors.accent} />
                          </View>
                        </View>
                      )}
                    </Tap>
                  );
                })}
              </View>
            </View>

            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 4 }}>
              <Icon name="info" size={16} color={colors.accent} />
              <AppText weight="500" style={{ color: colors.accent, fontSize: 13 }}>
                {t('createSub')}
              </AppText>
            </View>
          </View>
        )}
      </View>

      {/* footer fijo */}
      <View style={{ position: 'absolute', left: 0, right: 0, bottom: 0, paddingHorizontal: 16, paddingTop: 16, paddingBottom: insets.bottom + 16, backgroundColor: colors.bg }}>
        <Button onPress={next} disabled={!canNext} loading={busy} variant={step === LAST ? 'success' : 'primary'} icon={step === LAST ? 'check' : undefined} iconRight={step < LAST ? 'arrowR' : undefined}>
          {step === LAST ? t('create') : t('next')}
        </Button>
      </View>

      {cam !== null && (
        <CameraCapture
          mode="photo"
          title={t('containerPhotos')}
          hint={SIDES[cam]}
          onClose={() => setCam(null)}
          onCapture={(uri) => {
            const i = cam;
            setD((p) => {
              const ph = [...p.photos];
              ph[i] = uri;
              return { ...p, photos: ph };
            });
            setCam(null);
          }}
        />
      )}
    </Screen>
  );
}

function ReviewRow({ icon, label, value, last }: { icon: IconName; label: string; value: string; last?: boolean }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 14, paddingHorizontal: 16, borderBottomWidth: last ? 0 : 1, borderBottomColor: colors.line }}>
      <View style={{ width: 34, height: 34, borderRadius: 10, backgroundColor: alpha(colors.navy500, 0.11), alignItems: 'center', justifyContent: 'center' }}>
        <Icon name={icon} size={18} color={colors.navy700} />
      </View>
      <AppText weight="500" style={{ fontSize: 13.5, color: colors.ink50 }}>
        {label}
      </AppText>
      <AppText weight="600" style={{ flex: 1, textAlign: 'right', fontSize: 14.5, color: colors.ink }}>
        {value}
      </AppText>
    </View>
  );
}
