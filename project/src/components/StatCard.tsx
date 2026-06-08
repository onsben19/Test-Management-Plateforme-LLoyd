import React, { useState, useEffect } from 'react';
import { type LucideIcon } from 'lucide-react';
import { motion } from 'framer-motion';

interface StatCardProps {
  title: string;
  value: string | number;
  change?: string;
  changeType?: 'positive' | 'negative' | 'neutral';
  icon?: LucideIcon;
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
    blue: { bg: 'bg-blue-500/5', border: 'border-blue-500/20', accent: 'bg-blue-600', iconColor: 'text-blue-500', sweep: 'from-blue-500/0 via-blue-500/10 to-blue-500/0', titleHover: 'group-hover:text-blue-500', borderHover: 'hover:border-blue-500/40 hover:bg-blue-500/[0.03] hover:shadow-blue-500/10' },
    red: { bg: 'bg-red-500/5', border: 'border-red-500/20', accent: 'bg-red-600', iconColor: 'text-red-500', sweep: 'from-red-500/0 via-red-500/10 to-red-500/0', titleHover: 'group-hover:text-red-500', borderHover: 'hover:border-red-500/40 hover:bg-red-500/[0.03] hover:shadow-red-500/10' },
    green: { bg: 'bg-green-500/5', border: 'border-green-500/20', accent: 'bg-green-600', iconColor: 'text-green-500', sweep: 'from-green-500/0 via-green-500/10 to-green-500/0', titleHover: 'group-hover:text-green-500', borderHover: 'hover:border-green-500/40 hover:bg-green-500/[0.03] hover:shadow-green-500/10' },
    yellow: { bg: 'bg-amber-500/5', border: 'border-amber-500/20', accent: 'bg-amber-600', iconColor: 'text-amber-500', sweep: 'from-amber-500/0 via-amber-500/10 to-amber-500/0', titleHover: 'group-hover:text-amber-500', borderHover: 'hover:border-amber-500/40 hover:bg-amber-500/[0.03] hover:shadow-amber-500/10' },
    purple: { bg: 'bg-purple-500/5', border: 'border-purple-500/20', accent: 'bg-purple-600', iconColor: 'text-purple-500', sweep: 'from-purple-500/0 via-purple-500/10 to-purple-500/0', titleHover: 'group-hover:text-purple-500', borderHover: 'hover:border-purple-500/40 hover:bg-purple-500/[0.03] hover:shadow-purple-500/10' },
    slate: { bg: 'bg-slate-500/5', border: 'border-slate-500/20', accent: 'bg-slate-600', iconColor: 'text-slate-500', sweep: 'from-slate-500/0 via-slate-500/10 to-slate-500/0', titleHover: 'group-hover:text-slate-500', borderHover: 'hover:border-slate-500/40 hover:bg-slate-500/[0.03] hover:shadow-slate-500/10' },
    indigo: { bg: 'bg-indigo-500/5', border: 'border-indigo-500/20', accent: 'bg-indigo-600', iconColor: 'text-indigo-500', sweep: 'from-indigo-500/0 via-indigo-500/10 to-indigo-500/0', titleHover: 'group-hover:text-indigo-500', borderHover: 'hover:border-indigo-500/40 hover:bg-indigo-500/[0.03] hover:shadow-indigo-500/10' }
  };

  const currentVariant = variants[variant] || variants.blue;

  if (isLoading) {
    return <div className="h-32 bg-slate-100 dark:bg-white/5 animate-pulse rounded-2xl" />;
  }

  return (
    <div 
      onClick={onClick}
      className={`relative p-6 rounded-2xl bg-gradient-to-br from-white/60 to-white/30 dark:from-slate-900/60 dark:to-slate-900/30 backdrop-blur-xl border ${currentVariant.border} ${currentVariant.borderHover} cursor-pointer hover:shadow-xl hover:-translate-y-0.5 active:scale-95 transition-all duration-500 group overflow-hidden shadow-sm`}
    >
      {/* Sweep Hover Effect (from Analytics Assistant) */}
      <div className={`absolute inset-0 bg-gradient-to-r ${currentVariant.sweep} translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000 pointer-events-none`} />

      {/* Accent left border */}
      <div className={`absolute left-0 top-0 w-1.5 h-full ${currentVariant.accent} opacity-80 group-hover:opacity-100 transition-opacity`} />
      
      {/* Background glowing blob */}
      <div className={`absolute -right-8 -top-8 w-32 h-32 rounded-full ${currentVariant.accent} opacity-[0.08] group-hover:opacity-[0.15] blur-3xl transition-opacity duration-500 pointer-events-none`} />
      
      <div className="flex justify-between items-start pl-2 relative z-10 pointer-events-none">
        <div className="w-full">
          <p className={`text-[11px] font-bold uppercase tracking-[0.15em] text-slate-500 dark:text-slate-400 mb-3 transition-colors duration-300 ${currentVariant.titleHover}`}>{title}</p>
          <div className="flex items-baseline gap-3">
            <h3 className={`text-4xl font-black tracking-tight text-transparent bg-clip-text bg-gradient-to-br from-slate-900 to-slate-600 dark:from-white dark:to-slate-400 group-hover:scale-[1.02] transition-transform origin-left`}>
              {value}
            </h3>
            {change && (
              <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${changeType === 'positive' ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' : 'bg-rose-500/10 text-rose-600 dark:text-rose-400'}`}>
                {change}
              </span>
            )}
          </div>
          {description && <p className="mt-3 text-[11px] text-slate-500/80 dark:text-slate-400/80 font-medium leading-relaxed">{description}</p>}
        </div>
      </div>
    </div>
  );
};

export default StatCard;