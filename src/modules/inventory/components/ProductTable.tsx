import { useState } from 'react';
import { Search, ChevronDown, ChevronUp, ChevronRight, Edit2, Check, X, Plus, Trash2 } from 'lucide-react';
import type { Product } from '../../../lib/types';
import { calculateProductMetrics, formatCurrency, formatPercent, marginColor, CATEGORIES, STATUSES } from '../utils';
import { updateProduct, deleteProduct } from '../api';

interface ProductTableProps {
  products: Product[];
  onRefetch: () => void;
  onAdjustStock: (product: Product) => void;
}

type SortKey = 'name' | 'category' | 'base_price' | 'netMarginPercent' | 'book_inventory' | 'status';

export default function ProductTable({ products, onRefetch, onAdjustStock }: ProductTableProps) {
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [sortKey, setSortKey] = useState<SortKey>('name');
  const [sortAsc, setSortAsc] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [editingField, setEditingField] = useState<{ id: string; field: string } | null>(null);
  const [editValue, setEditValue] = useState('');

  const enriched = products.map(p => ({ ...p, metrics: calculateProductMetrics(p, products) }));

  let filtered = enriched.filter(p => {
    const matchesSearch = !search || p.name.toLowerCase().includes(search.toLowerCase()) || p.sku.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = !categoryFilter || p.category === categoryFilter;
    const matchesStatus = !statusFilter || p.metrics.status === statusFilter;
    return matchesSearch && matchesCategory && matchesStatus;
  });

  filtered.sort((a, b) => {
    let cmp = 0;
    switch (sortKey) {
      case 'name': cmp = a.name.localeCompare(b.name); break;
      case 'category': cmp = a.category.localeCompare(b.category); break;
      case 'base_price': cmp = a.base_price - b.base_price; break;
      case 'netMarginPercent': cmp = a.metrics.netMarginPercent - b.metrics.netMarginPercent; break;
      case 'book_inventory': cmp = a.metrics.bookInventory - b.metrics.bookInventory; break;
      case 'status': cmp = a.metrics.status.localeCompare(b.metrics.status); break;
    }
    return sortAsc ? cmp : -cmp;
  });

  function handleSort(key: SortKey) {
    if (sortKey === key) setSortAsc(!sortAsc);
    else { setSortKey(key); setSortAsc(true); }
  }

  function startEdit(id: string, field: string, currentValue: string | number) {
    setEditingField({ id, field });
    setEditValue(String(currentValue));
  }

  async function saveEdit(id: string, field: string) {
    try {
      const numericFields = ['base_price', 'production_cost', 'shipping_cost', 'shipping_supplies_cost',
        'pa_costs', 'handling_fee_add_on', 'tt_shop_price', 'free_shipping', 'lead_time',
        'book_stock', 'books_purchased', 'bundles_purchased', 'purchased_via_bundles',
        'six_month_book_sales', 'six_month_bundle_sales', 'csv_avg_daily', 'csv_reorder_threshold'];
      const value = numericFields.includes(field) ? Number(editValue) : editValue;
      await updateProduct(id, { [field]: value });
      setEditingField(null);
      onRefetch();
    } catch (err) {
      console.error('Failed to save:', err);
    }
  }

  async function handleDelete(id: string, name: string) {
    if (!confirm(`Delete "${name}"? This cannot be undone.`)) return;
    try { await deleteProduct(id); onRefetch(); } catch (err) { console.error(err); }
  }

  function SortIcon({ column }: { column: SortKey }) {
    if (sortKey !== column) return null;
    return sortAsc ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />;
  }

  function EditableCell({ id, field, value, format, suffix }: { id: string; field: string; value: string | number; format?: (v: number) => string; suffix?: string }) {
    const isEditing = editingField?.id === id && editingField?.field === field;
    if (isEditing) {
      return (
        <div className="flex items-center gap-1">
          <input type="text" value={editValue} onChange={e => setEditValue(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') saveEdit(id, field); if (e.key === 'Escape') setEditingField(null); }}
            className="w-20 px-1 py-0.5 border border-blue-400 rounded text-sm focus:outline-none" autoFocus />
          <button onClick={() => saveEdit(id, field)} className="text-green-600"><Check className="w-3 h-3" /></button>
          <button onClick={() => setEditingField(null)} className="text-slate-400"><X className="w-3 h-3" /></button>
        </div>
      );
    }
    const display = format ? format(Number(value)) : `${value}${suffix || ''}`;
    return (
      <span className="cursor-pointer hover:bg-blue-50 px-1 py-0.5 rounded group inline-flex items-center gap-1" onClick={() => startEdit(id, field, value)} title="Click to edit">
        {display}<Edit2 className="w-3 h-3 text-slate-300 group-hover:text-blue-400 opacity-0 group-hover:opacity-100" />
      </span>
    );
  }

  function ReadOnlyCell({ value, format, className }: { value: number | string; format?: (v: number) => string; className?: string }) {
    const display = format ? format(Number(value)) : value;
    return <span className={className}>{display}</span>;
  }

  function StatusBadge({ status }: { status: string }) {
    const colors: Record<string, string> = {
      'Good': 'bg-green-50 text-green-700 border border-green-200',
      'REORDER NOW': 'bg-red-50 text-red-700 border border-red-200',
      'OUT OF STOCK': 'bg-red-100 text-red-800 border border-red-300',
      'BUNDLE': 'bg-blue-50 text-blue-700 border border-blue-200',
      'TRACKING ONLY': 'bg-slate-50 text-slate-600 border border-slate-200',
    };
    return <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${colors[status] || 'bg-slate-100'}`}>{status}</span>;
  }

  // Find which bundles a product belongs to (reverse lookup)
  function getBundlesContaining(productName: string): string[] {
    return products
      .filter(p => (p.category === 'Bundle' || p.category === 'Book Box') && p.books_in_bundle)
      .filter(p => p.books_in_bundle.toLowerCase().split(',').some(name =>
        name.trim().toLowerCase() === productName.toLowerCase() ||
        productName.toLowerCase().includes(name.trim().toLowerCase()) ||
        name.trim().toLowerCase().includes(productName.toLowerCase())
      ))
      .map(p => p.name);
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input type="text" placeholder="Search by name or SKU..." value={search} onChange={e => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-blue-400" />
        </div>
        <select value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)}
          className="px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-blue-400">
          <option value="">All Categories</option>
          {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
          className="px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-blue-400">
          <option value="">All Statuses</option>
          {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>

      <p className="text-sm text-slate-500">{filtered.length} product{filtered.length !== 1 ? 's' : ''}</p>

      {/* Table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="w-8 px-3 py-3"></th>
                {([
                  ['name', 'Product', 'text-left'],
                  ['category', 'Category', 'text-left'],
                  ['base_price', 'Price', 'text-center'],
                  ['netMarginPercent', 'Margin', 'text-center'],
                  ['book_inventory', 'Inventory', 'text-center'],
                  ['status', 'Status', 'text-left'],
                ] as [SortKey, string, string][]).map(([key, label, align]) => (
                  <th key={key} className={`px-3 py-3 ${align} font-medium text-slate-600 cursor-pointer hover:text-slate-800 select-none`}
                    onClick={() => handleSort(key)}>
                    <span className="inline-flex items-center gap-1">{label}<SortIcon column={key} /></span>
                  </th>
                ))}
                <th className="px-3 py-3 text-left font-medium text-slate-600">Action</th>
                <th className="px-3 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(product => {
                const partOfBundles = getBundlesContaining(product.name);
                return (
                <>
                  <tr key={product.id} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                    <td className="px-3 py-3">
                      <button onClick={() => setExpandedId(expandedId === product.id ? null : product.id)} className="text-slate-400 hover:text-slate-600">
                        <ChevronRight className={`w-4 h-4 transition-transform ${expandedId === product.id ? 'rotate-90' : ''}`} />
                      </button>
                    </td>
                    <td className="px-3 py-3">
                      <p className="font-medium text-slate-800">{product.name}</p>
                      <p className="text-xs text-slate-400">{product.sku}</p>
                    </td>
                    <td className="px-3 py-3 text-slate-600">{product.category}</td>
                    <td className="px-3 py-3 text-center">{formatCurrency(product.base_price)}</td>
                    <td className="px-3 py-3 text-center">
                      <span className={marginColor(product.metrics.netMarginPercent)}>{formatPercent(product.metrics.netMarginPercent)}</span>
                    </td>
                    <td className="px-3 py-3 text-center font-medium">{product.metrics.bookInventory}</td>
                    <td className="px-3 py-3"><StatusBadge status={product.metrics.status} /></td>
                    <td className="px-3 py-3 text-xs text-slate-500">{product.metrics.action}</td>
                    <td className="px-3 py-3">
                      <div className="flex items-center gap-1">
                        <button onClick={() => onAdjustStock(product)} className="p-1.5 text-blue-500 hover:bg-blue-50 rounded-lg" title="Adjust Stock">
                          <Plus className="w-4 h-4" />
                        </button>
                        <button onClick={() => handleDelete(product.id, product.name)} className="p-1.5 text-red-400 hover:bg-red-50 rounded-lg" title="Delete">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                  {expandedId === product.id && (
                    <tr key={`${product.id}-detail`} className="bg-slate-50/50">
                      <td colSpan={9} className="px-6 py-5">
                        {/* Tracking Only toggle */}
                        <div className="flex items-center gap-2 mb-4">
                          <label className="flex items-center gap-2 text-sm text-slate-600 cursor-pointer">
                            <input type="checkbox" checked={product.do_not_reorder}
                              onChange={async (e) => { await updateProduct(product.id, { do_not_reorder: e.target.checked }); onRefetch(); }}
                              className="rounded" />
                            Tracking Only (No Reorder)
                          </label>
                        </div>

                        {/* Bento Box Grid */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {/* INVENTORY & SALES */}
                          <div className="bg-white rounded-xl border border-slate-200 p-4">
                            <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Inventory & Sales</h4>
                            <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
                              <div className="flex justify-between">
                                <span className="text-slate-500">Book Stock</span>
                                <EditableCell id={product.id} field="book_stock" value={product.book_stock} />
                              </div>
                              <div className="flex justify-between">
                                <span className="text-slate-500">Books Purchased</span>
                                <EditableCell id={product.id} field="books_purchased" value={product.books_purchased} />
                              </div>
                              <div className="flex justify-between">
                                <span className="text-slate-500">Purchased via Bundles</span>
                                <EditableCell id={product.id} field="purchased_via_bundles" value={product.purchased_via_bundles} />
                              </div>
                              <div className="flex justify-between">
                                <span className="text-slate-500">Book Inventory</span>
                                <ReadOnlyCell value={product.metrics.bookInventory} className="font-medium" />
                              </div>
                              <div className="flex justify-between">
                                <span className="text-slate-500">6Mo Book Sales</span>
                                <EditableCell id={product.id} field="six_month_book_sales" value={product.six_month_book_sales} />
                              </div>
                              <div className="flex justify-between">
                                <span className="text-slate-500">6Mo Bundle Sales</span>
                                <EditableCell id={product.id} field="six_month_bundle_sales" value={product.six_month_bundle_sales} />
                              </div>
                              <div className="flex justify-between">
                                <span className="text-slate-500">Avg Daily Sales</span>
                                <ReadOnlyCell value={product.metrics.avgDailySalesBooks.toFixed(2)} className="text-slate-700" />
                              </div>
                              {(product.category === 'Bundle' || product.category === 'Book Box') && (
                                <div className="flex justify-between">
                                  <span className="text-slate-500">Bundles Inventory</span>
                                  <ReadOnlyCell value={product.metrics.bundlesInventory} className="font-medium" />
                                </div>
                              )}
                            </div>
                          </div>

                          {/* PRICING & MARGINS */}
                          <div className="bg-white rounded-xl border border-slate-200 p-4">
                            <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Pricing & Margins</h4>
                            <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
                              <div className="flex justify-between">
                                <span className="text-slate-500">Base Price</span>
                                <EditableCell id={product.id} field="base_price" value={product.base_price} format={formatCurrency} />
                              </div>
                              <div className="flex justify-between">
                                <span className="text-slate-500">Production Cost</span>
                                <EditableCell id={product.id} field="production_cost" value={product.production_cost} format={formatCurrency} />
                              </div>
                              <div className="flex justify-between">
                                <span className="text-slate-500">Shipping Cost</span>
                                <EditableCell id={product.id} field="shipping_cost" value={product.shipping_cost} format={formatCurrency} />
                              </div>
                              <div className="flex justify-between">
                                <span className="text-slate-500">Shipping Supplies</span>
                                <EditableCell id={product.id} field="shipping_supplies_cost" value={product.shipping_supplies_cost} format={formatCurrency} />
                              </div>
                              <div className="flex justify-between">
                                <span className="text-slate-500">PA Costs</span>
                                <EditableCell id={product.id} field="pa_costs" value={product.pa_costs} format={formatCurrency} />
                              </div>
                              <div className="flex justify-between">
                                <span className="text-slate-500">Handling Fee</span>
                                <EditableCell id={product.id} field="handling_fee_add_on" value={product.handling_fee_add_on} format={formatCurrency} />
                              </div>
                              <div className="flex justify-between">
                                <span className="text-slate-500">Transaction Fees</span>
                                <ReadOnlyCell value={product.metrics.transactionFees} format={formatCurrency} className="text-slate-700" />
                              </div>
                              <div className="flex justify-between">
                                <span className="text-slate-500">Net Margin ($)</span>
                                <ReadOnlyCell value={product.metrics.netMargin} format={formatCurrency} className={`font-medium ${marginColor(product.metrics.netMarginPercent)}`} />
                              </div>
                              <div className="flex justify-between col-span-2">
                                <span className="text-slate-500">Net Margin (%)</span>
                                <ReadOnlyCell value={`${product.metrics.netMarginPercent.toFixed(1)}%`} className={`font-semibold ${marginColor(product.metrics.netMarginPercent)}`} />
                              </div>
                            </div>
                          </div>

                          {/* REORDER METRICS */}
                          <div className="bg-white rounded-xl border border-slate-200 p-4">
                            <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Reorder Metrics</h4>
                            <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
                              <div className="flex justify-between">
                                <span className="text-slate-500">Lead Time (days)</span>
                                <EditableCell id={product.id} field="lead_time" value={product.lead_time} />
                              </div>
                              <div className="flex justify-between">
                                <span className="text-slate-500">Safety Threshold</span>
                                <ReadOnlyCell value={product.metrics.reorderThreshold} />
                              </div>
                              <div className="flex justify-between">
                                <span className="text-slate-500">Days Remaining</span>
                                <ReadOnlyCell value={product.metrics.daysRemaining === Infinity ? 'N/A' : product.metrics.daysRemaining}
                                  className={product.metrics.daysRemaining !== Infinity && product.metrics.daysRemaining <= product.lead_time ? 'text-red-600 font-medium' : ''} />
                              </div>
                              <div className="flex justify-between">
                                <span className="text-slate-500">Reorder Qty</span>
                                <ReadOnlyCell value={product.metrics.reorderQty} />
                              </div>
                              <div className="flex justify-between col-span-2">
                                <span className="text-slate-500">Reorder Cost</span>
                                <ReadOnlyCell value={product.metrics.reorderCost} format={formatCurrency} />
                              </div>
                            </div>
                          </div>

                          {/* TIKTOK SHOP */}
                          <div className="bg-white rounded-xl border border-slate-200 p-4">
                            <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">TikTok Shop</h4>
                            <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
                              <div className="flex justify-between">
                                <span className="text-slate-500">TikTok Price</span>
                                <EditableCell id={product.id} field="tt_shop_price" value={product.tt_shop_price} format={formatCurrency} />
                              </div>
                              <div className="flex justify-between">
                                <span className="text-slate-500">TikTok Fees</span>
                                <ReadOnlyCell value={product.metrics.ttFees} format={formatCurrency} className="text-slate-700" />
                              </div>
                              <div className="flex justify-between">
                                <span className="text-slate-500">Free Shipping</span>
                                <EditableCell id={product.id} field="free_shipping" value={product.free_shipping} format={formatCurrency} />
                              </div>
                              <div className="flex justify-between">
                                <span className="text-slate-500">TikTok Margin ($)</span>
                                <ReadOnlyCell value={product.metrics.ttNetMargin} format={formatCurrency} className={`font-medium ${marginColor(product.metrics.ttNetMarginPercent)}`} />
                              </div>
                              <div className="flex justify-between col-span-2">
                                <span className="text-slate-500">TikTok Margin (%)</span>
                                <ReadOnlyCell value={`${product.metrics.ttNetMarginPercent.toFixed(1)}%`} className={`font-semibold ${marginColor(product.metrics.ttNetMarginPercent)}`} />
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Bundle auto-calc info */}
                        {(product.category === 'Bundle' || product.category === 'Book Box') && product.books_in_bundle && (
                          <div className="mt-4 bg-blue-50 border border-blue-200 rounded-xl p-3">
                            <p className="text-sm font-medium text-blue-700 mb-1">Bundle Auto-Calculation</p>
                            <p className="text-xs text-blue-600">
                              Availability ({product.metrics.bundlesInventory}) = minimum inventory across: {product.books_in_bundle}
                            </p>
                          </div>
                        )}

                        {/* Part of Bundles */}
                        {partOfBundles.length > 0 && (
                          <div className="mt-4 bg-white rounded-xl border border-slate-200 p-4">
                            <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Part of Bundles</h4>
                            <div className="flex flex-wrap gap-2">
                              {partOfBundles.map(name => (
                                <span key={name} className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-green-50 border border-green-200 rounded-lg text-xs text-green-700 font-medium">
                                  <span className="w-3 h-3 bg-green-500 rounded-sm flex items-center justify-center">
                                    <Check className="w-2 h-2 text-white" />
                                  </span>
                                  {name}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                      </td>
                    </tr>
                  )}
                </>
              )})}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={9} className="px-6 py-12 text-center text-slate-400">
                    {products.length === 0 ? 'No products yet. Add your first product to get started.' : 'No products match your filters.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
