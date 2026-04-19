import type { ProfitCategory } from '../types';

// Seed list used when a user has no profit_categories rows yet. The first
// ten are "built-ins" mapped to the legacy daily_records columns so any
// existing data flows through unchanged. The last three have no legacy
// column and live in the daily_records.custom_amounts JSONB.
//
// New users can rename any of these (e.g. "PNR Ads" -> "Meta Ad Account 1"),
// toggle them off, reorder, or add more.
export function buildDefaultCategories(): Omit<ProfitCategory, 'id'>[] {
  return [
    { name: 'PNR Ads', type: 'ad', legacyColumn: 'pnr_ads', sortOrder: 1, isVisible: true, isCustom: false },
    { name: 'Contemp Ads', type: 'ad', legacyColumn: 'contemp_ads', sortOrder: 2, isVisible: true, isCustom: false },
    { name: 'Traffic Ads', type: 'ad', legacyColumn: 'traffic_ads', sortOrder: 3, isVisible: true, isCustom: false },
    { name: 'Misc Ads', type: 'ad', legacyColumn: 'misc_ads', sortOrder: 4, isVisible: true, isCustom: false },
    { name: 'Amazon Ads', type: 'ad', legacyColumn: null, sortOrder: 5, isVisible: true, isCustom: true },
    { name: 'Shopify', type: 'revenue', legacyColumn: 'shopify_rev', sortOrder: 1, isVisible: true, isCustom: false },
    { name: 'Amazon', type: 'revenue', legacyColumn: 'amazon_rev', sortOrder: 2, isVisible: true, isCustom: false },
    { name: 'Draft2Digital', type: 'revenue', legacyColumn: 'd2d_rev', sortOrder: 3, isVisible: true, isCustom: false },
    { name: 'Google Play', type: 'revenue', legacyColumn: 'google_rev', sortOrder: 4, isVisible: true, isCustom: false },
    { name: 'Kobo', type: 'revenue', legacyColumn: 'kobo_rev', sortOrder: 5, isVisible: true, isCustom: false },
    { name: 'Kobo Plus', type: 'revenue', legacyColumn: 'kobo_plus_rev', sortOrder: 6, isVisible: true, isCustom: false },
    { name: 'Publish Drive', type: 'revenue', legacyColumn: null, sortOrder: 7, isVisible: true, isCustom: true },
    { name: 'Streetlib', type: 'revenue', legacyColumn: null, sortOrder: 8, isVisible: true, isCustom: true },
  ];
}

// Read a category's value off a record. Uses the legacy column for built-ins
// or the custom_amounts JSONB for user-added categories.
export function getCategoryValue(
  category: Pick<ProfitCategory, 'id' | 'legacyColumn'>,
  record: {
    pnrAds?: number;
    contempAds?: number;
    trafficAds?: number;
    miscAds?: number;
    shopifyRev?: number;
    amazonRev?: number;
    d2dRev?: number;
    googleRev?: number;
    koboRev?: number;
    koboPlusRev?: number;
    customAmounts?: Record<string, number>;
  },
): number {
  switch (category.legacyColumn) {
    case 'pnr_ads': return record.pnrAds || 0;
    case 'contemp_ads': return record.contempAds || 0;
    case 'traffic_ads': return record.trafficAds || 0;
    case 'misc_ads': return record.miscAds || 0;
    case 'shopify_rev': return record.shopifyRev || 0;
    case 'amazon_rev': return record.amazonRev || 0;
    case 'd2d_rev': return record.d2dRev || 0;
    case 'google_rev': return record.googleRev || 0;
    case 'kobo_rev': return record.koboRev || 0;
    case 'kobo_plus_rev': return record.koboPlusRev || 0;
    default:
      return (record.customAmounts || {})[category.id] || 0;
  }
}

// Return a modified record with the value for `category` set to `value`.
// Preserves all other fields. Used by DataEntry.
export function setCategoryValue<
  T extends {
    pnrAds?: number;
    contempAds?: number;
    trafficAds?: number;
    miscAds?: number;
    shopifyRev?: number;
    amazonRev?: number;
    d2dRev?: number;
    googleRev?: number;
    koboRev?: number;
    koboPlusRev?: number;
    customAmounts?: Record<string, number>;
  },
>(record: T, category: Pick<ProfitCategory, 'id' | 'legacyColumn'>, value: number): T {
  switch (category.legacyColumn) {
    case 'pnr_ads': return { ...record, pnrAds: value };
    case 'contemp_ads': return { ...record, contempAds: value };
    case 'traffic_ads': return { ...record, trafficAds: value };
    case 'misc_ads': return { ...record, miscAds: value };
    case 'shopify_rev': return { ...record, shopifyRev: value };
    case 'amazon_rev': return { ...record, amazonRev: value };
    case 'd2d_rev': return { ...record, d2dRev: value };
    case 'google_rev': return { ...record, googleRev: value };
    case 'kobo_rev': return { ...record, koboRev: value };
    case 'kobo_plus_rev': return { ...record, koboPlusRev: value };
    default: {
      const custom = { ...(record.customAmounts || {}) };
      if (value) custom[category.id] = value;
      else delete custom[category.id];
      return { ...record, customAmounts: custom };
    }
  }
}
