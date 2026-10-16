export type StockStatus = "IN_STOCK" | "LOW_STOCK" | "OUT_OF_STOCK";

export interface SkuAttributes {
  color: string;
  spec: string;
}

export interface SkuVariant {
  id: string;
  sku: string;
  productId: string;
  productName: string;
  category: string;
  attributes: SkuAttributes;
  unitCost: number;
  retailPrice: number;
  onHandStock: number;
  reservedStock: number;
  reorderPoint: number;
  warehouseBin: string;
}

export interface StockLedgerEntry {
  id: string;
  timestamp: string;
  sku: string;
  productName: string;
  delta: number;
  balanceAfter: number;
  reason: string;
  actor: string;
}
