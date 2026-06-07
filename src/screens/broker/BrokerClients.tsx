// Clientes: lista con filtros, wizard de nuevo cliente (verificar NIT →
// invitar por WhatsApp/Email/Link → confirmación) y detalle.
// Portado de app/broker-clients.jsx.
import React, { useEffect, useState } from 'react';
import { ScrollView, TextInput, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { alpha, colors, fonts, gradients, radius, shadows } from '../../theme/tokens';
import { Icon } from '../../components/Icon';
import { AppText, Button, Card, Chip, Field, IconButton, Screen, Tap, haptic } from '../../components/ui';
import { useApp } from '../../store/AppContext';
import { BK_CLIENT_STATUS, money, type BkClient, type BkClientStatus, useBroker } from '../../store/BrokerStore';
import {
  CheckMark, ClientBadge, CountryCode, FadeUp, Hero, HeroStat, OrderBadge, WizardHeader, useBkNav,
} from './ui';

const FILTERS: { k: string; label: string }[] = [
  { k: 'all', label: 'Todos' }, { k: 'unapproved', label: 'Sin aprobar' }, { k: 'review', label: 'En revisión' },
  { k: 'approved', label: 'Aprobados' }, { k: 'rejected', label: 'Rechazados' }, { k: 'suspended', label: 'Suspendidos' },
];

function initials(name: string) { return name.split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase(); }

export function BrokerClients() {
  const [s] = useBroker();
  const nav = useBkNav();
  const [q, setQ] = useState('');
  const [filter, setFilter] = useState('all');
  const list = s.clients.filter((c) => {
    if (filter !== 'all' && c.status !== filter) return false;
    if (q && !`${c.name} ${c.nit} ${c.muni} ${c.prov}`.toLowerCase().includes(q.toLowerCase())) return false;
    return true;
  });
  const active = s.clients.filter((c) => c.status === 'approved').length;
  const pending = s.clients.filter((c) => c.status === 'review' || c.status === 'unapproved').length;

  return (
    <Screen padBottom={108} scroll={false}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 130 }} keyboardShouldPersistTaps="handled">
        <Hero>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <AppText serif weight="600" style={{ fontSize: 26, color: '#fff' }}>Clientes</AppText>
            <IconButton name="plus" variant="glassDark" onPress={() => nav.openOverlay({ type: 'newClient' })} />
          </View>
          <View style={{ flexDirection: 'row', gap: 8, marginTop: 16 }}>
            <HeroStat value={active} label="Activos" />
            <HeroStat value={s.clients.length} label="Total" />
            <HeroStat value={pending} label="Pendientes" tone={colors.amber} />
          </View>
        </Hero>

        <View style={{ padding: 16, paddingBottom: 0 }}>
          <Field icon="search" placeholder="Buscar nombre, NIT o provincia" value={q} onChangeText={setQ}
            right={q ? <IconButton name="x" variant="plain" iconSize={16} size={32} onPress={() => setQ('')} /> : undefined} />
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingHorizontal: 16, paddingTop: 14, paddingBottom: 6 }}>
          {FILTERS.map((f) => {
            const n = f.k === 'all' ? s.clients.length : s.clients.filter((c) => c.status === f.k).length;
            if (f.k !== 'all' && !n) return null;
            return <Chip key={f.k} label={f.label} active={filter === f.k} count={n} color={f.k !== 'all' ? BK_CLIENT_STATUS[f.k as BkClientStatus].color : undefined} onPress={() => setFilter(f.k)} />;
          })}
        </ScrollView>

        <View style={{ paddingHorizontal: 16, paddingTop: 8, gap: 11 }}>
          {list.length === 0 && (
            <View style={{ alignItems: 'center', paddingVertical: 50 }}>
              <Icon name="users" size={40} color={colors.ink40} />
              <AppText weight="500" style={{ fontSize: 15, color: colors.ink40, marginTop: 12 }}>Ningún cliente coincide</AppText>
            </View>
          )}
          {list.map((c, i) => (
            <FadeUp key={c.id} delay={i * 40}>
              <Card onPress={() => nav.openOverlay({ type: 'client', id: c.id })} pad={14}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 13 }}>
                  <LinearGradient colors={gradients.navy} style={{ width: 46, height: 46, borderRadius: 13, alignItems: 'center', justifyContent: 'center' }}>
                    <AppText weight="700" style={{ color: '#fff', fontSize: 15 }}>{initials(c.name)}</AppText>
                  </LinearGradient>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <AppText weight="700" numberOfLines={1} style={{ fontSize: 15, color: colors.ink }}>{c.name}</AppText>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 3 }}>
                      <Icon name="map" size={13} color={colors.ink50} />
                      <AppText style={{ fontSize: 12.5, color: colors.ink50 }}>{c.muni}, {c.prov}</AppText>
                    </View>
                  </View>
                  <Icon name="chevR" size={18} color={colors.ink30} />
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 13 }}>
                  <ClientBadge status={c.status} size="sm" />
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: alpha(colors.ink, 0.05), paddingHorizontal: 9, paddingVertical: 3, borderRadius: 999 }}>
                    <Icon name="fileText" size={13} color={colors.ink40} />
                    <AppText weight="600" style={{ fontSize: 11.5, color: colors.ink40 }}>{c.docs} docs</AppText>
                  </View>
                </View>
              </Card>
            </FadeUp>
          ))}
        </View>
      </ScrollView>
    </Screen>
  );
}

