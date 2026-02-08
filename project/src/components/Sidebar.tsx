import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { BarChart3, TestTube, AlertTriangle, Brain, Settings, Users, LogOut, MessageSquare, List } from 'lucide-react';


import { useAuth } from '../context/AuthContext';

const Sidebar = () => {
  const location = useLocation();
  const { user, logout } = useAuth();

  const isAdmin = user?.role === 'ADMIN';

  const navigation = [
    { name: 'Espace Testeur', href: '/tester-dashboard', icon: List, roles: ['TESTER'] },
    { name: 'Suivi d\'Exécution', href: isAdmin ? '/admin/executions' : '/execution', icon: BarChart3, roles: ['ADMIN', 'TESTER', 'MANAGER'] },
    {
      name: 'Gestion des Releases', href: isAdmin ? '/admin/releases' : '/releases', icon: Object.assign((props: any) => (
        <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m12.83 2.18a2 2 0 0 0-1.66 0L2.6 6.08a1 1 0 0 0 0 1.83l8.58 3.91a2 2 0 0 0 1.66 0l8.58-3.9a1 1 0 0 0 0-1.83Z" /><path d="m22 17.65-9.17 4.16a2 2 0 0 1-1.66 0L2 17.65" /><path d="m22 12.65-9.17 4.16a2 2 0 0 1-1.66 0L2 12.65" /></svg>
      ), { displayName: 'Layers' }), roles: ['ADMIN', 'MANAGER']
    },
    { name: 'Campagne de Tests', href: isAdmin ? '/admin/campaigns' : '/manager', icon: Brain, roles: ['ADMIN'] },
    { name: 'Gestion des utilisateurs', href: '/users', icon: Users, roles: ['ADMIN'] },
    { name: 'Anomalies', href: isAdmin ? '/admin/anomalies' : '/anomalies', icon: AlertTriangle, roles: ['ADMIN', 'MANAGER', 'TESTER'] },
    { name: 'Commentaires', href: '/admin/comments', icon: MessageSquare, roles: ['ADMIN'] },
    { name: 'Performance Équipe', href: '/performance', icon: BarChart3, roles: ['ADMIN', 'MANAGER'] }
  ];

  const filteredNavigation = navigation.filter(item =>
    user && item.roles.includes(user.role)
  );

  return (
    <aside className="hidden lg:flex lg:flex-col lg:w-64 lg:fixed lg:inset-y-0 lg:pt-16 bg-white/95 dark:bg-slate-900/95 backdrop-blur-sm border-r border-slate-200/50 dark:border-slate-700/50 transition-colors duration-300">
      <div className="flex-1 flex flex-col min-h-0 pt-6">
        <nav className="flex-1 px-4 space-y-2">
          {filteredNavigation.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.href;

            return (
              <Link
                key={item.name}
                to={item.href}
                className={`group flex items-center px-3 py-3 text-sm font-medium rounded-lg transition-all duration-200 ${isActive
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30'
                  : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/50'
                  }`}
              >
                <Icon className={`mr-3 w-5 h-5 ${isActive ? 'text-white' : 'text-slate-500 dark:text-slate-400 group-hover:text-slate-900 dark:group-hover:text-white'}`} />
                {item.name}
              </Link>
            );
          })}

        </nav>
      </div>

      {/* User Profile Footer */}
      <div className="border-t border-slate-200/50 dark:border-slate-700/50 p-4 transition-colors duration-300">
        <div className="flex items-center w-full p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800/50 transition-colors">
          <div className="flex-shrink-0">
            <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white font-medium">
              {user?.username?.charAt(0).toUpperCase() || 'U'}
            </div>
          </div>
          <div className="ml-3 min-w-0 flex-1">
            <p className="text-sm font-medium text-slate-900 dark:text-white truncate transition-colors">
              {user?.username || 'Utilisateur'}
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400 truncate transition-colors">
              {user?.email || ''}
            </p>
          </div>
          <button
            onClick={logout}
            className="ml-auto p-1.5 text-slate-500 dark:text-slate-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-md transition-colors"
            title="Déconnexion"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;