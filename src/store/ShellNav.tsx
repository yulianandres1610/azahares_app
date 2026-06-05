// Navegación del shell autenticado: tab activa, overlays y filtro de lista.
import React, { createContext, useContext } from 'react';

export type TabId = 'home' | 'containers' | 'inspections' | 'profile';
export type Overlay = { type: 'detail'; id: string } | { type: 'new' } | { type: 'scan' } | { type: 'notifications' } | null;

export interface ShellNav {
  tab: TabId;
  setTab: (t: TabId) => void;
  overlay: Overlay;
  openOverlay: (o: NonNullable<Overlay>) => void;
  closeOverlay: () => void;
  filter: string;
  setFilter: (f: string) => void;
}

const Ctx = createContext<ShellNav | null>(null);
export const ShellNavProvider = Ctx.Provider;

export function useNav(): ShellNav {
  const v = useContext(Ctx);
  if (!v) throw new Error('useNav must be used within ShellNavProvider');
  return v;
}
