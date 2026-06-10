// Productos del proveedor (para elegir el producto al crear IBCs).
import { apiFetch } from './client';

export interface SupplierProduct {
  id: string;
  sku: string;
  name: string;
  category: string;
  packagingType: string | null;
  innerQuantity: number | null;
  unitsPerContainer: number | null;
}

export const listSupplierProducts = () => apiFetch<SupplierProduct[]>('/supplier/products');

// Heurística para detectar productos IBC (tote 1000L): packagingType IBC o
// que tengan unidades por contenedor (van en contenedor seco).
export const isIbcProduct = (p: SupplierProduct) =>
  (p.packagingType || '').toUpperCase().includes('IBC') || (p.unitsPerContainer ?? 0) > 0;
