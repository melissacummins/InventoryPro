// Logic tests for the Firebase-backup importer, focused on the key
// correctness properties:
//
//  1) NEVER delete or update existing rows
//  2) Skip by natural key (date / month_key+source / week_start / title+lang)
//  3) Remap old source/book ids to existing ones when names/titles match
//  4) Bundles whose includedBookIds reference other imported books get remapped
//
// Run with:   npx tsx src/modules/profit-track/utils/firebaseImport.test.ts
//
// These tests exercise stageBackup() in isolation — the function that decides
// what to insert. We don't talk to Supabase; we construct CurrentState by hand.
//
// stageBackup isn't exported, so we inline it here for testing. Keep this
// mirror of firebaseImport.ts in sync when edits change the algorithm.

import type { AppDataBackup } from '../types';

function isUuid(s: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s);
}
function ensureUuid(s?: string) {
  return s && isUuid(s) ? s : crypto.randomUUID();
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

function emptyState(userId = 'user-A'): CurrentState {
  return {
    userId,
    sourceNameToId: new Map(),
    bookTitleLangToId: new Map(),
    existingMonthSourcePairs: new Set(),
    existingPageReadMonths: new Set(),
    existingDailyDates: new Set(),
    existingWeekStarts: new Set(),
    existingBookTitleLangs: new Set(),
    existingBookMetricKeys: new Set(),
  };
}

function stageBackup(backup: AppDataBackup, state: CurrentState): any {
  const userId = state.userId;

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

  const oldToNewBookId = new Map<string, string>();
  const booksToInsert: any[] = [];
  let booksSkipped = 0;
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

  for (const b of inputBooks) {
    if (!b.isBundle) continue;
    if (state.sourceNameToId.has(b.title)) continue;
    const newId = crypto.randomUUID();
    state.sourceNameToId.set(b.title, newId);
    sourcesToInsert.push({
      id: newId,
      user_id: userId,
      name: b.title,
      multiplier: (b.includedBookIds || []).length || 1,
      is_system: false,
      is_archived: false,
    });
  }

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
      snapshot_multiplier: o.snapshotMultiplier ?? null,
    });
    state.existingMonthSourcePairs.add(key);
  }

  const readsToInsert: any[] = [];
  let readsSkipped = 0;
  for (const p of backup.monthlyPageReads || []) {
    if (state.existingPageReadMonths.has(p.monthKey)) {
      readsSkipped++;
      continue;
    }
    readsToInsert.push({ id: crypto.randomUUID(), user_id: userId, month_key: p.monthKey, reads: p.reads });
    state.existingPageReadMonths.add(p.monthKey);
  }

  const dailyToInsert: any[] = [];
  let dailySkipped = 0;
  for (const d of backup.dailyRecords || []) {
    if (state.existingDailyDates.has(d.date)) { dailySkipped++; continue; }
    dailyToInsert.push({ id: ensureUuid(d.id), user_id: userId, date: d.date });
    state.existingDailyDates.add(d.date);
  }

  const notesToInsert: any[] = [];
  let notesSkipped = 0;
  for (const n of backup.weeklyNotes || []) {
    if (state.existingWeekStarts.has(n.weekStartDate)) { notesSkipped++; continue; }
    notesToInsert.push({ id: crypto.randomUUID(), user_id: userId, week_start_date: n.weekStartDate });
    state.existingWeekStarts.add(n.weekStartDate);
  }

  const metricsToInsert: any[] = [];
  let metricsSkipped = 0;
  for (const m of backup.bookMetrics || []) {
    const newBookId = oldToNewBookId.get(m.bookId) || m.bookId;
    const key = `${m.date}:${newBookId}`;
    if (state.existingBookMetricKeys.has(key)) { metricsSkipped++; continue; }
    metricsToInsert.push({ id: ensureUuid(m.id), user_id: userId, date: m.date, book_id: newBookId });
    state.existingBookMetricKeys.add(key);
  }

  return { sourcesToInsert, sourcesSkipped, booksToInsert, booksSkipped, ordersToInsert, ordersSkipped, readsToInsert, readsSkipped, dailyToInsert, dailySkipped, notesToInsert, notesSkipped, metricsToInsert, metricsSkipped };
}

function assert(cond: any, msg: string) {
  if (!cond) throw new Error(`ASSERT FAILED: ${msg}`);
  console.log(`  ok: ${msg}`);
}

// ---------- Tests ----------

