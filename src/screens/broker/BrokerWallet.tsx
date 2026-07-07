// Wallet del broker — datos REALES: GET /wallets/me, transacciones y cashout.
import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Animated, Easing, Linking, RefreshControl, ScrollView, TextInput, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Path } from 'react-native-svg';
import { alpha, colors, fonts, gradients, radius, shadows } from '../../theme/tokens';
import { Icon } from '../../components/Icon';
import { AppText, Button, Card, IconButton, Screen, Segmented, Sheet, Tap, haptic } from '../../components/ui';
import { useApp } from '../../store/AppContext';
import { money, useBroker, brokerApi } from '../../store/BrokerStore';
import type { CashoutDetail, WalletTx } from '../../lib/api/broker';
import { FadeUp, Hero, useCountUp, useHeaderFill } from './ui';

const MOVE_META: Record<string, { icon: string; label: string }> = {
  commission: { icon: 'percent', label: 'Comisión' },
  markup: { icon: 'trendUp', label: 'Markup' },
  credit: { icon: 'plusCircle', label: 'Crédito' },
  usage: { icon: 'receipt', label: 'Uso' },
  cashout: { icon: 'arrowUpR', label: 'Retiro' },
  cashout_reverted: { icon: 'history', label: 'Retiro revertido' },
  adjustment: { icon: 'edit', label: 'Ajuste' },
};

