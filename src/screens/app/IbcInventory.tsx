// Inventario de IBC totes (1000L): listar, crear (uno o varios), tomar fotos
// de inspección e imprimir la etiqueta con QR + código de barras. Flujo
// autocontenido (lista / crear / detalle) bajo un solo overlay.
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Image, RefreshControl, ScrollView, Share, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { captureRef } from 'react-native-view-shot';
import QRCode from 'react-native-qrcode-svg';
import { alpha, colors, fonts, radius, shadows } from '../../theme/tokens';
import { Icon, IconName } from '../../components/Icon';
import { AppText, Button, Card, Chip, EnterUp, Field, Header, IconButton, Screen, Skeleton, Tap, haptic } from '../../components/ui';
import { Barcode } from '../../components/Label';
import { RemoteImage } from '../../components/RemoteImage';
import { useApp } from '../../store/AppContext';
import { PUBLIC_WEB_URL } from '../../config';
import {
  createIbcs, deleteIbc, deleteIbcMedia, getIbc, getIbcLabel, listIbcs, updateIbc, uploadIbcMedia,
  type IbcItem, type IbcLabelData, type IbcListItem, type IbcMediaKind, type IbcStatus,
} from '../../lib/api/ibcs';
import { isIbcProduct, listSupplierProducts, type SupplierProduct } from '../../lib/api/products';

const STATUS: Record<IbcStatus, { label: string; color: string }> = {
  created: { label: 'Creado', color: colors.amber },
  available: { label: 'Disponible', color: colors.success },
  in_container: { label: 'En contenedor', color: colors.navy700 },
  damaged: { label: 'Dañado', color: colors.error },
  delivered: { label: 'Entregado', color: colors.ink40 },
};
const STATUS_KEYS = Object.keys(STATUS) as IbcStatus[];

type IbcView = { v: 'list' } | { v: 'new' } | { v: 'detail'; id: string };

export function IbcInventory({ onClose }: { onClose: () => void }) {
  const [view, setView] = useState<IbcView>({ v: 'list' });
  const [nonce, setNonce] = useState(0); // fuerza refetch de la lista
  const bump = () => setNonce((n) => n + 1);

  if (view.v === 'new') {
    return <IbcNew onClose={() => setView({ v: 'list' })} onCreated={(id) => { bump(); setView(id ? { v: 'detail', id } : { v: 'list' }); }} />;
  }
  if (view.v === 'detail') {
    return <IbcDetail id={view.id} onClose={() => { bump(); setView({ v: 'list' }); }} />;
  }
  return (
    <IbcList
      nonce={nonce}
      onClose={onClose}
      onNew={() => setView({ v: 'new' })}
      onOpen={(id) => setView({ v: 'detail', id })}
    />
  );
}

