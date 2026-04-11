import React from 'react';
import { Package, Boxes, AlertTriangle, DollarSign } from 'lucide-react';

interface StatCardProps {
  label: string;
  value: string | number;
  icon: 'package' | 'boxes' | 'alert' | 'dollar';
  accent?: boolean;
}

export function StatCard({ label, value, icon, accent }: StatCardProps) {
  const icons = {
    package: <Package className="w-5 h-5" />,
    boxes: <Boxes className="w-5 h-5" />,
    alert: <AlertTriangle className="w-5 h-5" />,
    dollar: <DollarSign className="w-5 h-5" />
  };

  return (
    <div className={`bg-white rounded-lg border ${accent ? 'border-red-200' : 'border-gray-200'} p-4 shadow-sm`}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm text-gray-500 font-medium">{label}</span>
        <span className={accent ? 'text-red-500' : 'text-gray-400'}>{icons[icon]}</span>
      </div>
      <div className={`text-2xl font-bold ${accent ? 'text-red-600' : 'text-gray-900'}`}>{value}</div>
    </div>
  );
}
