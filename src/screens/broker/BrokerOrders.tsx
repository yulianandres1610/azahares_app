// Órdenes — datos REALES: GET /sales-orders, GET /sales-orders/{id},
// send-cotizacion/send-quote/issue-invoice, pagos parciales con subida de
// comprobante (signed-url + PUT), tracking (shipment-tracking) e historial.
import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Image, Linking, RefreshControl, ScrollView, Share, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as ImagePicker from 'expo-image-picker';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { alpha, colors, gradients, radius, shadows } from '../../theme/tokens';
import { Icon } from '../../components/Icon';
import { AppText, Button, Card, Chip, Field, IconButton, Screen, Sheet, Tap, haptic } from '../../components/ui';
import { useApp } from '../../store/AppContext';
import { BK_ORDER_STATUS, money, orderIdx, useBroker, brokerApi, type UIOrder } from '../../store/BrokerStore';
import { putSigned } from '../../lib/api/containers';
import type { AuditLog, OrderPaymentsSummary, PaymentRow, PublicTrackingResponse, SalesOrderResponse, TrackingStep } from '../../lib/api/broker';
import { FadeUp, Hero, HeroStat, OrderBadge, Pipeline, useBkNav, useCountUp } from './ui';

export function BrokerOrders() {
  const { orders, loading, refreshOrders, dashboard } = useBroker();
  const nav = useBkNav();
  const [q, setQ] = useState('');
  const [filter, setFilter] = useState('all');
  const [refreshing, setRefreshing] = useState(false);
  const list = orders.filter((o) => {
    if (filter === 'process' && o.idx >= 10) return false;
    if (filter === 'done' && o.idx < 10) return false;
    if (q && !`${o.number} ${o.client}`.toLowerCase().includes(q.toLowerCase())) return false;
    return true;
  }).sort((a, b) => b.ts - a.ts);
  const so = dashboard?.salesOrders;
  const paid = so?.invoicesPaid ?? orders.filter((o) => o.idx >= 7).length;
  const active = orders.filter((o) => o.idx >= 1 && o.idx < 10).length;
  const onRefresh = async () => { setRefreshing(true); await refreshOrders(); setRefreshing(false); };

  return (
    <Screen padBottom={108} scroll={false}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 130 }} keyboardShouldPersistTaps="handled" refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.navy700} />}>
        <Hero>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <AppText serif weight="600" style={{ fontSize: 26, color: '#fff' }}>Órdenes</AppText>
            <IconButton name="plus" variant="glassDark" onPress={() => nav.openOverlay({ type: 'newOrder' })} />
          </View>
          <View style={{ flexDirection: 'row', gap: 8, marginTop: 16 }}>
            <HeroStat value={active} label="En proceso" />
            <HeroStat value={paid} label="Pagadas" />
            <HeroStat value={so?.inShipping ?? 0} label="En tránsito" />
          </View>
        </Hero>

        <View style={{ padding: 16, paddingBottom: 0 }}>
          <Field icon="search" placeholder="Buscar nº de orden o cliente" value={q} onChangeText={setQ} right={q ? <IconButton name="x" variant="plain" iconSize={16} size={32} onPress={() => setQ('')} /> : undefined} />
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingHorizontal: 16, paddingTop: 14, paddingBottom: 6 }}>
          <Chip label="Todas" active={filter === 'all'} count={orders.length} onPress={() => setFilter('all')} />
          <Chip label="En proceso" active={filter === 'process'} color={colors.accent} count={orders.filter((o) => o.idx < 10).length} onPress={() => setFilter('process')} />
          <Chip label="Completadas" active={filter === 'done'} color={colors.success} count={orders.filter((o) => o.idx >= 10).length} onPress={() => setFilter('done')} />
        </ScrollView>

        {loading && orders.length === 0 ? (
          <View style={{ paddingTop: 50, alignItems: 'center' }}><ActivityIndicator color={colors.navy700} /></View>
        ) : (
          <View style={{ paddingHorizontal: 16, paddingTop: 8, gap: 12 }}>
            {list.length === 0 && <View style={{ alignItems: 'center', paddingVertical: 50 }}><Icon name="fileText" size={40} color={colors.ink40} /><AppText style={{ fontSize: 15, color: colors.ink40, marginTop: 12 }}>{orders.length === 0 ? 'Aún no tenés órdenes' : 'Ninguna orden coincide'}</AppText></View>}
            {list.map((o, i) => <OrderCard key={o.id} o={o} i={i} onPress={() => nav.openOverlay({ type: 'order', id: o.id })} />)}
          </View>
        )}
      </ScrollView>
    </Screen>
  );
}

