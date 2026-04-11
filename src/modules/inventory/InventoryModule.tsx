import { useState } from 'react';
import { LayoutDashboard, List, Plus, Download } from 'lucide-react';
import { useProducts } from './hooks/useProducts';
import Dashboard from './components/Dashboard';
import ProductTable from './components/ProductTable';
import AddProductForm from './components/AddProductForm';
import StockModal from './components/StockModal';
import MigrationTool from './components/MigrationTool';
import Modal from '../../components/Modal';
import type { Product } from '../../lib/types';

type Tab = 'dashboard' | 'products';

export default function InventoryModule() {
  const { products, loading, refetch } = useProducts();
  const [tab, setTab] = useState<Tab>('dashboard');
  const [showAddProduct, setShowAddProduct] = useState(false);
  const [stockProduct, setStockProduct] = useState<Product | null>(null);
  const [showMigration, setShowMigration] = useState(false);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <div className="flex gap-1 bg-slate-100 rounded-lg p-1">
          <button
            onClick={() => setTab('dashboard')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              tab === 'dashboard' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            <LayoutDashboard className="w-4 h-4" /> Dashboard
          </button>
          <button
            onClick={() => setTab('products')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              tab === 'products' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            <List className="w-4 h-4" /> Products
          </button>
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => setShowMigration(true)}
            className="flex items-center gap-2 px-4 py-2 border border-slate-200 text-slate-700 text-sm font-medium rounded-lg hover:bg-slate-50"
          >
            <Download className="w-4 h-4" /> Import from Firebase
          </button>
          <button
            onClick={() => setShowAddProduct(true)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 shadow-sm"
          >
            <Plus className="w-4 h-4" /> Add Product
          </button>
        </div>
      </div>

      {/* Content */}
      {tab === 'dashboard' && (
        <Dashboard
          products={products}
          onAddProduct={() => setShowAddProduct(true)}
          onAdjustStock={() => setTab('products')}
        />
      )}
      {tab === 'products' && (
        <ProductTable
          products={products}
          onRefetch={refetch}
          onAdjustStock={setStockProduct}
        />
      )}

      {/* Add Product Modal */}
      <Modal open={showAddProduct} onClose={() => setShowAddProduct(false)} title="Add New Product" maxWidth="max-w-2xl">
        <AddProductForm onClose={() => setShowAddProduct(false)} onRefetch={refetch} />
      </Modal>

      {/* Stock Adjustment Modal */}
      <Modal open={!!stockProduct} onClose={() => setStockProduct(null)} title="Adjust Stock">
        {stockProduct && (
          <StockModal product={stockProduct} onClose={() => setStockProduct(null)} onRefetch={refetch} />
        )}
      </Modal>

      {/* Migration Modal */}
      <Modal open={showMigration} onClose={() => setShowMigration(false)} title="Import from InventoryPro">
        <MigrationTool onComplete={() => { refetch(); }} />
      </Modal>
    </div>
  );
}
