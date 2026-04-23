import { useState } from 'react';
import { LayoutDashboard, List, Tag, CreditCard } from 'lucide-react';
import Dashboard from './components/Dashboard';
import TransactionTable from './components/TransactionTable';
import CategoryRules from './components/CategoryRules';
import Subscriptions from './components/Subscriptions';

type Tab = 'dashboard' | 'transactions' | 'rules' | 'subscriptions';

export default function FinStreamModule() {
  const [tab, setTab] = useState<Tab>('dashboard');

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <div className="flex gap-1 bg-slate-100 rounded-lg p-1">
          <TabButton active={tab === 'dashboard'} onClick={() => setTab('dashboard')} icon={LayoutDashboard} label="Dashboard" />
          <TabButton active={tab === 'transactions'} onClick={() => setTab('transactions')} icon={List} label="Transactions" />
          <TabButton active={tab === 'rules'} onClick={() => setTab('rules')} icon={Tag} label="Rules" />
          <TabButton active={tab === 'subscriptions'} onClick={() => setTab('subscriptions')} icon={CreditCard} label="Subscriptions" />
        </div>
      </div>

      {tab === 'dashboard' && <Dashboard />}
      {tab === 'transactions' && <TransactionTable />}
      {tab === 'rules' && <CategoryRules />}
      {tab === 'subscriptions' && <Subscriptions />}
    </div>
  );
}

function TabButton({ active, onClick, icon: Icon, label }: {
  active: boolean;
  onClick: () => void;
  icon: typeof LayoutDashboard;
  label: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
        active ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'
      }`}
    >
      <Icon className="w-4 h-4" /> {label}
    </button>
  );
}
