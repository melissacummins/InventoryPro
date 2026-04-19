// Logic tests for the customizable categories system. Focus areas:
//
//  1) calculateMetrics sums legacy columns + custom_amounts (typed by category)
//  2) Visibility never affects totals — hiding a category doesn't change ROAS
//  3) getCategoryValue / setCategoryValue route to the right place
//     (legacy column for built-ins, custom_amounts for custom)
//  4) buildDefaultCategories shape matches the seed contract
//
// Run with:   npx tsx src/modules/profit-track/utils/categories.test.ts

import { calculateMetrics } from './calculations';
import { buildDefaultCategories, getCategoryValue, setCategoryValue } from './defaultCategories';
import type { DailyRecord, ProfitCategory } from '../types';

function assert(cond: any, msg: string) {
  if (!cond) throw new Error(`ASSERT FAILED: ${msg}`);
  console.log(`  ok: ${msg}`);
}

function makeCategory(overrides: Partial<ProfitCategory>): ProfitCategory {
  return {
    id: overrides.id || crypto.randomUUID(),
    name: overrides.name || 'Test',
    type: overrides.type || 'ad',
    legacyColumn: overrides.legacyColumn ?? null,
    sortOrder: overrides.sortOrder ?? 1,
    isVisible: overrides.isVisible !== false,
    isCustom: overrides.isCustom ?? false,
  };
}

function emptyRecord(date = '2024-01-01'): DailyRecord {
  return {
    id: 'r1',
    date,
    pnrAds: 0, contempAds: 0, trafficAds: 0, miscAds: 0,
    shopifyRev: 0, amazonRev: 0, d2dRev: 0, googleRev: 0,
    koboRev: 0, koboPlusRev: 0,
    customAmounts: {},
  };
}

// ---------- Tests ----------

console.log('Test 1: calculateMetrics sums legacy columns when no categories given');
{
  const r: DailyRecord = { ...emptyRecord(), pnrAds: 10, contempAds: 20, amazonRev: 100, shopifyRev: 50 };
  const m = calculateMetrics(r);
  assert(m.totalAdSpend === 30, 'totalAdSpend = pnr + contemp = 30');
  assert(m.totalRevenue === 150, 'totalRevenue = amazon + shopify = 150');
  assert(m.netRevenue === 120, 'netRevenue = 120');
  assert(Math.abs(m.roas - 5) < 0.001, 'roas = 5x');
}

console.log('\nTest 2: calculateMetrics adds custom_amounts when categories provided');
{
  const customAdId = 'cat-amazon-ads';
  const customRevId = 'cat-streetlib';
  const categories = [
    makeCategory({ id: 'pnr', type: 'ad', legacyColumn: 'pnr_ads' }),
    makeCategory({ id: customAdId, type: 'ad', legacyColumn: null, isCustom: true, name: 'Amazon Ads' }),
    makeCategory({ id: 'amz', type: 'revenue', legacyColumn: 'amazon_rev' }),
    makeCategory({ id: customRevId, type: 'revenue', legacyColumn: null, isCustom: true, name: 'Streetlib' }),
  ];
  const r: DailyRecord = {
    ...emptyRecord(),
    pnrAds: 10,
    amazonRev: 100,
    customAmounts: { [customAdId]: 25, [customRevId]: 75 },
  };
  const m = calculateMetrics(r, categories);
  assert(m.totalAdSpend === 35, 'totalAdSpend = pnr (10) + amazonAds custom (25) = 35');
  assert(m.totalRevenue === 175, 'totalRevenue = amazon (100) + streetlib custom (75) = 175');
  assert(m.netRevenue === 140, 'netRevenue = 140');
}

console.log('\nTest 3: visibility does NOT affect totals (hidden categories still count)');
{
  const customAdId = 'cat-hidden';
  const categories = [
    makeCategory({ id: 'pnr', type: 'ad', legacyColumn: 'pnr_ads', isVisible: true }),
    makeCategory({ id: customAdId, type: 'ad', legacyColumn: null, isCustom: true, isVisible: false }),
  ];
  const r: DailyRecord = {
    ...emptyRecord(),
    pnrAds: 10,
    customAmounts: { [customAdId]: 50 },
  };
  const m = calculateMetrics(r, categories);
  assert(m.totalAdSpend === 60, 'hidden category still counted in totals');
}