function VirtualCard({ number, holder, revealed, onToggle }: { number: string; holder: string; revealed: boolean; onToggle: () => void }) {
  const rx = useRef(new Animated.Value(0)).current;
  const ry = useRef(new Animated.Value(0)).current;
  const shine = useRef(new Animated.Value(0)).current;
  const [size, setSize] = useState({ w: 1, h: 1 });
  useEffect(() => {
    const loop = Animated.loop(Animated.timing(shine, { toValue: 1, duration: 5500, easing: Easing.inOut(Easing.ease), useNativeDriver: true }));
    loop.start();
    return () => loop.stop();
  }, [shine]);
  const onTouch = (e: any) => {
    const { locationX, locationY } = e.nativeEvent;
    rx.setValue((0.5 - locationY / size.h) * 16); ry.setValue((locationX / size.w - 0.5) * 20);
  };
  const reset = () => { Animated.spring(rx, { toValue: 0, useNativeDriver: true, friction: 6 }).start(); Animated.spring(ry, { toValue: 0, useNativeDriver: true, friction: 6 }).start(); };
  const masked = revealed ? number : (number || '•••• •••• •••• ••••').replace(/\d(?=(?:\D*\d){4}.*$)/g, '•');
  const shineX = shine.interpolate({ inputRange: [0, 1], outputRange: [-size.w * 0.6, size.w * 1.2] });

  return (
    <Animated.View onLayout={(e) => setSize({ w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height })}
      onTouchMove={onTouch} onTouchEnd={reset} onTouchCancel={reset}
      style={{ borderRadius: 22, overflow: 'hidden', transform: [{ perspective: 1100 }, { rotateX: rx.interpolate({ inputRange: [-20, 20], outputRange: ['-20deg', '20deg'] }) }, { rotateY: ry.interpolate({ inputRange: [-20, 20], outputRange: ['-20deg', '20deg'] }) }], shadowColor: '#080e21', shadowOpacity: 0.7, shadowRadius: 24, shadowOffset: { width: 0, height: 20 } }}>
      <LinearGradient colors={['#16327a', '#1e3a8a', '#3b5bbf']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ padding: 22 }}>
        <View style={{ position: 'absolute', inset: 0 as any, opacity: 0.14, flexDirection: 'row' }}>
          {Array.from({ length: 40 }).map((_, i) => <View key={i} style={{ width: 1, marginRight: 6, backgroundColor: '#fff', transform: [{ rotate: '25deg' }, { scaleY: 2 }] }} />)}
        </View>
        <Animated.View pointerEvents="none" style={{ position: 'absolute', top: 0, bottom: 0, width: 70, transform: [{ translateX: shineX }, { rotate: '12deg' }] }}>
          <LinearGradient colors={['transparent', 'rgba(255,255,255,0.3)', 'transparent']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={{ flex: 1 }} />
        </Animated.View>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Icon name="gps" size={20} color="#fff" />
            <AppText serif weight="600" style={{ color: '#fff', fontSize: 15 }}>Azahares</AppText>
          </View>
          <AppText weight="800" style={{ color: 'rgba(255,255,255,0.85)', fontSize: 11, letterSpacing: 1.2 }}>BROKER PAY</AppText>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 18 }}>
          <View style={{ width: 46, height: 34, borderRadius: 8, overflow: 'hidden' }}>
            <LinearGradient colors={['#e9c46a', '#caa23e']} style={{ flex: 1 }} />
            <View style={{ position: 'absolute', top: 4, bottom: 4, left: 22, width: 1, backgroundColor: 'rgba(0,0,0,0.25)' }} />
            <View style={{ position: 'absolute', left: 4, right: 4, top: 16, height: 1, backgroundColor: 'rgba(0,0,0,0.25)' }} />
          </View>
          <Svg width={22} height={22} viewBox="0 0 24 24" fill="none"><Path d="M8 8a6 6 0 0 1 0 8M12 5.5a10 10 0 0 1 0 13M15.5 3a14 14 0 0 1 0 18" stroke="rgba(255,255,255,0.85)" strokeWidth={1.8} strokeLinecap="round" /></Svg>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 18 }}>
          <AppText weight="600" style={{ color: '#fff', fontSize: 18, letterSpacing: 3, fontFamily: fonts.sansSemibold }}>{masked}</AppText>
          <Tap onPress={onToggle} hapticKind="light" style={{ width: 28, height: 28, borderRadius: 999, backgroundColor: 'rgba(255,255,255,0.16)', alignItems: 'center', justifyContent: 'center' }}>
            <Icon name={revealed ? 'eyeOff' : 'eye'} size={15} color="#fff" />
          </Tap>
        </View>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: 16 }}>
          <View>
            <AppText weight="700" style={{ color: 'rgba(255,255,255,0.55)', fontSize: 8.5, letterSpacing: 1.2 }}>TITULAR</AppText>
            <AppText weight="600" style={{ color: '#fff', fontSize: 13, letterSpacing: 0.4, marginTop: 2 }}>{(holder || '').toUpperCase()}</AppText>
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <AppText weight="700" style={{ color: 'rgba(255,255,255,0.55)', fontSize: 8.5, letterSpacing: 1.2 }}>MONEDA</AppText>
            <AppText weight="700" style={{ color: '#fff', fontSize: 13, marginTop: 2 }}>USD</AppText>
          </View>
        </View>
      </LinearGradient>
    </Animated.View>
  );
}