function OrderCard({ o, i, onPress }: { o: UIOrder; i: number; onPress: () => void }) {
  const pct = o.idx < 0 ? 0 : Math.round((o.idx / 10) * 100);
  const [run, setRun] = useState(false);
  useEffect(() => { const t = setTimeout(() => setRun(true), 80 + i * 60); return () => clearTimeout(t); }, [i]);
  const cif = useCountUp(o.cif, run, 900);
  const barColor = o.idx >= 10 ? colors.success : o.idx < 0 ? colors.error : colors.navy500;
  return (
    <FadeUp delay={i * 40}>
      <Card pad={0} onPress={onPress} style={{ overflow: 'hidden' }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 14, paddingTop: 14, paddingBottom: 12 }}>
          <LinearGradient colors={gradients.navy} style={{ width: 44, height: 44, borderRadius: 13, alignItems: 'center', justifyContent: 'center' }}>
            <Icon name="fileText" size={22} color="#fff" />
          </LinearGradient>
          <View style={{ flex: 1, minWidth: 0 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 7 }}>
              <AppText weight="700" style={{ fontSize: 15, color: colors.ink }}>{o.number}</AppText>
              {o.pricingChanged && <View style={{ backgroundColor: alpha(colors.amber, 0.16), paddingHorizontal: 6, paddingVertical: 1, borderRadius: 999 }}><AppText weight="700" style={{ fontSize: 9.5, color: colors.amber }}>PRECIO CAMBIÓ</AppText></View>}
            </View>
            <AppText numberOfLines={1} style={{ fontSize: 12.5, color: colors.ink50, marginTop: 2 }}>{o.client}</AppText>
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <AppText serif weight="700" style={{ fontSize: 18, color: colors.ink, lineHeight: 20 }}>{money(Math.round(cif))}</AppText>
            <AppText weight="600" style={{ fontSize: 10.5, color: colors.ink40, marginTop: 3, letterSpacing: 0.4 }}>TOTAL CIF</AppText>
          </View>
        </View>
        <View style={{ paddingHorizontal: 14 }}>
          <View style={{ height: 5, borderRadius: 999, backgroundColor: colors.line, overflow: 'hidden' }}>
            <View style={{ height: '100%', borderRadius: 999, width: `${run ? pct : 0}%`, backgroundColor: barColor }} />
          </View>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 14, paddingTop: 11, paddingBottom: 13 }}>
          <OrderBadge status={o.status} size="sm" />
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}><Icon name="layers" size={13} color={colors.ink50} /><AppText weight="600" style={{ fontSize: 11.5, color: colors.ink50 }}>{o.items} {o.items === 1 ? 'ítem' : 'ítems'}</AppText></View>
        </View>
      </Card>
    </FadeUp>
  );
}

const TABS = [{ value: 'detail', label: 'Detalle' }, { value: 'pagos', label: 'Pagos' }, { value: 'tracking', label: 'Tracking' }, { value: 'log', label: 'Historial' }];

export function OrderDetail({ id, onClose }: { id: string; onClose: () => void }) {
  const { refreshOrders, refreshDashboard } = useBroker();
  const { showToast } = useApp();
  const insets = useSafeAreaInsets();
  const [o, setO] = useState<SalesOrderResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('detail');
  const [run, setRun] = useState(false);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try { setO(await brokerApi.getSalesOrder(id)); } catch { /* */ } finally { setLoading(false); }
  }, [id]);
  useEffect(() => { load(); const r = setTimeout(() => setRun(true), 60); return () => clearTimeout(r); }, [load]);

  const cifCount = useCountUp(o?.totalCif ?? 0, run && !!o);
  if (loading) return <Screen><View style={{ paddingTop: 120, alignItems: 'center' }}><ActivityIndicator color={colors.navy700} /></View></Screen>;
  if (!o) return <Screen><View style={{ paddingTop: 120, alignItems: 'center' }}><AppText style={{ color: colors.ink50 }}>No se encontró la orden</AppText><Button variant="ghost" onPress={onClose}>Volver</Button></View></Screen>;

  const idx = orderIdx(o.status);
  const action =
    o.status === 'draft' ? { label: 'Enviar cotización', icon: 'send', fn: () => brokerApi.sendCotizacion(o.id) } :
    (o.status === 'cotizacion_sent' || o.status === 'cotizacion_accepted') ? { label: 'Enviar oferta', icon: 'send', fn: () => brokerApi.sendQuote(o.id) } :
    o.status === 'quote_signed' ? { label: 'Emitir factura', icon: 'receipt', fn: () => brokerApi.issueInvoice(o.id) } :
    (o.status === 'invoiced' || o.status === 'payment_uploaded') ? { label: 'Registrar pago', icon: 'upload', go: 'pagos' as const } : null;

  const runAction = async () => {
    if (!action) return;
    if (action.go) { setTab('pagos'); return; }
    setBusy(true); haptic('medium');
    try {
      await action.fn!();
      await Promise.all([load(), refreshOrders(), refreshDashboard()]);
      haptic('success'); showToast(action.label + ' ✓', 'success');
    } catch (e: any) { showToast(e?.message || 'No se pudo completar', 'error'); }
    finally { setBusy(false); }
  };

  return (
    <Screen scroll={false} padTop={false}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: action && tab === 'detail' ? 100 : 40 }} keyboardShouldPersistTaps="handled">
        <Hero padBottom={18}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
            <IconButton name="chevL" variant="glassDark" onPress={onClose} />
            <AppText serif weight="600" numberOfLines={1} style={{ fontSize: 25, color: '#fff', flex: 1, textAlign: 'center' }}>{o.orderNumber}</AppText>
            <IconButton name="share" variant="glassDark" onPress={() => Share.share({ message: `Orden ${o.orderNumber} · ${o.client?.legalName ?? ''} · ${money(o.totalCif)} USD` })} />
          </View>
          <View style={{ marginTop: 20, alignItems: 'center' }}>
            <AppText style={{ color: 'rgba(255,255,255,0.6)', fontSize: 13.5 }}>{o.client?.legalName ?? '—'}</AppText>
            <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 7, marginTop: 8 }}>
              <AppText serif weight="600" style={{ fontSize: 26, color: 'rgba(255,255,255,0.72)' }}>$</AppText>
              <AppText serif weight="600" style={{ fontSize: 40, color: '#fff', letterSpacing: -1 }}>{Math.round(cifCount).toLocaleString('en-US')}</AppText>
            </View>
            <AppText weight="700" style={{ color: 'rgba(255,255,255,0.5)', fontSize: 11, letterSpacing: 0.8, marginTop: 6 }}>TOTAL CIF · USD</AppText>
          </View>
          {idx >= 0 && <View style={{ marginTop: 20 }}><Pipeline state={o.status} /></View>}
        </Hero>

        <View style={{ paddingHorizontal: 16, paddingTop: 14, paddingBottom: 2 }}>
          <View style={{ flexDirection: 'row', padding: 4, borderRadius: radius.md, backgroundColor: alpha(colors.ink, 0.06) }}>
            {TABS.map((tb) => {
              const on = tb.value === tab;
              return (
                <Tap key={tb.value} hapticKind="select" onPress={() => setTab(tb.value)} style={{ flex: 1, height: 38, borderRadius: radius.md - 4, alignItems: 'center', justifyContent: 'center', backgroundColor: on ? colors.surface : 'transparent', ...(on ? shadows.sm : {}) }}>
                  <AppText weight="600" numberOfLines={1} style={{ fontSize: 12.5, color: on ? colors.ink : colors.ink50 }}>{tb.label}</AppText>
                </Tap>
              );
            })}
          </View>
        </View>

        <View style={{ padding: 16 }}>
          {tab === 'detail' && <DetailTab o={o} idx={idx} />}
          {tab === 'pagos' && <PagosTab o={o} idx={idx} onChanged={() => { load(); refreshOrders(); refreshDashboard(); }} />}
          {tab === 'tracking' && <TrackingTab o={o} />}
          {tab === 'log' && <LogTab o={o} />}
        </View>
      </ScrollView>

      {action && tab === 'detail' && (
        <View style={{ position: 'absolute', left: 0, right: 0, bottom: 0, paddingHorizontal: 16, paddingTop: 16, paddingBottom: (insets.bottom || 0) + 16, backgroundColor: colors.bg }}>
          <Button variant="primary" icon={action.icon as any} loading={busy} onPress={runAction}>{action.label}</Button>
        </View>
      )}
    </Screen>
  );
}

