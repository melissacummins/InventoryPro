// Merge-style importer for the original Firebase-era Profit-Track JSON backup.
// NEVER deletes. Only adds rows that are missing from the current Supabase
// data — de-duped by natural key (date, week_start_date, month_key+source, etc.).
// Remaps old source/book ids to new UUIDs where needed so FKs hold.

import { supabase } from '../../../lib/supabase';
import type { AppDataBackup } from '../types';

function isUuid(s: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s);
}

function ensureUuid(s: string | undefined): string {
  return s && isUuid(s) ? s : crypto.randomUUID();
}

export interface ImportPlan {
  orderSources: { toInsert: number; skipped: number };
  monthlyOrders: { toInsert: number; skipped: number };
  monthlyPageReads: { toInsert: number; skipped: number };
  dailyRecords: { toInsert: number; skipped: number };
  weeklyNotes: { toInsert: number; skipped: number };
  bookProducts: { toInsert: number; skipped: number };
  bookMetrics: { toInsert: number; skipped: number };
}

export interface ImportProgress {
  table: string;
  inserted: number;
}

/**
 * Dry run: compute what WOULD be inserted without touching Supabase. Builds
 * the same id-remap structures that execute uses, so the numbers match.
 */
export async function planImport(backup: AppDataBackup): Promise<ImportPlan> {
  const state = await loadCurrentState();
  const staged = stageBackup(backup, state);
  return {
    orderSources: { toInsert: staged.sourcesToInsert.length, skipped: staged.sourcesSkipped },
    monthlyOrders: { toInsert: staged.ordersToInsert.length, skipped: staged.ordersSkipped },
    monthlyPageReads: { toInsert: staged.readsToInsert.length, skipped: staged.readsSkipped },
    dailyRecords: { toInsert: staged.dailyToInsert.length, skipped: staged.dailySkipped },
    weeklyNotes: { toInsert: staged.notesToInsert.length, skipped: staged.notesSkipped },
    bookProducts: { toInsert: staged.booksToInsert.length, skipped: staged.booksSkipped },
    bookMetrics: { toInsert: staged.metricsToInsert.length, skipped: staged.metricsSkipped },
  };
}

export async function executeImport(
  backup: AppDataBackup,
  onProgress?: (p: ImportProgress) => void,
): Promise<ImportPlan> {
  const state = await loadCurrentState();
  const staged = stageBackup(backup, state);

  // Order matters: parents (sources, books) before children (orders, metrics).
  await insertChunked('order_sources', staged.sourcesToInsert, onProgress);
  await insertChunked('book_products', staged.booksToInsert, onProgress);
  await insertChunked('monthly_orders', staged.ordersToInsert, onProgress);
  await insertChunked('monthly_page_reads', staged.readsToInsert, onProgress);
  await insertChunked('daily_records', staged.dailyToInsert, onProgress);
  await insertChunked('weekly_notes', staged.notesToInsert, onProgress);
  await insertChunked('book_daily_metrics', staged.metricsToInsert, onProgress);

  return {
    orderSources: { toInsert: staged.sourcesToInsert.length, skipped: staged.sourcesSkipped },
    monthlyOrders: { toInsert: staged.ordersToInsert.length, skipped: staged.ordersSkipped },
    monthlyPageReads: { toInsert: staged.readsToInsert.length, skipped: staged.readsSkipped },
    dailyRecords: { toInsert: staged.dailyToInsert.length, skipped: staged.dailySkipped },
    weeklyNotes: { toInsert: staged.notesToInsert.length, skipped: staged.notesSkipped },
    bookProducts: { toInsert: staged.booksToInsert.length, skipped: staged.booksSkipped },
    bookMetrics: { toInsert: staged.metricsToInsert.length, skipped: staged.metricsSkipped },
  };
}

async function insertChunked(
  table: string,
  rows: any[],
  onProgress?: (p: ImportProgress) => void,
) {
  if (rows.length === 0) return;
  const CHUNK = 500;
  let written = 0;
  for (let i = 0; i < rows.length; i += CHUNK) {
    const slice = rows.slice(i, i + CHUNK);
    const { error } = await supabase.from(table).insert(slice);
    if (error) {
      throw new Error(
        `Import failed at ${table} (${written}/${rows.length} written): ${error.message}`,
      );
    }
    written += slice.length;
    onProgress?.({ table, inserted: written });
  }
}

interface CurrentState {
  userId: string;
  sourceNameToId: Map<string, string>;
  bookTitleLangToId: Map<string, string>;
  existingMonthSourcePairs: Set<string>;
  existingPageReadMonths: Set<string>;
  existingDailyDates: Set<string>;
  existingWeekStarts: Set<string>;
  existingBookTitleLangs: Set<string>;
  existingBookMetricKeys: Set<string>;
}

