import { Package, AlertTriangle, TrendingUp, DollarSign } from 'lucide-react';
import type { Product } from '../../../lib/types';
import { calculateProductMetrics, formatCurrency, formatPercent } from '../utils';

interface DashboardProps {
  products: Product[];
}

export default function Dashboard({ products }: DashboardProps) {
  const enriched = products.map(p => ({ ...p, metrics: calculateProductMetrics(p) }));

  const totalProducts = products.length;
  const totalInventory = products.reduce((sum, p) => sum + p.book_inventory, 0);
  const needReorder = enriched.filter(p => p.metrics.status === 'REORDER NOW').length;
  const avgMargin = products.length > 0
    ? enriched.reduce((sum, p) => sum + p.metrics.netMarginPercent, 0) / products.length
    : 0;

  const reorderProducts = enriched
    .filter(p => p.metrics.status === 'REORDER NOW')
    .sort((a, b) => a.metrics.daysRemaining - b.metrics.daysRemaining);

  const topInventory = [...enriched]
    .filter(p => p.category !== 'Bundle')
    .sort((a, b) => b.book_inventory - a.book_inventory)
    .slice(0, 8);

  const maxInventory = topInventory.length > 0 ? topInventory[0].book_inventory : 1;

  const stats = [
    { label: 'Total Products', value: totalProducts, icon: Package, color: 'bg-blue-500', textColor: 'text-blue-600' },
    { label: 'Total Inventory', value: totalInventory.toLocaleString(), icon: Package, color: 'bg-emerald-500', textColor: 'text-emerald-600' },
    { label: 'Need Reorder', value: needReorder, icon: AlertTriangle, color: needReorder > 0 ? 'bg-red-500' : 'bg-slate-400', textColor: needReorder > 0 ? 'text-red-600' : 'text-slate-600' },
    { label: 'Avg Margin', value: formatPercent(avgMargin), icon: DollarSign, color: 'bg-amber-500', textColor: 'text-amber-600' },
  ];

  return (
    <div className="space-y-6">
      {/* Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map(stat => {
          const Icon = stat.icon;
          return (
            <div key={stat.label} className="bg-white rounded-xl border border-slate-200 p-5">
              <div className="flex items-center gap-3 mb-2">
                <div className={`w-10 h-10 ${stat.color} rounded-lg flex items-center justify-center`}>
                  <Icon className="w-5 h-5 text-white" />
                </div>
              </div>
              <p className={`text-2xl font-bold ${stat.textColor}`}>{stat.value}</p>
              <p className="text-sm text-slate-500">{stat.label}</p>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Reorder Alerts */}
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <h3 className="font-semibold text-slate-800 mb-4 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-red-500" />
            Reorder Alerts
          </h3>
          {reorderProducts.length === 0 ? (
            <p className="text-sm text-slate-500">All stock levels are healthy.</p>
          ) : (
            <div className="space-y-3 max-h-64 overflow-y-auto">
              {reorderProducts.map(p => (
                <div key={p.id} className="flex items-center justify-between p-3 bg-red-50 rounded-lg border border-red-100">
                  <div>
                    <p className="font-medium text-slate-800 text-sm">{p.name}</p>
                    <p className="text-xs text-slate-500">{p.category} &middot; {p.book_inventory} in stock</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-red-600">
                      {p.metrics.daysRemaining === Infinity ? '—' : `${Math.round(p.metrics.daysRemaining)}d left`}
                    </p>
                    <p className="text-xs text-slate-500">
                      Threshold: {p.metrics.reorderThreshold}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Top Inventory */}
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <h3 className="font-semibold text-slate-800 mb-4 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-blue-500" />
            Top Inventory Levels
          </h3>
          {topInventory.length === 0 ? (
            <p className="text-sm text-slate-500">No products yet.</p>
          ) : (
            <div className="space-y-3">
              {topInventory.map(p => (
                <div key={p.id} className="flex items-center gap-3">
                  <div className="w-28 text-xs text-slate-600 truncate shrink-0" title={p.name}>{p.name}</div>
                  <div className="flex-1 bg-slate-100 rounded-full h-5 overflow-hidden">
                    <div
                      className="bg-blue-500 h-full rounded-full transition-all flex items-center justify-end pr-2"
                      style={{ width: `${Math.max(8, (p.book_inventory / maxInventory) * 100)}%` }}
                    >
                      <span className="text-[10px] text-white font-medium">{p.book_inventory}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