export function BrokerWallet() {
  const { showToast } = useApp();
  const { wallet, walletTx, loading, refreshWallet } = useBroker();
  const [sheet, setSheet] = useState(false);
  const [revealed, setRevealed] = useState(false);
  const [filter, setFilter] = useState('all');
  const [run, setRun] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [detailId, setDetailId] = useState<string | null>(null);
  useEffect(() => { const r = setTimeout(() => setRun(true), 60); return () => clearTimeout(r); }, []);
  const available = wallet?.availableBalance ?? wallet?.balance ?? 0;
  const reserved = wallet?.reservedAmount ?? 0;
  const bal = useCountUp(available, run && !!wallet, 1100);

  const income = walletTx.filter((m) => m.amount > 0).reduce((a, m) => a + m.amount, 0);
  const outcome = walletTx.filter((m) => m.amount < 0).reduce((a, m) => a + Math.abs(m.amount), 0);
  const moves = walletTx.filter((m) => (filter === 'all' ? true : filter === 'in' ? m.amount > 0 : m.amount < 0));

  const onRefresh = async () => { setRefreshing(true); await refreshWallet(); setRefreshing(false); };

  if (!wallet && loading) {
    return <Screen padBottom={108}><View style={{ paddingTop: 120, alignItems: 'center' }}><ActivityIndicator color={colors.navy700} /></View></Screen>;
  }

  const hf = useHeaderFill();

  return (
    <Screen padBottom={108} scroll={false} padTop={false}>
      <Animated.ScrollView {...hf.scrollProps} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 130 }} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.navy700} />}>
        <View {...hf.heroLayout}>
        <Hero padBottom={22}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <AppText serif weight="600" style={{ fontSize: 26, color: '#fff' }}>Wallet</AppText>
            <IconButton name="history" variant="glassDark" onPress={() => showToast('Estado de cuenta', 'info')} />
          </View>

          <VirtualCard number={wallet?.walletNumber || ''} holder={wallet?.ownerName || ''} revealed={revealed} onToggle={() => setRevealed((v) => !v)} />

          <View style={{ marginTop: 18, alignItems: 'center' }}>
            <AppText weight="600" style={{ color: 'rgba(255,255,255,0.6)', fontSize: 11.5, letterSpacing: 0.8 }}>SALDO DISPONIBLE</AppText>
            <AppText serif weight="600" style={{ fontSize: 44, color: '#fff', marginTop: 4 }}>{money(bal, true)}</AppText>
            {reserved > 0 && (
              <AppText weight="600" style={{ color: 'rgba(255,255,255,0.55)', fontSize: 12, marginTop: 4 }}>{money(reserved)} en solicitudes pendientes</AppText>
            )}
          </View>

          <View style={{ flexDirection: 'row', gap: 10, marginTop: 18 }}>
            <FlowChip icon="arrowDownL" label="Ingresos" value={money(income)} tone={colors.success} />
            <FlowChip icon="arrowUpR" label="Retiros" value={money(outcome)} dim />
          </View>

          <View style={{ flexDirection: 'row', gap: 10, marginTop: 14 }}>
            <Tap onPress={() => setSheet(true)} hapticKind="medium" style={{ flex: 1, height: 50, borderRadius: radius.md, overflow: 'hidden', ...shadows.sm }}>
              <LinearGradient colors={gradients.navy} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 9 }}>
                <Icon name="arrowUpR" size={19} color="#fff" />
                <AppText weight="700" style={{ color: '#fff', fontSize: 15 }}>Cashout</AppText>
              </LinearGradient>
            </Tap>
            <Tap onPress={() => showToast('Detalles de la cuenta', 'info')} style={{ width: 50, height: 50, borderRadius: radius.md, borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.22)', backgroundColor: 'rgba(255,255,255,0.08)', alignItems: 'center', justifyContent: 'center' }}>
              <Icon name="info" size={20} color="#fff" />
            </Tap>
          </View>
        </Hero>
        </View>

        <View style={{ paddingHorizontal: 16, paddingTop: 20, paddingBottom: 10 }}>
          <AppText serif weight="600" style={{ fontSize: 18, color: colors.ink }}>Movimientos</AppText>
        </View>
        <View style={{ paddingHorizontal: 16, paddingBottom: 12 }}>
          <Segmented value={filter} onChange={setFilter} options={[{ value: 'all', label: 'Todos' }, { value: 'in', label: 'Ingresos' }, { value: 'out', label: 'Retiros' }]} />
        </View>
        <View style={{ paddingHorizontal: 16, gap: 10 }}>
          {moves.length === 0 && <View style={{ alignItems: 'center', paddingVertical: 36 }}><Icon name="wallet" size={36} color={colors.ink40} /><AppText style={{ fontSize: 14, color: colors.ink40, marginTop: 10 }}>Sin movimientos todavía</AppText></View>}
          {moves.map((m, i) => (
            <MoveRow key={m.id} m={m} i={i}
              onPress={m.cashoutId && (m.kind === 'cashout' || m.kind === 'cashout_reverted') ? () => setDetailId(m.cashoutId) : undefined} />
          ))}
        </View>
      </Animated.ScrollView>
      {hf.fill}

      <CashoutSheet open={sheet} onClose={() => setSheet(false)} max={available}
        onSubmit={async (amount, notes) => {
          if (!wallet) return;
          try { await brokerApi.requestCashout(wallet.id, { amount, notes }); await refreshWallet(); showToast('Solicitud enviada · pendiente de aprobación', 'info'); }
          catch (e: any) { showToast(e?.message || 'No se pudo solicitar', 'error'); }
        }} />

      <CashoutDetailSheet cashoutId={detailId} onClose={() => setDetailId(null)} />
    </Screen>
  );
}

