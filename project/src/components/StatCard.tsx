import React from 'react';
import { type LucideIcon } from 'lucide-react';
import { motion } from 'framer-motion';

interface StatCardProps {
  title: string;
  value: string | number;
  change?: string;
  changeType?: 'positive' | 'negative' | 'neutral';
  icon: LucideIcon;
  variant?: 'blue' | 'red' | 'green' | 'yellow' | 'purple' | 'slate';
  description?: string;
  isLoading?: boolean;
}

const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  change,
  changeType = 'neutral',
  icon: Icon,
  variant = 'blue',
  description,
  isLoading = false
}) => {
  const variants = {
    blue: {
      bg: 'bg-blue-500/10 dark:bg-blue-500/10',
      border: 'border-blue-200 dark:border-blue-500/20',
      iconBg: 'bg-blue-100 dark:bg-blue-500/20',
      iconColor: 'text-blue-600 dark:text-blue-400',
      glow: 'shadow-blue-500/10',
      accent: 'bg-blue-600',
      skeleton: 'bg-blue-200/20 dark:bg-blue-500/20'
    },
    red: {
      bg: 'bg-red-500/10 dark:bg-red-500/10',
      border: 'border-red-200 dark:border-red-500/20',
      iconBg: 'bg-red-100 dark:bg-red-500/20',
      iconColor: 'text-red-600 dark:text-red-400',
      glow: 'shadow-red-500/10',
      accent: 'bg-red-600',
      skeleton: 'bg-red-200/20 dark:bg-red-500/20'
    },
    green: {
      bg: 'bg-green-500/10 dark:bg-green-500/10',
      border: 'border-green-200 dark:border-green-500/20',
      iconBg: 'bg-green-100 dark:bg-green-500/20',
      iconColor: 'text-green-600 dark:text-green-400',
      glow: 'shadow-green-500/10',
      accent: 'bg-green-600',
      skeleton: 'bg-green-200/20 dark:bg-green-500/20'
    },
    yellow: {
      bg: 'bg-amber-500/10 dark:bg-amber-500/10',
      border: 'border-amber-200 dark:border-amber-500/20',
      iconBg: 'bg-amber-100 dark:bg-amber-500/20',
      iconColor: 'text-amber-600 dark:text-amber-400',
      glow: 'shadow-amber-500/10',
      accent: 'bg-amber-600',
      skeleton: 'bg-amber-200/20 dark:bg-amber-500/20'
    },
    purple: {
      bg: 'bg-purple-500/10 dark:bg-purple-500/10',
      border: 'border-purple-200 dark:border-purple-500/20',
      iconBg: 'bg-purple-100 dark:bg-purple-500/20',
      iconColor: 'text-purple-600 dark:text-purple-400',
      glow: 'shadow-purple-500/10',
      accent: 'bg-purple-600',
      skeleton: 'bg-purple-200/20 dark:bg-purple-500/20'
    },
    slate: {
      bg: 'bg-slate-500/10 dark:bg-slate-500/10',
      border: 'border-slate-200 dark:border-slate-500/20',
      iconBg: 'bg-slate-100 dark:bg-slate-500/20',
      iconColor: 'text-slate-600 dark:text-slate-400',
      glow: 'shadow-slate-500/10',
      accent: 'bg-slate-600',
      skeleton: 'bg-slate-200/20 dark:bg-slate-500/20'
    }
  };

  const currentVariant = variants[variant];

  if (isLoading) {
    return (
      <div className={`relative overflow-hidden ${currentVariant.bg} backdrop-blur-xl border ${currentVariant.border} rounded-2xl p-6 transition-all duration-300 shadow-xl ${currentVariant.glow} animate-pulse`}>
        <div className={`absolute top-0 left-0 right-0 h-1.5 ${currentVariant.accent} opacity-50`} />
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className={`h-3 w-20 ${currentVariant.skeleton} rounded mb-3`} />
            <div className={`h-8 w-16 ${currentVariant.skeleton} rounded mb-4`} />
            <div className={`h-3 w-32 ${currentVariant.skeleton} rounded`} />
          </div>
          <div className={`${currentVariant.iconBg} p-3.5 rounded-xl border ${currentVariant.border} opacity-50`}>
            <div className="w-6 h-6" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -6, transition: { duration: 0.2 } }}
      className={`relative overflow-hidden ${currentVariant.bg} backdrop-blur-xl border ${currentVariant.border} rounded-2xl p-6 transition-all duration-300 shadow-xl ${currentVariant.glow}`}
    >
      {/* Accent bar at the top */}
      <div className={`absolute top-0 left-0 right-0 h-1.5 ${currentVariant.accent}`} />

      <div className="flex items-start justify-between relative z-10">
        <div className="flex-1">
          <p className="text-slate-500 dark:text-slate-400 text-[10px] font-bold uppercase tracking-[0.2em] mb-2 font-heading">{title}</p>
          <div className="flex items-baseline gap-3">
            <p className="text-3xl font-black text-slate-900 dark:text-white tracking-tight font-heading">{value}</p>
            {change && (
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${changeType === 'positive' ? 'bg-green-500/10 text-green-600' :
                changeType === 'negative' ? 'bg-red-500/10 text-red-600' :
                  'bg-slate-500/10 text-slate-600'
                }`}>
                {change}
              </span>
            )}
          </div>
          {description && (
            <p className="text-slate-500 dark:text-slate-400 text-xs mt-2 font-medium">{description}</p>
          )}
        </div>
        <div className={`${currentVariant.iconBg} p-3.5 rounded-xl border ${currentVariant.border} transition-transform duration-300 group-hover:rotate-12 group-hover:scale-110 shadow-lg`}>
          <Icon className={`w-6 h-6 ${currentVariant.iconColor}`} />
        </div>
      </div>

      {/* Decorative background circle */}
      <div className={`absolute -right-4 -bottom-4 w-24 h-24 rounded-full ${currentVariant.accent} opacity-5 blur-2xl`} />
    </motion.div>
  );
};

export default StatCard;