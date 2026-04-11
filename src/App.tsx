import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { Layout } from './components/Layout';
import { ErrorBoundary } from './components/ErrorBoundary';
import Dashboard from './pages/Dashboard';
import Inventory from './pages/Inventory';
import InventoryLog from './pages/InventoryLog';
import PurchaseOrders from './pages/PurchaseOrders';
import Analytics from './pages/Analytics';
import Specs from './pages/Specs';
import Quotes from './pages/Quotes';
import { LogIn } from 'lucide-react';
import { collection, getDocs, updateDoc, doc } from 'firebase/firestore';
import { db } from './firebase';

import { Orders } from './components/Orders';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, isAdmin, loading, login } = useAuth();

  useEffect(() => {
    const clearExistingOverrides = async () => {
      if (localStorage.getItem('cleared_csv_overrides_v1')) return;
      try {
        const snapshot = await getDocs(collection(db, 'products'));
        const promises = snapshot.docs.map(d => {
          const data = d.data();
          if (data.csvAvgDaily && data.csvAvgDaily > 0) {
            return updateDoc(doc(db, 'products', d.id), { csvAvgDaily: 0 });
          }
          return Promise.resolve();
        });
        await Promise.all(promises);
        localStorage.setItem('cleared_csv_overrides_v1', 'true');
        console.log('Successfully cleared all existing CSV overrides.');
      } catch (error) {
        console.error('Error clearing overrides:', error);
      }
    };
    
    if (isAdmin) {
      clearExistingOverrides();
    }
  }, [isAdmin]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-600"></div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 p-4">
        <div className="bg-white p-8 rounded-xl shadow-lg max-w-md w-full text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Inventory System</h1>
          <p className="text-gray-600 mb-8">Please sign in to access the dashboard.</p>
          <button
            onClick={login}
            className="w-full flex items-center justify-center gap-2 bg-brand-600 hover:bg-brand-700 text-white font-medium py-3 px-4 rounded-lg transition-colors"
          >
            <LogIn className="w-5 h-5" />
            Sign in with Google
          </button>
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 p-4">
        <div className="bg-white p-8 rounded-xl shadow-lg max-w-md w-full text-center border border-red-100">
          <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4.5c-.77-.833-2.694-.833-3.464 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z" /></svg>
          </div>
          <h1 className="text-xl font-bold text-gray-900 mb-2">Access Denied</h1>
          <p className="text-gray-600 mb-6">You do not have permission to access this system. Please contact the administrator.</p>
          <button
            onClick={() => window.location.reload()}
            className="text-brand-600 hover:text-brand-800 font-medium"
          >
            Refresh
          </button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}

export default function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider>
        <AuthProvider>
          <BrowserRouter>
            <Routes>
              <Route path="/" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
                <Route index element={<Dashboard />} />
                <Route path="inventory" element={<Inventory />} />
                <Route path="orders" element={<Orders />} />
                <Route path="inventory-log" element={<InventoryLog />} />
                <Route path="purchase-orders" element={<PurchaseOrders />} />
                <Route path="analytics" element={<Analytics />} />
                <Route path="specs" element={<Specs />} />
                <Route path="quotes" element={<Quotes />} />
                <Route path="*" element={<Navigate to="/" replace />} />
              </Route>
            </Routes>
          </BrowserRouter>
        </AuthProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}
