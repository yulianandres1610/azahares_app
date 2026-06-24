// Tipos del contrato del backend (alineados con la web).

export type Role =
  | 'admin'
  | 'manager'
  | 'broker_owner'
  | 'broker_seller'
  | 'client_user'
  | 'importador'
  | 'supplier_admin'
  | 'supplier_yardman'
  | 'supplier_billing'
  | 'supplier_docs'
  | 'pending';

export interface Me {
  id: string;
  email: string;
  fullName: string | null;
  avatarUrl: string | null;
  role: Role;
  status: string | null;
  organization?: { id: string; type: string; name: string } | null;
  provider?: { id: string; name: string } | null;
  phone?: string | null;
  otpRequired?: boolean;
  otpEnforced?: boolean;
  otpEnabled?: boolean;
  requiresOnboarding?: boolean;
}

export type ContainerStatus =
  | 'visual_inspection'
  | 'refuel_inspection'
  | 'available'
  | 'in_transit'
  | 'in_vessel'
  | 'delivered'
  | 'returning'
  | 'maintenance'
  | 'unavailable';

// ── GPS (shape de UI, mapeado desde el ContainerGpsDto del backend) ──
export type GpsSync = 'connected' | 'stale' | 'nodata' | 'error';

export interface GpsFix {
  lat: number;
  lng: number;
  /** Posición normalizada 0..1 para el mapa estilizado (decorativo). */
  x: number;
  y: number;
  address: string | null;
  ts: number | null; // epoch ms
  speed: number; // km/h
  heading: string; // brújula (N, NE, …)
  accuracy: number | null; // metros
}

export interface ContainerGps {
  enabled: boolean;
  assetId: string | null;
  gatewaySerial: string | null;
  lastFix: GpsFix | null;
  sync: GpsSync;
  geofence: { name: string; distanceM: number } | null;
  track: GpsFix[];
}

export interface Container {
  id: string;
  number: string;
  type: string; // fuel | dry | reefer
  size: string | null;
  capacity: number | null;
  unit: string | null;
  tare: number | null;
  tareUnit?: string | null;
  ownership?: string | null;
  price?: number | null;
  currency?: string | null;
  status: ContainerStatus;
  cycle?: number | null;
  visualPhotos?: number | null;
  updatedAt?: string | null;
  photoUrl?: string | null;
  gps: ContainerGps;
}

export type InspectionStage = 'visual' | 'refuel' | 'completed';

export type InspectionMediaKind =
  | 'corner_front_left'
  | 'corner_front_right'
  | 'corner_rear_left'
  | 'corner_rear_right'
  | 'valve_top'
  | 'valve_bottom'
  | 'interior'
  | 'refuel_video'
  | 'coa'
  | 'other';

export interface InspectionMedia {
  id: string;
  kind: InspectionMediaKind;
  fileName: string;
  mimeType: string | null;
  uploadedAt: string;
  url: string | null;
}

export interface ContainerInspection {
  id: string;
  containerId: string;
  inspectionNumber: string;
  cycle: number;
  stage: InspectionStage;
  inspectorName: string | null;
  inspectionCompany: string | null;
  yardEmployeeName: string | null;
  productType: string | null;
  sealNumber: string | null;
  sealTop: string | null;
  sealBottom: string | null;
  fuelLevel: string | null;
  notes: string | null;
  salesOrderId: string | null;
  purchaseOrderId: string | null;
  visualCompletedAt: string | null;
  refuelCompletedAt: string | null;
  completedAt: string | null;
  labelGeneratedAt: string | null;
  createdAt: string;
  media: InspectionMedia[];
}

export interface InspectionLabelData {
  inspectionNumber: string;
  barcodeValue: string;
  publicToken: string | null;
  sealNumber: string | null;
  sealTop: string | null;
  sealBottom: string | null;
  inspectorName: string | null;
  inspectionCompany: string | null;
  yardEmployeeName: string | null;
  productType: string | null;
  fuelLevel: string | null;
  containerNumber: string;
  completedAt: string | null;
  cycle: number;
}
