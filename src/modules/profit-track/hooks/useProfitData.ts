import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '../../../lib/supabase';
import type {
  DailyRecord,
  WeeklyNote,
  OrderSource,
  MonthlyOrderEntry,
  MonthlyPageReads,
  BookProduct,
  BookDailyMetric,
  ProfitCategory,
  UserUIPreferences,
} from '../types';
import {
  dailyRecordFromDb,
  dailyRecordToDb,
  weeklyNoteFromDb,
  weeklyNoteToDb,
  orderSourceFromDb,
  orderSourceToDb,
  monthlyOrderFromDb,
  monthlyOrderToDb,
  pageReadsFromDb,
  pageReadsToDb,
  bookProductFromDb,
  bookProductToDb,
  bookMetricFromDb,
  bookMetricToDb,
  profitCategoryFromDb,
  profitCategoryToDb,
  uiPrefsFromDb,
  uiPrefsToDb,
} from '../utils/mappers';
import { buildDefaultCategories } from '../utils/defaultCategories';

const DEFAULT_SOURCE_NAMES: Array<Omit<OrderSource, 'id'>> = [
  { name: 'Amazon', multiplier: 1, isSystem: true },
  { name: 'Draft2Digital', multiplier: 1, isSystem: true },
  { name: 'Google Play', multiplier: 1, isSystem: true },
  { name: 'Kobo', multiplier: 1, isSystem: true },
  { name: 'Shopify Single Products', multiplier: 1 },
];

// Supabase caps a single select() at 1000 rows. For tables that can grow
// beyond that (e.g. daily_records over multiple years), we need to page
// through the results manually.
const PAGE_SIZE = 1000;
async function fetchAll(table: string): Promise<{ data: any[] | null }> {
  const all: any[] = [];
  let from = 0;
  for (;;) {
    const { data, error } = await supabase
      .from(table)
      .select('*')
      .range(from, from + PAGE_SIZE - 1);
    if (error) return { data: null };
    if (!data || data.length === 0) break;
    all.push(...data);
    if (data.length < PAGE_SIZE) break;
    from += PAGE_SIZE;
  }
  return { data: all };
}

function diffById<T extends { id?: string }>(prev: T[], next: T[]) {
  const prevById = new Map<string, T>();
  prev.forEach((r) => r.id && prevById.set(r.id, r));
  const nextIds = new Set<string>();
  const changed: T[] = [];
  for (const row of next) {
    if (!row.id) continue;
    nextIds.add(row.id);
    const old = prevById.get(row.id);
    if (!old || JSON.stringify(old) !== JSON.stringify(row)) {
      changed.push(row);
    }
  }
  const deletedIds: string[] = [];
  for (const id of prevById.keys()) {
    if (!nextIds.has(id)) deletedIds.push(id);
  }
  return { changed, deletedIds };
}

