// Capa de API del rol Broker — espeja los servicios de la web
// (azahares_fronted/src/lib/api/*) contra el mismo backend NestJS.
// Todas las rutas usan Bearer JWT de Supabase vía apiFetch.
import { apiFetch } from './client';

// ════════════════════════════════════════════════════════════════
// Tipos (subconjunto broker del contrato del backend)
// ════════════════════════════════════════════════════════════════
export type ClientStatus = 'created' | 'documents_uploaded' | 'approved' | 'rejected' | 'suspended';

export interface ClientListItem {
  id: string;
  legalName: string;
  tradeName: string | null;
  province: string;
  municipality: string;
  contactEmail: string | null;
  contactPhone: string | null;
  status: ClientStatus;
  documentsCount: number;
  documentsApprovedCount: number;
  priceList: { id: string; name: string } | null;
  broker: { id: string; legalName: string } | null;
  createdAt: string;
  registrationCompletedAt: string | null;
}

export interface ClientResponse {
  id: string;
  legalName: string;
  tradeName: string | null;
  taxId: string | null;
  address: {
    street: string; number: string | null; betweenStreets: string | null; neighborhood: string | null;
    municipality: string; province: string; zip: string | null; notes: string | null;
  };
  contact: { firstName: string | null; lastName: string | null; email: string | null; phone: string | null };
  legalRep: { firstName: string | null; lastName: string | null; email: string | null; phone: string | null };
  status: ClientStatus;
  notes: string | null;
  priceList: { id: string; name: string } | null;
  broker: { id: string; legalName: string } | null;
  // Usuario del portal ya vinculado (registro completado). Si existe, NO se
  // reenvía link — el cliente ya entró aunque su KYC siga "Sin aprobar".
  clientUser: { id: string; email: string; fullName: string | null } | null;
  documentsCount: number;
  documentsApprovedCount: number;
  documentsRejectedCount: number;
  pendingRegistration: { link: string; expiresAt: string; expired: boolean; sentVia: string; sentTo: string | null; sentAt: string } | null;
  createdAt: string;
  updatedAt: string;
}

export interface ClientNitLookupResult {
  exists: boolean;
  ownerLabel?: string;
  ownerType?: 'azahares' | 'broker';
  clientLegalName?: string;
}

export interface InviteClientResult {
  clientId: string; token: string; link: string;
  sendVia: 'whatsapp' | 'email' | 'manual';
  delivered: boolean; deliveryError?: string;
}

export type PaymentMethod = 'wired_transfer' | 'usd_cash' | 'usdt' | 'wallet_credit';

export type SalesOrderStatus =
  | 'draft' | 'cotizacion_sent' | 'cotizacion_accepted' | 'quote_sent' | 'quote_signed'
  | 'pending_client_approval' | 'invoiced' | 'payment_uploaded' | 'paid'
  | 'purchase_ordered' | 'shipping' | 'delivered' | 'cancelled';

export interface SalesOrderListItem {
  id: string;
  orderNumber: string;
  bookingNumber: string | null;
  invoiceNumber: string | null;
  status: SalesOrderStatus;
  client: { id: string; name: string; contactName: string | null } | null;
  broker: { id: string; name: string } | null;
  totalCif: number;
  currency: string;
  itemsCount: number;
  paymentMethod: PaymentMethod | null;
  paymentVerifiedAt: string | null;
  pricingInvalidatedAt: string | null;
  createdAt: string;
}

export interface SalesOrderItem {
  id: string;
  productId: string;
  productSku: string | null;
  productName: string;
  description: string | null;
  category: string | null;
  quantity: number;
  unit: string | null;
  unitPrice: number;
  lineTotal: number;
}

export interface SalesOrderResponse {
  id: string;
  orderNumber: string;
  bookingNumber: string | null;
  invoiceNumber: string | null;
  client: { id: string; legalName: string; contactPhone?: string | null; status?: string | null } | null;
  broker: { id: string; legalName: string } | null;
  status: SalesOrderStatus;
  cotizacionToken: string | null;
  invoiceToken: string | null;
  trackingToken: string | null;
  quoteToken: string | null;
  quoteSignedAt: string | null;
  items: SalesOrderItem[];
  subtotalFob: number;
  fleteMaritimo: number;
  thcd: number;
  ispd: number;
  seguro: number;
  totalCif: number;
  currency: string;
  paymentMethod: PaymentMethod | null;
  paymentProofUrl: string | null;
  paymentUploadedAt: string | null;
  paymentVerifiedAt: string | null;
  paymentRejectionReason: string | null;
  portOfLoading: string | null;
  portOfDischarge: string | null;
  deliveryTimeDays: number | null;
  notes: string | null;
  pricingInvalidatedAt: string | null;
  purchaseOrders: { id: string; orderNumber: string; status: string; bookingNumber?: string | null }[];
  createdAt: string;
  updatedAt: string;
}

