import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import PageLayout from '../components/PageLayout';
import { Switch } from '@radix-ui/themes';
import { toast } from 'react-toastify';
import { Save, CreditCard, Bell, Cpu, Shield, Zap, Palette, RefreshCw } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { motion } from 'framer-motion';

const Settings: React.FC = () => {
  const { t } = useTranslation();
  const [enableSSO, setEnableSSO] = useState(true);
  const [ssoProvider, setSsoProvider] = useState('Okta');
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [insightsEnabled, setInsightsEnabled] = useState(true);
  const [iaSensitivity, setIaSensitivity] = useState(75);
  const { theme, setTheme } = useTheme();

  const handleSave = () => {
    // In a real app we'd persist settings to API
    toast.success(t('settings.toasts.saved'));
  };

  const HeaderActions = (
    <button
      onClick={handleSave}
      className="flex items-center gap-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white px-8 py-3.5 rounded-2xl transition-all shadow-xl shadow-blue-900/40 active:scale-95 font-black text-[10px] tracking-widest uppercase"
    >
      <Save className="w-4 h-4" />
      {t('settings.actions.save')}
    </button>
  );

  const sectionVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.5 } }
  };

  return (
    <PageLayout
      title={t('settings.title')}
      subtitle="SYSTEM CONFIGURATION"
      actions={HeaderActions}
    >
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
        <div className="lg:col-span-2 space-y-10">
          {/* Auth Section */}
          <motion.section
            variants={sectionVariants}
            initial="hidden"
            animate="visible"
            className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-[2.5rem] p-10 shadow-2xl"
          >
            <div className="flex items-center gap-4 mb-8">
              <div className="p-3 bg-blue-500/10 rounded-2xl border border-blue-500/20">
                <Shield className="w-6 h-6 text-blue-500" />
              </div>
              <div>
                <h3 className="text-xl font-black text-white tracking-tight uppercase">{t('settings.auth.title')}</h3>
                <p className="text-slate-500 text-xs font-bold uppercase tracking-widest mt-1 opacity-70">{t('settings.auth.subtitle')}</p>
              </div>
            </div>

            <div className="space-y-8">
              <div className="flex items-center justify-between p-6 bg-white/5 rounded-3xl border border-white/5">
                <div className="space-y-1">
                  <label className="text-sm text-white font-black uppercase tracking-widest">{t('settings.auth.enableSso')}</label>
                  <p className="text-slate-500 text-xs font-medium">{t('settings.auth.ssoDesc')}</p>
                </div>
                <Switch checked={enableSSO} onCheckedChange={(v) => setEnableSSO(Boolean(v))} />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">{t('settings.auth.provider')}</label>
                  <select
                    value={ssoProvider}
                    onChange={(e) => setSsoProvider(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 text-white text-sm font-bold rounded-2xl px-6 py-4 outline-none focus:ring-2 focus:ring-blue-500/50 transition-all cursor-pointer appearance-none"
                  >
                    <option className="bg-slate-900">Okta</option>
                    <option className="bg-slate-900">Azure AD</option>
                    <option className="bg-slate-900">Auth0</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">{t('settings.auth.clientId')}</label>
                  <input
                    className="w-full bg-white/5 border border-white/10 text-white text-sm font-bold rounded-2xl px-6 py-4 outline-none focus:ring-2 focus:ring-blue-500/50 transition-all placeholder-slate-600"
                    placeholder={t('settings.auth.clientIdPlaceholder')}
                  />
                </div>
              </div>
            </div>
          </motion.section>

          {/* Notifications Section */}
          <motion.section
            variants={sectionVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-[2.5rem] p-10 shadow-2xl"
          >
            <div className="flex items-center gap-4 mb-8">
              <div className="p-3 bg-amber-500/10 rounded-2xl border border-amber-500/20">
                <Bell className="w-6 h-6 text-amber-500" />
              </div>
              <div>
                <h3 className="text-xl font-black text-white tracking-tight uppercase">{t('settings.notifications.title')}</h3>
                <p className="text-slate-500 text-xs font-bold uppercase tracking-widest mt-1 opacity-70">{t('settings.notifications.subtitle')}</p>
              </div>
            </div>

            <div className="space-y-8">
              <div className="flex items-center justify-between p-6 bg-white/5 rounded-3xl border border-white/5">
                <div className="space-y-1">
                  <label className="text-sm text-white font-black uppercase tracking-widest">{t('settings.notifications.enable')}</label>
                  <p className="text-slate-500 text-xs font-medium">{t('settings.notifications.desc')}</p>
                </div>
                <Switch checked={notificationsEnabled} onCheckedChange={(v) => setNotificationsEnabled(Boolean(v))} />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">{t('settings.notifications.email')}</label>
                  <input
                    type="email"
                    placeholder="ops@entreprise.com"
                    className="w-full bg-white/5 border border-white/10 text-white text-sm font-bold rounded-2xl px-6 py-4 outline-none focus:ring-2 focus:ring-blue-500/50 transition-all placeholder-slate-600"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">{t('settings.notifications.threshold')}</label>
                  <select className="w-full bg-white/5 border border-white/10 text-white text-sm font-bold rounded-2xl px-6 py-4 outline-none focus:ring-2 focus:ring-blue-500/50 transition-all cursor-pointer appearance-none">
                    <option className="bg-slate-900">{t('settings.notifications.criticalOnly')}</option>
                    <option className="bg-slate-900">{t('settings.notifications.all')}</option>
                  </select>
                </div>
              </div>
            </div>
          </motion.section>

          {/* AI Section */}
          <motion.section
            variants={sectionVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-[2.5rem] p-10 shadow-2xl"
          >
            <div className="flex items-center gap-4 mb-8">
              <div className="p-3 bg-emerald-500/10 rounded-2xl border border-emerald-500/20">
                <Zap className="w-6 h-6 text-emerald-500" />
              </div>
              <div>
                <h3 className="text-xl font-black text-white tracking-tight uppercase">{t('settings.ai.title')}</h3>
                <p className="text-slate-500 text-xs font-bold uppercase tracking-widest mt-1 opacity-70">{t('settings.ai.subtitle')}</p>
              </div>
            </div>

            <div className="space-y-8">
              <div className="flex items-center justify-between p-6 bg-white/5 rounded-3xl border border-white/5">
                <div className="space-y-1">
                  <label className="text-sm text-white font-black uppercase tracking-widest">{t('settings.ai.enableInsights')}</label>
                  <p className="text-slate-500 text-xs font-medium">{t('settings.ai.insightsDesc')}</p>
                </div>
                <Switch checked={insightsEnabled} onCheckedChange={(v) => setInsightsEnabled(Boolean(v))} />
              </div>

              <div className="space-y-4">
                <div className="flex justify-between items-end">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">{t('settings.ai.sensitivity', { value: iaSensitivity })}</label>
                  <span className="text-blue-500 font-black text-xl">{iaSensitivity}%</span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={iaSensitivity}
                  onChange={(e) => setIaSensitivity(Number(e.target.value))}
                  className="w-full h-2 bg-white/5 rounded-full appearance-none cursor-pointer accent-blue-600"
                />
                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest transition-colors opacity-60">{t('settings.ai.sensitivityDesc')}</p>
              </div>
            </div>
          </motion.section>
        </div>

        <div className="space-y-10">
          <motion.aside
            variants={sectionVariants}
            initial="hidden"
            animate="visible"
            className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-[2.5rem] p-8 space-y-8 shadow-2xl sticky top-24"
          >
            <div className="space-y-6">
              <div className="flex items-start gap-5">
                <div className="p-3 bg-blue-500/10 rounded-2xl border border-blue-500/20 shrink-0">
                  <CreditCard className="w-5 h-5 text-blue-500" />
                </div>
                <div>
                  <h4 className="text-sm font-black text-white uppercase tracking-widest">{t('settings.side.billing')}</h4>
                  <p className="text-slate-500 text-xs font-medium mt-1">{t('settings.side.billingDesc')}</p>
                </div>
              </div>

              <div className="flex items-start gap-5">
                <div className="p-3 bg-indigo-500/10 rounded-2xl border border-indigo-500/20 shrink-0">
                  <Palette className="w-5 h-5 text-indigo-500" />
                </div>
                <div>
                  <h4 className="text-sm font-black text-white uppercase tracking-widest">{t('settings.appearance.theme')}</h4>
                  <div className="flex items-center justify-between mt-3 bg-white/5 p-3 rounded-2xl border border-white/5">
                    <span className="text-[10px] font-black text-slate-400">DARK MODE</span>
                    <Switch checked={theme === 'dark'} onCheckedChange={(v) => setTheme(v ? 'dark' : 'light')} />
                  </div>
                </div>
              </div>

              <div className="flex items-start gap-5">
                <div className="p-3 bg-emerald-500/10 rounded-2xl border border-emerald-500/20 shrink-0">
                  <Cpu className="w-5 h-5 text-emerald-500" />
                </div>
                <div>
                  <h4 className="text-sm font-black text-white uppercase tracking-widest">{t('settings.side.model')}</h4>
                  <p className="text-slate-500 text-xs font-medium mt-1">{t('settings.side.modelVersion', { version: 'v1.4 PRO', date: '2024-04-06' })}</p>
                </div>
              </div>
            </div>

            <div className="pt-8 border-t border-white/5 space-y-4">
              <button
                onClick={() => toast.info(t('settings.toasts.resetInfo'))}
                className="w-full flex items-center justify-center gap-3 px-6 py-4 bg-white/5 hover:bg-rose-500/10 text-slate-400 hover:text-rose-400 border border-white/10 rounded-2xl font-black text-[10px] tracking-widest uppercase transition-all"
              >
                <RefreshCw className="w-4 h-4" />
                {t('settings.actions.reset')}
              </button>
            </div>
          </motion.aside>
        </div>
      </div>
    </PageLayout>
  );
};

export default Settings;