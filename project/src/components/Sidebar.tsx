import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import { useSidebar } from '../context/SidebarContext';
import { useTheme } from '../context/ThemeContext';
import { Menu } from 'lucide-react';

const Sidebar = () => {
  const { t } = useTranslation();
  const location = useLocation();
  const { user } = useAuth();
  const { isOpen, toggle } = useSidebar();
  const { theme } = useTheme();

  const isAdmin = user?.role === 'ADMIN' || user?.role === 'admin';

  const groups = [
    {
      title: t('sidebar.groups.principal'),
      items: [
        { name: t('sidebar.dashboard'), href: isAdmin ? '/admin/dashboard' : '/manager/dashboard', roles: ['ADMIN', 'MANAGER'] },
        { name: t('sidebar.items.users'), href: '/users', roles: ['ADMIN'] },
        { name: t('sidebar.items.emails'), href: '/management/messages', roles: ['ADMIN'] },
      ]
    },
    {
      title: t('sidebar.groups.tests'),
      items: [
        { name: t('sidebar.items.projects'), href: '/portfolio', roles: ['ADMIN', 'MANAGER', 'manager'] },
        { name: t('sidebar.items.campaigns'), href: isAdmin ? '/admin/campaigns' : '/manager', roles: ['ADMIN'] },
        { name: t('sidebar.items.testerDashboard'), href: '/tester-dashboard', roles: ['tester', 'TESTER'] },
        { name: t('sidebar.items.executions'), href: isAdmin ? '/admin/executions' : '/execution', roles: ['ADMIN', 'tester', 'TESTER', 'MANAGER', 'manager'] },
        { name: t('sidebar.items.anomalies'), href: isAdmin ? '/admin/anomalies' : '/anomalies', roles: ['ADMIN', 'tester', 'TESTER', 'MANAGER', 'manager'] },
      ]
    },
    {
      title: t('sidebar.groups.communication'),
      items: [
        { name: t('sidebar.items.comments'), href: '/admin/comments', roles: ['ADMIN'] },
        { name: t('sidebar.items.messages'), href: '/messages', roles: ['ADMIN', 'MANAGER', 'manager', 'tester', 'TESTER'] },
        { name: t('sidebar.items.chat'), href: '/chat', roles: ['ADMIN', 'MANAGER', 'manager', 'tester', 'TESTER'] },
        { name: 'Veille & Innovations IA', href: isAdmin ? '/admin/qa-intelligence' : '/qa-intelligence', roles: ['ADMIN', 'MANAGER', 'manager', 'tester', 'TESTER'] },
        { name: t('sidebar.items.aiAnalytics'), href: isAdmin ? '/management/analytics' : '/analytics', roles: ['ADMIN', 'MANAGER', 'manager', 'tester', 'TESTER'] },
      ]
    }
  ];

  const renderNavGroup = (group: typeof groups[0]) => {
    const filteredItems = group.items.filter(item =>
      user && item.roles.map(r => r.toUpperCase()).includes(user?.role?.toUpperCase())
    );

    if (filteredItems.length === 0) return null;

    return (
      <div key={group.title} className="py-3">
        <h3 className="px-6 mb-2 text-xs font-bold text-slate-400 dark:text-slate-500 tracking-[0.15em] uppercase flex items-center gap-2">
          <span className="w-1.5 h-[1px] bg-slate-300 dark:bg-slate-800" />
          {group.title}
        </h3>
        <div className="space-y-1 px-3">
          {filteredItems.map((item) => {
            const isActive = location.pathname === item.href;
            return (
              <Link
                key={item.name}
                to={item.href}
                className={`relative group flex items-center h-11 px-4 rounded-lg transition-all duration-200 ease-out transform hover:translate-x-1.5 ${isActive
                  ? 'bg-blue-500/5 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 font-bold'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-white/[0.02]'
                }`}
              >
                {isActive && (
                  <div className="absolute left-0 w-1 h-4 bg-blue-600 dark:bg-blue-500 rounded-r-md" />
                )}

                <span className="truncate text-sm font-semibold tracking-tight">
                  {item.name}
                </span>
              </Link>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <>
      {/* Button removed to avoid overlap with header logo */}

      <aside className={`flex flex-col fixed top-16 bottom-0 w-72 bg-white dark:bg-[#0f172a] border-r border-slate-200 dark:border-white/10 transition-all duration-300 z-40 transform ${isOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="flex-1 flex flex-col min-h-0 pt-4 overflow-hidden">
        <nav className="flex-1 overflow-y-auto px-1 custom-scrollbar">
          {groups.map(renderNavGroup)}
        </nav>
      </div>
      <div className="p-4 border-t border-slate-100 dark:border-white/5 mt-auto flex justify-center items-center">
        <img
          src={theme === 'dark' ? '/logo-lloyd-dark.webp' : '/logo-lloyd-light.webp'}
          alt="Lloyd Logo"
          onError={(e) => { (e.target as HTMLImageElement).src = '/logo-lloyd.webp'; }}
          className="h-10 object-contain dark:brightness-0 dark:invert opacity-50 hover:opacity-100 transition-opacity duration-300"
        />
      </div>

      {/* Collapse button removed */}

      </aside>
    </>
  );
};

export default Sidebar;