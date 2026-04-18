import type {
  DailyRecord,
  CalculatedMetrics,
  OrderSource,
  MonthlyOrderEntry,
  MonthlyPageReads,
} from '../types';

export const calculateMetrics = (record: DailyRecord): CalculatedMetrics => {
  const totalAdSpend =
    (record.pnrAds || 0) +
    (record.contempAds || 0) +
    (record.trafficAds || 0) +
    (record.miscAds || 0);

  const totalRevenue =
    (record.shopifyRev || 0) +
    (record.amazonRev || 0) +
    (record.d2dRev || 0) +
    (record.googleRev || 0) +
    (record.koboRev || 0) +
    (record.koboPlusRev || 0);

  const netRevenue = totalRevenue - totalAdSpend;

  const roas = totalAdSpend > 0 ? totalRevenue / totalAdSpend : 0;
  const adsToIncomePercent = totalRevenue > 0 ? totalAdSpend / totalRevenue : 0;

  return { totalAdSpend, totalRevenue, netRevenue, roas, adsToIncomePercent };
};

export const formatCurrency = (amount: number) =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
  }).format(amount);

export const formatPercent = (value: number) =>
  new Intl.NumberFormat('en-US', {
    style: 'percent',
    minimumFractionDigits: 1,
    maximumFractionDigits: 2,
  }).format(value);

export const formatNumber = (value: number) =>
  new Intl.NumberFormat('en-US').format(value);

export const getMonday = (d: Date) => {
  const date = new Date(d);
  const day = date.getDay();
  const diff = date.getDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(date.setDate(diff));
  monday.setHours(0, 0, 0, 0);
  return monday;
};

export const getEndOfWeek = (monday: Date) => {
  const end = new Date(monday);
  end.setDate(monday.getDate() + 6);
  end.setHours(23, 59, 59, 999);
  return end;
};

export const formatDateKey = (date: Date) => date.toISOString().split('T')[0];

export interface WeeklyData {
  weekStart: string;
  weekEnd: string;
  weekNumber: number;
  fbAds: number;
  trafficAds: number;
  miscAds: number;
  totalAds: number;
  totalRevenue: number;
  netRevenue: number;
  roas: number;
}

export const groupDataByWeek = (records: DailyRecord[]): WeeklyData[] => {
  const groups: Record<string, WeeklyData> = {};

  records.forEach((record) => {
    const localDate = new Date(record.date + 'T00:00:00');
    const monday = getMonday(localDate);
    const key = formatDateKey(monday);

    if (!groups[key]) {
      const weekEnd = getEndOfWeek(monday);
      groups[key] = {
        weekStart: key,
        weekEnd: formatDateKey(weekEnd),
        weekNumber: 0,
        fbAds: 0,
        trafficAds: 0,
        miscAds: 0,
        totalAds: 0,
        totalRevenue: 0,
        netRevenue: 0,
        roas: 0,
      };
    }

    const g = groups[key];
    const metrics = calculateMetrics(record);
    g.fbAds += (record.pnrAds || 0) + (record.contempAds || 0);
    g.trafficAds += record.trafficAds || 0;
    g.miscAds += record.miscAds || 0;
    g.totalAds += metrics.totalAdSpend;
    g.totalRevenue += metrics.totalRevenue;
  });

  const sortedWeeks = Object.values(groups).sort((a, b) =>
    a.weekStart.localeCompare(b.weekStart),
  );

  let currentYear = '';
  let weekCounter = 0;

  return sortedWeeks.map((w) => {
    const year = w.weekStart.substring(0, 4);
    if (year !== currentYear) {
      currentYear = year;
      weekCounter = 1;
    } else {
      weekCounter++;
    }

    const net = w.totalRevenue - w.totalAds;
    const roas = w.totalAds > 0 ? w.totalRevenue / w.totalAds : 0;

    return { ...w, weekNumber: weekCounter, netRevenue: net, roas };
  });
};

export interface MonthlyData {
  monthKey: string;
  monthName: string;
  year: string;
  totalRevenue: number;
  totalSpend: number;
  netRevenue: number;
  roas: number;
  unitsSold: number;
  pageReads: number;
}

