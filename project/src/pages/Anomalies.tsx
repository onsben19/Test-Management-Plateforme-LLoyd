import React, { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import PageLayout from '../components/PageLayout';
import { Badge } from '@radix-ui/themes';
import EditAnomalyModal from '../components/EditAnomalyModal';
import AnomalyDetailModal from '../components/AnomalyDetailModal';
import type { AnomalyItem } from '../components/EditAnomalyModal';
import {
  Search,
  RefreshCcw,
  DownloadCloud,
  Filter,
  ExternalLink,
  Pencil,
  Trash2,
  AlertTriangle,
  AlertCircle,
  AlertOctagon,
  CheckCircle2,
  ShieldAlert,
  User,
  Info,
  Edit
} from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { anomalyService } from '../services/api';
import { useSidebar } from '../context/SidebarContext';
import Pagination from '../components/Pagination';
import ConfirmModal from '../components/ConfirmModal';
import StatCard from '../components/StatCard';
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
  Tooltip
} from 'recharts';
import { AnimatePresence } from 'framer-motion';

interface Anomaly {
  id: string;
  title: string;
  severity: 'Critique' | 'Moyenne' | 'Faible';
  status: 'OUVERTE' | 'EN_INVESTIGATION' | 'RESOLUE';
  relatedTest?: string;
  assignedTo?: string;
  createdAt: string;
  description?: string;
  proofImage?: string;
  release?: string;
  campaign?: string;
  author_name?: string;
  author_username?: string;
  author?: string;
  created_at: string;
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
  const { t } = useTranslation();
  const { theme } = useTheme();
  const { user } = useAuth();
  const { isOpen } = useSidebar();
  const isTester = user?.role?.toLowerCase() === 'tester';

  const location = useLocation();
  const queryParams = new URLSearchParams(location.search);
  const relatedTestFilter = queryParams.get('test');
  const highlightId = queryParams.get('highlight');

  const [query, setQuery] = useState(highlightId || relatedTestFilter || '');
  const [severityFilter, setSeverityFilter] = useState<'Tout' | Anomaly['severity']>('Tout');
  const [sortOrder, setSortOrder] = useState<'recent' | 'oldest'>('recent');
  const [data, setData] = useState<Anomaly[]>([]);
  const [isDownloading, setIsDownloading] = useState(false);
  const [isPdfDownloading, setIsPdfDownloading] = useState(false);
  const [loading, setLoading] = useState(true);

  const [currentPage, setCurrentPage] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const pageSize = 10;