// ══ Wizard de nuevo cliente ════════════════════════════════════
export function NewClient({ onClose }: { onClose: () => void }) {
  const [s, dispatch] = useBroker();
  const insets = useSafeAreaInsets();
  const [step, setStep] = useState(0);
  const [nit, setNit] = useState('');
  const [channel, setChannel] = useState<'whatsapp' | 'email' | 'manual'>('whatsapp');
  const [country, setCountry] = useState('+53');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [sending, setSending] = useState(false);
  const [copied, setCopied] = useState(false);

  const exists = s.clients.find((c) => c.nit === nit);
  const nitValid = nit.length === 11 && !exists;
  const link = `azaharesbroker.com/invitar/${nit.slice(-6) || 'XXXXXX'}-${(nit.slice(0, 4) || 'azh')}`;
  const steps = ['Verificar NIT', 'Invitar', 'Listo'];
  const channelOk = channel === 'whatsapp' ? phone.replace(/\D/g, '').length >= 6 : channel === 'email' ? /\S+@\S+\.\S+/.test(email) : true;
  const canNext = step === 0 ? nitValid : step === 1 ? channelOk : true;

  const send = () => {
    setSending(true); haptic('medium');
    setTimeout(() => {
      setSending(false); haptic('success'); setStep(2);
      dispatch({ type: 'ADD_CLIENT', client: { id: 'k' + Date.now(), name: 'Cliente invitado', legal: '—', nit, muni: '—', prov: '—', status: 'unapproved', docs: 0, ts: Date.now(), phone: country + ' ' + phone, email } });
    }, 1200);
  };
  const next = () => { if (step === 0) { haptic('light'); setStep(1); } else if (step === 1) send(); else onClose(); };
  const copy = () => { haptic('success'); setCopied(true); setTimeout(() => setCopied(false), 1600); };

  return (
    <Screen scroll={false} padTop={false}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 120 }} keyboardShouldPersistTaps="handled">
        <WizardHeader title="Nuevo cliente" steps={steps} step={step} onClose={onClose} subtitle="Invitá al cliente — él completa sus datos y documentos." />
        <View style={{ padding: 16 }}>
          {step === 0 && <StepNit nit={nit} setNit={setNit} exists={exists} valid={nitValid} />}
          {step === 1 && <StepInvite channel={channel} setChannel={setChannel} country={country} setCountry={setCountry} phone={phone} setPhone={setPhone} email={email} setEmail={setEmail} link={link} />}
          {step === 2 && <StepDone nit={nit} channel={channel} phone={country + ' ' + phone} email={email} link={link} copied={copied} onCopy={copy} />}
        </View>
      </ScrollView>
      <View style={{ position: 'absolute', left: 0, right: 0, bottom: 0, paddingHorizontal: 16, paddingTop: 16, paddingBottom: (insets.bottom || 0) + 16, backgroundColor: colors.bg }}>
        {step < 2
          ? <Button onPress={next} disabled={!canNext || sending} loading={sending} variant="primary" icon={step === 1 ? 'send' : undefined} iconRight={step === 0 ? 'arrowR' : undefined}>{step === 1 ? 'Enviar invitación' : 'Continuar'}</Button>
          : <Button onPress={onClose} variant="success" icon="check">Listo</Button>}
      </View>
    </Screen>
  );
}

