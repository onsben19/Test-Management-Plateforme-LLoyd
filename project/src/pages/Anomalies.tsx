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
  MoreVertical,
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

const impactStyles: Record<string, { bg: string, text: string, border: string, dot: string }> = {
  BLOQUANTES: { bg: 'bg-rose-500/10', text: 'text-rose-600 dark:text-rose-400', border: 'border-rose-500/20', dot: 'bg-rose-500' },
  CRITIQUE: { bg: 'bg-red-500/10', text: 'text-red-600 dark:text-red-400', border: 'border-red-500/20', dot: 'bg-red-500' },
  MAJEUR: { bg: 'bg-orange-500/10', text: 'text-orange-600 dark:text-orange-400', border: 'border-orange-500/20', dot: 'bg-orange-500' },
  MINEURS: { bg: 'bg-yellow-500/10', text: 'text-yellow-600 dark:text-yellow-400', border: 'border-yellow-500/20', dot: 'bg-yellow-500' },
  FONCTIONNALITE: { bg: 'bg-blue-500/10', text: 'text-blue-600 dark:text-blue-400', border: 'border-blue-500/20', dot: 'bg-blue-500' },
  SIMPLE: { bg: 'bg-slate-500/10', text: 'text-slate-600 dark:text-slate-400', border: 'border-slate-500/20', dot: 'bg-slate-500' },
  TEXTE: { bg: 'bg-purple-500/10', text: 'text-purple-600 dark:text-purple-400', border: 'border-purple-500/20', dot: 'bg-purple-500' },
  COSMETIQUE: { bg: 'bg-pink-500/10', text: 'text-pink-600 dark:text-pink-400', border: 'border-pink-500/20', dot: 'bg-pink-500' }
};

