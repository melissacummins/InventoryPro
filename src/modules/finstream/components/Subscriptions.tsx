import { useState } from 'react';
import { Plus, Trash2, Loader2, CreditCard } from 'lucide-react';
import { useSubscriptions } from '../hooks/useFinancials';
import { addSubscription, deleteSubscription } from '../api';
import type { ManualSubscription } from '../../../lib/types';

export default function Subscriptions() {
  const { subscriptions, loading, refetch } = useSubscriptions();
  const [showAdd, setShowAdd] = useState(false);
  const [vendor, setVendor] = useState('');
  const [amount, setAmount] = useState('');
  const [frequency, setFrequency] = useState<ManualSubscription['frequency']>('Monthly');
  const [matchString, setMatchString] = useState('');
  const [saving, setSaving] = useState(false);

  const monthlyTotal = subscriptions.reduce((sum, s) => {
    if (!s.amount) return sum;
    if (s.frequency === 'Monthly') return sum + s.amount;
    if (s.frequency === 'Yearly') return sum + s.amount / 12;
    if (s.frequency === 'Weekly') return sum + s.amount * 4.33;
    return sum;
  }, 0);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!vendor.trim()) return;
    setSaving(true);
    await addSubscription({
      vendor_name: vendor.trim(),
      amount: amount ? parseFloat(amount) : null,
      frequency,
      match_string: matchString.trim() || null,
    });
    setVendor('');
    setAmount('');
    setMatchString('');
    setShowAdd(false);
    setSaving(false);
    refetch();
  }

  async function handleDelete(id: string) {
    if (!confirm('Remove this subscription?')) return;
    await deleteSubscription(id);
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
    <div className="space-y-6">
      {/* Summary */}
      <div className="bg-white rounded-xl border border-slate-200 p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="font-semibold text-slate-800">Subscriptions</h3>
            <p className="text-sm text-slate-500">
              {subscriptions.length} subscription{subscriptions.length !== 1 ? 's' : ''} &middot;
              Est. <span className="font-medium text-slate-700">${monthlyTotal.toFixed(2)}/mo</span>
            </p>
          </div>
          <button
            onClick={() => setShowAdd(!showAdd)}
            className="flex items-center gap-2 px-4 py-2 bg-cyan-600 text-white text-sm font-medium rounded-lg hover:bg-cyan-700"
          >
            <Plus className="w-4 h-4" /> Add Subscription
          </button>
        </div>

        {showAdd && (
          <form onSubmit={handleAdd} className="flex flex-wrap items-end gap-3 mb-4 pb-4 border-b border-slate-200">
            <div className="flex-1 min-w-[150px]">
              <label className="block text-xs text-slate-500 mb-1">Vendor *</label>
              <input type="text" value={vendor} onChange={e => setVendor(e.target.value)}
                placeholder="e.g., Adobe, Canva"
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-cyan-400" />
            </div>
            <div className="w-28">
              <label className="block text-xs text-slate-500 mb-1">Amount</label>
              <input type="number" step="0.01" value={amount} onChange={e => setAmount(e.target.value)}
                placeholder="9.99"
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-cyan-400" />
            </div>
            <div className="w-28">
              <label className="block text-xs text-slate-500 mb-1">Frequency</label>
              <select value={frequency} onChange={e => setFrequency(e.target.value as ManualSubscription['frequency'])}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm">
                <option value="Monthly">Monthly</option>
                <option value="Yearly">Yearly</option>
                <option value="Weekly">Weekly</option>
              </select>
            </div>
            <div className="flex-1 min-w-[120px]">
              <label className="block text-xs text-slate-500 mb-1">Match text (for auto-detect)</label>
              <input type="text" value={matchString} onChange={e => setMatchString(e.target.value)}
                placeholder="Optional"
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-cyan-400" />
            </div>
            <button type="submit" disabled={saving || !vendor.trim()}
              className="px-4 py-2 bg-cyan-600 text-white text-sm rounded-lg hover:bg-cyan-700 disabled:opacity-50">
              {saving ? 'Adding...' : 'Add'}
            </button>
          </form>
        )}

        {/* Subscription List */}
        <div className="divide-y divide-slate-100">
          {subscriptions.map(sub => (
            <div key={sub.id} className="flex items-center justify-between py-3">
              <div className="flex items-center gap-3">
                <CreditCard className="w-4 h-4 text-slate-400" />
                <div>
                  <p className="text-sm font-medium text-slate-800">{sub.vendor_name}</p>
                  {sub.match_string && (
                    <p className="text-xs text-slate-400">Matches: "{sub.match_string}"</p>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="text-right">
                  {sub.amount && (
                    <p className="text-sm font-medium text-slate-800">${sub.amount.toFixed(2)}</p>
                  )}
                  <p className="text-xs text-slate-400">{sub.frequency}</p>
                </div>
                <button onClick={() => handleDelete(sub.id)} className="p-1 text-slate-300 hover:text-red-500">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
          {subscriptions.length === 0 && (
            <div className="text-center py-8">
              <CreditCard className="w-10 h-10 text-slate-300 mx-auto mb-2" />
              <p className="text-sm text-slate-400">No subscriptions tracked yet.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
