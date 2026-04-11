import React, { useState } from 'react';
import { Product } from '../lib/types';
import { writeBatch, doc, collection } from 'firebase/firestore';
import { db } from '../firebase';
import { handleFirestoreError, OperationType } from '../lib/api';

interface WipeSalesFormProps {
  products: Product[];
  onClose: () => void;
  showToast: (msg: string) => void;
}

export function WipeSalesForm({ products, onClose, showToast }: WipeSalesFormProps) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [filter, setFilter] = useState("");

  const visible = filter ? products.filter(p => p.name.toLowerCase().includes(filter.toLowerCase())) : products;

  const toggleSelect = (id: string) => {
    const newSet = new Set(selectedIds);
    if (newSet.has(id)) newSet.delete(id);
    else newSet.add(id);
    setSelectedIds(newSet);
  };

  const selectAll = () => {
    if (selectedIds.size === visible.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(visible.map(p => p.id)));
    }
  };

  const handleApply = async () => {
    if (selectedIds.size === 0) return;

    try {
      const batch = writeBatch(db);
      let count = 0;

      for (const id of selectedIds) {
        const p = products.find(prod => prod.id === id);
        if (!p) continue;

        const updates: Partial<Product> = {
          booksPurchased: 0,
          purchasedViaBundles: 0,
          bookInventory: p.bookStock || 0, // Recalculate book inventory
          updatedAt: new Date().toISOString()
        };

        batch.update(doc(db, 'products', p.id), updates);

        const orderRef = doc(collection(db, 'orders'));
        batch.set(orderRef, {
          productId: p.id,
          type: "stock_reset",
          inventoryType: "book",
          source: "Wipe Sales Data",
          quantity: 0,
          previousValue: p.bookInventory,
          newValue: updates.bookInventory,
          notes: "Wiped booksPurchased and purchasedViaBundles",
          createdAt: new Date().toISOString()
        });

        count++;
      }

      await batch.commit();
      showToast(`Wiped sales data for ${count} product(s)`);
      onClose();
    } catch (error) {
      console.error("Error wiping sales data:", error);
      showToast("Error wiping sales data");
      handleFirestoreError(error, OperationType.WRITE, 'batch: products/orders');
    }
  };

  return (
    <div className="flex flex-col h-[70vh]">
      <div className="mb-4">
        <p className="text-sm text-gray-600 mb-4">
          Select products to reset their <strong>Books Purchased</strong> and <strong>Purchased via Bundles</strong> to 0. This will automatically recalculate their <strong>Book Inventory</strong> to match their Book Stock.
        </p>
        <input 
          type="text" 
          placeholder="Filter products..." 
          value={filter} 
          onChange={e => setFilter(e.target.value)}
          className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-100"
        />
      </div>

      <div className="flex-1 overflow-y-auto border border-gray-200 rounded-lg">
        <table className="w-full text-sm text-left">
          <thead className="bg-gray-50 sticky top-0 shadow-sm">
            <tr>
              <th className="px-4 py-3 border-b border-gray-200 w-10">
                <input 
                  type="checkbox" 
                  checked={selectedIds.size === visible.length && visible.length > 0}
                  onChange={selectAll}
                  className="rounded border-gray-300 text-brand-600 focus:ring-brand-500"
                />
              </th>
              <th className="px-4 py-3 border-b border-gray-200 font-medium text-gray-700">Product</th>
              <th className="px-4 py-3 border-b border-gray-200 font-medium text-gray-700 text-right">Books Purchased</th>
              <th className="px-4 py-3 border-b border-gray-200 font-medium text-gray-700 text-right">Purchased via Bundles</th>
              <th className="px-4 py-3 border-b border-gray-200 font-medium text-gray-700 text-right">Current Inventory</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {visible.map(p => (
              <tr key={p.id} className="hover:bg-gray-50 cursor-pointer" onClick={() => toggleSelect(p.id)}>
                <td className="px-4 py-3">
                  <input 
                    type="checkbox" 
                    checked={selectedIds.has(p.id)}
                    onChange={() => {}} // Handled by tr onClick
                    className="rounded border-gray-300 text-brand-600 focus:ring-brand-500"
                  />
                </td>
                <td className="px-4 py-3 font-medium text-gray-900">{p.name}</td>
                <td className="px-4 py-3 text-right text-gray-500">{p.booksPurchased || 0}</td>
                <td className="px-4 py-3 text-right text-gray-500">{p.purchasedViaBundles || 0}</td>
                <td className="px-4 py-3 text-right font-medium text-gray-900">{p.bookInventory}</td>
              </tr>
            ))}
            {visible.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-gray-500">No products found.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="mt-6 flex justify-end gap-3 pt-4 border-t border-gray-100">
        <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 border border-gray-300 rounded-lg transition-colors">
          Cancel
        </button>
        <button 
          onClick={handleApply} 
          disabled={selectedIds.size === 0}
          className="px-4 py-2 text-sm font-medium text-white bg-brand-600 hover:bg-brand-700 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Wipe Selected ({selectedIds.size})
        </button>
      </div>
    </div>
  );
}
