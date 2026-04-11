import { Search, Upload, ArrowRight } from 'lucide-react';

export default function KDPOptimizerModule() {
  return (
    <div className="p-6 lg:p-8 max-w-5xl mx-auto">
      <div className="text-center py-16">
        <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-rose-500 to-rose-600 rounded-2xl shadow-lg shadow-rose-500/25 mb-6">
          <Search className="w-10 h-10 text-white" />
        </div>
        <h2 className="text-2xl font-bold text-slate-800 mb-2">KDP Optimizer</h2>
        <p className="text-slate-500 max-w-md mx-auto mb-8">
          Manage keyword lists by trope, analyze search volume and competition, and generate optimized Amazon 7-box keyword sets.
        </p>
        <div className="bg-slate-50 rounded-2xl p-6 max-w-lg mx-auto border border-slate-200">
          <h3 className="font-semibold text-slate-700 mb-3 flex items-center gap-2">
            <Upload className="w-4 h-4" /> Coming Up
          </h3>
          <ul className="text-sm text-slate-600 space-y-2 text-left">
            <li className="flex items-center gap-2"><ArrowRight className="w-3 h-3 text-rose-500 shrink-0" /> Trope-based keyword organization</li>
            <li className="flex items-center gap-2"><ArrowRight className="w-3 h-3 text-rose-500 shrink-0" /> CSV keyword import with smart matching</li>
            <li className="flex items-center gap-2"><ArrowRight className="w-3 h-3 text-rose-500 shrink-0" /> Amazon 7-box keyword optimizer</li>
            <li className="flex items-center gap-2"><ArrowRight className="w-3 h-3 text-rose-500 shrink-0" /> Search volume and competition analysis</li>
            <li className="flex items-center gap-2"><ArrowRight className="w-3 h-3 text-rose-500 shrink-0" /> JSON data import from existing app</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