console.log('Test 1: import into empty DB — everything inserted, nothing skipped');
{
  const backup: AppDataBackup = {
    version: 2,
    orderSources: [
      { id: 'src_amazon', name: 'Amazon', multiplier: 1 },
      { id: 'src_bundle', name: 'Dark Romance Bundle', multiplier: 5 },
    ],
    monthlyOrders: [
      { monthKey: '2024-01', sourceId: 'src_amazon', count: 100 },
      { monthKey: '2024-01', sourceId: 'src_bundle', count: 5 },
    ],
    monthlyPageReads: [{ monthKey: '2024-01', reads: 12345 }],
    dailyRecords: [
      { id: 'd1', date: '2024-01-01', pnrAds: 5, contempAds: 0, trafficAds: 0, miscAds: 0, shopifyRev: 0, amazonRev: 100, d2dRev: 0, googleRev: 0, koboRev: 0, koboPlusRev: 0 },
    ],
    weeklyNotes: [{ weekStartDate: '2024-01-01', content: 'first week' }],
    books: [{ id: 'b1', title: 'Book One', series: 'S', isBundle: false, includedBookIds: [], language: 'English' }],
    bookMetrics: [
      { id: 'bm1', date: '2024-01-01', bookId: 'b1', pnrAds: 0, contempAds: 0, trafficAds: 0, miscAds: 0, shopifyRev: 0, amazonRev: 10, d2dRev: 0, googleRev: 0, koboRev: 0, koboPlusRev: 0 },
    ],
  };
  const staged = stageBackup(backup, emptyState());
  assert(staged.sourcesToInsert.length === 2, 'inserts both sources');
  assert(staged.ordersToInsert.length === 2, 'inserts both monthly orders');
  assert(staged.readsToInsert.length === 1, 'inserts page reads');
  assert(staged.dailyToInsert.length === 1, 'inserts daily records');
  assert(staged.notesToInsert.length === 1, 'inserts weekly notes');
  assert(staged.booksToInsert.length === 1, 'inserts books');
  assert(staged.metricsToInsert.length === 1, 'inserts book metrics');
}

console.log('\nTest 2: source with matching name in current DB is reused, not duplicated');
{
  const state = emptyState();
  state.sourceNameToId.set('Amazon', 'existing-amazon-uuid');
  const backup: AppDataBackup = {
    version: 2,
    orderSources: [
      { id: 'src_amazon', name: 'Amazon', multiplier: 1 }, // already exists by name
      { id: 'src_bundle', name: 'Dark Romance Bundle', multiplier: 5 }, // new
    ],
    monthlyOrders: [
      { monthKey: '2024-01', sourceId: 'src_amazon', count: 100 }, // should route to existing Amazon id
      { monthKey: '2024-01', sourceId: 'src_bundle', count: 5 },
    ],
    monthlyPageReads: [],
    dailyRecords: [],
    weeklyNotes: [],
    books: [],
    bookMetrics: [],
  };
  const staged = stageBackup(backup, state);
  assert(staged.sourcesSkipped === 1, 'one source (Amazon) skipped');
  assert(staged.sourcesToInsert.length === 1, 'one source (Bundle) inserted');
  const amazonOrder = staged.ordersToInsert.find((o: any) => o.source_id === 'existing-amazon-uuid');
  assert(amazonOrder && amazonOrder.count === 100, 'Amazon monthly order rewires to existing uuid');
}

console.log('\nTest 3: daily records with matching dates are skipped; new dates added');
{
  const state = emptyState();
  state.existingDailyDates.add('2024-01-01');
  state.existingDailyDates.add('2024-01-02');
  const backup: AppDataBackup = {
    version: 2,
    orderSources: [],
    monthlyOrders: [],
    monthlyPageReads: [],
    dailyRecords: [
      { id: 'd1', date: '2024-01-01' } as any, // already there
      { id: 'd2', date: '2024-01-02' } as any, // already there
      { id: 'd3', date: '2023-12-31' } as any, // new
    ],
    weeklyNotes: [],
    books: [],
    bookMetrics: [],
  };
  const staged = stageBackup(backup, state);
  assert(staged.dailySkipped === 2, '2 existing dates skipped');
  assert(staged.dailyToInsert.length === 1, 'only 1 new date inserted');
  assert(staged.dailyToInsert[0].date === '2023-12-31', 'correct date inserted');
}

