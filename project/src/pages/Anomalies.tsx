import React, { useMemo, useState } from 'react';
import Header from '../components/Header';
import Sidebar from '../components/Sidebar';
import { Badge } from '@radix-ui/themes';
import EditAnomalyModal from '../components/EditAnomalyModal';
import type { AnomalyItem } from '../components/EditAnomalyModal';
import { Search, RefreshCcw, DownloadCloud, Filter, ExternalLink, Pencil, Trash2, AlertTriangle } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { anomalyService } from '../services/api';


import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer
} from 'recharts';

interface Anomaly {
  id: string;
  title: string;
  severity: 'Critique' | 'Haute' | 'Moyenne' | 'Faible';
  status: 'Ouverte' | 'En investigation' | 'Résolue';
  relatedTest?: string;
  assignedTo?: string; // This maps to 'cree_par_nom' (Created By)
  createdAt: string;
  description?: string;
  proofImage?: string;
  release?: string;
  campaign?: string;
}

const rawAnomalies: Anomaly[] = [];

const anomaliesTrend = [
  { month: 'Août', anomalies: 12 },
  { month: 'Sept', anomalies: 9 },
  { month: 'Oct', anomalies: 15 },
  { month: 'Nov', anomalies: 8 },
  { month: 'Déc', anomalies: 11 },
  { month: 'Jan', anomalies: 7 }
];

const severityToBadgeColor = (s: Anomaly['severity']) => {
  switch (s) {
    case 'Critique':
      return 'red';
    case 'Haute':
      return 'orange';
    case 'Moyenne':
      return 'yellow';
    default:
      return 'gray';
  }
};

