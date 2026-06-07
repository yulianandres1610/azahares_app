// Órdenes: lista + detalle (Detalle · Pagos · Tracking · Chat · Historial).
// Portado de app/broker-orders.jsx.
import React, { useEffect, useRef, useState } from 'react';
import { Animated, Image, ScrollView, TextInput, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Circle, Path } from 'react-native-svg';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { alpha, colors, fonts, gradients, radius, shadows } from '../../theme/tokens';
import { Icon } from '../../components/Icon';
import { AppText, Avatar, Button, Card, Chip, Field, IconButton, Progress, Screen, Sheet, Tap, haptic } from '../../components/ui';
import { useApp } from '../../store/AppContext';
import { BK_ORDER_STATUS, BK_PIPELINE, money, type BkOrder, type BkPayment, useBroker } from '../../store/BrokerStore';
import { FadeUp, Hero, HeroStat, OrderBadge, Pipeline, useBkNav, useCountUp } from './ui';

const GLOBE = require('../../../assets/logo/logo-globe.png');
const idxOf = (st: any) => BK_PIPELINE.indexOf(st);

export function BrokerOrders() {
  const [s] = useBroker();
  const nav = useBkNav();
  const [q, setQ] = useState('');
  const [filter, setFilter] = useState('all');
  const list = s.orders.filter((o) => {
    if (filter === 'process' && idxOf(o.state) >= 10) return false;
    if (filter === 'done' && idxOf(o.state) < 10) return false;
    if (q && !`${o.number} ${o.client}`.toLowerCase().includes(q.toLowerCase())) return false;
    return true;
  }).sort((a, b) => b.ts - a.ts);
  const paid = s.orders.filter((o) => idxOf(o.state) >= 7).length;
  const ordersActive = s.orders.filter((o) => idxOf(o.state) >= 1 && idxOf(o.state) < 10).length;
  const paidContainers = s.orders.filter((o) => idxOf(o.state) >= 7).reduce((a, o) => a + o.containers, 0);

  return (
    <Screen padBottom={108} scroll={false}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 130 }} keyboardShouldPersistTaps="handled">
        <Hero>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <AppText serif weight="600" style={{ fontSize: 26, color: '#fff' }}>Órdenes</AppText>
            <IconButton name="plus" variant="glassDark" onPress={() => nav.openOverlay({ type: 'newOrder' })} />
          </View>
          <View style={{ flexDirection: 'row', gap: 8, marginTop: 16 }}>
            <HeroStat value={ordersActive} label="En proceso" />
            <HeroStat value={paid} label="Pagadas" />
            <HeroStat value={paidContainers} label="Cont. pagados" />
          </View>
        </Hero>

        <View style={{ padding: 16, paddingBottom: 0 }}>
          <Field icon="search" placeholder="Buscar nº de orden o cliente" value={q} onChangeText={setQ} right={q ? <IconButton name="x" variant="plain" iconSize={16} size={32} onPress={() => setQ('')} /> : undefined} />
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingHorizontal: 16, paddingTop: 14, paddingBottom: 6 }}>
          <Chip label="Todas" active={filter === 'all'} count={s.orders.length} onPress={() => setFilter('all')} />
          <Chip label="En proceso" active={filter === 'process'} color={colors.accent} count={s.orders.filter((o) => idxOf(o.state) < 10).length} onPress={() => setFilter('process')} />
          <Chip label="Completadas" active={filter === 'done'} color={colors.success} count={s.orders.filter((o) => idxOf(o.state) >= 10).length} onPress={() => setFilter('done')} />
        </ScrollView>

        <View style={{ paddingHorizontal: 16, paddingTop: 8, gap: 12 }}>
          {list.map((o, i) => <OrderCard key={o.id} o={o} i={i} onPress={() => nav.openOverlay({ type: 'order', id: o.id })} />)}
        </View>
      </ScrollView>
    </Screen>
  );
}

function OrderCard({ o, i, onPress }: { o: BkOrder; i: number; onPress: () => void }) {
  const meta = BK_ORDER_STATUS[o.state];
  const oi = idxOf(o.state);
  const pct = Math.round((oi / (BK_PIPELINE.length - 1)) * 100);
  const [run, setRun] = useState(false);
  useEffect(() => { const t = setTimeout(() => setRun(true), 80 + i * 60); return () => clearTimeout(t); }, [i]);
  const cif = useCountUp(o.cif, run, 900);
  const cargo = o.cargo === 'food' ? { icon: 'food', label: 'Alimentos' } : { icon: 'fuel', label: 'Combustible' };
  const barColor = oi >= 10 ? colors.success : meta.color;
  return (
    <FadeUp delay={i * 40}>
      <Card pad={0} onPress={onPress} style={{ overflow: 'hidden' }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 14, paddingTop: 14, paddingBottom: 12 }}>
          <LinearGradient colors={gradients.navy} style={{ width: 44, height: 44, borderRadius: 13, alignItems: 'center', justifyContent: 'center' }}>
            <Icon name={cargo.icon as any} size={22} color="#fff" />
          </LinearGradient>
          <View style={{ flex: 1, minWidth: 0 }}>
            <AppText weight="700" style={{ fontSize: 15, color: colors.ink }}>{o.number}</AppText>
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
          <OrderBadge status={o.state} size="sm" />
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 11 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}><Icon name={cargo.icon as any} size={13} color={colors.ink50} /><AppText weight="600" style={{ fontSize: 11.5, color: colors.ink50 }}>{cargo.label}</AppText></View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}><Icon name="layers" size={13} color={colors.ink50} /><AppText weight="600" style={{ fontSize: 11.5, color: colors.ink50 }}>{o.containers}</AppText></View>
          </View>
        </View>
      </Card>
    </FadeUp>
  );
}

// payments seed por etapa
function getPayments(o: BkOrder, idx: number): BkPayment[] {
  if (o.payments) return o.payments;
  if (idx >= 7) return [{ id: 'pay1', method: 'Transferencia bancaria', amount: o.cif, date: o.date, status: 'verified' }];
  if (idx === 6) return [{ id: 'pay1', method: 'Transferencia bancaria', amount: Math.round(o.cif * 0.4), date: o.date, status: 'pending' }];
  return [];
}

