import React, { useState, useRef } from 'react';
import { Upload, CheckCircle, AlertCircle, Loader2, FileText } from 'lucide-react';
import { supabase } from '../../../lib/supabase';

// Map camelCase Firebase fields to snake_case Supabase fields
function mapProduct(d: any) {
  return {
    name: d.name || '',
    sku: d.sku || '',
    category: d.category || 'Paperback',
    base_price: d.basePrice ?? d.base_price ?? 0,
    production_cost: d.productionCost ?? d.production_cost ?? 0,
    shipping_cost: d.shippingCost ?? d.shipping_cost ?? 0,
    shipping_supplies_cost: d.shippingSuppliesCost ?? d.shipping_supplies_cost ?? 0,
    pa_costs: d.paCosts ?? d.pa_costs ?? 0,
    handling_fee_add_on: d.handlingFeeAddOn ?? d.handling_fee_add_on ?? 0,
    tt_shop_price: d.ttShopPrice ?? d.tt_shop_price ?? 0,
    free_shipping: d.freeShipping ?? d.free_shipping ?? 0,
    book_stock: d.bookStock ?? d.book_stock ?? 0,
    books_purchased: d.booksPurchased ?? d.books_purchased ?? 0,
    bundles_purchased: d.bundlesPurchased ?? d.bundles_purchased ?? 0,
    purchased_via_bundles: d.purchasedViaBundles ?? d.purchased_via_bundles ?? 0,
    book_inventory: d.bookInventory ?? d.book_inventory ?? 0,
    bundles_inventory: d.bundlesInventory ?? d.bundles_inventory ?? 0,
    six_month_book_sales: d.sixMonthBookSales ?? d.six_month_book_sales ?? 0,
    six_month_bundle_sales: d.sixMonthBundleSales ?? d.six_month_bundle_sales ?? 0,
    lead_time: d.leadTime ?? d.lead_time ?? 0,
    books_in_bundle: d.booksInBundle ?? d.books_in_bundle ?? '',
    bundles: d.bundles ?? '',
    csv_avg_daily: d.csvAvgDaily ?? d.csv_avg_daily ?? 0,
    csv_reorder_threshold: d.csvReorderThreshold ?? d.csv_reorder_threshold ?? 0,
    do_not_reorder: d.doNotReorder ?? d.do_not_reorder ?? false,
  };
}

const EXPORT_SCRIPT = `// Run this in your old InventoryPro app's browser console (F12 > Console)
// It will download a JSON file with all your data.

(async () => {
  const { getFirestore, collection, getDocs } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js');
  const app = window.__FIREBASE_APP__ || (await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js')).getApps()[0];

  // Try to get the Firestore instance that's already initialized
  const db = getFirestore(app);

  const collections = ['products', 'orders', 'purchaseOrders', 'bookSpecs', 'printerQuotes'];
  const data = {};

  for (const col of collections) {
    try {
      const snap = await getDocs(collection(db, col));
      data[col] = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      console.log(col + ': ' + data[col].length + ' docs');
    } catch(e) {
      console.log('Skipping ' + col + ': ' + e.message);
      data[col] = [];
    }
  }

  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'inventorypro-export.json';
  a.click();
  console.log('Download started!');
})();`;

