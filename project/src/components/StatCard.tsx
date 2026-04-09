import React, { useState, useEffect } from 'react';
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

const AnimatedNumber: React.FC<{ value: number | string }> = ({ value }) => {
  const [displayValue, setDisplayValue] = useState(0);
  const targetValue = typeof value === 'number' ? value : parseFloat(value.toString().replace(/[^0-9.]/g, '')) || 0;
  const isPercent = value.toString().includes('%');

  useEffect(() => {
    let start = 0;
    const duration = 2000;
    const startTime = performance.now();

    const animate = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const easeOutExpo = 1 - Math.pow(2, -10 * progress);
      const current = Math.floor(easeOutExpo * targetValue);

      setDisplayValue(current);

      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        // Ensure exact final value for strings with decimals/precisions if needed
        // But for dashboard numbers, floor is fine.
        setDisplayValue(targetValue);
      }
    };

    requestAnimationFrame(animate);
  }, [targetValue]);

  return <span>{displayValue}{isPercent ? '%' : ''}</span>;
};

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
      bg: 'bg-blue-500/[0.03] dark:bg-blue-500/[0.02]',
      border: 'border-blue-200/50 dark:border-blue-500/10',
      iconBg: 'bg-blue-50 dark:bg-blue-500/10',
      iconColor: 'text-blue-600 dark:text-blue-400',
      glow: 'shadow-blue-500/5',
      accent: 'bg-blue-600',
      skeleton: 'bg-blue-200/20 dark:bg-blue-500/20'
    },
    red: {
      bg: 'bg-red-500/[0.03] dark:bg-red-500/[0.02]',
      border: 'border-red-200/50 dark:border-red-500/10',
      iconBg: 'bg-red-50 dark:bg-red-500/10',
      iconColor: 'text-red-600 dark:text-red-400',
      glow: 'shadow-red-500/5',
      accent: 'bg-red-600',
      skeleton: 'bg-red-200/20 dark:bg-red-500/20'
    },
    green: {
      bg: 'bg-green-500/[0.03] dark:bg-green-500/[0.02]',
      border: 'border-green-200/50 dark:border-green-500/10',
      iconBg: 'bg-green-50 dark:bg-green-500/10',
      iconColor: 'text-green-600 dark:text-green-400',
      glow: 'shadow-green-500/5',
      accent: 'bg-green-600',
      skeleton: 'bg-green-200/20 dark:bg-green-500/20'
    },
    yellow: {
      bg: 'bg-amber-500/[0.03] dark:bg-amber-500/[0.02]',
      border: 'border-amber-200/50 dark:border-amber-500/10',
      iconBg: 'bg-amber-50 dark:bg-amber-500/10',
      iconColor: 'text-amber-600 dark:text-amber-400',
      glow: 'shadow-amber-500/5',
      accent: 'bg-amber-600',
      skeleton: 'bg-amber-200/20 dark:bg-amber-500/20'
    },
    purple: {
      bg: 'bg-purple-500/[0.03] dark:bg-purple-500/[0.02]',
      border: 'border-purple-200/50 dark:border-purple-500/10',
      iconBg: 'bg-purple-50 dark:bg-purple-500/10',
      iconColor: 'text-purple-600 dark:text-purple-400',
      glow: 'shadow-purple-500/5',
      accent: 'bg-purple-600',
      skeleton: 'bg-purple-200/20 dark:bg-purple-500/20'
    },
    slate: {
      bg: 'bg-slate-500/[0.03] dark:bg-slate-500/[0.02]',
      border: 'border-slate-200/50 dark:border-slate-500/10',
      iconBg: 'bg-slate-50 dark:bg-slate-500/10',
      iconColor: 'text-slate-600 dark:text-slate-400',
      glow: 'shadow-slate-500/5',
      accent: 'bg-slate-600',
      skeleton: 'bg-slate-200/20 dark:bg-slate-500/20'
    }
  };

  const currentVariant = variants[variant];

  if (isLoading) {
    return (
      <div className={`relative overflow-hidden ${currentVariant.bg} backdrop-blur-3xl border ${currentVariant.border} rounded-3xl p-7 shadow-2xl ${currentVariant.glow} animate-pulse`}>
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className={`h-2 w-20 ${currentVariant.skeleton} rounded-full mb-4`} />
            <div className={`h-10 w-24 ${currentVariant.skeleton} rounded-2xl mb-5`} />
            <div className={`h-2 w-32 ${currentVariant.skeleton} rounded-full`} />
          </div>
          <div className={`w-12 h-12 ${currentVariant.skeleton} rounded-2xl`} />
        </div>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      whileHover={{ y: -8, transition: { type: "spring", stiffness: 400, damping: 25 } }}
      className={`relative group overflow-hidden ${currentVariant.bg} backdrop-blur-3xl border ${currentVariant.border} rounded-[2rem] p-7 transition-all duration-500 shadow-2xl ${currentVariant.glow}`}
    >
      {/* Dynamic Glow Background */}
      <div className={`absolute -right-10 -bottom-10 w-32 h-32 rounded-full ${currentVariant.accent} opacity-[0.03] group-hover:opacity-[0.08] blur-3xl transition-opacity duration-700`} />

      <div className="flex items-start justify-between relative z-10 h-full">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-4">
            <span className={`w-1.5 h-1.5 rounded-full ${currentVariant.accent} shadow-[0_0_8px_rgba(37,99,235,0.4)]`} />
            <p className="text-slate-600 dark:text-slate-500 text-[10px] font-semibold uppercase tracking-[0.15em] leading-none opacity-80">{title}</p>
          </div>

          <div className="flex items-baseline gap-4 mt-1">
            <h4 className="text-3xl font-bold text-slate-900 dark:text-white tracking-tight leading-none shrink-0">
              <AnimatedNumber value={value} />
            </h4>
            {change && (
              <div className={`flex items-center gap-1 px-2.5 py-1 rounded-xl text-[10px] font-semibold tracking-wide ${changeType === 'positive' ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20' :
                changeType === 'negative' ? 'bg-rose-500/10 text-rose-500 border border-rose-500/20' :
                  'bg-slate-500/10 text-slate-500 border border-slate-500/20'
                }`}>
                {changeType === 'positive' && <span className="text-[8px]">▲</span>}
                {changeType === 'negative' && <span className="text-[8px]">▼</span>}
                {change}
              </div>
            )}
          </div>

          {description && (
            <p className="text-slate-400 dark:text-slate-500 text-[11px] mt-5 font-medium leading-relaxed tracking-tight opacity-70">
              {description}
            </p>
          )}
        </div>

        <div className={`relative shrink-0`}>
          <div className={`absolute inset-0 ${currentVariant.accent} blur-xl opacity-0 group-hover:opacity-20 transition-opacity duration-500 rounded-full`} />
          <div className={`${currentVariant.iconBg} w-14 h-14 flex items-center justify-center rounded-2xl border ${currentVariant.border} shadow-xl transition-all duration-500 group-hover:scale-110 group-hover:-rotate-6 group-hover:shadow-[0_10px_30px_-10px_rgba(0,0,0,0.1)]`}>
            <Icon className={`w-6 h-6 ${currentVariant.iconColor} transition-transform duration-500 group-hover:scale-110`} />
          </div>
        </div>
      </div>

      {/* Subtle corner highlight */}
      <div className={`absolute top-0 right-0 w-24 h-24 bg-gradient-to-bl from-white/[0.03] to-transparent pointer-events-none`} />
    </motion.div>
  );
};

export default StatCard;