// ── Detalle ────────────────────────────────────────────────────
function DetailTab({ o, idx }: { o: SalesOrderResponse; idx: number }) {
  const docs: { label: string; icon: string }[] = [];
  if (idx >= 1) docs.push({ label: 'Cotización', icon: 'send' });
  if (idx >= 4) docs.push({ label: 'Oferta', icon: 'fileText' });
  if (idx >= 5 || o.invoiceNumber) docs.push({ label: 'Factura', icon: 'receipt' });
  const shareDoc = (label: string) => Share.share({ message: `${label} · Orden ${o.orderNumber} · ${o.client?.legalName ?? ''} · ${money(o.totalCif)} USD` });
  return (
    <View style={{ gap: 14 }}>
      <Card pad={0} style={{ overflow: 'hidden' }}>
        <Head icon="fileText" title="Identificación" />
        <KV label="Nº de orden" value={o.orderNumber} />
        {!!o.invoiceNumber && <KV label="Nº de factura" value={o.invoiceNumber} />}
        {!!o.bookingNumber && <KV label="Booking" value={o.bookingNumber} />}
        <KV label="Estado" value={(BK_ORDER_STATUS as any)[o.status]?.label || o.status} last />
      </Card>

      {docs.length > 0 && (
        <Card pad={0} style={{ overflow: 'hidden' }}>
          <Head icon="fileText" title="Documentos" />
          {docs.map((d, i) => (
            <View key={d.label} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, paddingHorizontal: 16, borderTopWidth: i === 0 ? 1 : 1, borderTopColor: colors.line }}>
              <View style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: alpha(colors.navy500, 0.11), alignItems: 'center', justifyContent: 'center' }}><Icon name={d.icon as any} size={18} color={colors.navy700} /></View>
              <AppText weight="600" style={{ flex: 1, fontSize: 14, color: colors.ink }}>{d.label}</AppText>
              <Tap onPress={() => shareDoc(d.label)} style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center' }}><Icon name="share" size={17} color={colors.ink60} /></Tap>
            </View>
          ))}
        </Card>
      )}

      <Card pad={0} style={{ overflow: 'hidden' }}>
        <Head icon="box" title={`Productos (${o.items.length})`} />
        {o.items.map((it) => (
          <KV key={it.id} label={`${it.productName} · ${it.quantity.toLocaleString()} ${it.unit || ''}`} value={money(it.lineTotal)} />
        ))}
        <KV label="Subtotal FOB" value={money(o.subtotalFob)} strong last />
      </Card>
      <Card pad={0} style={{ overflow: 'hidden' }}>
        <Head icon="ship" title="Cargos navieros" />
        <KV label="Flete" value={money(o.fleteMaritimo)} />
        <KV label="THCD" value={money(o.thcd)} />
        <KV label="ISPD" value={money(o.ispd)} />
        <KV label="Seguro" value={money(o.seguro)} />
        <KV label="Total CIF" value={money(o.totalCif)} strong last />
      </Card>
      <Card pad={0} style={{ overflow: 'hidden' }}>
        <Head icon="map" title="Datos comerciales" />
        <KV label="Puerto origen" value={o.portOfLoading || '—'} />
        <KV label="Puerto destino" value={o.portOfDischarge || '—'} />
        <KV label="Plazo" value={o.deliveryTimeDays ? `${o.deliveryTimeDays} días` : '—'} last />
      </Card>
    </View>
  );
}

// ── Pagos (parciales + subida de comprobante) ──────────────────
const PAY_ST: Record<string, { l: string; c: string; icon: string }> = {
  verified: { l: 'Verificado', c: colors.success, icon: 'checkCircle' },
  uploaded: { l: 'En revisión', c: colors.amber, icon: 'clock' },
  rejected: { l: 'Rechazado', c: colors.error, icon: 'x' },
};

