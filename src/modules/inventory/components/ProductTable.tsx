import { useState } from 'react';
import { Search, ChevronDown, ChevronUp, ChevronRight, Edit2, Check, X, Plus, Minus, Trash2 } from 'lucide-react';
import type { Product } from '../../../lib/types';
import { calculateProductMetrics, formatCurrency, formatPercent, CATEGORIES, STATUSES } from '../utils';
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

  const enriched = products.map(p => ({ ...p, metrics: calculateProductMetrics(p) }));

  // Filter
  let filtered = enriched.filter(p => {
    const matchesSearch = !search || p.name.toLowerCase().includes(search.toLowerCase()) || p.sku.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = !categoryFilter || p.category === categoryFilter;
    const matchesStatus = !statusFilter || p.metrics.status === statusFilter;
    return matchesSearch && matchesCategory && matchesStatus;
  });

  // Sort
  filtered.sort((a, b) => {
    let cmp = 0;
    switch (sortKey) {
      case 'name': cmp = a.name.localeCompare(b.name); break;
      case 'category': cmp = a.category.localeCompare(b.category); break;
      case 'base_price': cmp = a.base_price - b.base_price; break;
      case 'netMarginPercent': cmp = a.metrics.netMarginPercent - b.metrics.netMarginPercent; break;
      case 'book_inventory': cmp = a.book_inventory - b.book_inventory; break;
      case 'status': cmp = a.metrics.status.localeCompare(b.metrics.status); break;
    }
    return sortAsc ? cmp : -cmp;
  });

  function handleSort(key: SortKey) {
    if (sortKey === key) {
      setSortAsc(!sortAsc);
    } else {
      setSortKey(key);
      setSortAsc(true);
    }
  }

  function startEdit(id: string, field: string, currentValue: string | number) {
    setEditingField({ id, field });
    setEditValue(String(currentValue));
  }

  async function saveEdit(id: string, field: string) {
    try {
      const numericFields = ['base_price', 'production_cost', 'shipping_cost', 'shipping_supplies_cost',
        'pa_costs', 'handling_fee_add_on', 'tt_shop_price', 'free_shipping', 'lead_time',
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
    try {
      await deleteProduct(id);
      onRefetch();
    } catch (err) {
      console.error('Failed to delete:', err);
    }
  }

  function SortIcon({ column }: { column: SortKey }) {
    if (sortKey !== column) return null;
    return sortAsc ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />;
  }

  function EditableCell({ id, field, value, format }: { id: string; field: string; value: string | number; format?: (v: number) => string }) {
    const isEditing = editingField?.id === id && editingField?.field === field;
    if (isEditing) {
      return (
        <div className="flex items-center gap-1">
          <input
            type="text"
            value={editValue}
            onChange={e => setEditValue(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') saveEdit(id, field); if (e.key === 'Escape') setEditingField(null); }}
            className="w-20 px-1 py-0.5 border border-blue-400 rounded text-sm focus:outline-none"
            autoFocus
          />
          <button onClick={() => saveEdit(id, field)} className="text-green-600 hover:text-green-700"><Check className="w-3 h-3" /></button>
          <button onClick={() => setEditingField(null)} className="text-slate-400 hover:text-slate-600"><X className="w-3 h-3" /></button>
        </div>
      );
    }
    const display = format ? format(Number(value)) : value;
    return (
      <span
        className="cursor-pointer hover:bg-blue-50 px-1 py-0.5 rounded group inline-flex items-center gap-1"
        onClick={() => startEdit(id, field, value)}
        title="Click to edit"
      >
        {display}
        <Edit2 className="w-3 h-3 text-slate-300 group-hover:text-blue-400 opacity-0 group-hover:opacity-100" />
      </span>
    );
  }

  function StatusBadge({ status }: { status: string }) {
    const colors: Record<string, string> = {
      'GOOD': 'bg-green-100 text-green-700',
      'REORDER NOW': 'bg-red-100 text-red-700',
      'BUNDLE': 'bg-purple-100 text-purple-700',
      'TRACKING ONLY': 'bg-slate-100 text-slate-600',
    };
    return <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${colors[status] || 'bg-slate-100'}`}>{status}</span>;
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search by name or SKU..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-blue-400"
          />
        </div>
        <select
          value={categoryFilter}
          onChange={e => setCategoryFilter(e.target.value)}
          className="px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-blue-400"
        >
          <option value="">All Categories</option>
          {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        <select
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)}
          className="px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-blue-400"
        >
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
                  ['name', 'Product'],
                  ['category', 'Category'],
                  ['base_price', 'Price'],
                  ['netMarginPercent', 'Margin'],
                  ['book_inventory', 'Inventory'],
                  ['status', 'Status'],
                ] as [SortKey, string][]).map(([key, label]) => (
                  <th
                    key={key}
                    className="px-3 py-3 text-left font-medium text-slate-600 cursor-pointer hover:text-slate-800 select-none"
                    onClick={() => handleSort(key)}
                  >
                    <span className="inline-flex items-center gap-1">{label}<SortIcon column={key} /></span>
                  </th>
                ))}
                <th className="px-3 py-3 text-left font-medium text-slate-600">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(product => (
                <>
                  <tr
                    key={product.id}
                    className="border-b border-slate-100 hover:bg-slate-50 transition-colors"
                  >
                    <td className="px-3 py-3">
                      <button
                        onClick={() => setExpandedId(expandedId === product.id ? null : product.id)}
                        className="text-slate-400 hover:text-slate-600"
                      >
                        <ChevronRight className={`w-4 h-4 transition-transform ${expandedId === product.id ? 'rotate-90' : ''}`} />
                      </button>
                    </td>
                    <td className="px-3 py-3">
                      <div>
                        <p className="font-medium text-slate-800">{product.name}</p>
                        <p className="text-xs text-slate-400">{product.sku}</p>
                      </div>
                    </td>
                    <td className="px-3 py-3 text-slate-600">{product.category}</td>
                    <td className="px-3 py-3">
                      <EditableCell id={product.id} field="base_price" value={product.base_price} format={formatCurrency} />
                    </td>
                    <td className="px-3 py-3">
                      <span className={product.metrics.netMarginPercent >= 0 ? 'text-green-600' : 'text-red-600'}>
                        {formatPercent(product.metrics.netMarginPercent)}
                      </span>
                    </td>
                    <td className="px-3 py-3 font-medium">{product.book_inventory}</td>
                    <td className="px-3 py-3"><StatusBadge status={product.metrics.status} /></td>
                    <td className="px-3 py-3">
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => onAdjustStock(product)}
                          className="p-1.5 text-blue-500 hover:bg-blue-50 rounded-lg"
                          title="Adjust Stock"
                        >
                          <Plus className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(product.id, product.name)}
                          className="p-1.5 text-red-400 hover:bg-red-50 rounded-lg"
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                  {expandedId === product.id && (
                    <tr key={`${product.id}-detail`} className="bg-slate-50">
                      <td colSpan={8} className="px-6 py-4">
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                          <div>
                            <p className="text-slate-500 text-xs mb-1">Production Cost</p>
                            <EditableCell id={product.id} field="production_cost" value={product.production_cost} format={formatCurrency} />
                          </div>
                          <div>
                            <p className="text-slate-500 text-xs mb-1">Shipping Cost</p>
                            <EditableCell id={product.id} field="shipping_cost" value={product.shipping_cost} format={formatCurrency} />
                          </div>
                          <div>
                            <p className="text-slate-500 text-xs mb-1">Shipping Supplies</p>
                            <EditableCell id={product.id} field="shipping_supplies_cost" value={product.shipping_supplies_cost} format={formatCurrency} />
                          </div>
                          <div>
                            <p className="text-slate-500 text-xs mb-1">PA Costs</p>
                            <EditableCell id={product.id} field="pa_costs" value={product.pa_costs} format={formatCurrency} />
                          </div>
                          <div>
                            <p className="text-slate-500 text-xs mb-1">Handling Fee Add-On</p>
                            <EditableCell id={product.id} field="handling_fee_add_on" value={product.handling_fee_add_on} format={formatCurrency} />
                          </div>
                          <div>
                            <p className="text-slate-500 text-xs mb-1">TT Shop Price</p>
                            <EditableCell id={product.id} field="tt_shop_price" value={product.tt_shop_price} format={formatCurrency} />
                          </div>
                          <div>
                            <p className="text-slate-500 text-xs mb-1">TT Shop Margin</p>
                            <span className={product.metrics.ttNetMarginPercent >= 0 ? 'text-green-600' : 'text-red-600'}>
                              {formatCurrency(product.metrics.ttNetMargin)} ({formatPercent(product.metrics.ttNetMarginPercent)})
                            </span>
                          </div>
                          <div>
                            <p className="text-slate-500 text-xs mb-1">Net Margin</p>
                            <span className={product.metrics.netMargin >= 0 ? 'text-green-600' : 'text-red-600'}>
                              {formatCurrency(product.metrics.netMargin)} ({formatPercent(product.metrics.netMarginPercent)})
                            </span>
                          </div>
                          <div>
                            <p className="text-slate-500 text-xs mb-1">Lead Time (days)</p>
                            <EditableCell id={product.id} field="lead_time" value={product.lead_time} />
                          </div>
                          <div>
                            <p className="text-slate-500 text-xs mb-1">6-Month Book Sales</p>
                            <EditableCell id={product.id} field="six_month_book_sales" value={product.six_month_book_sales} />
                          </div>
                          <div>
                            <p className="text-slate-500 text-xs mb-1">Avg Daily Sales</p>
                            <span>{product.metrics.avgDailySales.toFixed(2)}</span>
                          </div>
                          <div>
                            <p className="text-slate-500 text-xs mb-1">Days Remaining</p>
                            <span className={product.metrics.daysRemaining < 30 ? 'text-red-600 font-medium' : ''}>
                              {product.metrics.daysRemaining === Infinity ? '—' : Math.round(product.metrics.daysRemaining)}
                            </span>
                          </div>
                          <div>
                            <p className="text-slate-500 text-xs mb-1">Book Stock</p>
                            <span>{product.book_stock}</span>
                          </div>
                          <div>
                            <p className="text-slate-500 text-xs mb-1">Bundles Inventory</p>
                            <span>{product.bundles_inventory}</span>
                          </div>
                          <div>
                            <p className="text-slate-500 text-xs mb-1">Reorder Threshold</p>
                            <span>{product.metrics.reorderThreshold}</span>
                          </div>
                          <div>
                            <p className="text-slate-500 text-xs mb-1">Do Not Reorder</p>
                            <span>{product.do_not_reorder ? 'Yes' : 'No'}</span>
                          </div>
                        </div>
                        {product.books_in_bundle && (
                          <div className="mt-3">
                            <p className="text-slate-500 text-xs mb-1">Books in Bundle</p>
                            <p className="text-sm">{product.books_in_bundle}</p>
                          </div>
                        )}
                      </td>
                    </tr>
                  )}
                </>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center text-slate-400">
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
