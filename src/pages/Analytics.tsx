import React, { useMemo, useState, useEffect } from 'react';
import { useProducts } from '../hooks/useProducts';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { BarChart2 } from 'lucide-react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../firebase';

export default function Analytics() {
  const { products, loading } = useProducts();
  const [regions, setRegions] = useState<{region: string, count: number}[]>([]);

  useEffect(() => {
    async function fetchRegions() {
      try {
        const snapshot = await getDocs(collection(db, 'salesRegions'));
        const data: Record<string, number> = {};
        snapshot.forEach(doc => {
          const d = doc.data();
          data[d.region] = (data[d.region] || 0) + d.count;
        });
        const arr = Object.keys(data).map(k => ({ region: k, count: data[k] })).sort((a, b) => b.count - a.count).slice(0, 15);
        setRegions(arr);
      } catch (e) {
        console.error("Error fetching regions", e);
      }
    }
    fetchRegions();
  }, []);

  const marginData = useMemo(() => {
    return products
      .filter(p => p.basePrice > 0)
      .map(p => {
        const basePrice = p.basePrice || 0;
        const handlingFeeAddOn = p.handlingFeeAddOn || 0;
        const productionCost = p.productionCost || 0;
        const shippingCost = p.shippingCost || 0;
        const shippingSuppliesCost = p.shippingSuppliesCost || 0;
        const paCosts = p.paCosts || 0;
        
        const transactionFees = (basePrice * 0.029) + 0.30;
        const netMarginDollars = (basePrice + handlingFeeAddOn) - (productionCost + shippingCost + transactionFees + shippingSuppliesCost + paCosts);
        const netMarginPercent = basePrice > 0 ? (netMarginDollars / basePrice) * 100 : 0;
        
        return {
          name: p.name,
          margin: parseFloat((netMarginPercent || 0).toFixed(1)),
          cost: parseFloat((productionCost + shippingCost + transactionFees + shippingSuppliesCost + paCosts).toFixed(2)),
          price: basePrice
        };
      })
      .sort((a, b) => b.margin - a.margin)
      .slice(0, 15); // Top 15 products
  }, [products]);

  const mostOrderedData = useMemo(() => {
    return products
      .map(p => ({
        name: p.name,
        sales: (p.sixMonthBookSales || 0) + (p.sixMonthBundleSales || 0)
      }))
      .filter(p => p.sales > 0)
      .sort((a, b) => b.sales - a.sales)
      .slice(0, 15);
  }, [products]);

  if (loading) {
    return <div className="flex justify-center items-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-600"></div></div>;
  }

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 bg-brand-100 text-brand-700 rounded-lg">
          <BarChart2 className="w-6 h-6" />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Analytics Dashboard</h2>
          <p className="text-sm text-gray-500 mt-1">Visual insights into your inventory and margins.</p>
        </div>
      </div>

      <div className="mb-6">
        <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
          <h3 className="text-lg font-semibold text-gray-900 mb-1">Sales by Region</h3>
          <p className="text-xs text-gray-500 mb-4">Based on imported Shopify CSV data</p>
          <div className="h-[400px]">
            {regions.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={regions} layout="vertical" margin={{ top: 5, right: 30, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#E5E7EB" />
                  <XAxis type="number" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#6B7280' }} />
                  <YAxis dataKey="region" type="category" width={120} axisLine={false} tickLine={false} tick={{fontSize: 11, fill: '#6B7280'}} />
                  <Tooltip 
                    cursor={{ fill: '#F3F4F6' }}
                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}
                  />
                  <Bar dataKey="count" fill="var(--color-brand-600)" name="Orders" radius={[0, 4, 4, 0]} maxBarSize={20} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-gray-400">
                <BarChart2 className="w-12 h-12 mb-2 opacity-20" />
                <p>No region data available.</p>
                <p className="text-xs mt-1">Import a Shopify CSV with shipping addresses to populate this chart.</p>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 mb-6">
        <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Most Ordered Items (Last 6 Months)</h3>
          <div className="h-[400px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={mostOrderedData} layout="vertical" margin={{ top: 5, right: 30, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#E5E7EB" />
                <XAxis type="number" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#6B7280' }} />
                <YAxis dataKey="name" type="category" width={300} axisLine={false} tickLine={false} tick={{fontSize: 11, fill: '#6B7280'}} />
                <Tooltip 
                  cursor={{ fill: '#F3F4F6' }}
                  contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}
                />
                <Bar dataKey="sales" fill="var(--color-brand-500)" name="Units Sold" radius={[0, 4, 4, 0]} maxBarSize={20} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Top 15 Products by Net Margin (%)</h3>
          <div className="h-[400px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={marginData} layout="vertical" margin={{ top: 5, right: 30, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#E5E7EB" />
                <XAxis type="number" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#6B7280' }} />
                <YAxis dataKey="name" type="category" width={300} axisLine={false} tickLine={false} tick={{fontSize: 11, fill: '#6B7280'}} />
                <Tooltip 
                  cursor={{ fill: '#F3F4F6' }}
                  contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}
                />
                <Bar dataKey="margin" fill="var(--color-brand-600)" name="Net Margin %" radius={[0, 4, 4, 0]} maxBarSize={20} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}
