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
  Edit,
  Eye,
  Plus,
  ArrowRight,
  Sparkles,
  Layers,
  Zap,
  Clock,
  ShieldCheck,
  X
} from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { anomalyService } from '../services/api';
import { useSidebar } from '../context/SidebarContext';
import Pagination from '../components/Pagination';
import ConfirmModal from '../components/ConfirmModal';
import StatCard from '../components/StatCard';
import Button from '../components/ui/Button';
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
  Tooltip
} from 'recharts';
import { motion, AnimatePresence } from 'framer-motion';

interface Anomaly {
  id: string;
  title: string;
  impact: 'FONCTIONNALITE' | 'SIMPLE' | 'TEXTE' | 'COSMETIQUE' | 'MINEURS' | 'MAJEUR' | 'CRITIQUE' | 'BLOQUANTES';
  priority: 'NORMALE' | 'BASSE' | 'ELEVEE' | 'URGENTE' | 'IMMEDIATE';
  visibility: 'PUBLIQUE' | 'PRIVEE';
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

const impactToBadgeColor = (i: Anomaly['impact']) => {
  switch (i) {
    case 'BLOQUANTES':
    case 'CRITIQUE':
      return 'red';
    case 'MAJEUR':
      return 'orange';
    case 'MINEURS':
      return 'yellow';
    case 'FONCTIONNALITE':
      return 'blue';
    default:
      return 'gray';
  }
};

const priorityToBadgeColor = (p: Anomaly['priority']) => {
  switch (p) {
    case 'IMMEDIATE':
    case 'URGENTE':
      return 'red';
    case 'ELEVEE':
      return 'orange';
    case 'NORMALE':
      return 'blue';
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
  const [impactFilter, setImpactFilter] = useState<'Tout' | Anomaly['impact']>('Tout');
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
  const [viewingList, setViewingList] = useState<{ type: 'priorities' | 'ageing', items: any[] } | null>(null);

  React.useEffect(() => {
    fetchAnomalies(1);
    setCurrentPage(1);
  }, [query, impactFilter, sortOrder]);

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
        impact: impactFilter !== 'Tout' ? impactFilter : undefined,
        ordering: sortOrder === 'recent' ? '-cree_le' : 'cree_le'
      });
      const data = response.data.results || response.data;
      const count = response.data.count || (Array.isArray(response.data) ? response.data.length : 0);

      setTotalItems(count);