export function useProfitData() {
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const [dailyRecords, setDailyRecordsState] = useState<DailyRecord[]>([]);
  const [weeklyNotes, setWeeklyNotesState] = useState<WeeklyNote[]>([]);
  const [orderSources, setOrderSourcesState] = useState<OrderSource[]>([]);
  const [monthlyOrders, setMonthlyOrdersState] = useState<MonthlyOrderEntry[]>(
    [],
  );
  const [monthlyPageReads, setMonthlyPageReadsState] = useState<
    MonthlyPageReads[]
  >([]);
  const [books, setBooksState] = useState<BookProduct[]>([]);
  const [bookMetrics, setBookMetricsState] = useState<BookDailyMetric[]>([]);
  const [categories, setCategoriesState] = useState<ProfitCategory[]>([]);
  const [uiPrefs, setUIPrefsState] = useState<UserUIPreferences>({
    hiddenProfitTabs: [],
  });

  // Keep refs to latest state so setters can diff correctly
  const dailyRef = useRef(dailyRecords);
  const notesRef = useRef(weeklyNotes);
  const sourcesRef = useRef(orderSources);
  const monthlyOrdersRef = useRef(monthlyOrders);
  const pageReadsRef = useRef(monthlyPageReads);
  const booksRef = useRef(books);
  const metricsRef = useRef(bookMetrics);
  const categoriesRef = useRef(categories);
  const uiPrefsRef = useRef(uiPrefs);

  useEffect(() => {
    dailyRef.current = dailyRecords;
  }, [dailyRecords]);
  useEffect(() => {
    notesRef.current = weeklyNotes;
  }, [weeklyNotes]);
  useEffect(() => {
    sourcesRef.current = orderSources;
  }, [orderSources]);
  useEffect(() => {
    monthlyOrdersRef.current = monthlyOrders;
  }, [monthlyOrders]);
  useEffect(() => {
    pageReadsRef.current = monthlyPageReads;
  }, [monthlyPageReads]);
  useEffect(() => {
    booksRef.current = books;
  }, [books]);
  useEffect(() => {
    metricsRef.current = bookMetrics;
  }, [bookMetrics]);
  useEffect(() => {
    categoriesRef.current = categories;
  }, [categories]);
  useEffect(() => {
    uiPrefsRef.current = uiPrefs;
  }, [uiPrefs]);

  // Initial load
  useEffect(() => {
    let cancelled = false;

    async function load() {
      const { data: userData } = await supabase.auth.getUser();
      const user = userData?.user;
      if (!user) {
        setLoading(false);
        return;
      }
      if (cancelled) return;
      setUserId(user.id);

      const [
        dailyRes,
        notesRes,
        sourcesRes,
        ordersRes,
        readsRes,
        booksRes,
        metricsRes,
        categoriesRes,
        prefsRes,
      ] = await Promise.all([
        fetchAll('daily_records'),
        fetchAll('weekly_notes'),
        fetchAll('order_sources'),
        fetchAll('monthly_orders'),
        fetchAll('monthly_page_reads'),
        fetchAll('book_products'),
        fetchAll('book_daily_metrics'),
        fetchAll('profit_categories'),
        supabase
          .from('user_ui_preferences')
          .select('*')
          .eq('user_id', user.id)
          .maybeSingle()
          .then((r) => ({ data: r.data ? [r.data] : [] })),
      ]);

      if (cancelled) return;

      setDailyRecordsState((dailyRes.data || []).map(dailyRecordFromDb));
      setWeeklyNotesState((notesRes.data || []).map(weeklyNoteFromDb));

      let sources: OrderSource[] = (sourcesRes.data || []).map(
        orderSourceFromDb,
      );

      // Seed defaults if empty
      if (sources.length === 0) {
        const seeded: OrderSource[] = DEFAULT_SOURCE_NAMES.map((s) => ({
          id: crypto.randomUUID(),
          ...s,
        }));
        const rows = seeded.map((s) => orderSourceToDb(s, user.id));
        const { data: inserted, error: insertErr } = await supabase
          .from('order_sources')
          .insert(rows)
          .select('*');
        if (!insertErr && inserted) {
          sources = inserted.map(orderSourceFromDb);
        }
      }
      setOrderSourcesState(sources);
      setMonthlyOrdersState((ordersRes.data || []).map(monthlyOrderFromDb));
      setMonthlyPageReadsState((readsRes.data || []).map(pageReadsFromDb));
      setBooksState((booksRes.data || []).map(bookProductFromDb));
      setBookMetricsState((metricsRes.data || []).map(bookMetricFromDb));

      let loadedCategories: ProfitCategory[] = (categoriesRes.data || []).map(
        profitCategoryFromDb,
      );
      // Seed built-in categories on first load so existing data keeps flowing
      // through the legacy_column mapping.
      if (loadedCategories.length === 0) {
        const seeded: ProfitCategory[] = buildDefaultCategories().map((c) => ({
          id: crypto.randomUUID(),
          ...c,
        }));
        const rows = seeded.map((c) => profitCategoryToDb(c, user.id));
        const { data: inserted, error: insertErr } = await supabase
          .from('profit_categories')
          .insert(rows)
          .select('*');
        if (!insertErr && inserted) {
          loadedCategories = inserted.map(profitCategoryFromDb);
        } else {
          // Migration hasn't been applied yet — render the defaults locally so
          // the UI keeps working; writes will just fail silently until the
          // table exists. This keeps the app alive during deploy gaps.
          loadedCategories = seeded;
        }
      }
      setCategoriesState(loadedCategories);

      const prefsRow = (prefsRes.data || [])[0];
      setUIPrefsState(prefsRow ? uiPrefsFromDb(prefsRow) : { hiddenProfitTabs: [] });

      setLoading(false);
    }

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  // Generic diff-then-persist helper
  const persistArray = useCallback(
    async <T extends { id?: string }>(
      table: string,
      prev: T[],
      next: T[],
      toDb: (row: T) => any,
    ) => {
      if (!userId) return;
      const { changed, deletedIds } = diffById(prev, next);
      if (deletedIds.length) {
        await supabase.from(table).delete().in('id', deletedIds);
      }
      if (changed.length) {
        await supabase.from(table).upsert(changed.map(toDb));
      }
    },
    [userId],
  );

  // Setters that also persist to Supabase
  const setDailyRecords = useCallback(
    (next: DailyRecord[] | ((prev: DailyRecord[]) => DailyRecord[])) => {
      const resolved =
        typeof next === 'function' ? next(dailyRef.current) : next;
      const prev = dailyRef.current;
      setDailyRecordsState(resolved);
      if (userId)
        persistArray('daily_records', prev, resolved, (r) =>
          dailyRecordToDb(r, userId),
        );
    },
    [userId, persistArray],
  );

  const setWeeklyNotes = useCallback(
    (next: WeeklyNote[] | ((prev: WeeklyNote[]) => WeeklyNote[])) => {
      const resolved = typeof next === 'function' ? next(notesRef.current) : next;
      // Ensure every note has an id
      const withIds = resolved.map((n) =>
        n.id ? n : { ...n, id: crypto.randomUUID() },
      );
      const prev = notesRef.current;
      setWeeklyNotesState(withIds);
      if (userId)
        persistArray('weekly_notes', prev, withIds, (r) =>
          weeklyNoteToDb(r, userId),
        );
    },
    [userId, persistArray],
  );

  const setOrderSources = useCallback(
    (next: OrderSource[] | ((prev: OrderSource[]) => OrderSource[])) => {
      const resolved =
        typeof next === 'function' ? next(sourcesRef.current) : next;
      const prev = sourcesRef.current;
      setOrderSourcesState(resolved);
      if (userId)
        persistArray('order_sources', prev, resolved, (r) =>
          orderSourceToDb(r, userId),
        );
    },
    [userId, persistArray],
  );

  const setMonthlyOrders = useCallback(
    (
      next:
        | MonthlyOrderEntry[]
        | ((prev: MonthlyOrderEntry[]) => MonthlyOrderEntry[]),
    ) => {
      const resolved =
        typeof next === 'function' ? next(monthlyOrdersRef.current) : next;
      // Ensure id on every entry
      const withIds = resolved.map((e) =>
        e.id ? e : { ...e, id: crypto.randomUUID() },
      );
      const prev = monthlyOrdersRef.current;
      setMonthlyOrdersState(withIds);
      if (userId)
        persistArray('monthly_orders', prev, withIds, (r) =>
          monthlyOrderToDb(r, userId),
        );
    },
    [userId, persistArray],
  );

  const setMonthlyPageReads = useCallback(
    (
      next:
        | MonthlyPageReads[]
        | ((prev: MonthlyPageReads[]) => MonthlyPageReads[]),
    ) => {
      const resolved =
        typeof next === 'function' ? next(pageReadsRef.current) : next;
      const withIds = resolved.map((e) =>
        e.id ? e : { ...e, id: crypto.randomUUID() },
      );
      const prev = pageReadsRef.current;
      setMonthlyPageReadsState(withIds);
      if (userId)
        persistArray('monthly_page_reads', prev, withIds, (r) =>
          pageReadsToDb(r, userId),
        );
    },
    [userId, persistArray],
  );

  const setBooks = useCallback(
    (next: BookProduct[] | ((prev: BookProduct[]) => BookProduct[])) => {
      const resolved = typeof next === 'function' ? next(booksRef.current) : next;
      const prev = booksRef.current;
      setBooksState(resolved);
      if (userId)
        persistArray('book_products', prev, resolved, (r) =>
          bookProductToDb(r, userId),
        );
    },
    [userId, persistArray],
  );

  const setBookMetrics = useCallback(
    (
      next:
        | BookDailyMetric[]
        | ((prev: BookDailyMetric[]) => BookDailyMetric[]),
    ) => {
      const resolved = typeof next === 'function' ? next(metricsRef.current) : next;
      const prev = metricsRef.current;
      setBookMetricsState(resolved);
      if (userId)
        persistArray('book_daily_metrics', prev, resolved, (r) =>
          bookMetricToDb(r, userId),
        );
    },
    [userId, persistArray],
  );

  const setCategories = useCallback(
    (
      next:
        | ProfitCategory[]
        | ((prev: ProfitCategory[]) => ProfitCategory[]),
    ) => {
      const resolved =
        typeof next === 'function' ? next(categoriesRef.current) : next;
      const prev = categoriesRef.current;
      setCategoriesState(resolved);
      if (userId)
        persistArray('profit_categories', prev, resolved, (r) =>
          profitCategoryToDb(r, userId),
        );
    },
    [userId, persistArray],
  );

  const setUIPrefs = useCallback(
    (
      next:
        | UserUIPreferences
        | ((prev: UserUIPreferences) => UserUIPreferences),
    ) => {
      const resolved =
        typeof next === 'function' ? next(uiPrefsRef.current) : next;
      setUIPrefsState(resolved);
      if (userId) {
        // user_ui_preferences is keyed on user_id (one row), so upsert.
        supabase
          .from('user_ui_preferences')
          .upsert(uiPrefsToDb(resolved, userId), { onConflict: 'user_id' })
          .then(() => {
            /* fire-and-forget; errors surface via network inspector */
          });
      }
    },
    [userId],
  );

  const clearAll = useCallback(async () => {
    if (!userId) return;
    await Promise.all([
      supabase.from('book_daily_metrics').delete().eq('user_id', userId),
      supabase.from('book_products').delete().eq('user_id', userId),
      supabase.from('monthly_page_reads').delete().eq('user_id', userId),
      supabase.from('monthly_orders').delete().eq('user_id', userId),
      supabase.from('weekly_notes').delete().eq('user_id', userId),
      supabase.from('daily_records').delete().eq('user_id', userId),
      supabase.from('order_sources').delete().eq('user_id', userId),
      supabase.from('profit_categories').delete().eq('user_id', userId),
      supabase.from('user_ui_preferences').delete().eq('user_id', userId),
    ]);
    setDailyRecordsState([]);
    setWeeklyNotesState([]);
    setOrderSourcesState([]);
    setMonthlyOrdersState([]);
    setMonthlyPageReadsState([]);
    setBooksState([]);
    setBookMetricsState([]);
    setCategoriesState([]);
    setUIPrefsState({ hiddenProfitTabs: [] });
  }, [userId]);

  return {
    loading,
    userId,
    dailyRecords,
    weeklyNotes,
    orderSources,
    monthlyOrders,
    monthlyPageReads,
    books,
    bookMetrics,
    categories,
    uiPrefs,
    setDailyRecords,
    setWeeklyNotes,
    setOrderSources,
    setMonthlyOrders,
    setMonthlyPageReads,
    setBooks,
    setBookMetrics,
    setCategories,
    setUIPrefs,
    clearAll,
  };
}
