// Capa de DATOS REALES del rol Broker. Consume los endpoints del backend
// (mismos que la web) y expone datos mapeados a la UI + acciones de refresh.
// Nada de datos mock: todo proviene de api.azaharesfuel.com.
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { Me } from '../lib/api/types';
import { colors } from '../theme/tokens';
import * as api from '../lib/api/broker';
import type {
  BrokerDashboardSummary, ClientListItem, ClientStatus, SalesCatalogItem, SalesOrderListItem,
  SalesOrderStatus, UserListItem, Wallet, WalletTx,
} from '../lib/api/broker';

export * as brokerApi from '../lib/api/broker';

// ── formato de dinero ──────────────────────────────────────────
export const money = (n: number, dec?: boolean) =>
  '$' + Number(n || 0).toLocaleString('en-US', { minimumFractionDigits: dec ? 2 : 0, maximumFractionDigits: dec ? 2 : 0 });

// Capacidad máxima por contenedor 20 ft de combustible: 6500 gal ó 25 000 L
// (≈157 bbl). Se usa para validar/limitar el volumen por contenedor.
export function maxPerContainer(unit: string): number {
  const u = (unit || '').toLowerCase();
  if (u.includes('gal')) return 6500;
  if (u.includes('bbl') || u.includes('barr')) return 157;
  return 25000; // litros por defecto
}

// ── estados de cliente (clave de diseño ← estado backend) ──────
export type BkClientStatusKey = 'unapproved' | 'review' | 'approved' | 'rejected' | 'suspended';
export const clientStatusKey = (s: ClientStatus): BkClientStatusKey =>
  s === 'documents_uploaded' ? 'review' : s === 'created' ? 'unapproved' : (s as BkClientStatusKey);
export const BK_CLIENT_STATUS: Record<BkClientStatusKey, { label: string; color: string }> = {
  unapproved: { label: 'Sin aprobar', color: colors.ink40 },
  review: { label: 'En revisión', color: colors.amber },
  approved: { label: 'Aprobado', color: colors.success },
  rejected: { label: 'Rechazado', color: colors.error },
  suspended: { label: 'Suspendido', color: '#8b6fe0' },
};

// ── estados de orden (backend) → etiqueta/color + índice de pipeline ──
// Etiquetas idénticas a la web (SALES_ORDER_STATUS_LABEL).
export const BK_ORDER_STATUS: Record<SalesOrderStatus, { label: string; color: string }> = {
  draft: { label: 'Borrador', color: colors.ink40 },
  cotizacion_sent: { label: 'Cotización enviada', color: colors.accent },
  cotizacion_accepted: { label: 'Cotización aceptada', color: colors.navy500 },
  quote_sent: { label: 'Oferta enviada', color: colors.accent },
  quote_signed: { label: 'Oferta firmada', color: colors.navy700 },
  pending_client_approval: { label: 'Pendiente aprobación cliente', color: colors.accent },
  invoiced: { label: 'Facturada', color: colors.amber },
  payment_uploaded: { label: 'Pago en revisión', color: colors.amber },
  paid: { label: 'Pagada', color: colors.success },
  purchase_ordered: { label: 'Compra emitida', color: colors.navy500 },
  shipping: { label: 'En despacho', color: colors.navy700 },
  delivered: { label: 'Entregada', color: colors.success },
  cancelled: { label: 'Cancelada', color: colors.error },
};
// índice macro 0..10 para barras de progreso y Pipeline; -1 = cancelada
export const orderIdx = (s: SalesOrderStatus): number => ({
  draft: 0, cotizacion_sent: 1, cotizacion_accepted: 2, quote_sent: 3, pending_client_approval: 3,
  quote_signed: 4, invoiced: 5, payment_uploaded: 6, paid: 7, purchase_ordered: 8, shipping: 9, delivered: 10, cancelled: -1,
} as Record<SalesOrderStatus, number>)[s];
export const ORDER_PIPELINE_LEN = 11;

export type BkUserStatusKey = 'active' | 'invited' | 'suspended';
export const BK_USER_STATUS: Record<BkUserStatusKey, { label: string; color: string }> = {
  active: { label: 'Activo', color: colors.success },
  invited: { label: 'Invitado', color: colors.amber },
  suspended: { label: 'Suspendido', color: colors.error },
};

