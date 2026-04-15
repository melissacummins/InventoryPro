import { useState, useEffect, useMemo } from 'react';
import {
  RefreshCw, MapPin, Calendar, Package, ShoppingCart,
  ChevronDown, ChevronUp, AlertCircle, Loader2, Search, ArrowUpDown
} from 'lucide-react';
import {
  fetchShopifyLocations, fetchShopifyOrders, upsertOrders,
  logSync, updateLastSync, updateDefaultLocation,
  updateProductPurchaseCounts
} from '../api';
import { useShopifyOrders } from '../hooks/useShopifyOrders';
import type { ShopifySettings, ShopifyLocation, ShopifyOrder, ShopifyLineItem, SkuMatch, Product } from '../../../lib/types';
import { supabase } from '../../../lib/supabase';

interface Props {
  settings: ShopifySettings;
  onSettingsRefresh: () => void;
}

type SortField = 'sku' | 'productName' | 'totalQuantity' | 'orderCount';
type SortDir = 'asc' | 'desc';

export default function OrdersDashboard({ settings, onSettingsRefresh }: Props) {
  // Locations
  const [locations, setLocations] = useState<ShopifyLocation[]>([]);
  const [selectedLocationId, setSelectedLocationId] = useState<string>(settings.default_location_id || '');
  const [loadingLocations, setLoadingLocations] = useState(false);

  // Sync state
  const [syncing, setSyncing] = useState(false);
  const [syncError, setSyncError] = useState('');
  const [syncSuccess, setSyncSuccess] = useState('');
  const [dateFrom, setDateFrom] = useState(() => {
    const d = new Date();
    d.setMonth(d.getMonth() - 1);
    return d.toISOString().split('T')[0];
  });
  const [dateTo, setDateTo] = useState(() => new Date().toISOString().split('T')[0]);

  // Orders
  const { orders, loading: loadingOrders, refetch: refetchOrders } = useShopifyOrders(selectedLocationId || undefined);

  // Products for SKU matching
  const [products, setProducts] = useState<Product[]>([]);

  // UI state
  const [search, setSearch] = useState('');
  const [sortField, setSortField] = useState<SortField>('totalQuantity');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [expandedSku, setExpandedSku] = useState<string | null>(null);
  const [applying, setApplying] = useState(false);

  // Load locations on mount
  useEffect(() => {
    loadLocations();
    loadProducts();
  }, []);

  async function loadLocations() {
    setLoadingLocations(true);
    try {
      const locs = await fetchShopifyLocations();
      setLocations(locs);
      if (!selectedLocationId && locs.length > 0) {
        setSelectedLocationId(String(locs[0].id));
      }
    } catch (err) {
      console.error('Failed to load locations:', err);
    } finally {
      setLoadingLocations(false);
    }
  }

  async function loadProducts() {
    const { data } = await supabase.from('products').select('*').order('name');
    if (data) setProducts(data);
  }

  async function handleLocationChange(locId: string) {
    setSelectedLocationId(locId);
    const loc = locations.find(l => String(l.id) === locId);
    if (loc) {
      await updateDefaultLocation(locId, loc.name);
      onSettingsRefresh();
    }
  }

  // SKU matching
  const skuMatches = useMemo((): SkuMatch[] => {
    const skuMap = new Map<string, { qty: number; orderIds: Set<string>; title: string }>();

    for (const order of orders) {
      const lineItems: ShopifyLineItem[] = typeof order.line_items === 'string'
        ? JSON.parse(order.line_items)
        : order.line_items;

      for (const item of lineItems) {
        if (!item.sku) continue;
        const key = item.sku.trim().toUpperCase();
        const existing = skuMap.get(key);
        if (existing) {
          existing.qty += item.quantity;
          existing.orderIds.add(order.shopify_order_id);
        } else {
          skuMap.set(key, {
            qty: item.quantity,
            orderIds: new Set([order.shopify_order_id]),
            title: item.title,
          });
        }
      }
    }

    return Array.from(skuMap.entries()).map(([sku, data]) => {
      const matchedProduct = products.find(p => p.sku.trim().toUpperCase() === sku);
      return {
        sku,
        productName: matchedProduct?.name || data.title,
        productId: matchedProduct?.id || '',
        category: matchedProduct?.category || '',
        totalQuantity: data.qty,
        orderCount: data.orderIds.size,
        isBundle: matchedProduct?.category === 'Bundle' || matchedProduct?.category === 'Book Box',
      };
    });
  }, [orders, products]);

  const filteredMatches = useMemo(() => {
    let result = skuMatches;
    if (search) {
      const s = search.toLowerCase();
      result = result.filter(m =>
        m.sku.toLowerCase().includes(s) ||
        m.productName.toLowerCase().includes(s)
      );
    }
    result.sort((a, b) => {
      const aVal = a[sortField];
      const bVal = b[sortField];
      if (typeof aVal === 'string' && typeof bVal === 'string') {
        return sortDir === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
      }
      return sortDir === 'asc'
        ? (aVal as number) - (bVal as number)
        : (bVal as number) - (aVal as number);
    });
    return result;
  }, [skuMatches, search, sortField, sortDir]);

  const totalOrders = orders.length;
  const totalItems = skuMatches.reduce((sum, m) => sum + m.totalQuantity, 0);
  const matchedProducts = skuMatches.filter(m => m.productId).length;
  const unmatchedProducts = skuMatches.filter(m => !m.productId).length;

  // Sync orders from Shopify
  async function handleSync() {
    setSyncing(true);
    setSyncError('');
    setSyncSuccess('');

    try {
      const userId = (await supabase.auth.getUser()).data.user?.id;
      if (!userId) throw new Error('Not authenticated');

      let allOrders: Record<string, unknown>[] = [];
      let pageInfo: string | null = null;
      let page = 0;

      // Paginate through all orders
      do {
        const params: Record<string, unknown> = {
          created_at_min: new Date(dateFrom).toISOString(),
          created_at_max: new Date(dateTo + 'T23:59:59').toISOString(),
          limit: 250,
        };
        if (pageInfo) params.page_info = pageInfo;

        const result = await fetchShopifyOrders(params);
        allOrders = allOrders.concat(result.orders);
        pageInfo = result.nextPageInfo;
        page++;
      } while (pageInfo && page < 20); // safety limit

      // Find the selected location name
      const selectedLoc = locations.find(l => String(l.id) === selectedLocationId);
      const locationName = selectedLoc?.name || '';

      // Filter by fulfillment location and transform
      const filteredOrders = allOrders
        .filter((o: Record<string, unknown>) => {
          if (!selectedLocationId) return true;
          // Check order's location_id or fulfillment locations
          if (String(o.location_id) === selectedLocationId) return true;
          const fulfillments = (o.fulfillments as Record<string, unknown>[]) || [];
          return fulfillments.some((f: Record<string, unknown>) => String(f.location_id) === selectedLocationId);
        })
        .map((o: Record<string, unknown>) => ({
          user_id: userId,
          shopify_order_id: String(o.id),
          order_number: String((o as Record<string, unknown>).name || (o as Record<string, unknown>).order_number || ''),
          order_date: o.created_at as string,
          customer_name: o.customer
            ? `${(o.customer as Record<string, unknown>).first_name || ''} ${(o.customer as Record<string, unknown>).last_name || ''}`.trim()
            : '',
          fulfillment_status: (o.fulfillment_status as string) || 'unfulfilled',
          financial_status: (o.financial_status as string) || '',
          location_id: selectedLocationId,
          location_name: locationName,
          total_price: Number(o.total_price) || 0,
          line_items: o.line_items || [],
        }));

      const count = await upsertOrders(filteredOrders as Omit<ShopifyOrder, 'id' | 'synced_at'>[]);
      await updateLastSync();
      await logSync({
        sync_type: 'orders',
        status: 'success',
        orders_synced: count,
        date_range_start: dateFrom,
        date_range_end: dateTo,
        location_name: locationName,
        error_message: null,
      });

      onSettingsRefresh();
      refetchOrders();
      setSyncSuccess(`Synced ${count} orders from "${locationName || 'all locations'}"`);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Sync failed';
      setSyncError(message);
      await logSync({
        sync_type: 'orders',
        status: 'error',
        orders_synced: 0,
        date_range_start: dateFrom,
        date_range_end: dateTo,
        location_name: null,
        error_message: message,
      }).catch(() => {});
    } finally {
      setSyncing(false);
    }
  }

  // Apply matched counts to products
  async function handleApplyToProducts() {
    setApplying(true);
    try {
      const updates = skuMatches
        .filter(m => m.productId)
        .map(m => ({
          productId: m.productId,
          booksPurchased: m.isBundle ? 0 : m.totalQuantity,
          purchasedViaBundles: m.isBundle ? m.totalQuantity : 0,
        }));

      await updateProductPurchaseCounts(updates);
      setSyncSuccess(`Updated purchase counts for ${updates.length} products`);
    } catch (err: unknown) {
      setSyncError(err instanceof Error ? err.message : 'Failed to update products');
    } finally {
      setApplying(false);
    }
  }

  function toggleSort(field: SortField) {
    if (sortField === field) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDir('desc');
    }
  }

  function SortIcon({ field }: { field: SortField }) {
    if (sortField !== field) return <ArrowUpDown className="w-3 h-3 text-slate-300" />;
    return sortDir === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />;
  }

  return (
    <div className="space-y-6">
      {/* Sync Controls */}
      <div className="bg-white rounded-xl border border-slate-200 p-5">
        <h3 className="font-semibold text-slate-800 mb-4">Sync Orders from Shopify</h3>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
          {/* Location Picker */}
          <div>
            <label className="flex items-center gap-1.5 text-xs font-medium text-slate-500 mb-1">
              <MapPin className="w-3 h-3" /> Fulfillment Location
            </label>
            {loadingLocations ? (
              <div className="flex items-center gap-2 text-sm text-slate-400 py-2">
                <Loader2 className="w-4 h-4 animate-spin" /> Loading locations...
              </div>
            ) : (
              <select
                value={selectedLocationId}
                onChange={(e) => handleLocationChange(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="">All locations</option>
                {locations.map(loc => (
                  <option key={loc.id} value={String(loc.id)}>{loc.name}</option>
                ))}
              </select>
            )}
          </div>

          {/* Date From */}
          <div>
            <label className="flex items-center gap-1.5 text-xs font-medium text-slate-500 mb-1">
              <Calendar className="w-3 h-3" /> From
            </label>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {/* Date To */}
          <div>
            <label className="flex items-center gap-1.5 text-xs font-medium text-slate-500 mb-1">
              <Calendar className="w-3 h-3" /> To
            </label>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {/* Sync Button */}
          <div className="flex items-end">
            <button
              onClick={handleSync}
              disabled={syncing}
              className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 disabled:opacity-50"
            >
              {syncing ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
              {syncing ? 'Syncing...' : 'Sync Orders'}
            </button>
          </div>
        </div>

        {/* Last sync info */}
        {settings.last_sync_at && (
          <p className="text-xs text-slate-400">
            Last synced: {new Date(settings.last_sync_at).toLocaleString()}
            {settings.default_location_name && ` from "${settings.default_location_name}"`}
          </p>
        )}

        {/* Messages */}
        {syncError && (
          <div className="mt-3 flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
            <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
            <p className="text-sm text-red-700">{syncError}</p>
          </div>
        )}
        {syncSuccess && (
          <div className="mt-3 p-3 bg-emerald-50 border border-emerald-200 rounded-lg">
            <p className="text-sm text-emerald-700">{syncSuccess}</p>
          </div>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={ShoppingCart} label="Total Orders" value={totalOrders} color="text-blue-600" bg="bg-blue-50" />
        <StatCard icon={Package} label="Total Items Sold" value={totalItems} color="text-indigo-600" bg="bg-indigo-50" />
        <StatCard icon={Package} label="Matched SKUs" value={matchedProducts} color="text-emerald-600" bg="bg-emerald-50" />
        <StatCard icon={AlertCircle} label="Unmatched SKUs" value={unmatchedProducts} color="text-amber-600" bg="bg-amber-50" />
      </div>

      {/* SKU Breakdown Table */}
      {!loadingOrders && orders.length > 0 && (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="flex flex-wrap items-center justify-between gap-3 p-4 border-b border-slate-100">
            <h3 className="font-semibold text-slate-800">Sales by SKU</h3>
            <div className="flex items-center gap-3">
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search SKU or product..."
                  className="pl-9 pr-3 py-1.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 w-56"
                />
              </div>
              <button
                onClick={handleApplyToProducts}
                disabled={applying || matchedProducts === 0}
                className="flex items-center gap-2 px-3 py-1.5 bg-emerald-600 text-white text-sm font-medium rounded-lg hover:bg-emerald-700 disabled:opacity-50"
              >
                {applying && <Loader2 className="w-3 h-3 animate-spin" />}
                Apply to Products
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 text-left">
                  <th className="px-4 py-3 font-medium text-slate-500">
                    <button onClick={() => toggleSort('sku')} className="flex items-center gap-1 hover:text-slate-700">
                      SKU <SortIcon field="sku" />
                    </button>
                  </th>
                  <th className="px-4 py-3 font-medium text-slate-500">
                    <button onClick={() => toggleSort('productName')} className="flex items-center gap-1 hover:text-slate-700">
                      Product <SortIcon field="productName" />
                    </button>
                  </th>
                  <th className="px-4 py-3 font-medium text-slate-500">Category</th>
                  <th className="px-4 py-3 font-medium text-slate-500 text-right">
                    <button onClick={() => toggleSort('totalQuantity')} className="flex items-center gap-1 ml-auto hover:text-slate-700">
                      Qty Sold <SortIcon field="totalQuantity" />
                    </button>
                  </th>
                  <th className="px-4 py-3 font-medium text-slate-500 text-right">
                    <button onClick={() => toggleSort('orderCount')} className="flex items-center gap-1 ml-auto hover:text-slate-700">
                      Orders <SortIcon field="orderCount" />
                    </button>
                  </th>
                  <th className="px-4 py-3 font-medium text-slate-500 text-center">Match</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredMatches.map(match => (
                  <tr
                    key={match.sku}
                    className="hover:bg-slate-50 cursor-pointer"
                    onClick={() => setExpandedSku(expandedSku === match.sku ? null : match.sku)}
                  >
                    <td className="px-4 py-3 font-mono text-xs text-slate-600">{match.sku}</td>
                    <td className="px-4 py-3 text-slate-800">{match.productName}</td>
                    <td className="px-4 py-3">
                      {match.category ? (
                        <span className={`inline-flex px-2 py-0.5 text-xs rounded-full ${
                          match.isBundle
                            ? 'bg-purple-100 text-purple-700'
                            : 'bg-blue-100 text-blue-700'
                        }`}>
                          {match.category}
                        </span>
                      ) : (
                        <span className="text-slate-300">-</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right font-semibold text-slate-800">{match.totalQuantity}</td>
                    <td className="px-4 py-3 text-right text-slate-600">{match.orderCount}</td>
                    <td className="px-4 py-3 text-center">
                      {match.productId ? (
                        <span className="inline-flex w-5 h-5 items-center justify-center bg-emerald-100 text-emerald-600 rounded-full text-xs font-bold">&#10003;</span>
                      ) : (
                        <span className="inline-flex w-5 h-5 items-center justify-center bg-amber-100 text-amber-600 rounded-full text-xs font-bold">?</span>
                      )}
                    </td>
                  </tr>
                ))}
                {filteredMatches.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-slate-400">
                      {search ? 'No matching SKUs found.' : 'No order data yet. Sync orders to see results.'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Orders List */}
      {!loadingOrders && orders.length > 0 && (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="p-4 border-b border-slate-100">
            <h3 className="font-semibold text-slate-800">Recent Orders ({orders.length})</h3>
          </div>
          <div className="overflow-x-auto max-h-96 overflow-y-auto">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-slate-50">
                <tr className="text-left">
                  <th className="px-4 py-3 font-medium text-slate-500">Order #</th>
                  <th className="px-4 py-3 font-medium text-slate-500">Date</th>
                  <th className="px-4 py-3 font-medium text-slate-500">Customer</th>
                  <th className="px-4 py-3 font-medium text-slate-500">Items</th>
                  <th className="px-4 py-3 font-medium text-slate-500 text-right">Total</th>
                  <th className="px-4 py-3 font-medium text-slate-500">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {orders.slice(0, 100).map(order => {
                  const lineItems: ShopifyLineItem[] = typeof order.line_items === 'string'
                    ? JSON.parse(order.line_items)
                    : order.line_items;
                  return (
                    <tr key={order.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3 font-medium text-slate-800">{order.order_number}</td>
                      <td className="px-4 py-3 text-slate-600">{new Date(order.order_date).toLocaleDateString()}</td>
                      <td className="px-4 py-3 text-slate-600">{order.customer_name || '-'}</td>
                      <td className="px-4 py-3 text-slate-600">{lineItems.length} item{lineItems.length !== 1 ? 's' : ''}</td>
                      <td className="px-4 py-3 text-right font-medium text-slate-800">${Number(order.total_price).toFixed(2)}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex px-2 py-0.5 text-xs rounded-full ${
                          order.fulfillment_status === 'fulfilled'
                            ? 'bg-emerald-100 text-emerald-700'
                            : order.fulfillment_status === 'partial'
                            ? 'bg-amber-100 text-amber-700'
                            : 'bg-slate-100 text-slate-600'
                        }`}>
                          {order.fulfillment_status || 'unfulfilled'}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Empty state */}
      {!loadingOrders && orders.length === 0 && (
        <div className="text-center py-16 bg-white rounded-xl border border-slate-200">
          <ShoppingCart className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="text-lg font-semibold text-slate-700 mb-1">No orders synced yet</h3>
          <p className="text-sm text-slate-400 max-w-md mx-auto">
            Select a fulfillment location, choose a date range, and click "Sync Orders" to pull your Shopify orders.
          </p>
        </div>
      )}

      {loadingOrders && (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
        </div>
      )}
    </div>
  );
}

function StatCard({ icon: Icon, label, value, color, bg }: {
  icon: typeof ShoppingCart;
  label: string;
  value: number;
  color: string;
  bg: string;
}) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-4">
      <div className="flex items-center gap-3">
        <div className={`w-10 h-10 ${bg} rounded-lg flex items-center justify-center`}>
          <Icon className={`w-5 h-5 ${color}`} />
        </div>
        <div>
          <p className="text-2xl font-bold text-slate-800">{value.toLocaleString()}</p>
          <p className="text-xs text-slate-500">{label}</p>
        </div>
      </div>
    </div>
  );
}