const TABS = [{ value: 'detail', label: 'Detalle' }, { value: 'pagos', label: 'Pagos' }, { value: 'tracking', label: 'Tracking' }, { value: 'chat', label: 'Chat' }, { value: 'log', label: 'Historial' }];

export function OrderDetail({ id, onClose }: { id: string; onClose: () => void }) {
  const [s, dispatch] = useBroker();
  const { showToast } = useApp();
  const insets = useSafeAreaInsets();
  const o = s.orders.find((x) => x.id === id);
  const [tab, setTab] = useState('detail');
  const [run, setRun] = useState(false);
  useEffect(() => { const r = setTimeout(() => setRun(true), 60); return () => clearTimeout(r); }, []);
  if (!o) return null;
  const idx = idxOf(o.state);
  const cifCount = useCountUp(o.cif, run);
  const charges = { flete: Math.round(o.fob * 0.14), thcd: 2400, ispd: 1800, seguro: Math.round(o.fob * 0.05) };

  const action = idx < 1 ? { label: 'Enviar cotización', icon: 'send', to: 'quote_sent' as const }
    : idx < 3 ? { label: 'Enviar oferta', icon: 'send', to: 'offer_sent' as const }
    : idx >= 5 && idx < 7 ? { label: 'Subir pago', icon: 'upload', go: 'pagos' as const } : null;

  return (
    <Screen scroll={false} padTop={false}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: action && tab === 'detail' ? 100 : 40 }} keyboardShouldPersistTaps="handled">
        <Hero padBottom={18}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
            <IconButton name="chevL" variant="glassDark" onPress={onClose} />
            <AppText serif weight="600" numberOfLines={1} style={{ fontSize: 25, color: '#fff', flex: 1, textAlign: 'center' }}>{o.number}</AppText>
            <IconButton name="share" variant="glassDark" onPress={() => showToast('Compartir orden', 'info')} />
          </View>
          <View style={{ marginTop: 20, alignItems: 'center' }}>
            <AppText style={{ color: 'rgba(255,255,255,0.6)', fontSize: 13.5 }}>{o.client}</AppText>
            <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 7, marginTop: 8 }}>
              <AppText serif weight="600" style={{ fontSize: 26, color: 'rgba(255,255,255,0.72)' }}>$</AppText>
              <AppText serif weight="600" style={{ fontSize: 40, color: '#fff', letterSpacing: -1 }}>{Math.round(cifCount).toLocaleString('en-US')}</AppText>
            </View>
            <AppText weight="700" style={{ color: 'rgba(255,255,255,0.5)', fontSize: 11, letterSpacing: 0.8, marginTop: 6 }}>TOTAL CIF · USD</AppText>
          </View>
          <View style={{ marginTop: 20 }}><Pipeline state={o.state} /></View>
        </Hero>

        {/* sub-tabs */}
        <View style={{ paddingHorizontal: 16, paddingTop: 14, paddingBottom: 2 }}>
          <View style={{ flexDirection: 'row', padding: 4, borderRadius: radius.md, backgroundColor: alpha(colors.ink, 0.06) }}>
            {TABS.map((tb) => {
              const on = tb.value === tab;
              return (
                <Tap key={tb.value} hapticKind="select" onPress={() => setTab(tb.value)} style={{ flex: 1, height: 38, borderRadius: radius.md - 4, alignItems: 'center', justifyContent: 'center', backgroundColor: on ? colors.surface : 'transparent', ...(on ? shadows.sm : {}) }}>
                  <AppText weight="600" numberOfLines={1} style={{ fontSize: 12, color: on ? colors.ink : colors.ink50 }}>{tb.label}</AppText>
                </Tap>
              );
            })}
          </View>
        </View>

        <View style={{ padding: 16 }}>
          {tab === 'detail' && <DetailTab o={o} charges={charges} idx={idx} />}
          {tab === 'pagos' && <PagosTab o={o} idx={idx} />}
          {tab === 'tracking' && <TrackingTab o={o} idx={idx} />}
          {tab === 'chat' && <ChatTab o={o} />}
          {tab === 'log' && <LogTab o={o} idx={idx} />}
        </View>
      </ScrollView>

      {action && tab === 'detail' && (
        <View style={{ position: 'absolute', left: 0, right: 0, bottom: 0, paddingHorizontal: 16, paddingTop: 16, paddingBottom: (insets.bottom || 0) + 16, backgroundColor: colors.bg }}>
          <Button variant="primary" icon={action.icon as any} onPress={() => {
            haptic('success');
            if ((action as any).go) setTab('pagos');
            else { dispatch({ type: 'SET_ORDER', id: o.id, patch: { state: (action as any).to } }); showToast(action.label + ' ✓', 'success'); }
          }}>{action.label}</Button>
        </View>
      )}
    </Screen>
  );
}

