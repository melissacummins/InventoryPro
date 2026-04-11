import React, { useState, useEffect } from 'react';
import { collection, query, orderBy, onSnapshot, limit } from 'firebase/firestore';
import { db } from '../firebase';
import { Order, Product } from '../lib/types';
import { useProducts } from '../hooks/useProducts';
import { format } from 'date-fns';
import { History, Upload } from 'lucide-react';
import { handleFirestoreError, OperationType } from '../lib/api';
import { Modal } from '../components/Modal';
import { CSVImporter } from '../components/CSVImporter';

export default function InventoryLog() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [showImport, setShowImport] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const { products } = useProducts();

  const showToast = (msg: string) => { 
    setToast(msg); 
    setTimeout(() => setToast(null), 3000); 
  };

  useEffect(() => {
    const q = query(collection(db, 'orders'), orderBy('createdAt', 'desc'), limit(500));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const ords: Order[] = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        if (data.type !== 'csv_import') {
          ords.push({ id: doc.id, ...data } as Order);
        }
      });
      setOrders(ords);
      setLoading(false);
    }, (error) => {
      console.error("Error fetching orders:", error);
      setLoading(false);
      handleFirestoreError(error, OperationType.GET, 'orders');
    });

    return unsubscribe;
  }, []);

  const getProductName = (productId: string) => {
    const p = products.find(p => p.id === productId);
    return p ? p.name : 'Unknown Product';
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
            <History className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Inventory Log</h2>
            <p className="text-sm text-gray-500 mt-1">Log of all manual adjustments, CSV imports, and stock resets.</p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Date</th>
                <th className="text-left px-3 py-3 font-semibold text-gray-600">Product</th>
                <th className="text-left px-3 py-3 font-semibold text-gray-600">Type</th>
                <th className="text-right px-3 py-3 font-semibold text-gray-600">Change</th>
                <th className="text-right px-3 py-3 font-semibold text-gray-600">Before</th>
                <th className="text-right px-3 py-3 font-semibold text-gray-600">After</th>
                <th className="text-left px-3 py-3 font-semibold text-gray-600">Source</th>
              </tr>
            </thead>
            <tbody>
              {orders.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-gray-500">
                    No inventory history found.
                  </td>
                </tr>
              ) : (
                orders.map(order => (
                  <tr key={order.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="px-4 py-3 text-gray-500 whitespace-nowrap">
                      {format(new Date(order.createdAt), 'MMM d, yyyy HH:mm')}
                    </td>
                    <td className="px-3 py-3 font-medium text-gray-900">
                      {getProductName(order.productId)}
                    </td>
                    <td className="px-3 py-3">
                      <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${
                        order.type === 'add' ? 'bg-green-100 text-green-800' :
                        order.type === 'subtract' ? 'bg-red-100 text-red-800' :
                        order.type === 'csv_import' ? 'bg-blue-100 text-blue-800' :
                        'bg-amber-100 text-amber-800'
                      }`}>
                        {order.type.replace('_', ' ').toUpperCase()}
                      </span>
                      <span className="ml-2 text-xs text-gray-400">({order.inventoryType})</span>
                    </td>
                    <td className={`px-3 py-3 text-right font-medium ${
                      order.type === 'add' ? 'text-green-600' : 
                      order.type === 'subtract' || order.type === 'csv_import' ? 'text-red-600' : 
                      'text-gray-900'
                    }`}>
                      {order.type === 'add' ? '+' : order.type === 'stock_reset' ? '' : '-'}{order.quantity}
                    </td>
                    <td className="px-3 py-3 text-right text-gray-500">{order.previousValue}</td>
                    <td className="px-3 py-3 text-right font-medium text-gray-900">{order.newValue}</td>
                    <td className="px-3 py-3 text-gray-500 text-xs truncate max-w-[150px]" title={order.source}>
                      {order.source || 'Manual'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
