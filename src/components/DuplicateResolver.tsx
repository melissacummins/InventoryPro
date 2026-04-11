import React, { useMemo, useState } from 'react';
import { Product } from '../lib/types';
import { deleteProduct } from '../lib/api';
import { Trash2, AlertCircle } from 'lucide-react';

export function DuplicateResolver({ products, onClose, showToast }: { products: Product[], onClose: () => void, showToast: (msg: string) => void }) {
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmId, setConfirmId] = useState<string | null>(null);

  const duplicates = useMemo(() => {
    const skuMap = new Map<string, Product[]>();
    products.forEach(p => {
      const sku = (p.sku || '').trim().toLowerCase();
      if (!sku) return;
      if (!skuMap.has(sku)) skuMap.set(sku, []);
      skuMap.get(sku)!.push(p);
    });
    
    const dups: { sku: string, items: Product[] }[] = [];
    skuMap.forEach((items, sku) => {
      if (items.length > 1) {
        dups.push({ sku, items });
      }
    });
    return dups;
  }, [products]);

  const handleDelete = async (id: string, name: string) => {
    if (confirmId !== id) {
      setConfirmId(id);
      setTimeout(() => setConfirmId(null), 3000);
      return;
    }
    
    setDeletingId(id);
    try {
      await deleteProduct(id);
      showToast(`Deleted duplicate: ${name}`);
    } catch (e) {
      showToast(`Failed to delete ${name}`);
    } finally {
      setDeletingId(null);
      setConfirmId(null);
    }
  };

  if (duplicates.length === 0) {
    return (
      <div className="p-8 text-center">
        <div className="w-12 h-12 bg-green-100 text-green-700 rounded-full flex items-center justify-center mx-auto mb-3">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
        </div>
        <h3 className="text-lg font-medium text-gray-900">No Duplicates Found</h3>
        <p className="text-gray-500 mt-1">All your product SKUs are unique.</p>
        <button onClick={onClose} className="mt-6 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 font-medium">Close</button>
      </div>
    );
  }

  return (
    <div className="max-h-[70vh] overflow-y-auto p-1">
      <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-lg flex items-start gap-3 text-amber-800 text-sm">
        <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
        <p>Found <strong>{duplicates.length}</strong> SKU(s) with multiple entries. Review the items below and delete the duplicates you don't want to keep.</p>
      </div>
      
      <div className="space-y-6">
        {duplicates.map(group => (
          <div key={group.sku} className="border border-gray-200 rounded-lg overflow-hidden">
            <div className="bg-gray-50 px-4 py-2 border-b border-gray-200 font-medium text-sm text-gray-700 flex justify-between">
              <span>SKU: <span className="font-bold text-gray-900">{group.sku.toUpperCase()}</span></span>
              <span className="text-gray-500">{group.items.length} items</span>
            </div>
            <div className="divide-y divide-gray-100">
              {group.items.map(item => (
                <div key={item.id} className="p-4 flex items-center justify-between hover:bg-gray-50 transition-colors">
                  <div>
                    <div className="font-medium text-gray-900">{item.name}</div>
                    <div className="text-xs text-gray-500 mt-0.5">
                      Category: {item.category} • Book Inv: {item.bookInventory} • Bundle Inv: {item.bundlesInventory}
                    </div>
                  </div>
                  <button
                    onClick={() => handleDelete(item.id, item.name)}
                    disabled={deletingId === item.id}
                    className={`px-3 py-1.5 text-xs font-medium rounded transition-colors flex items-center gap-1.5 disabled:opacity-50 ${
                      confirmId === item.id 
                        ? 'bg-red-600 text-white hover:bg-red-700' 
                        : 'text-red-600 hover:bg-red-50'
                    }`}
                  >
                    {deletingId === item.id ? (
                      <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin"></div>
                    ) : (
                      <Trash2 className="w-4 h-4" />
                    )}
                    {confirmId === item.id ? 'Confirm' : 'Delete'}
                  </button>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
