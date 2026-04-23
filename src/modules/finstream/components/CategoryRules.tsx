import { useState } from 'react';
import { Plus, Trash2, RefreshCw, Loader2, AlertCircle, Check, X, Edit2 } from 'lucide-react';
import { useCategoryRules } from '../hooks/useFinancials';
import { addCategoryRule, updateCategoryRule, deleteCategoryRule, recategorizeAll } from '../api';

export default function CategoryRules() {
  const { rules, loading, refetch } = useCategoryRules();
  const [matchString, setMatchString] = useState('');
  const [targetCategory, setTargetCategory] = useState('');
  const [ruleType, setRuleType] = useState<'income' | 'expense' | ''>('expense');
  const [saving, setSaving] = useState(false);
  const [recategorizing, setRecategorizing] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  // Editing state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editMatch, setEditMatch] = useState('');
  const [editCategory, setEditCategory] = useState('');
  const [editType, setEditType] = useState<'income' | 'expense' | ''>('');

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!matchString.trim() || !targetCategory.trim()) return;
    setSaving(true);
    setError('');
    try {
      await addCategoryRule({
        match_string: matchString.trim(),
        target_category: targetCategory.trim(),
        type: ruleType || null,
      });
      setMatchString('');
      setTargetCategory('');
      refetch();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to add rule');
    } finally {
      setSaving(false);
    }
  }

  function startEdit(rule: typeof rules[0]) {
    setEditingId(rule.id);
    setEditMatch(rule.match_string);
    setEditCategory(rule.target_category);
    setEditType(rule.type || '');
  }

  async function saveEdit() {
    if (!editingId || !editMatch.trim() || !editCategory.trim()) return;
    try {
      await updateCategoryRule(editingId, {
        match_string: editMatch.trim(),
        target_category: editCategory.trim(),
        type: editType || null,
      });
      setEditingId(null);
      refetch();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to update rule');
    }
  }

  async function handleDelete(id: string) {
    await deleteCategoryRule(id);
    refetch();
  }

  async function handleRecategorize() {
    setRecategorizing(true);
    setMessage('');
    try {
      const count = await recategorizeAll();
      setMessage(`Re-categorized ${count} transactions`);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to re-categorize');
    } finally {
      setRecategorizing(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="w-8 h-8 text-cyan-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl border border-slate-200 p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="font-semibold text-slate-800">Auto-Categorization Rules</h3>
            <p className="text-sm text-slate-500 mt-0.5">
              When a transaction description contains the match text, it gets automatically categorized.
            </p>
          </div>
          <button
            onClick={handleRecategorize}
            disabled={recategorizing || rules.length === 0}
            className="flex items-center gap-2 px-3 py-1.5 text-sm border border-slate-200 text-slate-700 rounded-lg hover:bg-slate-50 disabled:opacity-50"
          >
            {recategorizing ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}
            Re-categorize Uncategorized
          </button>
        </div>

        {/* Add Rule Form */}
        <form onSubmit={handleAdd} className="flex flex-wrap items-end gap-3 mb-4 pb-4 border-b border-slate-200">
          <div className="flex-1 min-w-[150px]">
            <label className="block text-xs text-slate-500 mb-1">If description contains</label>
            <input type="text" value={matchString} onChange={e => setMatchString(e.target.value)}
              placeholder="e.g., AMAZON, NETFLIX"
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-cyan-400" />
          </div>
          <div className="flex-1 min-w-[150px]">
            <label className="block text-xs text-slate-500 mb-1">Set category to</label>
            <input type="text" value={targetCategory} onChange={e => setTargetCategory(e.target.value)}
              placeholder="e.g., Software, Advertising"
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-cyan-400" />
          </div>
          <div className="w-32">
            <label className="block text-xs text-slate-500 mb-1">Type</label>
            <select value={ruleType} onChange={e => setRuleType(e.target.value as '' | 'income' | 'expense')}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm">
              <option value="expense">Expense</option>
              <option value="income">Income</option>
              <option value="">Auto</option>
            </select>
          </div>
          <button type="submit" disabled={saving || !matchString.trim() || !targetCategory.trim()}
            className="flex items-center gap-2 px-4 py-2 bg-cyan-600 text-white text-sm font-medium rounded-lg hover:bg-cyan-700 disabled:opacity-50">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
            Add Rule
          </button>
        </form>

        {error && (
          <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg mb-4">
            <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}
        {message && (
          <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg mb-4">
            <p className="text-sm text-emerald-700">{message}</p>
          </div>
        )}

        {/* Rules List */}
        <div className="divide-y divide-slate-100">
          {rules.map(rule => (
            <div key={rule.id} className="flex items-center justify-between py-3 gap-3">
              {editingId === rule.id ? (
                <>
                  <div className="flex items-center gap-3 flex-1 flex-wrap">
                    <input type="text" value={editMatch} onChange={e => setEditMatch(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter') saveEdit(); if (e.key === 'Escape') setEditingId(null); }}
                      className="px-2 py-1 border border-cyan-400 rounded text-sm font-mono w-48 focus:outline-none" autoFocus />
                    <span className="text-slate-400">&rarr;</span>
                    <input type="text" value={editCategory} onChange={e => setEditCategory(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter') saveEdit(); if (e.key === 'Escape') setEditingId(null); }}
                      className="px-2 py-1 border border-cyan-400 rounded text-sm w-40 focus:outline-none" />
                    <select value={editType} onChange={e => setEditType(e.target.value as '' | 'income' | 'expense')}
                      className="px-2 py-1 border border-cyan-400 rounded text-sm focus:outline-none">
                      <option value="expense">expense</option>
                      <option value="income">income</option>
                      <option value="">auto</option>
                    </select>
                  </div>
                  <div className="flex items-center gap-1">
                    <button onClick={saveEdit} className="p-1 text-green-600 hover:bg-green-50 rounded"><Check className="w-4 h-4" /></button>
                    <button onClick={() => setEditingId(null)} className="p-1 text-slate-400 hover:bg-slate-50 rounded"><X className="w-4 h-4" /></button>
                  </div>
                </>
              ) : (
                <>
                  <div className="flex items-center gap-4 text-sm flex-1 flex-wrap">
                    <span className="font-mono bg-slate-100 px-2 py-1 rounded text-slate-700">{rule.match_string}</span>
                    <span className="text-slate-400">&rarr;</span>
                    <span className="font-medium text-slate-800">{rule.target_category}</span>
                    {rule.type && (
                      <span className={`text-xs px-2 py-0.5 rounded-full ${
                        rule.type === 'income' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'
                      }`}>{rule.type}</span>
                    )}
                  </div>
                  <div className="flex items-center gap-1">
                    <button onClick={() => startEdit(rule)} className="p-1 text-slate-300 hover:text-cyan-500 rounded">
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button onClick={() => handleDelete(rule.id)} className="p-1 text-slate-300 hover:text-red-500 rounded">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </>
              )}
            </div>
          ))}
          {rules.length === 0 && (
            <p className="py-6 text-center text-sm text-slate-400">No rules yet. Add one above to auto-categorize transactions on import.</p>
          )}
        </div>
      </div>
    </div>
  );
}