async function loadCurrentState(): Promise<CurrentState> {
  const { data: userData } = await supabase.auth.getUser();
  const user = userData?.user;
  if (!user) throw new Error('Not signed in');

  const [
    sources,
    books,
    monthlyOrders,
    pageReads,
    daily,
    notes,
    metrics,
  ] = await Promise.all([
    fetchAll('order_sources'),
    fetchAll('book_products'),
    fetchAll('monthly_orders'),
    fetchAll('monthly_page_reads'),
    fetchAll('daily_records'),
    fetchAll('weekly_notes'),
    fetchAll('book_daily_metrics'),
  ]);

  const sourceNameToId = new Map<string, string>();
  for (const s of sources) sourceNameToId.set(s.name, s.id);

  const bookTitleLangToId = new Map<string, string>();
  for (const b of books)
    bookTitleLangToId.set(`${b.title}||${b.language || 'English'}`, b.id);

  const existingMonthSourcePairs = new Set<string>();
  for (const o of monthlyOrders)
    existingMonthSourcePairs.add(`${o.month_key}:${o.source_id}`);

  const existingPageReadMonths = new Set<string>();
  for (const p of pageReads) existingPageReadMonths.add(p.month_key);

  const existingDailyDates = new Set<string>();
  for (const d of daily) existingDailyDates.add(d.date);

  const existingWeekStarts = new Set<string>();
  for (const n of notes) existingWeekStarts.add(n.week_start_date);

  const existingBookTitleLangs = new Set<string>();
  for (const b of books)
    existingBookTitleLangs.add(`${b.title}||${b.language || 'English'}`);

  const existingBookMetricKeys = new Set<string>();
  for (const m of metrics)
    existingBookMetricKeys.add(`${m.date}:${m.book_id}`);

  return {
    userId: user.id,
    sourceNameToId,
    bookTitleLangToId,
    existingMonthSourcePairs,
    existingPageReadMonths,
    existingDailyDates,
    existingWeekStarts,
    existingBookTitleLangs,
    existingBookMetricKeys,
  };
}

async function fetchAll(table: string): Promise<any[]> {
  const all: any[] = [];
  let from = 0;
  for (;;) {
    const { data, error } = await supabase
      .from(table)
      .select('*')
      .range(from, from + 999);
    if (error) return all;
    if (!data || data.length === 0) break;
    all.push(...data);
    if (data.length < 1000) break;
    from += 1000;
  }
  return all;
}

interface Staged {
  sourcesToInsert: any[];
  sourcesSkipped: number;
  booksToInsert: any[];
  booksSkipped: number;
  ordersToInsert: any[];
  ordersSkipped: number;
  readsToInsert: any[];
  readsSkipped: number;
  dailyToInsert: any[];
  dailySkipped: number;
  notesToInsert: any[];
  notesSkipped: number;
  metricsToInsert: any[];
  metricsSkipped: number;
}

