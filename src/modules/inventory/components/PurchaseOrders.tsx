import { useState, useEffect, useCallback } from 'react';
import {
  Plus, Package, Truck, CheckCircle, Clock, Trash2, Loader2, AlertCircle, X
} from 'lucide-react';
import { getPurchaseOrders, createPurchaseOrder, confirmArrival, deletePurchaseOrder } from '../api/purchaseOrders';
import type { CreatePOInput, POLineItem } from '../api/purchaseOrders';
import type { PurchaseOrder, Product } from '../../../lib/types';
import Modal from '../../../components/Modal';

interface Props {
  products: Product[];
  onInventoryChanged: () => void;
}

export default function PurchaseOrders({ products, onInventoryChanged }: Props) {
  const [orders, setOrders] = useState<PurchaseOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [confirmingPO, setConfirmingPO] = useState<PurchaseOrder | null>(null);

  const fetchOrders = useCallback(async () => {
    const data = await getPurchaseOrders();
    setOrders(data);
    setLoading(false);
  }, []);

  useEffect(() => { fetchOrders(); }, [fetchOrders]);

  // Group orders by po_number
  const grouped = groupOrders(orders);
  const pendingGroups = grouped.filter(g => g.items.some(i => i.status === 'pending'));
  const arrivedGroups = grouped.filter(g => g.items.every(i => i.status === 'arrived'));

  async function handleDelete(id: string) {
    if (!confirm('Delete this purchase order line?')) return;
    await deletePurchaseOrder(id);
    fetchOrders();
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-slate-500">
            {pendingGroups.length} pending order{pendingGroups.length !== 1 ? 's' : ''}
          </p>
        </div>
        <button
          onClick={() => setShowAdd(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700"
        >
          <Plus className="w-4 h-4" /> New Purchase Order
        </button>
      </div>

      {/* Pending Orders */}
      {pendingGroups.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-sm font-semibold text-slate-600 uppercase tracking-wider">Pending</h3>
          {pendingGroups.map(group => (
            <POCard
              key={group.poNumber}
              group={group}
              onConfirm={setConfirmingPO}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}

      {/* Arrived Orders */}
      {arrivedGroups.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-sm font-semibold text-slate-600 uppercase tracking-wider">Arrived</h3>
          {arrivedGroups.map(group => (
            <POCard
              key={group.poNumber}
              group={group}
              onConfirm={setConfirmingPO}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}

      {/* Empty state */}
      {orders.length === 0 && (
        <div className="text-center py-16 bg-white rounded-xl border border-slate-200">
          <Truck className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="text-lg font-semibold text-slate-700 mb-1">No purchase orders</h3>
          <p className="text-sm text-slate-400 mb-4">Create a purchase order to track incoming stock.</p>
          <button
            onClick={() => setShowAdd(true)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700"
          >
            <Plus className="w-4 h-4" /> New Purchase Order
          </button>
        </div>
      )}

      {/* Add PO Modal */}
      <Modal open={showAdd} onClose={() => setShowAdd(false)} title="New Purchase Order" maxWidth="max-w-2xl">
        <AddPOForm
          products={products}
          onClose={() => setShowAdd(false)}
          onCreated={() => { fetchOrders(); setShowAdd(false); }}
        />
      </Modal>

      {/* Confirm Arrival Modal */}
      <Modal
        open={!!confirmingPO}
        onClose={() => setConfirmingPO(null)}
        title="Confirm Arrival"
      >
        {confirmingPO && (
          <ConfirmArrivalForm
            po={confirmingPO}
            onClose={() => setConfirmingPO(null)}
            onConfirmed={() => {
              fetchOrders();
              onInventoryChanged();
              setConfirmingPO(null);
            }}
          />
        )}
      </Modal>
    </div>
  );
}

// ---- PO Card ----

interface POGroup {
  poNumber: string;
  orderDate: string;
  expectedDispatch: string;
  expectedArrival: string;
  items: PurchaseOrder[];
}

function groupOrders(orders: PurchaseOrder[]): POGroup[] {
  const map = new Map<string, PurchaseOrder[]>();
  for (const o of orders) {
    const key = o.po_number || o.id;
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(o);
  }

  return Array.from(map.entries()).map(([poNumber, items]) => ({
    poNumber,
    orderDate: items[0].order_date,
    expectedDispatch: items[0].expected_dispatch,
    expectedArrival: items[0].expected_arrival,
    items,
  }));
}

function POCard({ group, onConfirm, onDelete }: {
  group: POGroup;
  onConfirm: (po: PurchaseOrder) => void;
  onDelete: (id: string) => void;
}) {
  const allArrived = group.items.every(i => i.status === 'arrived');
  const totalOrdered = group.items.reduce((s, i) => s + i.quantity, 0);
  const totalReceived = group.items.reduce((s, i) => s + (i.actual_quantity || 0), 0);

  return (
    <div className={`bg-white rounded-xl border ${allArrived ? 'border-emerald-200' : 'border-slate-200'} overflow-hidden`}>
      {/* Header */}
      <div className={`flex flex-wrap items-center justify-between gap-3 px-5 py-3 ${allArrived ? 'bg-emerald-50' : 'bg-slate-50'} border-b border-slate-100`}>
        <div className="flex items-center gap-3">
          {allArrived ? (
            <CheckCircle className="w-5 h-5 text-emerald-500" />
          ) : (
            <Clock className="w-5 h-5 text-amber-500" />
          )}
          <div>
            <span className="font-semibold text-slate-800 text-sm">PO: {group.poNumber}</span>
            <span className="text-xs text-slate-400 ml-3">
              {totalOrdered} ordered{allArrived && `, ${totalReceived} received`}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-4 text-xs text-slate-500">
          <span>Ordered: {group.orderDate}</span>
          <span>Dispatch: {group.expectedDispatch}</span>
          <span>Arrival: {group.expectedArrival}</span>
        </div>
      </div>

      {/* Line items */}
      <div className="divide-y divide-slate-100">
        {group.items.map(item => (
          <div key={item.id} className="flex items-center justify-between px-5 py-3">
            <div className="flex items-center gap-3">
              <Package className="w-4 h-4 text-slate-400" />
              <div>
                <p className="text-sm font-medium text-slate-800">{item.product_name}</p>
                {item.notes && <p className="text-xs text-slate-400">{item.notes}</p>}
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-right">
                <p className="text-sm font-semibold text-slate-800">
                  {item.status === 'arrived' ? (
                    <>{item.actual_quantity} <span className="text-xs font-normal text-slate-400">of {item.quantity} ordered</span></>
                  ) : (
                    <>{item.quantity} <span className="text-xs font-normal text-slate-400">ordered</span></>
                  )}
                </p>
              </div>
              {item.status === 'pending' ? (
                <button
                  onClick={() => onConfirm(item)}
                  className="px-3 py-1.5 text-xs font-medium bg-emerald-600 text-white rounded-lg hover:bg-emerald-700"
                >
                  Confirm Arrival
                </button>
              ) : (
                <span className="px-3 py-1.5 text-xs font-medium bg-emerald-100 text-emerald-700 rounded-lg">
                  Received
                </span>
              )}
              <button onClick={() => onDelete(item.id)} className="p-1 text-slate-300 hover:text-red-500">
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ---- Add PO Form ----

function AddPOForm({ products, onClose, onCreated }: {
  products: Product[];
  onClose: () => void;
  onCreated: () => void;
}) {
  const [poNumber, setPoNumber] = useState(`PO-${Date.now().toString(36).toUpperCase()}`);
  const [orderDate, setOrderDate] = useState(new Date().toISOString().split('T')[0]);
  const [expectedDispatch, setExpectedDispatch] = useState('');
  const [expectedArrival, setExpectedArrival] = useState('');
  const [items, setItems] = useState<POLineItem[]>([{ product_id: '', product_name: '', quantity: 1 }]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  function addLine() {
    setItems([...items, { product_id: '', product_name: '', quantity: 1 }]);
  }

  function removeLine(idx: number) {
    setItems(items.filter((_, i) => i !== idx));
  }

  function updateLine(idx: number, field: keyof POLineItem, value: string | number) {
    setItems(items.map((item, i) => {
      if (i !== idx) return item;
      if (field === 'product_id') {
        const product = products.find(p => p.id === value);
        return { ...item, product_id: value as string, product_name: product?.name || '' };
      }
      return { ...item, [field]: value };
    }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const validItems = items.filter(i => i.product_id && i.quantity > 0);
    if (validItems.length === 0) { setError('Add at least one product.'); return; }
    if (!orderDate) { setError('Order date is required.'); return; }

    setSaving(true);
    setError('');
    try {
      const input: CreatePOInput = {
        po_number: poNumber,
        order_date: orderDate,
        expected_dispatch: expectedDispatch,
        expected_arrival: expectedArrival,
        items: validItems,
      };
      await createPurchaseOrder(input);
      onCreated();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to create purchase order');
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* PO Info */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-xs text-slate-500 mb-1">PO Number</label>
          <input type="text" value={poNumber} onChange={e => setPoNumber(e.target.value)}
            className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-blue-400" />
        </div>
        <div>
          <label className="block text-xs text-slate-500 mb-1">Order Date *</label>
          <input type="date" value={orderDate} onChange={e => setOrderDate(e.target.value)}
            className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-blue-400" />
        </div>
        <div>
          <label className="block text-xs text-slate-500 mb-1">Expected Dispatch</label>
          <input type="date" value={expectedDispatch} onChange={e => setExpectedDispatch(e.target.value)}
            className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-blue-400" />
        </div>
        <div>
          <label className="block text-xs text-slate-500 mb-1">Expected Arrival</label>
          <input type="date" value={expectedArrival} onChange={e => setExpectedArrival(e.target.value)}
            className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-blue-400" />
        </div>
      </div>

      {/* Line Items */}
      <div className="border-t border-slate-200 pt-4">
        <div className="flex items-center justify-between mb-3">
          <p className="text-sm font-medium text-slate-700">Products</p>
          <button type="button" onClick={addLine} className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700 font-medium">
            <Plus className="w-3 h-3" /> Add Product
          </button>
        </div>
        <div className="space-y-3">
          {items.map((item, idx) => (
            <div key={idx} className="flex items-end gap-3">
              <div className="flex-1">
                {idx === 0 && <label className="block text-xs text-slate-400 mb-1">Product</label>}
                <select
                  value={item.product_id}
                  onChange={e => updateLine(idx, 'product_id', e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-blue-400"
                >
                  <option value="">Select product...</option>
                  {products.map(p => <option key={p.id} value={p.id}>{p.name} ({p.sku})</option>)}
                </select>
              </div>
              <div className="w-24">
                {idx === 0 && <label className="block text-xs text-slate-400 mb-1">Qty</label>}
                <input type="number" min={1} value={item.quantity}
                  onChange={e => updateLine(idx, 'quantity', Number(e.target.value))}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-blue-400" />
              </div>
              {items.length > 1 && (
                <button type="button" onClick={() => removeLine(idx)} className="p-2 text-slate-300 hover:text-red-500 mb-0.5">
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          ))}
        </div>
      </div>

      {error && (
        <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
          <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      <div className="flex justify-end gap-3 pt-2 border-t border-slate-200">
        <button type="button" onClick={onClose} className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-lg">Cancel</button>
        <button type="submit" disabled={saving}
          className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50">
          {saving ? 'Creating...' : 'Create Purchase Order'}
        </button>
      </div>
    </form>
  );
}

// ---- Confirm Arrival Form ----

function ConfirmArrivalForm({ po, onClose, onConfirmed }: {
  po: PurchaseOrder;
  onClose: () => void;
  onConfirmed: () => void;
}) {
  const [actualQty, setActualQty] = useState(po.quantity);
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  async function handleConfirm() {
    setSaving(true);
    setError('');
    try {
      await confirmArrival(po.id, actualQty, notes);
      onConfirmed();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to confirm arrival');
      setSaving(false);
    }
  }

  const diff = actualQty - po.quantity;

  return (
    <div className="space-y-4">
      <div className="p-4 bg-slate-50 rounded-lg">
        <p className="text-sm font-medium text-slate-800">{po.product_name}</p>
        <p className="text-xs text-slate-500 mt-1">Ordered: {po.quantity} units</p>
      </div>

      <div>
        <label className="block text-xs text-slate-500 mb-1">Actual Quantity Received</label>
        <input type="number" min={0} value={actualQty}
          onChange={e => setActualQty(Number(e.target.value))}
          className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-blue-400" />
        {diff !== 0 && (
          <p className={`text-xs mt-1 ${diff < 0 ? 'text-amber-600' : 'text-emerald-600'}`}>
            {diff < 0 ? `${Math.abs(diff)} fewer than ordered` : `${diff} more than ordered`}
          </p>
        )}
      </div>

      <div>
        <label className="block text-xs text-slate-500 mb-1">Notes (scratch & dent, damages, etc.)</label>
        <textarea
          value={notes}
          onChange={e => setNotes(e.target.value)}
          rows={2}
          placeholder="e.g., 2 copies had damaged covers"
          className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-blue-400 resize-none"
        />
      </div>

      <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
        <p className="text-sm text-blue-700">
          This will add <strong>{actualQty}</strong> units to inventory for <strong>{po.product_name}</strong>.
        </p>
      </div>

      {error && (
        <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
          <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      <div className="flex justify-end gap-3 pt-2">
        <button onClick={onClose} className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-lg">Cancel</button>
        <button onClick={handleConfirm} disabled={saving}
          className="px-4 py-2 text-sm bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50">
          {saving ? 'Confirming...' : 'Confirm & Add to Inventory'}
        </button>
      </div>
    </div>
  );
}
