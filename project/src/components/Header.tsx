import React, { useEffect, useState } from 'react';
import { Bell, Menu, X, Sun, Moon, CheckCircle, AlertTriangle, MessageSquare } from 'lucide-react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useTheme } from '../context/ThemeContext';
import { notificationService, type Notification } from '../services/notificationService';
import { useAuth } from '../context/AuthContext';
import * as Popover from '@radix-ui/react-popover';

const Header = () => {
  const { theme, toggleTheme } = useTheme();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

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
      // Ensure response.data is an array
      const data = Array.isArray(response.data) ? response.data : [];
      setNotifications(data);
      setUnreadCount(data.filter(n => !n.is_read).length);
    } catch (error) {
      console.error("Failed to fetch notifications", error);
    }
  };

  useEffect(() => {
    fetchNotifications();
    // Poll every 30 seconds
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, [user]);

  const handleNotificationClick = async (notif: Notification) => {
    try {
      if (!notif.is_read) {
        await notificationService.markAsRead(notif.id);
        fetchNotifications();
      }

      if (notif.type === 'campaign_assignment') {
        navigate('/tester-dashboard');
      } else if (notif.type === 'execution_validated') {
        navigate(`/admin/executions?highlight=${notif.related_object_id}`);
      } else if (notif.type === 'anomaly_reported') {
        navigate(`/admin/anomalies?highlight=${notif.related_object_id}`);
      } else if (notif.type === 'comment_posted') {
        navigate(`/admin/comments?highlight=${notif.related_object_id}`);
      }
    } catch (error) {
      console.error("Failed to process notification click", error);
    }
  };

  return (
    <header className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-sm border-b border-slate-200/50 dark:border-slate-700/50 sticky top-0 z-50 transition-colors duration-300">
      <div className="w-full px-4">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <h1 className="text-xl font-bold text-slate-900 dark:text-white transition-colors">InsureTM</h1>
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

            <Popover.Root>
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