// ── tipos UI mapeados ──────────────────────────────────────────
export interface UIClient {
  id: string; name: string; muni: string; prov: string; statusKey: BkClientStatusKey;
  docs: number; phone: string; email: string; ts: number; registered: boolean;
}
export interface UIOrder {
  id: string; number: string; client: string; clientId: string | null;
  status: SalesOrderStatus; idx: number; cif: number; date: string; ts: number;
  items: number; pricingChanged: boolean; cargo: 'fuel' | 'food';
}
export interface UICatalogTier { label: string; price: number; containers: number }
export interface UICatalogItem {
  id: string; name: string; code: string; unit: string; price: number; change: number;
  icon: string; spark: number[]; tiers: UICatalogTier[]; imageUrl: string | null;
  unitsPerContainer: number;
}
export interface UICatalog { updated: string; items: UICatalogItem[] }

// ── mapeos ─────────────────────────────────────────────────────
const fmtDate = (iso: string) => {
  try { return new Date(iso).toLocaleDateString('es', { day: 'numeric', month: 'short', year: 'numeric' }); } catch { return iso; }
};
function mapClient(c: ClientListItem): UIClient {
  return {
    id: c.id, name: c.legalName, muni: c.municipality || '—', prov: c.province || '—',
    statusKey: clientStatusKey(c.status), docs: c.documentsCount,
    phone: c.contactPhone || '—', email: c.contactEmail || '—',
    ts: new Date(c.createdAt).getTime(), registered: !!c.registrationCompletedAt,
  };
}
function mapOrder(o: SalesOrderListItem): UIOrder {
  return {
    id: o.id, number: o.orderNumber, client: o.client?.name || '—', clientId: o.client?.id || null,
    status: o.status, idx: orderIdx(o.status), cif: o.totalCif, date: fmtDate(o.createdAt),
    ts: new Date(o.createdAt).getTime(), items: o.itemsCount, pricingChanged: !!o.pricingInvalidatedAt, cargo: 'fuel',
  };
}
function iconForCatalog(it: SalesCatalogItem): string {
  const s = `${it.category} ${it.name} ${it.sku}`.toLowerCase();
  if (s.includes('jet') || s.includes('avia')) return 'navigation';
  if (s.includes('fuel oil') || s.includes('oil') || s.includes('crudo') || s.includes('bunker')) return 'droplet';
  return 'fuel';
}
function mapCatalog(cat: api.SalesCatalog, sparks: Record<string, { spark: number[]; change: number }>): UICatalog {
  return {
    updated: (() => { try { return new Date(cat.generatedAt).toLocaleString('es', { hour: '2-digit', minute: '2-digit' }); } catch { return ''; } })(),
    items: cat.items.map((it) => {
      const sp = sparks[it.id] || { spark: [], change: 0 };
      const scales = it.containerScales || [];
      // Precio CIF (igual que el catálogo web): base + cargos navieros.
      const tiers: UICatalogTier[] = scales.map((s) => ({ label: `${s.containers}+ cont.`, price: s.cifUnitPrice, containers: s.containers }));
      const rawPerContainer = it.innerQuantity && it.innerQuantity > 0
        ? it.innerQuantity
        : scales[0] && scales[0].containers > 0 ? Math.round(scales[0].totalLiters / scales[0].containers) : 24000;
      // tope de capacidad por contenedor 20 ft de combustible
      const perContainer = Math.min(rawPerContainer, maxPerContainer(it.unit));
      return {
        id: it.id, name: it.name, code: it.sku, unit: it.unit, price: it.cifUnitPrice,
        change: sp.change, icon: iconForCatalog(it),
        spark: sp.spark.length ? sp.spark : [it.cifUnitPrice, it.cifUnitPrice],
        tiers: tiers.length ? tiers : [{ label: '1+ cont.', price: it.cifUnitPrice, containers: 1 }],
        imageUrl: it.imageUrl, unitsPerContainer: perContainer,
      };
    }),
  };
}

// ── conteos para el dashboard (desde el summary real) ──────────
export function summaryCounts(d: BrokerDashboardSummary | null) {
  const so = d?.salesOrders;
  return {
    clientsActive: d?.clients.active ?? 0,
    clientsTotal: d?.clients.total ?? 0,
    clientsPending: d?.clients.pending ?? 0,
    quotesSent: so?.quotesSent ?? 0,
    quotesSum: so?.quotesSentAmount ?? 0,
    invoiced: so?.invoicesIssued ?? 0,
    invoicedSum: so?.invoicesIssuedAmount ?? 0,
    paid: so?.invoicesPaid ?? 0,
    paidSum: so?.invoicesPaidAmount ?? 0,
    ordersActive: (so?.quotesSent ?? 0) + (so?.invoicesIssued ?? 0) - (so?.delivered ?? 0) - (so?.cancelled ?? 0),
    conversion: so && so.total ? Math.round((so.invoicesPaid / so.total) * 100) : 0,
    totalSold: so?.invoicesPaidAmount ?? 0,
  };
}

