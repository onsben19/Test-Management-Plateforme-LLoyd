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
import { useSidebar } from '../context/SidebarContext';
import Pagination from '../components/Pagination';


import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
  Tooltip
} from 'recharts';

interface Anomaly {
  id: string;
  title: string;
  severity: 'Critique' | 'Moyenne' | 'Faible';
  status: 'Ouverte' | 'En investigation' | 'Résolue';
  relatedTest?: string;
  assignedTo?: string; // This maps to 'cree_par_nom' (Created By)
  createdAt: string;
  description?: string;
  proofImage?: string;
  release?: string;
  campaign?: string;
}

const severityToBadgeColor = (s: Anomaly['severity']) => {
  switch (s) {
    case 'Critique':
      return 'red';
    case 'Moyenne':
      return 'yellow';
    default:
      return 'gray';
  }
};

const Anomalies: React.FC = () => {
  const { theme } = useTheme();
  const { user } = useAuth();
  const { isOpen } = useSidebar();
  const isTester = user?.role?.toLowerCase() === 'tester';

  const location = useLocation();
  const queryParams = new URLSearchParams(location.search);
  const relatedTestFilter = queryParams.get('test');

  const [query, setQuery] = useState(relatedTestFilter || '');
  const [severityFilter, setSeverityFilter] = useState<'Tout' | Anomaly['severity']>('Tout');
  const [sortOrder, setSortOrder] = useState<'recent' | 'oldest'>('recent');
  const [data, setData] = useState<Anomaly[]>([]);
  const [isDownloading, setIsDownloading] = useState(false);
  const [isPdfDownloading, setIsPdfDownloading] = useState(false);
  const [loading, setLoading] = useState(true);

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const pageSize = 10;

  const [editingAnomaly, setEditingAnomaly] = useState<Anomaly | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  React.useEffect(() => {
    fetchAnomalies(1);
    setCurrentPage(1);
  }, [query, severityFilter, sortOrder]);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    fetchAnomalies(page);
  };

  const fetchAnomalies = async (page = 1) => {
    try {
      setLoading(true);
      const response = await anomalyService.getAnomalies({
        page,
        search: query,
        criticite: severityFilter !== 'Tout' ? severityFilter.toUpperCase() : undefined,
        ordering: sortOrder === 'recent' ? '-cree_le' : 'cree_le'
      });
      const data = response.data.results || response.data;
      const count = response.data.count || (Array.isArray(response.data) ? response.data.length : 0);

      setTotalItems(count);

      const mappedAnomalies: Anomaly[] = data.map((a: any) => ({
        id: a.id.toString(),
        title: a.titre,
        severity: a.criticite === 'CRITIQUE' ? 'Critique' : a.criticite === 'MOYENNE' ? 'Moyenne' : 'Faible',
        status: 'Ouverte',
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
    setEditingAnomaly(null);
    setIsCreating(true);
  };

  const handleSaveAnomaly = async (id: string | null, updates: FormData) => {
    try {
      if (id) {
        await anomalyService.updateAnomaly(id, updates);
      } else {
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
    return data;
  }, [data]);

  const stats = useMemo(() => {
    const total = data.length;
    const critical = data.filter(a => a.severity === 'Critique').length;
    const distribution = [
      { name: 'Critique', value: data.filter(a => a.severity === 'Critique').length, color: '#ef4444' },
      { name: 'Moyenne', value: data.filter(a => a.severity === 'Moyenne').length, color: '#eab308' },
      { name: 'Faible', value: data.filter(a => a.severity === 'Faible').length, color: '#3b82f6' },
    ].filter(d => d.value > 0);

    if (distribution.length === 0) {
      distribution.push({ name: 'Aucune', value: 1, color: '#475569' });
    }

    return { total, critical, distribution };
  }, [data]);

  const handleDownload = async () => {
    setIsDownloading(true);
    try {
      const header = ['ID', 'Titre', 'Gravité', 'Statut', 'Test lié', 'Release', 'Campagne', 'Créé par', 'Date', 'Description'];
      const rows = filtered.map((r) => [
        r.id,
        r.title,
        r.severity,
        r.status,
        r.relatedTest || '',
        r.release || '',
        r.campaign || '',
        r.assignedTo || '',
        new Date(r.createdAt).toLocaleDateString('fr-FR'),
        (r.description || '').replace(/\n/g, ' ')
      ]);

      // Use semicolon as delimiter for French Excel compatibility
      const csvContent = [header, ...rows]
        .map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(';'))
        .join('\n');

      // Add UTF-8 BOM for Excel to recognize accents
      const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
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

  const handleDownloadPdf = async () => {
    setIsPdfDownloading(true);
    try {
      const response = await anomalyService.exportAnomaliesPdf({
        search: query,
        criticite: severityFilter !== 'Tout' ? severityFilter.toUpperCase() : undefined,
        ordering: sortOrder === 'recent' ? '-cree_le' : 'cree_le'
      });

      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `rapport_anomalies_${new Date().toISOString().slice(0, 10)}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Failed to download PDF", error);
      alert("Erreur lors de la génération du PDF.");
    } finally {
      setIsPdfDownloading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 transition-colors duration-300">
      <Header />
      <div className="flex">
        <Sidebar />
        <main className={`flex-1 p-6 transition-all duration-300 ${isOpen ? 'lg:ml-64' : 'lg:ml-16'}`}>
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
                    onClick={() => fetchAnomalies(currentPage)}
                    className="flex items-center gap-2 px-3 py-2 bg-slate-100 dark:bg-slate-800/70 hover:bg-slate-200 dark:hover:bg-slate-800/90 rounded-lg transition-colors text-slate-700 dark:text-slate-200"
                    title="Rafraîchir"
                  >
                    <RefreshCcw className="w-4 h-4" />
                    <span className="text-xs hidden sm:inline">Rafraîchir</span>
                  </button>

                  <button
                    onClick={handleDownload}
                    disabled={isDownloading}
                    className="flex items-center gap-2 px-3 py-2 bg-slate-100 dark:bg-slate-800/70 hover:bg-slate-200 dark:hover:bg-slate-800/90 rounded-lg transition-colors text-slate-700 dark:text-slate-200"
                    title="Exporter CSV"
                  >
                    <DownloadCloud className="w-4 h-4" />
                    <span className="text-xs hidden sm:inline">CSV</span>
                  </button>

                  <button
                    onClick={handleDownloadPdf}
                    disabled={isPdfDownloading}
                    className="flex items-center gap-2 px-3 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors text-white"
                    title="Exporter PDF"
                  >
                    <DownloadCloud className="w-4 h-4" />
                    <span className="text-xs hidden sm:inline">PDF</span>
                  </button>
                </div>
              </div>

              <div className="table-container mb-6 overflow-x-auto">
                <table className="w-full min-w-[900px] text-left">
                  <thead className="table-sticky-header text-slate-500 dark:text-slate-400 text-xs uppercase font-medium">
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

              <Pagination
                currentPage={currentPage}
                totalItems={totalItems}
                pageSize={pageSize}
                onPageChange={handlePageChange}
                loading={loading}
              />
            </div>

            <aside className="bg-white dark:bg-slate-800/50 backdrop-blur-sm border border-slate-200 dark:border-slate-700/50 rounded-xl p-4 shadow-sm dark:shadow-none transition-colors">
              <h3 className="text-slate-900 dark:text-white font-semibold mb-1 transition-colors text-sm">Répartition des Anomalies</h3>
              <p className="text-slate-500 dark:text-slate-400 text-xs mb-4 transition-colors font-medium">Réel par niveau de sévérité</p>

              <div className="grid grid-cols-2 gap-2 mb-6">
                <div className="bg-slate-100 dark:bg-slate-900/40 p-3 rounded-xl border border-slate-200 dark:border-slate-700/30">
                  <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block mb-1">Total</span>
                  <span className="text-xl font-bold text-slate-900 dark:text-white">{stats.total}</span>
                </div>
                <div className="bg-red-500/10 p-3 rounded-xl border border-red-500/20">
                  <span className="text-[10px] text-red-500 font-bold uppercase tracking-wider block mb-1">Bloquants</span>
                  <span className="text-xl font-bold text-red-600 dark:text-red-400">{stats.critical}</span>
                </div>
              </div>

              <div className="h-56 relative">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={stats.distribution}
                      cx="50%"
                      cy="45%"
                      innerRadius={55}
                      outerRadius={75}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {stats.distribution.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        backgroundColor: theme === 'dark' ? '#0f172a' : '#ffffff',
                        border: 'none',
                        borderRadius: 8,
                        fontSize: 12
                      }}
                    />
                    <Legend
                      verticalAlign="bottom"
                      align="center"
                      iconSize={8}
                      formatter={(val) => <span className="text-[10px] text-slate-500 font-medium">{val}</span>}
                    />
                  </PieChart>
                </ResponsiveContainer>
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