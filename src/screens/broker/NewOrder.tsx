// Wizard de nueva orden (Cliente · Productos · Cargos · Confirmar).
// Portado de app/broker-app.jsx (NewOrder).
import React, { useState } from 'react';
import { ScrollView, TextInput, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { alpha, colors, fonts, gradients, radius, shadows } from '../../theme/tokens';
import { Icon } from '../../components/Icon';
import { AppText, Button, Card, Field, Screen, Tap, haptic } from '../../components/ui';
import { useApp } from '../../store/AppContext';
import { money, useBroker } from '../../store/BrokerStore';
import { CheckMark, FadeUp, WizardHeader } from './ui';

export function NewOrder({ clientId: initialClient, onClose }: { clientId?: string; onClose: () => void }) {
  const [s, dispatch] = useBroker();
  const { showToast } = useApp();
  const insets = useSafeAreaInsets();
  const [step, setStep] = useState(0);
  const [clientId, setClientId] = useState(initialClient || '');
  const [q, setQ] = useState('');
  const [qty, setQty] = useState('24000');
  const [price, setPrice] = useState('0.92');
  const [creating, setCreating] = useState(false);

  const client = s.clients.find((c) => c.id === clientId);
  const fob = Math.round(Number(qty || 0) * Number(price || 0));
  const containers = Math.max(1, Math.ceil(Number(qty || 0) / 24000));
  const charges = Math.round(fob * 0.19) + 4200;
  const cif = fob + charges;
  const steps = ['Cliente', 'Productos', 'Cargos', 'Confirmar'];
  const canNext = step === 0 ? !!clientId : step === 1 ? fob > 0 : true;

  const create = () => {
    setCreating(true); haptic('medium');
    setTimeout(() => {
      const num = 'AZ-ORD-' + (2050 + (s.orders.length % 90) + 5);
      dispatch({ type: 'ADD_ORDER', order: { id: 'o' + Date.now(), number: num, clientId, client: client!.name, cargo: 'fuel', state: 'draft', fob, cif, date: 'Jun 7, 2026', ts: Date.now(), items: 1, containers } });
      setCreating(false); haptic('success'); onClose();
      showToast(num + ' · Borrador creado', 'success');
    }, 1100);
  };
  const next = () => { if (step < 3) { haptic('light'); setStep(step + 1); } else create(); };

  const clientList = s.clients.filter((c) => c.status === 'approved' && `${c.name} ${c.nit}`.toLowerCase().includes(q.toLowerCase()));

  return (
    <Screen scroll={false} padTop={false}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 150 }} keyboardShouldPersistTaps="handled">
        <WizardHeader title="Nueva orden" steps={steps} step={step} onClose={onClose} dots />
        <View style={{ padding: 16 }}>
          {step === 0 && (
            <FadeUp>
              <Field icon="search" placeholder="Buscar cliente aprobado" value={q} onChangeText={setQ} />
              <View style={{ gap: 9, marginTop: 14 }}>
                {clientList.map((c) => {
                  const on = clientId === c.id;
                  return (
                    <Tap key={c.id} hapticKind="select" onPress={() => setClientId(c.id)}
                      style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 13, borderRadius: radius.lg, backgroundColor: on ? alpha(colors.accent, 0.1) : colors.surface, ...(on ? { borderWidth: 2, borderColor: colors.accent } : shadows.sm) }}>
                      <LinearGradient colors={gradients.navy} style={{ width: 42, height: 42, borderRadius: 12, alignItems: 'center', justifyContent: 'center' }}>
                        <AppText weight="700" style={{ color: '#fff', fontSize: 14 }}>{c.name.split(' ').map((w) => w[0]).slice(0, 2).join('')}</AppText>
                      </LinearGradient>
                      <View style={{ flex: 1, minWidth: 0 }}>
                        <AppText weight="700" style={{ fontSize: 14, color: colors.ink }}>{c.name}</AppText>
                        <AppText style={{ fontSize: 12, color: colors.ink50, marginTop: 1 }}>NIT {c.nit}</AppText>
                      </View>
                      {on && <CheckMark size={20} color={colors.accent} />}
                    </Tap>
                  );
                })}
              </View>
              <AppText style={{ fontSize: 12.5, color: colors.ink50, textAlign: 'center', marginTop: 16 }}>Se usa la lista base de precios de Azahares.</AppText>
            </FadeUp>
          )}

          {step === 1 && (
            <FadeUp style={{ gap: 16 }}>
              <Card pad={18} style={{ gap: 16 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 11 }}>
                  <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: alpha(colors.navy500, 0.11), alignItems: 'center', justifyContent: 'center' }}>
                    <Icon name="fuel" size={21} color={colors.navy700} />
                  </View>
                  <View>
                    <AppText weight="700" style={{ fontSize: 15, color: colors.ink }}>Diésel B5 · iso-tank</AppText>
                    <AppText style={{ fontSize: 12, color: colors.ink50, marginTop: 1 }}>24,000 L por contenedor</AppText>
                  </View>
                </View>
                <View>
                  <AppText weight="600" style={{ fontSize: 13, color: colors.ink60, marginBottom: 9 }}>Contenedores</AppText>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14, justifyContent: 'center' }}>
                    <CounterBtn disabled={containers <= 1} minus onPress={() => setQty(String(Math.max(1, containers - 1) * 24000))} />
                    <View style={{ alignItems: 'center', minWidth: 76 }}>
                      <AppText serif weight="600" style={{ fontSize: 40, color: colors.ink, lineHeight: 42 }}>{containers}</AppText>
                      <AppText weight="600" style={{ fontSize: 11, color: colors.ink40, marginTop: 2 }}>× 20ft</AppText>
                    </View>
                    <CounterBtn onPress={() => setQty(String((containers + 1) * 24000))} />
                  </View>
                </View>
                <View style={{ flexDirection: 'row', gap: 12 }}>
                  <View style={{ flex: 1 }}><Field2b label="Volumen total" value={Number(qty).toLocaleString() + ' L'} /></View>
                  <View style={{ flex: 1 }}><Field label="Precio/gal (USD)" icon="dollar" value={price} onChangeText={(v) => setPrice(v.replace(/[^\d.]/g, ''))} keyboardType="decimal-pad" /></View>
                </View>
              </Card>
              <Summary label="Subtotal FOB" value={money(fob)} />
            </FadeUp>
          )}

          {step === 2 && (
            <FadeUp style={{ gap: 16 }}>
              <Card pad={0} style={{ overflow: 'hidden' }}>
                <RowH icon="ship" title="Cargos navieros" badge="Solo lectura" />
                <KV label="Flete + THCD + ISPD + Seguro" value={money(charges)} last />
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
                <KV label="Producto" value="Diésel B5" />
                <KV label="Cantidad" value={Number(qty).toLocaleString() + ' L'} />
                <KV label="Subtotal FOB" value={money(fob)} />
                <KV label="Cargos" value={money(charges)} />
                <KV label="Total CIF" value={money(cif)} strong last />
              </Card>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 4 }}>
                <Icon name="info" size={16} color={colors.accent} />
                <AppText weight="500" style={{ fontSize: 13, color: colors.accent }}>La orden se crea en borrador, lista para cotizar.</AppText>
              </View>
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
          {step > 0 && (
            <Button variant="outline" full={false} icon="chevL" onPress={() => { haptic('light'); setStep(step - 1); }} style={{ width: 56 }}>{' '}</Button>
          )}
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

function Field2b({ label, value }: { label: string; value: string }) {
  return (
    <View>
      <AppText weight="600" style={{ fontSize: 13, color: colors.ink60, marginBottom: 7 }}>{label}</AppText>
      <View style={{ height: 52, justifyContent: 'center', paddingHorizontal: 14, borderRadius: radius.md, backgroundColor: colors.bg }}>
        <AppText weight="700" style={{ fontSize: 14, color: colors.ink }}>{value}</AppText>
      </View>
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
      {strong
        ? <AppText serif weight="700" style={{ fontSize: 17, color: colors.ink }}>{value}</AppText>
        : <AppText weight="700" style={{ fontSize: 14, color: colors.ink }}>{value}</AppText>}
    </View>
  );
}
