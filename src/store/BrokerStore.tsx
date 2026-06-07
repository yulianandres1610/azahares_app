// Store del rol Broker: datos (clientes, órdenes, equipo, wallet, catálogo,
// notificaciones), reducer y helpers. Portado de app/store.jsx (slice broker).
// La identidad real (nombre/rol/email) llega desde /me; el resto se siembra
// con datos de demostración fieles al diseño hasta que existan los endpoints.
import React, { createContext, useContext, useMemo, useReducer } from 'react';
import type { Me } from '../lib/api/types';

// ── tipos ──────────────────────────────────────────────────────
export type BkClientStatus = 'unapproved' | 'review' | 'approved' | 'rejected' | 'suspended';
export type BkOrderState =
  | 'draft' | 'quote_sent' | 'quote_accepted' | 'offer_sent' | 'offer_signed'
  | 'invoiced' | 'payment_uploaded' | 'paid' | 'in_purchase' | 'in_transit' | 'delivered';
export type BkUserStatus = 'active' | 'invited' | 'suspended';
export type BkRole = 'broker_owner' | 'broker_seller';

export interface BkClient {
  id: string; name: string; legal: string; nit: string; muni: string; prov: string;
  status: BkClientStatus; docs: number; ts: number; phone: string; email: string;
}
export interface BkPayment {
  id: string; method: string; amount: number; date: string;
  status: 'verified' | 'pending' | 'rejected'; reference?: string; sender?: string;
}
export interface BkOrder {
  id: string; number: string; clientId: string; client: string; cargo: 'fuel' | 'food';
  state: BkOrderState; fob: number; cif: number; date: string; ts: number;
  items: number; containers: number; payments?: BkPayment[];
}
export interface BkUser {
  id: string; name: string; email: string; role: BkRole; status: BkUserStatus;
  commission?: number | null; phone?: string; ts: number;
}
export interface BkMove {
  id: string; kind: 'commission' | 'markup' | 'credit' | 'cashout'; desc: string;
  date: string; amount: number; balance: number; pending?: boolean;
}
export interface BkWallet { number: string; balance: number; holder: string; moves: BkMove[] }
export interface BkNotif {
  id: string; kind: 'available' | 'refuel' | 'coa' | 'delivery' | 'system';
  title: string; body: string; time: string; ts: number; read: boolean;
}
export interface BkTier { label: string; from: number; price: number }
export interface BkProduct {
  id: string; name: string; code: string; unit: string; price: number; change: number;
  icon: string; spark: number[]; tiers: BkTier[];
}
export interface BkCatalog { updated: string; items: BkProduct[] }

// ── meta (etiquetas + colores de estado) ───────────────────────
import { colors } from '../theme/tokens';

export const BK_CLIENT_STATUS: Record<BkClientStatus, { label: string; color: string; icon: string }> = {
  unapproved: { label: 'Sin aprobar', color: colors.ink40, icon: 'clock' },
  review: { label: 'En revisión', color: colors.amber, icon: 'clock' },
  approved: { label: 'Aprobado', color: colors.success, icon: 'checkCircle' },
  rejected: { label: 'Rechazado', color: colors.error, icon: 'x' },
  suspended: { label: 'Suspendido', color: '#8b6fe0', icon: 'alert' },
};
export const BK_ORDER_STATUS: Record<BkOrderState, { label: string; color: string }> = {
  draft: { label: 'Borrador', color: colors.ink40 },
  quote_sent: { label: 'Cotización enviada', color: colors.accent },
  quote_accepted: { label: 'Cotización aceptada', color: colors.navy500 },
  offer_sent: { label: 'Oferta enviada', color: colors.accent },
  offer_signed: { label: 'Oferta firmada', color: colors.navy700 },
  invoiced: { label: 'Facturada', color: colors.amber },
  payment_uploaded: { label: 'Pago subido', color: colors.amber },
  paid: { label: 'Pagada', color: colors.success },
  in_purchase: { label: 'En compra', color: colors.navy500 },
  in_transit: { label: 'En tránsito', color: colors.navy700 },
  delivered: { label: 'Entregada', color: colors.success },
};
export const BK_USER_STATUS: Record<BkUserStatus, { label: string; color: string }> = {
  active: { label: 'Activo', color: colors.success },
  invited: { label: 'Invitado', color: colors.amber },
  suspended: { label: 'Suspendido', color: colors.error },
};
export const BK_PIPELINE: BkOrderState[] = [
  'draft', 'quote_sent', 'quote_accepted', 'offer_sent', 'offer_signed', 'invoiced',
  'payment_uploaded', 'paid', 'in_purchase', 'in_transit', 'delivered',
];

