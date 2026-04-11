import React, { useState, useMemo, useEffect } from 'react';
import { useProducts } from '../hooks/useProducts';
import { useAuth } from '../contexts/AuthContext';
import { StatCard } from '../components/StatCard';
import { Modal } from '../components/Modal';
import { AddProductForm } from '../components/AddProductForm';
import { StockResetForm } from '../components/StockResetForm';
import { CSVImporter } from '../components/CSVImporter';
import { processInventoryChange } from '../lib/api';
import { seedDatabaseIfEmpty } from '../lib/seed';
import { Search, Plus, RefreshCw, PackagePlus, TrendingUp } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export default function Dashboard() {
  const { products, loading } = useProducts();
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("All");
  const [statusFilter, setStatusFilter] = useState("All");
  const [sortField, setSortField] = useState("name");
  const [sortDir, setSortDir] = useState("asc");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  
  const [showAddOrder, setShowAddOrder] = useState(false);
  const [showAddProduct, setShowAddProduct] = useState(false);
  const [showStockReset, setShowStockReset] = useState(false);
  
  const [orderForm, setOrderForm] = useState({ productId: "", quantity: 1, type: "book", direction: "add" });
  const [toast, setToast] = useState<string | null>(null);

  const firstName = user?.email ? user.email.split('@')[0].charAt(0).toUpperCase() + user.email.split('@')[0].slice(1) : 'User';

  useEffect(() => {
    seedDatabaseIfEmpty();
  }, []);

  const showToast = (msg: string) => { 
    setToast(msg); 
    setTimeout(() => setToast(null), 3000); 
  };

  const calculated = useMemo(() => {
    return products.map(p => {
      const basePrice = p.basePrice || 0;
      const handlingFeeAddOn = p.handlingFeeAddOn || 0;
      const productionCost = p.productionCost || 0;
      const shippingCost = p.shippingCost || 0;
      const shippingSuppliesCost = p.shippingSuppliesCost || 0;
      const paCosts = p.paCosts || 0;
      const ttShopPrice = p.ttShopPrice || 0;
      const freeShipping = p.freeShipping || 0;
      const sixMonthBookSales = p.sixMonthBookSales || 0;
      const sixMonthBundleSales = p.sixMonthBundleSales || 0;
      const leadTime = p.leadTime || 0;
      const bookInventory = p.bookInventory || 0;

      const transactionFees = (basePrice * 0.029) + 0.30;
      const netMarginDollars = (basePrice + handlingFeeAddOn) - (productionCost + shippingCost + transactionFees + shippingSuppliesCost + paCosts);
      const netMarginPercent = basePrice > 0 ? (netMarginDollars / basePrice) * 100 : 0;
      const ttFees = (ttShopPrice * 0.08) + 0.30;
      const ttNetMarginDollars = (ttShopPrice - ttFees) - (productionCost + shippingCost + freeShipping + shippingSuppliesCost + paCosts);
      const ttNetMarginPercent = ttShopPrice > 0 ? (ttNetMarginDollars / ttShopPrice) * 100 : 0;
      const isBundle = ["Bundle", "Book Box"].includes(p.category);
      const isTrackingOnly = p.doNotReorder === true;

      const avgDailySalesBooks = p.csvAvgDaily != null && p.csvAvgDaily > 0 ? p.csvAvgDaily : (sixMonthBookSales + sixMonthBundleSales) / 180;
      const avgDailySalesBundles = sixMonthBundleSales / 180;
      
      let reorderThreshold = 0;
      let safetyStock = 0;
      let daysRemaining = 0;
      let inventoryStatus = "GOOD";
      let actionRequired = "NO ACTION NEEDED";
      let reorderQty = 0;
      let reorderCost = 0;

      if (isBundle) { 
        inventoryStatus = "BUNDLE"; actionRequired = "BUNDLE"; 
      } else if (isTrackingOnly) {
        inventoryStatus = "TRACKING ONLY"; actionRequired = "NO REORDER";
      } else { 
        reorderThreshold = p.csvReorderThreshold != null && p.csvReorderThreshold > 0 ? p.csvReorderThreshold : Math.ceil(avgDailySalesBooks * leadTime);
        safetyStock = Math.max(0, reorderThreshold - Math.ceil(avgDailySalesBooks * leadTime));
        daysRemaining = avgDailySalesBooks > 0 ? Math.round(bookInventory / avgDailySalesBooks) : (bookInventory > 0 ? 9999 : 0);
        
        if (bookInventory <= reorderThreshold && reorderThreshold > 0) { 
          inventoryStatus = "REORDER NOW"; actionRequired = "ORDER THIS WEEK"; 
          reorderQty = Math.max(0, reorderThreshold - bookInventory + Math.ceil(avgDailySalesBooks * leadTime));
          reorderCost = reorderQty * productionCost;
        }
      }
      
      return { 
        ...p, transactionFees, netMarginDollars, netMarginPercent, ttFees, ttNetMarginDollars, 
        ttNetMarginPercent, avgDailySalesBooks, avgDailySalesBundles, safetyStock, reorderThreshold, 
        daysRemaining, inventoryStatus, actionRequired, reorderQty, reorderCost 
      };
    });
  }, [products]);

  const categories = useMemo(() => ["All", ...new Set(products.map(p => p.category))], [products]);

  const filtered = useMemo(() => {
    let list = calculated;
    if (searchTerm) {
      list = list.filter(p => 
        p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
        p.sku.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    if (categoryFilter !== "All") list = list.filter(p => p.category === categoryFilter);
    if (statusFilter !== "All") list = list.filter(p => p.inventoryStatus === statusFilter);
    
    list.sort((a: any, b: any) => {
      let va = a[sortField], vb = b[sortField];
      if (typeof va === "string") { va = va.toLowerCase(); vb = (vb||"").toLowerCase(); }
      if (va < vb) return sortDir === "asc" ? -1 : 1;
      if (va > vb) return sortDir === "asc" ? 1 : -1;
      return 0;
    });
    return list;
  }, [calculated, searchTerm, categoryFilter, statusFilter, sortField, sortDir]);

  const stats = useMemo(() => {
    const reorderCount = calculated.filter(p => p.inventoryStatus === "REORDER NOW").length;
    const totalInventory = calculated.reduce((s, p) => s + (p.bookInventory || 0) + (p.bundlesInventory || 0), 0);
    const validMargins = calculated.filter(p => p.netMarginPercent > 0);
    const avgMargin = validMargins.length > 0 ? validMargins.reduce((s, p) => s + p.netMarginPercent, 0) / validMargins.length : 0;
    const totalReorderCost = calculated.reduce((s, p) => s + p.reorderCost, 0);
    return { total: products.length, reorderCount, totalInventory, avgMargin, totalReorderCost };
  }, [calculated, products]);

  const handleSort = (field: string) => {
    if (sortField === field) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortField(field); setSortDir("asc"); }
  };

  const chartData = useMemo(() => {
    return calculated
      .filter(p => p.bookInventory > 0)
      .sort((a, b) => b.bookInventory - a.bookInventory)
      .slice(0, 8)
      .map(p => ({
        name: p.name,
        inventory: p.bookInventory,
        reorderThreshold: p.reorderThreshold
      }));
  }, [calculated]);

  const handleAddOrder = async () => {
    const pid = orderForm.productId;
    const qty = parseInt(orderForm.quantity as any) || 0;
    if (!pid || qty <= 0) return;
    
    const prod = products.find(p => p.id === pid);
    if (!prod) return;

    try {
      await processInventoryChange(
        prod, 
        orderForm.direction as "add" | "subtract", 
        orderForm.type as "book" | "bundle", 
        qty
      );
      showToast(`${orderForm.direction === "add" ? "Added" : "Subtracted"} ${qty} ${orderForm.type}(s) ${orderForm.direction === "add" ? "to" : "from"} ${prod.name}`);
      setShowAddOrder(false);
      setOrderForm({ productId: "", quantity: 1, type: "book", direction: "add" });
    } catch (error) {
      console.error("Error updating inventory:", error);
      showToast("Error updating inventory");
    }
  };

  const SortIcon = ({ field }: { field: string }) => {
    if (sortField !== field) return <span className="text-gray-300 ml-1">{"\u2195"}</span>;
    return <span className="text-brand-500 ml-1">{sortDir === "asc" ? "\u25B2" : "\u25BC"}</span>;
  };

  if (loading) {
    return <div className="flex justify-center items-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-600"></div></div>;
  }

  return (
    <div className="space-y-6">
      {toast && <div className="fixed top-4 right-4 z-[60] bg-gray-900 text-white px-4 py-2.5 rounded-lg shadow-lg text-sm animate-in fade-in slide-in-from-top-4">{toast}</div>}

      {/* Hero Section */}
      <div className="bg-gradient-to-br from-brand-600 to-indigo-700 rounded-2xl p-8 text-white shadow-lg relative overflow-hidden">
        {/* Decorative background elements */}
        <div className="absolute top-0 right-0 -mt-16 -mr-16 w-64 h-64 bg-white opacity-10 rounded-full blur-3xl"></div>
        <div className="absolute bottom-0 left-0 -mb-16 -ml-16 w-48 h-48 bg-brand-400 opacity-20 rounded-full blur-2xl"></div>
        
        <div className="relative z-10 mb-8">
          <h2 className="text-3xl font-bold mb-2">Good morning, {firstName}</h2>
          <p className="text-brand-100 mb-6">Here's what's happening with your inventory today.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 relative z-10">
          <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-xl p-5">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-white/20 rounded-lg">
                <PackagePlus className="w-5 h-5 text-white" />
              </div>
              <h3 className="text-brand-100 text-sm font-medium">Total Products</h3>
            </div>
            <p className="text-3xl font-bold text-white">{stats.total}</p>
          </div>
          
          <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-xl p-5">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-white/20 rounded-lg">
                <PackagePlus className="w-5 h-5 text-white" />
              </div>
              <h3 className="text-brand-100 text-sm font-medium">Total Inventory</h3>
            </div>
            <p className="text-3xl font-bold text-white">{stats.totalInventory.toLocaleString()}</p>
          </div>

          <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-xl p-5">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-white/20 rounded-lg">
                <RefreshCw className="w-5 h-5 text-white" />
              </div>
              <h3 className="text-brand-100 text-sm font-medium">Need Reorder</h3>
            </div>
            <div className="flex items-baseline gap-2">
              <p className="text-3xl font-bold text-white">{stats.reorderCount}</p>
              {stats.reorderCount > 0 && <span className="text-xs font-medium bg-red-500/80 text-white px-2 py-0.5 rounded-full">Action Needed</span>}
            </div>
          </div>

          <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-xl p-5">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-white/20 rounded-lg">
                <Search className="w-5 h-5 text-white" />
              </div>
              <h3 className="text-brand-100 text-sm font-medium">Avg Margin</h3>
            </div>
            <p className="text-3xl font-bold text-white">{stats.avgMargin.toFixed(1)}%</p>
          </div>
        </div>
      </div>

      {stats.reorderCount > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-xl px-5 py-4 flex items-start gap-3 shadow-sm">
          <div className="mt-0.5 text-red-500">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4.5c-.77-.833-2.694-.833-3.464 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z" /></svg>
          </div>
          <div>
            <p className="text-red-800 font-semibold text-sm">{stats.reorderCount} product{stats.reorderCount > 1 ? "s" : ""} need reordering</p>
            <p className="text-red-600 text-sm mt-0.5">Estimated reorder cost: ${stats.totalReorderCost.toFixed(2)}</p>
          </div>
        </div>
      )}

      {/* Quick Actions Section */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
        <h3 className="text-lg font-bold text-gray-900 mb-1">Quick Actions</h3>
        <p className="text-sm text-gray-500 mb-6">Frequently used tools</p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <button onClick={() => setShowAddOrder(true)} className="flex items-center justify-between p-4 rounded-xl border border-gray-100 hover:border-brand-200 hover:bg-brand-50 transition-colors group">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-white rounded-lg shadow-sm group-hover:text-brand-600">
                <PackagePlus className="w-5 h-5" />
              </div>
              <div className="text-left">
                <p className="text-sm font-semibold text-gray-900">Update Stock</p>
                <p className="text-xs text-gray-500">Add or subtract inventory</p>
              </div>
            </div>
            <Plus className="w-4 h-4 text-gray-400 group-hover:text-brand-600" />
          </button>
          
          <button onClick={() => setShowAddProduct(true)} className="flex items-center justify-between p-4 rounded-xl border border-gray-100 hover:border-brand-200 hover:bg-brand-50 transition-colors group">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-white rounded-lg shadow-sm group-hover:text-brand-600">
                <Plus className="w-5 h-5" />
              </div>
              <div className="text-left">
                <p className="text-sm font-semibold text-gray-900">New Product</p>
                <p className="text-xs text-gray-500">Add to your catalog</p>
              </div>
            </div>
            <Plus className="w-4 h-4 text-gray-400 group-hover:text-brand-600" />
          </button>
          
          <button onClick={() => setShowStockReset(true)} className="flex items-center justify-between p-4 rounded-xl border border-gray-100 hover:border-brand-200 hover:bg-brand-50 transition-colors group">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-white rounded-lg shadow-sm group-hover:text-brand-600">
                <RefreshCw className="w-5 h-5" />
              </div>
              <div className="text-left">
                <p className="text-sm font-semibold text-gray-900">Reconcile</p>
                <p className="text-xs text-gray-500">Reset stock levels</p>
              </div>
            </div>
            <Plus className="w-4 h-4 text-gray-400 group-hover:text-brand-600" />
          </button>
        </div>
      </div>

      {/* Charts Section */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-lg font-bold text-gray-900">Top Inventory Levels</h3>
            <p className="text-sm text-gray-500">Products with the highest stock</p>
          </div>
          <div className="p-2 bg-brand-50 rounded-lg">
            <TrendingUp className="w-5 h-5 text-brand-600" />
          </div>
        </div>
        <div className="h-[350px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} layout="vertical" margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#E5E7EB" />
              <XAxis type="number" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#6B7280' }} />
              <YAxis type="category" dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#6B7280' }} width={300} />
              <Tooltip 
                cursor={{ fill: '#F3F4F6' }}
                contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}
              />
              <Bar dataKey="inventory" name="Current Stock" fill="var(--color-brand-600)" radius={[0, 4, 4, 0]} maxBarSize={20} />
              <Bar dataKey="reorderThreshold" name="Reorder Point" fill="#E5E7EB" radius={[0, 4, 4, 0]} maxBarSize={20} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {showAddOrder && (
        <Modal title="Add or Subtract Stock" onClose={() => setShowAddOrder(false)}>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Product</label>
              <select value={orderForm.productId} onChange={e => setOrderForm(f => ({...f, productId: e.target.value}))} className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm">
                <option value="">Select a product...</option>
                {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Direction</label>
              <div className="grid grid-cols-2 gap-2">
                <button onClick={() => setOrderForm(f => ({...f, direction:"add"}))} className={`px-3 py-2 rounded-lg text-sm font-medium border transition-colors ${orderForm.direction === "add" ? 'bg-green-50 border-green-300 text-green-700' : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
                  + Add Stock (received)
                </button>
                <button onClick={() => setOrderForm(f => ({...f, direction:"subtract"}))} className={`px-3 py-2 rounded-lg text-sm font-medium border transition-colors ${orderForm.direction === "subtract" ? 'bg-red-50 border-red-300 text-red-700' : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
                  - Subtract (sold/lost)
                </button>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
              <select value={orderForm.type} onChange={e => setOrderForm(f => ({...f, type: e.target.value}))} className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm">
                <option value="book">Books (Book Inventory)</option>
                <option value="bundle">Bundles (Bundle Inventory)</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Quantity</label>
              <input type="number" min="1" value={orderForm.quantity} onChange={e => setOrderForm(f => ({...f, quantity: e.target.value as any}))} className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm" />
              {orderForm.productId && (
                <p className="text-xs text-gray-500 mt-1.5">
                  Current stock: <span className="font-medium text-gray-900">
                    {orderForm.type === 'bundle' 
                      ? products.find(p => p.id === orderForm.productId)?.bundlesInventory || 0
                      : products.find(p => p.id === orderForm.productId)?.bookInventory || 0}
                  </span>
                </p>
              )}
            </div>
            <div className="flex gap-3 pt-2">
              <button onClick={handleAddOrder} className={`flex-1 px-4 py-2.5 text-white rounded-lg font-medium text-sm ${orderForm.direction === "add" ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'}`}>
                {orderForm.direction === "add" ? "Add Stock" : "Subtract Stock"}
              </button>
              <button onClick={() => setShowAddOrder(false)} className="flex-1 px-4 py-2.5 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 font-medium text-sm">Cancel</button>
            </div>
          </div>
        </Modal>
      )}

      {showAddProduct && (
        <Modal title="Add New Product" onClose={() => setShowAddProduct(false)} wide>
          <AddProductForm onClose={() => setShowAddProduct(false)} showToast={showToast} allProducts={calculated} />
        </Modal>
      )}

      {showStockReset && (
        <Modal title="Stock Reset / Reconciliation" onClose={() => setShowStockReset(false)} wide>
          <StockResetForm products={products} onClose={() => setShowStockReset(false)} showToast={showToast} />
        </Modal>
      )}
    </div>
  );
}