function StepNit({ nit, setNit, exists, valid }: { nit: string; setNit: (v: string) => void; exists?: BkClient; valid: boolean }) {
  const [focus, setFocus] = useState(false);
  const shown = nit.length === 11;
  const border = shown ? (valid ? colors.success : colors.error) : focus ? colors.accent : colors.line;
  return (
    <FadeUp>
      <AppText serif weight="600" style={{ fontSize: 20, color: colors.ink }}>Verificá el NIT</AppText>
      <AppText style={{ fontSize: 13.5, color: colors.ink50, marginTop: 4, marginBottom: 18 }}>Número de identificación tributaria de Cuba · 11 dígitos.</AppText>
      <View style={{ position: 'relative', justifyContent: 'center' }}>
        <TextInput
          value={nit} onChangeText={(v) => setNit(v.replace(/\D/g, '').slice(0, 11))} keyboardType="number-pad"
          placeholder="2 0 1 9 8 7 6 5 4 3 2" placeholderTextColor={colors.ink30} autoFocus
          onFocus={() => setFocus(true)} onBlur={() => setFocus(false)}
          style={{ height: 60, paddingLeft: 18, paddingRight: 50, borderRadius: radius.md, fontSize: 22, fontFamily: fonts.serif, letterSpacing: 2, color: colors.ink, borderWidth: 1.5, borderColor: border, backgroundColor: colors.surface }}
        />
        {shown && <View style={{ position: 'absolute', right: 16 }}><Icon name={valid ? 'checkCircle' : 'alert'} size={24} color={valid ? colors.success : colors.error} /></View>}
      </View>
      <View style={{ flexDirection: 'row', gap: 4, marginTop: 12 }}>
        {Array.from({ length: 11 }).map((_, i) => <View key={i} style={{ flex: 1, height: 4, borderRadius: 999, backgroundColor: i < nit.length ? colors.accent : colors.line }} />)}
      </View>
      {shown && (
        <View style={{ marginTop: 16, flexDirection: 'row', alignItems: 'flex-start', gap: 10, padding: 14, borderRadius: 14, backgroundColor: alpha(valid ? colors.success : colors.error, valid ? 0.1 : 0.09) }}>
          <Icon name={valid ? 'checkCircle' : 'alert'} size={20} color={valid ? colors.success : colors.error} />
          <View style={{ flex: 1 }}>
            <AppText weight="700" style={{ fontSize: 14, color: valid ? colors.success : colors.error }}>{valid ? 'NIT disponible' : 'NIT ya registrado'}</AppText>
            <AppText style={{ fontSize: 12.5, color: colors.ink60, marginTop: 2, lineHeight: 17 }}>{valid ? 'Podés invitar a este cliente.' : `Ya existe como "${exists?.name}".`}</AppText>
          </View>
        </View>
      )}
    </FadeUp>
  );
}

function StepInvite({ channel, setChannel, country, setCountry, phone, setPhone, email, setEmail, link }: any) {
  const channels = [{ k: 'whatsapp', label: 'WhatsApp', icon: 'whatsapp' }, { k: 'email', label: 'Email', icon: 'mail' }, { k: 'manual', label: 'Link', icon: 'share' }];
  return (
    <FadeUp>
      <AppText serif weight="600" style={{ fontSize: 20, color: colors.ink }}>Enviar invitación</AppText>
      <AppText style={{ fontSize: 13.5, color: colors.ink50, marginTop: 4, marginBottom: 16 }}>Elegí cómo le llega el link al cliente.</AppText>
      <View style={{ flexDirection: 'row', gap: 10, marginBottom: 18 }}>
        {channels.map((ch) => {
          const on = channel === ch.k;
          return (
            <Tap key={ch.k} hapticKind="select" onPress={() => setChannel(ch.k)} style={{ flex: 1, borderRadius: radius.md, overflow: 'hidden' }}>
              {on
                ? <LinearGradient colors={gradients.navy} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ paddingVertical: 15, alignItems: 'center', gap: 8 }}>
                    <Icon name={ch.icon as any} size={24} color="#fff" />
                    <AppText weight="600" style={{ fontSize: 12.5, color: '#fff' }}>{ch.label}</AppText>
                  </LinearGradient>
                : <View style={{ paddingVertical: 15, alignItems: 'center', gap: 8, backgroundColor: colors.surface, borderWidth: 1.5, borderColor: colors.line, borderRadius: radius.md }}>
                    <Icon name={ch.icon as any} size={24} color={colors.ink60} />
                    <AppText weight="600" style={{ fontSize: 12.5, color: colors.ink60 }}>{ch.label}</AppText>
                  </View>}
            </Tap>
          );
        })}
      </View>

      {channel === 'whatsapp' && (
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <CountryCode value={country} onChange={setCountry} />
          <View style={{ flex: 1 }}><Field icon="dollar" placeholder="5 234 5678" value={phone} onChangeText={(v) => setPhone(v.replace(/[^\d\s]/g, ''))} keyboardType="phone-pad" autoFocus /></View>
        </View>
      )}
      {channel === 'email' && <Field icon="mail" placeholder="cliente@empresa.cu" value={email} onChangeText={setEmail} keyboardType="email-address" autoFocus />}
      {channel === 'manual' && (
        <View>
          <LinkBox link={link} />
          <AppText style={{ fontSize: 12.5, color: colors.ink50, marginTop: 10, textAlign: 'center' }}>Generá el link y compartilo por el medio que prefieras.</AppText>
        </View>
      )}

      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 18, paddingVertical: 11, paddingHorizontal: 14, borderRadius: 12, backgroundColor: alpha(colors.amber, 0.11) }}>
        <Icon name="clock" size={17} color={colors.amber} />
        <AppText weight="500" style={{ fontSize: 12.5, color: colors.ink70 }}>El link expira en 14 días.</AppText>
      </View>
    </FadeUp>
  );
}