export const money = (n: number, dec?: boolean) =>
  '$' + Number(n || 0).toLocaleString('en-US', {
    minimumFractionDigits: dec ? 2 : 0,
    maximumFractionDigits: dec ? 2 : 0,
  });

// ── datos semilla ──────────────────────────────────────────────
const D = 864e5;
const now = Date.now();

const BK_CLIENTS: BkClient[] = [
  { id: 'k1', name: 'Comercial Habana SRL', legal: 'Comercial Habana S.R.L.', nit: '20198765432', muni: 'Centro Habana', prov: 'La Habana', status: 'approved', docs: 6, ts: now - 22 * D, phone: '+53 5 234 5678', email: 'ventas@habana-srl.cu' },
  { id: 'k2', name: 'Distribuidora Oriente', legal: 'Distribuidora Oriente S.A.', nit: '20211223344', muni: 'Santiago', prov: 'Santiago de Cuba', status: 'review', docs: 4, ts: now - 6 * D, phone: '+53 5 778 1122', email: 'compras@doriente.cu' },
  { id: 'k3', name: 'Energía del Centro', legal: 'Energía del Centro S.R.L.', nit: '20255667788', muni: 'Santa Clara', prov: 'Villa Clara', status: 'approved', docs: 7, ts: now - 40 * D, phone: '+53 5 445 9090', email: 'info@energiacentro.cu' },
  { id: 'k4', name: 'Transcombustible Matanzas', legal: 'Transcombustible Matanzas S.A.', nit: '20299001122', muni: 'Matanzas', prov: 'Matanzas', status: 'unapproved', docs: 1, ts: now - 2 * D, phone: '+53 5 661 3030', email: 'gerencia@transmatanzas.cu' },
  { id: 'k5', name: 'Servicios Camagüey', legal: 'Servicios Camagüey S.R.L.', nit: '20233445566', muni: 'Camagüey', prov: 'Camagüey', status: 'rejected', docs: 3, ts: now - 12 * D, phone: '+53 5 332 7878', email: 'admin@servcamaguey.cu' },
  { id: 'k6', name: 'Logística Pinar', legal: 'Logística Pinar del Río S.A.', nit: '20277889900', muni: 'Pinar del Río', prov: 'Pinar del Río', status: 'suspended', docs: 5, ts: now - 60 * D, phone: '+53 5 119 4545', email: 'ops@logpinar.cu' },
  { id: 'k7', name: 'Holguín Fuel Trade', legal: 'Holguín Fuel Trade S.R.L.', nit: '20288776655', muni: 'Holguín', prov: 'Holguín', status: 'approved', docs: 6, ts: now - 15 * D, phone: '+53 5 556 2323', email: 'trade@holguinfuel.cu' },
  { id: 'k8', name: 'Cienfuegos Marina', legal: 'Cienfuegos Marina S.A.', nit: '20244332211', muni: 'Cienfuegos', prov: 'Cienfuegos', status: 'review', docs: 2, ts: now - 1 * D, phone: '+53 5 990 6767', email: 'marina@cienfuegos.cu' },
];

