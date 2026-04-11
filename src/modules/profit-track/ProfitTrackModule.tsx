import { DollarSign, Upload, ArrowRight } from 'lucide-react';

export default function ProfitTrackModule() {
  return (
    <div className="p-6 lg:p-8 max-w-5xl mx-auto">
      <div className="text-center py-16">
        <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-green-500 to-green-600 rounded-2xl shadow-lg shadow-green-500/25 mb-6">
          <DollarSign className="w-10 h-10 text-white" />
        </div>
        <h2 className="text-2xl font-bold text-slate-800 mb-2">Profit Track</h2>
        <p className="text-slate-500 max-w-md mx-auto mb-8">
          Log daily ad spend and royalties across all platforms. Track ROAS, weekly summaries, orders, page reads, and per-book profitability.
        </p>
        <div className="bg-slate-50 rounded-2xl p-6 max-w-lg mx-auto border border-slate-200">
          <h3 className="font-semibold text-slate-700 mb-3 flex items-center gap-2">
            <Upload className="w-4 h-4" /> Coming Up
          </h3>
          <ul className="text-sm text-slate-600 space-y-2 text-left">
            <li className="flex items-center gap-2"><ArrowRight className="w-3 h-3 text-green-500 shrink-0" /> Daily ad spend and revenue entry</li>
            <li className="flex items-center gap-2"><ArrowRight className="w-3 h-3 text-green-500 shrink-0" /> Weekly and monthly summaries with ROAS</li>
            <li className="flex items-center gap-2"><ArrowRight className="w-3 h-3 text-green-500 shrink-0" /> Multi-platform revenue tracking</li>
            <li className="flex items-center gap-2"><ArrowRight className="w-3 h-3 text-green-500 shrink-0" /> Per-book profitability analysis</li>
            <li className="flex items-center gap-2"><ArrowRight className="w-3 h-3 text-green-500 shrink-0" /> Firebase + JSON data migration</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
