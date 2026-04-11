import React, { useState, useRef } from 'react';
import Papa from 'papaparse';
import { Product } from '../lib/types';
import { writeBatch, doc, collection } from 'firebase/firestore';
import { db } from '../firebase';
import { handleFirestoreError, OperationType } from '../lib/api';

interface CSVImporterProps {
  products: Product[];
  onClose: () => void;
  showToast: (msg: string) => void;
}

export function CSVImporter({ products, onClose, showToast }: CSVImporterProps) {
  const [dragActive, setDragActive] = useState(false);
  const [result, setResult] = useState<any>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = (file: File) => {
    if (file && (file.name.endsWith('.csv') || file.type === 'text/csv')) {
      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        complete: async (results) => {
          const rows = results.data as any[];
          let matched = 0, unmatched = 0;
          const unmatchedNames: string[] = [];
          const orderMap: Record<string, number> = {};
          const regionMap: Record<string, number> = {};

          rows.forEach(rawRow => {
            // Create a case-insensitive row object
            const row: Record<string, any> = {};
            for (const key in rawRow) {
              row[key.toLowerCase().trim()] = rawRow[key];
            }

            const itemName = (row["lineitem name"] || row["lineitem_name"] || row["product"] || row["product title"] || row["product_title"] || row["title"] || "").trim();
            const skuVal = (row["lineitem sku"] || row["lineitem_sku"] || row["product variant sku"] || row["sku"] || row["variant sku"] || "").trim();
            const qtyStr = row["lineitem quantity"] || row["lineitem_quantity"] || row["orders"] || row["quantity"] || "1";
            const qty = parseInt(qtyStr) || 1;
            
            const state = (row["shipping province"] || row["shipping province name"] || row["shipping region"] || row["shipping_province"] || "").trim();
            const country = (row["shipping country"] || row["shipping_country"] || "").trim();

            if (!itemName && !skuVal) return;

            const normalize = (str: string) => (str || "").toLowerCase().replace(/[^a-z0-9]/g, '');

            const product = products.find(p => {
              const pName = (p.name || "").toLowerCase();
              const pSku = (p.sku || "").toLowerCase();
              const iName = itemName.toLowerCase();
              const iSku = skuVal.toLowerCase();
              
              const pNameNorm = normalize(p.name);
              const pSkuNorm = normalize(p.sku);
              const iNameNorm = normalize(itemName);
              const iSkuNorm = normalize(skuVal);
              
              // If CSV has a SKU, strictly match by SKU
              if (iSku) {
                return pSku && (iSku === pSku || iSkuNorm === pSkuNorm);
              }
              
              // If CSV has NO SKU, match by exact name only (no partial matches)
              if (iName && pName) {
                return pName === iName || pNameNorm === iNameNorm;
              }
              
              return false;
            });

            if (product) {
              orderMap[product.id] = (orderMap[product.id] || 0) + qty;
              matched += qty;
              
              if (state || country) {
                const regionKey = state ? `${state}, ${country || 'US'}` : country;
                if (regionKey) {
                  regionMap[regionKey] = (regionMap[regionKey] || 0) + qty;
                }
              }
            } else {
              unmatched += qty;
              if (itemName && !unmatchedNames.includes(itemName)) unmatchedNames.push(itemName);
            }
          });

          try {
            const batch = writeBatch(db);
            
            for (const [productId, qty] of Object.entries(orderMap)) {
              const p = products.find(prod => prod.id === productId);
              if (!p) continue;

              const isBundle = ["Bundle", "Book Box"].includes(p.category);
              const updates: Partial<Product> = { updatedAt: new Date().toISOString() };
              
              const orderRef = doc(collection(db, 'orders'));
              const orderData: any = {
                productId: p.id,
                type: "csv_import",
                source: file.name,
                quantity: qty,
                notes: "Shopify CSV Import",
                createdAt: new Date().toISOString()
              };

              if (isBundle) {
                updates.sixMonthBundleSales = (p.sixMonthBundleSales || 0) + qty;
                updates.bundlesInventory = Math.max(0, (p.bundlesInventory || 0) - qty);
                updates.csvAvgDaily = 0;
                orderData.inventoryType = "bundle";
                orderData.previousValue = p.bundlesInventory || 0;
                orderData.newValue = updates.bundlesInventory;

                // Update component books
                const componentBookNames = (p.booksInBundle || "").split(",").map(s => s.trim()).filter(Boolean);
                const componentBooks = products.filter(prod => componentBookNames.includes(prod.name));
                for (const comp of componentBooks) {
                  const compUpdates: Partial<Product> = {};
                  compUpdates.purchasedViaBundles = (comp.purchasedViaBundles || 0) + qty;
                  compUpdates.bookInventory = Math.max(0, (comp.bookStock || 0) - (comp.booksPurchased || 0) - compUpdates.purchasedViaBundles);
                  batch.update(doc(db, 'products', comp.id), compUpdates);
                }
              } else {
                updates.sixMonthBookSales = (p.sixMonthBookSales || 0) + qty;
                updates.booksPurchased = (p.booksPurchased || 0) + qty;
                updates.bookInventory = Math.max(0, (p.bookStock || 0) - updates.booksPurchased - (p.purchasedViaBundles || 0));
                updates.csvAvgDaily = 0;
                orderData.inventoryType = "book";
                orderData.previousValue = p.bookInventory || 0;
                orderData.newValue = updates.bookInventory;
              }

              batch.update(doc(db, 'products', p.id), updates);
              batch.set(orderRef, orderData);
            }

            // Save region data
            for (const [region, count] of Object.entries(regionMap)) {
              const regionRef = doc(collection(db, 'salesRegions'));
              batch.set(regionRef, {
                region,
                count,
                importDate: new Date().toISOString()
              });
            }

            await batch.commit();
            setResult({ matched, unmatched, unmatchedNames, total: rows.length });
            showToast(`Imported ${matched} items from CSV`);
          } catch (error) {
            console.error("Error importing CSV:", error);
            showToast("Error importing CSV");
            handleFirestoreError(error, OperationType.WRITE, 'batch: products/orders');
          }
        }
      });
    }
  };

  return (
    <div>
      <p className="text-sm text-gray-600 mb-4">Drop a Shopify orders CSV export here. The importer matches line items by product name or SKU and subtracts sold quantities from your inventory.</p>
      <div 
        className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${dragActive ? 'border-brand-500 bg-brand-50' : 'border-gray-300 hover:border-gray-400'}`}
        onDragOver={e => { e.preventDefault(); setDragActive(true); }} 
        onDragLeave={() => setDragActive(false)}
        onDrop={e => { e.preventDefault(); setDragActive(false); if (e.dataTransfer.files[0]) handleFile(e.dataTransfer.files[0]); }}
        onClick={() => inputRef.current?.click()}
      >
        <svg className="w-10 h-10 mx-auto text-gray-400 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" /></svg>
        <p className="text-sm font-medium text-gray-700">Drop CSV file here or click to browse</p>
        <p className="text-xs text-gray-400 mt-1">Supports Shopify order export format</p>
        <input ref={inputRef} type="file" accept=".csv" className="hidden" onChange={e => { if (e.target.files?.[0]) handleFile(e.target.files[0]); }} />
      </div>
      {result && (
        <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg animate-in fade-in">
          <p className="text-sm font-semibold text-green-800">Import Complete</p>
          <p className="text-sm text-green-700 mt-1">{result.matched} items matched and inventory updated.</p>
          {result.unmatched > 0 && (
            <div className="mt-2">
              <p className="text-sm text-amber-700">{result.unmatched} items could not be matched:</p>
              <ul className="mt-1 text-xs text-amber-600">
                {result.unmatchedNames.slice(0, 8).map((n: string, i: number) => <li key={i} className="truncate">&bull; {n}</li>)}
                {result.unmatchedNames.length > 8 && <li>...and {result.unmatchedNames.length - 8} more</li>}
              </ul>
            </div>
          )}
        </div>
      )}
      <div className="mt-4 flex justify-end">
        <button onClick={onClose} className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 font-medium text-sm">Close</button>
      </div>
    </div>
  );
}