// ════════════════════════════════════════════════════════════════
// Provider
// ════════════════════════════════════════════════════════════════
interface BrokerCtx {
  loading: boolean;
  error: string | null;
  dashboard: BrokerDashboardSummary | null;
  clients: UIClient[];
  orders: UIOrder[];
  catalog: UICatalog | null;
  wallet: Wallet | null;
  walletTx: WalletTx[];
  users: UserListItem[];
  defaultPriceListId: string | null;
  refreshAll: () => Promise<void>;
  refreshClients: () => Promise<void>;
  refreshOrders: () => Promise<void>;
  refreshWallet: () => Promise<void>;
  refreshUsers: () => Promise<void>;
  refreshDashboard: () => Promise<void>;
}

const Ctx = createContext<BrokerCtx | null>(null);

export function BrokerProvider({ me, children }: { me: Me | null; children: React.ReactNode }) {
  const owner = me?.role === 'broker_owner';
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dashboard, setDashboard] = useState<BrokerDashboardSummary | null>(null);
  const [clients, setClients] = useState<UIClient[]>([]);
  const [orders, setOrders] = useState<UIOrder[]>([]);
  const [catalog, setCatalog] = useState<UICatalog | null>(null);
  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [walletTx, setWalletTx] = useState<WalletTx[]>([]);
  const [users, setUsers] = useState<UserListItem[]>([]);
  const [defaultPriceListId, setDefaultPriceListId] = useState<string | null>(null);

  const refreshDashboard = useCallback(async () => {
    try { setDashboard(await api.getBrokerDashboardSummary()); } catch {}
  }, []);
  const refreshClients = useCallback(async () => {
    try { setClients((await api.listClients()).map(mapClient)); } catch {}
  }, []);
  const refreshOrders = useCallback(async () => {
    try { setOrders((await api.listSalesOrders()).map(mapOrder)); } catch {}
  }, []);
  const refreshWallet = useCallback(async () => {
    try {
      const w = await api.getMyWallet();
      setWallet(w);
      if (w) setWalletTx(await api.listWalletTransactions(w.id, 50));
      else setWalletTx([]);
    } catch {}
  }, []);
  const refreshUsers = useCallback(async () => {
    if (!owner) return;
    try { setUsers(await api.listUsers()); } catch {}
  }, [owner]);

  const refreshCatalog = useCallback(async () => {
    try {
      const cat = await api.getSalesCatalog();
      // sparkline + % de cambio por producto (en paralelo, tolerante a fallos)
      const sparks: Record<string, { spark: number[]; change: number }> = {};
      await Promise.all(
        cat.items.map(async (it) => {
          try {
            const h = await api.getProductPriceHistory(it.id, 'daily', 21);
            sparks[it.id] = { spark: (h.points || []).map((p) => p.close), change: h.deltaPercent ?? 0 };
          } catch { /* producto sin historial → sparkline plano */ }
        }),
      );
      setCatalog(mapCatalog(cat, sparks));
    } catch {}
  }, []);

  const refreshDefaultPriceList = useCallback(async () => {
    try {
      const lists = await api.listPriceLists();
      const def = lists.find((l) => l.isDefault) || lists.find((l) => l.isBrokerOwned) || lists[0];
      setDefaultPriceListId(def?.id ?? null);
    } catch {}
  }, []);

  const refreshAll = useCallback(async () => {
    setError(null);
    try {
      await Promise.all([
        refreshDashboard(), refreshClients(), refreshOrders(), refreshWallet(),
        refreshUsers(), refreshCatalog(), refreshDefaultPriceList(),
      ]);
    } catch (e: any) {
      setError(e?.message || 'Error de conexión');
    } finally {
      setLoading(false);
    }
  }, [refreshDashboard, refreshClients, refreshOrders, refreshWallet, refreshUsers, refreshCatalog, refreshDefaultPriceList]);

  useEffect(() => { refreshAll(); }, [refreshAll]);

  const value: BrokerCtx = useMemo(() => ({
    loading, error, dashboard, clients, orders, catalog, wallet, walletTx, users, defaultPriceListId,
    refreshAll, refreshClients, refreshOrders, refreshWallet, refreshUsers, refreshDashboard,
  }), [loading, error, dashboard, clients, orders, catalog, wallet, walletTx, users, defaultPriceListId, refreshAll, refreshClients, refreshOrders, refreshWallet, refreshUsers, refreshDashboard]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useBroker(): BrokerCtx {
  const v = useContext(Ctx);
  if (!v) throw new Error('useBroker must be used within BrokerProvider');
  return v;
}