// Sintetiza un resumen de pagos desde la propia orden (cuando el listado
// de pagos parciales no es accesible para el broker).
function fallbackSummary(o: SalesOrderResponse): OrderPaymentsSummary {
  const verified = o.paymentVerifiedAt ? o.totalCif : 0;
  const uploadedNotVerified = o.paymentUploadedAt && !o.paymentVerifiedAt && !o.paymentRejectionReason ? o.totalCif : 0;
  const payments: PaymentRow[] = o.paymentUploadedAt
    ? [{
        id: 'order-proof', amount: o.totalCif, method: o.paymentMethod || 'wired_transfer', reference: null,
        status: o.paymentVerifiedAt ? 'verified' : o.paymentRejectionReason ? 'rejected' : 'uploaded',
        proofUrl: o.paymentProofUrl, proofFilename: null, notes: null,
        rejectionReason: o.paymentRejectionReason, uploadedAt: o.paymentUploadedAt, verifiedAt: o.paymentVerifiedAt,
      }]
    : [];
  return { total: o.totalCif, paid: verified, pending: Math.max(0, o.totalCif - verified), uploadedNotVerified, payments };
}

function PagosTab({ o, idx, onChanged }: { o: SalesOrderResponse; idx: number; onChanged: () => void }) {
  const { showToast } = useApp();
  const [sum, setSum] = useState<OrderPaymentsSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [sheet, setSheet] = useState(false);
  const canPay = idx >= 5;

  const reload = useCallback(async () => {
    if (!canPay) { setLoading(false); return; }
    try { setSum(await brokerApi.getOrderPayments(o.id)); }
    catch { setSum(fallbackSummary(o)); }
    finally { setLoading(false); }
  }, [o.id, canPay, o]);
  useEffect(() => { reload(); }, [reload]);

  if (!canPay) return <Empty icon="receipt" text="Los pagos se habilitan cuando la orden está facturada." />;
  if (loading) return <View style={{ paddingVertical: 40, alignItems: 'center' }}><ActivityIndicator color={colors.navy700} /></View>;

  const verified = sum?.paid ?? 0;
  const remaining = sum?.pending ?? o.totalCif;
  const pendingSum = sum?.uploadedNotVerified ?? 0;
  const pct = o.totalCif ? Math.min(100, Math.round((verified / o.totalCif) * 100)) : 0;
  const pays = sum?.payments || [];

  const viewProof = async () => {
    haptic('light');
    try { const { url } = await brokerApi.getPaymentProofDownloadUrl(o.id); if (url) await Linking.openURL(url); else showToast('Comprobante no disponible', 'warn'); }
    catch (e: any) { showToast(e?.message || 'No se pudo abrir el comprobante', 'error'); }
  };

  return (
    <View style={{ gap: 14 }}>
      <View style={{ borderRadius: radius.xl, overflow: 'hidden', ...shadows.card }}>
        <LinearGradient colors={gradients.navyDeep} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ padding: 18 }}>
          <AppText weight="600" style={{ color: 'rgba(255,255,255,0.6)', fontSize: 11.5, letterSpacing: 0.5 }}>SALDO PENDIENTE</AppText>
          <AppText serif weight="600" style={{ fontSize: 34, color: '#fff', marginTop: 3 }}>{money(remaining)}</AppText>
          <View style={{ height: 7, borderRadius: 999, backgroundColor: 'rgba(255,255,255,0.18)', overflow: 'hidden', marginTop: 14, flexDirection: 'row' }}>
            <View style={{ width: `${pct}%` }}><LinearGradient colors={['#10b981', '#34d399']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={{ height: 7 }} /></View>
            <View style={{ width: `${Math.min(100 - pct, Math.round((pendingSum / o.totalCif) * 100))}%`, height: 7, backgroundColor: alpha(colors.amber, 0.85) }} />
          </View>
          <View style={{ flexDirection: 'row', gap: 16, marginTop: 11 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}><View style={{ width: 8, height: 8, borderRadius: 3, backgroundColor: '#34d399' }} /><AppText style={{ color: '#fff', fontSize: 12 }}>Verificado <AppText weight="700" style={{ color: '#fff' }}>{money(verified)}</AppText></AppText></View>
            {pendingSum > 0 && <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}><View style={{ width: 8, height: 8, borderRadius: 3, backgroundColor: colors.amber }} /><AppText style={{ color: '#fff', fontSize: 12 }}>En revisión <AppText weight="700" style={{ color: '#fff' }}>{money(pendingSum)}</AppText></AppText></View>}
          </View>
        </LinearGradient>
      </View>

      {remaining > 0 && (
        <Tap onPress={() => { haptic('medium'); setSheet(true); }} style={{ borderWidth: 1.5, borderColor: colors.accent, borderStyle: 'dashed', backgroundColor: alpha(colors.accent, 0.07), borderRadius: radius.lg, padding: 16, flexDirection: 'row', alignItems: 'center', gap: 13 }}>
          <LinearGradient colors={gradients.navy} style={{ width: 42, height: 42, borderRadius: 12, alignItems: 'center', justifyContent: 'center' }}><Icon name="upload" size={21} color="#fff" /></LinearGradient>
          <View style={{ flex: 1 }}>
            <AppText weight="700" style={{ fontSize: 14.5, color: colors.ink }}>Subir comprobante</AppText>
            <AppText style={{ fontSize: 12, color: colors.ink50, marginTop: 1 }}>Pago total o parcial · lo valida Azahares</AppText>
          </View>
          <Icon name="chevR" size={18} color={colors.ink30} />
        </Tap>
      )}

      <View>
        <AppText weight="700" style={{ fontSize: 12, color: colors.ink40, letterSpacing: 0.6, marginHorizontal: 6, marginBottom: 10 }}>COMPROBANTES ({pays.length})</AppText>
        {pays.length === 0 ? <Empty icon="receipt" text="Sin comprobantes aún" pad={30} /> : (
          <View style={{ gap: 10 }}>
            {pays.map((p, i) => <PaymentCard key={p.id} p={p} i={i} total={o.totalCif} onView={viewProof} />)}
          </View>
        )}
      </View>

      <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 9, paddingHorizontal: 4 }}>
        <Icon name="info" size={16} color={colors.accent} />
        <AppText style={{ flex: 1, fontSize: 12.5, lineHeight: 19, color: colors.ink50 }}>Podés registrar pagos parciales. Cada comprobante queda "En revisión" hasta que un administrador lo valida.</AppText>
      </View>

      <UploadSheet open={sheet} onClose={() => setSheet(false)} orderId={o.id} remaining={remaining}
        onDone={async () => { await reload(); onChanged(); showToast('Comprobante enviado a validación', 'success'); }}
        onError={(m) => showToast(m, 'error')} />
    </View>
  );
}