function LinkBox({ link, onCopy, copied }: { link: string; onCopy?: () => void; copied?: boolean }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 13, paddingHorizontal: 14, borderRadius: 14, backgroundColor: colors.surface, borderWidth: 1.5, borderColor: colors.line, borderStyle: 'dashed' }}>
      <Icon name="share" size={18} color={colors.accent} />
      <AppText weight="600" numberOfLines={1} style={{ flex: 1, fontSize: 12.5, color: colors.ink70 }}>{link}</AppText>
      {onCopy && (
        <Tap onPress={onCopy} style={{ flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: copied ? colors.success : colors.navy700, borderRadius: 999, paddingVertical: 7, paddingHorizontal: 13 }}>
          <Icon name={copied ? 'check' : 'copy'} size={14} color="#fff" />
          <AppText weight="600" style={{ fontSize: 12.5, color: '#fff' }}>{copied ? 'Copiado' : 'Copiar'}</AppText>
        </Tap>
      )}
    </View>
  );
}

function StepDone({ nit, channel, phone, email, link, copied, onCopy }: any) {
  const dest = channel === 'whatsapp' ? phone : channel === 'email' ? email : 'Link manual';
  const chLabel = ({ whatsapp: 'WhatsApp', email: 'Email', manual: 'Link' } as any)[channel];
  return (
    <FadeUp style={{ alignItems: 'center' }}>
      <View style={{ width: 88, height: 88, borderRadius: 28, marginTop: 8, backgroundColor: alpha(colors.success, 0.13), alignItems: 'center', justifyContent: 'center' }}>
        <CheckMark size={46} color={colors.success} />
      </View>
      <AppText serif weight="600" style={{ fontSize: 22, color: colors.ink, marginTop: 20 }}>Invitación enviada</AppText>
      <AppText style={{ fontSize: 13.5, color: colors.ink50, marginTop: 8, lineHeight: 20, textAlign: 'center', maxWidth: 280 }}>El cliente recibirá el link para registrarse y subir sus documentos.</AppText>

      <Card pad={0} style={{ overflow: 'hidden', marginTop: 22, width: '100%' }}>
        <Row label="NIT" value={nit} />
        <Row label="Canal" value={chLabel} />
        <Row label="Destino" value={dest} last={channel === 'manual'} />
        {channel !== 'manual' && <Row label="Estado" last valueNode={<View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}><View style={{ width: 7, height: 7, borderRadius: 999, backgroundColor: colors.success }} /><AppText weight="700" style={{ color: colors.success, fontSize: 13 }}>Entregado</AppText></View>} />}
      </Card>
      <View style={{ marginTop: 16, width: '100%' }}><LinkBox link={link} onCopy={onCopy} copied={copied} /></View>
    </FadeUp>
  );
}

function Row({ label, value, valueNode, last }: { label: string; value?: string; valueNode?: React.ReactNode; last?: boolean }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, paddingVertical: 13, paddingHorizontal: 16, borderBottomWidth: last ? 0 : 1, borderBottomColor: colors.line }}>
      <AppText weight="500" style={{ fontSize: 13.5, color: colors.ink50 }}>{label}</AppText>
      {valueNode || <AppText weight="600" style={{ fontSize: 14, color: colors.ink }}>{value}</AppText>}
    </View>
  );
}