// ── Detalle ────────────────────────────────────────────────────
function DetailTab({ o, charges, idx }: { o: BkOrder; charges: any; idx: number }) {
  const { showToast } = useApp();
  const [docSheet, setDocSheet] = useState<string | null>(null);
  const pays = getPayments(o, idx);
  const paid = pays.filter((p) => p.status === 'verified').reduce((a, p) => a + p.amount, 0);
  const pct = Math.min(100, Math.round((paid / o.cif) * 100));
  const docs: { k: string; label: string; icon: string }[] = [];
  if (idx >= 1) docs.push({ k: 'cotizacion', label: 'Cotización', icon: 'send' });
  if (idx >= 3) docs.push({ k: 'oferta', label: 'Oferta', icon: 'fileText' });
  if (idx >= 5) docs.push({ k: 'factura', label: 'Factura', icon: 'receipt' });
  return (
    <View style={{ gap: 14 }}>
      {docs.length > 0 && (
        <Card pad={0} style={{ overflow: 'hidden' }}>
          <Head icon="fileText" title="Documentos" />
          {docs.map((d) => (
            <View key={d.k} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, paddingHorizontal: 16, borderTopWidth: 1, borderTopColor: colors.line }}>
              <View style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: alpha(colors.navy500, 0.11), alignItems: 'center', justifyContent: 'center' }}><Icon name={d.icon as any} size={18} color={colors.navy700} /></View>
              <AppText weight="600" style={{ flex: 1, fontSize: 14, color: colors.ink }}>{d.label}</AppText>
              <Tap onPress={() => { haptic('light'); showToast(d.label + ': Imprimir', 'info'); }} style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center' }}><Icon name="printer" size={17} color={colors.ink60} /></Tap>
              <Tap onPress={() => { haptic('light'); setDocSheet(d.k); }} style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center' }}><Icon name="share" size={17} color={colors.ink60} /></Tap>
            </View>
          ))}
        </Card>
      )}

      {idx >= 5 && (
        <Card pad={16}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
            <AppText weight="700" style={{ fontSize: 14, color: colors.ink }}>Pagado</AppText>
            <AppText style={{ fontSize: 13, color: colors.ink50 }}><AppText weight="700" style={{ color: colors.success }}>{money(paid)}</AppText> de {money(o.cif)}</AppText>
          </View>
          <Progress value={pct} color={colors.success} />
        </Card>
      )}

      <Card pad={0} style={{ overflow: 'hidden' }}>
        <Head icon="box" title={`Productos (${o.items})`} />
        <KV label="Diésel B5 · iso-tank" value={money(o.fob)} />
        <KV label="Contenedores" value={o.containers + ' × 20ft'} />
        <KV label="Subtotal FOB" value={money(o.fob)} strong last />
      </Card>
      <Card pad={0} style={{ overflow: 'hidden' }}>
        <Head icon="ship" title="Cargos navieros" badge="Solo lectura" />
        <KV label="Flete" value={money(charges.flete)} />
        <KV label="THCD" value={money(charges.thcd)} />
        <KV label="ISPD" value={money(charges.ispd)} />
        <KV label="Seguro" value={money(charges.seguro)} />
        <KV label="Total CIF" value={money(o.cif)} strong last />
      </Card>
      <Card pad={0} style={{ overflow: 'hidden' }}>
        <Head icon="map" title="Datos comerciales" />
        <KV label="Puerto origen" value="Port Shoals, AR" />
        <KV label="Puerto destino" value="La Habana" />
        <KV label="Plazo" value="20 días" last />
      </Card>

      <DocSheet kind={docSheet} order={o} onClose={() => setDocSheet(null)}
        onSend={(label) => { setDocSheet(null); haptic('success'); showToast(label + ' enviado por WhatsApp', 'success'); }}
        onAction={(verb, label) => { setDocSheet(null); haptic('success'); showToast(label + ': ' + verb, 'info'); }} />
    </View>
  );
}

// ── Pagos ──────────────────────────────────────────────────────
const PAY_ST: Record<string, { l: string; c: string; icon: string }> = {
  verified: { l: 'Verificado', c: colors.success, icon: 'checkCircle' },
  pending: { l: 'En revisión', c: colors.amber, icon: 'clock' },
  rejected: { l: 'Rechazado', c: colors.error, icon: 'x' },
};