function MoveRow({ m, i, onPress }: { m: WalletTx; i: number; onPress?: () => void }) {
  const inc = m.amount > 0;
  const meta = MOVE_META[m.kind] || MOVE_META.commission;
  const date = (() => { try { return new Date(m.createdAt).toLocaleDateString('es', { day: 'numeric', month: 'short', year: 'numeric' }); } catch { return ''; } })();
  const body = (
    <Card pad={13}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 13 }}>
        <View style={{ width: 44, height: 44, borderRadius: 13, alignItems: 'center', justifyContent: 'center', backgroundColor: inc ? alpha(colors.success, 0.13) : alpha(colors.ink, 0.06) }}>
          <Icon name={meta.icon as any} size={20} color={inc ? colors.success : colors.ink60} />
        </View>
        <View style={{ flex: 1, minWidth: 0 }}>
          <AppText weight="600" numberOfLines={1} style={{ fontSize: 14, color: colors.ink }}>{m.description || meta.label}</AppText>
          <AppText style={{ fontSize: 12, color: colors.ink50, marginTop: 2 }}>{date}{onPress ? ' · Ver detalle' : ''}</AppText>
        </View>
        <View style={{ alignItems: 'flex-end' }}>
          <AppText serif weight="700" style={{ fontSize: 15.5, color: inc ? colors.success : colors.ink }}>{inc ? '+' : '−'}{money(Math.abs(m.amount))}</AppText>
          <AppText style={{ fontSize: 11, color: colors.ink40, marginTop: 1 }}>{money(m.balanceAfter)}</AppText>
        </View>
      </View>
    </Card>
  );
  return (
    <FadeUp delay={i * 40}>
      {onPress ? <Tap onPress={onPress} hapticKind="light">{body}</Tap> : body}
    </FadeUp>
  );
}