function stageBackup(backup: AppDataBackup, state: CurrentState): Staged {
  const userId = state.userId;

  // --- Order sources: insert any whose name isn't already in current DB.
  // Build a map from the OLD id (e.g. "src_shopify_dr_digi") to the id we'll
  // use going forward (existing id if name matches, else a new UUID).
  const oldToNewSourceId = new Map<string, string>();
  const sourcesToInsert: any[] = [];
  let sourcesSkipped = 0;
  for (const src of backup.orderSources || []) {
    const existingId = state.sourceNameToId.get(src.name);
    if (existingId) {
      oldToNewSourceId.set(src.id, existingId);
      sourcesSkipped++;
    } else {
      const newId = ensureUuid(src.id);
      oldToNewSourceId.set(src.id, newId);
      state.sourceNameToId.set(src.name, newId);
      sourcesToInsert.push({
        id: newId,
        user_id: userId,
        name: src.name,
        multiplier: src.multiplier ?? 1,
        is_system: !!src.isSystem,
        is_archived: !!src.isArchived,
      });
    }
  }

  // --- Books: insert any whose title+language isn't already in current DB.
  const oldToNewBookId = new Map<string, string>();
  const booksToInsert: any[] = [];
  let booksSkipped = 0;
  // Two passes: first pass books establishes IDs so bundles/translations can
  // reference them in pass two.
  const inputBooks = backup.books || [];
  for (const b of inputBooks) {
    const key = `${b.title}||${b.language || 'English'}`;
    const existingId = state.bookTitleLangToId.get(key);
    if (existingId) {
      oldToNewBookId.set(b.id, existingId);
      booksSkipped++;
    } else {
      const newId = ensureUuid(b.id);
      oldToNewBookId.set(b.id, newId);
      state.bookTitleLangToId.set(key, newId);
    }
  }
  for (const b of inputBooks) {
    const key = `${b.title}||${b.language || 'English'}`;
    if (state.existingBookTitleLangs.has(key)) continue;
    const newId = oldToNewBookId.get(b.id)!;
    booksToInsert.push({
      id: newId,
      user_id: userId,
      title: b.title,
      series: b.series || '',
      is_bundle: !!b.isBundle,
      included_book_ids: (b.includedBookIds || []).map(
        (oldId: string) => oldToNewBookId.get(oldId) || oldId,
      ),
      language: b.language || 'English',
      parent_id: b.parentId ? oldToNewBookId.get(b.parentId) || null : null,
    });
    state.existingBookTitleLangs.add(key);
  }

  // --- Monthly orders: skip rows where (month_key, mapped source_id) already exists.
  const ordersToInsert: any[] = [];
  let ordersSkipped = 0;
  for (const o of backup.monthlyOrders || []) {
    const newSourceId = oldToNewSourceId.get(o.sourceId) || o.sourceId;
    const key = `${o.monthKey}:${newSourceId}`;
    if (state.existingMonthSourcePairs.has(key)) {
      ordersSkipped++;
      continue;
    }
    ordersToInsert.push({
      id: crypto.randomUUID(),
      user_id: userId,
      month_key: o.monthKey,
      source_id: newSourceId,
      count: o.count,
      snapshot_multiplier:
        o.snapshotMultiplier === undefined ? null : o.snapshotMultiplier,
    });
    state.existingMonthSourcePairs.add(key);
  }

  // --- Page reads: skip rows whose month_key exists.
  const readsToInsert: any[] = [];
  let readsSkipped = 0;
  for (const p of backup.monthlyPageReads || []) {
    if (state.existingPageReadMonths.has(p.monthKey)) {
      readsSkipped++;
      continue;
    }
    readsToInsert.push({
      id: crypto.randomUUID(),
      user_id: userId,
      month_key: p.monthKey,
      reads: p.reads,
    });
    state.existingPageReadMonths.add(p.monthKey);
  }

  // --- Daily records: skip rows whose date exists.
  const dailyToInsert: any[] = [];
  let dailySkipped = 0;
  for (const d of backup.dailyRecords || []) {
    if (state.existingDailyDates.has(d.date)) {
      dailySkipped++;
      continue;
    }
    dailyToInsert.push({
      id: ensureUuid(d.id),
      user_id: userId,
      date: d.date,
      pnr_ads: d.pnrAds || 0,
      contemp_ads: d.contempAds || 0,
      traffic_ads: d.trafficAds || 0,
      misc_ads: d.miscAds || 0,
      shopify_rev: d.shopifyRev || 0,
      amazon_rev: d.amazonRev || 0,
      d2d_rev: d.d2dRev || 0,
      google_rev: d.googleRev || 0,
      kobo_rev: d.koboRev || 0,
      kobo_plus_rev: d.koboPlusRev || 0,
    });
    state.existingDailyDates.add(d.date);
  }

  // --- Weekly notes: skip rows whose week_start_date exists.
  const notesToInsert: any[] = [];
  let notesSkipped = 0;
  for (const n of backup.weeklyNotes || []) {
    if (state.existingWeekStarts.has(n.weekStartDate)) {
      notesSkipped++;
      continue;
    }
    notesToInsert.push({
      id: crypto.randomUUID(),
      user_id: userId,
      week_start_date: n.weekStartDate,
      content: n.content || '',
    });
    state.existingWeekStarts.add(n.weekStartDate);
  }

  // --- Book daily metrics: skip rows whose (date, book_id) exists.
  const metricsToInsert: any[] = [];
  let metricsSkipped = 0;
  for (const m of backup.bookMetrics || []) {
    const newBookId = oldToNewBookId.get(m.bookId) || m.bookId;
    const key = `${m.date}:${newBookId}`;
    if (state.existingBookMetricKeys.has(key)) {
      metricsSkipped++;
      continue;
    }
    // Tolerate legacy Firebase fields by falling back to 0.
    metricsToInsert.push({
      id: ensureUuid(m.id),
      user_id: userId,
      date: m.date,
      book_id: newBookId,
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
    });
    state.existingBookMetricKeys.add(key);
  }

  return {
    sourcesToInsert,
    sourcesSkipped,
    booksToInsert,
    booksSkipped,
    ordersToInsert,
    ordersSkipped,
    readsToInsert,
    readsSkipped,
    dailyToInsert,
    dailySkipped,
    notesToInsert,
    notesSkipped,
    metricsToInsert,
    metricsSkipped,
  };
}