const Anomalies: React.FC = () => {
  const { theme } = useTheme();
  const { user } = useAuth();
  const isTester = user?.role?.toLowerCase() === 'tester';

  const location = useLocation();
  const queryParams = new URLSearchParams(location.search);
  const relatedTestFilter = queryParams.get('test');

  const [query, setQuery] = useState(relatedTestFilter || '');
  const [severityFilter, setSeverityFilter] = useState<'Tout' | Anomaly['severity']>('Tout');
  const [sortOrder, setSortOrder] = useState<'recent' | 'oldest'>('recent');
  const [data, setData] = useState<Anomaly[]>([]);
  const [isDownloading, setIsDownloading] = useState(false);
  const [loading, setLoading] = useState(true);

  const [editingAnomaly, setEditingAnomaly] = useState<Anomaly | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  React.useEffect(() => {
    fetchAnomalies();
  }, []);

  const fetchAnomalies = async () => {
    try {
      setLoading(true);
      const response = await anomalyService.getAnomalies();
      const mappedAnomalies: Anomaly[] = response.data.map((a: any) => ({
        id: a.id.toString(),
        title: a.titre,
        severity: a.criticite === 'CRITIQUE' ? 'Critique' : a.criticite === 'MOYENNE' ? 'Moyenne' : a.criticite === 'FAIBLE' ? 'Faible' : 'Haute',
        status: 'Ouverte', // Backend status defaults to standard?
        relatedTest: a.test_case_ref || `Test #${a.test_case}`,
        assignedTo: a.cree_par_nom || 'Non assigné',
        createdAt: a.cree_le,
        description: a.description,
        proofImage: a.preuve_image,
        release: a.project_name || 'Inconnu',
        campaign: a.campaign_title || 'Inconnue'
      }));
      setData(mappedAnomalies);
    } catch (error) {
      console.error("Failed to fetch anomalies", error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateAnomaly = () => {
    setEditingAnomaly(null); // Ensure no anomaly is selected
    setIsCreating(true);
  };

  const handleSaveAnomaly = async (id: string | null, updates: FormData) => {
    try {
      if (id) {
        // Update
        await anomalyService.updateAnomaly(id, updates);
      } else {
        // Create
        if (user) {
          updates.append('cree_par', user.id.toString());
        }
        await anomalyService.createAnomaly(updates);
      }
      fetchAnomalies();
      setEditingAnomaly(null);
      setIsCreating(false);
    } catch (error) {
      console.error("Failed to save anomaly", error);
      alert("Erreur lors de l'enregistrement.");
    }
  };

  const handleDeleteAnomaly = async (id: string) => {
    if (!window.confirm("Êtes-vous sûr de vouloir supprimer cette anomalie ?")) return;
    try {
      await anomalyService.deleteAnomaly(id);
      setData(prev => prev.filter(a => a.id !== id));
    } catch (error) {
      console.error("Failed to delete anomaly", error);
      alert("Erreur lors de la suppression.");
    }
  };

  const handleRefresh = fetchAnomalies;

  const filtered = useMemo(() => {
    return data.filter((a) => {
      if (severityFilter !== 'Tout' && a.severity !== severityFilter) return false;
      if (!query) return true;
      const q = query.toLowerCase();
      return (
        a.title.toLowerCase().includes(q) ||
        (a.relatedTest || '').toLowerCase().includes(q) ||
        (a.assignedTo || '').toLowerCase().includes(q) ||
        (a.description || '').toLowerCase().includes(q)
      );
    }).sort((a, b) => {
      const dateA = new Date(a.createdAt).getTime();
      const dateB = new Date(b.createdAt).getTime();
      return sortOrder === 'recent' ? dateB - dateA : dateA - dateB;
    });
  }, [data, query, severityFilter, sortOrder]);

  const handleDownload = async () => {
    setIsDownloading(true);
    try {
      const header = ['ID', 'Titre', 'Gravité', 'Statut', 'Test lié', 'Assigné', 'Date', 'Description'];
      const rows = filtered.map((r) => [
        r.id,
        r.title,
        r.severity,
        r.status,
        r.relatedTest || '',
        r.assignedTo || '',
        r.createdAt,
        (r.description || '').replace(/\n/g, ' ')
      ]);
      const csv = [header, ...rows].map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `anomalies_export_${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 transition-colors duration-300">
      <Header />
      <div className="flex">
        <Sidebar />
        <main className="flex-1 lg:ml-64 p-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
            <div>
              <h1 className="text-2xl font-bold text-slate-900 dark:text-white transition-colors">Anomalies</h1>
              <p className="text-slate-500 dark:text-slate-400 transition-colors">Suivi, priorisation et résolution des anomalies détectées</p>
            </div>
            <button
              onClick={handleCreateAnomaly}
              className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-colors shadow-lg shadow-red-500/20"
            >
              <div className="bg-white/20 p-1 rounded-full">
                <AlertTriangle className="w-4 h-4" />
              </div>
              Signaler une anomalie
            </button>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 mb-6">
            <div className="xl:col-span-2 bg-white dark:bg-slate-800/50 backdrop-blur-sm border border-slate-200 dark:border-slate-700/50 rounded-xl p-4 shadow-sm dark:shadow-none transition-colors">
              <div className="flex items-center gap-3 mb-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                  <input
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Rechercher une anomalie, test, assigné..."
                    className="w-full bg-slate-50 dark:bg-transparent border border-slate-200 dark:border-slate-700 rounded-lg pl-10 pr-4 py-2 text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
                  />
                </div>

                <div className="flex items-center gap-2">
                  <div className="hidden sm:flex items-center gap-2 bg-slate-100 dark:bg-slate-900/40 p-2 rounded-lg transition-colors">
                    <Filter className="w-4 h-4 text-slate-500 dark:text-slate-300 transition-colors" />
                    <select
                      value={severityFilter}
                      onChange={(e) => setSeverityFilter(e.target.value as any)}
                      className="bg-transparent text-sm text-slate-700 dark:text-white pr-6 focus:outline-none transition-colors"
                    >
                      <option value="Tout">Tout</option>
                      <option value="Critique">Critique</option>
                      <option value="Haute">Haute</option>
                      <option value="Moyenne">Moyenne</option>
                      <option value="Faible">Faible</option>
                    </select>
                  </div>

                  <div className="hidden sm:flex items-center gap-2 bg-slate-100 dark:bg-slate-900/40 p-2 rounded-lg transition-colors">
                    <span className="text-xs text-slate-500 dark:text-slate-400">Tri:</span>
                    <select
                      value={sortOrder}
                      onChange={(e) => setSortOrder(e.target.value as 'recent' | 'oldest')}
                      className="bg-transparent text-sm text-slate-700 dark:text-white pr-6 focus:outline-none transition-colors"
                    >
                      <option value="recent">Plus récent</option>
                      <option value="oldest">Plus ancien</option>
                    </select>
                  </div>

                  <button
                    onClick={handleRefresh}
                    className="flex items-center gap-2 px-3 py-2 bg-slate-100 dark:bg-slate-800/70 hover:bg-slate-200 dark:hover:bg-slate-800/90 rounded-lg transition-colors text-slate-700 dark:text-slate-200"
                    title="Rafraîchir"
                  >
                    <RefreshCcw className="w-4 h-4" />
                    <span className="text-xs hidden sm:inline">Rafraîchir</span>
                  </button>

                  <button
                    onClick={handleDownload}
                    disabled={isDownloading}
                    className="flex items-center gap-2 px-3 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors text-white"
                    title="Exporter CSV"
                  >
                    <DownloadCloud className="w-4 h-4" />
                    <span className="text-xs hidden sm:inline">Exporter</span>
                  </button>
                </div>
              </div>

              <div className="overflow-x-auto rounded-md">
                <table className="w-full min-w-[900px]">
                  <thead className="bg-slate-50 dark:bg-slate-900/50 transition-colors">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider transition-colors">Anomalie</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider transition-colors">Gravité</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider transition-colors">Statut</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider transition-colors">Test lié</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider transition-colors">Release</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider transition-colors">Campagne</th>
                      {!isTester && (
                        <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider transition-colors">Créé par</th>
                      )}
                      <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider transition-colors">Date</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider transition-colors">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 dark:divide-slate-700/50 transition-colors">
                    {filtered.map((an) => (
                      <tr key={an.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                        <td className="px-4 py-4 align-top">
                          <div className="text-sm font-medium text-slate-900 dark:text-white transition-colors">{an.title}</div>
                          <div className="text-xs text-slate-500 dark:text-slate-400 truncate max-w-[340px] transition-colors">{an.description}</div>
                        </td>
                        <td className="px-4 py-4 align-top">
                          <Badge color={severityToBadgeColor(an.severity)} variant="soft">
                            {an.severity}
                          </Badge>
                        </td>
                        <td className="px-4 py-4 align-top">
                          <span className="text-sm text-slate-700 dark:text-slate-200 transition-colors">{an.status}</span>
                        </td>
                        <td className="px-4 py-4 align-top">
                          <Link
                            to={`/execution?test=${encodeURIComponent(an.relatedTest || '')}`}
                            className="flex items-center gap-2 group cursor-pointer hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                          >
                            <div className="text-sm text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">{an.relatedTest}</div>
                            <ExternalLink className="w-3 h-3 text-slate-400 dark:text-slate-500 group-hover:text-blue-600 dark:group-hover:text-blue-400 opacity-0 group-hover:opacity-100 transition-all" />
                          </Link>
                        </td>
                        <td className="px-4 py-4 align-top">
                          <div className="text-sm text-slate-700 dark:text-slate-200 transition-colors">{an.release}</div>
                        </td>
                        <td className="px-4 py-4 align-top">
                          <div className="text-sm text-slate-700 dark:text-slate-200 transition-colors">{an.campaign}</div>
                        </td>
                        {!isTester && (
                          <td className="px-4 py-4 align-top">
                            <div className="text-sm text-slate-700 dark:text-slate-200 transition-colors">{an.assignedTo}</div>
                          </td>
                        )}
                        <td className="px-4 py-4 align-top text-sm text-slate-500 dark:text-slate-400 transition-colors">
                          {new Date(an.createdAt).toLocaleDateString('fr-FR')}
                        </td>
                        <td className="px-4 py-4 align-top text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => setEditingAnomaly(an)}
                              className="p-2 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-full text-slate-500 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                              title="Modifier"
                            >
                              <Pencil className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDeleteAnomaly(an.id)}
                              className="p-2 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-full text-slate-500 dark:text-slate-400 hover:text-red-600 dark:hover:text-red-400 transition-colors"
                              title="Supprimer"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {filtered.length === 0 && (
                      <tr>
                        <td colSpan={9} className="px-4 py-10 text-center text-slate-500 transition-colors">
                          Aucun résultat pour votre recherche / filter.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            <aside className="bg-white dark:bg-slate-800/50 backdrop-blur-sm border border-slate-200 dark:border-slate-700/50 rounded-xl p-4 shadow-sm dark:shadow-none transition-colors">
              <h3 className="text-slate-900 dark:text-white font-semibold mb-2 transition-colors">Tendances Anomalies</h3>
              <p className="text-slate-500 dark:text-slate-400 text-sm mb-4 transition-colors">Volume d'anomalies sur 6 mois</p>
              <div className="h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={anomaliesTrend} margin={{ top: 6, right: 6, left: -10, bottom: 6 }}>
                    <defs>
                      <linearGradient id="anomalyColor" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#fb7185" stopOpacity={0.28} />
                        <stop offset="95%" stopColor="#fb7185" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke={theme === 'dark' ? '#374151' : '#e2e8f0'} />
                    <XAxis dataKey="month" tick={{ fill: '#9ca3af', fontSize: 12 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill: '#9ca3af', fontSize: 12 }} axisLine={false} tickLine={false} />
                    <Tooltip contentStyle={{ backgroundColor: theme === 'dark' ? '#0f172a' : '#ffffff', border: theme === 'dark' ? '1px solid #475569' : '1px solid #e2e8f0', borderRadius: 8, color: theme === 'dark' ? '#f1f5f9' : '#1e293b' }} />
                    <Area type="monotone" dataKey="anomalies" stroke="#fb7185" strokeWidth={2} fill="url(#anomalyColor)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>

              <div className="mt-4">
                <h4 className="text-slate-700 dark:text-slate-300 text-sm mb-2 transition-colors">Actions rapides</h4>
                <button className="w-full mb-2 px-3 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-white transition-colors text-sm">Créer une tâche de résolution</button>
                <button className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors text-sm">Assigner en masse</button>
              </div>
            </aside>
          </div>
        </main>
      </div>

      {(editingAnomaly || isCreating) && (
        <EditAnomalyModal
          anomaly={editingAnomaly || undefined}
          onClose={() => {
            setEditingAnomaly(null);
            setIsCreating(false);
          }}
          onSave={handleSaveAnomaly}
        />
      )}
    </div>
  );
};

export default Anomalies;