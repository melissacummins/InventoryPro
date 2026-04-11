import type { Product } from '../../lib/types';

export function calculateProductMetrics(product: Product) {
  // 3.1 Margin Calculations (from spec)
  const transactionFees = product.base_price > 0 ? product.base_price * 0.029 + 0.30 : 0;
  const netMargin = product.base_price - transactionFees
    - product.production_cost - product.shipping_cost
    - product.shipping_supplies_cost - product.handling_fee_add_on - product.pa_costs;
  const netMarginPercent = product.base_price > 0 ? (netMargin / product.base_price) * 100 : 0;

  // TT Shop margin includes freeShipping cost
  const ttTransactionFees = product.tt_shop_price > 0 ? product.tt_shop_price * 0.029 + 0.30 : 0;
  const ttNetMargin = product.tt_shop_price - ttTransactionFees
    - product.production_cost - product.shipping_cost
    - product.shipping_supplies_cost - product.handling_fee_add_on
    - product.pa_costs - product.free_shipping;
  const ttNetMarginPercent = product.tt_shop_price > 0 ? (ttNetMargin / product.tt_shop_price) * 100 : 0;

  // 3.2 Inventory Calculations
  const avgDailySales = product.csv_avg_daily > 0
    ? product.csv_avg_daily
    : product.six_month_book_sales / 180;
  const reorderThreshold = product.csv_reorder_threshold > 0
    ? product.csv_reorder_threshold
    : Math.ceil(product.lead_time * avgDailySales);
  const daysRemaining = avgDailySales > 0 ? product.book_inventory / avgDailySales : Infinity;
  const reorderQty = product.book_inventory < reorderThreshold
    ? reorderThreshold - product.book_inventory : 0;
  const reorderCost = reorderQty * product.production_cost;

  // 3.3 Status Logic
  let status: 'GOOD' | 'REORDER NOW' | 'BUNDLE' | 'TRACKING ONLY';
  let action: string;

  if (product.do_not_reorder) {
    status = 'TRACKING ONLY';
    action = 'TRACKING ONLY';
  } else if (product.category === 'Bundle' || product.category === 'Book Box') {
    status = 'BUNDLE';
    action = 'BUNDLE';
  } else if (product.book_inventory <= reorderThreshold && reorderThreshold > 0) {
    status = 'REORDER NOW';
    action = 'ORDER THIS WEEK';
  } else {
    status = 'GOOD';
    action = 'NO ACTION NEEDED';
  }

  return {
    transactionFees,
    netMargin,
    netMarginPercent,
    ttTransactionFees,
    ttNetMargin,
    ttNetMarginPercent,
    avgDailySales,
    reorderThreshold,
    daysRemaining,
    reorderQty,
    reorderCost,
    status,
    action,
  };
}

// 3.4 Bundle Auto-Calculation
// bundlesInventory = minimum bookInventory across all component books
export function calculateBundleInventory(product: Product, allProducts: Product[]): number {
  if ((product.category !== 'Bundle' && product.category !== 'Book Box') || !product.books_in_bundle) {
    return product.bundles_inventory;
  }

  const componentNames = product.books_in_bundle
    .split(',')
    .map(name => name.trim().toLowerCase())
    .filter(Boolean);

  if (componentNames.length === 0) return product.bundles_inventory;

  const componentInventories = componentNames.map(name => {
    const match = allProducts.find(p =>
      p.name.toLowerCase() === name ||
      p.name.toLowerCase().includes(name) ||
      name.includes(p.name.toLowerCase())
    );
    return match ? match.book_inventory : 0;
  });

  return Math.min(...componentInventories);
}

// Margin color coding per spec: green >= 50%, yellow 40-49%, red < 40%
export function marginColor(percent: number): string {
  if (percent >= 50) return 'text-green-600';
  if (percent >= 40) return 'text-yellow-600';
  return 'text-red-600';
}

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value);
}

export function formatPercent(value: number): string {
  return `${value.toFixed(1)}%`;
}

export const CATEGORIES = ['Paperback', 'Hardcover', 'Art Pack', 'Bundle', 'Book Box', 'Omnibus'] as const;
export const STATUSES = ['GOOD', 'REORDER NOW', 'BUNDLE', 'TRACKING ONLY'] as const;
