// Local camelCase types for the Profit module UI.
// These mirror the original Profit-Track app's types and are converted to/from
// the snake_case Supabase rows in utils/mappers.ts.

export interface DailyRecord {
  id: string;
  date: string; // YYYY-MM-DD
  pnrAds: number;
  contempAds: number;
  trafficAds: number;
  miscAds: number;
  shopifyRev: number;
  amazonRev: number;
  d2dRev: number;
  googleRev: number;
  koboRev: number;
  koboPlusRev: number;
  customAmounts?: Record<string, number>;
}

// Categories are user-editable. Built-in ones map to a legacy column on
// daily_records (so historical data keeps flowing); custom ones store
// amounts in daily_records.custom_amounts keyed by category id.
export type CategoryType = 'ad' | 'revenue';

export type LegacyDailyColumn =
  | 'pnr_ads'
  | 'contemp_ads'
  | 'traffic_ads'
  | 'misc_ads'
  | 'shopify_rev'
  | 'amazon_rev'
  | 'd2d_rev'
  | 'google_rev'
  | 'kobo_rev'
  | 'kobo_plus_rev';

export interface ProfitCategory {
  id: string;
  name: string;
  type: CategoryType;
  legacyColumn: LegacyDailyColumn | null; // null for custom
  sortOrder: number;
  isVisible: boolean;
  isCustom: boolean;
}

export type ProfitTabId =
  | 'dashboard'
  | 'weekly'
  | 'books'
  | 'reports'
  | 'orders'
  | 'entry'
  | 'data'
  | 'settings';

export interface UserUIPreferences {
  hiddenProfitTabs: ProfitTabId[];
}

export interface CalculatedMetrics {
  totalAdSpend: number;
  totalRevenue: number;
  netRevenue: number;
  roas: number;
  adsToIncomePercent: number;
}

export interface WeeklyNote {
  id?: string;
  weekStartDate: string; // Monday YYYY-MM-DD (natural key)
  content: string;
}

export interface OrderSource {
  id: string;
  name: string;
  multiplier: number;
  isSystem?: boolean;
  isArchived?: boolean;
}

export interface MonthlyOrderEntry {
  id?: string;
  monthKey: string; // YYYY-MM
  sourceId: string;
  count: number;
  snapshotMultiplier?: number;
}

export interface MonthlyPageReads {
  id?: string;
  monthKey: string;
  reads: number;
}

export interface BookProduct {
  id: string;
  title: string;
  series: string;
  isBundle: boolean;
  includedBookIds: string[];
  language?: string;
  parentId?: string;
}

export interface BookDailyMetric {
  id: string;
  date: string;
  bookId: string;
  pnrAds: number;
  contempAds: number;
  trafficAds: number;
  miscAds: number;
  shopifyRev: number;
  amazonRev: number;
  d2dRev: number;
  googleRev: number;
  koboRev: number;
  koboPlusRev: number;
  customAmounts?: Record<string, number>;
  // Legacy fields retained for backward compatibility with old backups
  adSpend?: number;
  otherRev?: number;
}

export interface AppDataBackup {
  dailyRecords: DailyRecord[];
  weeklyNotes: WeeklyNote[];
  orderSources: OrderSource[];
  monthlyOrders: MonthlyOrderEntry[];
  monthlyPageReads: MonthlyPageReads[];
  books: BookProduct[];
  bookMetrics: BookDailyMetric[];
  version: number;
}

export type ViewMode =
  | 'dashboard'
  | 'weekly'
  | 'reports'
  | 'entry'
  | 'orders'
  | 'settings'
  | 'data'
  | 'books';
