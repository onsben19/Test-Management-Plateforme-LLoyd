import React, { useEffect, useState } from 'react';
import { Bell, Menu, X, Sun, Moon, CheckCircle, AlertTriangle, MessageSquare } from 'lucide-react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useTheme } from '../context/ThemeContext';
import { notificationService, type Notification } from '../services/notificationService';
import { useAuth } from '../context/AuthContext';
import * as Popover from '@radix-ui/react-popover';
import LanguageSwitcher from './LanguageSwitcher';

const Header = () => {
  const { theme, toggleTheme } = useTheme();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [popoverOpen, setPopoverOpen] = useState(false);

  const getIcon = (type: string) => {
    switch (type) {
      case 'campaign_assignment': return <Bell className="w-5 h-5 text-blue-500" />;
      case 'execution_validated': return <CheckCircle className="w-5 h-5 text-emerald-500" />;
      case 'anomaly_reported': return <AlertTriangle className="w-5 h-5 text-red-500" />;
      case 'comment_posted': return <MessageSquare className="w-5 h-5 text-amber-500" />;
      default: return <Bell className="w-5 h-5 text-slate-400" />;
    }
  };

  const fetchNotifications = async () => {
    if (!user) return;
    try {
      const response = await notificationService.getNotifications();
      // Handle paginated response from DRF (returns {count, results:[...]})
      const raw = response.data as any;
      const data: Notification[] = Array.isArray(raw) ? raw : (raw?.results ?? []);
      setNotifications(data);
      setUnreadCount(data.filter(n => !n.is_read).length);
    } catch (error) {
      console.error("Failed to fetch notifications", error);
    }
  };

  useEffect(() => {
    fetchNotifications();
    // Poll every 5 seconds
    const interval = setInterval(fetchNotifications, 5000);
    return () => clearInterval(interval);
  }, [user]);

  const handleNotificationClick = async (notif: Notification) => {
    try {
      if (!notif.is_read) {
        await notificationService.markAsRead(notif.id);
        fetchNotifications();
      }
      // Close the popover before navigating
      setPopoverOpen(false);

      if (notif.type === 'campaign_assignment') {
        navigate('/tester-dashboard');
      } else if (notif.type === 'execution_validated') {
        navigate(`/admin/executions?highlight=${notif.related_object_id}`);
      } else if (notif.type === 'anomaly_reported') {
        const role = user?.role?.toUpperCase();
        const baseRoute = role === 'ADMIN' ? '/admin/anomalies' : '/anomalies';
        navigate(`${baseRoute}?highlight=${notif.related_object_id}`);
      } else if (notif.type === 'comment_posted') {
        navigate(`/execution?testId=${notif.related_object_id}`);
      } else if (notif.type === 'email_received') {
        navigate('/messages');
      }
    } catch (error) {
      console.error("Failed to process notification click", error);
    }
  };

  return (
    <header className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border-b border-slate-200/50 dark:border-slate-700/50 sticky top-0 z-50 transition-all duration-500">
      <div className="w-full px-4">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center">
            <div className="flex-shrink-0 group flex items-center gap-2">
              <div className="relative">
                <img
                  src={theme === 'dark' ? '/logo-lloyd-dark.webp' : '/logo-lloyd-light.webp'}
                  alt="Lloyd Logo"
                  onError={(e) => { (e.target as HTMLImageElement).src = '/logo-lloyd.webp'; }}
                  className="w-20 h-10 object-contain transition-all duration-300 group-hover:scale-110 dark:brightness-0 dark:invert opacity-90 group-hover:opacity-100"
                />
                <div className="absolute inset-0 bg-blue-500/10 blur-xl rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
              </div>
              <div className="h-6 w-px bg-slate-200 dark:bg-slate-700 mx-1" />
              <h1 className="text-xl font-black text-slate-900 dark:text-white transition-all duration-300 tracking-tighter font-heading cursor-default">
                Insure<span className="text-blue-600 dark:text-blue-400">TM</span>
              </h1>
            </div>
          </div>

          <div className="hidden md:flex items-center space-x-4">
            <button
              onClick={toggleTheme}
              className="p-2 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
              title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            >
              {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </button>

            <LanguageSwitcher />

            <Popover.Root open={popoverOpen} onOpenChange={setPopoverOpen}>
              <Popover.Trigger asChild>
                <button className="relative p-2 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 outline-none">
                  <Bell className="w-5 h-5" />
                  {unreadCount > 0 && (
                    <span className="absolute top-0 right-0 w-2 h-2 bg-red-500 rounded-full animate-pulse"></span>
                  )}
                </button>
              </Popover.Trigger>
              <Popover.Portal>
                <Popover.Content className="w-80 bg-white dark:bg-slate-800 rounded-xl shadow-xl border border-slate-200 dark:border-slate-700 p-4 z-50 mr-4 mt-2">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="font-semibold text-slate-900 dark:text-white">Notifications</h3>
                    {unreadCount > 0 && (
                      <span className="text-xs text-blue-500 font-medium">{unreadCount} nouvelles</span>
                    )}
                  </div>
                  <div className="space-y-2 max-h-[300px] overflow-y-auto">
                    {notifications.length === 0 ? (
                      <p className="text-sm text-slate-500 text-center py-4">Aucune notification</p>
                    ) : (
                      notifications.map((notif) => (
                        <div
                          key={notif.id}
                          onClick={() => handleNotificationClick(notif)}
                          className={`p-3 rounded-lg text-sm cursor-pointer transition-colors flex gap-3 ${notif.is_read
                            ? 'bg-transparent opacity-70'
                            : 'bg-blue-50 dark:bg-blue-900/20 border-l-2 border-blue-500'
                            }`}
                        >
                          <div className="flex-shrink-0 mt-1">
                            {getIcon(notif.type)}
                          </div>
                          <div>
                            <p className={`font-medium ${!notif.is_read ? 'text-blue-600 dark:text-blue-400' : 'text-slate-700 dark:text-slate-300'}`}>
                              {notif.title}
                            </p>
                            <p className="text-slate-500 mt-1 line-clamp-2">{notif.message}</p>
                            <span className="text-xs text-slate-400 mt-2 block">
                              {new Date(notif.created_at).toLocaleDateString()}
                            </span>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                  <Popover.Arrow className="fill-white dark:fill-slate-800" />
                </Popover.Content>
              </Popover.Portal>
            </Popover.Root>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;