function PaymentCard({ p, i, total, onView }: { p: PaymentRow; i: number; total: number; onView: () => void }) {
  const st = PAY_ST[p.status] || PAY_ST.uploaded;
  const date = (() => { try { return new Date(p.uploadedAt).toLocaleDateString('es', { day: 'numeric', month: 'short', year: 'numeric' }); } catch { return ''; } })();
  const methodLabel = ({ wired_transfer: 'Transferencia', usd_cash: 'Efectivo USD', usdt: 'USDT', wallet_credit: 'Saldo wallet' } as any)[p.method] || p.method;
  return (
    <FadeUp delay={i * 50}>
      <Card pad={14} onPress={onView}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 13 }}>
          <View style={{ width: 44, height: 52, borderRadius: 9, backgroundColor: colors.bg, borderWidth: 1, borderColor: colors.line, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
            <Icon name="fileText" size={20} color={colors.ink40} />
            <View style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 14, backgroundColor: st.c, alignItems: 'center', justifyContent: 'center' }}><Icon name={st.icon as any} size={9} color="#fff" /></View>
          </View>
          <View style={{ flex: 1, minWidth: 0 }}>
            <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 8 }}>
              <AppText serif weight="700" style={{ fontSize: 17, color: colors.ink }}>{money(p.amount)}</AppText>
              {p.amount < total && <View style={{ backgroundColor: alpha(colors.navy500, 0.12), paddingHorizontal: 7, paddingVertical: 2, borderRadius: 999 }}><AppText weight="700" style={{ fontSize: 10.5, color: colors.navy700 }}>PARCIAL</AppText></View>}
            </View>
            <AppText style={{ fontSize: 12.5, color: colors.ink50, marginTop: 2 }}>{methodLabel} · {date}</AppText>
            {!!p.reference && <AppText style={{ fontSize: 11.5, color: colors.ink40, marginTop: 2 }}>{p.reference}</AppText>}
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, height: 26, paddingHorizontal: 10, borderRadius: 999, backgroundColor: alpha(st.c, 0.14) }}>
            <Icon name={st.icon as any} size={13} color={st.c} />
            <AppText weight="700" style={{ fontSize: 12, color: st.c }}>{st.l}</AppText>
          </View>
        </View>
        {p.status === 'rejected' && !!p.rejectionReason && (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 7, marginTop: 11, paddingTop: 11, borderTopWidth: 1, borderTopColor: colors.line }}>
            <Icon name="alert" size={14} color={colors.error} />
            <AppText style={{ flex: 1, fontSize: 12, color: colors.ink60 }}>{p.rejectionReason}</AppText>
          </View>
        )}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 11, paddingTop: 11, borderTopWidth: 1, borderTopColor: colors.line }}>
          <Icon name="eye" size={14} color={colors.accent} />
          <AppText weight="600" style={{ flex: 1, fontSize: 12, color: colors.accent }}>Ver comprobante</AppText>
          <Icon name="chevR" size={15} color={colors.ink30} />
        </View>
      </Card>
    </FadeUp>
  );
}