function PagosTab({ o, idx }: { o: BkOrder; idx: number }) {
  const [, dispatch] = useBroker();
  const { showToast } = useApp();
  const [sheet, setSheet] = useState(false);
  const pays = getPayments(o, idx);
  const verified = pays.filter((p) => p.status === 'verified').reduce((a, p) => a + p.amount, 0);
  const pendingSum = pays.filter((p) => p.status === 'pending').reduce((a, p) => a + p.amount, 0);
  const remaining = Math.max(0, o.cif - verified);
  const pct = Math.min(100, Math.round((verified / o.cif) * 100));
  const canPay = idx >= 5;

  const addPayment = (amount: number, method: string, meta: { reference: string; sender: string }) => {
    const next: BkPayment[] = [{ id: 'pay' + Date.now(), method, amount, date: '7 jun 2026', status: 'pending', reference: meta.reference, sender: meta.sender }, ...pays];
    dispatch({ type: 'SET_ORDER', id: o.id, patch: { payments: next, state: idxOf(o.state) < 6 ? 'payment_uploaded' : o.state } });
    showToast('Comprobante enviado a validación', 'success');
  };

  if (!canPay) return <Empty icon="receipt" text="Los pagos se habilitan cuando la orden está facturada." />;

  return (
    <View style={{ gap: 14 }}>
      <View style={{ borderRadius: radius.xl, overflow: 'hidden', ...shadows.card }}>
        <LinearGradient colors={gradients.navyDeep} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ padding: 18 }}>
          <AppText weight="600" style={{ color: 'rgba(255,255,255,0.6)', fontSize: 11.5, letterSpacing: 0.5 }}>SALDO PENDIENTE</AppText>
          <AppText serif weight="600" style={{ fontSize: 34, color: '#fff', marginTop: 3 }}>{money(remaining)}</AppText>
          <View style={{ height: 7, borderRadius: 999, backgroundColor: 'rgba(255,255,255,0.18)', overflow: 'hidden', marginTop: 14, flexDirection: 'row' }}>
            <View style={{ width: `${pct}%` }}><LinearGradient colors={['#10b981', '#34d399']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={{ height: 7 }} /></View>
            <View style={{ width: `${Math.min(100 - pct, Math.round((pendingSum / o.cif) * 100))}%`, height: 7, backgroundColor: alpha(colors.amber, 0.85) }} />
          </View>
          <View style={{ flexDirection: 'row', gap: 16, marginTop: 11 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}><View style={{ width: 8, height: 8, borderRadius: 3, backgroundColor: '#34d399' }} /><AppText style={{ color: '#fff', fontSize: 12 }}>Verificado <AppText weight="700">{money(verified)}</AppText></AppText></View>
            {pendingSum > 0 && <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}><View style={{ width: 8, height: 8, borderRadius: 3, backgroundColor: colors.amber }} /><AppText style={{ color: '#fff', fontSize: 12 }}>En revisión <AppText weight="700">{money(pendingSum)}</AppText></AppText></View>}
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
            {pays.map((p, i) => {
              const st = PAY_ST[p.status];
              return (
                <FadeUp key={p.id} delay={i * 50}>
                  <Card pad={14}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 13 }}>
                      <View style={{ width: 44, height: 52, borderRadius: 9, backgroundColor: colors.bg, borderWidth: 1, borderColor: colors.line, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                        <Icon name="fileText" size={20} color={colors.ink40} />
                        <View style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 14, backgroundColor: st.c, alignItems: 'center', justifyContent: 'center' }}><Icon name={st.icon as any} size={9} color="#fff" /></View>
                      </View>
                      <View style={{ flex: 1, minWidth: 0 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 8 }}>
                          <AppText serif weight="700" style={{ fontSize: 17, color: colors.ink }}>{money(p.amount)}</AppText>
                          {p.amount < o.cif && <View style={{ backgroundColor: alpha(colors.navy500, 0.12), paddingHorizontal: 7, paddingVertical: 2, borderRadius: 999 }}><AppText weight="700" style={{ fontSize: 10.5, color: colors.navy700 }}>PARCIAL</AppText></View>}
                        </View>
                        <AppText style={{ fontSize: 12.5, color: colors.ink50, marginTop: 2 }}>{p.method} · {p.date}</AppText>
                        {(p.reference || p.sender) && <AppText style={{ fontSize: 11.5, color: colors.ink40, marginTop: 2 }}>{[p.sender, p.reference].filter(Boolean).join(' · ')}</AppText>}
                      </View>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, height: 26, paddingHorizontal: 10, borderRadius: 999, backgroundColor: alpha(st.c, 0.14) }}>
                        <Icon name={st.icon as any} size={13} color={st.c} />
                        <AppText weight="700" style={{ fontSize: 12, color: st.c }}>{st.l}</AppText>
                      </View>
                    </View>
                    {p.status === 'pending' && (
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 7, marginTop: 11, paddingTop: 11, borderTopWidth: 1, borderTopColor: colors.line }}>
                        <Icon name="seal" size={14} color={colors.amber} />
                        <AppText style={{ fontSize: 12, color: colors.ink50 }}>Esperando validación del equipo de Azahares</AppText>
                      </View>
                    )}
                  </Card>
                </FadeUp>
              );
            })}
          </View>
        )}
      </View>

      <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 9, paddingHorizontal: 4 }}>
        <Icon name="info" size={16} color={colors.accent} />
        <AppText style={{ flex: 1, fontSize: 12.5, lineHeight: 19, color: colors.ink50 }}>Podés registrar pagos parciales. Cada comprobante queda "En revisión" hasta que un administrador lo valida.</AppText>
      </View>

      <UploadSheet open={sheet} onClose={() => setSheet(false)} remaining={remaining} onSubmit={addPayment} />
    </View>
  );
}

function UploadSheet({ open, onClose, remaining, onSubmit }: { open: boolean; onClose: () => void; remaining: number; onSubmit: (n: number, method: string, meta: { reference: string; sender: string }) => void }) {
  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState('Transferencia bancaria');
  const [reference, setReference] = useState('');
  const [sender, setSender] = useState('');
  const [file, setFile] = useState(false);
  useEffect(() => { if (open) { setAmount(String(remaining)); setMethod('Transferencia bancaria'); setReference(''); setSender(''); setFile(false); } }, [open, remaining]);
  const n = Number(amount || 0);
  const valid = n > 0 && n <= remaining && file && reference.trim() && sender.trim();
  const methods = ['Transferencia bancaria', 'Zelle', 'Cripto (USDT)', 'Efectivo'];
  return (
    <Sheet open={open} onClose={onClose} title="Subir comprobante">
      <View style={{ paddingHorizontal: 16, paddingTop: 6, paddingBottom: 8, gap: 16 }}>
        <Tap onPress={() => { haptic('medium'); setFile(true); }} style={{ borderRadius: radius.lg, overflow: 'hidden', borderWidth: file ? 0 : 1.5, borderColor: colors.line, borderStyle: 'dashed', backgroundColor: colors.surface }}>
          {file ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, backgroundColor: alpha(colors.success, 0.09) }}>
              <View style={{ width: 40, height: 48, borderRadius: 8, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', ...shadows.sm }}><Icon name="fileText" size={20} color={colors.navy700} /></View>
              <View style={{ flex: 1 }}><AppText weight="700" style={{ fontSize: 13.5, color: colors.ink }}>comprobante.jpg</AppText><AppText style={{ fontSize: 12, color: colors.ink50 }}>1.2 MB · adjuntado</AppText></View>
              <Icon name="checkCircle" size={20} color={colors.success} />
            </View>
          ) : (
            <View style={{ alignItems: 'center', gap: 9, paddingVertical: 24 }}>
              <View style={{ width: 48, height: 48, borderRadius: 14, backgroundColor: alpha(colors.accent, 0.12), alignItems: 'center', justifyContent: 'center' }}><Icon name="camera" size={24} color={colors.accent} /></View>
              <AppText weight="600" style={{ fontSize: 14, color: colors.ink }}>Tomar foto o adjuntar</AppText>
              <AppText style={{ fontSize: 11.5, color: colors.ink40 }}>JPG, PNG o PDF</AppText>
            </View>
          )}
        </Tap>

        <View>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 7, marginLeft: 2 }}>
            <AppText weight="600" style={{ fontSize: 13, color: colors.ink60 }}>Monto del pago</AppText>
            <Tap onPress={() => setAmount(String(remaining))}><AppText weight="600" style={{ color: colors.accent, fontSize: 12 }}>Total {money(remaining)}</AppText></Tap>
          </View>
          <View style={{ justifyContent: 'center' }}>
            <AppText serif weight="600" style={{ position: 'absolute', left: 16, fontSize: 22, color: colors.ink40, zIndex: 1 }}>$</AppText>
            <TextInput value={amount} onChangeText={(v) => setAmount(v.replace(/[^\d.]/g, ''))} keyboardType="decimal-pad"
              style={{ height: 58, paddingLeft: 36, paddingRight: 16, borderRadius: radius.md, fontSize: 22, fontFamily: fonts.serif, color: colors.ink, borderWidth: 1.5, borderColor: amount && n > remaining ? colors.error : colors.line, backgroundColor: colors.surface }} />
          </View>
          {n > 0 && n < remaining && <AppText weight="600" style={{ fontSize: 12, color: colors.navy700, marginTop: 7, marginLeft: 2 }}>Pago parcial · quedarían {money(remaining - n)}</AppText>}
        </View>

        <View>
          <AppText weight="600" style={{ fontSize: 13, color: colors.ink60, marginBottom: 9, marginLeft: 2 }}>Método</AppText>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
            {methods.map((m) => <Chip key={m} label={m} active={method === m} onPress={() => setMethod(m)} />)}
          </ScrollView>
        </View>

        <Field label="Referencia / nº de transacción" icon="barcode" placeholder="Ej. TRX-998120" value={reference} onChangeText={setReference} />
        <Field label="Nombre de quien envía" icon="user" placeholder="Ej. María Rivas" value={sender} onChangeText={setSender} autoCapitalize="words" />

        <Button variant="primary" icon="upload" disabled={!valid} onPress={() => { haptic('success'); onSubmit(n, method, { reference, sender }); onClose(); }}>Enviar a validación</Button>
      </View>
    </Sheet>
  );
}