console.log('\nTest 4: monthly_orders dedupe uses (month_key, mapped source_id)');
{
  const state = emptyState();
  state.sourceNameToId.set('Amazon', 'amazon-uuid');
  state.existingMonthSourcePairs.add('2024-01:amazon-uuid'); // already have Jan Amazon order
  const backup: AppDataBackup = {
    version: 2,
    orderSources: [{ id: 'src_amazon', name: 'Amazon', multiplier: 1 }],
    monthlyOrders: [
      { monthKey: '2024-01', sourceId: 'src_amazon', count: 999 }, // already exists, skip
      { monthKey: '2024-02', sourceId: 'src_amazon', count: 50 }, // new month, add
    ],
    monthlyPageReads: [],
    dailyRecords: [],
    weeklyNotes: [],
    books: [],
    bookMetrics: [],
  };
  const staged = stageBackup(backup, state);
  assert(staged.ordersSkipped === 1, 'Jan Amazon skipped');
  assert(staged.ordersToInsert.length === 1, 'Feb Amazon added');
}

console.log('\nTest 5: bundle includedBookIds get remapped to new book UUIDs');
{
  const state = emptyState();
  const backup: AppDataBackup = {
    version: 2,
    orderSources: [],
    monthlyOrders: [],
    monthlyPageReads: [],
    dailyRecords: [],
    weeklyNotes: [],
    books: [
      { id: 'book-a', title: 'A', series: '', isBundle: false, includedBookIds: [], language: 'English' },
      { id: 'book-b', title: 'B', series: '', isBundle: false, includedBookIds: [], language: 'English' },
      { id: 'bundle-x', title: 'Bundle X', series: '', isBundle: true, includedBookIds: ['book-a', 'book-b'], language: 'English' },
    ],
    bookMetrics: [],
  };
  const staged = stageBackup(backup, state);
  assert(staged.booksToInsert.length === 3, '3 books inserted');
  const bundle = staged.booksToInsert.find((b: any) => b.is_bundle);
  const bookA = staged.booksToInsert.find((b: any) => b.title === 'A');
  const bookB = staged.booksToInsert.find((b: any) => b.title === 'B');
  assert(
    bundle.included_book_ids.includes(bookA.id) && bundle.included_book_ids.includes(bookB.id),
    "bundle's includedBookIds remapped to new book UUIDs",
  );
}

console.log('\nTest 6: translation parent_id gets remapped');
{
  const state = emptyState();
  const backup: AppDataBackup = {
    version: 2,
    orderSources: [],
    monthlyOrders: [],
    monthlyPageReads: [],
    dailyRecords: [],
    weeklyNotes: [],
    books: [
      { id: 'orig-1', title: 'Original', series: '', isBundle: false, includedBookIds: [], language: 'English' },
      { id: 'de-1', title: 'Original (German)', series: '', isBundle: false, includedBookIds: [], language: 'German', parentId: 'orig-1' },
    ],
    bookMetrics: [],
  };
  const staged = stageBackup(backup, state);
  const orig = staged.booksToInsert.find((b: any) => b.language === 'English');
  const de = staged.booksToInsert.find((b: any) => b.language === 'German');
  assert(de.parent_id === orig.id, 'German translation parent_id points to new English UUID');
}

console.log('\nTest 7: book metric book_id is remapped even when book row is skipped (already present)');
{
  const state = emptyState();
  state.bookTitleLangToId.set('Book One||English', 'existing-book-uuid');
  state.existingBookTitleLangs.add('Book One||English');
  const backup: AppDataBackup = {
    version: 2,
    orderSources: [],
    monthlyOrders: [],
    monthlyPageReads: [],
    dailyRecords: [],
    weeklyNotes: [],
    books: [
      { id: 'b-old', title: 'Book One', series: '', isBundle: false, includedBookIds: [], language: 'English' },
    ],
    bookMetrics: [
      { id: 'bm1', date: '2024-02-01', bookId: 'b-old' } as any,
    ],
  };
  const staged = stageBackup(backup, state);
  assert(staged.booksSkipped === 1, 'book skipped');
  assert(staged.metricsToInsert.length === 1, 'metric added');
  assert(
    staged.metricsToInsert[0].book_id === 'existing-book-uuid',
    "metric book_id remapped to existing book's UUID",
  );
}