export interface CreateSalesOrderItemInput {
  productId: string; quantity: number; unit?: string; unitPrice: number; partidaArancelaria?: string;
}
export interface CreateSalesOrderPayload {
  clientId: string;
  priceListId?: string;
  items: CreateSalesOrderItemInput[];
  fleteMaritimo?: number; thcd?: number; ispd?: number; seguro?: number;
  portOfLoading?: string; portOfDischarge?: string; deliveryTimeDays?: number; notes?: string;
}

// Pagos (resumen de la orden — shape real de /sales-orders/{id}/payments)
export type PaymentRowStatus = 'uploaded' | 'verified' | 'rejected';
export interface PaymentProof { id: string; url: string | null; filename: string | null }
export interface PaymentRow {
  id: string;
  amount: number;
  method: PaymentMethod;
  reference: string | null;
  status: PaymentRowStatus;
  proofs: PaymentProof[];
  proofUrl: string | null;
  proofFilename: string | null;
  uploadedAt: string;
  verifiedAt: string | null;
  rejectionReason: string | null;
  notes: string | null;
}
export interface OrderPaymentsSummary {
  total: number;
  paid: number;
  pending: number;
  uploadedNotVerified: number;
  payments: PaymentRow[];
}

// Catálogo de venta del día
export interface ContainerScale { containers: number; totalLiters: number; fobUnitPrice: number; cifUnitPrice: number; totalCif: number }
export interface SalesCatalogItem {
  id: string; sku: string; name: string; category: string; imageUrl: string | null;
  unit: string; innerQuantity: number | null; basicUnitPrice: number;
  cifUnitSurcharge: number; cifUnitPrice: number; containerScales: ContainerScale[];
}
export interface SalesCatalog {
  items: SalesCatalogItem[]; cifUnitSurcharge: number; generatedAt: string;
  company: { legalName: string; phone: string | null; email: string | null; website: string | null };
}

export interface PriceHistorySeries {
  productId: string; productName: string; sku: string; period: string;
  current: number; previousClose: number | null; deltaPercent: number | null;
  points: { bucket: string; open: number; high: number; low: number; close: number }[];
}

// Listas de precio
export interface PriceListListItem {
  id: string; name: string; description: string | null; status: string; expiresAt: string | null;
  isDefault: boolean; itemsCount: number; isBrokerOwned: boolean; readOnly: boolean; createdAt: string;
}

// Wallet
export type WalletTxKind = 'commission' | 'markup' | 'credit' | 'usage' | 'cashout' | 'cashout_reverted' | 'adjustment';
export interface Wallet {
  id: string; ownerType: 'broker' | 'client'; ownerId: string; ownerName: string;
  walletNumber: string; balance: number; reservedAmount: number; availableBalance: number;
  currency: string; createdAt: string; updatedAt: string;
}
export type CashoutMethod = 'wired' | 'ach' | 'cash';
export interface Payee {
  id: string; brokerId: string; label: string; accountType: 'personal' | 'business' | null; defaultMethod: CashoutMethod | null;
  bankName: string | null; accountHolder: string | null; accountNumber: string | null;
  routing: string | null; swift: string | null; bankAddress: string | null;
  country: string | null; notes: string | null; isActive: boolean; createdAt: string;
}
export interface CashoutDisbursement {
  id: string; cashoutId: string; method: CashoutMethod; amount: number; reference: string | null;
  payeeLabel: string | null; bankName: string | null; accountHolder: string | null;
  accountNumber: string | null; routing: string | null; swift: string | null;
  proofUrl: string | null; paidAt: string | null; createdAt: string;
}
export interface CashoutDetail extends Cashout {
  brokerName: string; disbursedAmount: number; notes: string | null; rejectionReason: string | null;
  disbursements: CashoutDisbursement[];
}
export interface WalletTx {
  id: string; walletId: string; kind: WalletTxKind; amount: number; balanceAfter: number;
  salesOrderId: string | null; cashoutId: string | null; description: string | null; createdAt: string;
}
export interface Cashout {
  id: string; walletId: string; amount: number;
  status: 'requested' | 'processing' | 'completed' | 'rejected';
  requestedAt: string; processedAt: string | null; completedAt: string | null;
}

// Usuarios / equipo
export type UserRole = 'broker_owner' | 'broker_seller' | string;
export type UserStatus = 'active' | 'invited' | 'suspended';
export interface UserListItem {
  id: string; email: string; fullName: string | null; phone: string | null; avatarUrl: string | null;
  role: UserRole; status: UserStatus; organization: { id: string; type: string; name: string } | null; createdAt: string;
}