// ── Tracking ───────────────────────────────────────────────────
function TrackingTab({ o, idx }: { o: BkOrder; idx: number }) {
  const shipped = idx >= 8;
  const milestones = [
    { k: 'En compra', at: 8, icon: 'box', desc: 'Producto adquirido en origen', date: '8 jun · 10:20' },
    { k: 'En tránsito', at: 9, icon: 'ship', desc: 'En ruta marítima a La Habana', date: '10 jun · 06:00' },
    { k: 'Entregada', at: 10, icon: 'checkCircle', desc: 'Recibida por el cliente', date: 'ETA 14 jun' },
  ];
  if (!shipped) {
    return (
      <View>
        <Empty icon="ship" text="El tracking se activa cuando la orden entra en compra." />
        <View style={{ marginTop: 4 }}>
          {milestones.map((m, i) => (
            <View key={i} style={{ flexDirection: 'row', gap: 13, alignItems: 'flex-start', opacity: 0.5 }}>
              <View style={{ alignItems: 'center', alignSelf: 'stretch' }}>
                <View style={{ width: 30, height: 30, borderRadius: 999, backgroundColor: colors.surface, borderWidth: 1.5, borderColor: colors.line, alignItems: 'center', justifyContent: 'center' }}><Icon name={m.icon as any} size={15} color={colors.ink40} /></View>
                {i < milestones.length - 1 && <View style={{ flex: 1, width: 2, backgroundColor: colors.line, marginVertical: 3, minHeight: 22 }} />}
              </View>
              <View style={{ flex: 1, paddingBottom: 16, paddingTop: 4 }}><AppText weight="600" style={{ fontSize: 14, color: colors.ink }}>{m.k}</AppText><AppText style={{ fontSize: 12, color: colors.ink50 }}>{m.desc}</AppText></View>
            </View>
          ))}
        </View>
      </View>
    );
  }
  const moving = idx === 9;
  const journeyPct = idx >= 10 ? 100 : idx === 9 ? 62 : 18;
  return (
    <View style={{ gap: 14 }}>
      <MiniMap moving={moving} />

      <View style={{ borderRadius: radius.xl, overflow: 'hidden' }}>
        <LinearGradient colors={gradients.navyDeep} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ padding: 18 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <View>
              <AppText weight="700" style={{ color: 'rgba(255,255,255,0.6)', fontSize: 11, letterSpacing: 0.6 }}>LLEGADA ESTIMADA</AppText>
              <AppText serif weight="600" style={{ fontSize: 26, color: '#fff', marginTop: 3 }}>14 jun 2026</AppText>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <AppText weight="600" style={{ color: 'rgba(255,255,255,0.6)', fontSize: 11 }}>{idx >= 10 ? 'Entregada' : 'Faltan'}</AppText>
              <AppText weight="700" style={{ fontSize: 17, color: '#34d399' }}>{idx >= 10 ? '✓' : '7 días'}</AppText>
            </View>
          </View>
          <View style={{ marginTop: 18, height: 26, justifyContent: 'center' }}>
            <View style={{ position: 'absolute', left: 0, right: 0, height: 3, borderRadius: 999, backgroundColor: 'rgba(255,255,255,0.18)' }} />
            <View style={{ position: 'absolute', left: 0, height: 3, borderRadius: 999, width: `${journeyPct}%` }}><LinearGradient colors={['#10b981', '#34d399']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={{ height: 3, borderRadius: 999 }} /></View>
            <View style={{ position: 'absolute', left: 0, width: 9, height: 9, borderRadius: 999, backgroundColor: '#fff' }} />
            <View style={{ position: 'absolute', right: 0 }}><Icon name="mapPin2" size={14} color="rgba(255,255,255,0.7)" /></View>
            <View style={{ position: 'absolute', left: `${journeyPct}%`, marginLeft: -13 }}><Icon name="ship" size={26} color="#fff" /></View>
          </View>
        </LinearGradient>
      </View>

      <Card pad={14}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 13 }}>
          <View style={{ width: 44, height: 44, borderRadius: 12, backgroundColor: alpha(colors.navy500, 0.12), alignItems: 'center', justifyContent: 'center' }}><Icon name="ship" size={22} color={colors.navy700} /></View>
          <View style={{ flex: 1 }}>
            <AppText weight="700" style={{ fontSize: 14.5, color: colors.ink }}>MV Caribbean Star</AppText>
            <AppText style={{ fontSize: 12.5, color: colors.ink50, marginTop: 1 }}>Booking · MAEU-583920</AppText>
          </View>
          <View style={{ backgroundColor: alpha(colors.navy500, 0.11), paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999 }}><AppText weight="700" style={{ fontSize: 11.5, color: colors.navy700 }}>{o.containers} cont.</AppText></View>
        </View>
      </Card>

      <View>
        <AppText weight="700" style={{ fontSize: 12, color: colors.ink40, letterSpacing: 0.6, marginHorizontal: 6, marginBottom: 12 }}>RECORRIDO</AppText>
        {milestones.map((m, i) => {
          const done = idx > m.at; const cur = idx === m.at;
          return (
            <View key={i} style={{ flexDirection: 'row', gap: 13, alignItems: 'flex-start' }}>
              <View style={{ alignItems: 'center', alignSelf: 'stretch' }}>
                <View style={{ width: 36, height: 36, borderRadius: 999, alignItems: 'center', justifyContent: 'center', overflow: 'hidden', ...(done ? { backgroundColor: colors.success } : cur ? {} : { backgroundColor: colors.surface, borderWidth: 1.5, borderColor: colors.line }) }}>
                  {cur && <LinearGradient colors={gradients.navy} style={{ position: 'absolute', inset: 0 as any }} />}
                  {done ? <Icon name="check" size={17} color="#fff" /> : <Icon name={m.icon as any} size={17} color={cur ? '#fff' : colors.ink40} />}
                </View>
                {i < milestones.length - 1 && <View style={{ flex: 1, width: 2, backgroundColor: done ? colors.success : colors.line, marginVertical: 3, minHeight: 30 }} />}
              </View>
              <View style={{ flex: 1, paddingBottom: 22, paddingTop: 4 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                  <AppText weight="700" style={{ fontSize: 14.5, color: cur || done ? colors.ink : colors.ink60 }}>{m.k}</AppText>
                  <AppText weight="600" style={{ fontSize: 11.5, color: cur ? colors.success : colors.ink40 }}>{m.date}</AppText>
                </View>
                <AppText style={{ fontSize: 12.5, color: colors.ink50, marginTop: 2 }}>{m.desc}</AppText>
                {cur && <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 7, alignSelf: 'flex-start', backgroundColor: alpha(colors.success, 0.12), paddingHorizontal: 9, paddingVertical: 3, borderRadius: 999 }}><View style={{ width: 6, height: 6, borderRadius: 999, backgroundColor: colors.success }} /><AppText weight="700" style={{ fontSize: 11.5, color: colors.success }}>Estado actual</AppText></View>}
              </View>
            </View>
          );
        })}
      </View>
    </View>
  );
}

