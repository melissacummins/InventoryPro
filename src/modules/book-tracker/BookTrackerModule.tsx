import { BookOpen, Upload, ArrowRight } from 'lucide-react';

export default function BookTrackerModule() {
  return (
    <div className="p-6 lg:p-8 max-w-5xl mx-auto">
      <div className="text-center py-16">
        <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-purple-500 to-purple-600 rounded-2xl shadow-lg shadow-purple-500/25 mb-6">
          <BookOpen className="w-10 h-10 text-white" />
        </div>
        <h2 className="text-2xl font-bold text-slate-800 mb-2">Book Tracker</h2>
        <p className="text-slate-500 max-w-md mx-auto mb-8">
          Track development costs for each book, log quarterly profits, and see exactly when each title has paid for itself.
        </p>
        <div className="bg-slate-50 rounded-2xl p-6 max-w-lg mx-auto border border-slate-200">
          <h3 className="font-semibold text-slate-700 mb-3 flex items-center gap-2">
            <Upload className="w-4 h-4" /> Coming Up
          </h3>
          <ul className="text-sm text-slate-600 space-y-2 text-left">
            <li className="flex items-center gap-2"><ArrowRight className="w-3 h-3 text-purple-500 shrink-0" /> Active and paid-off book tracking</li>
            <li className="flex items-center gap-2"><ArrowRight className="w-3 h-3 text-purple-500 shrink-0" /> Cost breakdown by category (editing, cover, etc.)</li>
            <li className="flex items-center gap-2"><ArrowRight className="w-3 h-3 text-purple-500 shrink-0" /> Quarterly profit updates</li>
            <li className="flex items-center gap-2"><ArrowRight className="w-3 h-3 text-purple-500 shrink-0" /> Payoff timeline estimates</li>
            <li className="flex items-center gap-2"><ArrowRight className="w-3 h-3 text-purple-500 shrink-0" /> Firebase data migration tool</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
