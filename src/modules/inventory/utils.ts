import type { Product } from '../../lib/types';

export function calculateProductMetrics(product: Product) {
  const transactionFees = product.base_price > 0 ? product.base_price * 0.029 + 0.30 : 0;
  const totalCosts = product.production_cost + product.shipping_cost +
    product.shipping_supplies_cost + product.handling_fee_add_on + product.pa_costs;
  const netMargin = product.base_price - transactionFees - totalCosts;
  const netMarginPercent = product.base_price > 0 ? (netMargin / product.base_price) * 100 : 0;

  const ttTransactionFees = product.tt_shop_price > 0 ? product.tt_shop_price * 0.029 + 0.30 : 0;
  const ttNetMargin = product.tt_shop_price - ttTransactionFees - totalCosts;
  const ttNetMarginPercent = product.tt_shop_price > 0 ? (ttNetMargin / product.tt_shop_price) * 100 : 0;

  const avgDailySales = product.csv_avg_daily > 0
    ? product.csv_avg_daily
    : product.six_month_book_sales / 180;
  const reorderThreshold = product.csv_reorder_threshold > 0
    ? product.csv_reorder_threshold
    : Math.ceil(product.lead_time * avgDailySales);
  const daysRemaining = avgDailySales > 0 ? product.book_inventory / avgDailySales : Infinity;

  let status: 'GOOD' | 'REORDER NOW' | 'BUNDLE' | 'TRACKING ONLY';
  if (product.do_not_reorder) {
    status = 'TRACKING ONLY';
  } else if (product.category === 'Bundle') {
    status = 'BUNDLE';
  } else if (product.book_inventory <= reorderThreshold) {
    status = 'REORDER NOW';
  } else {
    status = 'GOOD';
  }

  return {
    transactionFees,
    netMargin,
    netMarginPercent,
    ttNetMargin,
    ttNetMarginPercent,
    avgDailySales,
    reorderThreshold,
    daysRemaining,
    status,
    totalCosts,
  };
}

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value);
}

export function formatPercent(value: number): string {
  return `${value.toFixed(1)}%`;
}

export const CATEGORIES = ['Paperback', 'Hardcover', 'Art Pack', 'Bundle', 'Book Box', 'Omnibus'] as const;
export const STATUSES = ['GOOD', 'REORDER NOW', 'BUNDLE', 'TRACKING ONLY'] as const;