export const groupDataByMonth = (
  records: DailyRecord[],
  sources: OrderSource[] = [],
  monthlyOrders: MonthlyOrderEntry[] = [],
  monthlyPageReads: MonthlyPageReads[] = [],
): MonthlyData[] => {
  const groups: Record<string, MonthlyData> = {};

  records.forEach((record) => {
    const key = record.date.substring(0, 7);
    if (!groups[key]) {
      const dateObj = new Date(record.date + 'T00:00:00');
      groups[key] = {
        monthKey: key,
        monthName: dateObj.toLocaleString('default', { month: 'long' }),
        year: key.substring(0, 4),
        totalRevenue: 0,
        totalSpend: 0,
        netRevenue: 0,
        roas: 0,
        unitsSold: 0,
        pageReads: 0,
      };
    }

    const m = calculateMetrics(record);
    groups[key].totalRevenue += m.totalRevenue;
    groups[key].totalSpend += m.totalAdSpend;
  });

  const ensureMonthExists = (monthKey: string) => {
    if (!groups[monthKey]) {
      const [y, m] = monthKey.split('-');
      const dateObj = new Date(parseInt(y), parseInt(m) - 1, 1);
      groups[monthKey] = {
        monthKey,
        monthName: dateObj.toLocaleString('default', { month: 'long' }),
        year: y,
        totalRevenue: 0,
        totalSpend: 0,
        netRevenue: 0,
        roas: 0,
        unitsSold: 0,
        pageReads: 0,
      };
    }
  };

  monthlyOrders.forEach((mo) => ensureMonthExists(mo.monthKey));
  monthlyPageReads.forEach((mpr) => ensureMonthExists(mpr.monthKey));

  monthlyOrders.forEach((entry) => {
    if (groups[entry.monthKey]) {
      const source = sources.find((s) => s.id === entry.sourceId);
      const multiplier =
        entry.snapshotMultiplier !== undefined
          ? entry.snapshotMultiplier
          : source
            ? source.multiplier
            : 1;
      groups[entry.monthKey].unitsSold += entry.count * multiplier;
    }
  });

  monthlyPageReads.forEach((entry) => {
    if (groups[entry.monthKey]) {
      groups[entry.monthKey].pageReads += entry.reads;
    }
  });

  return Object.values(groups)
    .sort((a, b) => a.monthKey.localeCompare(b.monthKey))
    .map((g) => ({
      ...g,
      netRevenue: g.totalRevenue - g.totalSpend,
      roas: g.totalSpend > 0 ? g.totalRevenue / g.totalSpend : 0,
    }));
};

export interface YearlyData {
  year: string;
  totalRevenue: number;
  totalSpend: number;
  netRevenue: number;
  roas: number;
  unitsSold: number;
  pageReads: number;
}

export const groupDataByYear = (
  records: DailyRecord[],
  sources: OrderSource[] = [],
  monthlyOrders: MonthlyOrderEntry[] = [],
  monthlyPageReads: MonthlyPageReads[] = [],
): YearlyData[] => {
  const groups: Record<string, YearlyData> = {};

  records.forEach((record) => {
    const year = record.date.substring(0, 4);
    if (!groups[year]) {
      groups[year] = {
        year,
        totalRevenue: 0,
        totalSpend: 0,
        netRevenue: 0,
        roas: 0,
        unitsSold: 0,
        pageReads: 0,
      };
    }
    const m = calculateMetrics(record);
    groups[year].totalRevenue += m.totalRevenue;
    groups[year].totalSpend += m.totalAdSpend;
  });

  monthlyOrders.forEach((entry) => {
    const year = entry.monthKey.substring(0, 4);
    if (!groups[year]) {
      groups[year] = {
        year,
        totalRevenue: 0,
        totalSpend: 0,
        netRevenue: 0,
        roas: 0,
        unitsSold: 0,
        pageReads: 0,
      };
    }
    const source = sources.find((s) => s.id === entry.sourceId);
    const multiplier =
      entry.snapshotMultiplier !== undefined
        ? entry.snapshotMultiplier
        : source
          ? source.multiplier
          : 1;
    groups[year].unitsSold += entry.count * multiplier;
  });

  monthlyPageReads.forEach((entry) => {
    const year = entry.monthKey.substring(0, 4);
    if (!groups[year]) {
      groups[year] = {
        year,
        totalRevenue: 0,
        totalSpend: 0,
        netRevenue: 0,
        roas: 0,
        unitsSold: 0,
        pageReads: 0,
      };
    }
    groups[year].pageReads += entry.reads;
  });

  return Object.values(groups)
    .sort((a, b) => b.year.localeCompare(a.year))
    .map((g) => ({
      ...g,
      netRevenue: g.totalRevenue - g.totalSpend,
      roas: g.totalSpend > 0 ? g.totalRevenue / g.totalSpend : 0,
    }));
};
