import { useState, useEffect, useMemo } from 'react';
import { TrendingUp, TrendingDown, Wallet, Loader2, DollarSign } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, PieChart, Pie } from 'recharts';
import { useTransactions } from '../hooks/useFinancials';

export default function Dashboard() {
  const { transactions, loading } = useTransactions();

  const stats = useMemo(() => {
    let totalIncome = 0;
    let totalExpenses = 0;
    const monthlyData = new Map<string, { income: number; expenses: number }>();
    const expenseCategories = new Map<string, number>();

    for (const tx of transactions) {
      const amount = Math.abs(Number(tx.amount));
      const month = tx.date.substring(0, 7);

      if (!monthlyData.has(month)) monthlyData.set(month, { income: 0, expenses: 0 });
      const entry = monthlyData.get(month)!;

      if (tx.type === 'income') {
        totalIncome += amount;
        entry.income += amount;
      } else {
        totalExpenses += amount;
        entry.expenses += amount;
        expenseCategories.set(tx.category, (expenseCategories.get(tx.category) || 0) + amount);
      }
    }

    const months = Array.from(monthlyData.entries())
      .map(([month, data]) => ({ month: formatMonth(month), ...data }))
      .sort((a, b) => a.month.localeCompare(b.month));

    const expenseBreakdown = Array.from(expenseCategories.entries())
      .map(([category, amount]) => ({ category, amount: Math.round(amount) }))
      .sort((a, b) => b.amount - a.amount);

    return { totalIncome, totalExpenses, net: totalIncome - totalExpenses, months, expenseBreakdown };
  }, [transactions]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="w-8 h-8 text-cyan-500 animate-spin" />
      </div>
    );
  }

  if (transactions.length === 0) {
    return (
      <div className="text-center py-16 bg-white rounded-xl border border-slate-200">
        <DollarSign className="w-12 h-12 text-slate-300 mx-auto mb-3" />
        <h3 className="text-lg font-semibold text-slate-700 mb-1">No transactions yet</h3>
        <p className="text-sm text-slate-400">Import bank transactions from the Transactions tab to see your financial overview.</p>
      </div>
    );
  }

  const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#f97316', '#8b5cf6', '#06b6d4', '#ec4899', '#64748b'];

  return (
    <div className="space-y-6">
      {/* Top Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border border-slate-200 p-5 flex items-center gap-4">
          <div className="w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center">
            <TrendingUp className="w-6 h-6 text-emerald-600" />
          </div>
          <div>
            <p className="text-xs text-slate-500">Total Income</p>
            <p className="text-2xl font-bold text-slate-800">{formatCurrency(stats.totalIncome)}</p>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-5 flex items-center gap-4">
          <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
            <TrendingDown className="w-6 h-6 text-red-600" />
          </div>
          <div>
            <p className="text-xs text-slate-500">Total Expenses</p>
            <p className="text-2xl font-bold text-slate-800">{formatCurrency(stats.totalExpenses)}</p>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-5 flex items-center gap-4">
          <div className={`w-12 h-12 ${stats.net >= 0 ? 'bg-blue-100' : 'bg-red-100'} rounded-full flex items-center justify-center`}>
            <Wallet className={`w-6 h-6 ${stats.net >= 0 ? 'text-blue-600' : 'text-red-600'}`} />
          </div>
          <div>
            <p className="text-xs text-slate-500">Net Cash Flow</p>
            <p className={`text-2xl font-bold ${stats.net >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
              {formatCurrency(stats.net)}
            </p>
          </div>
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Income vs Expenses Bar Chart */}
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <h3 className="font-semibold text-slate-800 mb-4">Income vs Expenses</h3>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={stats.months} barGap={4}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="month" tick={{ fontSize: 12, fill: '#94a3b8' }} />
              <YAxis tick={{ fontSize: 12, fill: '#94a3b8' }} tickFormatter={v => `$${v}`} />
              <Tooltip
                formatter={(val: number) => formatCurrency(val)}
                contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0' }}
              />
              <Bar dataKey="income" name="Income" fill="#10b981" radius={[4, 4, 0, 0]} />
              <Bar dataKey="expenses" name="Expenses" fill="#ef4444" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Expense Breakdown Donut Chart */}
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <h3 className="font-semibold text-slate-800 mb-4">Expense Breakdown</h3>
          <div className="flex items-center gap-6">
            <div className="w-48 h-48 shrink-0">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={stats.expenseBreakdown.slice(0, 8)}
                    dataKey="amount"
                    nameKey="category"
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={2}
                  >
                    {stats.expenseBreakdown.slice(0, 8).map((_, i) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(val: number) => formatCurrency(val)} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex-1 space-y-2">
              {stats.expenseBreakdown.slice(0, 8).map((cat, i) => (
                <div key={cat.category} className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                    <span className="text-slate-600">{cat.category}</span>
                  </div>
                  <span className="font-medium text-slate-800">{formatCurrency(cat.amount)}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Monthly Detail Table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="p-4 border-b border-slate-100">
          <h3 className="font-semibold text-slate-800">Monthly Detail</h3>
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
              {stats.months.map(m => (
                <tr key={m.month} className="hover:bg-slate-50">
                  <td className="px-4 py-3 font-medium text-slate-800">{m.month}</td>
                  <td className="px-4 py-3 text-right text-emerald-600">{formatCurrency(m.income)}</td>
                  <td className="px-4 py-3 text-right text-red-600">{formatCurrency(m.expenses)}</td>
                  <td className={`px-4 py-3 text-right font-semibold ${m.income - m.expenses >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                    {formatCurrency(m.income - m.expenses)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
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