const BK_ORDERS: BkOrder[] = [
  { id: 'o1', number: 'AZ-ORD-2041', clientId: 'k1', client: 'Comercial Habana SRL', cargo: 'fuel', state: 'in_transit', fob: 168000, cif: 214500, date: 'May 28, 2026', ts: now - 9 * D, items: 2, containers: 7 },
  { id: 'o2', number: 'AZ-ORD-2038', clientId: 'k3', client: 'Energía del Centro', cargo: 'fuel', state: 'paid', fob: 96000, cif: 124800, date: 'May 30, 2026', ts: now - 7 * D, items: 1, containers: 4 },
  { id: 'o3', number: 'AZ-ORD-2047', clientId: 'k7', client: 'Holguín Fuel Trade', cargo: 'food', state: 'invoiced', fob: 72000, cif: 95400, date: 'Jun 2, 2026', ts: now - 4 * D, items: 1, containers: 3 },
  { id: 'o4', number: 'AZ-ORD-2051', clientId: 'k1', client: 'Comercial Habana SRL', cargo: 'fuel', state: 'quote_sent', fob: 48000, cif: 63200, date: 'Jun 4, 2026', ts: now - 2 * D, items: 1, containers: 2 },
  { id: 'o5', number: 'AZ-ORD-2052', clientId: 'k8', client: 'Cienfuegos Marina', cargo: 'food', state: 'draft', fob: 120000, cif: 156000, date: 'Jun 5, 2026', ts: now - 1 * D, items: 2, containers: 5 },
  { id: 'o6', number: 'AZ-ORD-2033', clientId: 'k3', client: 'Energía del Centro', cargo: 'fuel', state: 'delivered', fob: 144000, cif: 187200, date: 'May 18, 2026', ts: now - 19 * D, items: 2, containers: 6 },
  { id: 'o7', number: 'AZ-ORD-2049', clientId: 'k7', client: 'Holguín Fuel Trade', cargo: 'food', state: 'offer_signed', fob: 60000, cif: 79000, date: 'Jun 3, 2026', ts: now - 3 * D, items: 1, containers: 2 },
];

const BK_USERS: BkUser[] = [
  { id: 'u1', name: 'Marlon Quevedo', email: 'marlon@azaharesbroker.com', role: 'broker_owner', status: 'active', ts: now - 120 * D },
  { id: 'u2', name: 'Yenisel Cabrera', email: 'yenisel@azaharesbroker.com', role: 'broker_seller', status: 'active', ts: now - 80 * D },
  { id: 'u3', name: 'Reinier Sosa', email: 'reinier@azaharesbroker.com', role: 'broker_seller', status: 'active', ts: now - 45 * D },
  { id: 'u4', name: 'Dayana Pérez', email: 'dayana@azaharesbroker.com', role: 'broker_seller', status: 'invited', ts: now - 3 * D },
  { id: 'u5', name: 'Osmani Ferrer', email: 'osmani@azaharesbroker.com', role: 'broker_seller', status: 'suspended', ts: now - 30 * D },
];

const BK_WALLET: BkWallet = {
  number: '4471 2208 5530 1942', balance: 18450.75, holder: 'Marlon Quevedo',
  moves: [
    { id: 'm1', kind: 'commission', desc: 'Comisión · AZ-ORD-2038', date: 'May 30, 2026', amount: 3120, balance: 18450.75 },
    { id: 'm2', kind: 'markup', desc: 'Markup · AZ-ORD-2041', date: 'May 28, 2026', amount: 2680, balance: 15330.75 },
    { id: 'm3', kind: 'cashout', desc: 'Retiro a banco · BPA', date: 'May 24, 2026', amount: -5000, balance: 12650.75 },
    { id: 'm4', kind: 'commission', desc: 'Comisión · AZ-ORD-2033', date: 'May 18, 2026', amount: 4210, balance: 17650.75 },
    { id: 'm5', kind: 'credit', desc: 'Crédito de Azahares', date: 'May 12, 2026', amount: 1500, balance: 13440.75 },
    { id: 'm6', kind: 'markup', desc: 'Markup · AZ-ORD-2049', date: 'May 9, 2026', amount: 1940, balance: 11940.75 },
  ],
};

