import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  BarChart3, AlertTriangle, Brain, Settings,
  Users, LogOut, MessageSquare, List, Mail, Layers,
  ChevronLeft, ChevronRight, TestTube, Sparkles
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useSidebar } from '../context/SidebarContext';
import { useTheme } from '../context/ThemeContext';

const Sidebar = () => {
  const location = useLocation();
  const { user, logout } = useAuth();
  const { isOpen, toggle } = useSidebar();
  const { theme } = useTheme();

  const isAdmin = user?.role === 'ADMIN' || user?.role === 'admin';

  const groups = [
    {
      title: 'PRINCIPAL',
      items: [
        { name: 'Gestion des utilisateurs', href: '/users', icon: Users, roles: ['ADMIN'] },
        { name: 'Gestions des emails', href: '/management/messages', icon: Mail, roles: ['ADMIN'] },
      ]
    },
    {
      title: 'GESTION DES TESTS',
      items: [
        { name: 'Gestion des Releases', href: isAdmin ? '/admin/releases' : '/releases', icon: Layers, roles: ['ADMIN', 'MANAGER', 'manager'] },
        { name: 'Campagne de Tests', href: isAdmin ? '/admin/campaigns' : '/manager', icon: Brain, roles: ['ADMIN'] },
        { name: 'Campagne des tests', href: '/tester-dashboard', icon: List, roles: ['tester', 'TESTER'] },
        { name: "Suivi d'Exécution", href: isAdmin ? '/admin/executions' : '/execution', icon: BarChart3, roles: ['ADMIN', 'tester', 'TESTER', 'MANAGER', 'manager'] },
        { name: 'Anomalies', href: isAdmin ? '/admin/anomalies' : '/anomalies', icon: AlertTriangle, roles: ['ADMIN', 'tester', 'TESTER', 'MANAGER', 'manager'] },
      ]
    },
    {
      title: 'COMMUNICATION & IA',
      items: [
        { name: 'Commentaires', href: '/admin/comments', icon: MessageSquare, roles: ['ADMIN'] },
        { name: 'Messagerie', href: '/messages', icon: Mail, roles: ['ADMIN', 'MANAGER', 'manager', 'tester', 'TESTER'] },
        { name: 'Gestion des discussions AI', href: '/management/analytics', icon: MessageSquare, roles: ['ADMIN'] },
        { name: 'Analytics IA', href: '/analytics', icon: Sparkles, roles: ['ADMIN', 'MANAGER', 'manager', 'tester', 'TESTER'] },
      ]
    }
  ];

  const renderNavGroup = (group: typeof groups[0]) => {
    const filteredItems = group.items.filter(item =>
      user && item.roles.map(r => r.toUpperCase()).includes(user?.role?.toUpperCase())
    );

    if (filteredItems.length === 0) return null;

    return (
      <div key={group.title} className="py-2">
        {isOpen && (
          <h3 className="px-6 mb-3 text-[10px] font-black text-slate-400 dark:text-slate-500 tracking-[0.25em] uppercase font-heading">
            {group.title}
          </h3>
        )}
        <div className="space-y-1">
          {filteredItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.href;
            return (
              <Link
                key={item.name}
                to={item.href}
                title={!isOpen ? item.name : undefined}
                className={`group flex items-center px-3 py-2.5 text-sm font-medium rounded-lg transition-all duration-200 ${isOpen ? 'mx-2' : 'justify-center mx-1'
                  } ${isActive
                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30'
                    : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/50'
                  }`}
              >
                <Icon
                  className={`w-5 h-5 shrink-0 ${isActive
                    ? 'text-white'
                    : 'text-slate-500 dark:text-slate-400 group-hover:text-slate-900 dark:group-hover:text-white'
                    } ${isOpen ? 'mr-3' : ''}`}
                />
                {isOpen && (
                  <span className="truncate">{item.name}</span>
                )}
              </Link>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <aside
      className={`hidden lg:flex lg:flex-col lg:fixed lg:inset-y-0 lg:pt-16 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border-r border-slate-200/50 dark:border-slate-700/50 transition-all duration-500 z-40 ${isOpen ? 'lg:w-64' : 'lg:w-16'
        }`}
      style={{ '--sidebar-width': isOpen ? '16rem' : '4rem' } as React.CSSProperties}
    >
      {/* Toggle tab on the right edge */}
      <button
        onClick={toggle}
        className="absolute -right-3 top-20 w-6 h-6 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-full flex items-center justify-center shadow-md hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors z-50"
        title={isOpen ? 'Réduire le menu' : 'Agrandir le menu'}
      >
        {isOpen
          ? <ChevronLeft className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
          : <ChevronRight className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
        }
      </button>

      {/* Nav items */}
      <div className="flex-1 flex flex-col min-h-0 pt-4 overflow-hidden">
        <nav className="flex-1 overflow-y-auto custom-scrollbar">
          {groups.map(renderNavGroup)}
        </nav>
      </div>

      {/* User / Logout */}
      <div className="border-t border-slate-200/50 dark:border-slate-700/50 p-3">
        <div className={`flex items-center ${isOpen ? '' : 'justify-center'} w-full p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800/50 transition-colors`}>
          <div className="flex-shrink-0">
            <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white font-medium text-sm shadow-lg shadow-blue-500/20">
              {user?.username?.charAt(0).toUpperCase() || 'U'}
            </div>
          </div>
          {isOpen && (
            <div className="ml-3 min-w-0 flex-1">
              <p className="text-sm font-bold text-slate-900 dark:text-white truncate font-heading tracking-tight">
                {user?.username || 'Utilisateur'}
              </p>
              <p className="text-[9px] text-slate-500 dark:text-slate-400 font-extrabold tracking-[0.1em] uppercase truncate font-heading">
                {user?.role || ''}
              </p>
            </div>
          )}
          <button
            onClick={logout}
            className={`${isOpen ? 'ml-auto' : 'mt-0'} p-1.5 text-slate-500 dark:text-slate-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-md transition-colors`}
            title="Déconnexion"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
      {/* Brand Footer */}
      {isOpen && (
        <div className="px-6 py-4 flex items-center gap-2 opacity-40 hover:opacity-100 transition-opacity duration-300">
          <img
            src={theme === 'dark' ? '/logo-lloyd-dark.webp' : '/logo-lloyd-light.webp'}
            alt="Lloyd"
            onError={(e) => { (e.target as HTMLImageElement).src = '/logo-lloyd.webp'; }}
            className={`w-4 h-4 ${theme === 'dark' ? '' : 'grayscale'}`}
          />
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-tighter transition-colors">Lloyd Assurances</span>
        </div>
      )}
    </aside>
  );
};

export default Sidebar;