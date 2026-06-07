// Dashboard del broker — datos REALES: /dashboard/broker-summary +
// /products/sales-catalog + price-history. Ticker, catálogo, KPIs, resumen.
import React, { useEffect, useRef, useState } from 'react';
import { Animated, Easing, RefreshControl, ScrollView, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Circle, Defs, LinearGradient as SvgLinear, Path, Stop } from 'react-native-svg';
import { alpha, colors, gradients, radius, shadows } from '../../theme/tokens';
import { Icon } from '../../components/Icon';
import { AppText, Avatar, Button, IconButton, Ring, Screen, Sheet, Tap, haptic } from '../../components/ui';
import { useApp } from '../../store/AppContext';
import { money, summaryCounts, useBroker, type UICatalogItem } from '../../store/BrokerStore';
import { FadeUp, Hero, saludoES, useBkNav, useCountUp } from './ui';

function changeColor(ch: number) { return ch > 0 ? colors.success : ch < 0 ? colors.error : colors.ink40; }

function Spark({ data, color, w = 138, h = 30 }: { data: number[]; color: string; w?: number; h?: number }) {
  const safe = data.length >= 2 ? data : [data[0] ?? 0, data[0] ?? 0];
  const min = Math.min(...safe); const max = Math.max(...safe); const span = max - min || 1;
  const pts = safe.map((v, i) => [(i / (safe.length - 1)) * w, h - ((v - min) / span) * (h - 4) - 2]);
  const d = pts.map((p, i) => `${i ? 'L' : 'M'}${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join(' ');
  const area = `${d} L${w} ${h} L0 ${h} Z`;
  const last = pts[pts.length - 1];
  const id = useRef('sp' + Math.round(w + h + (data[0] ?? 1) * 1000)).current;
  return (
    <Svg width={w} height={h}>
      <Defs><SvgLinear id={id} x1="0" y1="0" x2="0" y2="1"><Stop offset="0" stopColor={color} stopOpacity={0.28} /><Stop offset="1" stopColor={color} stopOpacity={0} /></SvgLinear></Defs>
      <Path d={area} fill={`url(#${id})`} />
      <Path d={d} fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
      <Circle cx={last[0]} cy={last[1]} r={2.6} fill={color} />
    </Svg>
  );
}

export function BrokerHome() {
  const { me, notifications } = useApp();
  const { dashboard, catalog, orders, refreshAll } = useBroker();
  const nav = useBkNav();
  const c = summaryCounts(dashboard);
  const [anim, setAnim] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [priceItem, setPriceItem] = useState<UICatalogItem | null>(null);
  useEffect(() => { const r = setTimeout(() => setAnim(true), 60); return () => clearTimeout(r); }, []);

  const firstName = (me?.fullName || me?.email || '').split(' ')[0] || '';
  const items = catalog?.items || [];
  const onRefresh = async () => { setRefreshing(true); haptic('light'); await refreshAll(); setRefreshing(false); };

  const kpis = [
    { key: 'clients', icon: 'users', label: 'Clientes activos', value: c.clientsActive, sub: `${c.clientsTotal} en total`, tone: colors.accent, tab: 'clients' as const },
    { key: 'quotes', icon: 'send', label: 'Cotizaciones', value: c.quotesSent, sub: money(c.quotesSum), tone: colors.navy500, tab: 'orders' as const },
    { key: 'invoiced', icon: 'receipt', label: 'Facturas emitidas', value: c.invoiced, sub: money(c.invoicedSum), tone: colors.amber, tab: 'orders' as const },
    { key: 'paid', icon: 'checkCircle', label: 'Facturas pagadas', value: c.paid, sub: money(c.paidSum), tone: colors.success, tab: 'orders' as const },
  ];

  return (
    <Screen padBottom={108} scroll={false}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 130 }} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.navy700} />}>
        <Hero padBottom={0} padTopExtra={6}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <View style={{ flex: 1, minWidth: 0 }}>
              <AppText style={{ color: 'rgba(255,255,255,0.62)', fontSize: 13.5 }}>{saludoES()},</AppText>
              <AppText serif weight="600" numberOfLines={1} style={{ fontSize: 25, color: '#fff', marginTop: 1 }}>{firstName}</AppText>
            </View>
            <View>
              <IconButton name="bell" variant="glassDark" onPress={() => nav.openOverlay({ type: 'notifs' })} />
              {notifications.some((n) => !n.read) && <View style={{ position: 'absolute', top: 9, right: 10, width: 8, height: 8, borderRadius: 999, backgroundColor: colors.error, borderWidth: 2, borderColor: colors.navy900 }} />}
            </View>
            <Tap onPress={() => nav.setTab('profile')}>
              <Avatar name={me?.fullName} src={me?.avatarUrl} size={42} />
            </Tap>
          </View>

          <HeroTotal total={c.totalSold} paid={c.paidSum} active={Math.max(0, c.quotesSum - c.paidSum)} run={anim} />
          {items.length > 0 && <Ticker items={items} />}
        </Hero>

        <View style={{ paddingHorizontal: 20, paddingTop: 18, paddingBottom: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <View>
            <AppText serif weight="600" style={{ fontSize: 19, color: colors.ink }}>Catálogo del día</AppText>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 3 }}>
              <View style={{ width: 7, height: 7, borderRadius: 999, backgroundColor: colors.success }} />
              <AppText weight="500" style={{ fontSize: 11.5, color: colors.ink50 }}>Precios base Azahares{catalog?.updated ? ` · ${catalog.updated}` : ''}</AppText>
            </View>
          </View>
          <Tap onPress={() => nav.openOverlay({ type: 'catalog' })} style={{ width: 38, height: 38, borderRadius: 11, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center', ...shadows.sm }}>
            <Icon name="fileText" size={18} color={colors.navy700} />
          </Tap>
        </View>

        {items.length === 0 ? (
          <View style={{ paddingHorizontal: 16 }}>
            <View style={{ height: 150, borderRadius: radius.lg, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center', ...shadows.sm }}>
              <Icon name="fuel" size={32} color={colors.ink30} />
              <AppText style={{ fontSize: 13, color: colors.ink40, marginTop: 10 }}>Catálogo no disponible</AppText>
            </View>
          </View>
        ) : (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 12, paddingHorizontal: 16, paddingVertical: 2 }}>
            {items.map((p, i) => <PriceCard key={p.id} p={p} i={i} onPress={() => { haptic('light'); setPriceItem(p); }} />)}
          </ScrollView>
        )}

        <View style={{ padding: 16, paddingBottom: 0, flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
          {kpis.map((k, i) => (
            <FadeUp key={k.key} delay={i * 50} style={{ width: '47.6%', flexGrow: 1 }}>
              <Tap onPress={() => nav.setTab(k.tab)} style={{ backgroundColor: colors.surface, borderRadius: radius.lg, padding: 15, ...shadows.card }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                  <View style={{ width: 36, height: 36, borderRadius: 11, backgroundColor: alpha(k.tone, 0.14), alignItems: 'center', justifyContent: 'center' }}>
                    <Icon name={k.icon as any} size={19} color={k.tone} />
                  </View>
                  <Icon name="chevR" size={16} color={colors.ink30} />
                </View>
                <AppText serif weight="600" style={{ fontSize: 28, color: colors.ink, marginTop: 10, lineHeight: 30 }}>{anim ? k.value : 0}</AppText>
                <AppText weight="700" style={{ fontSize: 12.5, color: colors.ink, marginTop: 6 }}>{k.label}</AppText>
                <AppText style={{ fontSize: 12, color: colors.ink50, marginTop: 2 }}>{k.sub}</AppText>
              </Tap>
            </FadeUp>
          ))}
        </View>

        <View style={{ paddingHorizontal: 20, paddingTop: 22, paddingBottom: 10 }}>
          <AppText serif weight="600" style={{ fontSize: 18, color: colors.ink }}>Accesos rápidos</AppText>
        </View>
        <View style={{ paddingHorizontal: 16, flexDirection: 'row', gap: 10 }}>
          <QuickAction icon="send" label="Nueva cotización" onPress={() => nav.openOverlay({ type: 'newOrder' })} />
          <QuickAction icon="fileText" label="Catálogo" onPress={() => nav.openOverlay({ type: 'catalog' })} />
          <QuickAction icon="wallet" label="Mi wallet" onPress={() => nav.setTab('wallet')} />
        </View>

        <View style={{ paddingHorizontal: 20, paddingTop: 24, paddingBottom: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <AppText serif weight="600" style={{ fontSize: 18, color: colors.ink }}>Resumen de operación</AppText>
          <Tap onPress={() => nav.setTab('orders')} hapticKind="select" style={{ flexDirection: 'row', alignItems: 'center', gap: 2 }}>
            <AppText weight="600" style={{ color: colors.accent, fontSize: 13.5 }}>Ver órdenes</AppText>
            <Icon name="chevR" size={15} color={colors.accent} />
          </Tap>
        </View>
        <View style={{ paddingHorizontal: 16, flexDirection: 'row', gap: 12 }}>
          <View style={{ flex: 1.1, backgroundColor: colors.surface, borderRadius: radius.lg, padding: 16, flexDirection: 'row', alignItems: 'center', gap: 14, ...shadows.card }}>
            <Ring value={anim ? c.conversion / 100 : 0} size={62} stroke={7} color={colors.success}>
              <AppText weight="700" style={{ fontSize: 15, color: colors.ink }}>{c.conversion}%</AppText>
            </Ring>
            <View style={{ flex: 1 }}>
              <AppText weight="700" style={{ fontSize: 13.5, color: colors.ink }}>Conversión</AppText>
              <AppText style={{ fontSize: 12, color: colors.ink50, marginTop: 2 }}>{c.paid} de {dashboard?.salesOrders.total ?? orders.length} pagadas</AppText>
            </View>
          </View>
          <View style={{ flex: 1, gap: 12 }}>
            <MiniStat icon="layers" label="Órdenes activas" value={c.ordersActive} onPress={() => nav.setTab('orders')} />
            <MiniStat icon="clock" label="Clientes pendientes" value={c.clientsPending} tone={colors.amber} onPress={() => nav.setTab('clients')} />
          </View>
        </View>
      </ScrollView>

      <PriceSheet p={priceItem} onClose={() => setPriceItem(null)} onQuote={() => { setPriceItem(null); nav.openOverlay({ type: 'newOrder' }); }} />
    </Screen>
  );
}

function HeroTotal({ total, paid, active, run }: { total: number; paid: number; active: number; run: boolean }) {
  const v = useCountUp(total, run);
  const barPaid = useRef(new Animated.Value(0)).current;
  const barActive = useRef(new Animated.Value(0)).current;
  const denom = paid + active || 1;
  useEffect(() => {
    if (!run) return;
    Animated.timing(barPaid, { toValue: (paid / denom) * 100, duration: 1200, useNativeDriver: false }).start();
    Animated.timing(barActive, { toValue: (active / denom) * 100, duration: 1200, delay: 150, useNativeDriver: false }).start();
  }, [run, paid, active, denom, barPaid, barActive]);
  return (
    <View style={{ marginTop: 16 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 7 }}>
        <AppText weight="700" style={{ color: 'rgba(255,255,255,0.6)', fontSize: 11.5, letterSpacing: 1 }}>TOTAL VENDIDO</AppText>
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 2, marginTop: 6 }}>
        <AppText serif weight="600" style={{ fontSize: 26, color: 'rgba(255,255,255,0.7)' }}>$</AppText>
        <AppText serif weight="600" style={{ fontSize: 46, color: '#fff', letterSpacing: -1 }}>{Math.floor(v).toLocaleString('en-US')}</AppText>
        <AppText weight="600" style={{ fontSize: 15, color: 'rgba(255,255,255,0.55)', marginLeft: 4 }}>USD</AppText>
      </View>
      <View style={{ flexDirection: 'row', height: 7, borderRadius: 999, overflow: 'hidden', marginTop: 14, backgroundColor: 'rgba(255,255,255,0.12)' }}>
        <Animated.View style={{ width: barPaid.interpolate({ inputRange: [0, 100], outputRange: ['0%', '100%'] }) }}>
          <LinearGradient colors={['#10b981', '#34d399']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={{ height: 7 }} />
        </Animated.View>
        <Animated.View style={{ width: barActive.interpolate({ inputRange: [0, 100], outputRange: ['0%', '100%'] }) }}>
          <LinearGradient colors={['#6488e0', '#3b5bbf']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={{ height: 7 }} />
        </Animated.View>
      </View>
      <View style={{ flexDirection: 'row', gap: 16, marginTop: 10 }}>
        <Legend color="#34d399" label="Cobrado" value={money(paid)} />
        <Legend color="#6488e0" label="En proceso" value={money(active)} />
      </View>
    </View>
  );
}
function Legend({ color, label, value }: { color: string; label: string; value: string }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 7 }}>
      <View style={{ width: 8, height: 8, borderRadius: 3, backgroundColor: color }} />
      <AppText weight="500" style={{ color: 'rgba(255,255,255,0.6)', fontSize: 12 }}>{label}</AppText>
      <AppText weight="700" style={{ color: '#fff', fontSize: 12.5 }}>{value}</AppText>
    </View>
  );
}

function Ticker({ items }: { items: UICatalogItem[] }) {
  const x = useRef(new Animated.Value(0)).current;
  const [rowW, setRowW] = useState(0);
  useEffect(() => {
    if (!rowW) return;
    x.setValue(0);
    const loop = Animated.loop(Animated.timing(x, { toValue: -rowW, duration: 22000, easing: Easing.linear, useNativeDriver: true }));
    loop.start();
    return () => loop.stop();
  }, [rowW, x]);
  return (
    <View style={{ marginTop: 18, marginHorizontal: -16, paddingVertical: 10, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.1)', overflow: 'hidden' }}>
      <Animated.View style={{ flexDirection: 'row', transform: [{ translateX: x }] }}>
        <View style={{ flexDirection: 'row' }} onLayout={(e) => setRowW(e.nativeEvent.layout.width)}>
          {items.map((p, i) => <TickItem key={'a' + i} p={p} />)}
        </View>
        <View style={{ flexDirection: 'row' }}>{items.map((p, i) => <TickItem key={'b' + i} p={p} />)}</View>
      </Animated.View>
    </View>
  );
}
function TickItem({ p }: { p: UICatalogItem }) {
  const col = p.change > 0 ? '#34d399' : p.change < 0 ? '#fb7185' : 'rgba(255,255,255,0.5)';
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 13 }}>
      <AppText weight="700" style={{ color: 'rgba(255,255,255,0.55)', fontSize: 11.5 }}>{p.code}</AppText>
      <AppText weight="700" style={{ color: '#fff', fontSize: 13 }}>${p.price.toFixed(2)}</AppText>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 2 }}>
        {p.change !== 0 && <Icon name={p.change > 0 ? 'arrowUpR' : 'arrowDownL'} size={11} color={col} />}
        <AppText weight="700" style={{ color: col, fontSize: 11 }}>{p.change > 0 ? '+' : ''}{p.change.toFixed(1)}%</AppText>
      </View>
    </View>
  );
}