const BK_NOTIFS: BkNotif[] = [
  { id: 'bn1', kind: 'available', title: 'Cliente aceptó cotización', body: 'Comercial Habana SRL aceptó la cotización AZ-ORD-2051.', time: 'hace 12 min', ts: now - 72e4, read: false },
  { id: 'bn2', kind: 'refuel', title: 'Pago subido', body: 'Energía del Centro subió el comprobante de AZ-ORD-2038.', time: 'hace 1 h', ts: now - 36e5, read: false },
  { id: 'bn3', kind: 'coa', title: 'KYC aprobado', body: 'Holguín Fuel Trade fue aprobado por el equipo de Azahares.', time: 'hace 3 h', ts: now - 108e5, read: false },
  { id: 'bn4', kind: 'delivery', title: 'Retiro procesado', body: 'Tu cashout de $5,000 fue enviado al banco.', time: 'Ayer', ts: now - 9e7, read: true },
  { id: 'bn5', kind: 'system', title: 'Nueva orden creada', body: 'AZ-ORD-2052 para Cienfuegos Marina quedó en borrador.', time: 'Ayer', ts: now - 95e6, read: true },
];

const BK_CATALOG: BkCatalog = {
  updated: 'Hoy, 08:00 EST',
  items: [
    { id: 'p1', name: 'Diésel B5', code: 'DSL-B5', unit: 'gal', price: 0.92, change: 1.4, icon: 'fuel', spark: [0.88, 0.89, 0.9, 0.89, 0.91, 0.915, 0.92], tiers: [{ label: '1–4 cont.', from: 1, price: 0.92 }, { label: '5–9 cont.', from: 5, price: 0.895 }, { label: '10–24 cont.', from: 10, price: 0.87 }, { label: '25+ cont.', from: 25, price: 0.85 }] },
    { id: 'p2', name: 'Gasolina 95', code: 'GAS-95', unit: 'gal', price: 1.08, change: -0.8, icon: 'fuel', spark: [1.1, 1.11, 1.09, 1.1, 1.085, 1.082, 1.08], tiers: [{ label: '1–4 cont.', from: 1, price: 1.08 }, { label: '5–9 cont.', from: 5, price: 1.05 }, { label: '10–24 cont.', from: 10, price: 1.02 }, { label: '25+ cont.', from: 25, price: 0.99 }] },
    { id: 'p3', name: 'Jet A-1', code: 'JET-A1', unit: 'gal', price: 1.24, change: 2.1, icon: 'navigation', spark: [1.18, 1.19, 1.2, 1.21, 1.22, 1.235, 1.24], tiers: [{ label: '1–4 cont.', from: 1, price: 1.24 }, { label: '5–9 cont.', from: 5, price: 1.205 }, { label: '10–24 cont.', from: 10, price: 1.17 }, { label: '25+ cont.', from: 25, price: 1.14 }] },
    { id: 'p4', name: 'Fuel Oil 6', code: 'FO-6', unit: 'bbl', price: 78.40, change: 0.5, icon: 'droplet', spark: [76, 77, 76.5, 77.2, 78, 78.1, 78.4], tiers: [{ label: '1–4 cont.', from: 1, price: 78.40 }, { label: '5–9 cont.', from: 5, price: 76.10 }, { label: '10–24 cont.', from: 10, price: 74.00 }, { label: '25+ cont.', from: 25, price: 72.20 }] },
    { id: 'p5', name: 'Gasolina 91', code: 'GAS-91', unit: 'gal', price: 0.99, change: 0, icon: 'fuel', spark: [0.99, 0.98, 0.99, 1.0, 0.99, 0.99, 0.99], tiers: [{ label: '1–4 cont.', from: 1, price: 0.99 }, { label: '5–9 cont.', from: 5, price: 0.965 }, { label: '10–24 cont.', from: 10, price: 0.94 }, { label: '25+ cont.', from: 25, price: 0.92 }] },
  ],
};

// ── estado + reducer ───────────────────────────────────────────
export interface BkState {
  clients: BkClient[];
  orders: BkOrder[];
  users: BkUser[];
  wallet: BkWallet;
  notifs: BkNotif[];
  catalog: BkCatalog;
}