function UploadSheet({ open, onClose, orderId, remaining, onDone, onError }: { open: boolean; onClose: () => void; orderId: string; remaining: number; onDone: () => void; onError: (m: string) => void }) {
  const [method, setMethod] = useState<'wired_transfer' | 'usdt' | 'usd_cash'>('wired_transfer');
  const [file, setFile] = useState<ImagePicker.ImagePickerAsset | null>(null);
  const [busy, setBusy] = useState(false);
  useEffect(() => { if (open) { setMethod('wired_transfer'); setFile(null); setBusy(false); } }, [open]);
  const valid = !!file && !busy;
  const methods: { k: any; label: string }[] = [{ k: 'wired_transfer', label: 'Transferencia' }, { k: 'usdt', label: 'USDT' }, { k: 'usd_cash', label: 'Efectivo USD' }];

  const pick = async (fromCamera: boolean) => {
    haptic('medium');
    const perm = fromCamera ? await ImagePicker.requestCameraPermissionsAsync() : await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) { onError('Permiso de cámara/galería denegado'); return; }
    const res = fromCamera
      ? await ImagePicker.launchCameraAsync({ quality: 0.7 })
      : await ImagePicker.launchImageLibraryAsync({ quality: 0.7, mediaTypes: ImagePicker.MediaTypeOptions.Images });
    if (!res.canceled && res.assets?.[0]) setFile(res.assets[0]);
  };

  const submit = async () => {
    if (!file) return;
    setBusy(true); haptic('medium');
    try {
      const fileName = file.fileName || `comprobante-${Date.now()}.jpg`;
      const contentType = file.mimeType || 'image/jpeg';
      // Flujo broker: comprobante individual sobre la orden (no el registro
      // de pagos parciales, que es admin-only).
      const { uploadUrl, path } = await brokerApi.getPaymentProofUploadUrl(orderId, fileName);
      await putSigned(uploadUrl, file.uri, contentType);
      await brokerApi.submitPayment(orderId, { method, proofUrl: path, proofFilename: fileName });
      haptic('success'); onClose(); onDone();
    } catch (e: any) {
      setBusy(false); onError(e?.message || 'No se pudo registrar el pago');
    }
  };

  return (
    <Sheet open={open} onClose={onClose} title="Subir comprobante">
      <View style={{ paddingHorizontal: 16, paddingTop: 6, paddingBottom: 8, gap: 16 }}>
        {file ? (
          <View style={{ borderRadius: radius.lg, overflow: 'hidden', backgroundColor: colors.surface, borderWidth: 1.5, borderColor: colors.line }}>
            <Image source={{ uri: file.uri }} style={{ width: '100%', height: 180 }} resizeMode="cover" />
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12 }}>
              <Icon name="checkCircle" size={18} color={colors.success} />
              <AppText weight="600" style={{ flex: 1, fontSize: 13, color: colors.ink }} numberOfLines={1}>{file.fileName || 'comprobante.jpg'}</AppText>
              <Tap onPress={() => setFile(null)}><AppText weight="600" style={{ color: colors.accent, fontSize: 13 }}>Cambiar</AppText></Tap>
            </View>
          </View>
        ) : (
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <Tap onPress={() => pick(true)} style={{ flex: 1, borderRadius: radius.lg, borderWidth: 1.5, borderColor: colors.line, borderStyle: 'dashed', backgroundColor: colors.surface, alignItems: 'center', gap: 8, paddingVertical: 22 }}>
              <View style={{ width: 44, height: 44, borderRadius: 13, backgroundColor: alpha(colors.accent, 0.12), alignItems: 'center', justifyContent: 'center' }}><Icon name="camera" size={22} color={colors.accent} /></View>
              <AppText weight="600" style={{ fontSize: 13, color: colors.ink }}>Tomar foto</AppText>
            </Tap>
            <Tap onPress={() => pick(false)} style={{ flex: 1, borderRadius: radius.lg, borderWidth: 1.5, borderColor: colors.line, borderStyle: 'dashed', backgroundColor: colors.surface, alignItems: 'center', gap: 8, paddingVertical: 22 }}>
              <View style={{ width: 44, height: 44, borderRadius: 13, backgroundColor: alpha(colors.navy500, 0.12), alignItems: 'center', justifyContent: 'center' }}><Icon name="image" size={22} color={colors.navy700} /></View>
              <AppText weight="600" style={{ fontSize: 13, color: colors.ink }}>Adjuntar</AppText>
            </Tap>
          </View>
        )}

        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 2 }}>
          <AppText weight="600" style={{ fontSize: 13, color: colors.ink60 }}>Saldo pendiente</AppText>
          <AppText serif weight="700" style={{ fontSize: 18, color: colors.ink }}>{money(remaining)}</AppText>
        </View>

        <View>
          <AppText weight="600" style={{ fontSize: 13, color: colors.ink60, marginBottom: 9, marginLeft: 2 }}>Método de pago</AppText>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            {methods.map((m) => <Chip key={m.k} label={m.label} active={method === m.k} onPress={() => setMethod(m.k)} />)}
          </View>
        </View>

        <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 9, paddingHorizontal: 2 }}>
          <Icon name="info" size={16} color={colors.accent} />
          <AppText style={{ flex: 1, fontSize: 12.5, lineHeight: 19, color: colors.ink50 }}>El comprobante queda "En revisión" hasta que el equipo de Azahares valide el pago.</AppText>
        </View>

        <Button variant="primary" icon="upload" disabled={!valid} loading={busy} onPress={submit}>Enviar a validación</Button>
      </View>
    </Sheet>
  );
}

// ── Tracking (timeline público real por token) ─────────────────
const STEP_LABELS: Record<TrackingStep, string> = {
  order_placed: 'Orden creada', quote_sent: 'Cotización enviada', quote_accepted: 'Cotización aceptada',
  invoice_issued: 'Factura emitida', payment_received: 'Pago recibido', po_sent_to_supplier: 'PO enviada al proveedor',
  supplier_accepted: 'Proveedor aceptó', supplier_processing: 'En preparación', booking_requested: 'Booking solicitado',
  booking_confirmed: 'Booking confirmado', container_assigned: 'Contenedor asignado', container_loaded: 'Contenedor cargado',
  bol_issued: 'BL emitido', dispatched: 'Despachado', arrived_at_destination: 'Llegó a destino', delivered: 'Entregado',
};
const fmtDateTime = (iso: string | null) => { if (!iso) return ''; try { return new Date(iso).toLocaleDateString('es', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }); } catch { return ''; } };

