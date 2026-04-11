import React, { useState } from 'react';
import { Product } from '../lib/types';
import { collection, addDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { handleFirestoreError, OperationType } from '../lib/api';

interface AddProductFormProps {
  onClose: () => void;
  showToast: (msg: string) => void;
  allProducts: (Product & any)[];
}

export function AddProductForm({ onClose, showToast, allProducts }: AddProductFormProps) {
  const [f, setF] = useState({
    name: "", sku: "", category: "Paperback", basePrice: 0, productionCost: 0, shippingCost: 0,
    shippingSuppliesCost: 0, paCosts: 3.00, handlingFeeAddOn: 4.50, ttShopPrice: 0, freeShipping: 0,
    bookInventory: 0, bundlesInventory: 0, leadTime: 14, booksInBundle: "", bundles: ""
  });

  const isBundle = ["Bundle", "Book Box"].includes(f.category);
  const availableBundles = allProducts.filter(prod => ["Bundle", "Book Box"].includes(prod.category));
  const availableBooks = allProducts.filter(prod => !["Bundle", "Book Box"].includes(prod.category));

  const set = (k: string, v: any) => setF(prev => ({ ...prev, [k]: v }));
  const num = (k: keyof typeof f) => parseFloat(f[k] as string) || 0;

  const handleAdd = async () => {
    if (!f.name.trim()) return;
    
    try {
      const newProduct: Omit<Product, 'id'> = {
        name: f.name.trim(),
        sku: f.sku.trim() || f.name.trim(),
        category: f.category as any,
        basePrice: num("basePrice"),
        productionCost: num("productionCost"),
        shippingCost: num("shippingCost"),
        shippingSuppliesCost: num("shippingSuppliesCost"),
        paCosts: num("paCosts"),
        handlingFeeAddOn: num("handlingFeeAddOn"),
        ttShopPrice: num("ttShopPrice"),
        freeShipping: num("freeShipping"),
        bookStock: num("bookInventory"),
        booksPurchased: 0,
        bundlesPurchased: 0,
        purchasedViaBundles: 0,
        bookInventory: num("bookInventory"),
        bundlesInventory: num("bundlesInventory"),
        sixMonthBookSales: 0,
        sixMonthBundleSales: 0,
        csvAvgDaily: 0,
        csvReorderThreshold: 0,
        doNotReorder: false,
        leadTime: parseInt(f.leadTime as any) || 14,
        booksInBundle: isBundle ? f.booksInBundle : "",
        bundles: !isBundle ? f.bundles : "",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      await addDoc(collection(db, 'products'), newProduct);
      showToast(`Added "${f.name.trim()}" to inventory`);
      onClose();
    } catch (error) {
      console.error("Error adding product:", error);
      showToast("Error adding product");
      handleFirestoreError(error, OperationType.CREATE, 'products');
    }
  };

  const Field = ({ label, k, prefix, placeholder }: any) => (
    <div>
      <label className="block text-xs font-medium text-gray-600 mb-1">{label}</label>
      <div className="relative">
        {prefix && <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 text-sm">{prefix}</span>}
        <input
          type={typeof f[k as keyof typeof f] === "string" ? "text" : "number"}
          step="0.01"
          value={f[k as keyof typeof f]}
          onChange={e => set(k, e.target.value)}
          placeholder={placeholder}
          className={`w-full ${prefix ? 'pl-6' : 'px-2.5'} py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-100`}
        />
      </div>
    </div>
  );

  return (
    <div>
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="col-span-2"><Field label="Product Name" k="name" placeholder="e.g. Night Fury Deluxe Edition" /></div>
        <Field label="SKU" k="sku" placeholder="e.g. 9781958769XXX" />
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Category</label>
          <select value={f.category} onChange={e => set("category", e.target.value)} className="w-full px-2.5 py-2 border border-gray-200 rounded-lg text-sm">
            {["Paperback", "Hardcover", "Art Pack", "Bundle", "Book Box", "Omnibus"].map(c => <option key={c}>{c}</option>)}
          </select>
        </div>
      </div>
      <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Pricing</h4>
      <div className="grid grid-cols-3 gap-3 mb-4">
        <Field label="Base Price" k="basePrice" prefix="$" />
        <Field label="Production Cost" k="productionCost" prefix="$" />
        <Field label="Shipping Cost" k="shippingCost" prefix="$" />
        <Field label="Shipping Supplies" k="shippingSuppliesCost" prefix="$" />
        <Field label="PA Costs" k="paCosts" prefix="$" />
        <Field label="Handling Fee" k="handlingFeeAddOn" prefix="$" />
        <Field label="TT Shop Price" k="ttShopPrice" prefix="$" />
        <Field label="Free Shipping" k="freeShipping" prefix="$" />
        <Field label="Lead Time (days)" k="leadTime" />
      </div>
      <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Starting Inventory</h4>
      <div className="grid grid-cols-2 gap-3 mb-4">
        <Field label="Book Inventory" k="bookInventory" />
        <Field label="Bundles Inventory" k="bundlesInventory" />
      </div>
      
      {isBundle && (
        <div className="mb-4">
          <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Books in Bundle</h4>
          <div className="flex flex-wrap gap-2 max-h-48 overflow-y-auto p-3 border border-gray-200 rounded-lg bg-gray-50 shadow-inner">
            {availableBooks.map(b => {
              const isSelected = (f.booksInBundle || "").split(",").map(s => s.trim()).includes(b.name);
              return (
                <label key={b.id} className={`flex items-center gap-2 text-sm border px-3 py-1.5 rounded-md cursor-pointer transition-colors ${isSelected ? 'bg-brand-50 border-brand-200 text-brand-700' : 'bg-white border-gray-200 hover:bg-gray-50 text-gray-700'}`}>
                  <input 
                    type="checkbox" 
                    className="rounded text-brand-600 focus:ring-brand-500"
                    checked={isSelected}
                    onChange={(e) => {
                      const current = (f.booksInBundle || "").split(",").map(s => s.trim()).filter(Boolean);
                      let next;
                      if (e.target.checked) {
                        next = [...current, b.name];
                      } else {
                        next = current.filter(n => n !== b.name);
                      }
                      set("booksInBundle", next.join(", "));
                    }}
                  />
                  {b.name}
                </label>
              )
            })}
          </div>
        </div>
      )}

      {!isBundle && (
        <div className="mb-4">
          <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Part of Bundles</h4>
          <div className="flex flex-wrap gap-2 max-h-48 overflow-y-auto p-3 border border-gray-200 rounded-lg bg-gray-50 shadow-inner">
            {availableBundles.map(b => {
              const isSelected = (f.bundles || "").split(",").map(s => s.trim()).includes(b.name);
              return (
                <label key={b.id} className={`flex items-center gap-2 text-sm border px-3 py-1.5 rounded-md cursor-pointer transition-colors ${isSelected ? 'bg-brand-50 border-brand-200 text-brand-700' : 'bg-white border-gray-200 hover:bg-gray-50 text-gray-700'}`}>
                  <input 
                    type="checkbox" 
                    className="rounded text-brand-600 focus:ring-brand-500"
                    checked={isSelected}
                    onChange={(e) => {
                      const current = (f.bundles || "").split(",").map(s => s.trim()).filter(Boolean);
                      let next;
                      if (e.target.checked) {
                        next = [...current, b.name];
                      } else {
                        next = current.filter(n => n !== b.name);
                      }
                      set("bundles", next.join(", "));
                    }}
                  />
                  {b.name}
                </label>
              )
            })}
            {availableBundles.length === 0 && <span className="text-sm text-gray-500">No bundles available.</span>}
          </div>
        </div>
      )}

      <div className="flex gap-3 pt-2 border-t border-gray-200 mt-4">
        <button onClick={handleAdd} className="flex-1 px-4 py-2.5 bg-brand-500 text-white rounded-lg hover:bg-brand-600 font-medium text-sm">Add Product</button>
        <button onClick={onClose} className="flex-1 px-4 py-2.5 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 font-medium text-sm">Cancel</button>
      </div>
    </div>
  );
}
