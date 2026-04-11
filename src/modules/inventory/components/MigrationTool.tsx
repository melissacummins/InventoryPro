import React, { useState } from 'react';
import { Download, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs } from 'firebase/firestore';
import { getAuth, signInWithPopup, GoogleAuthProvider } from 'firebase/auth';
import { supabase } from '../../../lib/supabase';

const FIREBASE_CONFIG = {
  projectId: "gen-lang-client-0972859592",
  appId: "1:104294335132:web:246b3da9fdd1aa88ad2359",
  apiKey: "AIzaSyBoFO4skLJ29eQ7yJrk0JhGZL6ItUB1Azc",
  authDomain: "gen-lang-client-0972859592.firebaseapp.com",
  storageBucket: "gen-lang-client-0972859592.firebasestorage.app",
  messagingSenderId: "104294335132",
};
const FIRESTORE_DB_ID = "ai-studio-20426c88-9892-49be-be11-1ee14c9086a1";

// Map camelCase Firebase fields to snake_case Supabase fields
function mapProduct(doc: any) {
  const d = doc;
  return {
    name: d.name || '',
    sku: d.sku || '',
    category: d.category || 'Paperback',
    base_price: d.basePrice || 0,
    production_cost: d.productionCost || 0,
    shipping_cost: d.shippingCost || 0,
    shipping_supplies_cost: d.shippingSuppliesCost || 0,
    pa_costs: d.paCosts || 0,
    handling_fee_add_on: d.handlingFeeAddOn || 0,
    tt_shop_price: d.ttShopPrice || 0,
    free_shipping: d.freeShipping || 0,
    book_stock: d.bookStock || 0,
    books_purchased: d.booksPurchased || 0,
    bundles_purchased: d.bundlesPurchased || 0,
    purchased_via_bundles: d.purchasedViaBundles || 0,
    book_inventory: d.bookInventory || 0,
    bundles_inventory: d.bundlesInventory || 0,
    six_month_book_sales: d.sixMonthBookSales || 0,
    six_month_bundle_sales: d.sixMonthBundleSales || 0,
    lead_time: d.leadTime || 0,
    books_in_bundle: d.booksInBundle || '',
    bundles: d.bundles || '',
    csv_avg_daily: d.csvAvgDaily || 0,
    csv_reorder_threshold: d.csvReorderThreshold || 0,
    do_not_reorder: d.doNotReorder || false,
  };
}

export default function MigrationTool({ onComplete }: { onComplete: () => void }) {
  const [status, setStatus] = useState<'idle' | 'signing_in' | 'reading' | 'writing' | 'done' | 'error'>('idle');
  const [progress, setProgress] = useState('');
  const [counts, setCounts] = useState({ products: 0, orders: 0, purchaseOrders: 0 });
  const [error, setError] = useState<string | null>(null);

  async function startMigration() {
    setStatus('signing_in');
    setError(null);
    setProgress('Connecting to Firebase...');

    try {
      // Initialize Firebase
      const firebaseApp = initializeApp(FIREBASE_CONFIG, 'migration');
      const db = getFirestore(firebaseApp, FIRESTORE_DB_ID);
      const auth = getAuth(firebaseApp);
      const provider = new GoogleAuthProvider();

      // Sign in to Firebase
      setProgress('Please sign in with your Google account...');
      await signInWithPopup(auth, provider);

      // Read products
      setStatus('reading');
      setProgress('Reading products from Firebase...');
      const productsSnap = await getDocs(collection(db, 'products'));
      const products = productsSnap.docs.map(doc => ({ firebaseId: doc.id, ...doc.data() }));
      setProgress(`Found ${products.length} products. Reading orders...`);

      // Read orders
      const ordersSnap = await getDocs(collection(db, 'orders'));
      const orders = ordersSnap.docs.map(doc => doc.data());
      setProgress(`Found ${orders.length} orders. Reading purchase orders...`);

      // Read purchase orders
      const poSnap = await getDocs(collection(db, 'purchaseOrders'));
      const purchaseOrders = poSnap.docs.map(doc => doc.data());
      setProgress(`Found ${purchaseOrders.length} purchase orders. Writing to Supabase...`);

      // Write to Supabase
      setStatus('writing');
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not signed into Supabase');

      // Insert products
      const firebaseIdToSupabaseId: Record<string, string> = {};
      let insertedProducts = 0;

      for (const product of products) {
        const mapped = mapProduct(product);
        const { data, error: insertErr } = await supabase
          .from('products')
          .insert({ ...mapped, user_id: user.id })
          .select('id')
          .single();

        if (insertErr) {
          console.error('Failed to insert product:', (product as any).name, insertErr);
          continue;
        }
        firebaseIdToSupabaseId[(product as any).firebaseId] = data.id;
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
      setProgress('Migration complete!');
      onComplete();
    } catch (err: any) {
      console.error('Migration error:', err);
      setError(err.message || 'Migration failed');
      setStatus('error');
    }
  }

  return (
    <div className="space-y-4">
      {status === 'idle' && (
        <>
          <p className="text-sm text-slate-600">
            This will connect to your old InventoryPro Firebase database, read all your products, orders,
            and purchase orders, and import them into your new Command Center.
          </p>
          <p className="text-sm text-slate-500">
            Your old data will <strong>not</strong> be modified or deleted.
          </p>
          <button
            onClick={startMigration}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 text-white font-medium rounded-xl hover:bg-blue-700"
          >
            <Download className="w-5 h-5" />
            Import from Firebase
          </button>
        </>
      )}

      {(status === 'signing_in' || status === 'reading' || status === 'writing') && (
        <div className="text-center py-4">
          <Loader2 className="w-8 h-8 text-blue-500 animate-spin mx-auto mb-3" />
          <p className="text-sm text-slate-600">{progress}</p>
        </div>
      )}

      {status === 'done' && (
        <div className="text-center py-4">
          <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-3" />
          <p className="font-semibold text-slate-800 mb-2">Migration Complete!</p>
          <div className="text-sm text-slate-600 space-y-1">
            <p>{counts.products} products imported</p>
            <p>{counts.orders} inventory orders imported</p>
            <p>{counts.purchaseOrders} purchase orders imported</p>
          </div>
        </div>
      )}

      {status === 'error' && (
        <div className="text-center py-4">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-3" />
          <p className="font-semibold text-slate-800 mb-2">Migration Failed</p>
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
