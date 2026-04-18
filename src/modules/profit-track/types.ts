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
