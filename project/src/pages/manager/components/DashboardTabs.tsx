import React from 'react';
import { motion } from 'framer-motion';

interface Tab {
    id: string;
    label: string;
    icon: any;
    badge?: number;
}

interface DashboardTabsProps {
    activeTab: string;
    onChange: (tabId: string) => void;
    tabs: Tab[];
}

const DashboardTabs: React.FC<DashboardTabsProps> = ({ activeTab, onChange, tabs }) => {
    return (
        <div className="flex flex-wrap gap-2 p-1.5 bg-slate-100/50 dark:bg-white/[0.03] rounded-2xl w-fit mb-8 border border-slate-200/50 dark:border-white/5">
            {tabs.map((tab) => {
                const isActive = activeTab === tab.id;
                const Icon = tab.icon;

                return (
                    <button
                        key={tab.id}
                        onClick={() => onChange(tab.id)}
                        className={`
                            relative flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition-all duration-300
                            ${isActive
                                ? 'text-blue-600 dark:text-blue-400'
                                : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'}
                        `}
                    >
                        {isActive && (
                            <motion.div
                                layoutId="activeTabManager"
                                className="absolute inset-0 bg-white dark:bg-white/10 shadow-sm dark:shadow-none rounded-xl"
                                transition={{ type: 'spring', bounce: 0.2, duration: 0.6 }}
                            />
                        )}
                        <Icon className={`w-4 h-4 relative z-10 transition-transform ${isActive ? 'scale-110' : ''}`} />
                        <span className="relative z-10">{tab.label}</span>
                        {tab.badge !== undefined && tab.badge > 0 && (
                            <span className={`relative z-10 min-w-[18px] h-[18px] flex items-center justify-center text-[10px] font-black rounded-full px-1
                                ${isActive ? 'bg-blue-600 text-white' : 'bg-red-500 text-white'}`}>
                                {tab.badge > 99 ? '99+' : tab.badge}
                            </span>
                        )}
                    </button>
                );
            })}
        </div>
    );
};

export default DashboardTabs;