function PriceCard({ p, i, onPress }: { p: UICatalogItem; i: number; onPress: () => void }) {
  const col = changeColor(p.change);
  const best = Math.min(...p.tiers.map((t) => t.price));
  return (
    <FadeUp delay={i * 60}>
      <Tap onPress={onPress} style={{ width: 168, backgroundColor: colors.surface, borderRadius: radius.lg, padding: 15, gap: 12, ...shadows.card }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <View style={{ width: 34, height: 34, borderRadius: 10, backgroundColor: alpha(colors.navy500, 0.11), alignItems: 'center', justifyContent: 'center' }}>
            <Icon name={p.icon as any} size={18} color={colors.navy700} />
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 2, backgroundColor: alpha(col, 0.12), paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999 }}>
            {p.change !== 0 && <Icon name={p.change > 0 ? 'trendUp' : 'arrowDownL'} size={12} color={col} />}
            <AppText weight="700" style={{ color: col, fontSize: 12 }}>{p.change > 0 ? '+' : ''}{p.change.toFixed(1)}%</AppText>
          </View>
        </View>
        <View>
          <AppText weight="700" numberOfLines={1} style={{ fontSize: 14.5, color: colors.ink }}>{p.name}</AppText>
          <AppText weight="600" style={{ fontSize: 11, color: colors.ink40, marginTop: 1 }}>{p.code}</AppText>
        </View>
        <Spark data={p.spark} color={col} />
        <View style={{ flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' }}>
          <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 3 }}>
            <AppText serif weight="600" style={{ fontSize: 24, color: colors.ink }}>${p.price.toFixed(2)}</AppText>
            <AppText style={{ fontSize: 11.5, color: colors.ink50 }}>/{p.unit}</AppText>
          </View>
          <LinearGradient colors={gradients.navy} style={{ width: 26, height: 26, borderRadius: 8, alignItems: 'center', justifyContent: 'center' }}>
            <Icon name="layers" size={14} color="#fff" />
          </LinearGradient>
        </View>
        {p.tiers.length > 1 && (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
            <Icon name="layers" size={12} color={colors.accent} />
            <AppText weight="600" style={{ fontSize: 11, color: colors.accent }}>Volumen desde ${best.toFixed(2)}</AppText>
          </View>
        )}
      </Tap>
    </FadeUp>
  );
}