  const [editingAnomaly, setEditingAnomaly] = useState<any>(null);
  const [selectedAnomaly, setSelectedAnomaly] = useState<any>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [anomalyToDelete, setAnomalyToDelete] = useState<string | null>(null);

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
        status: a.statut || 'OUVERTE',
        relatedTest: a.test_case_ref || `Test #${a.test_case}`,
        assignedTo: a.cree_par_nom || 'Non assigné',
        createdAt: a.cree_le,
        description: a.description,
        proofImage: a.preuve_image,
        release: a.project_name || 'Inconnu',
        campaign: a.campaign_title || 'Inconnue',
        author_name: a.cree_par_nom,
        created_at: a.cree_le
      }));
      setData(mappedAnomalies);
    } catch (error) {
      console.error("Failed to fetch anomalies", error);
    } finally {
      setLoading(false);
    }
  };

  const handleEditAnomaly = (an: any) => {
    setEditingAnomaly(an);
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
    setAnomalyToDelete(id);
    setIsDeleteModalOpen(true);
  };

  const confirmDeleteAnomaly = async () => {
    if (!anomalyToDelete) return;
    try {
      await anomalyService.deleteAnomaly(anomalyToDelete);
      setData(prev => prev.filter(a => a.id !== anomalyToDelete));
    } catch (error) {
      console.error("Failed to delete anomaly", error);
      alert("Erreur lors de la suppression.");
    } finally {
      setAnomalyToDelete(null);
    }
  };

  const stats = useMemo(() => {
    const total = data.length;
    const items = {
      total: data.length,
      critical: data.filter(a => a.severity === 'Critique').length,
      medium: data.filter(a => a.severity === 'Moyenne').length,
      low: data.filter(a => a.severity === 'Faible').length,
      resolved: data.filter(a => a.status === 'RESOLUE').length,
    };
    const distribution = [
      { name: 'Critique', value: items.critical, color: '#ef4444' },
      { name: 'Moyenne', value: items.medium, color: '#eab308' },
      { name: 'Faible', value: items.low, color: '#3b82f6' },
    ].filter(d => d.value > 0);

    if (distribution.length === 0) {
      distribution.push({ name: 'Aucune', value: 1, color: '#475569' });
    }

    return { total, items, distribution };
  }, [data]);

  const handleDownload = async () => {
    setIsDownloading(true);
    try {
      const header = ['ID', 'Titre', 'Gravité', 'Statut', 'Test lié', 'Release', 'Campagne', 'Créé par', 'Date', 'Description'];
      const rows = data.map((r) => [
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

      const csvContent = [header, ...rows]
        .map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(';'))
        .join('\n');

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
    <>
      <PageLayout
        title={t('anomalies.title')}
        subtitle={t('anomalies.subtitle')}
        actions={
          user?.role?.toLowerCase() !== 'manager' && (
            <button
              onClick={() => setIsCreating(true)}
              className="flex items-center gap-3 px-8 py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-[1.5rem] transition-all font-bold text-[11px] uppercase tracking-wide shadow-xl shadow-blue-600/10 active:scale-95 group"
            >
              <AlertTriangle className="w-5 h-5 transition-transform group-hover:rotate-12" />
              {t('anomalies.actions.report')}
            </button>
          )
        }
      >
        <div className="space-y-8">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <StatCard
              title={t('anomalies.stats.total')}
              value={stats.total}
              icon={ShieldAlert}
              variant="blue"
              description={t('anomalies.stats.totalDesc')}
              isLoading={loading}
            />
            <StatCard
              title={t('anomalies.stats.critical')}
              value={stats.items.critical}
              icon={AlertOctagon}
              variant="red"
              description={t('anomalies.stats.criticalDesc')}
              change={stats.items.critical > 0 ? `+${stats.items.critical}` : undefined}
              changeType="negative"
              isLoading={loading}
            />
            <StatCard
              title={t('anomalies.stats.medium')}
              value={stats.items.medium}
              icon={AlertCircle}
              variant="yellow"
              description={t('anomalies.stats.mediumDesc')}
              isLoading={loading}
            />
            <StatCard
              title={t('anomalies.stats.resolved')}
              value={stats.items.resolved}
              icon={CheckCircle2}
              variant="green"
              description={t('anomalies.stats.resolvedDesc')}
              changeType="positive"
              isLoading={loading}
            />
          </div>

          <div className="flex flex-col gap-8">
            <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-[2.5rem] overflow-hidden shadow-2xl">
              <div className="p-6 border-b border-white/5 flex flex-col xl:flex-row items-center gap-4">
                <div className="relative flex-1 group w-full">
                  <Search className="absolute left-6 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 group-focus-within:text-blue-500 transition-colors" />
                  <input
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder={t('anomalies.searchPlaceholder')}
                    className="w-full bg-white/5 border border-white/10 rounded-[1.5rem] pl-16 pr-8 py-4 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all font-medium placeholder-slate-500"
                  />
                </div>

                <div className="flex flex-wrap items-center gap-3 w-full xl:w-auto">
                  <div className="flex items-center gap-2 bg-white/5 p-1 rounded-xl border border-white/5 flex-1 xl:flex-none">
                    <div className="p-2 bg-rose-500/10 rounded-lg">
                      <Filter className="w-4 h-4 text-rose-500" />
                    </div>
                    <select
                      value={severityFilter}
                      onChange={(e) => setSeverityFilter(e.target.value as any)}
                      className="bg-transparent text-[10px] font-black uppercase tracking-widest text-white px-4 py-2 outline-none cursor-pointer appearance-none min-w-[100px]"
                    >
                      <option value="Tout" className="bg-slate-900">{t('anomalies.filters.all')}</option>
                      <option value="Critique" className="bg-slate-900">{t('anomalies.severity.critical')}</option>
                      <option value="Moyenne" className="bg-slate-900">{t('anomalies.severity.medium')}</option>
                      <option value="Faible" className="bg-slate-900">{t('anomalies.severity.low')}</option>
                    </select>
                  </div>

                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => fetchAnomalies(currentPage)}
                      className="p-4 bg-white/5 hover:bg-white/10 rounded-2xl text-slate-400 hover:text-white transition-all border border-white/5"
                      title={t('anomalies.actions.refresh')}
                    >
                      <RefreshCcw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                    </button>
                    <button
                      onClick={handleDownload}
                      disabled={isDownloading}
                      className="px-6 py-4 bg-white/5 hover:bg-white/10 rounded-2xl text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-white transition-all border border-white/5"
                    >
                      {t('anomalies.actions.exportCsv')}
                    </button>
                    <button
                      onClick={handleDownloadPdf}
                      disabled={isPdfDownloading}
                      className="px-8 py-4 bg-blue-600 hover:bg-blue-700 rounded-2xl text-[10px] font-black uppercase tracking-widest text-white transition-all shadow-xl shadow-blue-600/20"
                    >
                      {t('anomalies.actions.exportPdf')}
                    </button>
                  </div>
                </div>
              </div>

              <div className="overflow-x-auto custom-scrollbar">
                <table className="w-full text-left border-collapse table-fixed min-w-[1000px]">
                  <thead>
                    <tr className="border-b border-white/5 bg-white/[0.01]">
                      <th className="w-[35%] px-6 py-5 text-[10px] font-black text-slate-500 uppercase tracking-widest">{t('anomalies.table.anomaly')}</th>
                      <th className="w-[12%] px-6 py-5 text-[10px] font-black text-slate-500 uppercase tracking-widest">{t('anomalies.table.severity')}</th>
                      <th className="w-[20%] px-6 py-5 text-[10px] font-black text-slate-500 uppercase tracking-widest">{t('anomalies.table.context')}</th>
                      <th className="w-[20%] px-6 py-5 text-[10px] font-black text-slate-500 uppercase tracking-widest">{t('anomalies.table.reported')}</th>
                      <th className="w-[13%] px-6 py-5 text-[10px] font-black text-slate-500 uppercase tracking-widest text-right">{t('anomalies.table.actions')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {loading ? (
                      Array.from({ length: 5 }).map((_, i) => (
                        <tr key={i} className="animate-pulse">
                          <td colSpan={5} className="px-6 py-8"><div className="h-4 bg-white/5 rounded-full w-full" /></td>
                        </tr>
                      ))
                    ) : data.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="px-6 py-16 text-center text-slate-500 font-bold uppercase tracking-widest text-xs italic">
                          {t('anomalies.table.empty')}
                        </td>
                      </tr>
                    ) : data.map((an) => (
                      <tr
                        key={an.id}
                        onClick={() => setSelectedAnomaly(an)}
                        className="hover:bg-white/[0.04] transition-all duration-300 group cursor-pointer border-b border-white/5 last:border-0"
                      >
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-4">
                            <div className={`p-2.5 rounded-xl bg-white/5 border border-white/10 group-hover:scale-110 transition-transform ${severityToBadgeColor(an.severity) === 'red' ? 'text-rose-400' : severityToBadgeColor(an.severity) === 'yellow' ? 'text-amber-400' : 'text-blue-400'}`}>
                              <ShieldAlert className="w-5 h-5" />
                            </div>
                            <div className="flex flex-col gap-0.5 min-w-0">
                              <span className="text-[15px] font-bold text-white tracking-tight group-hover:text-blue-400 transition-colors truncate">
                                {an.title}
                              </span>
                              <span className="text-[11px] text-slate-500 font-medium line-clamp-1 opacity-70">
                                {an.description || t('common.noDescription')}
                              </span>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/5 rounded-full border border-white/10 group-hover:border-blue-500/30 transition-all">
                            <div className={`w-1.5 h-1.5 rounded-full ${severityToBadgeColor(an.severity) === 'red' ? 'bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.5)]' : severityToBadgeColor(an.severity) === 'yellow' ? 'bg-amber-500' : 'bg-blue-500'}`} />
                            <span className="text-[10px] font-bold text-slate-300 uppercase tracking-widest leading-none">{an.severity}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex flex-col">
                            <span className="text-[11px] font-bold text-slate-300 truncate max-w-[120px]">{an.release}</span>
                            <span className="text-[9px] text-slate-500 font-black uppercase tracking-widest truncate max-w-[120px] opacity-40">{an.campaign}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2.5">
                            <div className="w-7 h-7 rounded-full bg-blue-600/10 flex items-center justify-center text-blue-400 border border-blue-600/10 group-hover:border-blue-500/30 transition-all">
                              <User className="w-3.5 h-3.5" />
                            </div>
                            <div className="flex flex-col">
                              <span className="text-[11px] font-bold text-slate-300 truncate max-w-[100px]">{an.author_name || an.author_username || an.author}</span>
                              <span className="text-[9px] text-slate-600 font-medium">{new Date(an.created_at).toLocaleDateString()}</span>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-all duration-300 translate-x-4 group-hover:translate-x-0">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedAnomaly(an);
                              }}
                              className="p-2.5 bg-white/5 text-slate-400 hover:text-blue-400 hover:bg-blue-500/10 rounded-xl transition-all border border-white/5"
                              title="Voir détails"
                            >
                              <Info className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleEditAnomaly(an);
                              }}
                              className="p-2.5 bg-white/5 text-slate-400 hover:text-emerald-400 hover:bg-emerald-500/10 rounded-xl transition-all border border-white/5"
                              title={t('anomalies.actions.edit')}
                            >
                              <Edit className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteAnomaly(an.id);
                              }}
                              className="p-2.5 bg-white/5 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-xl transition-all border border-white/5"
                              title={t('anomalies.actions.delete')}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Insights Card - Re-designed for decluttering */}
            <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-[3rem] p-10 shadow-2xl relative overflow-hidden group">
              <div className="absolute top-0 right-0 p-12 opacity-[0.03] group-hover:opacity-[0.05] transition-opacity">
                <ShieldAlert className="w-48 h-48" />
              </div>

              <div className="flex flex-col lg:flex-row items-center gap-12 relative">
                <div className="flex-1 space-y-6">
                  <div className="inline-flex items-center gap-3 px-4 py-2 bg-blue-500/10 rounded-full border border-blue-500/20">
                    <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
                    <span className="text-[10px] font-black text-blue-400 uppercase tracking-widest">{t('anomalies.chart.title')}</span>
                  </div>
                  <h3 className="text-3xl font-black text-white uppercase tracking-tighter leading-none">
                    Analyse de <span className="text-blue-500">Distribution</span>
                  </h3>
                  <p className="text-slate-400 text-sm font-medium leading-relaxed max-w-md">
                    Visualisation dynamique des points de friction identifiés. Les anomalies critiques nécessitent une attention immédiate pour garantir la stabilité de la release.
                  </p>
                </div>

                <div className="w-full lg:w-[450px] h-[300px] bg-white/[0.02] rounded-[2.5rem] border border-white/5 p-6 backdrop-blur-md">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={stats.distribution}
                        cx="50%"
                        cy="50%"
                        innerRadius={80}
                        outerRadius={105}
                        paddingAngle={8}
                        dataKey="value"
                        stroke="none"
                      >
                        {stats.distribution.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{
                          backgroundColor: '#0f172a',
                          border: '1px solid rgba(255,255,255,0.1)',
                          borderRadius: '20px',
                          padding: '12px 20px',
                          fontSize: '10px',
                          fontWeight: 'black',
                          textTransform: 'uppercase'
                        }}
                      />
                      <Legend
                        verticalAlign="middle"
                        align="right"
                        layout="vertical"
                        iconType="circle"
                        formatter={(val) => <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest ml-3">{val}</span>}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

            <div className="pt-4">
              <Pagination
                currentPage={currentPage}
                totalItems={totalItems}
                pageSize={pageSize}
                onPageChange={handlePageChange}
                loading={loading}
              />
            </div>
          </div>
        </div>
      </PageLayout>

      <AnimatePresence>
        {selectedAnomaly && (
          <AnomalyDetailModal
            anomaly={selectedAnomaly}
            onClose={() => setSelectedAnomaly(null)}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
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
      </AnimatePresence>

      <ConfirmModal
        isOpen={isDeleteModalOpen}
        title="Supprimer l'anomalie"
        message="Êtes-vous sûr de vouloir supprimer cette anomalie ? Cette action est irréversible."
        onConfirm={confirmDeleteAnomaly}
        onCancel={() => setIsDeleteModalOpen(false)}
        confirmText="Supprimer"
        type="danger"
      />
    </>
  );
};

export default Anomalies;