import { useState, useEffect } from 'react';
import { TrendingUp, TrendingDown, DollarSign, Loader2 } from 'lucide-react';
import { getMonthlySummaries } from '../api';
import type { MonthlySummary } from '../api';

export default function Dashboard() {
  const [summaries, setSummaries] = useState<MonthlySummary[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getMonthlySummaries(12).then(data => {
      setSummaries(data);
      setLoading(false);
    });
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="w-8 h-8 text-cyan-500 animate-spin" />
      </div>
    );
  }

  if (summaries.length === 0) {
    return (
      <div className="text-center py-16 bg-white rounded-xl border border-slate-200">
        <DollarSign className="w-12 h-12 text-slate-300 mx-auto mb-3" />
        <h3 className="text-lg font-semibold text-slate-700 mb-1">No transactions yet</h3>
        <p className="text-sm text-slate-400">Import bank transactions from the Transactions tab to see your financial overview.</p>
      </div>
    );
  }

  const current = summaries[0];
  const previous = summaries[1];
  const incomeChange = previous ? ((current.income - previous.income) / (previous.income || 1)) * 100 : 0;
  const expenseChange = previous ? ((current.expenses - previous.expenses) / (previous.expenses || 1)) * 100 : 0;

  return (
    <div className="space-y-6">
      {/* Current Month Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard
          label="Income"
          value={current.income}
          change={incomeChange}
          color="text-emerald-600"
          bg="bg-emerald-50"
          icon={TrendingUp}
        />
        <StatCard
          label="Expenses"
          value={current.expenses}
          change={expenseChange}
          color="text-red-600"
          bg="bg-red-50"
          icon={TrendingDown}
        />
        <StatCard
          label="Net"
          value={current.net}
          color={current.net >= 0 ? 'text-emerald-600' : 'text-red-600'}
          bg={current.net >= 0 ? 'bg-emerald-50' : 'bg-red-50'}
          icon={DollarSign}
        />
      </div>

      {/* Monthly Trend */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="p-4 border-b border-slate-100">
          <h3 className="font-semibold text-slate-800">Monthly Trend</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 text-left">
                <th className="px-4 py-3 font-medium text-slate-500">Month</th>
                <th className="px-4 py-3 font-medium text-slate-500 text-right">Income</th>
                <th className="px-4 py-3 font-medium text-slate-500 text-right">Expenses</th>
                <th className="px-4 py-3 font-medium text-slate-500 text-right">Net</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {summaries.map(s => (
                <tr key={s.month} className="hover:bg-slate-50">
                  <td className="px-4 py-3 font-medium text-slate-800">{formatMonth(s.month)}</td>
                  <td className="px-4 py-3 text-right text-emerald-600">{formatCurrency(s.income)}</td>
                  <td className="px-4 py-3 text-right text-red-600">{formatCurrency(s.expenses)}</td>
                  <td className={`px-4 py-3 text-right font-semibold ${s.net >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                    {formatCurrency(s.net)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Top Expense Categories (current month) */}
      {current.categoryBreakdown.length > 0 && (
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <h3 className="font-semibold text-slate-800 mb-4">
            Top Categories — {formatMonth(current.month)}
          </h3>
          <div className="space-y-3">
            {current.categoryBreakdown.slice(0, 10).map((cat, i) => {
              const maxAmount = current.categoryBreakdown[0].amount;
              const pct = maxAmount > 0 ? (cat.amount / maxAmount) * 100 : 0;
              return (
                <div key={i} className="flex items-center gap-3">
                  <span className="text-sm text-slate-600 w-40 truncate">{cat.category}</span>
                  <div className="flex-1 h-6 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${cat.type === 'income' ? 'bg-emerald-400' : 'bg-red-400'}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <span className={`text-sm font-medium w-24 text-right ${cat.type === 'income' ? 'text-emerald-600' : 'text-red-600'}`}>
                    {formatCurrency(cat.amount)}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({ label, value, change, color, bg, icon: Icon }: {
  label: string;
  value: number;
  change?: number;
  color: string;
  bg: string;
  icon: typeof DollarSign;
}) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5">
      <div className="flex items-center gap-3">
        <div className={`w-10 h-10 ${bg} rounded-lg flex items-center justify-center`}>
          <Icon className={`w-5 h-5 ${color}`} />
        </div>
        <div className="flex-1">
          <p className="text-xs text-slate-500">{label}</p>
          <p className={`text-xl font-bold ${color}`}>{formatCurrency(value)}</p>
        </div>
        {change !== undefined && change !== 0 && (
          <span className={`text-xs font-medium px-2 py-1 rounded-full ${change > 0 ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
            {change > 0 ? '+' : ''}{change.toFixed(0)}%
          </span>
        )}
      </div>
    </div>
  );
}

function formatCurrency(val: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(val);
}

function formatMonth(m: string): string {
  const [y, mo] = m.split('-');
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${months[parseInt(mo, 10) - 1]} ${y}`;
}