function MiniMap({ moving }: { moving: boolean }) {
  return (
    <View style={{ borderRadius: radius.lg, overflow: 'hidden', height: 194 }}>
      <LinearGradient colors={['#cfe0f5', '#acc6ec']} style={{ flex: 1 }}>
        <Svg width="100%" height="194" viewBox="0 0 320 194">
          <Path d="M58 152 L128 116 L192 81 L262 46" stroke="rgba(13,27,61,0.45)" strokeWidth={3} strokeDasharray="2 7" strokeLinecap="round" fill="none" />
          <Circle cx={58} cy={152} r={6} fill={colors.navy700} />
          <Circle cx={moving ? 192 : 262} cy={moving ? 81 : 46} r={9} fill={colors.navy700} stroke="#fff" strokeWidth={3} />
        </Svg>
      </LinearGradient>
      <View style={{ position: 'absolute', bottom: 10, left: 10, flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999, backgroundColor: 'rgba(255,255,255,0.86)' }}>
        <View style={{ width: 7, height: 7, borderRadius: 999, backgroundColor: colors.navy700 }} /><AppText weight="700" style={{ fontSize: 11, color: colors.ink }}>Port Shoals</AppText>
      </View>
      <View style={{ position: 'absolute', top: 10, right: 10, flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999, backgroundColor: 'rgba(255,255,255,0.86)' }}>
        <Icon name="mapPin2" size={12} color={colors.error} /><AppText weight="700" style={{ fontSize: 11, color: colors.ink }}>La Habana</AppText>
      </View>
      {moving && (
        <View style={{ position: 'absolute', top: 10, left: 10, flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 11, paddingVertical: 6, borderRadius: 999, backgroundColor: 'rgba(13,27,61,0.84)' }}>
          <View style={{ width: 7, height: 7, borderRadius: 999, backgroundColor: '#34d399' }} /><AppText weight="700" style={{ color: '#fff', fontSize: 12 }}>En movimiento</AppText>
        </View>
      )}
    </View>
  );
}