// Dashboard
export interface BrokerDashboardSummary {
  generatedAt: string;
  scope: 'broker_owner' | 'broker_seller';
  clients: { total: number; active: number; pending: number };
  salesOrders: {
    total: number; drafts: number;
    quotesSent: number; quotesSentAmount: number; quotesSigned: number;
    invoicesIssued: number; invoicesIssuedAmount: number;
    invoicesPaid: number; invoicesPaidAmount: number;
    inShipping: number; delivered: number; cancelled: number;
  };
  topClients: { clientId: string; legalName: string; ordersCount: number; paidAmount: number; totalAmount: number }[];
  recentSalesOrders: { id: string; orderNumber: string; invoiceNumber: string | null; clientName: string | null; status: string; totalCif: number; createdAt: string }[];
}

// Tracking público por token (mismo que la web — timeline desde la creación)
export type TrackingStep =
  | 'order_placed' | 'quote_sent' | 'quote_accepted' | 'invoice_issued' | 'payment_received'
  | 'po_sent_to_supplier' | 'supplier_accepted' | 'supplier_processing' | 'booking_requested'
  | 'booking_confirmed' | 'container_assigned' | 'container_loaded' | 'bol_issued'
  | 'dispatched' | 'arrived_at_destination' | 'delivered';
export interface TrackingTimelineEvent { step: TrackingStep; at: string | null; meta?: { catNumbers?: string[] } }
export interface PublicTrackingContainer {
  id: string; containerNumber: string; status: string; productName: string | null; poOrderNumber: string | null;
  lastLocation: { address: string | null; speedMph: number | null; seenAt: string } | null;
}
export interface PublicTrackingResponse {
  order: { orderNumber: string; bookingNumber: string | null; status: string; createdAt: string; portOfLoading: string | null; portOfDischarge: string | null };
  client: { legalName: string };
  containers: PublicTrackingContainer[];
  timeline: TrackingTimelineEvent[];
  fetchedAt: string;
}

// Audit log (historial real de la orden)
export interface AuditLog {
  id: string; actorEmail: string; actorRole: string; action: string;
  resourceType: string; resourceId: string | null; resourceName: string | null;
  changes: Record<string, { before?: unknown; after?: unknown }> | null; createdAt: string;
}
export interface AuditLogPage { items: AuditLog[]; total: number }

// ════════════════════════════════════════════════════════════════
// Clientes
// ════════════════════════════════════════════════════════════════
export const listClients = () => apiFetch<ClientListItem[]>('/clients');
export const getClient = (id: string) => apiFetch<ClientResponse>(`/clients/${id}`);
export const lookupClientByNit = (nit: string) => {
  const t = nit.trim();
  if (!t) return Promise.resolve<ClientNitLookupResult>({ exists: false });
  return apiFetch<ClientNitLookupResult>(`/clients/lookup-by-nit?nit=${encodeURIComponent(t)}`);
};
export const inviteClient = (payload: { taxId: string; sendVia: 'whatsapp' | 'email' | 'manual'; sendTo?: string }) =>
  apiFetch<InviteClientResult>('/clients/invite', { method: 'POST', body: payload });
export const resendClientInvitation = (clientId: string, payload: { sendVia: 'whatsapp' | 'email' | 'manual'; sendTo?: string }) =>
  apiFetch<{ token: string; link: string; delivered: boolean; deliveryError?: string }>(`/clients/${clientId}/resend-invitation`, { method: 'POST', body: payload });

// Editar datos del cliente. El broker puede actualizar identificación,
// dirección y contactos; status/brokerId quedan reservados al admin Azahares.
export interface UpdateClientPayload {
  legalName?: string;
  tradeName?: string;
  taxId?: string;
  address?: {
    street?: string; number?: string; betweenStreets?: string; neighborhood?: string;
    municipality?: string; province?: string; zip?: string; notes?: string;
  };
  contact?: { firstName?: string; lastName?: string; email?: string; phone?: string };
  legalRep?: { firstName?: string; lastName?: string; email?: string; phone?: string };
  notes?: string;
}
export const updateClient = (id: string, payload: UpdateClientPayload) =>
  apiFetch<ClientResponse>(`/clients/${id}`, { method: 'PATCH', body: payload });

// ════════════════════════════════════════════════════════════════
// Órdenes de venta
// ════════════════════════════════════════════════════════════════
export const listSalesOrders = () => apiFetch<SalesOrderListItem[]>('/sales-orders');
export const getSalesOrder = (id: string) => apiFetch<SalesOrderResponse>(`/sales-orders/${id}`);
export const createSalesOrder = (payload: CreateSalesOrderPayload) =>
  apiFetch<SalesOrderResponse>('/sales-orders', { method: 'POST', body: payload });