const priorityStyles: Record<string, { bg: string, text: string, border: string }> = {
  IMMEDIATE: { bg: 'bg-red-600/10', text: 'text-red-600 dark:text-red-400', border: 'border-red-500/20' },
  URGENTE: { bg: 'bg-orange-600/10', text: 'text-orange-600 dark:text-orange-400', border: 'border-orange-500/20' },
  ELEVEE: { bg: 'bg-yellow-600/10', text: 'text-yellow-600 dark:text-yellow-400', border: 'border-yellow-500/20' },
  NORMALE: { bg: 'bg-blue-600/10', text: 'text-blue-600 dark:text-blue-400', border: 'border-blue-500/20' },
  BASSE: { bg: 'bg-slate-600/10', text: 'text-slate-600 dark:text-slate-400', border: 'border-slate-500/20' }
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
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [isImpactMenuOpen, setIsImpactMenuOpen] = useState(false);
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
              variant="blue"
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
            <div className="flex flex-col md:flex-row gap-4 items-stretch md:items-center">
              <div className="flex-1 bg-slate-50 dark:bg-white/[0.02] border border-slate-200 dark:border-white/[0.05] rounded-xl p-3 flex items-center gap-3">
                <Search className="w-4 h-4 text-slate-400 ml-2" />
                <input
                  type="text"
                  placeholder={t('anomalies.searchPlaceholder')}
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  className="flex-1 bg-transparent border-none text-sm text-foreground focus:ring-0 outline-none placeholder-slate-400"
                />
              </div>
              
              <div className="flex flex-wrap items-center gap-3">
                <div className="bg-slate-50 dark:bg-white/[0.02] border border-slate-200 dark:border-white/[0.05] rounded-xl p-1 flex gap-1">
                  <div className="relative flex items-center">
                    <button
                      className="bg-transparent text-slate-900 dark:text-white text-[10px] font-black uppercase tracking-[0.2em] pl-4 pr-10 py-2 outline-none cursor-pointer flex items-center gap-2"
                      onClick={() => setIsImpactMenuOpen(!isImpactMenuOpen)}
                    >
                      {impactFilter === 'Tout' ? 'TOUT IMPACT' : impactFilter}
                      <Filter className="w-3.5 h-3.5 text-slate-500" />
                    </button>
                    {isImpactMenuOpen && (
                      <>
                        <div className="fixed inset-0 z-10" onClick={() => setIsImpactMenuOpen(false)}></div>
                        <div className="absolute left-0 mt-2 w-48 bg-white dark:bg-slate-800 rounded-xl shadow-xl border border-slate-200 dark:border-white/5 z-20 p-2">
                          <button onClick={() => { setImpactFilter('Tout'); setIsImpactMenuOpen(false); }} className="w-full text-left px-4 py-2 text-[10px] font-black uppercase tracking-widest text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/5 rounded-lg">TOUT IMPACT</button>
                          <button onClick={() => { setImpactFilter('BLOQUANTES'); setIsImpactMenuOpen(false); }} className="w-full text-left px-4 py-2 text-[10px] font-black uppercase tracking-widest text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/5 rounded-lg">BLOQUANTES</button>
                          <button onClick={() => { setImpactFilter('CRITIQUE'); setIsImpactMenuOpen(false); }} className="w-full text-left px-4 py-2 text-[10px] font-black uppercase tracking-widest text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/5 rounded-lg">CRITIQUE</button>
                          <button onClick={() => { setImpactFilter('MAJEUR'); setIsImpactMenuOpen(false); }} className="w-full text-left px-4 py-2 text-[10px] font-black uppercase tracking-widest text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/5 rounded-lg">MAJEUR</button>
                          <button onClick={() => { setImpactFilter('MINEURS'); setIsImpactMenuOpen(false); }} className="w-full text-left px-4 py-2 text-[10px] font-black uppercase tracking-widest text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/5 rounded-lg">MINEURS</button>
                          <button onClick={() => { setImpactFilter('FONCTIONNALITE'); setIsImpactMenuOpen(false); }} className="w-full text-left px-4 py-2 text-[10px] font-black uppercase tracking-widest text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/5 rounded-lg">FONCTIONNALITÉ</button>
                        </div>
                      </>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    variant="secondary"
                    size="icon"
                    onClick={() => fetchAnomalies(currentPage)}
                    icon={RefreshCcw}
                    isLoading={loading}
                    title={t('anomalies.actions.refresh')}
                    className="rounded-xl"
                  />
                  <Button
                    variant="secondary"
                    onClick={handleDownload}
                    disabled={isDownloading}
                    isLoading={isDownloading}
                    className="rounded-xl text-[10px] font-bold"
                  >
                    CSV
                  </Button>
                  <Button
                    onClick={handleDownloadPdf}
                    disabled={isPdfDownloading}
                    isLoading={isPdfDownloading}
                    className="rounded-xl text-[10px] font-bold"
                  >
                    PDF
                  </Button>
                </div>
              </div>
            </div>

            <div className="bg-slate-900/40 border border-white/5 rounded-xl overflow-hidden shadow-2xl">

              <div className="overflow-x-auto custom-scrollbar">
                <table className="w-full text-left border-collapse table-fixed min-w-[1000px]">
                  <thead>
                    <tr className="border-b border-white/5 bg-white/[0.01]">
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
                        className="hover:bg-slate-50 dark:hover:bg-white/[0.02] transition-all duration-300 group cursor-pointer border-b border-slate-100 dark:border-white/5 last:border-0"
                      >
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-4">
                            <div className={`p-2.5 rounded-xl bg-white/5 border border-white/10 group-hover:scale-110 transition-transform ${impactStyles[an.impact]?.text || 'text-slate-400'}`}>
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
                          <div className={`inline-flex items-center gap-2 px-3 py-1 ${impactStyles[an.impact]?.bg || 'bg-slate-500/10'} rounded-lg border ${impactStyles[an.impact]?.border || 'border-slate-500/20'}`}>
                            <div className={`w-1.5 h-1.5 rounded-full ${impactStyles[an.impact]?.dot || 'bg-slate-500'}`} />
                            <span className={`text-[9px] font-black uppercase tracking-widest ${impactStyles[an.impact]?.text || 'text-slate-400'}`}>{an.impact}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className={`inline-flex items-center gap-2 px-3 py-1 ${priorityStyles[an.priority]?.bg || 'bg-slate-500/10'} rounded-lg border ${priorityStyles[an.priority]?.border || 'border-slate-500/20'}`}>
                            <span className={`text-[9px] font-black uppercase tracking-widest ${priorityStyles[an.priority]?.text || 'text-slate-400'}`}>{an.priority}</span>
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
                              className="rounded-xl"
                            />
                          ) : (
                            <div className="w-10 h-10 rounded-xl bg-white/5 border border-dashed border-white/10 flex items-center justify-center">
                              <Info className="w-4 h-4 text-slate-700" />
                            </div>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center justify-end gap-2 transition-all duration-300">
                            <Button
                              variant="secondary"
                              size="icon"
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedAnomaly(an);
                              }}
                              icon={Info}
                              title="Voir détails"
                              className="rounded-xl"
                            />
                            <div className="relative">
                              <Button
                                variant="secondary"
                                size="icon"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setOpenMenuId(openMenuId === an.id ? null : an.id);
                                }}
                                icon={MoreVertical}
                                title="Actions"
                                className="rounded-xl"
                              />
                              {openMenuId === an.id && (
                                <>
                                  <div className="fixed inset-0 z-10" onClick={() => setOpenMenuId(null)}></div>
                                  <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-slate-800 rounded-xl shadow-xl border border-slate-200 dark:border-white/5 z-20 p-2">
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleEditAnomaly(an);
                                        setOpenMenuId(null);
                                      }}
                                      className="w-full text-left px-4 py-2 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/5 rounded-lg flex items-center gap-2"
                                    >
                                      <Edit size={14} /> Modifier
                                    </button>
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleDeleteAnomaly(an.id);
                                        setOpenMenuId(null);
                                      }}
                                      className="w-full text-left px-4 py-2 text-sm text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10 rounded-lg flex items-center gap-2"
                                    >
                                      <Trash2 size={14} /> Supprimer
                                    </button>
                                  </div>
                                </>
                              )}
                            </div>
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