      const mappedAnomalies: Anomaly[] = data.map((a: any) => ({
        id: a.id.toString(),
        title: a.titre,
        impact: a.impact,
        priority: a.priorite,
        visibility: a.visibilite,
        status: a.statut || 'OUVERTE',
        relatedTest: a.test_case_ref || (a.test_case ? `Test #${a.test_case}` : undefined),
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
    const resolved = data.filter(a => a.status === 'RESOLUE');
    const openAnomalies = data.filter(a => a.status !== 'RESOLUE');

    // Action Priorities: Critical/Blocker and not resolved
    const actionPriorities = openAnomalies
      .filter(a => ['CRITIQUE', 'BLOQUANTES'].includes(a.impact))
      .sort((a, b) => b.impact === 'BLOQUANTES' ? 1 : -1);

    // Stability Score: Simple ratio for now: resolved / total
    const stabilityScore = total > 0 ? Math.round((resolved.length / total) * 100) : 100;

    // Ageing: Open for more than 7 days
    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const ageingAnomalies = openAnomalies.filter(a => new Date(a.created_at) < sevenDaysAgo);

    const items = {
      total,
      critical: data.filter(a => a.impact === 'CRITIQUE' || a.impact === 'BLOQUANTES').length,
      medium: data.filter(a => a.impact === 'MAJEUR' || a.impact === 'MINEURS').length,
      low: data.filter(a => ['FONCTIONNALITE', 'SIMPLE', 'TEXTE', 'COSMETIQUE'].includes(a.impact)).length,
      resolved: resolved.length,
      actionPrioritiesCount: actionPriorities.length,
      ageingAnomaliesCount: ageingAnomalies.length
    };

    const distribution = [
      { name: 'Critique/Bloquant', value: items.critical, color: '#ef4444' },
      { name: 'Majeur/Mineur', value: items.medium, color: '#eab308' },
      { name: 'Secondaire', value: items.low, color: '#3b82f6' },
    ].filter(d => d.value > 0);

    if (distribution.length === 0) {
      distribution.push({ name: 'Aucune', value: 1, color: '#475569' });
    }

    return { total, items, distribution, actionPriorities, stabilityScore, ageingAnomalies };
  }, [data]);

  const handleDownload = async () => {
    setIsDownloading(true);
    try {
      const header = ['ID', 'Titre', 'Gravité', 'Statut', 'Test lié', 'Release', 'Campagne', 'Créé par', 'Date', 'Description'];
      const rows = data.map((r) => [
        r.id,
        r.title,
        r.impact,
        r.priority,
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
        impact: impactFilter !== 'Tout' ? impactFilter : undefined,
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
            <Button
              onClick={() => setIsCreating(true)}
              icon={AlertTriangle}
              size="lg"
            >
              {t('anomalies.actions.report')}
            </Button>
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
              title="Priorités d'Action"
              value={stats.actionPriorities.length}
              icon={Zap}
              variant="red"
              description="Bloquantes à traiter d'urgence"
              isLoading={loading}
              onClick={() => setViewingList({ type: 'priorities', items: stats.actionPriorities })}
            />
            <StatCard
              title={t('anomalies.stats.resolved')}
              value={stats.items.resolved}
              icon={CheckCircle2}
              variant="green"
              description={t('anomalies.stats.resolvedDesc')}
              isLoading={loading}
            />
            <StatCard
              title="Anomalies Vieillissantes"
              value={stats.ageingAnomalies.length}
              icon={Clock}
              variant="yellow"
              description="Bugs ouverts depuis +7 jours"
              isLoading={loading}
              onClick={() => setViewingList({ type: 'ageing', items: stats.ageingAnomalies })}
            />
          </div>

          <div className="flex flex-col gap-8">
            <div className="bg-white dark:bg-white/5 backdrop-blur-xl border border-slate-200 dark:border-white/10 rounded-[2.5rem] overflow-hidden shadow-2xl">
              <div className="p-6 border-b border-slate-100 dark:border-white/5 flex flex-col xl:flex-row items-center gap-4">
                <div className="relative flex-1 group w-full">
                  <Search className="absolute left-6 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 group-focus-within:text-blue-500 transition-colors" />
                  <input
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder={t('anomalies.searchPlaceholder')}
                    className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-[1.5rem] pl-16 pr-8 py-4 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all font-medium placeholder-slate-400 dark:placeholder-slate-500"
                  />
                </div>

                <div className="flex flex-wrap items-center gap-4 w-full xl:w-auto">
                  <div className="relative group/select min-w-[200px]">
                    <div className="absolute inset-0 bg-blue-500/5 blur-xl opacity-0 group-hover/select:opacity-100 transition-opacity duration-500 rounded-full" />
                    <div className="relative bg-slate-50 dark:bg-white/5 backdrop-blur-md rounded-2xl border border-slate-200 dark:border-white/10 hover:border-blue-500/30 hover:bg-slate-100 dark:hover:bg-white/10 transition-all duration-300 overflow-hidden">
                      <select
                        value={impactFilter}
                        onChange={(e) => setImpactFilter(e.target.value as any)}
                        className="w-full bg-transparent text-slate-900 dark:text-white text-[10px] font-black uppercase tracking-[0.25em] pl-12 pr-10 py-4 outline-none cursor-pointer appearance-none relative z-10"
                      >
                        <option value="Tout" className="bg-white dark:bg-slate-950 text-slate-900 dark:text-white">TOUT IMPACT</option>
                        <option value="BLOQUANTES" className="bg-white dark:bg-slate-950 text-slate-900 dark:text-white">BLOQUANTES</option>
                        <option value="CRITIQUE" className="bg-white dark:bg-slate-950 text-slate-900 dark:text-white">CRITIQUE</option>
                        <option value="MAJEUR" className="bg-white dark:bg-slate-950 text-slate-900 dark:text-white">MAJEUR</option>
                        <option value="MINEURS" className="bg-white dark:bg-slate-950 text-slate-900 dark:text-white">MINEURS</option>
                        <option value="FONCTIONNALITE" className="bg-white dark:bg-slate-950 text-slate-900 dark:text-white">FONCTIONNALITÉ</option>
                      </select>
                      <Filter className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-blue-500/50 group-hover/select:text-blue-500 transition-colors pointer-events-none" />
                      <ArrowRight className="absolute right-5 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-600 rotate-90 pointer-events-none" />
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <Button
                      variant="secondary"
                      size="icon"
                      onClick={() => fetchAnomalies(currentPage)}
                      icon={RefreshCcw}
                      isLoading={loading}
                      title={t('anomalies.actions.refresh')}
                    />
                    <Button
                      variant="secondary"
                      onClick={handleDownload}
                      disabled={isDownloading}
                      isLoading={isDownloading}
                    >
                      {t('anomalies.actions.exportCsv')}
                    </Button>
                    <Button
                      onClick={handleDownloadPdf}
                      disabled={isPdfDownloading}
                      isLoading={isPdfDownloading}
                    >
                      {t('anomalies.actions.exportPdf')}
                    </Button>
                  </div>
                </div>
              </div>

              <div className="overflow-x-auto custom-scrollbar">
                <table className="w-full text-left border-collapse table-fixed min-w-[1000px]">
                  <thead>
                    <tr className="border-b border-slate-100 dark:border-white/5 bg-slate-50/50 dark:bg-white/[0.01]">
                      <th className="w-[30%] px-6 py-5 text-[10px] font-black text-slate-500 uppercase tracking-widest">{t('anomalies.table.anomaly')}</th>
                      <th className="w-[12%] px-6 py-5 text-[10px] font-black text-slate-500 uppercase tracking-widest">Impact</th>
                      <th className="w-[12%] px-6 py-5 text-[10px] font-black text-slate-500 uppercase tracking-widest">Priorité</th>
                      <th className="w-[10%] px-6 py-5 text-[10px] font-black text-slate-500 uppercase tracking-widest">Capture</th>
                      <th className="w-[18%] px-6 py-5 text-[10px] font-black text-slate-500 uppercase tracking-widest text-right">{t('anomalies.table.actions')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-white/5">
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
                        className="hover:bg-slate-50 dark:hover:bg-white/[0.04] transition-all duration-300 group cursor-pointer border-b border-slate-100 dark:border-white/5 last:border-0"
                      >
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-4">
                            <div className={`p-2.5 rounded-xl bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 group-hover:scale-110 transition-transform ${impactToBadgeColor(an.impact) === 'red' ? 'text-rose-600 dark:text-rose-400' : 'text-blue-600 dark:text-blue-400'}`}>
                              <ShieldAlert className="w-5 h-5" />
                            </div>
                            <div className="flex flex-col gap-0.5 min-w-0">
                              <span className="text-[14px] font-bold text-slate-900 dark:text-white tracking-tight group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors truncate">
                                <span className="text-blue-500/50 mr-2 font-mono text-[11px]">#{an.id}</span>
                                {an.title}
                              </span>
                              <div className="flex items-center gap-2">
                                <span className="text-[9px] font-black uppercase text-slate-500 tracking-widest">{an.release}</span>
                                <span className="w-1 h-1 rounded-full bg-slate-700" />
                                <span className="text-[9px] font-medium text-slate-600 truncate">{an.author_name}</span>
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className={`inline-flex items-center gap-2 px-3 py-1 bg-${impactToBadgeColor(an.impact)}-500/10 rounded-full border border-${impactToBadgeColor(an.impact)}-500/20`}>
                            <div className={`w-1.5 h-1.5 rounded-full bg-${impactToBadgeColor(an.impact)}-500`} />
                            <span className={`text-[9px] font-black uppercase tracking-widest text-${impactToBadgeColor(an.impact)}-400`}>{an.impact}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className={`inline-flex items-center gap-2 px-3 py-1 bg-${priorityToBadgeColor(an.priority)}-500/10 rounded-full border border-${priorityToBadgeColor(an.priority)}-500/20`}>
                            <span className={`text-[9px] font-black uppercase tracking-widest text-${priorityToBadgeColor(an.priority)}-400`}>{an.priority}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          {an.proofImage ? (
                            <Button
                              variant="secondary"
                              size="icon"
                              onClick={(e) => {
                                e.stopPropagation();
                                window.open(an.proofImage, '_blank');
                              }}
                              icon={Eye}
                              title="Voir la capture"
                            />
                          ) : (
                            <div className="w-12 h-12 rounded-lg bg-white/5 border border-dashed border-white/10 flex items-center justify-center">
                              <Info className="w-4 h-4 text-slate-700" />
                            </div>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-all duration-300 translate-x-4 group-hover:translate-x-0">
                            <Button
                              variant="secondary"
                              size="icon"
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedAnomaly(an);
                              }}
                              icon={Info}
                              title="Voir détails"
                            />
                            <Button
                              variant="secondary"
                              size="icon"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleEditAnomaly(an);
                              }}
                              icon={Edit}
                              title={t('anomalies.actions.edit')}
                            />
                            <Button
                              variant="danger"
                              size="icon"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteAnomaly(an.id);
                              }}
                              icon={Trash2}
                              title={t('anomalies.actions.delete')}
                            />
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Insights Card - Re-designed for decluttering */}
            <div className="bg-white dark:bg-white/5 backdrop-blur-xl border border-slate-200 dark:border-white/10 rounded-[3rem] p-10 shadow-2xl relative overflow-hidden group">
              <div className="absolute top-0 right-0 p-12 opacity-[0.03] group-hover:opacity-[0.05] transition-opacity">
                <ShieldAlert className="w-48 h-48" />
              </div>

              <div className="flex flex-col lg:flex-row items-center gap-12 relative">
                <div className="flex-1 space-y-6">
                  <div className="inline-flex items-center gap-3 px-4 py-2 bg-blue-50 dark:bg-blue-500/10 rounded-full border border-blue-100 dark:border-blue-500/20">
                    <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
                    <span className="text-[10px] font-black text-blue-600 dark:text-blue-400 uppercase tracking-widest">{t('anomalies.chart.title')}</span>
                  </div>
                  <h3 className="text-3xl font-black text-slate-900 dark:text-white uppercase tracking-tighter leading-none">
                    Analyse de <span className="text-blue-500">Distribution</span>
                  </h3>
                  <p className="text-slate-600 dark:text-slate-400 text-sm font-medium leading-relaxed max-w-md">
                    Visualisation dynamique des points de friction identifiés. Les anomalies critiques nécessitent une attention immédiate pour garantir la stabilité de la release.
                  </p>
                </div>

                <div className="w-full lg:w-[450px] h-[300px] bg-white dark:bg-white/[0.02] rounded-[2.5rem] border border-slate-100 dark:border-white/5 p-6 shadow-xl dark:shadow-none backdrop-blur-md">
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

      <AnimatePresence>
        {viewingList && (
          <div className="fixed inset-0 z-[2100] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setViewingList(null)}
              className="absolute inset-0 bg-slate-950/80 backdrop-blur-xl"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-2xl bg-[#0f172a] border border-white/10 rounded-[3rem] shadow-2xl overflow-hidden"
              onClick={e => e.stopPropagation()}
            >
              <div className="p-8 border-b border-white/5 flex items-center justify-between bg-white/[0.02]">
                <div className="flex items-center gap-4">
                  <div className={`p-3 rounded-2xl ${viewingList.type === 'priorities' ? 'bg-rose-500/10 text-rose-400' : 'bg-orange-500/10 text-orange-400'}`}>
                    {viewingList.type === 'priorities' ? <Zap /> : <Clock />}
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-white uppercase tracking-tight">
                      {viewingList.type === 'priorities' ? 'Priorités d\'Action' : 'Bugs Vieillissants (+7j)'}
                    </h3>
                    <p className="text-slate-500 text-xs font-medium uppercase tracking-widest">
                      {viewingList.items.length} anomalies identifiées
                    </p>
                  </div>
                </div>
                <Button
                  variant="secondary"
                  size="icon"
                  onClick={() => setViewingList(null)}
                  icon={X}
                />
              </div>

              <div className="p-8 max-h-[60vh] overflow-y-auto custom-scrollbar">
                <div className="space-y-4">
                  {viewingList.items.map((item, idx) => (
                    <div
                      key={idx}
                      className="group p-6 bg-white/5 border border-white/5 rounded-3xl hover:border-blue-500/30 transition-all flex flex-col gap-4"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-black text-sm ${viewingList.type === 'priorities' ? 'bg-rose-500/10 text-rose-500 border border-rose-500/20' : 'bg-orange-500/10 text-orange-500 border border-orange-500/20'}`}>
                            #{idx + 1}
                          </div>
                          <div>
                            <p className="text-lg font-black text-white tracking-tight">{item.title}</p>
                            <p className="text-[10px] font-black uppercase text-slate-500 tracking-widest mt-0.5">
                              Impact: {item.impact} • Assigné à: {item.assignedTo}
                            </p>
                          </div>
                        </div>
                        <div className="p-2 bg-blue-500/10 rounded-xl text-blue-400">
                          <Info size={16} />
                        </div>
                      </div>
                    </div>
                  ))}
                  {viewingList.items.length === 0 && (
                    <div className="py-12 text-center text-slate-500 font-bold uppercase tracking-widest text-xs">
                      Aucune donnée disponible
                    </div>
                  )}
                </div>
              </div>

              <div className="p-6 bg-white/[0.02] border-t border-white/5 flex justify-end">
                <Button
                  variant="secondary"
                  onClick={() => setViewingList(null)}
                >
                  Fermer
                </Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
};

export default Anomalies;