// ══ Detalle de cliente ═════════════════════════════════════════
export function ClientDetail({ id, onClose }: { id: string; onClose: () => void }) {
  const [s, dispatch] = useBroker();
  const { showToast } = useApp();
  const nav = useBkNav();
  const c = s.clients.find((x) => x.id === id);
  if (!c) return null;
  const orders = s.orders.filter((o) => o.clientId === c.id);
  const kyc = ({ unapproved: 'Sin enviar', review: 'En revisión', approved: 'Aprobado', rejected: 'Rechazado', suspended: 'Suspendido' } as any)[c.status];

  return (
    <Screen scroll={false} padTop={false}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
        <Hero padBottom={22}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <IconButton name="chevL" variant="glassDark" onPress={onClose} />
            <IconButton name="edit" variant="glassDark" onPress={() => showToast('Editar cliente', 'info')} />
          </View>
          <View style={{ marginTop: 14, flexDirection: 'row', alignItems: 'center', gap: 14 }}>
            <View style={{ width: 60, height: 60, borderRadius: 17, backgroundColor: 'rgba(255,255,255,0.14)', alignItems: 'center', justifyContent: 'center' }}>
              <AppText weight="700" style={{ color: '#fff', fontSize: 20 }}>{initials(c.name)}</AppText>
            </View>
            <View style={{ flex: 1, minWidth: 0 }}>
              <AppText serif weight="600" style={{ fontSize: 21, color: '#fff', lineHeight: 24 }}>{c.name}</AppText>
              <View style={{ marginTop: 8 }}><ClientBadge status={c.status} size="sm" /></View>
            </View>
          </View>
        </Hero>

        <View style={{ padding: 16, gap: 14 }}>
          <Card pad={0} style={{ overflow: 'hidden' }}>
            <CardHead icon="building" title="Identificación" />
            <Row label="NIT" value={c.nit} />
            <Row label="Razón social" value={c.legal} />
            <Row label="Nombre comercial" value={c.name} last />
          </Card>
          <Card pad={0} style={{ overflow: 'hidden' }}>
            <CardHead icon="map" title="Dirección y contacto" />
            <Row label="Municipio" value={c.muni} />
            <Row label="Provincia" value={c.prov} />
            <Row label="Teléfono" value={c.phone} />
            <Row label="Email" value={c.email} last />
          </Card>
          <Card pad={16}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <View style={{ width: 38, height: 38, borderRadius: 11, backgroundColor: alpha(BK_CLIENT_STATUS[c.status].color, 0.14), alignItems: 'center', justifyContent: 'center' }}>
                <Icon name="seal" size={20} color={BK_CLIENT_STATUS[c.status].color} />
              </View>
              <View style={{ flex: 1 }}>
                <AppText weight="700" style={{ fontSize: 14.5, color: colors.ink }}>Documentos / KYC</AppText>
                <AppText style={{ fontSize: 12.5, color: colors.ink50, marginTop: 1 }}>{c.docs} documentos · {kyc}</AppText>
              </View>
              <Tap onPress={() => showToast('Ver expediente', 'info')} style={{ backgroundColor: alpha(colors.navy500, 0.12), borderRadius: 999, paddingVertical: 9, paddingHorizontal: 14 }}>
                <AppText weight="600" style={{ fontSize: 13, color: colors.navy700 }}>Ver</AppText>
              </Tap>
            </View>
          </Card>

          {orders.length > 0 && (
            <View>
              <AppText weight="700" style={{ fontSize: 12, color: colors.ink40, letterSpacing: 0.6, marginHorizontal: 6, marginBottom: 10 }}>ÓRDENES ({orders.length})</AppText>
              <View style={{ gap: 10 }}>
                {orders.map((o) => (
                  <Card key={o.id} pad={13} onPress={() => nav.openOverlay({ type: 'order', id: o.id })}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                      <Icon name="fileText" size={20} color={colors.navy700} />
                      <View style={{ flex: 1, minWidth: 0 }}>
                        <AppText weight="700" style={{ fontSize: 13.5, color: colors.ink }}>{o.number}</AppText>
                        <View style={{ marginTop: 4 }}><OrderBadge status={o.state} size="sm" /></View>
                      </View>
                      <AppText serif weight="700" style={{ fontSize: 14, color: colors.ink }}>{money(o.cif)}</AppText>
                    </View>
                  </Card>
                ))}
              </View>
            </View>
          )}

          <Button variant="primary" icon="send" onPress={() => nav.openOverlay({ type: 'newOrder', clientId: c.id })}>Nueva orden para {c.name.split(' ')[0]}</Button>
        </View>
      </ScrollView>
    </Screen>
  );
}

function CardHead({ icon, title }: { icon: string; title: string }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 16, paddingTop: 14, paddingBottom: 10 }}>
      <View style={{ width: 32, height: 32, borderRadius: 9, backgroundColor: alpha(colors.navy500, 0.11), alignItems: 'center', justifyContent: 'center' }}>
        <Icon name={icon as any} size={17} color={colors.navy700} />
      </View>
      <AppText weight="700" style={{ fontSize: 14.5, color: colors.ink }}>{title}</AppText>
    </View>
  );
}
