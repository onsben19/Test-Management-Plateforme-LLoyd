import React, { useEffect, useState } from 'react';
import { Bell, Menu, X, Sun, Moon, CheckCircle, AlertTriangle, MessageSquare, Mail, LogOut, User as UserIcon } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../context/ThemeContext';
import { notificationService, type Notification } from '../services/notificationService';
import { useAuth } from '../context/AuthContext';
import { useSidebar } from '../context/SidebarContext';
import * as Popover from '@radix-ui/react-popover';
import LanguageSwitcher from './LanguageSwitcher';

const Header = () => {
  const { t } = useTranslation();
  const { theme, resolvedTheme, toggleTheme } = useTheme();
  const { user, logout } = useAuth();
  const { isOpen, toggle } = useSidebar();
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [popoverOpen, setPopoverOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);

  const getIcon = (type: string) => {
    switch (type) {
      case 'campaign_assignment': return <Bell className="w-5 h-5 text-blue-500" />;
      case 'execution_validated': return <CheckCircle className="w-5 h-5 text-emerald-500" />;
      case 'anomaly_reported': return <AlertTriangle className="w-5 h-5 text-red-500" />;
      case 'reinforcement_request': return <AlertTriangle className="w-5 h-5 text-blue-500" />;
      case 'comment_posted': return <MessageSquare className="w-5 h-5 text-amber-500" />;
      case 'email_received': return <Mail className="w-5 h-5 text-indigo-500" />;
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
    // Poll every 15 seconds to optimize performance
    const interval = setInterval(fetchNotifications, 15000);
    return () => clearInterval(interval);
  }, [user]);

  const resolveNotificationTarget = (notif: Notification) => {
    const role = user?.role?.toUpperCase();
    const campaignId = notif.related_campaign;
    const objectId = notif.related_object_id;

    switch (notif.type) {
      case 'campaign_assignment':
      case 'reinforcement_request':
        if (role === 'TESTER') {
          return campaignId
            ? `/tester-dashboard?campaign=${campaignId}`
            : '/tester-dashboard';
        }
        if (role === 'ADMIN') return '/admin/campaigns';
        return campaignId ? `/manager?campaign=${campaignId}` : '/manager/dashboard';

      case 'execution_validated':
        if (role === 'ADMIN') {
          return objectId ? `/admin/executions?highlight=${objectId}` : '/admin/executions';
        }
        return objectId ? `/execution?testId=${objectId}` : '/execution';

      case 'anomaly_reported':
        if (role === 'ADMIN') {
          return objectId ? `/admin/anomalies?highlight=${objectId}` : '/admin/anomalies';
        }
        return objectId ? `/anomalies?highlight=${objectId}` : '/anomalies';

      case 'comment_posted':
        if (!objectId) return '/chat';
        if (role === 'ADMIN') {
          return `/admin/executions?highlight=${objectId}`;
        }
        return `/execution?testId=${objectId}`;

      case 'email_received':
        return role === 'ADMIN' ? '/management/messages' : '/messages';

      default:
        if (objectId) {
          if (role === 'ADMIN') return `/admin/executions?highlight=${objectId}`;
          return `/execution?testId=${objectId}`;
        }
        if (campaignId) {
          if (role === 'TESTER') return `/tester-dashboard?campaign=${campaignId}`;
          if (role === 'ADMIN') return '/admin/campaigns';
          return `/manager?campaign=${campaignId}`;
        }
        if (role === 'ADMIN') return '/admin/dashboard';
        if (role === 'MANAGER') return '/manager/dashboard';
        if (role === 'TESTER') return '/tester-dashboard';
        return '/';
    }
  };

  const handleNotificationClick = async (notif: Notification) => {
    try {
      if (!notif.is_read) {
        await notificationService.markAsRead(notif.id);
        fetchNotifications();
      }
      setPopoverOpen(false);
      navigate(resolveNotificationTarget(notif));
    } catch (error) {
      console.error("Failed to process notification click", error);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await notificationService.markAllAsRead();
      fetchNotifications();
    } catch (error) {
      console.error("Failed to mark all notifications as read", error);
    }
  };

  const formatNotifDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 1) return t('header.justNow');
    if (diffMins < 60) return t('header.minutesAgo', { count: diffMins });
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return t('header.hoursAgo', { count: diffHours });
    return date.toLocaleDateString(t('common.dateLocale'), { day: 'numeric', month: 'short' });
  };

  const renderNotificationBell = () => (
    <Popover.Root open={popoverOpen} onOpenChange={setPopoverOpen}>
      <Popover.Trigger asChild>
        <button
          className="relative p-2 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 outline-none"
          aria-label={t('header.notifications')}
        >
          <Bell className="w-5 h-5" />
          {unreadCount > 0 && (
            <span className="absolute top-0.5 right-0.5 min-w-[18px] h-[18px] px-1 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          )}
        </button>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content className="w-80 bg-white dark:bg-slate-800 rounded-xl shadow-xl border border-slate-200 dark:border-slate-700 p-4 z-50 mr-4 mt-2">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-semibold text-slate-900 dark:text-white">{t('header.notifications')}</h3>
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllRead}
                className="text-xs text-blue-500 hover:text-blue-600 font-medium transition-colors"
              >
                {t('header.markAllRead')}
              </button>
            )}
          </div>
          <div className="space-y-2 max-h-[300px] overflow-y-auto">
            {notifications.length === 0 ? (
              <p className="text-sm text-slate-500 text-center py-4">{t('header.noNotifications')}</p>
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
                      {formatNotifDate(notif.created_at)}
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
  );

  return (
    <header className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border-b border-slate-200/50 dark:border-slate-700/50 sticky top-0 z-50 transition-all duration-500">
      <div className="w-full px-4">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center gap-3">
            <button
              onClick={toggle}
              className="p-1.5 text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-900 dark:hover:text-white rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              aria-label={t('header.toggleSidebar')}
            >
              <Menu className="w-6 h-6" />
            </button>
            <h1 className="text-2xl font-black text-slate-900 dark:text-white transition-all duration-300 tracking-tighter font-heading cursor-default ml-1">
              Insure<span className="text-blue-600 dark:text-blue-400">TM</span>
            </h1>
          </div>

          <div className="flex items-center space-x-2 md:space-x-4">
            <LanguageSwitcher />

            <button
              onClick={toggleTheme}
              className="p-2 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
              aria-label={resolvedTheme === 'dark' ? t('header.enableLightMode') : t('header.enableDarkMode')}
              title={resolvedTheme === 'dark' ? t('header.lightMode') : t('header.darkMode')}
            >
              {resolvedTheme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </button>

            {renderNotificationBell()}

            <Popover.Root open={profileOpen} onOpenChange={setProfileOpen}>
    <Popover.Trigger asChild>
      <button className="relative ml-2 flex items-center justify-center w-9 h-9 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-500 text-white font-bold text-sm shadow-md hover:shadow-lg transition-all outline-none">
        {user?.avatar ? (
          <img src={user.avatar} alt="Avatar" className="w-9 h-9 rounded-full object-cover" />
        ) : (
          user?.username?.charAt(0).toUpperCase() || 'U'
        )}
        <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-500 border-2 border-white dark:border-slate-900 rounded-full" />
      </button>
    </Popover.Trigger>
    <Popover.Portal>
      <Popover.Content className="w-56 bg-white dark:bg-slate-800 rounded-xl shadow-xl border border-slate-200 dark:border-slate-700 p-2 z-50 mr-4 mt-2">
        <div className="px-3 py-2 border-b border-slate-100 dark:border-slate-700 mb-2">
          <p className="font-bold text-slate-900 dark:text-white truncate">{user?.username || t('header.defaultUser')}</p>
          <p className="text-[10px] font-bold text-blue-500 uppercase tracking-widest">{user?.role || ''}</p>
        </div>
        <div className="space-y-1">
          <Link
            to="/profile"
            onClick={() => setProfileOpen(false)}
            className="flex items-center gap-3 w-full px-3 py-2 text-sm text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-700/50 rounded-lg transition-colors"
          >
            <UserIcon className="w-4 h-4" />
            {t('header.myProfile')}
          </Link>
          <button
            onClick={() => { setProfileOpen(false); logout(); }}
            className="flex items-center gap-3 w-full px-3 py-2 text-sm text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10 rounded-lg transition-colors"
          >
            <LogOut className="w-4 h-4" />
            {t('header.logout')}
          </button>
        </div>
        <Popover.Arrow className="fill-white dark:fill-slate-800" />
      </Popover.Content>
    </Popover.Portal>
            </Popover.Root>
          </div>
        </div >
      </div >
    </header >
  );
};

export default Header;