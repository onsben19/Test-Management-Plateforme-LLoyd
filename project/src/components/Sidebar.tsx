import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  BarChart3, AlertTriangle, Brain, Settings,
  Users, LogOut, MessageSquare, List, Mail, Layers,
  ChevronLeft, ChevronRight, TestTube, Sparkles, Layout
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
        { name: 'Tableau de bord', href: isAdmin ? '/admin/dashboard' : '/manager/dashboard', icon: Layout, roles: ['ADMIN', 'MANAGER'] },
        { name: 'Gestion des utilisateurs', href: '/users', icon: Users, roles: ['ADMIN'] },
        { name: 'Gestions des emails', href: '/management/messages', icon: Mail, roles: ['ADMIN'] },
      ]
    },
    {
      title: 'GESTION DES TESTS',
      items: [
        { name: 'Projets Disponibles', href: '/portfolio', icon: Layout, roles: ['ADMIN', 'MANAGER', 'manager'] },
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
        { name: 'Emails', href: '/messages', icon: Mail, roles: ['ADMIN', 'MANAGER', 'manager', 'tester', 'TESTER'] },
        { name: 'Chat Center', href: '/chat', icon: MessageSquare, roles: ['ADMIN', 'MANAGER', 'manager', 'tester', 'TESTER'] },
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
      <div key={group.title} className="py-4">
        {isOpen && (
          <h3 className="px-6 mb-4 text-[10px] font-bold text-slate-500 dark:text-slate-500 tracking-[0.2em] uppercase opacity-70">
            {group.title}
          </h3>
        )}
        <div className="space-y-1.5 px-3">
          {filteredItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.href;
            return (
              <Link
                key={item.name}
                to={item.href}
                title={!isOpen ? item.name : undefined}
                className={`relative group flex items-center h-11 px-3 rounded-xl transition-all duration-300 ease-out ${isOpen ? '' : 'justify-center mx-auto'
                  } ${isActive
                    ? 'bg-blue-600/15 text-blue-500 shadow-[inset_0_1px_rgba(255,255,255,0.05),0_10px_20px_-10px_rgba(37,99,235,0.3)]'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5 active:scale-95'
                  }`}
              >
                {/* Active Indicator Bar */}
                {isActive && (
                  <div className="absolute left-0 w-1 h-5 bg-blue-500 rounded-r-full shadow-[0_0_10px_rgba(59,130,246,0.5)]" />
                )}

                <Icon
                  className={`w-5 h-5 transition-transform duration-300 group-hover:scale-110 ${isActive
                    ? 'text-blue-500 filter drop-shadow-[0_0_8px_rgba(59,130,246,0.4)]'
                    : 'text-slate-500 dark:text-slate-400'
                    } ${isOpen ? 'mr-3.5' : ''}`}
                />

                {isOpen && (
                  <span className={`truncate text-sm font-semibold tracking-tight transition-all duration-200 ${isActive ? 'text-blue-600 dark:text-blue-400' : ''
                    }`}>
                    {item.name}
                  </span>
                )}

                {/* Subtle Hover Glow Line (Bottom) */}
                <div className={`absolute bottom-0 left-1 right-1 h-[1px] bg-gradient-to-r from-transparent via-blue-500/0 to-transparent transition-opacity duration-300 opacity-0 group-hover:via-blue-500/20 group-hover:opacity-100`} />
              </Link>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <aside
      className={`hidden lg:flex lg:flex-col lg:fixed lg:inset-y-0 bg-white dark:bg-[#0a0f1d] border-r border-slate-200 dark:border-white/5 transition-all duration-500 ease-[cubic-bezier(0.4,0,0.2,1)] z-40 ${isOpen ? 'lg:w-[280px]' : 'lg:w-20'
        }`}
    >
      {/* Branding Section - Top */}
      <div className={`h-16 flex items-center border-b border-slate-100 dark:border-white/5 ${isOpen ? 'px-6' : 'justify-center'}`}>
        <div className="flex items-center gap-3 overflow-hidden">
          {isOpen ? (
            <div className="flex flex-col animate-in fade-in slide-in-from-left-2 duration-500">
              <h1 className="text-lg font-black text-slate-900 dark:text-white tracking-tighter leading-none">
                Insure<span className="text-blue-600 dark:text-blue-400">TM</span>
              </h1>
            </div>
          ) : (
            <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center text-white font-black text-xs shadow-lg">
              TM
            </div>
          )}
        </div>
      </div>
      {/* Toggle Button - Redesigned */}
      <button
        onClick={toggle}
        className="absolute -right-3.5 top-20 w-7 h-7 bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-xl flex items-center justify-center shadow-xl hover:bg-slate-50 dark:hover:bg-slate-800 transition-all duration-300 hover:scale-110 active:scale-90 z-50 text-slate-500"
        title={isOpen ? 'Réduire le menu' : 'Agrandir le menu'}
      >
        {isOpen
          ? <ChevronLeft className="w-4 h-4" />
          : <ChevronRight className="w-4 h-4" />
        }
      </button>

      <div className="flex-1 flex flex-col min-h-0 pt-4 overflow-hidden">
        <nav className="flex-1 overflow-y-auto px-1 custom-scrollbar">
          {groups.map(renderNavGroup)}
        </nav>
      </div>

      <div className="p-4 bg-slate-50 dark:bg-white/[0.02] border-t border-slate-100 dark:border-white/5">
        <div className={`group/user flex items-center ${isOpen ? 'px-3 py-3' : 'justify-center p-2'} rounded-2xl bg-white dark:bg-white/[0.03] border border-slate-200 dark:border-white/5 shadow-sm hover:shadow-md transition-all duration-300`}>
          <div className="relative">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center text-white font-bold text-sm shadow-lg shadow-blue-500/20 ring-2 ring-white dark:ring-slate-900">
              {user?.username?.charAt(0).toUpperCase() || 'U'}
            </div>
            <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-500 border-2 border-white dark:border-slate-900 rounded-full shadow-sm" />
          </div>

          {isOpen && (
            <div className="ml-3 min-w-0 flex-1">
              <p className="text-sm font-bold text-slate-900 dark:text-white truncate tracking-tight">
                {user?.username || 'Utilisateur'}
              </p>
              <p className="text-[10px] text-blue-600 dark:text-blue-400 font-bold uppercase tracking-wider opacity-80">
                {user?.role || ''}
              </p>
            </div>
          )}

          {isOpen && (
            <button
              onClick={logout}
              className="ml-2 p-2 text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10 rounded-xl transition-all duration-200 group-hover/user:opacity-100"
              title="Déconnexion"
            >
              <LogOut className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

    </aside>
  );
};

export default Sidebar;