function TrackingTab({ o }: { o: SalesOrderResponse }) {
  const [tr, setTr] = useState<PublicTrackingResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState(false);
  useEffect(() => {
    if (!o.trackingToken) return;
    setLoading(true);
    brokerApi.getPublicTracking(o.trackingToken).then(setTr).catch(() => setErr(true)).finally(() => setLoading(false));
  }, [o.trackingToken]);

  if (!o.trackingToken) return <Empty icon="ship" text="El tracking estará disponible cuando se confirme el booking de la orden." />;
  if (loading) return <View style={{ paddingVertical: 40, alignItems: 'center' }}><ActivityIndicator color={colors.navy700} /></View>;
  if (err || !tr) return <Empty icon="ship" text="No se pudo cargar el tracking. Tirá para refrescar." />;

  const events = tr.timeline || [];
  const lastDone = events.reduce((acc, e, i) => (e.at ? i : acc), -1);
  const statusLabel = (BK_ORDER_STATUS as any)[tr.order.status]?.label || tr.order.status;

  return (
    <View style={{ gap: 14 }}>
      {/* ruta + estado */}
      <View style={{ borderRadius: radius.xl, overflow: 'hidden' }}>
        <LinearGradient colors={gradients.navyDeep} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ padding: 18 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <View style={{ flex: 1 }}>
              <AppText weight="700" style={{ color: 'rgba(255,255,255,0.6)', fontSize: 10.5, letterSpacing: 0.6 }}>ORIGEN</AppText>
              <AppText weight="700" style={{ color: '#fff', fontSize: 14, marginTop: 2 }}>{tr.order.portOfLoading || '—'}</AppText>
            </View>
            <Icon name="arrowR" size={20} color="rgba(255,255,255,0.6)" />
            <View style={{ flex: 1, alignItems: 'flex-end' }}>
              <AppText weight="700" style={{ color: 'rgba(255,255,255,0.6)', fontSize: 10.5, letterSpacing: 0.6 }}>DESTINO</AppText>
              <AppText weight="700" style={{ color: '#fff', fontSize: 14, marginTop: 2 }}>{tr.order.portOfDischarge || '—'}</AppText>
            </View>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 14, paddingTop: 14, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.12)' }}>
            <View style={{ width: 7, height: 7, borderRadius: 999, backgroundColor: '#34d399' }} />
            <AppText weight="700" style={{ color: '#fff', fontSize: 13 }}>{statusLabel}</AppText>
            {!!tr.order.bookingNumber && <AppText style={{ color: 'rgba(255,255,255,0.7)', fontSize: 12, marginLeft: 'auto' }}>Booking {tr.order.bookingNumber}</AppText>}
          </View>
        </LinearGradient>
      </View>

      {/* contenedores */}
      {tr.containers.length > 0 && (
        <View style={{ gap: 10 }}>
          {tr.containers.map((c) => (
            <Card key={c.id} pad={14}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 13 }}>
                <View style={{ width: 44, height: 44, borderRadius: 12, backgroundColor: alpha(colors.navy500, 0.12), alignItems: 'center', justifyContent: 'center' }}><Icon name="layers" size={22} color={colors.navy700} /></View>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <AppText weight="700" style={{ fontSize: 14.5, color: colors.ink }}>{c.containerNumber}</AppText>
                  <AppText style={{ fontSize: 12.5, color: colors.ink50, marginTop: 1 }}>{c.lastLocation?.address || c.productName || c.status}</AppText>
                </View>
              </View>
            </Card>
          ))}
        </View>
      )}

      {/* recorrido (timeline desde la creación) */}
      <View>
        <AppText weight="700" style={{ fontSize: 12, color: colors.ink40, letterSpacing: 0.6, marginHorizontal: 6, marginBottom: 12 }}>RECORRIDO</AppText>
        {events.map((e, i) => {
          const done = !!e.at;
          const cur = i === lastDone;
          const cats = e.meta?.catNumbers;
          return (
            <View key={e.step} style={{ flexDirection: 'row', gap: 13, alignItems: 'flex-start' }}>
              <View style={{ alignItems: 'center', alignSelf: 'stretch' }}>
                <View style={{ width: 32, height: 32, borderRadius: 999, alignItems: 'center', justifyContent: 'center', overflow: 'hidden', ...(cur ? {} : done ? { backgroundColor: colors.success } : { backgroundColor: colors.surface, borderWidth: 1.5, borderColor: colors.line }) }}>
                  {cur && <LinearGradient colors={gradients.navy} style={{ position: 'absolute', inset: 0 as any }} />}
                  {done ? <Icon name="check" size={15} color="#fff" /> : <View style={{ width: 7, height: 7, borderRadius: 999, backgroundColor: colors.ink30 }} />}
                </View>
                {i < events.length - 1 && <View style={{ flex: 1, width: 2, backgroundColor: done ? colors.success : colors.line, marginVertical: 3, minHeight: 22 }} />}
              </View>
              <View style={{ flex: 1, paddingBottom: 18, paddingTop: 4 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                  <AppText weight={done ? '700' : '600'} style={{ flex: 1, fontSize: 14, color: done ? colors.ink : colors.ink50 }}>{STEP_LABELS[e.step] || e.step}</AppText>
                  {!!e.at && <AppText weight="600" style={{ fontSize: 11.5, color: cur ? colors.navy700 : colors.ink40 }}>{fmtDateTime(e.at)}</AppText>}
                </View>
                {!!cats?.length && <AppText style={{ fontSize: 12, color: colors.accent, marginTop: 2 }}>CAT {cats.join(', ')}</AppText>}
              </View>
            </View>
          );
        })}
      </View>
    </View>
  );
}

// ── Historial (audit log real, con fallback) ───────────────────
const HIST_STATUS: Record<string, string> = {
  draft: 'Borrador', cotizacion_sent: 'Cotización enviada', cotizacion_accepted: 'Cotización aceptada',
  quote_sent: 'Oferta enviada', quote_signed: 'Oferta firmada', pending_client_approval: 'Esperando cliente',
  invoiced: 'Factura emitida', payment_uploaded: 'Comprobante cargado', paid: 'Pagada',
  purchase_ordered: 'PO generada', shipping: 'En tránsito', delivered: 'Entregada', cancelled: 'Cancelada',
};
function describeAudit(log: AuditLog): { title: string; desc?: string } {
  const st = log.changes?.status;
  const after = st && typeof st.after === 'string' ? st.after : null;
  if (after) return { title: HIST_STATUS[after] || `Estado: ${after}`, desc: log.actorEmail };
  if (log.action === 'create') return { title: 'Orden creada', desc: log.actorEmail };
  if (log.action === 'delete') return { title: 'Orden eliminada', desc: log.actorEmail };
  if (log.action === 'upload') return { title: 'Archivo cargado', desc: log.actorEmail };
  return { title: 'Actualización', desc: log.actorEmail };
}

