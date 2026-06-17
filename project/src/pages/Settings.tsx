import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import PageLayout from '../components/PageLayout';
import { Switch } from '@radix-ui/themes';
import { toast } from 'react-toastify';
import { useTheme } from '../context/ThemeContext';

const Settings: React.FC = () => {
  const { t } = useTranslation();
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [notifEmail, setNotifEmail] = useState('');
  const [notifThreshold, setNotifThreshold] = useState<'critical' | 'all'>('critical');
  const [insightsEnabled, setInsightsEnabled] = useState(true);
  const [iaSensitivity, setIaSensitivity] = useState(75);
  const { theme, setTheme } = useTheme();

  const handleSave = () => {
    toast.success(t('settings.toasts.saved'));
  };

  const inputCls = "w-full bg-[#1a2235] border border-white/[0.08] rounded-[10px] px-4 py-2.5 text-[13px] text-white placeholder:text-white/20 focus:border-[#7C3AED]/50 focus:ring-0 outline-none transition-colors";
  const labelCls = "text-[10px] font-bold text-white/30 uppercase tracking-[0.15em]";

  const SectionHeader = ({ title, subtitle }: { title: string; subtitle: string }) => (
    <div className="px-5 py-4 border-b border-white/[0.06]">
      <h3 className="text-[13px] font-semibold text-white">{title}</h3>
      <p className="text-[11px] text-white/30 mt-0.5">{subtitle}</p>
    </div>
  );

  return (
    <PageLayout
      title={t('settings.title')}
      subtitle="Configuration de la plateforme"
      actions={
        <button
          onClick={handleSave}
          className="px-5 py-2.5 bg-[#7C3AED] hover:bg-[#6d28d9] text-white rounded-[10px] transition-all text-[13px] font-semibold active:scale-[0.98]"
        >
          {t('settings.actions.save')}
        </button>
      }
    >
      <div className="max-w-2xl space-y-4">

        {/* Notifications */}
        <section className="bg-[#111827] border border-white/[0.07] rounded-[16px] overflow-hidden">
          <SectionHeader
            title={t('settings.notifications.title')}
            subtitle={t('settings.notifications.subtitle')}
          />

          <div className="p-5 space-y-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[13px] font-medium text-white">{t('settings.notifications.enable')}</p>
                <p className="text-[11px] text-white/30 mt-0.5">{t('settings.notifications.desc')}</p>
              </div>
              <Switch checked={notificationsEnabled} onCheckedChange={(v) => setNotificationsEnabled(Boolean(v))} />
            </div>

            <div className={`space-y-4 transition-opacity ${notificationsEnabled ? 'opacity-100' : 'opacity-30 pointer-events-none'}`}>
              <div className="space-y-1.5">
                <label className={labelCls}>{t('settings.notifications.email')}</label>
                <input
                  type="email"
                  value={notifEmail}
                  onChange={(e) => setNotifEmail(e.target.value)}
                  placeholder="ops@entreprise.com"
                  className={inputCls}
                />
              </div>

              <div className="space-y-1.5">
                <label className={labelCls}>{t('settings.notifications.threshold')}</label>
                <div className="flex gap-2">
                  {([
                    { value: 'critical', label: t('settings.notifications.criticalOnly') },
                    { value: 'all', label: t('settings.notifications.all') },
                  ] as const).map(opt => {
                    const active = notifThreshold === opt.value;
                    return (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => setNotifThreshold(opt.value)}
                        className={`flex-1 py-2 rounded-[8px] text-[12px] font-semibold border transition-all ${active ? 'bg-[#7C3AED]/15 border-[#7C3AED]/40 text-[#a78bfa]' : 'bg-[#1a2235] border-white/[0.06] text-white/30 hover:border-white/20'}`}
                      >
                        {opt.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Apparence */}
        <section className="bg-[#111827] border border-white/[0.07] rounded-[16px] overflow-hidden">
          <SectionHeader
            title={t('settings.appearance.theme')}
            subtitle="Personnaliser l'affichage de l'interface"
          />

          <div className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[13px] font-medium text-white">Mode sombre</p>
                <p className="text-[11px] text-white/30 mt-0.5">Interface optimisée pour les environnements peu éclairés</p>
              </div>
              <Switch checked={theme === 'dark'} onCheckedChange={(v) => setTheme(v ? 'dark' : 'light')} />
            </div>
          </div>
        </section>

        {/* IA */}
        <section className="bg-[#111827] border border-white/[0.07] rounded-[16px] overflow-hidden">
          <SectionHeader
            title={t('settings.ai.title')}
            subtitle={t('settings.ai.subtitle')}
          />

          <div className="p-5 space-y-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[13px] font-medium text-white">{t('settings.ai.enableInsights')}</p>
                <p className="text-[11px] text-white/30 mt-0.5">{t('settings.ai.insightsDesc')}</p>
              </div>
              <Switch checked={insightsEnabled} onCheckedChange={(v) => setInsightsEnabled(Boolean(v))} />
            </div>

            <div className={`space-y-3 transition-opacity ${insightsEnabled ? 'opacity-100' : 'opacity-30 pointer-events-none'}`}>
              <div className="flex items-center justify-between">
                <label className={labelCls}>{t('settings.ai.sensitivity', { value: iaSensitivity })}</label>
                <span className="text-[13px] font-bold text-[#a78bfa]">{iaSensitivity}%</span>
              </div>
              <input
                type="range"
                min={0}
                max={100}
                value={iaSensitivity}
                onChange={(e) => setIaSensitivity(Number(e.target.value))}
                className="w-full h-1.5 bg-white/10 rounded-full appearance-none cursor-pointer accent-[#7C3AED]"
              />
              <p className="text-[11px] text-white/25">{t('settings.ai.sensitivityDesc')}</p>
            </div>
          </div>
        </section>

      </div>
    </PageLayout>
  );
};

export default Settings;