// ── Chat (WhatsApp) ────────────────────────────────────────────
function ChatTab({ o }: { o: BkOrder }) {
  const { showToast } = useApp();
  const [docSheet, setDocSheet] = useState<string | null>(null);
  const [msgs, setMsgs] = useState<any[]>([
    { id: 1, who: 'them', text: 'Hola, ¿ya está lista la cotización?', time: '9:02' },
    { id: 2, who: 'me', text: `Sí, le comparto la cotización de ${o.number}.`, time: '9:04' },
    { id: 3, who: 'me', kind: 'doc', doc: 'Cotización', sub: money(o.cif), time: '9:04' },
    { id: 4, who: 'them', text: 'Perfecto, la reviso y le confirmo.', time: '9:10' },
  ]);
  const send = (m: any) => { setMsgs((x) => [...x, { id: Date.now(), time: 'ahora', ...m }]); haptic('success'); };
  const quick = (label: string, doc: string, sub?: string) => { send({ who: 'me', kind: 'doc', doc, sub }); showToast(`${label} enviado por WhatsApp`, 'success'); };

  const actions = [
    { k: 'factura', label: 'Factura', icon: 'receipt', sheet: true },
    { k: 'oferta', label: 'Oferta', icon: 'fileText', sheet: true },
    { k: 'tracking', label: 'Link de tracking', icon: 'navigation', onPress: () => quick('Link de tracking', 'Seguimiento de envío', 'azaharesfuel.com/track/' + o.number.slice(-4)) },
    { k: 'refirmar', label: 'Refirmar factura', icon: 'edit', onPress: () => quick('Solicitud de refirma', 'Refirmar factura', o.number) },
    { k: 'pago', label: 'Link de pago', icon: 'upload', onPress: () => quick('Link para comprobantes', 'Cargar comprobante de pago', 'azaharesfuel.com/pago/' + o.number.slice(-4)) },
  ];

  return (
    <View style={{ gap: 14 }}>
      <Card pad={13}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <View>
            <Avatar name={o.client} size={44} />
            <View style={{ position: 'absolute', bottom: 0, right: 0, width: 12, height: 12, borderRadius: 999, backgroundColor: '#25D366', borderWidth: 2, borderColor: colors.surface }} />
          </View>
          <View style={{ flex: 1, minWidth: 0 }}>
            <AppText weight="700" numberOfLines={1} style={{ fontSize: 14.5, color: colors.ink }}>{o.client}</AppText>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}><Icon name="whatsapp" size={13} color="#25D366" /><AppText weight="600" style={{ fontSize: 12, color: '#25D366' }}>WhatsApp · en línea</AppText></View>
          </View>
          <IconButton name="whatsapp" variant="soft" color="#1f9d55" onPress={() => showToast('Abriendo WhatsApp…', 'info')} />
        </View>
      </Card>

      <View style={{ backgroundColor: alpha(colors.navy500, 0.05), borderRadius: radius.lg, padding: 14, gap: 10, minHeight: 200 }}>
        {msgs.map((m) => <Bubble key={m.id} m={m} onDoc={() => setDocSheet(m.doc === 'Oferta' ? 'oferta' : 'factura')} />)}
      </View>

      <View>
        <AppText weight="700" style={{ fontSize: 12, color: colors.ink40, letterSpacing: 0.6, marginHorizontal: 6, marginBottom: 10 }}>ACCESOS DIRECTOS</AppText>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 9 }}>
          {actions.map((a) => (
            <Tap key={a.k} onPress={() => { haptic('light'); a.sheet ? setDocSheet(a.k) : a.onPress!(); }} style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 11, paddingHorizontal: 14, borderRadius: 14, backgroundColor: colors.surface, ...shadows.sm }}>
              <View style={{ width: 30, height: 30, borderRadius: 9, backgroundColor: alpha(colors.navy500, 0.11), alignItems: 'center', justifyContent: 'center' }}><Icon name={a.icon as any} size={16} color={colors.navy700} /></View>
              <AppText weight="600" style={{ fontSize: 13, color: colors.ink }}>{a.label}</AppText>
            </Tap>
          ))}
        </ScrollView>
      </View>

      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 9 }}>
        <View style={{ flex: 1, height: 48, borderRadius: 999, backgroundColor: colors.surface, borderWidth: 1.5, borderColor: colors.line, justifyContent: 'center', paddingHorizontal: 16 }}><AppText style={{ color: colors.ink40, fontSize: 14 }}>Escribí un mensaje…</AppText></View>
        <Tap onPress={() => send({ who: 'me', text: '¡Gracias! Quedo atento.' })} style={{ width: 48, height: 48, borderRadius: 999, overflow: 'hidden' }}>
          <LinearGradient colors={gradients.navy} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}><Icon name="send" size={20} color="#fff" /></LinearGradient>
        </Tap>
      </View>

      <DocSheet kind={docSheet} order={o} onClose={() => setDocSheet(null)}
        onSend={(label) => { setDocSheet(null); quick(label, label, money(o.cif)); }}
        onAction={(verb, label) => { setDocSheet(null); haptic('success'); showToast(`${label}: ${verb}`, 'info'); }} />
    </View>
  );
}

function Bubble({ m, onDoc }: { m: any; onDoc: () => void }) {
  const me = m.who === 'me';
  if (m.kind === 'doc') {
    const inner = (
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 11, padding: 11 }}>
        <View style={{ width: 40, height: 48, borderRadius: 8, backgroundColor: me ? 'rgba(255,255,255,0.16)' : colors.bg, alignItems: 'center', justifyContent: 'center' }}><Icon name="fileText" size={20} color={me ? '#fff' : colors.ink} /></View>
        <View style={{ minWidth: 0 }}>
          <AppText weight="700" style={{ fontSize: 13.5, color: me ? '#fff' : colors.ink }}>{m.doc}</AppText>
          {m.sub && <AppText style={{ fontSize: 12, color: me ? 'rgba(255,255,255,0.8)' : colors.ink60, marginTop: 1 }}>{m.sub}</AppText>}
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 }}><Icon name="download" size={11} color={me ? 'rgba(255,255,255,0.65)' : colors.ink40} /><AppText style={{ fontSize: 10.5, color: me ? 'rgba(255,255,255,0.65)' : colors.ink40 }}>Toca para ver</AppText></View>
        </View>
      </View>
    );
    return (
      <View style={{ alignSelf: me ? 'flex-end' : 'flex-start', maxWidth: '82%' }}>
        <Tap onPress={onDoc} style={{ borderRadius: 16, overflow: 'hidden', ...(me ? shadows.sm : shadows.sm) }}>
          {me ? <LinearGradient colors={gradients.navy} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>{inner}</LinearGradient> : <View style={{ backgroundColor: colors.surface }}>{inner}</View>}
        </Tap>
        <AppText style={{ fontSize: 10, color: colors.ink40, marginTop: 3, textAlign: me ? 'right' : 'left' }}>{m.time}</AppText>
      </View>
    );
  }
  return (
    <View style={{ alignSelf: me ? 'flex-end' : 'flex-start', maxWidth: '80%' }}>
      <View style={{ paddingVertical: 9, paddingHorizontal: 13, borderRadius: 16, borderBottomRightRadius: me ? 4 : 16, borderBottomLeftRadius: me ? 16 : 4, backgroundColor: me ? colors.navy700 : colors.surface, ...(me ? {} : shadows.sm) }}>
        <AppText style={{ color: me ? '#fff' : colors.ink, fontSize: 13.5, lineHeight: 19 }}>{m.text}</AppText>
      </View>
      <AppText style={{ fontSize: 10, color: colors.ink40, marginTop: 3, textAlign: me ? 'right' : 'left' }}>{m.time}</AppText>
    </View>
  );
}