console.log('\nTest 8: re-importing the same backup twice is a no-op on second run');
{
  const state = emptyState();
  const backup: AppDataBackup = {
    version: 2,
    orderSources: [{ id: 'src_amazon', name: 'Amazon', multiplier: 1 }],
    monthlyOrders: [{ monthKey: '2024-01', sourceId: 'src_amazon', count: 100 }],
    monthlyPageReads: [{ monthKey: '2024-01', reads: 500 }],
    dailyRecords: [{ id: 'd1', date: '2024-01-01' } as any],
    weeklyNotes: [{ weekStartDate: '2024-01-01', content: 'x' }],
    books: [{ id: 'b1', title: 'B', series: '', isBundle: false, includedBookIds: [], language: 'English' }],
    bookMetrics: [{ id: 'bm1', date: '2024-01-01', bookId: 'b1' } as any],
  };
  const first = stageBackup(backup, state);
  // The state was mutated by the first pass (added keys, ids). Running again
  // should now find everything already present and insert nothing.
  const second = stageBackup(backup, state);
  assert(second.sourcesToInsert.length === 0, 'second pass inserts no sources');
  assert(second.ordersToInsert.length === 0, 'second pass inserts no orders');
  assert(second.readsToInsert.length === 0, 'second pass inserts no reads');
  assert(second.dailyToInsert.length === 0, 'second pass inserts no daily records');
  assert(second.notesToInsert.length === 0, 'second pass inserts no notes');
  assert(second.booksToInsert.length === 0, 'second pass inserts no books');
  assert(second.metricsToInsert.length === 0, 'second pass inserts no book metrics');
  // First pass should still have inserted everything.
  assert(first.sourcesToInsert.length === 1, 'first pass inserted 1 source');
}

console.log('\nTest 9: bundle books auto-create order sources (with multiplier = # of included books)');
{
  const state = emptyState();
  state.sourceNameToId.set('Amazon', 'amazon-uuid'); // default already exists
  const backup: AppDataBackup = {
    version: 2,
    orderSources: [{ id: 'src_amazon', name: 'Amazon', multiplier: 1 }],
    monthlyOrders: [],
    monthlyPageReads: [],
    dailyRecords: [],
    weeklyNotes: [],
    books: [
      { id: 'b-a', title: 'A', series: '', isBundle: false, includedBookIds: [], language: 'English' },
      { id: 'b-b', title: 'B', series: '', isBundle: false, includedBookIds: [], language: 'English' },
      { id: 'b-c', title: 'C', series: '', isBundle: false, includedBookIds: [], language: 'English' },
      { id: 'bundle-1', title: 'Trilogy Bundle', series: '', isBundle: true, includedBookIds: ['b-a', 'b-b', 'b-c'], language: 'English' },
      { id: 'bundle-2', title: 'Pair Bundle', series: '', isBundle: true, includedBookIds: ['b-a', 'b-b'], language: 'English' },
    ],
    bookMetrics: [],
  };
  const staged = stageBackup(backup, state);
  const sourceNames = staged.sourcesToInsert.map((s: any) => s.name);
  assert(!sourceNames.includes('Amazon'), 'Amazon (already present) is not re-added');
  assert(sourceNames.includes('Trilogy Bundle'), 'Trilogy Bundle is added as an order source');
  assert(sourceNames.includes('Pair Bundle'), 'Pair Bundle is added as an order source');
  const trilogy = staged.sourcesToInsert.find((s: any) => s.name === 'Trilogy Bundle');
  assert(trilogy.multiplier === 3, 'Trilogy bundle multiplier == 3 (books in bundle)');
  const pair = staged.sourcesToInsert.find((s: any) => s.name === 'Pair Bundle');
  assert(pair.multiplier === 2, 'Pair bundle multiplier == 2 (books in bundle)');
  assert(!trilogy.is_system, 'Derived bundle source is not system');
  assert(!trilogy.is_archived, 'Derived bundle source is not archived');
}

console.log('\nTest 10: bundle book is skipped as order source if one with that name already exists');
{
  const state = emptyState();
  state.sourceNameToId.set('My Bundle', 'existing-bundle-uuid');
  const backup: AppDataBackup = {
    version: 2,
    orderSources: [],
    monthlyOrders: [],
    monthlyPageReads: [],
    dailyRecords: [],
    weeklyNotes: [],
    books: [
      { id: 'b-a', title: 'A', series: '', isBundle: false, includedBookIds: [], language: 'English' },
      { id: 'bundle-1', title: 'My Bundle', series: '', isBundle: true, includedBookIds: ['b-a'], language: 'English' },
    ],
    bookMetrics: [],
  };
  const staged = stageBackup(backup, state);
  const sourceNames = staged.sourcesToInsert.map((s: any) => s.name);
  assert(!sourceNames.includes('My Bundle'), 'Bundle with existing source name is not duplicated');
  assert(staged.sourcesToInsert.length === 0, 'No sources added');
}

console.log('\nAll Firebase-import logic tests passed.');