function QuickAction({ icon, label, onPress }: { icon: string; label: string; onPress: () => void }) {
  return (
    <Tap onPress={onPress} hapticKind="medium" style={{ flex: 1, borderRadius: radius.lg, overflow: 'hidden', ...shadows.card }}>
      <LinearGradient colors={gradients.navy} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ padding: 12, minHeight: 96, justifyContent: 'space-between' }}>
        <View style={{ width: 38, height: 38, borderRadius: 11, backgroundColor: 'rgba(255,255,255,0.16)', alignItems: 'center', justifyContent: 'center' }}>
          <Icon name={icon as any} size={20} color="#fff" />
        </View>
        <AppText weight="600" style={{ color: '#fff', fontSize: 12.5, lineHeight: 15 }}>{label}</AppText>
      </LinearGradient>
    </Tap>
  );
}

function MiniStat({ icon, label, value, tone = colors.navy700, onPress }: { icon: string; label: string; value: number; tone?: string; onPress: () => void }) {
  return (
    <Tap onPress={onPress} style={{ flex: 1, backgroundColor: colors.surface, borderRadius: radius.lg, paddingVertical: 11, paddingHorizontal: 13, flexDirection: 'row', alignItems: 'center', gap: 10, ...shadows.sm }}>
      <View style={{ width: 32, height: 32, borderRadius: 9, backgroundColor: alpha(tone, 0.12), alignItems: 'center', justifyContent: 'center' }}>
        <Icon name={icon as any} size={17} color={tone} />
      </View>
      <View style={{ flex: 1, minWidth: 0 }}>
        <AppText serif weight="600" style={{ fontSize: 18, color: colors.ink, lineHeight: 20 }}>{value}</AppText>
        <AppText style={{ fontSize: 11, color: colors.ink50, marginTop: 2 }}>{label}</AppText>
      </View>
    </Tap>
  );
}