function DocSheet({ kind, order, onClose, onSend, onAction }: { kind: string | null; order: BkOrder; onClose: () => void; onSend: (label: string) => void; onAction: (verb: string, label: string) => void }) {
  const label = kind === 'oferta' ? 'Oferta' : 'Factura';
  return (
    <Sheet open={!!kind} onClose={onClose} title={label + ' · ' + order.number}>
      <View style={{ paddingHorizontal: 16, paddingTop: 4, paddingBottom: 10 }}>
        <View style={{ borderRadius: radius.lg, overflow: 'hidden', marginBottom: 16, ...shadows.sm }}>
          <LinearGradient colors={gradients.navyDeep} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ padding: 16, flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <Image source={GLOBE} style={{ height: 24, width: 24, tintColor: '#fff' }} resizeMode="contain" />
            <AppText serif weight="600" style={{ color: '#fff', fontSize: 15 }}>Azahares · {label}</AppText>
          </LinearGradient>
          <View style={{ backgroundColor: colors.surface, padding: 16 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}><AppText style={{ fontSize: 13, color: colors.ink50 }}>{order.number}</AppText><AppText style={{ fontSize: 13, color: colors.ink50 }}>7 jun 2026</AppText></View>
            <AppText serif weight="700" style={{ fontSize: 26, color: colors.ink, marginTop: 8 }}>{money(order.cif)}</AppText>
            <AppText style={{ fontSize: 12.5, color: colors.ink50, marginTop: 2 }}>{order.client} · Total CIF</AppText>
          </View>
        </View>
        <Button variant="primary" icon="whatsapp" onPress={() => onSend(label)}>Enviar por WhatsApp</Button>
        <View style={{ flexDirection: 'row', gap: 10, marginTop: 10 }}>
          <View style={{ flex: 1 }}><Button variant="outline" icon="printer" onPress={() => onAction('Imprimir', label)}>Imprimir</Button></View>
          <View style={{ flex: 1 }}><Button variant="outline" icon="share" onPress={() => onAction('Compartir', label)}>Compartir</Button></View>
        </View>
      </View>
    </Sheet>
  );
}

// ── Historial ──────────────────────────────────────────────────
function LogTab({ o, idx }: { o: BkOrder; idx: number }) {
  const all = [
    { k: 'Orden creada', i: 0, by: 'Marlon Q.' }, { k: 'Cotización enviada', i: 1, by: 'Marlon Q.' },
    { k: 'Cliente aceptó', i: 2, by: o.client }, { k: 'Oferta firmada', i: 4, by: o.client },
    { k: 'Factura emitida', i: 5, by: 'Azahares' }, { k: 'Pago subido', i: 6, by: 'Marlon Q.' },
    { k: 'Pago verificado', i: 7, by: 'Admin Azahares' }, { k: 'En tránsito', i: 9, by: 'Azahares' },
  ].filter((e) => e.i <= idx).reverse();
  return (
    <View style={{ paddingTop: 4 }}>
      {all.map((e, i) => (
        <View key={i} style={{ flexDirection: 'row', gap: 13, alignItems: 'flex-start' }}>
          <View style={{ alignItems: 'center', alignSelf: 'stretch' }}>
            <View style={{ width: 11, height: 11, borderRadius: 999, marginTop: 5, backgroundColor: i === 0 ? colors.accent : colors.navy500, ...(i === 0 ? { borderWidth: 3, borderColor: alpha(colors.accent, 0.28) } : {}) }} />
            {i < all.length - 1 && <View style={{ flex: 1, width: 2, backgroundColor: colors.line, marginVertical: 3, minHeight: 20 }} />}
          </View>
          <View style={{ flex: 1, paddingBottom: 18 }}>
            <AppText weight="600" style={{ fontSize: 13.5, color: colors.ink }}>{e.k}</AppText>
            <AppText style={{ fontSize: 12, color: colors.ink50, marginTop: 2 }}>{o.date} · {e.by}</AppText>
          </View>
        </View>
      ))}
    </View>
  );
}

// ── helpers compartidos ────────────────────────────────────────
function Head({ icon, title, badge }: { icon: string; title: string; badge?: string }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 16, paddingTop: 14, paddingBottom: 10 }}>
      <View style={{ width: 32, height: 32, borderRadius: 9, backgroundColor: alpha(colors.navy500, 0.11), alignItems: 'center', justifyContent: 'center' }}><Icon name={icon as any} size={17} color={colors.navy700} /></View>
      <AppText weight="700" style={{ flex: 1, fontSize: 14.5, color: colors.ink }}>{title}</AppText>
      {badge && <View style={{ backgroundColor: alpha(colors.ink, 0.06), paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999 }}><AppText weight="700" style={{ fontSize: 10.5, color: colors.ink40, letterSpacing: 0.4 }}>{badge.toUpperCase()}</AppText></View>}
    </View>
  );
}
function KV({ label, value, strong, last }: { label: string; value: string; strong?: boolean; last?: boolean }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, paddingVertical: 12, paddingHorizontal: 16, borderBottomWidth: last ? 0 : 1, borderBottomColor: colors.line, backgroundColor: strong ? alpha(colors.navy500, 0.05) : 'transparent' }}>
      <AppText weight={strong ? '700' : '500'} style={{ fontSize: 13.5, color: strong ? colors.ink : colors.ink50 }}>{label}</AppText>
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