function LogTab({ o }: { o: SalesOrderResponse }) {
  const [logs, setLogs] = useState<AuditLog[] | null>(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    let alive = true;
    brokerApi.listOrderAuditLogs(o.id)
      .then((p) => { if (alive) setLogs(p.items || []); })
      .catch(() => { if (alive) setLogs(null); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [o.id]);

  if (loading) return <View style={{ paddingVertical: 40, alignItems: 'center' }}><ActivityIndicator color={colors.navy700} /></View>;

  const fmt = (iso: string | null) => { if (!iso) return ''; try { return new Date(iso).toLocaleDateString('es', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }); } catch { return ''; } };

  // audit log real (más recientes primero)
  if (logs && logs.length > 0) {
    const sorted = [...logs].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    return (
      <View style={{ paddingTop: 4 }}>
        {sorted.map((log, i) => {
          const m = describeAudit(log);
          return (
            <View key={log.id} style={{ flexDirection: 'row', gap: 13, alignItems: 'flex-start' }}>
              <View style={{ alignItems: 'center', alignSelf: 'stretch' }}>
                <View style={{ width: 11, height: 11, borderRadius: 999, marginTop: 5, backgroundColor: i === 0 ? colors.accent : colors.navy500, ...(i === 0 ? { borderWidth: 3, borderColor: alpha(colors.accent, 0.28) } : {}) }} />
                {i < sorted.length - 1 && <View style={{ flex: 1, width: 2, backgroundColor: colors.line, marginVertical: 3, minHeight: 20 }} />}
              </View>
              <View style={{ flex: 1, paddingBottom: 18 }}>
                <AppText weight="600" style={{ fontSize: 13.5, color: colors.ink }}>{m.title}</AppText>
                <AppText style={{ fontSize: 12, color: colors.ink50, marginTop: 2 }}>{fmt(log.createdAt)}{m.desc ? ` · ${m.desc}` : ''}</AppText>
              </View>
            </View>
          );
        })}
      </View>
    );
  }

  // fallback: timeline derivado de los timestamps de la orden
  const idx = orderIdx(o.status);
  const entries = [
    { k: 'Orden creada', date: fmt(o.createdAt), on: true },
    { k: 'Cotización enviada', date: '', on: !!o.cotizacionToken || idx >= 1 },
    { k: 'Oferta firmada', date: fmt(o.quoteSignedAt), on: !!o.quoteSignedAt || idx >= 4 },
    { k: 'Factura emitida', date: '', on: !!o.invoiceNumber || idx >= 5 },
    { k: 'Pago subido', date: fmt(o.paymentUploadedAt), on: !!o.paymentUploadedAt || idx >= 6 },
    { k: 'Pago verificado', date: fmt(o.paymentVerifiedAt), on: !!o.paymentVerifiedAt || idx >= 7 },
    { k: 'En tránsito', date: '', on: idx >= 9 },
    { k: 'Entregada', date: '', on: idx >= 10 },
  ].filter((e) => e.on).reverse();
  return (
    <View style={{ paddingTop: 4 }}>
      {entries.map((e, i) => (
        <View key={i} style={{ flexDirection: 'row', gap: 13, alignItems: 'flex-start' }}>
          <View style={{ alignItems: 'center', alignSelf: 'stretch' }}>
            <View style={{ width: 11, height: 11, borderRadius: 999, marginTop: 5, backgroundColor: i === 0 ? colors.accent : colors.navy500, ...(i === 0 ? { borderWidth: 3, borderColor: alpha(colors.accent, 0.28) } : {}) }} />
            {i < entries.length - 1 && <View style={{ flex: 1, width: 2, backgroundColor: colors.line, marginVertical: 3, minHeight: 20 }} />}
          </View>
          <View style={{ flex: 1, paddingBottom: 18 }}>
            <AppText weight="600" style={{ fontSize: 13.5, color: colors.ink }}>{e.k}</AppText>
            {!!e.date && <AppText style={{ fontSize: 12, color: colors.ink50, marginTop: 2 }}>{e.date}</AppText>}
          </View>
        </View>
      ))}
    </View>
  );
}

function Head({ icon, title }: { icon: string; title: string }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 16, paddingTop: 14, paddingBottom: 10 }}>
      <View style={{ width: 32, height: 32, borderRadius: 9, backgroundColor: alpha(colors.navy500, 0.11), alignItems: 'center', justifyContent: 'center' }}><Icon name={icon as any} size={17} color={colors.navy700} /></View>
      <AppText weight="700" style={{ flex: 1, fontSize: 14.5, color: colors.ink }}>{title}</AppText>
    </View>
  );
}
function KV({ label, value, strong, last }: { label: string; value: string; strong?: boolean; last?: boolean }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, paddingVertical: 12, paddingHorizontal: 16, borderBottomWidth: last ? 0 : 1, borderBottomColor: colors.line, backgroundColor: strong ? alpha(colors.navy500, 0.05) : 'transparent' }}>
      <AppText weight={strong ? '700' : '500'} style={{ flex: 1, fontSize: 13.5, color: strong ? colors.ink : colors.ink50 }}>{label}</AppText>
      {strong ? <AppText serif weight="700" style={{ fontSize: 16, color: colors.ink }}>{value}</AppText> : <AppText weight="700" style={{ fontSize: 14, color: colors.ink }}>{value}</AppText>}
    </View>
  );
}
function Empty({ icon, text, pad = 46 }: { icon: string; text: string; pad?: number }) {
  return (
    <View style={{ alignItems: 'center', paddingVertical: pad, paddingHorizontal: 24 }}>
      <Icon name={icon as any} size={38} color={colors.ink40} />
      <AppText weight="500" style={{ fontSize: 14, color: colors.ink40, marginTop: 12, textAlign: 'center', lineHeight: 21 }}>{text}</AppText>
    </View>
  );
}
