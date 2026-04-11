import React, { useState, useMemo } from 'react';
import { useProducts } from '../hooks/useProducts';
import { Modal } from '../components/Modal';
import { AddProductForm } from '../components/AddProductForm';
import { StockResetForm } from '../components/StockResetForm';
import { WipeSalesForm } from '../components/WipeSalesForm';
import { ProductDetail } from '../components/ProductDetail';
import { DuplicateResolver } from '../components/DuplicateResolver';
import { processInventoryChange } from '../lib/api';
import { Search, Plus, RefreshCw, PackagePlus, Copy } from 'lucide-react';

export default function Inventory() {
  const { products, loading } = useProducts();
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("All");
  const [statusFilter, setStatusFilter] = useState("All");
  const [sortField, setSortField] = useState("name");
  const [sortDir, setSortDir] = useState("asc");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  
  const [showAddOrder, setShowAddOrder] = useState(false);
  const [showAddProduct, setShowAddProduct] = useState(false);
  const [showStockReset, setShowStockReset] = useState(false);
  const [showWipeSales, setShowWipeSales] = useState(false);
  const [showDuplicates, setShowDuplicates] = useState(false);
  
  const [orderForm, setOrderForm] = useState({ productId: "", quantity: 1, type: "book", direction: "add" });
  const [toast, setToast] = useState<string | null>(null);

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
        ...p, 
        transactionFees, netMarginDollars, netMarginPercent,
        ttFees, ttNetMarginDollars, ttNetMarginPercent,
        avgDailySalesBooks, avgDailySalesBundles,
        reorderThreshold, safetyStock, daysRemaining,
        inventoryStatus, actionRequired, reorderQty, reorderCost
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

  const handleSort = (field: string) => {
    if (sortField === field) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortField(field); setSortDir("asc"); }
  };

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

      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Inventory Items</h2>
          <p className="text-sm text-gray-500 mt-1">Manage your catalog, track stock levels, and monitor margins.</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <button onClick={() => setShowDuplicates(true)} className="px-3 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium text-sm flex items-center gap-1.5 transition-colors shadow-sm">
            <Copy className="w-4 h-4" /> Find Duplicates
          </button>
          <button onClick={() => setShowStockReset(true)} className="px-3 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium text-sm flex items-center gap-1.5 transition-colors shadow-sm">
            <RefreshCw className="w-4 h-4" /> Stock Reset
          </button>
          <button onClick={() => setShowWipeSales(true)} className="px-3 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium text-sm flex items-center gap-1.5 transition-colors shadow-sm">
            <RefreshCw className="w-4 h-4" /> Wipe Sales Data
          </button>
          <button onClick={() => setShowAddProduct(true)} className="px-3 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium text-sm flex items-center gap-1.5 transition-colors shadow-sm">
            <Plus className="w-4 h-4" /> New Product
          </button>
          <button onClick={() => setShowAddOrder(true)} className="px-3 py-2 bg-brand-600 text-white rounded-lg hover:bg-brand-700 font-medium text-sm flex items-center gap-1.5 transition-colors shadow-sm">
            <PackagePlus className="w-4 h-4" /> Add / Subtract Stock
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm mb-4">
        <div className="p-4 flex flex-wrap gap-3 items-center">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input 
              type="text" 
              placeholder="Search products or SKU..." 
              value={searchTerm} 
              onChange={e => setSearchTerm(e.target.value)} 
              className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-100 focus:border-brand-500" 
            />
          </div>
          <select value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)} className="px-3 py-2.5 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-brand-100">
            {categories.map(c => <option key={c} value={c}>{c === "All" ? "All Categories" : c}</option>)}
          </select>
          <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="px-3 py-2.5 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-brand-100">
            <option value="All">All Statuses</option>
            <option value="GOOD">Good</option>
            <option value="REORDER NOW">Reorder Now</option>
            <option value="BUNDLE">Bundle</option>
          </select>
          <span className="text-sm text-gray-500">{filtered.length} result{filtered.length !== 1 ? "s" : ""}</span>
        </div>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="text-left px-4 py-3 font-semibold text-gray-600 cursor-pointer hover:text-gray-900 select-none" onClick={() => handleSort("name")}>Product <SortIcon field="name" /></th>
                <th className="text-left px-3 py-3 font-semibold text-gray-600 cursor-pointer hover:text-gray-900 select-none" onClick={() => handleSort("category")}>Category <SortIcon field="category" /></th>
                <th className="text-right px-3 py-3 font-semibold text-gray-600 cursor-pointer hover:text-gray-900 select-none" onClick={() => handleSort("basePrice")}>Price <SortIcon field="basePrice" /></th>
                <th className="text-right px-3 py-3 font-semibold text-gray-600 cursor-pointer hover:text-gray-900 select-none" onClick={() => handleSort("netMarginPercent")}>Margin <SortIcon field="netMarginPercent" /></th>
                <th className="text-right px-3 py-3 font-semibold text-gray-600 cursor-pointer hover:text-gray-900 select-none" onClick={() => handleSort("bookInventory")}>Inventory <SortIcon field="bookInventory" /></th>
                <th className="text-center px-3 py-3 font-semibold text-gray-600 cursor-pointer hover:text-gray-900 select-none" onClick={() => handleSort("inventoryStatus")}>Status <SortIcon field="inventoryStatus" /></th>
                <th className="text-left px-3 py-3 font-semibold text-gray-600 cursor-pointer hover:text-gray-900 select-none" onClick={() => handleSort("actionRequired")}>Action <SortIcon field="actionRequired" /></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(p => (
                <React.Fragment key={p.id}>
                  <tr className={`border-b border-gray-100 cursor-pointer transition-colors ${expandedId === p.id ? 'bg-brand-50' : 'hover:bg-gray-50'}`} onClick={() => setExpandedId(expandedId === p.id ? null : p.id)}>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <svg className={`w-4 h-4 text-gray-400 transition-transform flex-shrink-0 ${expandedId === p.id ? 'rotate-90' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                        <div>
                          <div className="font-medium text-gray-900">{p.name}</div>
                          <div className="text-xs text-gray-400">{p.sku}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-3"><span className="inline-block px-2 py-0.5 bg-gray-100 text-gray-600 rounded text-xs font-medium">{p.category}</span></td>
                    <td className="px-3 py-3 text-right font-medium">${(p.basePrice || 0).toFixed(2)}</td>
                    <td className="px-3 py-3 text-right">
                      <span className={`font-medium ${(p.netMarginPercent || 0) >= 50 ? 'text-green-600' : (p.netMarginPercent || 0) >= 40 ? 'text-yellow-600' : 'text-red-600'}`}>
                        {(p.netMarginPercent || 0).toFixed(0)}%
                      </span>
                    </td>
                    <td className="px-3 py-3 text-right font-medium">
                      {p.inventoryStatus === "BUNDLE" ? (p.bundlesInventory || 0) : p.bookInventory}
                    </td>
                    <td className="px-3 py-3 text-center">
                      <span className={`inline-block px-2.5 py-1 rounded-full text-xs font-semibold border ${
                        p.inventoryStatus === "GOOD" ? "bg-green-50 text-green-700 border-green-200" :
                        p.inventoryStatus === "REORDER NOW" ? "bg-red-50 text-red-700 border-red-200" :
                        "bg-blue-50 text-blue-700 border-blue-200"
                      }`}>
                        {p.inventoryStatus}
                      </span>
                    </td>
                    <td className="px-3 py-3">
                      <span className={`text-xs font-medium ${p.actionRequired === "ORDER THIS WEEK" ? 'text-red-600' : p.actionRequired === "BUNDLE" ? 'text-blue-600' : 'text-gray-400'}`}>
                        {p.actionRequired}
                      </span>
                    </td>
                  </tr>
                  {expandedId === p.id && <ProductDetail product={p} allProducts={calculated} showToast={showToast} />}
                </React.Fragment>
              ))}
            </tbody>
          </table>
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
                      ? calculated.find(p => p.id === orderForm.productId)?.bundlesInventory || 0
                      : calculated.find(p => p.id === orderForm.productId)?.bookInventory || 0}
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

      {showWipeSales && (
        <Modal title="Wipe Sales Data" onClose={() => setShowWipeSales(false)} wide>
          <WipeSalesForm products={products} onClose={() => setShowWipeSales(false)} showToast={showToast} />
        </Modal>
      )}

      {showDuplicates && (
        <Modal title="Resolve Duplicate SKUs" onClose={() => setShowDuplicates(false)} wide>
          <DuplicateResolver products={calculated} onClose={() => setShowDuplicates(false)} showToast={showToast} />
        </Modal>
      )}
    </div>
  );
}
