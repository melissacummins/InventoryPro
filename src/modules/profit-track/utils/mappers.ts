import type {
  DailyRecord,
  WeeklyNote,
  OrderSource,
  MonthlyOrderEntry,
  MonthlyPageReads,
  BookProduct,
  BookDailyMetric,
} from '../types';

// ---------- DailyRecord ----------
export function dailyRecordFromDb(row: any): DailyRecord {
  return {
    id: row.id,
    date: row.date,
    pnrAds: Number(row.pnr_ads) || 0,
    contempAds: Number(row.contemp_ads) || 0,
    trafficAds: Number(row.traffic_ads) || 0,
    miscAds: Number(row.misc_ads) || 0,
    shopifyRev: Number(row.shopify_rev) || 0,
    amazonRev: Number(row.amazon_rev) || 0,
    d2dRev: Number(row.d2d_rev) || 0,
    googleRev: Number(row.google_rev) || 0,
    koboRev: Number(row.kobo_rev) || 0,
    koboPlusRev: Number(row.kobo_plus_rev) || 0,
  };
}

export function dailyRecordToDb(r: DailyRecord, userId: string) {
  return {
    id: r.id,
    user_id: userId,
    date: r.date,
    pnr_ads: r.pnrAds || 0,
    contemp_ads: r.contempAds || 0,
    traffic_ads: r.trafficAds || 0,
    misc_ads: r.miscAds || 0,
    shopify_rev: r.shopifyRev || 0,
    amazon_rev: r.amazonRev || 0,
    d2d_rev: r.d2dRev || 0,
    google_rev: r.googleRev || 0,
    kobo_rev: r.koboRev || 0,
    kobo_plus_rev: r.koboPlusRev || 0,
  };
}

// ---------- WeeklyNote ----------
export function weeklyNoteFromDb(row: any): WeeklyNote {
  return {
    id: row.id,
    weekStartDate: row.week_start_date,
    content: row.content || '',
  };
}

export function weeklyNoteToDb(n: WeeklyNote, userId: string) {
  return {
    ...(n.id ? { id: n.id } : {}),
    user_id: userId,
    week_start_date: n.weekStartDate,
    content: n.content,
  };
}

// ---------- OrderSource ----------
export function orderSourceFromDb(row: any): OrderSource {
  return {
    id: row.id,
    name: row.name,
    multiplier: Number(row.multiplier) || 1,
    isSystem: !!row.is_system,
    isArchived: !!row.is_archived,
  };
}

export function orderSourceToDb(s: OrderSource, userId: string) {
  return {
    id: s.id,
    user_id: userId,
    name: s.name,
    multiplier: s.multiplier,
    is_system: !!s.isSystem,
    is_archived: !!s.isArchived,
  };
}

// ---------- MonthlyOrderEntry ----------
export function monthlyOrderFromDb(row: any): MonthlyOrderEntry {
  return {
    id: row.id,
    monthKey: row.month_key,
    sourceId: row.source_id,
    count: Number(row.count) || 0,
    snapshotMultiplier:
      row.snapshot_multiplier === null || row.snapshot_multiplier === undefined
        ? undefined
        : Number(row.snapshot_multiplier),
  };
}

export function monthlyOrderToDb(e: MonthlyOrderEntry, userId: string) {
  return {
    ...(e.id ? { id: e.id } : {}),
    user_id: userId,
    month_key: e.monthKey,
    source_id: e.sourceId,
    count: e.count,
    snapshot_multiplier:
      e.snapshotMultiplier === undefined ? null : e.snapshotMultiplier,
  };
}

// ---------- MonthlyPageReads ----------
export function pageReadsFromDb(row: any): MonthlyPageReads {
  return {
    id: row.id,
    monthKey: row.month_key,
    reads: Number(row.reads) || 0,
  };
}

export function pageReadsToDb(r: MonthlyPageReads, userId: string) {
  return {
    ...(r.id ? { id: r.id } : {}),
    user_id: userId,
    month_key: r.monthKey,
    reads: r.reads,
  };
}

// ---------- BookProduct ----------
export function bookProductFromDb(row: any): BookProduct {
  return {
    id: row.id,
    title: row.title,
    series: row.series || '',
    isBundle: !!row.is_bundle,
    includedBookIds: Array.isArray(row.included_book_ids)
      ? row.included_book_ids
      : [],
    language: row.language || 'English',
    parentId: row.parent_id || undefined,
  };
}

export function bookProductToDb(b: BookProduct, userId: string) {
  return {
    id: b.id,
    user_id: userId,
    title: b.title,
    series: b.series || '',
    is_bundle: !!b.isBundle,
    included_book_ids: b.includedBookIds || [],
    language: b.language || 'English',
    parent_id: b.parentId || null,
  };
}

// ---------- BookDailyMetric ----------
export function bookMetricFromDb(row: any): BookDailyMetric {
  return {
    id: row.id,
    date: row.date,
    bookId: row.book_id,
    pnrAds: Number(row.pnr_ads) || 0,
    contempAds: Number(row.contemp_ads) || 0,
    trafficAds: Number(row.traffic_ads) || 0,
    miscAds: Number(row.misc_ads) || 0,
    shopifyRev: Number(row.shopify_rev) || 0,
    amazonRev: Number(row.amazon_rev) || 0,
    d2dRev: Number(row.d2d_rev) || 0,
    googleRev: Number(row.google_rev) || 0,
    koboRev: Number(row.kobo_rev) || 0,
    koboPlusRev: Number(row.kobo_plus_rev) || 0,
  };
}

export function bookMetricToDb(m: BookDailyMetric, userId: string) {
  return {
    id: m.id,
    user_id: userId,
    date: m.date,
    book_id: m.bookId,
    pnr_ads: m.pnrAds || 0,
    contemp_ads: m.contempAds || 0,
    traffic_ads: m.trafficAds || 0,
    misc_ads: m.miscAds || 0,
    shopify_rev: m.shopifyRev || 0,
    amazon_rev: m.amazonRev || 0,
    d2d_rev: m.d2dRev || 0,
    google_rev: m.googleRev || 0,
    kobo_rev: m.koboRev || 0,
    kobo_plus_rev: m.koboPlusRev || 0,
  };
}