function PriceSheet({ p, onClose, onQuote }: { p: UICatalogItem | null; onClose: () => void; onQuote: () => void }) {
  const [last, setLast] = useState<UICatalogItem | null>(p);
  useEffect(() => { if (p) setLast(p); }, [p]);
  const it = p || last;
  if (!it) return <Sheet open={false} onClose={onClose} />;
  const base = it.tiers[0].price;
  const best = Math.min(...it.tiers.map((t) => t.price));
  const col = changeColor(it.change);
  return (
    <Sheet open={!!p} onClose={onClose}>
      <View style={{ paddingHorizontal: 16, paddingBottom: 10 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 13, marginBottom: 16 }}>
          <LinearGradient colors={gradients.navy} style={{ width: 50, height: 50, borderRadius: 14, alignItems: 'center', justifyContent: 'center' }}>
            <Icon name={it.icon as any} size={24} color="#fff" />
          </LinearGradient>
          <View style={{ flex: 1, minWidth: 0 }}>
            <AppText serif weight="600" style={{ fontSize: 21, color: colors.ink }}>{it.name}</AppText>
            <AppText weight="600" style={{ fontSize: 12, color: colors.ink40 }}>{it.code} · USD por {it.unit}</AppText>
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <AppText serif weight="600" style={{ fontSize: 24, color: colors.ink, lineHeight: 26 }}>${base.toFixed(2)}</AppText>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 2 }}>
              {it.change !== 0 && <Icon name={it.change > 0 ? 'trendUp' : 'arrowDownL'} size={12} color={col} />}
              <AppText weight="700" style={{ color: col, fontSize: 12 }}>{it.change > 0 ? '+' : ''}{it.change.toFixed(1)}%</AppText>
            </View>
          </View>
        </View>

        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 7, marginBottom: 10 }}>
          <Icon name="layers" size={16} color={colors.navy700} />
          <AppText weight="700" style={{ fontSize: 14.5, color: colors.ink }}>Precios por volumen</AppText>
        </View>

        <View style={{ gap: 9 }}>
          {it.tiers.map((t, i) => {
            const save = Math.round((1 - t.price / base) * 100);
            const isBest = t.price === best;
            return (
              <View key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 13, paddingHorizontal: 15, borderRadius: 14, backgroundColor: isBest ? alpha(colors.success, 0.09) : colors.bg, ...(isBest ? { borderWidth: 1.5, borderColor: colors.success } : {}) }}>
                <View style={{ width: 38, height: 38, borderRadius: 11, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center', ...shadows.sm }}>
                  <AppText serif weight="700" style={{ color: colors.navy700, fontSize: 15 }}>{i + 1}</AppText>
                </View>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <AppText weight="700" style={{ fontSize: 14, color: colors.ink }}>{t.label}</AppText>
                  <AppText style={{ fontSize: 11.5, color: colors.ink50, marginTop: 1 }}>{save > 0 ? `Ahorro ${save}%` : 'Precio base'}</AppText>
                </View>
                {isBest && <View style={{ backgroundColor: alpha(colors.success, 0.16), paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999 }}><AppText weight="800" style={{ fontSize: 10, color: colors.success }}>MEJOR</AppText></View>}
                <View style={{ flexDirection: 'row', alignItems: 'baseline' }}>
                  <AppText serif weight="700" style={{ fontSize: 18, color: isBest ? colors.success : colors.ink }}>${t.price.toFixed(2)}</AppText>
                  <AppText style={{ fontSize: 11, color: colors.ink40 }}>/{it.unit}</AppText>
                </View>
              </View>
            );
          })}
        </View>

        <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 9, marginVertical: 14, paddingHorizontal: 2 }}>
          <Icon name="info" size={16} color={colors.accent} />
          <AppText style={{ flex: 1, fontSize: 12.5, lineHeight: 19, color: colors.ink50 }}>El precio por volumen aplica según la cantidad de contenedores de la orden. El total se calcula sobre el volumen pedido.</AppText>
        </View>

        <Button variant="primary" icon="send" onPress={onQuote}>Cotizar {it.name}</Button>
      </View>
    </Sheet>
  );
}