console.log('\nTest 4: getCategoryValue routes built-in vs custom correctly');
{
  const builtIn = makeCategory({ id: 'pnr', legacyColumn: 'pnr_ads', type: 'ad' });
  const custom = makeCategory({ id: 'custom-1', legacyColumn: null, type: 'ad', isCustom: true });
  const r: DailyRecord = {
    ...emptyRecord(),
    pnrAds: 42,
    customAmounts: { 'custom-1': 17 },
  };
  assert(getCategoryValue(builtIn, r) === 42, 'built-in reads from legacy column');
  assert(getCategoryValue(custom, r) === 17, 'custom reads from custom_amounts JSONB');
}

console.log('\nTest 5: setCategoryValue writes to the right place and preserves other fields');
{
  const builtIn = makeCategory({ id: 'pnr', legacyColumn: 'pnr_ads', type: 'ad' });
  const custom = makeCategory({ id: 'custom-1', legacyColumn: null, type: 'ad', isCustom: true });
  const r: DailyRecord = { ...emptyRecord(), amazonRev: 100, customAmounts: { other: 5 } };

  const after1 = setCategoryValue(r, builtIn, 99);
  assert(after1.pnrAds === 99, 'built-in setter writes to pnrAds');
  assert(after1.amazonRev === 100, 'built-in setter preserves other fields');

  const after2 = setCategoryValue(r, custom, 33);
  assert(after2.customAmounts && after2.customAmounts['custom-1'] === 33, 'custom setter writes to customAmounts[id]');
  assert(after2.customAmounts && after2.customAmounts['other'] === 5, 'custom setter preserves other custom keys');
}

console.log('\nTest 6: setCategoryValue with 0 removes the custom key (avoids JSONB bloat)');
{
  const custom = makeCategory({ id: 'custom-1', legacyColumn: null, type: 'ad', isCustom: true });
  const r: DailyRecord = { ...emptyRecord(), customAmounts: { 'custom-1': 50, other: 5 } };
  const after = setCategoryValue(r, custom, 0);
  assert(after.customAmounts && !('custom-1' in after.customAmounts), '0 removes the key');
  assert(after.customAmounts && after.customAmounts['other'] === 5, 'other custom keys preserved');
}

console.log('\nTest 7: buildDefaultCategories produces 13 entries with correct structure');
{
  const defaults = buildDefaultCategories();
  assert(defaults.length === 13, '13 defaults total');
  const adCount = defaults.filter((c) => c.type === 'ad').length;
  const revCount = defaults.filter((c) => c.type === 'revenue').length;
  assert(adCount === 5, '5 ad defaults (PNR, Contemp, Traffic, Misc, Amazon Ads)');
  assert(revCount === 8, '8 revenue defaults (Shopify, Amazon, D2D, Google, Kobo, Kobo Plus, Publish Drive, Streetlib)');

  const builtInsWithLegacy = defaults.filter((c) => !c.isCustom && c.legacyColumn);
  assert(builtInsWithLegacy.length === 10, '10 built-ins map to legacy columns');

  const customs = defaults.filter((c) => c.isCustom);
  assert(customs.length === 3, '3 customs (Amazon Ads, Publish Drive, Streetlib)');
  assert(customs.every((c) => c.legacyColumn === null), 'customs have no legacy column');
}

console.log('\nTest 8: Amazon Ads is a custom AD category (not just any custom)');
{
  const defaults = buildDefaultCategories();
  const amazonAds = defaults.find((c) => c.name === 'Amazon Ads');
  assert(amazonAds !== undefined, 'Amazon Ads exists in defaults');
  assert(amazonAds!.type === 'ad', 'Amazon Ads is type=ad');
  assert(amazonAds!.isCustom === true, 'Amazon Ads is custom (no legacy column)');
}

console.log('\nAll category-system tests passed.');
