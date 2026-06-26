import React, { useEffect, useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import PageLayout from '../../components/PageLayout';
import AdminTable from '../../components/AdminTable';
import EditAnomalyModal from '../../components/EditAnomalyModal';
import { anomalyService } from '../../services/api';
import { toast } from 'react-toastify';
import { AlertTriangle, Trash2, Pencil, Filter, ShieldAlert, AlertOctagon, AlertCircle, CheckCircle2, Search, Rocket, User, Calendar, ExternalLink, XCircle, Info, Layers, Eye } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import StatCard from '../../components/StatCard';
import Pagination from '../../components/Pagination';
import { motion, AnimatePresence } from 'framer-motion';
import ConfirmModal from '../../components/ConfirmModal';
import AnomalyDetailModal from '../../components/AnomalyDetailModal';

const AdminAnomalies = () => {
    const { t } = useTranslation();
    const location = useLocation();
    const queryParams = new URLSearchParams(location.search);
    const highlightId = queryParams.get('highlight');

    const [anomalies, setAnomalies] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [criticalityFilter, setCriticalityFilter] = useState('ALL');
    const [sortOrder, setSortOrder] = useState<'recent' | 'oldest'>('recent');
    const [currentPage, setCurrentPage] = useState(1);
    const pageSize = 12;

    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [anomalyToDelete, setAnomalyToDelete] = useState<string | null>(null);
    const [editingAnomaly, setEditingAnomaly] = useState<any>(null);
    const [selectedAnomaly, setSelectedAnomaly] = useState<any>(null);
    const [viewImage, setViewImage] = useState<string | null>(null);

    const fetchAnomalies = async () => {
        try {
            setLoading(true);
            const response = await anomalyService.getAnomalies();
            const data = response.data.results || response.data;
            const sortedData = data.sort((a: any, b: any) =>
                new Date(b.cree_le).getTime() - new Date(a.cree_le).getTime()
            );
            setAnomalies(sortedData);
        } catch (error) {
            console.error("Failed to fetch anomalies", error);
            toast.error(t('adminAnomalies.toasts.fetchError'));
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchAnomalies();
    }, []);

    useEffect(() => {
        if (!highlightId || anomalies.length === 0) return;
        const found = anomalies.find((a) => a.id.toString() === highlightId);
        if (found) {
            setSelectedAnomaly(found);
            return;
        }
        anomalyService.getAnomaly(highlightId)
            .then((res) => setSelectedAnomaly(res.data))
            .catch(() => {});
    }, [highlightId, anomalies]);

    useEffect(() => {
        setCurrentPage(1);
    }, [searchQuery, criticalityFilter]);

    const filteredAnomalies = useMemo(() => {
        return anomalies.filter(anomaly => {
            if (highlightId && anomaly.id.toString() === highlightId) return true;

            const matchesSearch = !searchQuery.trim() ||
                anomaly.id.toString() === searchQuery.trim().replace(/^#/, '') ||
                (anomaly.titre || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
                (anomaly.description || '').toLowerCase().includes(searchQuery.toLowerCase());
            const matchesCriticality = criticalityFilter === 'ALL' || anomaly.criticite === criticalityFilter;
            return matchesSearch && matchesCriticality;
        }).sort((a, b) => {
            const dateA = new Date(a.cree_le).getTime();
            const dateB = new Date(b.cree_le).getTime();
            return sortOrder === 'recent' ? dateB - dateA : dateA - dateB;
        });
    }, [anomalies, searchQuery, criticalityFilter, sortOrder, highlightId]);

    const paginatedAnomalies = useMemo(() => {
        const startIndex = (currentPage - 1) * pageSize;
        return filteredAnomalies.slice(startIndex, startIndex + pageSize);
    }, [filteredAnomalies, currentPage, pageSize]);

    const stats = useMemo(() => {
        const total = anomalies.length;
        const critical = anomalies.filter(a => a.criticite === 'CRITIQUE').length;
        const medium = anomalies.filter(a => a.criticite === 'MOYENNE').length;
        const recent = anomalies.filter(a => {
            const diff = new Date().getTime() - new Date(a.cree_le).getTime();
            return diff < (24 * 60 * 60 * 1000);
        }).length;

        return { total, critical, medium, recent };
    }, [anomalies]);

    const handleUpdate = async (id: string | null, updates: FormData) => {
        if (!id) return;
        try {
            await anomalyService.updateAnomaly(id, updates);
            toast.success(t('adminAnomalies.toasts.updateSuccess'));
            setEditingAnomaly(null);
            fetchAnomalies();
        } catch (error) {
            console.error("Update failed", error);
            toast.error(t('adminAnomalies.toasts.updateError'));
        }
    };

    const DescriptionCell = ({ text }: { text: string }) => {
        const [isExpanded, setIsExpanded] = useState(false);
        const shouldShowButton = text && text.length > 80;
        const displayText = isExpanded ? text : (text?.slice(0, 80) + (shouldShowButton ? '...' : ''));

        if (!text) return <span className="text-slate-600 font-bold text-[9px] uppercase tracking-widest italic opacity-40">Aucune description</span>;

        return (
            <div className="flex flex-col gap-1 min-w-0">
                <p className="text-[11px] text-slate-500 font-medium leading-relaxed transition-all">
                    {displayText}
                </p>
                {shouldShowButton && (
                    <button
                        onClick={(e) => { e.stopPropagation(); setIsExpanded(!isExpanded); }}
                        className="text-[9px] font-black text-blue-500 hover:text-blue-400 uppercase tracking-widest text-left w-fit transition-colors"
                    >
                        {isExpanded ? 'Réduire' : 'Lire la suite'}
                    </button>
                )}
            </div>
        );
    };

    const confirmDelete = async () => {
        if (!anomalyToDelete) return;
        try {
            await anomalyService.deleteAnomaly(anomalyToDelete);
            toast.success(t('adminAnomalies.toasts.deleteSuccess'));
            fetchAnomalies();
        } catch (error) {
            toast.error(t('adminAnomalies.toasts.deleteError'));
        } finally {
            setIsDeleteModalOpen(false);
            setAnomalyToDelete(null);
        }
    };

    const columns = [
        {
            header: 'ID',
            accessor: (item: any) => <span className="font-mono text-[10px] text-slate-500">{String(item.id).substring(0, 8)}</span>
        },
        {
            header: t('adminAnomalies.table.anomaly'),
            accessor: (item: any) => (
                <div className="flex items-center group/item">
                    <div className="flex flex-col gap-1 min-w-0">
                        <span className="text-[15px] font-bold text-slate-900 dark:text-white tracking-tight group-hover:text-blue-400 transition-colors truncate">{item.titre}</span>
                        <DescriptionCell text={item.description} />
                    </div>
                </div>
            )
        },
        {
            header: t('adminAnomalies.table.severity'),
            accessor: (item: any) => {
                const level = item.criticite;
                const isCritical = level === 'CRITIQUE';
                const isMedium = level === 'MOYENNE';

                return (
                    <div className="inline-flex items-center gap-2 px-3 py-1 bg-slate-100 dark:bg-white/5 rounded-full border border-slate-300 dark:border-slate-200 dark:border-white/10 group-hover:border-blue-500/30 transition-all">
                        <div className={`w-1.5 h-1.5 rounded-full ${isCritical ? 'bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.5)]' : isMedium ? 'bg-amber-500' : 'bg-blue-500'}`} />
                        <span className="text-[10px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-widest leading-none">
                            {isCritical ? t('adminAnomalies.badges.critical') : isMedium ? t('adminAnomalies.badges.medium') : t('adminAnomalies.badges.low')}
                        </span>
                    </div>
                );
            }
        },
        {
            header: t('adminAnomalies.table.relatedTest'),
            accessor: (item: any) => (
                <div className="flex flex-col gap-0.5">
                    {item.test_case_ref ? (
                        <div className="inline-flex items-center gap-2 px-2 py-0.5 bg-blue-500/5 text-blue-400 rounded-md border border-blue-500/10 text-[10px] font-bold tracking-tight">
                            {item.test_case_ref}
                        </div>
                    ) : (
                        <span className="text-slate-600 text-[10px] font-black tracking-widest uppercase opacity-40">- Non lié -</span>
                    )}
                </div>
            )
        },
        {
            header: t('adminAnomalies.table.createdBy'),
            accessor: (item: any) => (
                <div className="flex flex-col">
                    <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300 truncate max-w-[120px]">{item.cree_par_nom || 'Système'}</span>
                    <span className="text-[9px] text-slate-600 font-bold uppercase tracking-widest italic opacity-60">Créateur</span>
                </div>
            )
        },
         {
            header: t('adminAnomalies.table.date'),
            accessor: (item: any) => (
                <div className="flex flex-col gap-0.5">
                    <span className="text-slate-700 dark:text-slate-300 text-[11px] font-bold tracking-tight">{new Date(item.cree_le).toLocaleDateString(t('common.dateLocale') || 'fr-FR')}</span>
                    <span className="text-[9px] text-slate-600 font-bold uppercase tracking-widest italic opacity-60">Enregistré</span>
                </div>
            )
        },
    ];

    return (
        <PageLayout
            title={t('adminAnomalies.title')}
            subtitle="AUDIT & ANOMALY TRACKING"
        >
            <div className="space-y-10">
                {/* Stats Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                    <StatCard
                        title={t('adminAnomalies.stats.total')}
                        value={stats.total}
                        icon={ShieldAlert}
                        variant="blue"
                        description={t('adminAnomalies.stats.totalDesc')}
                        isLoading={loading}
                    />
                    <StatCard
                        title={t('adminAnomalies.stats.critical')}
                        value={stats.critical}
                        icon={AlertOctagon}
                        variant="red"
                        description={t('adminAnomalies.stats.criticalDesc')}
                        change={stats.critical > 0 ? `+${stats.critical}` : undefined}
                        changeType="negative"
                        isLoading={loading}
                    />
                    <StatCard
                        title={t('adminAnomalies.stats.medium')}
                        value={stats.medium}
                        icon={AlertCircle}
                        variant="yellow"
                        description={t('adminAnomalies.stats.mediumDesc')}
                        isLoading={loading}
                    />
                    <StatCard
                        title={t('adminAnomalies.stats.recent')}
                        value={stats.recent}
                        icon={CheckCircle2}
                        variant="green"
                        description={t('adminAnomalies.stats.recentDesc')}
                        changeType="positive"
                        isLoading={loading}
                    />
                </div>

                <AdminTable
                    columns={columns}
                    data={paginatedAnomalies}
                    isLoading={loading}
                    searchable
                    onSearch={setSearchQuery}
                    filters={
                        <div className="flex flex-wrap items-center gap-4">
                            <select
                                className="bg-transparent text-slate-900 dark:text-white text-[10px] font-black uppercase tracking-widest px-4 py-2 h-10 outline-none w-full cursor-pointer appearance-none hover:bg-slate-100 dark:bg-white/5 transition-all rounded-xl"
                                value={criticalityFilter}
                                onChange={(e) => setCriticalityFilter(e.target.value)}
                            >
                                <option value="ALL" className="bg-white dark:bg-slate-900">{t('adminAnomalies.filters.all')}</option>
                                <option value="FAIBLE" className="bg-white dark:bg-slate-900">{t('adminAnomalies.badges.low')}</option>
                                <option value="MOYENNE" className="bg-white dark:bg-slate-900">{t('adminAnomalies.badges.medium')}</option>
                                <option value="CRITIQUE" className="bg-white dark:bg-slate-900">{t('adminAnomalies.badges.critical')}</option>
                            </select>
                            <select
                                className="bg-transparent text-slate-900 dark:text-white text-[10px] font-black uppercase tracking-widest px-4 py-2 h-10 outline-none w-full cursor-pointer appearance-none hover:bg-slate-100 dark:bg-white/5 transition-all rounded-xl"
                                value={sortOrder}
                                onChange={(e) => setSortOrder(e.target.value as 'recent' | 'oldest')}
                            >
                                <option value="recent" className="bg-white dark:bg-slate-900">RÉCENTS</option>
                                <option value="oldest" className="bg-white dark:bg-slate-900">ANCIENS</option>
                            </select>
                        </div>
                    }
                    variant="transparent"
                    onRowClick={(item) => setSelectedAnomaly({
                        ...item,
                        title: item.titre,
                        severity: item.criticite === 'CRITIQUE' ? 'Critique' : item.criticite === 'MOYENNE' ? 'Moyenne' : 'Faible',
                        author_name: item.cree_par_nom,
                        created_at: item.cree_le,
                        campaign: item.campaign_title || 'N/A',
                        release: item.project_name || 'N/A',
                        relatedTest: item.test_case_ref
                    })}
                    actions={(item) => (
                        <div className="flex items-center gap-4 pr-4">
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setSelectedAnomaly({
                                        ...item,
                                        title: item.titre,
                                        severity: item.criticite === 'CRITIQUE' ? 'Critique' : item.criticite === 'MOYENNE' ? 'Moyenne' : 'Faible',
                                        author_name: item.cree_par_nom,
                                        created_at: item.cree_le,
                                        campaign: item.campaign_title || 'N/A',
                                        release: item.project_name || 'N/A',
                                        relatedTest: item.test_case_ref
                                    });
                                }}
                                className="text-slate-400 hover:text-blue-400 transition-all"
                                title="Voir détails"
                            >
                                <Info className="w-4 h-4" />
                            </button>
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    const mapSeverity = (s: string) => {
                                        if (s === 'CRITIQUE' || s === 'URGENT' || s === 'HAUTE') return 'Critique';
                                        if (s === 'MOYENNE') return 'Moyenne';
                                        return 'Faible';
                                    };
                                    setEditingAnomaly({
                                        ...item,
                                        id: item.id.toString(),
                                        title: item.titre,
                                        severity: mapSeverity(item.criticite),
                                        status: t('adminAnomalies.badges.open'),
                                        relatedTest: item.test_case_ref
                                    });
                                }}
                                className="text-slate-400 hover:text-emerald-400 transition-all"
                                title={t('adminAnomalies.actions.edit')}
                            >
                                <Pencil className="w-4 h-4" />
                            </button>
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setAnomalyToDelete(item.id);
                                    setIsDeleteModalOpen(true);
                                }}
                                className="text-slate-400 hover:text-rose-400 transition-all"
                                title={t('adminAnomalies.actions.delete')}
                            >
                                <Trash2 className="w-4 h-4" />
                            </button>
                        </div>
                    )}
                />

                <div className="pt-6">
                    <Pagination
                        currentPage={currentPage}
                        totalItems={filteredAnomalies.length}
                        pageSize={pageSize}
                        onPageChange={setCurrentPage}
                        loading={loading}
                    />
                </div>
            </div>

            {/* Modals */}
            <AnimatePresence>
                {selectedAnomaly && (
                    <AnomalyDetailModal
                        anomaly={selectedAnomaly}
                        onClose={() => setSelectedAnomaly(null)}
                    />
                )}
            </AnimatePresence>

            <AnimatePresence>
                {editingAnomaly && (
                    <EditAnomalyModal
                        anomaly={editingAnomaly}
                        onClose={() => setEditingAnomaly(null)}
                        onSave={handleUpdate}
                    />
                )}
            </AnimatePresence>

            <ConfirmModal
                isOpen={isDeleteModalOpen}
                title={t('adminAnomalies.modal.deleteTitle')}
                message={t('adminAnomalies.modal.deleteConfirm')}
                onConfirm={confirmDelete}
                onCancel={() => setIsDeleteModalOpen(false)}
                confirmText={t('adminAnomalies.modal.delete')}
                type="danger"
            />

            {/* Image Preview Modal */}
            <AnimatePresence>
                {viewImage && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/90 backdrop-blur-md">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.9 }}
                            className="relative max-w-5xl w-full h-[85vh] bg-slate-50 dark:bg-[#0b0e14] border border-slate-200 dark:border-white/5 rounded-[2.5rem] overflow-hidden flex flex-col shadow-2xl"
                        >
                            <div className="p-6 border-b border-slate-200 dark:border-white/5 flex justify-between items-center bg-slate-50 dark:bg-white/[0.01]">
                                <div className="flex items-center gap-4">
                                    <div className="p-2 bg-blue-500/10 rounded-xl border border-blue-500/20">
                                        <Eye className="w-5 h-5 text-blue-400" />
                                    </div>
                                    <div>
                                        <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-tighter">Preuve d'exécution</h3>
                                        <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Capture d'écran de l'anomalie</p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => setViewImage(null)}
                                    className="p-2.5 hover:bg-slate-100 dark:bg-white/5 rounded-xl text-slate-400 hover:text-slate-900 dark:hover:text-white transition-all"
                                >
                                    <XCircle className="w-6 h-6" />
                                </button>
                            </div>
                            <div className="flex-1 bg-slate-100 dark:bg-slate-100 dark:bg-black/40 p-4 overflow-hidden flex items-center justify-center group/img">
                                <img
                                    src={viewImage}
                                    alt="Preuve"
                                    className="max-w-full max-h-full object-contain rounded-xl shadow-2xl group-hover/img:scale-[1.02] transition-transform duration-700"
                                />
                            </div>
                            <div className="p-6 border-t border-slate-200 dark:border-white/5 bg-slate-50 dark:bg-white/[0.01] flex justify-center">
                                <a
                                    href={viewImage}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-[10px] font-black text-blue-500 hover:text-blue-400 uppercase tracking-[0.2em] transition-all"
                                >
                                    Voir l'image originale
                                </a>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </PageLayout>
    );
};

export default AdminAnomalies;
