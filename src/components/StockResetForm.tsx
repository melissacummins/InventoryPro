import React, { useState } from 'react';
import { Product } from '../lib/types';
import { writeBatch, doc, collection } from 'firebase/firestore';
import { db } from '../firebase';
import { handleFirestoreError, OperationType } from '../lib/api';

interface StockResetFormProps {
  products: Product[];
  onClose: () => void;
  showToast: (msg: string) => void;
}

export function StockResetForm({ products, onClose, showToast }: StockResetFormProps) {
  const [resetData, setResetData] = useState(
    products.map(p => ({
      id: p.id, name: p.name, category: p.category,
      bookInventory: p.bookInventory, bundlesInventory: p.bundlesInventory,
      newBookInventory: "", newBundlesInventory: ""
    }))
  );
  const [filter, setFilter] = useState("");

  const visible = filter ? resetData.filter(r => r.name.toLowerCase().includes(filter.toLowerCase())) : resetData;

  const handleApply = async () => {
    try {
      const batch = writeBatch(db);
      let count = 0;

      for (const p of products) {
        const r = resetData.find(d => d.id === p.id);
        if (!r) continue;

        const updates: Partial<Product> = {};
        const orderData: any = {
          productId: p.id,
          type: "stock_reset",
          source: "Manual Reset",
          createdAt: new Date().toISOString()
        };
        let changed = false;

        if (r.newBookInventory !== "" && parseInt(r.newBookInventory) !== p.bookInventory) {
          updates.bookInventory = parseInt(r.newBookInventory) || 0;
          updates.bookStock = updates.bookInventory; // reset book stock to match
          
          const orderRef = doc(collection(db, 'orders'));
          batch.set(orderRef, {
            ...orderData,
            inventoryType: "book",
            quantity: Math.abs(updates.bookInventory - p.bookInventory),
            previousValue: p.bookInventory,
            newValue: updates.bookInventory,
            notes: "Book inventory reset"
          });
          
          changed = true;
          count++;
        }

        if (r.newBundlesInventory !== "" && parseInt(r.newBundlesInventory) !== p.bundlesInventory) {
          updates.bundlesInventory = parseInt(r.newBundlesInventory) || 0;
          
          const orderRef = doc(collection(db, 'orders'));
          batch.set(orderRef, {
            ...orderData,
            inventoryType: "bundle",
            quantity: Math.abs(updates.bundlesInventory - p.bundlesInventory),
            previousValue: p.bundlesInventory,
            newValue: updates.bundlesInventory,
            notes: "Bundle inventory reset"
          });

          changed = true;
          count++;
        }

        if (changed) {
          updates.updatedAt = new Date().toISOString();
          batch.update(doc(db, 'products', p.id), updates);
        }
      }

      if (count > 0) {
        await batch.commit();
        showToast(`Stock reset applied to ${count} field(s)`);
      }
      onClose();
    } catch (error) {
      console.error("Error applying stock reset:", error);
      showToast("Error applying stock reset");
      handleFirestoreError(error, OperationType.WRITE, 'batch: products/orders');
    }
  };

  const updateRow = (id: string, field: string, value: string) => {
    setResetData(prev => prev.map(r => r.id === id ? { ...r, [field]: value } : r));
  };

  return (
    <div>
      <p className="text-sm text-gray-600 mb-3">Use this to reconcile your inventory. Enter the actual count you have on hand for each product. Only filled-in fields will be updated. Leave blank to keep the current value.</p>
      <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 mb-4">
        <p className="text-sm text-amber-800"><strong>Tip:</strong> Go through your Bookvault records and physical stock, then type the real numbers here. This overwrites the current inventory with your actual count.</p>
      </div>
      <input type="text" placeholder="Filter products..." value={filter} onChange={e => setFilter(e.target.value)} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm mb-3 focus:outline-none focus:ring-2 focus:ring-brand-100" />
      <div className="max-h-[400px] overflow-y-auto border border-gray-200 rounded-lg">
        <table className="w-full text-sm">
          <thead className="sticky top-0 bg-gray-50 z-10">
            <tr className="border-b border-gray-200">
              <th className="text-left px-3 py-2 font-semibold text-gray-600">Product</th>
              <th className="text-center px-2 py-2 font-semibold text-gray-600 w-20">Current</th>
              <th className="text-center px-2 py-2 font-semibold text-gray-600 w-24">New Books</th>
              <th className="text-center px-2 py-2 font-semibold text-gray-600 w-24">New Bundles</th>
            </tr>
          </thead>
          <tbody>
            {visible.map(r => (
              <tr key={r.id} className="border-b border-gray-100 hover:bg-gray-50">
                <td className="px-3 py-2">
                  <div className="font-medium text-gray-900 text-xs">{r.name}</div>
                  <div className="text-xs text-gray-400">{r.category}</div>
                </td>
                <td className="px-2 py-2 text-center text-xs text-gray-500">
                  {["Bundle", "Book Box"].includes(r.category) ? `B:${r.bundlesInventory}` : r.bookInventory}
                </td>
                <td className="px-2 py-2">
                  {!["Bundle", "Book Box"].includes(r.category) && (
                    <input type="number" min="0" placeholder={r.bookInventory.toString()} value={r.newBookInventory}
                      onChange={e => updateRow(r.id, "newBookInventory", e.target.value)}
                      className="w-full px-2 py-1 border border-gray-200 rounded text-center text-sm focus:outline-none focus:ring-2 focus:ring-brand-100" />
                  )}
                </td>
                <td className="px-2 py-2">
                  {["Bundle", "Book Box"].includes(r.category) && (
                    <input type="number" min="0" placeholder={r.bundlesInventory.toString()} value={r.newBundlesInventory}
                      onChange={e => updateRow(r.id, "newBundlesInventory", e.target.value)}
                      className="w-full px-2 py-1 border border-gray-200 rounded text-center text-sm focus:outline-none focus:ring-2 focus:ring-brand-100" />
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="flex gap-3 pt-4">
        <button onClick={handleApply} className="flex-1 px-4 py-2.5 bg-brand-500 text-white rounded-lg hover:bg-brand-600 font-medium text-sm">Apply Stock Reset</button>
        <button onClick={onClose} className="flex-1 px-4 py-2.5 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 font-medium text-sm">Cancel</button>
      </div>
    </div>
  );
}
