import React, { useState } from 'react';
import Header from '../components/Header';
import Sidebar from '../components/Sidebar';
import { Switch } from '@radix-ui/themes';
import { toast } from 'react-toastify';
import { Save, CreditCard, Bell, Cpu } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

const Settings: React.FC = () => {
  const [enableSSO, setEnableSSO] = useState(true);
  const [ssoProvider, setSsoProvider] = useState('Okta');
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [insightsEnabled, setInsightsEnabled] = useState(true);
  const [iaSensitivity, setIaSensitivity] = useState(75);
  const { theme, setTheme } = useTheme();

  const handleSave = () => {
    // In a real app we'd persist settings to API
    toast.success('Paramètres sauvegardés');
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 transition-colors duration-300">
      <Header />
      <div className="flex">
        <Sidebar />
        <main className="flex-1 lg:ml-64 p-6">
          <div className="max-w-7xl mx-auto">
            <div className="mb-6">
              <h1 className="text-2xl font-bold text-slate-900 dark:text-white transition-colors">Paramètres</h1>
              <p className="text-slate-500 dark:text-slate-400 transition-colors">Configuration de la plateforme, authentification et paramètres IA</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
              <section className="lg:col-span-2 bg-white dark:bg-slate-800/50 backdrop-blur-sm border border-slate-200 dark:border-slate-700/50 rounded-xl p-6 space-y-6 shadow-sm dark:shadow-none transition-colors">
                <div>
                  <h3 className="text-slate-900 dark:text-white font-semibold mb-2 transition-colors">Authentification</h3>
                  <p className="text-slate-500 dark:text-slate-400 text-sm mb-4 transition-colors">Configurer l'accès et le Single Sign-On (SSO)</p>

                  <div className="flex items-center justify-between gap-4 mb-4">
                    <div>
                      <label className="text-sm text-slate-700 dark:text-white font-medium transition-colors">Activer SSO</label>
                      <p className="text-slate-500 dark:text-slate-400 text-xs transition-colors">Connexion centralisée via fournisseur externe</p>
                    </div>
                    <Switch checked={enableSSO} onCheckedChange={(v) => setEnableSSO(Boolean(v))} />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-end">
                    <div>
                      <label className="block text-sm text-slate-600 dark:text-slate-300 mb-1 transition-colors">Fournisseur SSO</label>
                      <select
                        value={ssoProvider}
                        onChange={(e) => setSsoProvider(e.target.value)}
                        className="w-full bg-slate-50 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-sm rounded-lg px-3 py-2 focus:outline-none transition-all"
                      >
                        <option>Okta</option>
                        <option>Azure AD</option>
                        <option>Auth0</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm text-slate-600 dark:text-slate-300 mb-1 transition-colors">Client ID</label>
                      <input className="w-full bg-slate-50 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-sm rounded-lg px-3 py-2 focus:outline-none transition-all" placeholder="ex: client-id-xxx" />
                    </div>

                    <div>
                      <label className="block text-sm text-slate-600 dark:text-slate-300 mb-1 transition-colors">Secret (masqué)</label>
                      <input type="password" className="w-full bg-slate-50 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-sm rounded-lg px-3 py-2 focus:outline-none transition-all" placeholder="••••••••" />
                    </div>
                  </div>
                </div>

                <div className="border-t border-slate-200 dark:border-slate-700/50 my-4 transition-colors"></div>

                <div>
                  <h3 className="text-slate-900 dark:text-white font-semibold mb-2 transition-colors">Notifications</h3>
                  <p className="text-slate-500 dark:text-slate-400 text-sm mb-4 transition-colors">Alertes et notifications de la plateforme</p>

                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <label className="text-sm text-slate-700 dark:text-white font-medium transition-colors">Activer notifications</label>
                      <p className="text-slate-500 dark:text-slate-400 text-xs transition-colors">Recevoir des alertes en cas d'anomalies critiques</p>
                    </div>
                    <Switch checked={notificationsEnabled} onCheckedChange={(v) => setNotificationsEnabled(Boolean(v))} />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm text-slate-600 dark:text-slate-300 mb-1 transition-colors">Notifications Email</label>
                      <input type="email" placeholder="ops@entreprise.com" className="w-full bg-slate-50 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-sm rounded-lg px-3 py-2 focus:outline-none transition-all" />
                    </div>

                    <div>
                      <label className="block text-sm text-slate-600 dark:text-slate-300 mb-1 transition-colors">Seuil d'alerte</label>
                      <select className="w-full bg-slate-50 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-sm rounded-lg px-3 py-2 focus:outline-none transition-all">
                        <option>Critique uniquement</option>
                        <option>Critique + Haute</option>
                        <option>Toutes</option>
                      </select>
                    </div>
                  </div>
                </div>

                <div className="border-t border-slate-200 dark:border-slate-700/50 my-4 transition-colors"></div>

                <div>
                  <h3 className="text-slate-900 dark:text-white font-semibold mb-2 transition-colors">Paramètres IA</h3>
                  <p className="text-slate-500 dark:text-slate-400 text-sm mb-4 transition-colors">Contrôles de sensibilité et comportement des insights</p>

                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <label className="text-sm text-slate-700 dark:text-white font-medium transition-colors">Activer Insights IA</label>
                      <p className="text-slate-500 dark:text-slate-400 text-xs transition-colors">Générer automatiquement des priorités & synthèses</p>
                    </div>
                    <Switch checked={insightsEnabled} onCheckedChange={(v) => setInsightsEnabled(Boolean(v))} />
                  </div>

                  <div className="mb-4">
                    <label className="block text-sm text-slate-600 dark:text-slate-300 mb-1 transition-colors">Sensibilité IA: {iaSensitivity}%</label>
                    <input
                      type="range"
                      min={0}
                      max={100}
                      value={iaSensitivity}
                      onChange={(e) => setIaSensitivity(Number(e.target.value))}
                      className="w-full accent-blue-600"
                    />
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 transition-colors">Plus la sensibilité est élevée, plus le moteur signalera d'anomalies et de priorités.</p>
                  </div>
                </div>
              </section>

              <aside className="bg-white dark:bg-slate-800/50 backdrop-blur-sm border border-slate-200 dark:border-slate-700/50 rounded-xl p-6 space-y-4 shadow-sm dark:shadow-none transition-colors h-fit">
                <div className="flex items-start gap-3">
                  <div className="p-2 bg-blue-100 dark:bg-blue-600/10 rounded-md transition-colors">
                    <CreditCard className="w-5 h-5 text-blue-600 dark:text-blue-300 transition-colors" />
                  </div>
                  <div>
                    <h4 className="text-slate-900 dark:text-white font-medium transition-colors">Facturation & Abonnement</h4>
                    <p className="text-slate-500 dark:text-slate-400 text-sm transition-colors">Informations sur l'abonnement et intégration facturation</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="p-2 bg-blue-100 dark:bg-blue-600/10 rounded-md transition-colors">
                    <Bell className="w-5 h-5 text-blue-600 dark:text-blue-300 transition-colors" />
                  </div>
                  <div>
                    <h4 className="text-slate-900 dark:text-white font-medium transition-colors">Canal de notifications</h4>
                    <p className="text-slate-500 dark:text-slate-400 text-sm transition-colors">Email, Slack ou Webhook pour alertes en temps réel</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="p-2 bg-blue-100 dark:bg-blue-600/10 rounded-md transition-colors">
                    <Cpu className="w-5 h-5 text-blue-600 dark:text-blue-300 transition-colors" />
                  </div>
                  <div>
                    <h4 className="text-slate-900 dark:text-white font-medium transition-colors">Modèle IA</h4>
                    <p className="text-slate-500 dark:text-slate-400 text-sm transition-colors">Version: v1.3 • Dernière mise à jour: 2024-01-20</p>
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-200 dark:border-slate-700/50 mt-4">
                  <label className="flex items-center justify-between text-sm text-slate-700 dark:text-white mb-2 transition-colors">Thème sombre</label>
                  <div className="flex items-center justify-between">
                    <div className="text-sm text-slate-500 dark:text-slate-400 transition-colors">Activer le mode sombre de l'interface</div>
                    <Switch checked={theme === 'dark'} onCheckedChange={(v) => setTheme(v ? 'dark' : 'light')} />
                  </div>
                </div>
              </aside>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={handleSave}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-white transition-colors shadow-lg shadow-blue-500/20 dark:shadow-blue-900/20"
              >
                <Save className="w-4 h-4" /> Enregistrer
              </button>
              <button
                onClick={() => toast.info('Réinitialisation des paramètres par défaut')}
                className="px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-600 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors"
              >
                Réinitialiser
              </button>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default Settings;