type Action =
  | { type: 'ADD_CLIENT'; client: BkClient }
  | { type: 'ADD_ORDER'; order: BkOrder }
  | { type: 'ADD_USER'; user: BkUser }
  | { type: 'SET_ORDER'; id: string; patch: Partial<BkOrder> }
  | { type: 'NOTIF_READ'; id: string }
  | { type: 'NOTIF_READ_ALL' }
  | { type: 'NOTIF_CLEAR' }
  | { type: 'CASHOUT'; amount: number; desc: string };

function reducer(s: BkState, a: Action): BkState {
  switch (a.type) {
    case 'ADD_CLIENT': return { ...s, clients: [a.client, ...s.clients] };
    case 'ADD_ORDER': return { ...s, orders: [a.order, ...s.orders] };
    case 'ADD_USER': return { ...s, users: [a.user, ...s.users] };
    case 'SET_ORDER': return { ...s, orders: s.orders.map((o) => (o.id === a.id ? { ...o, ...a.patch } : o)) };
    case 'NOTIF_READ': return { ...s, notifs: s.notifs.map((n) => (n.id === a.id ? { ...n, read: true } : n)) };
    case 'NOTIF_READ_ALL': return { ...s, notifs: s.notifs.map((n) => ({ ...n, read: true })) };
    case 'NOTIF_CLEAR': return { ...s, notifs: [] };
    case 'CASHOUT': {
      const w = s.wallet;
      return { ...s, wallet: { ...w, moves: [{ id: 'm' + Date.now(), kind: 'cashout', desc: a.desc || 'Retiro solicitado', date: 'Jun 7, 2026', amount: -a.amount, balance: w.balance, pending: true }, ...w.moves] } };
    }
    default: return s;
  }
}

function initial(me: Me | null): BkState {
  const holder = me?.fullName || BK_WALLET.holder;
  return {
    clients: BK_CLIENTS,
    orders: BK_ORDERS,
    users: BK_USERS,
    wallet: { ...BK_WALLET, holder },
    notifs: BK_NOTIFS,
    catalog: BK_CATALOG,
  };
}

// ── conteos para el dashboard ──────────────────────────────────
export function bkCounts(s: BkState) {
  const cl = s.clients, od = s.orders;
  const idx = (st: BkOrderState) => BK_PIPELINE.indexOf(st);
  return {
    clientsActive: cl.filter((c) => c.status === 'approved').length,
    clientsTotal: cl.length,
    clientsPending: cl.filter((c) => c.status === 'review' || c.status === 'unapproved').length,
    quotesSent: od.filter((o) => idx(o.state) >= 1).length,
    quotesSum: od.filter((o) => idx(o.state) >= 1).reduce((a, o) => a + o.cif, 0),
    invoiced: od.filter((o) => idx(o.state) >= 5).length,
    invoicedSum: od.filter((o) => idx(o.state) >= 5).reduce((a, o) => a + o.cif, 0),
    paid: od.filter((o) => idx(o.state) >= 7).length,
    paidSum: od.filter((o) => idx(o.state) >= 7).reduce((a, o) => a + o.cif, 0),
    ordersActive: od.filter((o) => idx(o.state) >= 1 && idx(o.state) < 10).length,
    conversion: od.length ? Math.round(od.filter((o) => idx(o.state) >= 7).length / od.length * 100) : 0,
  };
}

// ── contexto ───────────────────────────────────────────────────
const Ctx = createContext<[BkState, React.Dispatch<Action>] | null>(null);

export function BrokerProvider({ me, children }: { me: Me | null; children: React.ReactNode }) {
  const init = useMemo(() => initial(me), [me?.id, me?.fullName]);
  const [state, dispatch] = useReducer(reducer, init);
  return <Ctx.Provider value={[state, dispatch]}>{children}</Ctx.Provider>;
}

export function useBroker(): [BkState, React.Dispatch<Action>] {
  const v = useContext(Ctx);
  if (!v) throw new Error('useBroker must be used within BrokerProvider');
  return v;
}
