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
} from '../utils/mappers';

const DEFAULT_SOURCE_NAMES: Array<Omit<OrderSource, 'id'>> = [
  { name: 'Amazon', multiplier: 1, isSystem: true },
  { name: 'Draft2Digital', multiplier: 1, isSystem: true },
  { name: 'Google Play', multiplier: 1, isSystem: true },
  { name: 'Kobo', multiplier: 1, isSystem: true },
  { name: 'Shopify Single Products', multiplier: 1 },
];

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

  // Keep refs to latest state so setters can diff correctly
  const dailyRef = useRef(dailyRecords);
  const notesRef = useRef(weeklyNotes);
  const sourcesRef = useRef(orderSources);
  const monthlyOrdersRef = useRef(monthlyOrders);
  const pageReadsRef = useRef(monthlyPageReads);
  const booksRef = useRef(books);
  const metricsRef = useRef(bookMetrics);

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
      ] = await Promise.all([
        supabase.from('daily_records').select('*'),
        supabase.from('weekly_notes').select('*'),
        supabase.from('order_sources').select('*'),
        supabase.from('monthly_orders').select('*'),
        supabase.from('monthly_page_reads').select('*'),
        supabase.from('book_products').select('*'),
        supabase.from('book_daily_metrics').select('*'),
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
    ]);
    setDailyRecordsState([]);
    setWeeklyNotesState([]);
    setOrderSourcesState([]);
    setMonthlyOrdersState([]);
    setMonthlyPageReadsState([]);
    setBooksState([]);
    setBookMetricsState([]);
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
    setDailyRecords,
    setWeeklyNotes,
    setOrderSources,
    setMonthlyOrders,
    setMonthlyPageReads,
    setBooks,
    setBookMetrics,
    clearAll,
  };
}
