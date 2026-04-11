import React, { useState, useEffect } from 'react';
import { collection, query, orderBy, onSnapshot, doc, writeBatch } from 'firebase/firestore';
import { db } from '../firebase';
import { format } from 'date-fns';
import { Upload, Trash2 } from 'lucide-react';
import { Modal } from './Modal';
import { CSVImporter } from './CSVImporter';
import { useProducts } from '../hooks/useProducts';
import { Product } from '../lib/types';
import { handleFirestoreError, OperationType } from '../lib/api';

export function Orders() {
  const [orders, setOrders] = useState<any[]>([]);
  const [showImport, setShowImport] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const { products } = useProducts();

  const showToast = (msg: string) => { 
    setToast(msg); 
    setTimeout(() => setToast(null), 3000); 
  };

  useEffect(() => {
    const q = query(collection(db, 'orders'), orderBy('createdAt', 'desc'));
    const unsub = onSnapshot(q, (snap) => {
      const allOrders = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setOrders(allOrders.filter((o: any) => o.type === 'csv_import'));
    });
    return unsub;
  }, []);

  const handleDeleteOrder = async (order: any) => {
    // We use a custom modal or just window.confirm for simplicity, but since window.confirm doesn't work well in iframes, we'll just delete it directly or add a small confirm state.
    // Actually, we can use window.confirm if it's opened in a new tab, but let's just do a direct delete for now or a simple confirm.
    // Wait, the instructions say: "Do NOT use confirm(), window.confirm(), alert() or window.alert() in the code. The code is running in an iframe and the user will NOT see the confirmation dialog or alerts. Instead, use custom modal UI for these."
    setOrderToDelete(order);
  };

  const [orderToDelete, setOrderToDelete] = useState<any | null>(null);

  const confirmDelete = async () => {
    if (!orderToDelete) return;
    const order = orderToDelete;
    setOrderToDelete(null);

    try {
      const batch = writeBatch(db);
      const p = products.find(prod => prod.id === order.productId);
      
      if (p) {
        const isBundle = ["Bundle", "Book Box"].includes(p.category);
        const updates: Partial<Product> = { updatedAt: new Date().toISOString() };
        const qty = order.quantity;

        if (isBundle) {
          updates.sixMonthBundleSales = Math.max(0, (p.sixMonthBundleSales || 0) - qty);
          updates.bundlesInventory = (p.bundlesInventory || 0) + qty;
          
          const componentBookNames = (p.booksInBundle || "").split(",").map(s => s.trim()).filter(Boolean);
          const componentBooks = products.filter(prod => componentBookNames.includes(prod.name));
          for (const comp of componentBooks) {
            const compUpdates: Partial<Product> = {};
            compUpdates.purchasedViaBundles = Math.max(0, (comp.purchasedViaBundles || 0) - qty);
            compUpdates.bookInventory = (comp.bookStock || 0) - (comp.booksPurchased || 0) - compUpdates.purchasedViaBundles;
            batch.update(doc(db, 'products', comp.id), compUpdates);
          }
        } else {
          updates.sixMonthBookSales = Math.max(0, (p.sixMonthBookSales || 0) - qty);
          updates.booksPurchased = Math.max(0, (p.booksPurchased || 0) - qty);
          updates.bookInventory = (p.bookStock || 0) - updates.booksPurchased - (p.purchasedViaBundles || 0);
        }
        
        batch.update(doc(db, 'products', p.id), updates);
      }
      
      batch.delete(doc(db, 'orders', order.id));
      await batch.commit();
      showToast("Order deleted and inventory reverted");
    } catch (e) {
      console.error(e);
      showToast("Error deleting order");
      handleFirestoreError(e, OperationType.DELETE, 'orders');
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden relative">
      {toast && <div className="absolute top-4 right-4 z-[60] bg-gray-900 text-white px-4 py-2.5 rounded-lg shadow-lg text-sm animate-in fade-in slide-in-from-top-4">{toast}</div>}
      <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Orders History</h2>
          <p className="text-sm text-gray-500">History of all imported orders and sales.</p>
        </div>
        <button onClick={() => setShowImport(true)} className="px-3 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium text-sm flex items-center gap-1.5 transition-colors shadow-sm">
          <Upload className="w-4 h-4" /> Import CSV
        </button>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm text-left">
          <thead className="bg-gray-50 text-gray-500 font-medium border-b border-gray-200">
            <tr>
              <th className="px-6 py-3">Date</th>
              <th className="px-6 py-3">Source</th>
              <th className="px-6 py-3">Product</th>
              <th className="px-6 py-3">Type</th>
              <th className="px-6 py-3">Qty</th>
              <th className="px-6 py-3">Notes</th>
              <th className="px-6 py-3">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {orders.map(o => {
              const product = products.find(p => p.id === o.productId);
              return (
                <tr key={o.id} className="hover:bg-gray-50">
                  <td className="px-6 py-3">{format(new Date(o.createdAt), 'MMM d, yyyy HH:mm')}</td>
                  <td className="px-6 py-3">{o.source}</td>
                  <td className="px-6 py-3">{product ? product.name : o.productId}</td>
                  <td className="px-6 py-3">{o.inventoryType}</td>
                  <td className="px-6 py-3 font-medium text-gray-900">{o.quantity}</td>
                  <td className="px-6 py-3 text-gray-500">{o.notes}</td>
                  <td className="px-6 py-3">
                    <button onClick={() => handleDeleteOrder(o)} className="text-red-500 hover:text-red-700 p-1 rounded hover:bg-red-50 transition-colors">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              );
            })}
            {orders.length === 0 && (
              <tr>
                <td colSpan={7} className="px-6 py-8 text-center text-gray-500">No orders found.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {showImport && (
        <Modal title="Import Shopify Orders CSV" onClose={() => setShowImport(false)} wide>
          <CSVImporter products={products} onClose={() => setShowImport(false)} showToast={showToast} />
        </Modal>
      )}

      {orderToDelete && (
        <Modal title="Confirm Deletion" onClose={() => setOrderToDelete(null)}>
          <div className="p-4">
            <p className="text-gray-700 mb-6">Are you sure you want to delete this order? This will revert the inventory changes associated with it.</p>
            <div className="flex justify-end gap-3">
              <button onClick={() => setOrderToDelete(null)} className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg font-medium text-sm transition-colors">Cancel</button>
              <button onClick={confirmDelete} className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 font-medium text-sm transition-colors">Delete Order</button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
