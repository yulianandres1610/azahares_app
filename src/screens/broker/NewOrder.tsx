// Wizard de nueva orden — crea una orden REAL (POST /sales-orders) con cliente
// aprobado, producto del catálogo del día, contenedores y cargos navieros.
import React, { useState } from 'react';
import { ScrollView, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { alpha, colors, fonts, gradients, radius, shadows } from '../../theme/tokens';
import { Icon } from '../../components/Icon';
import { AppText, Button, Card, Field, Screen, Tap, haptic } from '../../components/ui';
import { useApp } from '../../store/AppContext';
import { money, maxPerContainer, useBroker, brokerApi, BK_CLIENT_STATUS, type UICatalogItem } from '../../store/BrokerStore';
import { CheckMark, FadeUp, WizardHeader } from './ui';

export function NewOrder({ clientId: initialClient, onClose }: { clientId?: string; onClose: () => void }) {
  const { clients, catalog, defaultPriceListId, refreshOrders, refreshDashboard } = useBroker();
  const { showToast } = useApp();
  const insets = useSafeAreaInsets();
  const [step, setStep] = useState(0);
  const [clientId, setClientId] = useState(initialClient || '');
  const [q, setQ] = useState('');
  const items = catalog?.items || [];
  const [productId, setProductId] = useState(items[0]?.id || '');
  const [containers, setContainers] = useState(1);
  const [creating, setCreating] = useState(false);

  // Mostramos TODOS los clientes (igual que la web): se puede crear orden para
  // cualquiera. La orden queda en BORRADOR; la factura se emite después desde el
  // detalle de la orden y, si el cliente no está aprobado, no se emite todavía.
  // Ordenamos los aprobados primero para que sea más práctico.
  const sortedClients = [...clients].sort(
    (a, b) => (a.statusKey === 'approved' ? 0 : 1) - (b.statusKey === 'approved' ? 0 : 1),
  );
  const client = clients.find((c) => c.id === clientId);
  const product: UICatalogItem | undefined = items.find((p) => p.id === productId) || items[0];

  // precio por volumen: mejor tier cuyo umbral de contenedores <= elegidos
  const tierPrice = (() => {
    if (!product) return 0;
    const sorted = [...product.tiers].sort((a, b) => a.containers - b.containers);
    let p = sorted[0]?.price ?? product.price;
    for (const t of sorted) if (containers >= t.containers) p = t.price;
    return p;
  })();
  // El precio lo fija el catálogo del día (por volumen). El broker NO puede
  // modificar precios — solo elige producto y cantidad.
  const unitPrice = tierPrice;
  const qty = containers * (product?.unitsPerContainer || 24000);
  const fob = Math.round(qty * unitPrice);
  const flete = Math.round(fob * 0.14), thcd = 2400, ispd = 1800, seguro = Math.round(fob * 0.05);
  const charges = flete + thcd + ispd + seguro;
  const cif = fob + charges;

  const steps = ['Cliente', 'Productos', 'Cargos', 'Confirmar'];
  const canNext = step === 0 ? !!clientId : step === 1 ? !!product && fob > 0 : true;

  const create = async () => {
    if (!product || !client) return;
    setCreating(true); haptic('medium');
    try {
      const order = await brokerApi.createSalesOrder({
        clientId,
        priceListId: defaultPriceListId || undefined,
        items: [{ productId: product.id, quantity: qty, unit: product.unit, unitPrice }],
        fleteMaritimo: flete, thcd, ispd, seguro,
        portOfLoading: 'Port Shoals, AR', portOfDischarge: 'La Habana', deliveryTimeDays: 20,
      });
      await Promise.all([refreshOrders(), refreshDashboard()]);
      haptic('success'); onClose();
      showToast(order.orderNumber + ' · Borrador creado', 'success');
    } catch (e: any) {
      setCreating(false);
      showToast(e?.message || 'No se pudo crear la orden', 'error');
    }
  };
  const next = () => { if (step < 3) { haptic('light'); setStep(step + 1); } else create(); };
  const clientList = sortedClients.filter((c) => `${c.name}`.toLowerCase().includes(q.toLowerCase()));

  return (
    <Screen scroll={false} padTop={false}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 150 }} keyboardShouldPersistTaps="handled">
        <WizardHeader title="Nueva orden" steps={steps} step={step} onClose={onClose} dots />
        <View style={{ padding: 16 }}>
          {step === 0 && (
            <FadeUp>
              <Field icon="search" placeholder="Buscar cliente" value={q} onChangeText={setQ} />
              <View style={{ gap: 9, marginTop: 14 }}>
                {clientList.length === 0 && <AppText style={{ fontSize: 13, color: colors.ink50, textAlign: 'center', paddingVertical: 20 }}>{clients.length === 0 ? 'Aún no tenés clientes. Invitá uno primero.' : 'Sin resultados'}</AppText>}
                {clientList.map((c) => {
                  const on = clientId === c.id;
                  const approved = c.statusKey === 'approved';
                  const meta = BK_CLIENT_STATUS[c.statusKey];
                  return (
                    <Tap key={c.id} hapticKind="select" onPress={() => setClientId(c.id)}
                      style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 13, borderRadius: radius.lg, backgroundColor: on ? alpha(colors.accent, 0.1) : colors.surface, ...(on ? { borderWidth: 2, borderColor: colors.accent } : shadows.sm) }}>
                      <LinearGradient colors={gradients.navy} style={{ width: 42, height: 42, borderRadius: 12, alignItems: 'center', justifyContent: 'center' }}>
                        <AppText weight="700" style={{ color: '#fff', fontSize: 14 }}>{c.name.split(' ').map((w) => w[0]).slice(0, 2).join('')}</AppText>
                      </LinearGradient>
                      <View style={{ flex: 1, minWidth: 0 }}>
                        <AppText weight="700" numberOfLines={1} style={{ fontSize: 14, color: colors.ink }}>{c.name}</AppText>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 7, marginTop: 4 }}>
                          <AppText numberOfLines={1} style={{ fontSize: 12, color: colors.ink50, flexShrink: 1 }}>{c.muni}, {c.prov}</AppText>
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 7, paddingVertical: 2, borderRadius: 999, backgroundColor: alpha(approved ? colors.success : meta.color, 0.13) }}>
                            <View style={{ width: 5, height: 5, borderRadius: 999, backgroundColor: approved ? colors.success : meta.color }} />
                            <AppText weight="700" style={{ fontSize: 10.5, color: approved ? colors.success : meta.color }}>{approved ? 'Docs OK' : 'Docs pendientes'}</AppText>
                          </View>
                        </View>
                      </View>
                      {on && <CheckMark size={20} color={colors.accent} />}
                    </Tap>
                  );
                })}
              </View>
            </FadeUp>
          )}

          {step === 1 && (
            <FadeUp style={{ gap: 16 }}>
              {/* selector de producto */}
              <View>
                <AppText weight="600" style={{ fontSize: 13, color: colors.ink60, marginBottom: 9 }}>Producto</AppText>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 9 }}>
                  {items.map((p) => {
                    const on = product?.id === p.id;
                    return (
                      <Tap key={p.id} hapticKind="select" onPress={() => setProductId(p.id)}
                        style={{ paddingVertical: 11, paddingHorizontal: 14, borderRadius: radius.md, flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: on ? colors.navy700 : colors.surface, ...(on ? {} : { borderWidth: 1.5, borderColor: colors.line }) }}>
                        <Icon name={p.icon as any} size={17} color={on ? '#fff' : colors.navy700} />
                        <AppText weight="600" style={{ fontSize: 13, color: on ? '#fff' : colors.ink }}>{p.name}</AppText>
                      </Tap>
                    );
                  })}
                </ScrollView>
              </View>

              <Card pad={18} style={{ gap: 16 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 11 }}>
                  <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: alpha(colors.navy500, 0.11), alignItems: 'center', justifyContent: 'center' }}>
                    <Icon name={(product?.icon as any) || 'fuel'} size={21} color={colors.navy700} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <AppText weight="700" style={{ fontSize: 15, color: colors.ink }}>{product?.name || 'Producto'} · iso-tank</AppText>
                    <AppText style={{ fontSize: 12, color: colors.ink50, marginTop: 1 }}>{(product?.unitsPerContainer || 24000).toLocaleString()} {product?.unit || 'L'}/cont. · máx {maxPerContainer(product?.unit || 'L').toLocaleString()} {product?.unit || 'L'}</AppText>
                  </View>
                </View>
                <View>
                  <AppText weight="600" style={{ fontSize: 13, color: colors.ink60, marginBottom: 9 }}>Contenedores</AppText>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14, justifyContent: 'center' }}>
                    <CounterBtn disabled={containers <= 1} minus onPress={() => setContainers(Math.max(1, containers - 1))} />
                    <View style={{ alignItems: 'center', minWidth: 76 }}>
                      <AppText serif weight="600" style={{ fontSize: 40, color: colors.ink, lineHeight: 42 }}>{containers}</AppText>
                      <AppText weight="600" style={{ fontSize: 11, color: colors.ink40, marginTop: 2 }}>× 20ft</AppText>
                    </View>
                    <CounterBtn onPress={() => setContainers(containers + 1)} />
                  </View>
                </View>
                <View style={{ flexDirection: 'row', gap: 12 }}>
                  <View style={{ flex: 1 }}><Field2b label="Volumen total" value={qty.toLocaleString() + ' ' + (product?.unit || 'L')} /></View>
                  <View style={{ flex: 1 }}><Field2b label={`Precio/${product?.unit || 'u'} (USD)`} value={`$${tierPrice.toFixed(2)}`} hint="Fijado por el catálogo" /></View>
                </View>
              </Card>
              <Summary label="Subtotal FOB" value={money(fob)} />
            </FadeUp>
          )}

          {step === 2 && (
            <FadeUp style={{ gap: 16 }}>
              <Card pad={0} style={{ overflow: 'hidden' }}>
                <RowH icon="ship" title="Cargos navieros" badge="Editable luego" />
                <KV label="Flete" value={money(flete)} />
                <KV label="THCD" value={money(thcd)} />
                <KV label="ISPD" value={money(ispd)} />
                <KV label="Seguro" value={money(seguro)} last />
              </Card>
              <Card pad={16} style={{ gap: 13 }}>
                <View style={{ flexDirection: 'row', gap: 12 }}>
                  <View style={{ flex: 1 }}><Field2 label="Puerto origen" value="Port Shoals, AR" /></View>
                  <View style={{ flex: 1 }}><Field2 label="Puerto destino" value="La Habana" /></View>
                </View>
                <Field2 label="Plazo de entrega" value="20 días" />
              </Card>
              <Summary label="Total CIF" value={money(cif)} big />
            </FadeUp>
          )}

          {step === 3 && (
            <FadeUp style={{ gap: 14 }}>
              <Card pad={0} style={{ overflow: 'hidden' }}>
                <KV label="Cliente" value={client ? client.name : '—'} />
                <KV label="Producto" value={product?.name || '—'} />
                <KV label="Cantidad" value={qty.toLocaleString() + ' ' + (product?.unit || 'L')} />
                <KV label="Subtotal FOB" value={money(fob)} />
                <KV label="Cargos" value={money(charges)} />
                <KV label="Total CIF" value={money(cif)} strong last />
              </Card>
              {client && client.statusKey !== 'approved' ? (
                <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 8, paddingHorizontal: 12, paddingVertical: 11, borderRadius: radius.md, backgroundColor: alpha(colors.amber, 0.1) }}>
                  <Icon name="alert" size={16} color={colors.amber} />
                  <AppText weight="500" style={{ flex: 1, fontSize: 12.5, color: colors.amber, lineHeight: 18 }}>El cliente todavía no está aprobado. La orden se crea en borrador; la factura se podrá emitir cuando el cliente esté aprobado.</AppText>
                </View>
              ) : (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 4 }}>
                  <Icon name="info" size={16} color={colors.accent} />
                  <AppText weight="500" style={{ fontSize: 13, color: colors.accent }}>La orden se crea en borrador, lista para cotizar.</AppText>
                </View>
              )}
            </FadeUp>
          )}
        </View>
      </ScrollView>

      <View style={{ position: 'absolute', left: 0, right: 0, bottom: 0, paddingHorizontal: 16, paddingTop: 12, paddingBottom: (insets.bottom || 0) + 14, backgroundColor: colors.bg }}>
        {(step === 1 || step === 2) && (
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 4, paddingBottom: 10 }}>
            <AppText weight="600" style={{ fontSize: 12.5, color: colors.ink50 }}>Total CIF</AppText>
            <AppText serif weight="700" style={{ fontSize: 20, color: colors.ink }}>{money(cif)}</AppText>
          </View>
        )}
        <View style={{ flexDirection: 'row', gap: 10 }}>
          {step > 0 && <Button variant="outline" full={false} icon="chevL" onPress={() => { haptic('light'); setStep(step - 1); }} style={{ width: 56 }}>{' '}</Button>}
          <View style={{ flex: 1 }}>
            <Button onPress={next} disabled={!canNext || creating} loading={creating} variant={step === 3 ? 'success' : 'primary'} icon={step === 3 ? 'check' : undefined} iconRight={step < 3 ? 'arrowR' : undefined}>
              {step === 3 ? 'Crear orden' : 'Continuar'}
            </Button>
          </View>
        </View>
      </View>
    </Screen>
  );
}

