import React from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { useTheme } from '../context/ThemeContext';

const TrendChart = () => {
  const { theme } = useTheme();

  const data = [
    { month: 'Août', tests: 1240, success: 1180 },
    { month: 'Sept', tests: 1380, success: 1320 },
    { month: 'Oct', tests: 1520, success: 1450 },
    { month: 'Nov', tests: 1680, success: 1590 },
    { month: 'Déc', tests: 1850, success: 1780 },
    { month: 'Jan', tests: 2100, success: 2020 }
  ];

  return (
    <div className="bg-white dark:bg-slate-800/50 backdrop-blur-sm border border-slate-200 dark:border-slate-700/50 rounded-xl p-6 shadow-sm dark:shadow-none transition-colors">
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-slate-900 dark:text-white transition-colors">Tendances des Tests</h3>
        <p className="text-slate-500 dark:text-slate-400 text-sm transition-colors">Évolution sur les 6 derniers mois</p>
      </div>
      <div className="h-80">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="colorTests" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#2563eb" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#2563eb" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="colorSuccess" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke={theme === 'dark' ? '#374151' : '#e2e8f0'} />
            <XAxis
              dataKey="month"
              axisLine={false}
              tickLine={false}
              tick={{ fill: '#9ca3af', fontSize: 12 }}
            />
            <YAxis
              axisLine={false}
              tickLine={false}
              tick={{ fill: '#9ca3af', fontSize: 12 }}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: theme === 'dark' ? '#1e293b' : '#ffffff',
                border: theme === 'dark' ? '1px solid #475569' : '1px solid #e2e8f0',
                borderRadius: '8px',
                color: theme === 'dark' ? '#f1f5f9' : '#1e293b',
                boxShadow: theme === 'dark' ? 'none' : '0 4px 6px -1px rgb(0 0 0 / 0.1)'
              }}
            />
            <Area
              type="monotone"
              dataKey="tests"
              stroke="#2563eb"
              strokeWidth={2}
              fillOpacity={1}
              fill="url(#colorTests)"
              name="Tests Total"
            />
            <Area
              type="monotone"
              dataKey="success"
              stroke="#10b981"
              strokeWidth={2}
              fillOpacity={1}
              fill="url(#colorSuccess)"
              name="Tests Réussis"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default TrendChart;