// ── Lista / inventario ───────────────────────────────────────────
function IbcList({ nonce, onClose, onNew, onOpen }: { nonce: number; onClose: () => void; onNew: () => void; onOpen: (id: string) => void }) {
  const [items, setItems] = useState<IbcListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [q, setQ] = useState('');
  const [filter, setFilter] = useState<'all' | IbcStatus>('all');

  const load = useCallback(async () => {
    try { setItems(await listIbcs()); } catch { /* */ } finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load, nonce]);

  const onRefresh = async () => { setRefreshing(true); await load(); setRefreshing(false); };
  const list = items.filter((it) => {
    if (filter !== 'all' && it.status !== filter) return false;
    if (q && !`${it.ibcNumber} ${it.productName ?? ''}`.toLowerCase().includes(q.toLowerCase())) return false;
    return true;
  });

  return (
    <Screen padBottom={24} contentStyle={{ paddingBottom: 40 }} fadeTop>
      <Header
        title="IBC · Inventario"
        subtitle={`${items.length} totes`}
        onBack={onClose}
        right={<IconButton name="plus" variant="soft" onPress={onNew} />}
      />
      <View style={{ paddingHorizontal: 16 }}>
        <Field icon="search" placeholder="Buscar número o producto" value={q} onChangeText={setQ}
          right={q ? <IconButton name="x" variant="plain" iconSize={16} size={32} onPress={() => setQ('')} /> : undefined} />
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 14 }} contentContainerStyle={{ gap: 8, paddingHorizontal: 16, paddingBottom: 6 }}>
        <Chip label="Todos" active={filter === 'all'} count={items.length} onPress={() => setFilter('all')} />
        {STATUS_KEYS.map((k) => {
          const n = items.filter((it) => it.status === k).length;
          if (!n) return null;
          return <Chip key={k} label={STATUS[k].label} active={filter === k} color={STATUS[k].color} count={n} onPress={() => setFilter(k)} />;
        })}
      </ScrollView>

      <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 8, gap: 11, paddingBottom: 40 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.navy700} />}>
        {loading && items.length === 0 ? (
          [0, 1, 2, 3].map((i) => <Skeleton key={i} h={80} r={radius.lg} />)
        ) : list.length === 0 ? (
          <View style={{ alignItems: 'center', paddingVertical: 60 }}>
            <Icon name="cube" size={40} color={colors.ink40} />
            <AppText weight="500" style={{ fontSize: 15, color: colors.ink40, marginTop: 12 }}>{items.length === 0 ? 'Aún no hay IBCs' : 'Sin resultados'}</AppText>
            {items.length === 0 && <View style={{ marginTop: 16, width: 220 }}><Button variant="primary" icon="plus" onPress={onNew}>Crear IBC</Button></View>}
          </View>
        ) : (
          list.map((it, i) => (
            <EnterUp key={it.id} index={i}>
              <Card pad={14} onPress={() => onOpen(it.id)}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 13 }}>
                  <View style={{ width: 46, height: 46, borderRadius: 13, backgroundColor: alpha(colors.navy500, 0.11), alignItems: 'center', justifyContent: 'center' }}>
                    <Icon name="cube" size={22} color={colors.navy700} />
                  </View>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <AppText weight="700" style={{ fontSize: 15, color: colors.ink }}>{it.ibcNumber}</AppText>
                    <AppText weight="600" numberOfLines={1} style={{ fontSize: 12.5, color: colors.ink50, marginTop: 1 }}>{it.productName || '—'} · {Math.round(Number(it.capacityLiters))} L</AppText>
                  </View>
                  <View style={{ alignItems: 'flex-end', gap: 6 }}>
                    <StatusPill status={it.status} />
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                      <Icon name="camera" size={12} color={colors.ink40} />
                      <AppText weight="600" style={{ fontSize: 11, color: colors.ink40 }}>{it.photoCount}</AppText>
                    </View>
                  </View>
                </View>
              </Card>
            </EnterUp>
          ))
        )}
      </ScrollView>
    </Screen>
  );
}

function StatusPill({ status }: { status: IbcStatus }) {
  const m = STATUS[status];
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, height: 22, paddingHorizontal: 9, borderRadius: 999, backgroundColor: alpha(m.color, 0.13) }}>
      <View style={{ width: 6, height: 6, borderRadius: 999, backgroundColor: m.color }} />
      <AppText weight="700" style={{ fontSize: 11, color: m.color }}>{m.label}</AppText>
    </View>
  );
}