function CounterBtn({ onPress, disabled, minus }: { onPress: () => void; disabled?: boolean; minus?: boolean }) {
  const content = (
    <View style={{ width: 52, height: 52, borderRadius: 16, alignItems: 'center', justifyContent: 'center' }}>
      {minus ? <View style={{ width: 18, height: 2.6, borderRadius: 999, backgroundColor: colors.navy700 }} /> : <Icon name="plus" size={22} color="#fff" strokeWidth={2.4} />}
    </View>
  );
  return (
    <Tap onPress={onPress} disabled={disabled} hapticKind="light" style={{ borderRadius: 16, opacity: disabled ? 0.4 : 1, overflow: 'hidden', ...(minus ? { borderWidth: 1.5, borderColor: colors.line, backgroundColor: colors.surface } : shadows.sm) }}>
      {minus ? content : <LinearGradient colors={gradients.navy} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>{content}</LinearGradient>}
    </Tap>
  );
}
function Field2b({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <View>
      <AppText weight="600" style={{ fontSize: 13, color: colors.ink60, marginBottom: 7 }}>{label}</AppText>
      <View style={{ height: 52, flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, borderRadius: radius.md, backgroundColor: colors.bg }}>
        <AppText weight="700" style={{ fontSize: 14, color: colors.ink }}>{value}</AppText>
        {hint ? <Icon name="lock" size={13} color={colors.ink40} /> : null}
      </View>
      {hint ? <AppText style={{ fontSize: 10.5, color: colors.ink40, marginTop: 4 }}>{hint}</AppText> : null}
    </View>
  );
}
function Field2({ label, value }: { label: string; value: string }) {
  return (
    <View>
      <AppText weight="600" style={{ fontSize: 13, color: colors.ink60, marginBottom: 7 }}>{label}</AppText>
      <View style={{ height: 48, justifyContent: 'center', paddingHorizontal: 14, borderRadius: radius.md, backgroundColor: colors.bg }}>
        <AppText weight="600" style={{ fontSize: 14, color: colors.ink }}>{value}</AppText>
      </View>
    </View>
  );
}
function Summary({ label, value, big }: { label: string; value: string; big?: boolean }) {
  const inner = (
    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: big ? 16 : 13, paddingHorizontal: big ? 18 : 15 }}>
      <AppText weight="600" style={{ fontSize: big ? 14 : 12.5, color: big ? '#fff' : colors.ink50, opacity: big ? 0.85 : 1 }}>{label}</AppText>
      <AppText serif weight="700" style={{ fontSize: big ? 24 : 16, color: big ? '#fff' : colors.ink }}>{value}</AppText>
    </View>
  );
  if (big) return <View style={{ borderRadius: radius.lg, overflow: 'hidden', ...shadows.sm }}><LinearGradient colors={gradients.navy} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>{inner}</LinearGradient></View>;
  return <View style={{ borderRadius: radius.lg, backgroundColor: colors.surface, ...shadows.sm }}>{inner}</View>;
}
function RowH({ icon, title, badge }: { icon: string; title: string; badge?: string }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 16, paddingTop: 14, paddingBottom: 10 }}>
      <View style={{ width: 32, height: 32, borderRadius: 9, backgroundColor: alpha(colors.navy500, 0.11), alignItems: 'center', justifyContent: 'center' }}>
        <Icon name={icon as any} size={17} color={colors.navy700} />
      </View>
      <AppText weight="700" style={{ flex: 1, fontSize: 14.5, color: colors.ink }}>{title}</AppText>
      {badge && <View style={{ backgroundColor: alpha(colors.ink, 0.06), paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999 }}><AppText weight="700" style={{ fontSize: 10.5, color: colors.ink40, letterSpacing: 0.4 }}>{badge.toUpperCase()}</AppText></View>}
    </View>
  );
}
function KV({ label, value, strong, last }: { label: string; value: string; strong?: boolean; last?: boolean }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, paddingVertical: 12, paddingHorizontal: 16, borderBottomWidth: last ? 0 : 1, borderBottomColor: colors.line, backgroundColor: strong ? alpha(colors.navy500, 0.05) : 'transparent' }}>
      <AppText weight={strong ? '700' : '500'} style={{ fontSize: 13.5, color: strong ? colors.ink : colors.ink50 }}>{label}</AppText>
      {strong ? <AppText serif weight="700" style={{ fontSize: 17, color: colors.ink }}>{value}</AppText> : <AppText weight="700" style={{ fontSize: 14, color: colors.ink }}>{value}</AppText>}
    </View>
  );
}
