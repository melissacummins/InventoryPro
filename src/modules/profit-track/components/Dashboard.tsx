import React, { useMemo } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  AreaChart, Area, PieChart, Pie, Cell
} from 'recharts';
import { DollarSign, TrendingUp, Activity, PieChart as PieChartIcon, BookOpen, Layers } from 'lucide-react';
import { DailyRecord, MonthlyOrderEntry, MonthlyPageReads, OrderSource } from '../types';
import { calculateMetrics, formatCurrency, formatPercent, formatNumber, groupDataByYear } from '../utils/calculations';
import { SummaryCard } from './SummaryCard';

interface DashboardProps {
  data: DailyRecord[];
  monthlyOrders: MonthlyOrderEntry[];
  monthlyPageReads: MonthlyPageReads[];
  sources: OrderSource[];
}

export const Dashboard: React.FC<DashboardProps> = ({ data, monthlyOrders, monthlyPageReads, sources }) => {
  
  // --- 1. Top Card Aggregates ---
  const aggregates = useMemo(() => {
    let totalRev = 0;
    let totalSpend = 0;
    
    data.forEach(record => {
      const metrics = calculateMetrics(record);
      totalRev += metrics.totalRevenue;
      totalSpend += metrics.totalAdSpend;
    });

    const net = totalRev - totalSpend;
    const roas = totalSpend > 0 ? totalRev / totalSpend : 0;
    const margin = totalRev > 0 ? (net / totalRev) : 0;

    return { totalRev, totalSpend, net, roas, margin };
  }, [data]);

  const volumeAggregates = useMemo(() => {
    const totalReads = monthlyPageReads.reduce((sum, entry) => sum + entry.reads, 0);
    const totalUnits = monthlyOrders.reduce((sum, entry) => {
        const source = sources.find(s => s.id === entry.sourceId);
        // Use historical snapshot if available, otherwise current multiplier
        const mult = entry.snapshotMultiplier !== undefined ? entry.snapshotMultiplier : (source?.multiplier || 1);
        return sum + (entry.count * mult);
    }, 0);
    return { totalReads, totalUnits };
  }, [monthlyOrders, monthlyPageReads, sources]);

  // --- 2. Chart Data: Yearly Financials ---
  const yearlyChartData = useMemo(() => {
    // Reuse the helper but we only need financial parts for this chart mainly
    const grouped = groupDataByYear(data, sources, monthlyOrders, monthlyPageReads);
    // Sort ascending for chart (Oldest year -> Newest year)
    return grouped.sort((a, b) => parseInt(a.year) - parseInt(b.year));
  }, [data, sources, monthlyOrders, monthlyPageReads]);

  // --- 3. Chart Data: Platform Breakdown ---
  const platformData = useMemo(() => {
    const breakdown = {
      Shopify: 0,
      Amazon: 0,
      Draft2Digital: 0,
      GooglePlay: 0,
      Kobo: 0, // Kobo + Kobo Plus
    };

    data.forEach(r => {
      breakdown.Shopify += (r.shopifyRev || 0);
      breakdown.Amazon += (r.amazonRev || 0);
      breakdown.Draft2Digital += (r.d2dRev || 0);
      breakdown.GooglePlay += (r.googleRev || 0);
      breakdown.Kobo += ((r.koboRev || 0) + (r.koboPlusRev || 0));
    });

    const result = [
      { name: 'Amazon', value: breakdown.Amazon, color: '#FF9900' },
      { name: 'Shopify', value: breakdown.Shopify, color: '#96bf48' },
      { name: 'Kobo', value: breakdown.Kobo, color: '#bf0000' },
      { name: 'Draft2Digital', value: breakdown.Draft2Digital, color: '#666666' },
      { name: 'Google Play', value: breakdown.GooglePlay, color: '#4285F4' },
    ].filter(i => i.value > 0).sort((a,b) => b.value - a.value);

    return result;
  }, [data]);

  if (data.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-96 text-gray-500">
        <PieChartIcon className="w-16 h-16 mb-4 text-gray-300" />
        <p className="text-lg font-medium">No data available yet.</p>
        <p className="text-sm">Go to "Add Data" to import your Excel sheet or add entries.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Top Cards: Financials */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <SummaryCard 
          title="Total Revenue" 
          value={formatCurrency(aggregates.totalRev)} 
          subValue="All time"
          icon={DollarSign}
          colorClass="text-emerald-600"
        />
        <SummaryCard 
          title="Total Ad Spend" 
          value={formatCurrency(aggregates.totalSpend)} 
          subValue={`${formatPercent(aggregates.totalSpend/aggregates.totalRev)} of income`}
          icon={Activity}
          colorClass="text-red-500"
          trend="down"
        />
        <SummaryCard 
          title="Net Profit" 
          value={formatCurrency(aggregates.net)} 
          subValue={`Margin: ${formatPercent(aggregates.margin)}`}
          icon={TrendingUp}
          colorClass="text-indigo-600"
        />
        <SummaryCard 
          title="Average ROAS" 
          value={`${aggregates.roas.toFixed(2)}x`}
          subValue="Target: 2.0x+"
          icon={PieChartIcon}
          colorClass="text-amber-500"
        />
      </div>

      {/* Second Row: Volume Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
         <SummaryCard 
            title="Total Units Sold" 
            value={formatNumber(volumeAggregates.totalUnits)}
            subValue="Calculated using bundle multipliers"
            icon={Layers}
            colorClass="text-blue-600"
         />
         <SummaryCard 
            title="Total Page Reads" 
            value={formatNumber(volumeAggregates.totalReads)}
            subValue="KENP"
            icon={BookOpen}
            colorClass="text-purple-600"
         />
      </div>

      {/* Third Row: Main Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left: Yearly Revenue vs Spend */}
        <div className="lg:col-span-2 bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <h3 className="text-lg font-bold text-gray-800 mb-6">Revenue vs Ad Spend (Yearly)</h3>
          <div className="h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={yearlyChartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                <XAxis dataKey="year" stroke="#9CA3AF" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="#9CA3AF" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(val) => `$${val/1000}k`} />
                <Tooltip 
                  cursor={{fill: '#f3f4f6'}}
                  formatter={(value: number) => formatCurrency(value)}
                  contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}
                />
                <Legend />
                <Bar dataKey="totalRevenue" name="Revenue" fill="#10B981" radius={[4, 4, 0, 0]} barSize={60} />
                <Bar dataKey="totalSpend" name="Ad Spend" fill="#EF4444" radius={[4, 4, 0, 0]} barSize={60} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Right: Platform Breakdown */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex flex-col">
          <h3 className="text-lg font-bold text-gray-800 mb-2">Earnings by Platform</h3>
          <div className="flex-1 min-h-[300px] relative">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={platformData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {platformData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip formatter={(value: number) => formatCurrency(value)} />
              </PieChart>
            </ResponsiveContainer>
            {/* Center Text Overlay Idea: Could put total revenue here */}
          </div>
          <div className="mt-4 space-y-3">
             {platformData.map(p => (
                <div key={p.name} className="flex items-center justify-between text-sm">
                   <div className="flex items-center">
                      <div className="w-3 h-3 rounded-full mr-2" style={{ backgroundColor: p.color }}></div>
                      <span className="text-gray-600">{p.name}</span>
                   </div>
                   <span className="font-bold text-gray-900">{formatCurrency(p.value)}</span>
                </div>
             ))}
          </div>
        </div>
      </div>

      {/* Fourth Row: Year-Over-Year Growth Trend */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
        <h3 className="text-lg font-bold text-gray-800 mb-6">Year-Over-Year Revenue Growth</h3>
        <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={yearlyChartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorGrowth" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#4F46E5" stopOpacity={0.1}/>
                    <stop offset="95%" stopColor="#4F46E5" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <XAxis dataKey="year" stroke="#9CA3AF" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="#9CA3AF" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(val) => `$${val/1000}k`} />
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                <Tooltip formatter={(value: number) => formatCurrency(value)} />
                <Area type="monotone" dataKey="totalRevenue" stroke="#4F46E5" strokeWidth={3} fillOpacity={1} fill="url(#colorGrowth)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
      </div>
    </div>
  );
};