// ── Crear IBC(s) ─────────────────────────────────────────────────
function IbcNew({ onClose, onCreated }: { onClose: () => void; onCreated: (firstId: string | null) => void }) {
  const { showToast } = useApp();
  const [products, setProducts] = useState<SupplierProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [productId, setProductId] = useState('');
  const [count, setCount] = useState(1);
  const [seal, setSeal] = useState('');
  const [lot, setLot] = useState('');
  const [notes, setNotes] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    listSupplierProducts()
      .then((all) => {
        const ibc = all.filter(isIbcProduct);
        setProducts(ibc);
        if (ibc[0]) setProductId(ibc[0].id);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const product = products.find((p) => p.id === productId);
  const capacity = product?.innerQuantity ?? 1000;

  const create = async () => {
    if (!productId) { showToast('Elegí un producto', 'error'); return; }
    setBusy(true); haptic('medium');
    try {
      const created = await createIbcs({
        productId,
        count,
        capacityLiters: capacity,
        sealNumber: seal.trim() || undefined,
        lotNumber: lot.trim() || undefined,
        notes: notes.trim() || undefined,
      });
      haptic('success');
      showToast(count > 1 ? `${created.length} IBCs creados` : `${created[0]?.ibcNumber} creado`, 'success');
      onCreated(count === 1 ? created[0]?.id ?? null : null);
    } catch (e: any) {
      showToast(e?.message || 'No se pudo crear', 'error');
    } finally { setBusy(false); }
  };

  return (
    <Screen padBottom={24} contentStyle={{ paddingBottom: 40 }}>
      <Header title="Nuevo IBC" subtitle="Tote 1000 L" onBack={onClose} />
      {loading ? (
        <View style={{ paddingTop: 60, alignItems: 'center' }}><ActivityIndicator color={colors.navy700} /></View>
      ) : products.length === 0 ? (
        <View style={{ paddingTop: 50, alignItems: 'center', paddingHorizontal: 30 }}>
          <Icon name="cube" size={40} color={colors.ink40} />
          <AppText weight="600" style={{ fontSize: 15, color: colors.ink, marginTop: 12, textAlign: 'center' }}>No tenés productos IBC</AppText>
          <AppText style={{ fontSize: 13, color: colors.ink50, marginTop: 4, textAlign: 'center' }}>Configurá un producto con empaque IBC (1000 L) en la web para poder crear totes.</AppText>
        </View>
      ) : (
        <ScrollView contentContainerStyle={{ padding: 16, gap: 16 }} keyboardShouldPersistTaps="handled">
          <View>
            <AppText weight="600" style={{ fontSize: 13, color: colors.ink60, marginBottom: 9, marginLeft: 2 }}>Producto</AppText>
            <View style={{ gap: 8 }}>
              {products.map((p) => {
                const on = p.id === productId;
                return (
                  <Tap key={p.id} hapticKind="select" onPress={() => setProductId(p.id)}
                    style={{ flexDirection: 'row', alignItems: 'center', gap: 11, padding: 13, borderRadius: radius.md, borderWidth: 1.5, borderColor: on ? colors.accent : colors.line, backgroundColor: on ? alpha(colors.accent, 0.05) : colors.surface }}>
                    <Icon name="fuel" size={19} color={on ? colors.accent : colors.navy700} />
                    <View style={{ flex: 1, minWidth: 0 }}>
                      <AppText weight="700" style={{ fontSize: 14, color: colors.ink }}>{p.name}</AppText>
                      <AppText weight="600" style={{ fontSize: 11.5, color: colors.ink40, marginTop: 1 }}>{p.sku} · {p.innerQuantity ?? 1000} L/tote{p.unitsPerContainer ? ` · ${p.unitsPerContainer}/cont.` : ''}</AppText>
                    </View>
                    {on && <Icon name="checkCircle" size={20} color={colors.accent} />}
                  </Tap>
                );
              })}
            </View>
          </View>

          <View>
            <AppText weight="600" style={{ fontSize: 13, color: colors.ink60, marginBottom: 9, marginLeft: 2 }}>Cantidad de totes</AppText>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 18 }}>
              <Stepper minus disabled={count <= 1} onPress={() => setCount(Math.max(1, count - 1))} />
              <View style={{ alignItems: 'center', minWidth: 70 }}>
                <AppText serif weight="600" style={{ fontSize: 40, color: colors.ink, lineHeight: 44 }}>{count}</AppText>
                <AppText weight="600" style={{ fontSize: 11, color: colors.ink40 }}>× 1000 L</AppText>
              </View>
              <Stepper onPress={() => setCount(Math.min(200, count + 1))} />
            </View>
            <View style={{ flexDirection: 'row', gap: 8, justifyContent: 'center', marginTop: 12 }}>
              {[12, 24, 48].map((n) => (
                <Tap key={n} hapticKind="select" onPress={() => setCount(n)} style={{ paddingHorizontal: 14, paddingVertical: 7, borderRadius: 999, backgroundColor: count === n ? colors.navy700 : alpha(colors.navy500, 0.08) }}>
                  <AppText weight="700" style={{ fontSize: 12.5, color: count === n ? '#fff' : colors.navy700 }}>{n}</AppText>
                </Tap>
              ))}
            </View>
          </View>

          <View style={{ flexDirection: 'row', gap: 10 }}>
            <View style={{ flex: 1 }}><Field label="Sello (opcional)" value={seal} onChangeText={setSeal} autoCapitalize="characters" /></View>
            <View style={{ flex: 1 }}><Field label="Lote (opcional)" value={lot} onChangeText={setLot} autoCapitalize="characters" /></View>
          </View>
          <Field label="Notas (opcional)" value={notes} onChangeText={setNotes} autoCapitalize="sentences" />

          <Button variant="primary" icon="check" loading={busy} onPress={create}>
            {count > 1 ? `Crear ${count} IBCs` : 'Crear IBC'}
          </Button>
        </ScrollView>
      )}
    </Screen>
  );
}

