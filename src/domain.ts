// Constantes de dominio portadas de store.jsx + helpers sobre el modelo del backend.
import { colors } from './theme/tokens';
import type { IconName } from './components/Icon';
import type { Container, ContainerInspection, ContainerStatus, InspectionMediaKind } from './lib/api/types';

export const PHOTO_SLOTS: { key: InspectionMediaKind; label: string; hint: string }[] = [
  { key: 'corner_front_left', label: 'Front · Left', hint: 'Front-left corner' },
  { key: 'corner_front_right', label: 'Front · Right', hint: 'Front-right corner' },
  { key: 'corner_rear_left', label: 'Rear · Left', hint: 'Rear-left corner' },
  { key: 'corner_rear_right', label: 'Rear · Right', hint: 'Rear-right corner' },
  { key: 'valve_top', label: 'Valve · Top', hint: 'Top valve assembly' },
  { key: 'valve_bottom', label: 'Valve · Bottom', hint: 'Bottom valve & drain' },
  { key: 'interior', label: 'Interior', hint: 'Tank interior' },
];

export const VISUAL_KINDS: InspectionMediaKind[] = PHOTO_SLOTS.map((s) => s.key);

export interface StatusMeta {
  color: string;
  icon: IconName;
}

export const STATUS: Record<ContainerStatus, StatusMeta> = {
  visual_inspection: { color: colors.accent, icon: 'camera' },
  refuel_inspection: { color: colors.amber, icon: 'fuel' },
  available: { color: colors.success, icon: 'checkCircle' },
  in_transit: { color: colors.navy500, icon: 'truck' },
  in_vessel: { color: colors.navy700, icon: 'ship' },
  delivered: { color: '#0ea5a0', icon: 'checkCircle' },
  returning: { color: '#8b6fe0', icon: 'refresh' },
  maintenance: { color: colors.error, icon: 'settings' },
  unavailable: { color: colors.error, icon: 'alert' },
};

export const TYPES: Record<string, { label: string; icon: IconName }> = {
  fuel: { label: 'Fuel · iso-tank', icon: 'fuel' },
  dry: { label: 'Dry', icon: 'box' },
  reefer: { label: 'Reefer', icon: 'droplet' },
};

export function statusMeta(status: string): StatusMeta {
  return STATUS[status as ContainerStatus] ?? { color: colors.ink50, icon: 'cube' };
}

// Paso del flujo (0 visual · 1 refuel · 2 disponible+) a partir del estado.
export function stepOf(c: Container): number {
  if (c.status === 'visual_inspection') return 0;
  if (c.status === 'refuel_inspection') return 1;
  return 2;
}

export function visualCount(ins: ContainerInspection | null | undefined): number {
  if (!ins) return 0;
  return ins.media.filter((m) => VISUAL_KINDS.includes(m.kind)).length;
}

export function counts(containers: Container[]) {
  const by = (s: ContainerStatus) => containers.filter((c) => c.status === s).length;
  return {
    visual: by('visual_inspection'),
    refuel: by('refuel_inspection'),
    available: by('available'),
    returning: by('returning'),
    total: containers.length,
  };
}
