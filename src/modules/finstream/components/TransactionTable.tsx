import { useState, useMemo } from 'react';
import { Search, Edit2, Check, X, Trash2, Upload, Loader2, AlertCircle } from 'lucide-react';
import { useTransactions, useCategoryRules } from '../hooks/useFinancials';
import { updateTransaction, deleteTransaction, importTransactions, getUniqueCategories, getUniqueMonths } from '../api';
import type { Transaction } from '../../../lib/types';
import Papa from 'papaparse';

export default function TransactionTable() {
  const { transactions, loading, refetch } = useTransactions();
  const { rules } = useCategoryRules();

  const [search, setSearch] = useState('');
  const [monthFilter, setMonthFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState<'' | 'income' | 'expense'>('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editCategory, setEditCategory] = useState('');
  const [importing, setImporting] = useState(false);
  const [importMsg, setImportMsg] = useState('');

  const categories = useMemo(() => getUniqueCategories(transactions), [transactions]);
  const months = useMemo(() => getUniqueMonths(transactions), [transactions]);

  const filtered = useMemo(() => {
    return transactions.filter(t => {
      if (monthFilter && !t.date.startsWith(monthFilter)) return false;
      if (typeFilter && t.type !== typeFilter) return false;
      if (categoryFilter && t.category !== categoryFilter) return false;
      if (search) {
        const s = search.toLowerCase();
        return t.description.toLowerCase().includes(s) || t.original_description.toLowerCase().includes(s) || t.category.toLowerCase().includes(s);
      }
      return true;
    });
  }, [transactions, search, monthFilter, typeFilter, categoryFilter]);

  const totalIncome = filtered.filter(t => t.type === 'income').reduce((s, t) => s + Number(t.amount), 0);
  const totalExpenses = filtered.filter(t => t.type === 'expense').reduce((s, t) => s + Number(t.amount), 0);

  async function handleCsvImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setImporting(true);
    setImportMsg('');

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: async (result) => {
        try {
          const rows = result.data as Record<string, string>[];
          const txs = rows.map(row => {
            const amount = parseFloat(
              (row.Amount || row.amount || row.Debit || row.Credit || '0').replace(/[$,]/g, '')
            );
            const date = normalizeDate(row.Date || row.date || row['Transaction Date'] || row['Posted Date'] || '');
            const desc = row.Description || row.description || row.Memo || row.memo || row['Transaction Description'] || '';

            return {
              date,
              description: desc,
              original_description: desc,
              amount,
              category: '',
              source: file.name,
              type: (amount < 0 ? 'expense' : 'income') as 'income' | 'expense',
            };
          }).filter(tx => tx.date && tx.amount !== 0);

          const count = await importTransactions(txs, rules);
          setImportMsg(`Imported ${count} transactions from ${file.name}`);
          refetch();
        } catch (err: unknown) {
          setImportMsg(err instanceof Error ? err.message : 'Import failed');
        } finally {
          setImporting(false);
          e.target.value = '';
        }
      },
      error: () => {
        setImportMsg('Failed to parse CSV file');
        setImporting(false);
      },
    });
  }

  async function handleSaveCategory(id: string) {
    await updateTransaction(id, { category: editCategory });
    setEditingId(null);
    refetch();
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this transaction?')) return;
    await deleteTransaction(id);
    refetch();
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="w-8 h-8 text-cyan-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Import + Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <label className={`flex items-center gap-2 px-4 py-2 border border-slate-200 text-slate-700 text-sm font-medium rounded-lg hover:bg-slate-50 cursor-pointer ${importing ? 'opacity-50' : ''}`}>
          {importing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
          Import CSV
          <input type="file" accept=".csv" onChange={handleCsvImport} className="hidden" disabled={importing} />
        </label>

        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input type="text" placeholder="Search..." value={search} onChange={e => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-cyan-400" />
        </div>

        <select value={monthFilter} onChange={e => setMonthFilter(e.target.value)}
          className="px-3 py-2 border border-slate-200 rounded-lg text-sm">
          <option value="">All Months</option>
          {months.map(m => <option key={m} value={m}>{m}</option>)}
        </select>

        <select value={typeFilter} onChange={e => setTypeFilter(e.target.value as '' | 'income' | 'expense')}
          className="px-3 py-2 border border-slate-200 rounded-lg text-sm">
          <option value="">All Types</option>
          <option value="income">Income</option>
          <option value="expense">Expense</option>
        </select>

        <select value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)}
          className="px-3 py-2 border border-slate-200 rounded-lg text-sm">
          <option value="">All Categories</option>
          {categories.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>

      {importMsg && (
        <div className={`flex items-start gap-2 p-3 rounded-lg ${importMsg.includes('Import') ? 'bg-emerald-50 border border-emerald-200' : 'bg-red-50 border border-red-200'}`}>
          <p className={`text-sm ${importMsg.includes('Import') ? 'text-emerald-700' : 'text-red-700'}`}>{importMsg}</p>
        </div>
      )}

      {/* Summary */}
      <div className="flex gap-4 text-sm">
        <span className="text-slate-500">{filtered.length} transactions</span>
        <span className="text-emerald-600 font-medium">Income: ${totalIncome.toFixed(2)}</span>
        <span className="text-red-600 font-medium">Expenses: ${totalExpenses.toFixed(2)}</span>
        <span className={`font-semibold ${totalIncome - totalExpenses >= 0 ? 'text-emerald-700' : 'text-red-700'}`}>
          Net: ${(totalIncome - totalExpenses).toFixed(2)}
        </span>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto max-h-[600px] overflow-y-auto">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-slate-50">
              <tr className="text-left">
                <th className="px-4 py-3 font-medium text-slate-500">Date</th>
                <th className="px-4 py-3 font-medium text-slate-500">Description</th>
                <th className="px-4 py-3 font-medium text-slate-500">Category</th>
                <th className="px-4 py-3 font-medium text-slate-500 text-right">Amount</th>
                <th className="px-4 py-3 font-medium text-slate-500">Type</th>
                <th className="px-4 py-3 w-10"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.slice(0, 500).map(tx => (
                <tr key={tx.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 text-slate-600 whitespace-nowrap">{tx.date}</td>
                  <td className="px-4 py-3 text-slate-800 max-w-xs truncate" title={tx.original_description}>
                    {tx.description}
                  </td>
                  <td className="px-4 py-3">
                    {editingId === tx.id ? (
                      <div className="flex items-center gap-1">
                        <input type="text" value={editCategory} onChange={e => setEditCategory(e.target.value)}
                          onKeyDown={e => { if (e.key === 'Enter') handleSaveCategory(tx.id); if (e.key === 'Escape') setEditingId(null); }}
                          className="w-32 px-1 py-0.5 border border-cyan-400 rounded text-sm" autoFocus />
                        <button onClick={() => handleSaveCategory(tx.id)} className="text-green-600"><Check className="w-3 h-3" /></button>
                        <button onClick={() => setEditingId(null)} className="text-slate-400"><X className="w-3 h-3" /></button>
                      </div>
                    ) : (
                      <span
                        className="cursor-pointer hover:bg-cyan-50 px-1 py-0.5 rounded inline-flex items-center gap-1 group"
                        onClick={() => { setEditingId(tx.id); setEditCategory(tx.category); }}
                      >
                        <span className={tx.category === 'Uncategorized' ? 'text-amber-500 italic' : 'text-slate-600'}>
                          {tx.category || 'Uncategorized'}
                        </span>
                        <Edit2 className="w-3 h-3 text-slate-300 group-hover:text-cyan-400 opacity-0 group-hover:opacity-100" />
                      </span>
                    )}
                  </td>
                  <td className={`px-4 py-3 text-right font-medium ${tx.type === 'income' ? 'text-emerald-600' : 'text-red-600'}`}>
                    ${Number(tx.amount).toFixed(2)}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                      tx.type === 'income' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'
                    }`}>
                      {tx.type}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <button onClick={() => handleDelete(tx.id)} className="p-1 text-slate-300 hover:text-red-500">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-slate-400">
                    {transactions.length === 0 ? 'No transactions. Import a CSV to get started.' : 'No transactions match your filters.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function normalizeDate(raw: string): string {
  if (!raw) return '';
  // Try ISO format first (2024-01-15)
  if (/^\d{4}-\d{2}-\d{2}/.test(raw)) return raw.substring(0, 10);
  // Try MM/DD/YYYY
  const parts = raw.split('/');
  if (parts.length === 3) {
    const [m, d, y] = parts;
    const year = y.length === 2 ? `20${y}` : y;
    return `${year}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
  }
  return raw;
}