function Stepper({ minus, disabled, onPress }: { minus?: boolean; disabled?: boolean; onPress: () => void }) {
  return (
    <Tap onPress={disabled ? () => {} : onPress} hapticKind="light" style={{ width: 58, height: 58, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: disabled ? alpha(colors.ink, 0.05) : (minus ? colors.surface : colors.navy700), borderWidth: minus ? 1.5 : 0, borderColor: colors.line, opacity: disabled ? 0.5 : 1, ...shadows.sm }}>
      <Icon name={minus ? 'x' : 'plus'} size={22} color={minus ? colors.ink : '#fff'} />
    </Tap>
  );
}

// ── Detalle: estado + fotos + etiqueta ───────────────────────────
const PHOTO_SLOTS: { kind: IbcMediaKind; label: string }[] = [
  { kind: 'front', label: 'Frente' },
  { kind: 'back', label: 'Atrás' },
  { kind: 'top', label: 'Tapa / arriba' },
  { kind: 'valve', label: 'Válvula' },
];

function IbcDetail({ id, onClose }: { id: string; onClose: () => void }) {
  const { showToast } = useApp();
  const [item, setItem] = useState<IbcItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState<IbcMediaKind | null>(null);
  const [printing, setPrinting] = useState<'pdf' | 'print' | null>(null);
  const labelRef = useRef<View>(null);

  const load = useCallback(async () => {
    try { setItem(await getIbc(id)); } catch { /* */ } finally { setLoading(false); }
  }, [id]);
  useEffect(() => { load(); }, [load]);

  const photoFor = (kind: IbcMediaKind) => item?.media.find((m) => m.kind === kind) || null;

  const takePhoto = async (kind: IbcMediaKind) => {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) { showToast('Permiso de cámara denegado', 'warn'); return; }
    const res = await ImagePicker.launchCameraAsync({ quality: 0.7 });
    if (res.canceled || !res.assets?.[0]) return;
    setUploading(kind);
    try {
      await uploadIbcMedia(id, kind, res.assets[0].uri, res.assets[0].mimeType || 'image/jpeg');
      await load();
      haptic('success');
    } catch (e: any) { showToast(e?.message || 'No se pudo subir la foto', 'error'); }
    finally { setUploading(null); }
  };

  const removePhoto = async (mediaId: string) => {
    try { await deleteIbcMedia(id, mediaId); await load(); } catch (e: any) { showToast(e?.message || 'Error', 'error'); }
  };

  const setStatus = async (status: IbcStatus) => {
    try { setItem(await updateIbc(id, { status })); haptic('success'); } catch (e: any) { showToast(e?.message || 'Error', 'error'); }
  };

  const removeIbc = async () => {
    try { await deleteIbc(id); haptic('success'); showToast('IBC eliminado', 'success'); onClose(); } catch (e: any) { showToast(e?.message || 'Error', 'error'); }
  };

  const doPrint = async (mode: 'pdf' | 'print') => {
    if (printing) return;
    setPrinting(mode); haptic('medium');
    try {
      const dataUri = await captureRef(labelRef as React.RefObject<View>, { format: 'png', quality: 1, result: 'data-uri' });
      const html = `<html><body style="margin:0;display:flex;align-items:center;justify-content:center;padding:18px"><img src="${dataUri}" style="width:100%;max-width:560px"/></body></html>`;
      if (mode === 'print') { await Print.printAsync({ html }); }
      else {
        const { uri } = await Print.printToFileAsync({ html });
        if (await Sharing.isAvailableAsync()) await Sharing.shareAsync(uri, { mimeType: 'application/pdf', dialogTitle: 'Etiqueta IBC' });
      }
      haptic('success');
    } catch (e: any) { showToast(e?.message || 'No se pudo generar la etiqueta', 'error'); }
    finally { setPrinting(null); }
  };

  if (loading) return <Screen><View style={{ paddingTop: 120, alignItems: 'center' }}><ActivityIndicator color={colors.navy700} /></View></Screen>;
  if (!item) return <Screen><View style={{ paddingTop: 120, alignItems: 'center' }}><AppText style={{ color: colors.ink50 }}>No se encontró el IBC</AppText><Button variant="ghost" onPress={onClose}>Volver</Button></View></Screen>;

  return (
    <Screen padBottom={24} contentStyle={{ paddingBottom: 40 }}>
      <Header title={item.ibcNumber} subtitle={item.productName || 'IBC 1000 L'} onBack={onClose}
        right={<IconButton name="trash" variant="plain" onPress={removeIbc} />} />
      <ScrollView contentContainerStyle={{ padding: 16, gap: 16 }}>
        {/* estado */}
        <Card pad={16} style={{ gap: 12 }}>
          <AppText weight="700" style={{ fontSize: 14, color: colors.ink }}>Estado</AppText>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {STATUS_KEYS.map((k) => {
              const on = item.status === k;
              return (
                <Tap key={k} hapticKind="select" onPress={() => setStatus(k)}
                  style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 999, backgroundColor: on ? STATUS[k].color : alpha(STATUS[k].color, 0.12) }}>
                  <View style={{ width: 7, height: 7, borderRadius: 999, backgroundColor: on ? '#fff' : STATUS[k].color }} />
                  <AppText weight="700" style={{ fontSize: 12.5, color: on ? '#fff' : STATUS[k].color }}>{STATUS[k].label}</AppText>
                </Tap>
              );
            })}
          </View>
          <View style={{ flexDirection: 'row', gap: 10, marginTop: 2 }}>
            <Meta label="Capacidad" value={`${Math.round(Number(item.capacityLiters))} L`} />
            <Meta label="Sello" value={item.sealNumber || '—'} />
            <Meta label="Lote" value={item.lotNumber || '—'} />
          </View>
        </Card>

        {/* fotos */}
        <Card pad={16} style={{ gap: 12 }}>
          <AppText weight="700" style={{ fontSize: 14, color: colors.ink }}>Fotos de inspección</AppText>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
            {PHOTO_SLOTS.map((s) => {
              const photo = photoFor(s.kind);
              const isUp = uploading === s.kind;
              return (
                <Tap key={s.kind} hapticKind="light" onPress={() => (photo ? removePhoto(photo.id) : takePhoto(s.kind))}
                  style={{ width: '47%', aspectRatio: 1.2, borderRadius: radius.md, overflow: 'hidden', backgroundColor: colors.bg, borderWidth: 1.5, borderColor: photo ? 'transparent' : colors.line, borderStyle: photo ? 'solid' : 'dashed', alignItems: 'center', justifyContent: 'center' }}>
                  {photo ? (
                    <>
                      <RemoteImage url={photo.previewUrl} />
                      <View style={{ position: 'absolute', top: 6, right: 6, width: 24, height: 24, borderRadius: 999, backgroundColor: 'rgba(13,27,61,0.7)', alignItems: 'center', justifyContent: 'center' }}>
                        <Icon name="trash" size={13} color="#fff" />
                      </View>
                      <View style={{ position: 'absolute', bottom: 0, left: 0, right: 0, paddingVertical: 4, backgroundColor: 'rgba(13,27,61,0.55)', alignItems: 'center' }}>
                        <AppText weight="700" style={{ fontSize: 11, color: '#fff' }}>{s.label}</AppText>
                      </View>
                    </>
                  ) : isUp ? (
                    <ActivityIndicator color={colors.navy700} />
                  ) : (
                    <>
                      <Icon name="camera" size={24} color={colors.ink40} />
                      <AppText weight="600" style={{ fontSize: 12, color: colors.ink50, marginTop: 6 }}>{s.label}</AppText>
                    </>
                  )}
                </Tap>
              );
            })}
          </View>
        </Card>

        {/* etiqueta */}
        <Card pad={16} style={{ gap: 14 }}>
          <AppText weight="700" style={{ fontSize: 14, color: colors.ink }}>Etiqueta</AppText>
          <View ref={labelRef as React.RefObject<View>} collapsable={false} style={{ backgroundColor: '#fff' }}>
            <IbcLabel item={item} />
          </View>
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <View style={{ flex: 1 }}><Button variant="primary" icon="printer" loading={printing === 'print'} onPress={() => doPrint('print')}>Imprimir</Button></View>
            <View style={{ flex: 1 }}><Button variant="soft" icon="share" loading={printing === 'pdf'} onPress={() => doPrint('pdf')}>PDF</Button></View>
          </View>
        </Card>
      </ScrollView>
    </Screen>
  );
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <View style={{ flex: 1, backgroundColor: colors.bg, borderRadius: 12, paddingVertical: 9, paddingHorizontal: 10 }}>
      <AppText weight="600" style={{ fontSize: 10.5, color: colors.ink40, textTransform: 'uppercase', letterSpacing: 0.3 }}>{label}</AppText>
      <AppText weight="700" style={{ fontSize: 14, color: colors.ink, marginTop: 2 }}>{value}</AppText>
    </View>
  );
}

