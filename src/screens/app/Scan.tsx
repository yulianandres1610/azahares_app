// Escáner QR/barcode de la etiqueta → abre el contenedor.
import React from 'react';
import { CameraCapture } from '../../components/Camera';
import { useApp } from '../../store/AppContext';
import { useNav } from '../../store/ShellNav';
import { getPublicInspection } from '../../lib/api/inspections';

export function Scan({ onClose }: { onClose: () => void }) {
  const { t, containers, showToast } = useApp();
  const nav = useNav();

  const resolve = async (value: string) => {
    const raw = value.trim();
    // 1) intentar por número de contenedor
    const direct = containers.find((c) => raw.toUpperCase().includes(c.number.toUpperCase()) || c.number.toUpperCase() === raw.toUpperCase());
    if (direct) return open(direct.id, direct.number);

    // 2) si es un link .../inspeccion/<token>, resolver por token
    const m = raw.match(/inspeccion\/([A-Za-z0-9]+)/);
    if (m) {
      try {
        const pub = (await getPublicInspection(m[1])) as any;
        const num = pub?.containerNumber || pub?.container?.number;
        if (num) {
          const c = containers.find((x) => x.number.toUpperCase() === String(num).toUpperCase());
          if (c) return open(c.id, c.number);
        }
      } catch {}
    }
    showToast(t('noResults'), 'warn');
    onClose();
  };

  const open = (id: string, number: string) => {
    showToast(`${t('scanned')} · ${number}`, 'success');
    onClose();
    nav.openOverlay({ type: 'detail', id });
  };

  return <CameraCapture mode="scan" title={t('scanTitle')} hint={t('scanSub')} onClose={onClose} onCapture={resolve} />;
}