function CashoutDetailSheet({ cashoutId, onClose }: { cashoutId: string | null; onClose: () => void }) {
  const [detail, setDetail] = useState<CashoutDetail | null>(null);
  const [loading, setLoading] = useState(false);
  useEffect(() => {
    if (!cashoutId) { setDetail(null); return; }
    setLoading(true);
    brokerApi.getCashoutDetail(cashoutId)
      .then(setDetail)
      .catch(() => setDetail(null))
      .finally(() => setLoading(false));
  }, [cashoutId]);

  const STATUS: Record<string, { label: string; color: string }> = {
    requested: { label: 'Solicitado', color: colors.accent },
    processing: { label: 'En trámite', color: colors.navy500 },
    completed: { label: 'Completado', color: colors.success },
    rejected: { label: 'Rechazado', color: colors.error },
  };
  const METHOD: Record<string, string> = { wired: 'Wire transfer', ach: 'ACH', cash: 'Efectivo' };

  return (
    <Sheet open={!!cashoutId} onClose={onClose} title="Detalle del cashout">
      <View style={{ paddingHorizontal: 16, paddingTop: 4, paddingBottom: 10, gap: 14 }}>
        {loading && <ActivityIndicator color={colors.navy700} style={{ paddingVertical: 24 }} />}
        {detail && (
          <>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <AppText serif weight="700" style={{ fontSize: 26, color: colors.ink }}>{money(detail.amount, true)}</AppText>
              <View style={{ paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999, backgroundColor: alpha(STATUS[detail.status]?.color || colors.ink, 0.13) }}>
                <AppText weight="700" style={{ fontSize: 12, color: STATUS[detail.status]?.color || colors.ink }}>{STATUS[detail.status]?.label || detail.status}</AppText>
              </View>
            </View>
            <AppText style={{ fontSize: 12.5, color: colors.ink50 }}>
              Solicitado el {new Date(detail.requestedAt).toLocaleDateString('es', { day: 'numeric', month: 'long', year: 'numeric' })}
              {detail.completedAt ? ` · pagado el ${new Date(detail.completedAt).toLocaleDateString('es', { day: 'numeric', month: 'long' })}` : ''}
            </AppText>
            {detail.status === 'rejected' && detail.rejectionReason && (
              <View style={{ padding: 12, borderRadius: radius.md, backgroundColor: alpha(colors.error, 0.09) }}>
                <AppText style={{ fontSize: 13, color: colors.error }}>Motivo: {detail.rejectionReason}</AppText>
              </View>
            )}
            {detail.disbursements.length > 0 && (
              <View style={{ gap: 10 }}>
                <AppText weight="700" style={{ fontSize: 13, color: colors.ink60 }}>Destinatarios</AppText>
                {detail.disbursements.map((d) => (
                  <Card key={d.id} pad={13}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
                        <AppText weight="600" style={{ fontSize: 14, color: colors.ink }}>{d.payeeLabel || d.accountHolder || 'Destinatario'}</AppText>
                        <AppText style={{ fontSize: 12, color: colors.ink50 }}>{METHOD[d.method] || d.method}{d.bankName ? ` · ${d.bankName}` : ''}</AppText>
                        {d.accountNumber ? <AppText style={{ fontSize: 12, color: colors.ink50 }}>Cuenta #{d.accountNumber}</AppText> : null}
                        {d.reference ? <AppText style={{ fontSize: 12, color: colors.ink40 }}>Ref: {d.reference}</AppText> : null}
                      </View>
                      <View style={{ alignItems: 'flex-end', gap: 4 }}>
                        <AppText serif weight="700" style={{ fontSize: 15, color: colors.ink }}>{money(d.amount)}</AppText>
                        {d.proofUrl ? (
                          <Tap onPress={() => Linking.openURL(d.proofUrl!)} hapticKind="light" style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                            <Icon name="receipt" size={13} color={colors.navy700} />
                            <AppText weight="600" style={{ fontSize: 12, color: colors.navy700 }}>Recibo</AppText>
                          </Tap>
                        ) : null}
                      </View>
                    </View>
                  </Card>
                ))}
              </View>
            )}
          </>
        )}
      </View>
    </Sheet>
  );
}

function FlowChip({ icon, label, value, tone, dim }: { icon: string; label: string; value: string; tone?: string; dim?: boolean }) {
  return (
    <View style={{ flex: 1, backgroundColor: 'rgba(255,255,255,0.09)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)', borderRadius: 15, paddingVertical: 11, paddingHorizontal: 13, flexDirection: 'row', alignItems: 'center', gap: 10 }}>
      <View style={{ width: 32, height: 32, borderRadius: 9, alignItems: 'center', justifyContent: 'center', backgroundColor: dim ? 'rgba(255,255,255,0.14)' : alpha(tone || '#fff', 0.26) }}>
        <Icon name={icon as any} size={17} color="#fff" />
      </View>
      <View style={{ minWidth: 0 }}>
        <AppText weight="600" style={{ color: 'rgba(255,255,255,0.6)', fontSize: 10.5, letterSpacing: 0.4 }}>{label.toUpperCase()}</AppText>
        <AppText serif weight="700" style={{ color: '#fff', fontSize: 15 }}>{value}</AppText>
      </View>
    </View>
  );
}

function CashoutSheet({ open, onClose, max, onSubmit }: { open: boolean; onClose: () => void; max: number; onSubmit: (amount: number, notes?: string) => Promise<void> }) {
  const [amount, setAmount] = useState('');
  const [notes, setNotes] = useState('');
  const [busy, setBusy] = useState(false);
  useEffect(() => { if (open) { setAmount(''); setNotes(''); } }, [open]);
  const n = Number(amount || 0);
  const valid = n > 0 && n <= max && !busy;
  const pct = [25, 50, 100];
  const submit = async () => {
    setBusy(true); haptic('success');
    await onSubmit(n, notes.trim() || undefined);
    setBusy(false); onClose();
  };
  return (
    <Sheet open={open} onClose={onClose} title="Solicitar cashout">
      <View style={{ paddingHorizontal: 16, paddingTop: 6, paddingBottom: 8, gap: 16 }}>
        <View>
          <AppText weight="600" style={{ fontSize: 13, color: colors.ink60, marginBottom: 7, marginLeft: 2 }}>Monto (máx {money(max, true)})</AppText>
          <View style={{ justifyContent: 'center' }}>
            <AppText serif weight="600" style={{ position: 'absolute', left: 16, fontSize: 24, color: colors.ink40, zIndex: 1 }}>$</AppText>
            <TextInput value={amount} onChangeText={(v) => setAmount(v.replace(/[^\d.]/g, ''))} keyboardType="decimal-pad" placeholder="0.00" placeholderTextColor={colors.ink30}
              style={{ height: 60, paddingLeft: 38, paddingRight: 16, borderRadius: radius.md, fontSize: 24, fontFamily: fonts.serif, color: colors.ink, borderWidth: 1.5, borderColor: amount && (n <= 0 || n > max) ? colors.error : colors.line, backgroundColor: colors.surface }} />
          </View>
          <View style={{ flexDirection: 'row', gap: 8, marginTop: 10 }}>
            {pct.map((p) => (
              <Tap key={p} hapticKind="select" onPress={() => setAmount(String(Math.round((max * p) / 100)))} style={{ flex: 1, height: 34, borderRadius: 999, alignItems: 'center', justifyContent: 'center', backgroundColor: alpha(colors.navy500, 0.11) }}>
                <AppText weight="600" style={{ fontSize: 12.5, color: colors.navy700 }}>{p === 100 ? 'Todo' : p + '%'}</AppText>
              </Tap>
            ))}
          </View>
        </View>
        <TextInput value={notes} onChangeText={setNotes} placeholder="Nota (opcional)" placeholderTextColor={colors.ink40} multiline style={[inputStyle, { height: 72, paddingTop: 14, textAlignVertical: 'top' }]} />
        <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 9, paddingHorizontal: 2 }}>
          <Icon name="info" size={16} color={colors.accent} />
          <AppText style={{ flex: 1, fontSize: 12.5, lineHeight: 19, color: colors.ink50 }}>Los datos bancarios los coordina el equipo de Azahares al procesar tu solicitud. Queda pendiente hasta su aprobación.</AppText>
        </View>
        <Button variant="primary" icon="arrowUpR" disabled={!valid} loading={busy} onPress={submit}>Solicitar {n > 0 ? money(n) : ''}</Button>
      </View>
    </Sheet>
  );
}

const inputStyle = { height: 52, paddingHorizontal: 16, borderRadius: radius.md, fontSize: 16, fontFamily: fonts.sans, color: colors.ink, borderWidth: 1.5, borderColor: colors.line, backgroundColor: colors.surface } as const;
