import React, { useEffect, useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import PageLayout from '../../components/PageLayout';
import AdminTable from '../../components/AdminTable';
import EditAnomalyModal from '../../components/EditAnomalyModal';
import { anomalyService } from '../../services/api';
import { toast } from 'react-toastify';
import { AlertTriangle, Trash2, Pencil, Filter, ShieldAlert, AlertOctagon, AlertCircle, CheckCircle2, Search, Rocket, User, Calendar, ExternalLink, XCircle, Info, Layers } from 'lucide-react';
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
        setCurrentPage(1);
    }, [searchQuery, criticalityFilter]);

    const filteredAnomalies = useMemo(() => {
        return anomalies.filter(anomaly => {
            if (highlightId && anomaly.id.toString() === highlightId) return true;

            const matchesSearch = (anomaly.titre || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
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
            header: t('adminAnomalies.table.anomaly'),
            accessor: (item: any) => (
                <div className="flex items-center gap-4 group/item">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border transition-all duration-300 group-hover:scale-110 ${item.criticite === 'CRITIQUE' ? 'bg-rose-500/10 text-rose-400 border-rose-500/20' : 'bg-amber-500/10 text-amber-400 border-amber-500/20'}`}>
                        <ShieldAlert className="w-5 h-5" />
                    </div>
                    <div className="flex flex-col gap-0.5 min-w-0">
                        <span className="text-[15px] font-bold text-white tracking-tight group-hover:text-blue-400 transition-colors truncate">{item.titre}</span>
                        <p className="text-[11px] text-slate-500 font-medium line-clamp-1 opacity-70 italic">{item.description}</p>
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
                    <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/5 rounded-full border border-white/10 group-hover:border-blue-500/30 transition-all">
                        <div className={`w-1.5 h-1.5 rounded-full ${isCritical ? 'bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.5)]' : isMedium ? 'bg-amber-500' : 'bg-blue-500'}`} />
                        <span className="text-[10px] font-bold text-slate-300 uppercase tracking-widest leading-none">
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
                            <Layers className="w-3 h-3" />
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
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-blue-600/10 border border-blue-600/10 flex items-center justify-center text-blue-400 group-hover:border-blue-500/30 transition-all">
                        <User className="w-4 h-4" />
                    </div>
                    <div className="flex flex-col">
                        <span className="text-[11px] font-bold text-slate-300 truncate max-w-[120px]">{item.cree_par_nom || 'Auditeur Système'}</span>
                        <span className="text-[9px] text-slate-500 font-medium">{new Date(item.cree_le).toLocaleDateString()}</span>
                    </div>
                </div>
            )
        },
        {
            header: t('adminAnomalies.table.date'),
            accessor: (item: any) => (
                <div className="flex flex-col">
                    <span className="text-white text-xs font-bold">{new Date(item.cree_le).toLocaleDateString(t('common.dateLocale'))}</span>
                    <span className="text-[10px] text-slate-600 font-black uppercase tracking-widest">Reported</span>
                </div>
            )
        }
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

                {/* Filters & Table Card */}
                <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-[3rem] overflow-hidden shadow-2xl">
                    <div className="p-8 border-b border-white/5 flex flex-col xl:flex-row items-center gap-6">
                        <div className="relative flex-1 w-full group">
                            <Search className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500 group-focus-within:text-blue-500 transition-colors" />
                            <input
                                type="text"
                                placeholder={t('adminAnomalies.searchPlaceholder') || "Search anomalies..."}
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full bg-white/5 border border-white/10 rounded-[1.5rem] pl-16 pr-8 py-4 text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all font-bold placeholder-slate-500"
                            />
                        </div>
                        <div className="flex flex-wrap items-center gap-4 w-full xl:w-auto">
                            <div className="flex items-center gap-3 bg-white/5 p-1.5 rounded-[1.5rem] border border-white/5 flex-1 xl:flex-none">
                                <div className="p-2 bg-rose-500/10 rounded-full border border-rose-500/20">
                                    <Filter className="w-4 h-4 text-rose-500" />
                                </div>
                                <select
                                    className="bg-transparent text-white text-[10px] font-black uppercase tracking-widest px-4 py-2 h-10 outline-none w-full cursor-pointer appearance-none"
                                    value={criticalityFilter}
                                    onChange={(e) => setCriticalityFilter(e.target.value)}
                                >
                                    <option value="ALL" className="bg-slate-900">{t('adminAnomalies.filters.all')}</option>
                                    <option value="FAIBLE" className="bg-slate-900 font-bold">{t('adminAnomalies.badges.low')}</option>
                                    <option value="MOYENNE" className="bg-slate-900 font-bold">{t('adminAnomalies.badges.medium')}</option>
                                    <option value="CRITIQUE" className="bg-slate-900 font-bold text-rose-400">{t('adminAnomalies.badges.critical')}</option>
                                </select>
                            </div>
                            <div className="flex items-center gap-3 bg-white/5 p-1.5 rounded-[1.5rem] border border-white/5 flex-1 xl:flex-none">
                                <div className="p-2 bg-blue-500/10 rounded-full border border-blue-500/20">
                                    <Calendar className="w-4 h-4 text-blue-500" />
                                </div>
                                <select
                                    className="bg-transparent text-white text-[10px] font-black uppercase tracking-widest px-4 py-2 h-10 outline-none w-full cursor-pointer appearance-none"
                                    value={sortOrder}
                                    onChange={(e) => setSortOrder(e.target.value as 'recent' | 'oldest')}
                                >
                                    <option value="recent" className="bg-slate-900 font-bold">{t('adminAnomalies.filters.recent')}</option>
                                    <option value="oldest" className="bg-slate-900 font-bold">{t('adminAnomalies.filters.oldest')}</option>
                                </select>
                            </div>
                        </div>
                    </div>

                    <AdminTable
                        columns={columns}
                        data={paginatedAnomalies}
                        isLoading={loading}
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
                            <div className="flex items-center gap-2 pr-4">
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
                                    className="p-2.5 bg-white/5 text-slate-400 hover:text-blue-400 hover:bg-blue-500/10 rounded-xl transition-all border border-white/5"
                                    title="Voir détails"
                                >
                                    <Info className="w-3.5 h-3.5" />
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
                                    className="p-2.5 bg-white/5 text-slate-400 hover:text-emerald-400 hover:bg-emerald-500/10 rounded-xl transition-all border border-white/5"
                                    title={t('adminAnomalies.actions.edit')}
                                >
                                    <Pencil className="w-3.5 h-3.5" />
                                </button>
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setAnomalyToDelete(item.id);
                                        setIsDeleteModalOpen(true);
                                    }}
                                    className="p-2.5 bg-white/5 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-xl transition-all border border-white/5"
                                    title={t('adminAnomalies.actions.delete')}
                                >
                                    <Trash2 className="w-3.5 h-3.5" />
                                </button>
                            </div>
                        )}
                    />
                </div>

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
        </PageLayout>
    );
};

export default AdminAnomalies;
