import React, { useState } from 'react';
import { Product } from '../lib/types';
import { EditableNum, EditableText } from './EditableField';
import { updateProductField, deleteProduct, updateProduct } from '../lib/api';
import { Trash2 } from 'lucide-react';

interface ProductDetailProps {
  product: Product & any; // includes calculated fields
  allProducts: (Product & any)[];
  showToast: (msg: string) => void;
}

export function ProductDetail({ product: p, allProducts, showToast }: ProductDetailProps) {
  const isBundle = ["Bundle", "Book Box"].includes(p.category);
  const availableBundles = allProducts.filter(prod => ["Bundle", "Book Box"].includes(prod.category));
  const availableBooks = allProducts.filter(prod => !["Bundle", "Book Box"].includes(prod.category));
  const [isDeleting, setIsDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const handleDelete = async () => {
    if (!confirmDelete) {
      setConfirmDelete(true);
      setTimeout(() => setConfirmDelete(false), 3000); // Reset after 3 seconds
      return;
    }

    setIsDeleting(true);
    try {
      await deleteProduct(p.id);
      showToast(`${p.name} deleted successfully.`);
    } catch (error) {
      showToast(`Failed to delete ${p.name}.`);
      setIsDeleting(false);
      setConfirmDelete(false);
    }
  };

  const DataPoint = ({ label, value, highlight }: { label: string, value: React.ReactNode, highlight?: boolean }) => (
    <div className="flex flex-col gap-1">
      <span className="text-[10px] uppercase tracking-wider text-gray-400 font-semibold">{label}</span>
      <span className={`text-sm font-medium ${highlight ? 'text-brand-600' : 'text-gray-900'}`}>{value}</span>
    </div>
  );

  const EditDataPoint = ({ label, field, value, isDollar = false, onSaveOverride }: { label: string, field: keyof Product, value: number, isDollar?: boolean, onSaveOverride?: (v: number) => void }) => (
    <div className="flex flex-col gap-1">
      <span className="text-[10px] uppercase tracking-wider text-gray-400 font-semibold flex items-center gap-1">
        {label} <span className="text-gray-300 text-[8px]">✎</span>
      </span>
      <EditableNum 
        value={value} 
        label={label} 
        decimal={isDollar}
        prefix={isDollar ? "$" : ""} 
        onSave={(v) => { 
          if (onSaveOverride) {
            onSaveOverride(v);
          } else {
            updateProductField(p.id, field, v); 
            showToast(`${p.name}: ${label} set to ${isDollar ? '$' : ''}${isDollar ? v.toFixed(2) : v}`); 
          }
        }} 
      />
    </div>
  );

  return (
    <tr className="animate-in fade-in">
      <td colSpan={7} className="bg-gray-50/50 p-0 border-b border-gray-200">
        <div className="bg-white m-4 rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          
          {/* Main Grid Layout */}
          <div className="grid grid-cols-1 lg:grid-cols-12 divide-y lg:divide-y-0 lg:divide-x divide-gray-100">
            
            {/* Left Column: Inventory & Sales (Most frequently accessed) */}
            <div className="lg:col-span-5 p-6 space-y-6 bg-gray-50/30">
              <div>
                <h4 className="text-xs font-bold text-gray-800 uppercase tracking-wider mb-4 flex items-center justify-between">
                  Inventory & Sales
                  <div className="flex items-center gap-2 text-xs font-normal normal-case">
                    <span className="text-gray-500">Tracking Only (No Reorder)</span>
                    <input 
                      type="checkbox" 
                      checked={p.doNotReorder || false} 
                      onChange={(e) => {
                        updateProductField(p.id, "doNotReorder", e.target.checked);
                        showToast(`${p.name} marked as ${e.target.checked ? 'Tracking Only' : 'Reorderable'}`);
                      }}
                      className="rounded text-brand-600 focus:ring-brand-500 w-3.5 h-3.5"
                    />
                  </div>
                </h4>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-y-6 gap-x-4">
                  {!isBundle ? (
                    <>
                      <EditDataPoint 
                        label="Book Stock" 
                        field="bookStock" 
                        value={p.bookStock || 0} 
                        onSaveOverride={(v) => {
                          const newInv = v - (p.booksPurchased || 0) - (p.purchasedViaBundles || 0);
                          updateProduct(p.id, { bookStock: v, bookInventory: newInv });
                          showToast(`${p.name}: Book Stock set to ${v}`);
                        }}
                      />
                      <DataPoint 
                        label="Books Purchased" 
                        value={p.booksPurchased || 0} 
                      />
                      <DataPoint 
                        label="Purchased via Bundles" 
                        value={p.purchasedViaBundles || 0} 
                      />
                      <DataPoint label="Book Inventory" value={p.bookInventory} highlight />
                    </>
                  ) : (
                    <DataPoint label="Bundles Available" value={p.bundlesInventory} highlight />
                  )}

                  {!isBundle && (
                    <div className="flex flex-col gap-1">
                      <span className="text-[10px] uppercase tracking-wider text-gray-400 font-semibold flex items-center gap-1">
                        6Mo Book Sales <span className="text-gray-300 text-[8px]">✎</span>
                      </span>
                      <EditableNum 
                        value={p.sixMonthBookSales || 0} 
                        label="6Mo Book Sales" 
                        onSave={(v) => { 
                          updateProduct(p.id, { sixMonthBookSales: v, csvAvgDaily: 0 }); 
                          showToast(`${p.name}: 6Mo Book Sales set to ${v}`); 
                        }} 
                      />
                    </div>
                  )}
                  {isBundle ? (
                    <div className="flex flex-col gap-1">
                      <span className="text-[10px] uppercase tracking-wider text-gray-400 font-semibold flex items-center gap-1">
                        6Mo Bundle Sales <span className="text-gray-300 text-[8px]">✎</span>
                      </span>
                      <EditableNum 
                        value={p.sixMonthBundleSales || 0} 
                        label="6Mo Bundle Sales" 
                        onSave={(v) => { 
                          updateProduct(p.id, { sixMonthBundleSales: v, csvAvgDaily: 0 }); 
                          showToast(`${p.name}: 6Mo Bundle Sales set to ${v}`); 
                        }} 
                      />
                    </div>
                  ) : (
                    <DataPoint label="6Mo Bundle Sales" value={p.sixMonthBundleSales} />
                  )}
                  
                  <div className="flex flex-col gap-1">
                    <span className="text-[10px] uppercase tracking-wider text-gray-400 font-semibold">Avg Daily Sales</span>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-gray-900">{p.avgDailySalesBooks.toFixed(2)}</span>
                      {p.csvAvgDaily > 0 ? (
                        <button 
                          onClick={() => {
                            updateProductField(p.id, "csvAvgDaily", 0);
                            showToast(`Cleared CSV Avg Daily override for ${p.name}`);
                          }}
                          className="text-[9px] bg-yellow-100 hover:bg-yellow-200 text-yellow-800 px-1.5 py-0.5 rounded transition-colors"
                        >
                          Clear Override
                        </button>
                      ) : (
                        <span className="text-[10px] text-gray-400">
                          ({p.sixMonthBookSales || 0} + {p.sixMonthBundleSales || 0})/180
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-gray-200">
                <h4 className="text-xs font-bold text-gray-800 uppercase tracking-wider mb-4">Reorder Metrics</h4>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-y-6 gap-x-4">
                  <EditDataPoint label="Lead Time (days)" field="leadTime" value={p.leadTime} />
                  <DataPoint label="Safety Stock" value={isBundle || p.doNotReorder ? "N/A" : p.safetyStock} />
                  <DataPoint label="Reorder Threshold" value={isBundle || p.doNotReorder ? "N/A" : p.reorderThreshold} />
                  <DataPoint label="Days Remaining" value={isBundle || p.doNotReorder ? "N/A" : (p.daysRemaining > 9000 ? "N/A" : p.daysRemaining)} />
                  <DataPoint label="Reorder Qty" value={isBundle || p.doNotReorder ? "N/A" : p.reorderQty} highlight={!isBundle && !p.doNotReorder && p.reorderQty > 0} />
                  <DataPoint label="Reorder Cost" value={isBundle || p.doNotReorder ? "N/A" : `$${p.reorderCost.toFixed(2)}`} highlight={!isBundle && !p.doNotReorder && p.reorderCost > 0} />
                </div>
              </div>
            </div>

            {/* Right Column: Pricing & Margins */}
            <div className="lg:col-span-7 p-6 space-y-8">
              <div>
                <h4 className="text-xs font-bold text-gray-800 uppercase tracking-wider mb-4">Pricing & Margins</h4>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-y-6 gap-x-4">
                  <EditDataPoint label="Base Price" field="basePrice" value={p.basePrice} isDollar />
                  <EditDataPoint label="Production Cost" field="productionCost" value={p.productionCost} isDollar />
                  <EditDataPoint label="Shipping Cost" field="shippingCost" value={p.shippingCost} isDollar />
                  <EditDataPoint label="Shipping Supplies" field="shippingSuppliesCost" value={p.shippingSuppliesCost} isDollar />
                  <EditDataPoint label="PA Costs" field="paCosts" value={p.paCosts} isDollar />
                  <EditDataPoint label="Handling Fee" field="handlingFeeAddOn" value={p.handlingFeeAddOn} isDollar />
                  <DataPoint label="Transaction Fees" value={`$${p.transactionFees.toFixed(2)}`} />
                  <DataPoint label="Net Margin ($)" value={`$${p.netMarginDollars.toFixed(2)}`} highlight />
                  <DataPoint label="Net Margin (%)" value={`${p.netMarginPercent.toFixed(1)}%`} highlight />
                </div>
              </div>

              <div className="pt-4 border-t border-gray-100">
                <h4 className="text-xs font-bold text-gray-800 uppercase tracking-wider mb-4">TikTok Shop</h4>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-y-6 gap-x-4">
                  <EditDataPoint label="TT Shop Price" field="ttShopPrice" value={p.ttShopPrice} isDollar />
                  <DataPoint label="TT Fees" value={`$${p.ttFees.toFixed(2)}`} />
                  <EditDataPoint label="Free Shipping" field="freeShipping" value={p.freeShipping || 0} isDollar />
                  <DataPoint label="TT Net Margin ($)" value={`$${p.ttNetMarginDollars.toFixed(2)}`} highlight />
                  <DataPoint label="TT Net Margin (%)" value={`${p.ttNetMarginPercent.toFixed(1)}%`} highlight />
                </div>
              </div>
            </div>
          </div>

          {/* Bottom Section: Bundle Configuration */}
          <div className="bg-gray-50 px-6 py-4 border-t border-gray-200">
            {isBundle && (
              <div className="flex flex-col gap-2">
                <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Books in Bundle:</span>
                <div className="flex flex-wrap gap-2">
                  {availableBooks.map(b => {
                    const isSelected = (p.booksInBundle || "").split(",").map(s => s.trim()).includes(b.name);
                    return (
                      <label key={b.id} className={`flex items-center gap-2 text-[11px] font-medium border px-2.5 py-1 rounded-full cursor-pointer transition-colors ${isSelected ? 'bg-brand-100 border-brand-200 text-brand-800' : 'bg-white border-gray-200 hover:bg-gray-50 text-gray-600'}`}>
                        <input 
                          type="checkbox" 
                          className="rounded text-brand-600 focus:ring-brand-500 w-3 h-3"
                          checked={isSelected}
                          onChange={(e) => {
                            const current = (p.booksInBundle || "").split(",").map(s => s.trim()).filter(Boolean);
                            let next;
                            if (e.target.checked) {
                              next = [...current, b.name];
                            } else {
                              next = current.filter(n => n !== b.name);
                            }
                            updateProductField(p.id, "booksInBundle", next.join(", "));
                            showToast(`Updated bundle components for ${p.name}`);
                          }}
                        />
                        {b.name}
                      </label>
                    )
                  })}
                </div>
                {p.booksInBundle && (
                  <div className="mt-1 text-[11px] text-gray-500">
                    Bundle availability is auto-calculated from the minimum inventory of component books: <strong className="text-gray-700">{p.bundlesInventory} available</strong>
                  </div>
                )}
              </div>
            )}
            {!isBundle && (
              <div className="flex flex-col gap-2">
                <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Part of Bundles:</span>
                <div className="flex flex-wrap gap-2">
                  {availableBundles.map(b => {
                    const isSelected = (p.bundles || "").split(",").map(s => s.trim()).includes(b.name);
                    return (
                      <label key={b.id} className={`flex items-center gap-2 text-[11px] font-medium border px-2.5 py-1 rounded-full cursor-pointer transition-colors ${isSelected ? 'bg-brand-100 border-brand-200 text-brand-800' : 'bg-white border-gray-200 hover:bg-gray-50 text-gray-600'}`}>
                        <input 
                          type="checkbox" 
                          className="rounded text-brand-600 focus:ring-brand-500 w-3 h-3"
                          checked={isSelected}
                          onChange={(e) => {
                            const current = (p.bundles || "").split(",").map(s => s.trim()).filter(Boolean);
                            let next;
                            if (e.target.checked) {
                              next = [...current, b.name];
                            } else {
                              next = current.filter(n => n !== b.name);
                            }
                            updateProductField(p.id, "bundles", next.join(", "));
                            showToast(`Updated bundle membership for ${p.name}`);
                          }}
                        />
                        {b.name}
                      </label>
                    )
                  })}
                  {availableBundles.length === 0 && <span className="text-[11px] text-gray-500">No bundles available.</span>}
                </div>
              </div>
            )}
            <div className="flex justify-end mt-4">
              <button 
                onClick={handleDelete}
                disabled={isDeleting}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded transition-colors ${
                  confirmDelete 
                    ? 'bg-red-600 text-white hover:bg-red-700' 
                    : 'text-red-600 hover:text-red-700 hover:bg-red-50'
                }`}
              >
                <Trash2 className="w-3.5 h-3.5" />
                {isDeleting ? 'Deleting...' : confirmDelete ? 'Click again to confirm' : 'Delete Product'}
              </button>
            </div>
          </div>
        </div>
      </td>
    </tr>
  );
}
