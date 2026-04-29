import React, { useState, useEffect } from 'react';
import { type LucideIcon } from 'lucide-react';
import { motion } from 'framer-motion';

interface StatCardProps {
  title: string;
  value: string | number;
  change?: string;
  changeType?: 'positive' | 'negative' | 'neutral';
  icon: LucideIcon;
  variant?: string;
  description?: string;
  isLoading?: boolean;
  onClick?: () => void;
}

const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  change,
  changeType = 'neutral',
  icon: Icon,
  variant = 'blue',
  description,
  isLoading = false,
  onClick
}) => {
  const variants: any = {
    blue: { bg: 'bg-blue-500/5', border: 'border-blue-500/20', accent: 'bg-blue-600', iconColor: 'text-blue-500' },
    red: { bg: 'bg-red-500/5', border: 'border-red-500/20', accent: 'bg-red-600', iconColor: 'text-red-500' },
    green: { bg: 'bg-green-500/5', border: 'border-green-500/20', accent: 'bg-green-600', iconColor: 'text-green-500' },
    yellow: { bg: 'bg-amber-500/5', border: 'border-amber-500/20', accent: 'bg-amber-600', iconColor: 'text-amber-500' },
    purple: { bg: 'bg-purple-500/5', border: 'border-purple-500/20', accent: 'bg-purple-600', iconColor: 'text-purple-500' },
    slate: { bg: 'bg-slate-500/5', border: 'border-slate-500/20', accent: 'bg-slate-600', iconColor: 'text-slate-500' },
    indigo: { bg: 'bg-indigo-500/5', border: 'border-indigo-500/20', accent: 'bg-indigo-600', iconColor: 'text-indigo-500' }
  };

  const currentVariant = variants[variant] || variants.blue;

  if (isLoading) {
    return <div className="h-32 bg-slate-100 dark:bg-white/5 animate-pulse rounded-3xl" />;
  }

  return (
    <div 
      onClick={onClick}
      className={`relative p-6 rounded-3xl border ${currentVariant.border} ${currentVariant.bg} ${onClick ? 'cursor-pointer hover:scale-[1.02] active:scale-95' : ''} transition-all duration-300 group overflow-hidden`}
    >
      <div className={`absolute -right-4 -bottom-4 w-24 h-24 rounded-full ${currentVariant.accent} opacity-[0.05] blur-2xl`} />
      
      <div className="flex justify-between items-start">
        <div>
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2">{title}</p>
          <h3 className="text-2xl font-black text-slate-900 dark:text-white">{value}</h3>
          {change && (
            <div className={`mt-2 text-[10px] font-bold ${changeType === 'positive' ? 'text-emerald-500' : 'text-rose-500'}`}>
              {change}
            </div>
          )}
          {description && <p className="mt-2 text-[10px] text-slate-400 font-medium">{description}</p>}
        </div>
        <div className={`p-3 rounded-xl ${currentVariant.bg} ${currentVariant.iconColor}`}>
          <Icon size={20} />
        </div>
      </div>
    </div>
  );
};

export default StatCard;