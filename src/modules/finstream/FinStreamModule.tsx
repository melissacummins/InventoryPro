import { Wallet, Upload, ArrowRight } from 'lucide-react';

export default function FinStreamModule() {
  return (
    <div className="p-6 lg:p-8 max-w-5xl mx-auto">
      <div className="text-center py-16">
        <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-cyan-500 to-cyan-600 rounded-2xl shadow-lg shadow-cyan-500/25 mb-6">
          <Wallet className="w-10 h-10 text-white" />
        </div>
        <h2 className="text-2xl font-bold text-slate-800 mb-2">FinStream</h2>
        <p className="text-slate-500 max-w-md mx-auto mb-8">
          Import bank and credit card transactions, auto-categorize expenses, track subscriptions, and project cash flow.
        </p>
        <div className="bg-slate-50 rounded-2xl p-6 max-w-lg mx-auto border border-slate-200">
          <h3 className="font-semibold text-slate-700 mb-3 flex items-center gap-2">
            <Upload className="w-4 h-4" /> Coming Up
          </h3>
          <ul className="text-sm text-slate-600 space-y-2 text-left">
            <li className="flex items-center gap-2"><ArrowRight className="w-3 h-3 text-cyan-500 shrink-0" /> Multi-bank CSV import (Capital One, Ally, etc.)</li>
            <li className="flex items-center gap-2"><ArrowRight className="w-3 h-3 text-cyan-500 shrink-0" /> Auto-categorization with custom rules</li>
            <li className="flex items-center gap-2"><ArrowRight className="w-3 h-3 text-cyan-500 shrink-0" /> Subscription detection and tracking</li>
            <li className="flex items-center gap-2"><ArrowRight className="w-3 h-3 text-cyan-500 shrink-0" /> 12-month cash flow projections</li>
            <li className="flex items-center gap-2"><ArrowRight className="w-3 h-3 text-cyan-500 shrink-0" /> JSON data import from existing app</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
