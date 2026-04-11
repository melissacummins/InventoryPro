import React, { useState, useEffect } from 'react';
import { collection, query, orderBy, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';
import { PurchaseOrder } from '../lib/types';
import { useProducts } from '../hooks/useProducts';
import { createPurchaseOrder, markPurchaseOrderArrived, deletePurchaseOrder, handleFirestoreError, OperationType } from '../lib/api';
import { format, differenceInDays } from 'date-fns';
import { Truck, Plus, CheckCircle, Trash2 } from 'lucide-react';
import { Modal } from '../components/Modal';

export default function PurchaseOrders() {
  const [orders, setOrders] = useState<PurchaseOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const { products } = useProducts();

  const [form, setForm] = useState({
    items: [{ productId: '', quantity: 100 }],
    orderDate: format(new Date(), 'yyyy-MM-dd'),
    expectedDispatch: format(new Date(Date.now() + 14 * 86400000), 'yyyy-MM-dd'),
    expectedArrival: format(new Date(Date.now() + 45 * 86400000), 'yyyy-MM-dd')
  });

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  useEffect(() => {
    const q = query(collection(db, 'purchaseOrders'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const ords: PurchaseOrder[] = [];
      snapshot.forEach((doc) => {
        ords.push({ id: doc.id, ...doc.data() } as PurchaseOrder);
      });
      setOrders(ords);
      setLoading(false);
    }, (error) => {
      console.error("Error fetching purchase orders:", error);
      setLoading(false);
      handleFirestoreError(error, OperationType.GET, 'purchaseOrders');
    });
    return unsubscribe;
  }, []);

  const handleAddItem = () => {
    setForm({
      ...form,
      items: [...form.items, { productId: '', quantity: 100 }]
    });
  };

  const handleRemoveItem = (index: number) => {
    const newItems = [...form.items];
    newItems.splice(index, 1);
    setForm({ ...form, items: newItems });
  };

  const handleItemChange = (index: number, field: 'productId' | 'quantity', value: any) => {
    const newItems = [...form.items];
    newItems[index] = { ...newItems[index], [field]: value };
    setForm({ ...form, items: newItems });
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const validItems = form.items.filter(item => item.productId && item.quantity > 0);
    if (validItems.length === 0) {
      showToast('Please add at least one valid product.');
      return;
    }

    let createdCount = 0;
    for (const item of validItems) {
      const product = products.find(p => p.id === item.productId);
      if (!product) continue;

      await createPurchaseOrder({
        productId: item.productId,
        productName: product.name,
        quantity: item.quantity,
        orderDate: form.orderDate,
        expectedDispatch: form.expectedDispatch,
        expectedArrival: form.expectedArrival,
        status: 'pending'
      });
      createdCount++;
    }
    
    showToast(`Created ${createdCount} purchase order${createdCount !== 1 ? 's' : ''}`);
    setShowAdd(false);
    setForm({
      items: [{ productId: '', quantity: 100 }],
      orderDate: format(new Date(), 'yyyy-MM-dd'),
      expectedDispatch: format(new Date(Date.now() + 14 * 86400000), 'yyyy-MM-dd'),
      expectedArrival: format(new Date(Date.now() + 45 * 86400000), 'yyyy-MM-dd')
    });
  };

  const handleMarkArrived = async (po: PurchaseOrder) => {
    const product = products.find(p => p.id === po.productId);
    if (!product) {
      showToast('Product not found in inventory');
      return;
    }
    const today = format(new Date(), 'yyyy-MM-dd');
    await markPurchaseOrderArrived(po, today, product);
    showToast(`Marked as arrived. Added ${po.quantity} to ${product.name}`);
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this purchase order?')) {
      await deletePurchaseOrder(id);
      showToast('Purchase order deleted');
    }
  };

  if (loading) {
    return <div className="flex justify-center items-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-600"></div></div>;
  }

  return (
    <div>
      {toast && <div className="fixed top-4 right-4 z-[60] bg-gray-900 text-white px-4 py-2.5 rounded-lg shadow-lg text-sm animate-in fade-in slide-in-from-top-4">{toast}</div>}

      <div className="flex items-center justify-between gap-3 mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-brand-100 text-brand-700 rounded-lg">
            <Truck className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Purchase Orders</h2>
            <p className="text-sm text-gray-500 mt-1">Track inbound shipments and automatically update stock upon arrival.</p>
          </div>
        </div>
        <button onClick={() => setShowAdd(true)} className="px-3 py-2 bg-brand-600 text-white rounded-lg hover:bg-brand-700 font-medium text-sm flex items-center gap-1.5 transition-colors shadow-sm">
          <Plus className="w-4 h-4" /> New PO
        </button>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Product</th>
                <th className="text-right px-3 py-3 font-semibold text-gray-600">Qty</th>
                <th className="text-left px-3 py-3 font-semibold text-gray-600">Order Date</th>
                <th className="text-left px-3 py-3 font-semibold text-gray-600">Expected Dispatch</th>
                <th className="text-left px-3 py-3 font-semibold text-gray-600">Expected Arrival</th>
                <th className="text-left px-3 py-3 font-semibold text-gray-600">Status</th>
                <th className="text-left px-3 py-3 font-semibold text-gray-600">Days Taken</th>
                <th className="text-right px-4 py-3 font-semibold text-gray-600">Actions</th>
              </tr>
            </thead>
            <tbody>
              {orders.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-gray-500">
                    No purchase orders found.
                  </td>
                </tr>
              ) : (
                orders.map(order => {
                  const daysTaken = order.actualArrival 
                    ? differenceInDays(new Date(order.actualArrival), new Date(order.orderDate))
                    : differenceInDays(new Date(), new Date(order.orderDate));

                  return (
                    <tr key={order.id} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="px-4 py-3 font-medium text-gray-900">
                        {order.productName}
                      </td>
                      <td className="px-3 py-3 text-right font-medium text-gray-900">
                        {order.quantity}
                      </td>
                      <td className="px-3 py-3 text-gray-500">
                        {order.orderDate}
                      </td>
                      <td className="px-3 py-3 text-gray-500">
                        {order.expectedDispatch}
                      </td>
                      <td className="px-3 py-3 text-gray-500">
                        {order.expectedArrival}
                      </td>
                      <td className="px-3 py-3">
                        <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${
                          order.status === 'arrived' ? 'bg-green-100 text-green-800' : 'bg-amber-100 text-amber-800'
                        }`}>
                          {order.status.toUpperCase()}
                        </span>
                      </td>
                      <td className="px-3 py-3 text-gray-500">
                        {daysTaken} days {order.status === 'pending' && '(so far)'}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {order.status === 'pending' && (
                            <button 
                              onClick={() => handleMarkArrived(order)}
                              className="p-1.5 text-green-600 hover:bg-green-50 rounded transition-colors"
                              title="Mark as Arrived (Updates Stock)"
                            >
                              <CheckCircle className="w-4 h-4" />
                            </button>
                          )}
                          <button 
                            onClick={() => handleDelete(order.id)}
                            className="p-1.5 text-red-600 hover:bg-red-50 rounded transition-colors"
                            title="Delete PO"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showAdd && (
        <Modal title="New Purchase Order" onClose={() => setShowAdd(false)} wide>
          <form onSubmit={handleAdd} className="space-y-4">
            <div className="space-y-3">
              <label className="block text-sm font-medium text-gray-700">Products</label>
              {form.items.map((item, index) => (
                <div key={index} className="flex gap-2 items-start">
                  <div className="flex-1">
                    <select required value={item.productId} onChange={e => handleItemChange(index, 'productId', e.target.value)} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm">
                      <option value="">Select a product...</option>
                      {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
                  </div>
                  <div className="w-24">
                    <input required type="number" min="1" value={item.quantity} onChange={e => handleItemChange(index, 'quantity', parseInt(e.target.value))} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm" placeholder="Qty" />
                  </div>
                  {form.items.length > 1 && (
                    <button type="button" onClick={() => handleRemoveItem(index)} className="p-2 text-red-500 hover:bg-red-50 rounded-lg">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
              <button type="button" onClick={handleAddItem} className="text-sm text-brand-600 hover:text-brand-700 font-medium flex items-center gap-1">
                <Plus className="w-4 h-4" /> Add another product
              </button>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4 border-t border-gray-100">
              <div className="flex flex-col justify-end">
                <label className="block text-sm font-medium text-gray-700 mb-1">Order Date</label>
                <input required type="date" value={form.orderDate} onChange={e => setForm({...form, orderDate: e.target.value})} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm" />
              </div>
              <div className="flex flex-col justify-end">
                <label className="block text-sm font-medium text-gray-700 mb-1 whitespace-nowrap">Expected Dispatch</label>
                <input required type="date" value={form.expectedDispatch} onChange={e => setForm({...form, expectedDispatch: e.target.value})} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm" />
              </div>
              <div className="flex flex-col justify-end">
                <label className="block text-sm font-medium text-gray-700 mb-1 whitespace-nowrap">Expected Arrival</label>
                <input required type="date" value={form.expectedArrival} onChange={e => setForm({...form, expectedArrival: e.target.value})} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm" />
              </div>
            </div>
            <div className="flex gap-3 pt-4">
              <button type="submit" className="flex-1 px-4 py-2 bg-brand-600 text-white rounded-lg font-medium text-sm hover:bg-brand-700">Create PO</button>
              <button type="button" onClick={() => setShowAdd(false)} className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg font-medium text-sm hover:bg-gray-200">Cancel</button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