// Etiqueta física del IBC (igual concepto que la térmica de inspección).
function IbcLabel({ item }: { item: IbcItem }) {
  const qrUrl = `${PUBLIC_WEB_URL}/ibc/${item.publicToken ?? ''}`;
  const barcode = item.ibcNumber.replace(/-/g, '');
  return (
    <View style={{ flexDirection: 'row', gap: 12, padding: 14, borderWidth: 1, borderColor: '#e5e5e5', borderRadius: 10, backgroundColor: '#fff' }}>
      <View style={{ flex: 1, minWidth: 0 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderBottomWidth: 2, borderBottomColor: '#000', paddingBottom: 5, marginBottom: 6 }}>
          <AppText weight="800" style={{ fontSize: 12, color: '#000' }}>AZAHARES</AppText>
          <AppText weight="700" style={{ fontSize: 8.5, letterSpacing: 1, color: '#000' }}>IBC 1000 L</AppText>
        </View>
        <AppText weight="800" style={{ fontSize: 16, color: '#000' }}>{item.ibcNumber}</AppText>
        <AppText weight="700" style={{ fontSize: 10.5, color: '#000', marginBottom: 7 }} numberOfLines={2}>{item.productName || '—'}</AppText>
        <LabelRow k="Capacidad" v={`${Math.round(Number(item.capacityLiters))} L`} />
        <LabelRow k="Sello" v={item.sealNumber || '—'} />
        <LabelRow k="Lote" v={item.lotNumber || '—'} />
        <View style={{ borderTopWidth: 1, borderTopColor: '#999', borderStyle: 'dashed', paddingTop: 5, marginTop: 6 }}>
          <Barcode value={barcode} height={30} />
          <AppText style={{ fontSize: 8, letterSpacing: 2, textAlign: 'center', marginTop: 3, color: '#222' }}>{barcode}</AppText>
        </View>
      </View>
      <View style={{ width: 96, alignItems: 'center', justifyContent: 'center', borderLeftWidth: 1, borderLeftColor: '#999', borderStyle: 'dashed', paddingLeft: 10 }}>
        {item.publicToken ? <QRCode value={qrUrl} size={86} backgroundColor="#fff" color="#0a0a0a" /> : null}
        <AppText style={{ fontSize: 7, color: '#444', marginTop: 5, textAlign: 'center' }}>azaharesfuel.com/{'\n'}ibc/{(item.publicToken || '').slice(0, 6)}</AppText>
      </View>
    </View>
  );
}

function LabelRow({ k, v }: { k: string; v: string }) {
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 8, marginBottom: 2.5 }}>
      <AppText style={{ color: '#444', fontSize: 9.5, letterSpacing: 0.3, fontFamily: fonts.sans }}>{k.toUpperCase()}</AppText>
      <AppText weight="700" style={{ color: '#000', fontSize: 9.5, textAlign: 'right', flexShrink: 1 }}>{v}</AppText>
    </View>
  );
}
