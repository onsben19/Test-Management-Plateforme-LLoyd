import React from 'react';
import { type LucideIcon } from 'lucide-react';

interface StatCardProps {
  title: string;
  value: string;
  change?: string;
  changeType?: 'positive' | 'negative' | 'neutral';
  icon: LucideIcon;
}

const StatCard: React.FC<StatCardProps> = ({ title, value, change, changeType = 'neutral', icon: Icon }) => {
  const getChangeColor = () => {
    switch (changeType) {
      case 'positive':
        return 'text-green-500 dark:text-green-400';
      case 'negative':
        return 'text-red-500 dark:text-red-400';
      default:
        return 'text-slate-500 dark:text-slate-400';
    }
  };

  return (
    <div className="bg-white dark:bg-slate-800/50 backdrop-blur-sm border border-slate-200 dark:border-slate-700/50 rounded-xl p-6 hover:bg-slate-50 dark:hover:bg-slate-800/70 transition-all duration-200 shadow-sm dark:shadow-none">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-slate-500 dark:text-slate-400 text-sm font-medium transition-colors">{title}</p>
          <p className="text-2xl font-bold text-slate-900 dark:text-white mt-1 transition-colors">{value}</p>
          {change && (
            <p className={`text-sm mt-1 ${getChangeColor()} transition-colors`}>
              {change}
            </p>
          )}
        </div>
        <div className="bg-blue-100 dark:bg-blue-600/20 p-3 rounded-lg transition-colors">
          <Icon className="w-6 h-6 text-blue-600 dark:text-blue-400 transition-colors" />
        </div>
      </div>
    </div>
  );
};

export default StatCard;