export default function MigrationTool({ onComplete }: { onComplete: () => void }) {
  const [status, setStatus] = useState<'idle' | 'processing' | 'done' | 'error'>('idle');
  const [progress, setProgress] = useState('');
  const [counts, setCounts] = useState({ products: 0, orders: 0, purchaseOrders: 0 });
  const [error, setError] = useState<string | null>(null);
  const [showScript, setShowScript] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setStatus('processing');
    setError(null);
    setProgress('Reading file...');

    try {
      const text = await file.text();
      const data = JSON.parse(text);

      const products = data.products || [];
      const orders = data.orders || [];
      const purchaseOrders = data.purchaseOrders || [];

      setProgress(`Found ${products.length} products, ${orders.length} orders, ${purchaseOrders.length} POs. Importing...`);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not signed into Supabase');

      // Insert products
      const firebaseIdToSupabaseId: Record<string, string> = {};
      let insertedProducts = 0;

      for (const product of products) {
        const mapped = mapProduct(product);
        const { data: inserted, error: insertErr } = await supabase
          .from('products')
          .insert({ ...mapped, user_id: user.id })
          .select('id')
          .single();

        if (insertErr) {
          console.error('Failed to insert product:', product.name, insertErr);
          continue;
        }
        if (product.id) firebaseIdToSupabaseId[product.id] = inserted.id;
        insertedProducts++;
        setProgress(`Imported ${insertedProducts}/${products.length} products...`);
      }

      // Insert inventory orders
      let insertedOrders = 0;
      for (const order of orders) {
        const o = order as any;
        const supabaseProductId = firebaseIdToSupabaseId[o.productId];
        if (!supabaseProductId) continue;

        await supabase.from('inventory_orders').insert({
          user_id: user.id,
          product_id: supabaseProductId,
          type: o.type || 'add',
          inventory_type: o.inventoryType || 'book',
          quantity: o.quantity || 0,
          previous_value: o.previousValue || 0,
          new_value: o.newValue || 0,
          source: o.source || '',
          notes: o.notes || '',
        });
        insertedOrders++;
      }

      // Insert purchase orders
      let insertedPOs = 0;
      for (const po of purchaseOrders) {
        const p = po as any;
        const supabaseProductId = firebaseIdToSupabaseId[p.productId];

        await supabase.from('purchase_orders').insert({
          user_id: user.id,
          product_id: supabaseProductId || null,
          product_name: p.productName || '',
          quantity: p.quantity || 0,
          order_date: p.orderDate || null,
          expected_dispatch: p.expectedDispatch || null,
          expected_arrival: p.expectedArrival || null,
          actual_arrival: p.actualArrival || null,
          status: p.status || 'pending',
        });
        insertedPOs++;
      }

      setCounts({ products: insertedProducts, orders: insertedOrders, purchaseOrders: insertedPOs });
      setStatus('done');
      onComplete();
    } catch (err: any) {
      console.error('Import error:', err);
      setError(err.message || 'Import failed');
      setStatus('error');
    }
  }

  return (
    <div className="space-y-4">
      {status === 'idle' && (
        <>
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
            <p className="font-medium text-blue-800 mb-2">How to export from your old app:</p>
            <ol className="text-sm text-blue-700 space-y-1 list-decimal list-inside">
              <li>Open your old InventoryPro app in the browser</li>
              <li>Press <strong>F12</strong> to open Developer Tools</li>
              <li>Click the <strong>Console</strong> tab</li>
              <li>
                <button
                  onClick={() => setShowScript(true)}
                  className="text-blue-600 underline font-medium"
                >
                  Click here to see the export script
                </button>
                , copy it, and paste it into the console
              </li>
              <li>Press <strong>Enter</strong> — a JSON file will download</li>
              <li>Upload that file below</li>
            </ol>
          </div>

          {showScript && (
            <div className="relative">
              <pre className="bg-slate-900 text-green-400 text-xs p-4 rounded-xl overflow-x-auto max-h-48 overflow-y-auto">
                {EXPORT_SCRIPT}
              </pre>
              <button
                onClick={() => { navigator.clipboard.writeText(EXPORT_SCRIPT); }}
                className="absolute top-2 right-2 px-2 py-1 bg-slate-700 text-white text-xs rounded hover:bg-slate-600"
              >
                Copy
              </button>
            </div>
          )}

          <div
            onClick={() => fileRef.current?.click()}
            className="border-2 border-dashed border-slate-300 rounded-xl p-8 text-center cursor-pointer hover:border-blue-400 hover:bg-blue-50/50 transition-colors"
          >
            <Upload className="w-10 h-10 text-slate-400 mx-auto mb-3" />
            <p className="font-medium text-slate-700">Upload exported JSON file</p>
            <p className="text-sm text-slate-500 mt-1">Click to browse or drag and drop</p>
            <input
              ref={fileRef}
              type="file"
              accept=".json"
              onChange={handleFile}
              className="hidden"
            />
          </div>
        </>
      )}

      {status === 'processing' && (
        <div className="text-center py-8">
          <Loader2 className="w-10 h-10 text-blue-500 animate-spin mx-auto mb-3" />
          <p className="text-sm text-slate-600">{progress}</p>
        </div>
      )}

      {status === 'done' && (
        <div className="text-center py-8">
          <CheckCircle className="w-14 h-14 text-green-500 mx-auto mb-3" />
          <p className="text-xl font-semibold text-slate-800 mb-3">Import Complete!</p>
          <div className="text-sm text-slate-600 space-y-1">
            <p><strong>{counts.products}</strong> products imported</p>
            <p><strong>{counts.orders}</strong> inventory orders imported</p>
            <p><strong>{counts.purchaseOrders}</strong> purchase orders imported</p>
          </div>
        </div>
      )}

      {status === 'error' && (
        <div className="text-center py-8">
          <AlertCircle className="w-14 h-14 text-red-500 mx-auto mb-3" />
          <p className="font-semibold text-slate-800 mb-2">Import Failed</p>
          <p className="text-sm text-red-600 mb-4">{error}</p>
          <button
            onClick={() => { setStatus('idle'); setError(null); }}
            className="px-4 py-2 text-sm bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200"
          >
            Try Again
          </button>
        </div>
      )}
    </div>
  );
}