// Editar la orden (solo draft / pending_client_approval). items recompone líneas.
export const updateSalesOrder = (
  id: string,
  payload: { items?: CreateSalesOrderItemInput[]; fleteMaritimo?: number; thcd?: number; ispd?: number; seguro?: number; notes?: string },
) => apiFetch<SalesOrderResponse>(`/sales-orders/${id}`, { method: 'PATCH', body: payload });
export const sendCotizacion = (id: string, options: { recipients?: string[]; sendEmail?: boolean } = {}) =>
  apiFetch<SalesOrderResponse>(`/sales-orders/${id}/send-cotizacion`, { method: 'POST', body: options });
export const sendQuote = (id: string, options: { recipients?: string[]; sendEmail?: boolean } = {}) =>
  apiFetch<SalesOrderResponse>(`/sales-orders/${id}/send-quote`, { method: 'POST', body: options });
export const issueInvoice = (id: string, options: { recipients?: string[]; sendEmail?: boolean } = {}) =>
  apiFetch<SalesOrderResponse>(`/sales-orders/${id}/issue-invoice`, { method: 'POST', body: options });
export const cancelSalesOrder = (id: string, reason?: string) =>
  apiFetch<SalesOrderResponse>(`/sales-orders/${id}/cancel`, { method: 'POST', body: { reason: reason?.trim() || undefined } });

// Pagos — lectura del resumen (admin/broker) + subida del broker (comprobante
// individual sobre la orden: signed-url + submit).
export const getOrderPayments = (id: string) => apiFetch<OrderPaymentsSummary>(`/sales-orders/${id}/payments`);
export const getPaymentProofUploadUrl = (id: string, fileName: string) =>
  apiFetch<{ uploadUrl: string; path: string; token: string }>(`/sales-orders/${id}/payment-proof/signed-url`, { method: 'POST', body: { fileName } });
export const submitPayment = (id: string, payload: { method: PaymentMethod; proofUrl: string; proofFilename: string }) =>
  apiFetch<SalesOrderResponse>(`/sales-orders/${id}/payment`, { method: 'POST', body: payload });
export const getPaymentProofDownloadUrl = (id: string) =>
  apiFetch<{ url: string }>(`/sales-orders/${id}/payment-proof/download-url`);

// ════════════════════════════════════════════════════════════════
// Catálogo / productos / precios
// ════════════════════════════════════════════════════════════════
export const getSalesCatalog = () => apiFetch<SalesCatalog>('/products/sales-catalog');
export const getProductPriceHistory = (productId: string, period: 'daily' | 'weekly' | 'monthly' = 'daily', rangeDays = 30) =>
  apiFetch<PriceHistorySeries>(`/products/${productId}/price-history?period=${period}&rangeDays=${rangeDays}`);
export const listPriceLists = () => apiFetch<PriceListListItem[]>('/price-lists');

// ════════════════════════════════════════════════════════════════
// Wallet
// ════════════════════════════════════════════════════════════════
export const getMyWallet = () => apiFetch<Wallet | null>('/wallets/me');
export const listWalletTransactions = (walletId: string, limit = 50) =>
  apiFetch<WalletTx[]>(`/wallets/${walletId}/transactions?limit=${limit}`);
export interface CashoutPayeeInput {
  payeeId?: string; accountType?: 'personal' | 'business'; method: CashoutMethod; country: string; label: string;
  bankName?: string; accountNumber?: string; routing?: string; swift?: string; bankAddress?: string;
}
export const requestCashout = (walletId: string, payload: { amount: number; notes?: string; payee: CashoutPayeeInput }) =>
  apiFetch<Cashout>(`/wallets/${walletId}/cashout`, { method: 'POST', body: payload });
export const getCashoutDetail = (id: string) =>
  apiFetch<CashoutDetail>(`/accounting/cashouts/${id}`);
export const listPayees = (brokerId: string) =>
  apiFetch<Payee[]>(`/accounting/brokers/${brokerId}/payees`);

// ════════════════════════════════════════════════════════════════
// Usuarios / equipo
// ════════════════════════════════════════════════════════════════
export const listUsers = () => apiFetch<UserListItem[]>('/users');
export const createUser = (payload: { fullName: string; email: string; password: string; role: 'broker_owner' | 'broker_seller'; phone?: string; organizationId?: string }) =>
  apiFetch<UserListItem>('/users', { method: 'POST', body: payload });

// ════════════════════════════════════════════════════════════════
// Dashboard / tracking
// ════════════════════════════════════════════════════════════════
export const getBrokerDashboardSummary = () => apiFetch<BrokerDashboardSummary>('/dashboard/broker-summary');
export const getPublicTracking = (token: string) => apiFetch<PublicTrackingResponse>(`/public/tracking/${token}`);
export const listOrderAuditLogs = (orderId: string) =>
  apiFetch<AuditLogPage>(`/audit-logs?resourceType=sale&resourceId=${encodeURIComponent(orderId)}&limit=100`);
