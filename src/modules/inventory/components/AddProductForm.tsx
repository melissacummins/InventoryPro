import React, { useState } from 'react';
import { CATEGORIES } from '../utils';
import { addProduct } from '../api';

interface AddProductFormProps {
  onClose: () => void;
  onRefetch: () => void;
}

export default function AddProductForm({ onClose, onRefetch }: AddProductFormProps) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: '',
    sku: '',
    category: 'Paperback' as string,
    base_price: 0,
    production_cost: 0,
    shipping_cost: 0,
    shipping_supplies_cost: 0,
    pa_costs: 0,
    handling_fee_add_on: 0,
    tt_shop_price: 0,
    free_shipping: 0,
    book_stock: 0,
    book_inventory: 0,
    lead_time: 0,
    books_in_bundle: '',
    bundles: '',
    do_not_reorder: false,
  });

  function updateField(field: string, value: string | number | boolean) {
    setForm(prev => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) { setError('Product name is required.'); return; }
    setSaving(true);
    setError(null);
    try {
      await addProduct({
        ...form,
        books_purchased: 0,
        bundles_purchased: 0,
        purchased_via_bundles: 0,
        bundles_inventory: 0,
        six_month_book_sales: 0,
        six_month_bundle_sales: 0,
        csv_avg_daily: 0,
        csv_reorder_threshold: 0,
      });
      onRefetch();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to add product.');
    }
    setSaving(false);
  }

  function Field({ label, field, type = 'text' }: { label: string; field: string; type?: string }) {
    return (
      <div>
        <label className="block text-xs text-slate-500 mb-1">{label}</label>
        <input
          type={type}
          value={(form as any)[field]}
          onChange={e => updateField(field, type === 'number' ? Number(e.target.value) : e.target.value)}
          className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-blue-400"
        />
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="col-span-2">
          <Field label="Product Name *" field="name" />
        </div>
        <Field label="SKU" field="sku" />
        <div>
          <label className="block text-xs text-slate-500 mb-1">Category</label>
          <select
            value={form.category}
            onChange={e => updateField('category', e.target.value)}
            className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-blue-400"
          >
            {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
      </div>

      <div className="border-t border-slate-200 pt-4">
        <p className="text-sm font-medium text-slate-700 mb-3">Pricing</p>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Base Price" field="base_price" type="number" />
          <Field label="TT Shop Price" field="tt_shop_price" type="number" />
          <Field label="Production Cost" field="production_cost" type="number" />
          <Field label="Shipping Cost" field="shipping_cost" type="number" />
          <Field label="Shipping Supplies" field="shipping_supplies_cost" type="number" />
          <Field label="PA Costs" field="pa_costs" type="number" />
          <Field label="Handling Fee Add-On" field="handling_fee_add_on" type="number" />
          <Field label="Free Shipping" field="free_shipping" type="number" />
        </div>
      </div>

      <div className="border-t border-slate-200 pt-4">
        <p className="text-sm font-medium text-slate-700 mb-3">Inventory</p>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Starting Stock" field="book_stock" type="number" />
          <Field label="Book Inventory" field="book_inventory" type="number" />
          <Field label="Lead Time (days)" field="lead_time" type="number" />
        </div>
      </div>

      {form.category === 'Bundle' && (
        <div className="border-t border-slate-200 pt-4">
          <p className="text-sm font-medium text-slate-700 mb-3">Bundle</p>
          <Field label="Books in Bundle (comma-separated)" field="books_in_bundle" />
        </div>
      )}

      <div className="flex items-center gap-2 border-t border-slate-200 pt-4">
        <input
          type="checkbox"
          id="doNotReorder"
          checked={form.do_not_reorder}
          onChange={e => updateField('do_not_reorder', e.target.checked)}
          className="rounded"
        />
        <label htmlFor="doNotReorder" className="text-sm text-slate-600">Do not reorder (tracking only)</label>
      </div>

      {error && <p className="text-red-600 text-sm bg-red-50 px-3 py-2 rounded-lg">{error}</p>}

      <div className="flex justify-end gap-3 pt-2">
        <button type="button" onClick={onClose} className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-lg">Cancel</button>
        <button
          type="submit"
          disabled={saving}
          className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
        >
          {saving ? 'Adding...' : 'Add Product'}
        </button>
      </div>
    </form>
  );
}
