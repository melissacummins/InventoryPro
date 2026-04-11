import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import {
  LogOut, BookOpen, Package, BarChart3, DollarSign,
  Sparkles, Wallet, Search, Home, Menu, X, ChevronRight
} from 'lucide-react';
import { useState, type ReactNode } from 'react';

const modules = [
  { name: 'Home', path: '/', icon: Home, color: 'text-amber-400' },
  { name: 'Inventory', path: '/inventory', icon: Package, color: 'text-blue-400' },
  { name: 'Cross-Sell Analyzer', path: '/cross-sell', icon: BarChart3, color: 'text-emerald-400' },
  { name: 'Book Tracker', path: '/book-tracker', icon: BookOpen, color: 'text-purple-400' },
  { name: 'Profit Track', path: '/profit-track', icon: DollarSign, color: 'text-green-400' },
  { name: 'Ad Alchemy', path: '/ad-alchemy', icon: Sparkles, color: 'text-orange-400' },
  { name: 'FinStream', path: '/finstream', icon: Wallet, color: 'text-cyan-400' },
  { name: 'KDP Optimizer', path: '/kdp-optimizer', icon: Search, color: 'text-rose-400' },
];

export default function Layout({ children }: { children: ReactNode }) {
  const { user, profile, signOut } = useAuth();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const displayName = profile?.full_name || user?.user_metadata?.full_name || user?.email || 'User';
  const avatarUrl = profile?.avatar_url || user?.user_metadata?.avatar_url;
  const currentModule = modules.find(m => m.path === location.pathname) || modules[0];

  return (
    <div className="flex h-screen bg-slate-100">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed lg:static inset-y-0 left-0 z-50
        w-72 bg-slate-900 flex flex-col
        transform transition-transform duration-200
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        {/* Brand */}
        <div className="flex items-center gap-3 px-6 py-5 border-b border-slate-700/50">
          <div className="flex items-center justify-center w-10 h-10 bg-gradient-to-br from-amber-400 to-amber-600 rounded-xl shadow-lg shadow-amber-500/20">
            <BookOpen className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-white font-bold text-lg leading-tight">Command Center</h1>
            <p className="text-slate-500 text-xs">Author Tools</p>
          </div>
          <button
            onClick={() => setSidebarOpen(false)}
            className="ml-auto lg:hidden text-slate-400 hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {modules.map(module => {
            const Icon = module.icon;
            const isActive = location.pathname === module.path;
            return (
              <Link
                key={module.path}
                to={module.path}
                onClick={() => setSidebarOpen(false)}
                className={`
                  flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all group
                  ${isActive
                    ? 'bg-slate-800 text-white shadow-lg'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
                  }
                `}
              >
                <Icon className={`w-5 h-5 ${isActive ? module.color : 'text-slate-500 group-hover:text-slate-300'}`} />
                <span className="font-medium text-sm">{module.name}</span>
                {isActive && <ChevronRight className="w-4 h-4 ml-auto text-slate-500" />}
              </Link>
            );
          })}
        </nav>

        {/* User */}
        <div className="px-4 py-4 border-t border-slate-700/50">
          <div className="flex items-center gap-3">
            {avatarUrl ? (
              <img src={avatarUrl} alt="" className="w-9 h-9 rounded-full ring-2 ring-slate-700" />
            ) : (
              <div className="w-9 h-9 rounded-full bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center text-white font-bold text-sm">
                {displayName.charAt(0).toUpperCase()}
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="text-white text-sm font-medium truncate">{displayName}</p>
              <p className="text-slate-500 text-xs truncate">{user?.email}</p>
            </div>
            <button
              onClick={signOut}
              className="p-2 text-slate-500 hover:text-red-400 hover:bg-slate-800 rounded-lg transition-colors"
              title="Sign Out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top bar */}
        <header className="flex items-center gap-4 px-6 py-4 bg-white border-b border-slate-200 shadow-sm">
          <button
            onClick={() => setSidebarOpen(true)}
            className="lg:hidden text-slate-600 hover:text-slate-900"
          >
            <Menu className="w-6 h-6" />
          </button>
          <div className="flex items-center gap-2">
            <currentModule.icon className={`w-5 h-5 ${currentModule.color}`} />
            <h2 className="text-lg font-semibold text-slate-800">{currentModule.name}</h2>
          </div>
        </header>

        {/* Page content */}
        <div className="flex-1 overflow-y-auto">
          {children}
        </div>
      </main>
    </div>
  );
}
