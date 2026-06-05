import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import PageLayout from '../components/PageLayout';
import { Layers, Calendar, User, BookOpen, Plus, MoreVertical, ArrowRight, Edit, Trash2, Activity, Search, Sparkles, Filter, ChevronRight, Save } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { projectService, businessProjectService } from '../services/api';
import { toast } from 'react-toastify';
import Pagination from '../components/Pagination';
import { useAuth } from '../context/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';
import ConfirmModal from '../components/ConfirmModal';
import ReadinessGauge from '../components/ReadinessGauge';
import ReadinessDetailModal from '../components/ReadinessDetailModal';
import { aiService } from '../services/api';
import { Award, Info, XCircle } from 'lucide-react';
import Button from '../components/ui/Button';

const ReleaseManager = () => {
    const { t, i18n } = useTranslation();
    const navigate = useNavigate();
    const location = useLocation();
    const { user } = useAuth();
    const isAdminOrManager = ['ADMIN', 'MANAGER'].includes(user?.role?.toUpperCase() || '');
    const { businessProjectId, businessProjectName } = (location.state as any) || {};

    const [releases, setReleases] = useState<any[]>([]);
    const [businessProjects, setBusinessProjects] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeReleaseType, setActiveReleaseType] = useState<'ALL' | 'RECETTE' | 'PREPROD'>('ALL');
    const [searchQuery, setSearchQuery] = useState('');
    const [sortOrder, setSortOrder] = useState<'newest' | 'oldest'>('newest');
    const [readinessScores, setReadinessScores] = useState<Record<string, any>>({});
    const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
    const [selectedReadinessData, setSelectedReadinessData] = useState<any>(null);
    const [selectedEntityName, setSelectedEntityName] = useState("");

    const [currentPage, setCurrentPage] = useState(1);
    const [totalItems, setTotalItems] = useState(0);
    const pageSize = 12;

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingRelease, setEditingRelease] = useState<any>(null);
    const [newRelease, setNewRelease] = useState({
        name: '',
        description: '',
        status: 'ACTIVE',
        business_project: businessProjectId || '',
        release_type: 'RECETTE'
    });

    const [openMenuId, setOpenMenuId] = useState<string | null>(null);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [releaseToDelete, setReleaseToDelete] = useState<string | null>(null);

    const fetchBusinessProjects = async () => {
        try {
            const res = await businessProjectService.getBusinessProjects();
            setBusinessProjects(res.data.results || res.data);
        } catch (e) {
            console.error("Failed to fetch business projects", e);
        }
    };

    const fetchReleases = async (page = currentPage) => {
        try {
            setLoading(true);
            const params: any = {
                page,
                search: searchQuery,
                ordering: sortOrder === 'newest' ? '-created_at' : 'created_at'
            };
            if (businessProjectId) {
                params.business_project = businessProjectId;
            }
            if (activeReleaseType !== 'ALL') {
                params.release_type = activeReleaseType;
            }
            const response = await projectService.getProjects(params);
            if (response.data.results) {
                setReleases(response.data.results);
                setTotalItems(response.data.count);

                // Fetch readiness scores for each release/project
                response.data.results.forEach(async (project: any) => {
                    try {
                        const scoreRes = await aiService.getReadinessScoreByProject(project.id);
                        setReadinessScores(prev => ({ ...prev, [project.id]: scoreRes.data }));
                    } catch (e) {
                        console.warn(`Could not fetch score for project ${project.id}`);
                    }
                });
            } else {
                setReleases(response.data);
                setTotalItems(response.data.length);

                response.data.forEach(async (project: any) => {
                    try {
                        const scoreRes = await aiService.getReadinessScoreByProject(project.id);
                        setReadinessScores(prev => ({ ...prev, [project.id]: scoreRes.data }));
                    } catch (e) {
                        console.warn(`Could not fetch score for project ${project.id}`);
                    }
                });
            }
        } catch (error) {
            console.error("Failed to fetch releases", error);
            toast.error(t('releaseManager.toasts.fetchError'));
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchBusinessProjects();
        fetchReleases(1);
        setCurrentPage(1);
    }, [searchQuery, sortOrder, activeReleaseType]);

    const handlePageChange = (page: number) => {
        setCurrentPage(page);
        fetchReleases(page);
    };

    const resetForm = () => {
        setNewRelease({
            name: '',
            description: '',
            status: 'ACTIVE',
            business_project: businessProjectId || '',
            release_type: 'RECETTE'
        });
        setEditingRelease(null);
        setIsModalOpen(false);
    };

    const handleSaveRelease = async () => {
        if (!newRelease.name) return;
        try {
            if (editingRelease) {
                await projectService.updateProject(editingRelease.id, newRelease);
                toast.success(t('releaseManager.toasts.updated'));
            } else {
                await projectService.createProject(newRelease);
                toast.success(t('releaseManager.toasts.created'));
            }
            resetForm();
            fetchReleases(currentPage);
        } catch {
            toast.error(t('releaseManager.toasts.saveError'));
        }
    };

    const handleEditClick = (release: any) => {
        setEditingRelease(release);
        setNewRelease({
            name: release.name,
            description: release.description,
            status: release.status,
            business_project: release.business_project || '',
            release_type: release.release_type || 'RECETTE'
        });
        setIsModalOpen(true);
        setOpenMenuId(null);
    };

    const confirmDelete = async () => {
        if (!releaseToDelete) return;
        try {
            await projectService.deleteProject(releaseToDelete);
            toast.success(t('releaseManager.toasts.deleted'));
            fetchReleases(currentPage);
        } catch {
            toast.error(t('releaseManager.toasts.deleteError'));
        } finally {
            setReleaseToDelete(null);
            setIsDeleteModalOpen(false);
        }
    };

    const handleStatusChange = async (release: any, newStatus: string) => {
        try {
            await projectService.updateProject(release.id, { status: newStatus });
            toast.success(t('releaseManager.toasts.statusUpdated', { status: getStatusLabel(newStatus) }));
            fetchReleases(currentPage);
        } catch {
            toast.error(t('releaseManager.toasts.statusError'));
        }
        setOpenMenuId(null);
    };

    const getStatusStyles = (status: string) => {
        switch (status) {
            case 'ACTIVE': return 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20';
            case 'COMPLETED': return 'bg-rose-500/10 text-rose-500 border-rose-500/20';
            default: return 'bg-slate-500/10 text-slate-400 border-slate-500/20';
        }
    };

    const getStatusLabel = (status: string) => {
        switch (status) {
            case 'ACTIVE': return t('releaseManager.status.active');
            case 'COMPLETED': return t('releaseManager.status.completed');
            default: return status;
        }
    };

    const formatDate = (dateString: string) => {
        if (!dateString) return '';
        const locale = i18n.language === 'fr' ? 'fr-FR' : 'en-US';
        return new Date(dateString).toLocaleDateString(locale, { day: 'numeric', month: 'short', year: 'numeric' });
    };

    const HeaderActions = isAdminOrManager && (
        <Button
            onClick={() => { resetForm(); setIsModalOpen(true); }}
            icon={Plus}
        >
            {t('releaseManager.newRelease')}
        </Button>
    );

    return (
        <PageLayout
            title={businessProjectName ? `Releases: ${businessProjectName}` : t('releaseManager.title')}
            subtitle="L'ENSEMBLE DES RELEASES"
            actions={HeaderActions}
        >
            <div className="space-y-10">
                {/* Search & Sort Toolbar */}
                <div className="flex flex-col md:flex-row gap-4 items-stretch md:items-center">
                    {/* Search Bar */}
                    <div className="flex-1 bg-slate-50 dark:bg-white/[0.02] border border-slate-200 dark:border-white/[0.05] rounded-xl p-3 flex items-center gap-3">
                        <Search className="w-4 h-4 text-slate-400 ml-2" />
                        <input
                            type="text"
                            placeholder={t('releaseManager.searchPlaceholder')}
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="flex-1 bg-transparent border-none text-sm text-white focus:ring-0 outline-none placeholder-slate-400"
                        />
                    </div>

                    {/* Sort Select */}
                    <div className="bg-slate-50 dark:bg-white/[0.02] border border-slate-200 dark:border-white/[0.05] rounded-xl p-3 flex items-center gap-3">
                        <Filter className="w-4 h-4 text-slate-400 ml-2" />
                        <select
                            value={sortOrder}
                            onChange={(e) => setSortOrder(e.target.value as 'newest' | 'oldest')}
                            className="bg-transparent text-white text-xs font-bold outline-none cursor-pointer appearance-none uppercase tracking-widest"
                        >
                            <option value="newest" className="bg-slate-900 text-white">{t('releaseManager.sort.newest')}</option>
                            <option value="oldest" className="bg-slate-900 text-white">{t('releaseManager.sort.oldest')}</option>
                        </select>
                    </div>

                    {/* Release Type Tabs */}
                    <div className="bg-slate-50 dark:bg-white/[0.02] border border-slate-200 dark:border-white/[0.05] rounded-xl p-1 flex gap-1">
                        {[
                            { id: 'ALL', label: 'Toutes' },
                            { id: 'RECETTE', label: 'Recette' },
                            { id: 'PREPROD', label: 'Preprod' }
                        ].map(tab => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveReleaseType(tab.id as any)}
                                className={`px-4 py-2 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all ${activeReleaseType === tab.id
                                    ? 'bg-blue-500 text-white'
                                    : 'text-slate-400 hover:text-white hover:bg-white/5'
                                    }`}
                            >
                                {tab.label}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Grid of Releases */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-8">
                    <AnimatePresence mode="popLayout">
                        {loading && releases.length === 0 ? (
                            [1, 2, 3, 4].map(i => (
                                <div key={i} className="h-64 bg-white/5 rounded-[2.5rem] animate-pulse border border-white/10" />
                            ))
                        ) : releases.length === 0 ? (
                            <div className="col-span-full py-40 text-center opacity-30">
                                <Sparkles className="w-16 h-16 mx-auto mb-6 text-slate-500" />
                                <h3 className="font-bold text-sm text-slate-500">{t('releaseManager.card.noReleases')}</h3>
                            </div>
                        ) : (
                            releases.map((release, idx) => (
                                <motion.div
                                    key={release.id}
                                    initial={{ opacity: 0, y: 30 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ duration: 0.5, delay: idx * 0.05 }}
                                    className="group relative bg-[#0f1729]/80 backdrop-blur-xl hover:bg-[#131c31] border border-white/5 hover:border-blue-500/30 rounded-[2.5rem] p-8 overflow-hidden shadow-xl hover:shadow-[0_15px_40px_-10px_rgba(59,130,246,0.15)] cursor-pointer transition-all duration-500"
                                >
                                    {/* Subtle ambient glow */}
                                    <div className="absolute -top-32 -right-32 w-64 h-64 bg-blue-500/10 rounded-full blur-[80px] opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none" />
                                    <div className="absolute top-8 right-8">
                                        <div className="relative">
                                            <Button
                                                variant="secondary"
                                                size="icon"
                                                onClick={(e) => { e.stopPropagation(); setOpenMenuId(openMenuId === release.id ? null : release.id); }}
                                                icon={MoreVertical}
                                            />

                                            <AnimatePresence>
                                                {openMenuId === release.id && isAdminOrManager && (
                                                    <motion.div
                                                        initial={{ opacity: 0, scale: 0.95, y: 10 }}
                                                        animate={{ opacity: 1, scale: 1, y: 0 }}
                                                        exit={{ opacity: 0, scale: 0.95, y: 10 }}
                                                        className="absolute right-0 mt-4 w-56 bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-white/10 rounded-[2rem] shadow-2xl z-50 overflow-hidden"
                                                    >
                                                        <div className="p-3 space-y-1">
                                                            <button
                                                                onClick={() => handleEditClick(release)}
                                                                className="w-full flex items-center gap-3 px-6 py-4 text-xs font-bold text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-white/5 rounded-2xl transition-all"
                                                            >
                                                                <Edit className="w-4 h-4 text-blue-600 dark:text-blue-500/70" />
                                                                {t('releaseManager.menu.edit')}
                                                            </button>
                                                            <div className="h-px bg-slate-100 dark:bg-white/5 mx-4 my-2" />
                                                            <p className="px-6 py-2 text-[8px] font-black text-slate-400 dark:text-slate-600 uppercase tracking-widest">{t('releaseManager.status.label')}</p>
                                                            {['ACTIVE', 'COMPLETED'].map(status => (
                                                                <button
                                                                    key={status}
                                                                    onClick={() => handleStatusChange(release, status)}
                                                                    className={`w-full flex items-center gap-3 px-6 py-3 text-[9px] font-black uppercase tracking-widest rounded-2xl transition-all ${release.status === status ? (status === 'ACTIVE' ? 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/5' : 'text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-500/5') : 'text-slate-500 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-50 dark:hover:bg-white/5'}`}
                                                                >
                                                                    <Activity className={`w-3.5 h-3.5 ${release.status === status ? 'animate-pulse' : 'opacity-40'}`} />
                                                                    {getStatusLabel(status)}
                                                                </button>
                                                            ))}
                                                            <div className="h-px bg-slate-100 dark:bg-white/5 mx-4 my-2" />
                                                            <button
                                                                onClick={() => { setReleaseToDelete(release.id); setIsDeleteModalOpen(true); setOpenMenuId(null); }}
                                                                className="w-full flex items-center gap-3 px-6 py-4 text-[10px] font-black uppercase tracking-widest text-rose-600 dark:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10 rounded-2xl transition-all"
                                                            >
                                                                <Trash2 className="w-4 h-4" />
                                                                {t('releaseManager.menu.delete')}
                                                            </button>
                                                        </div>
                                                    </motion.div>
                                                )}
                                            </AnimatePresence>
                                        </div>
                                    </div>

                                    <div className="flex flex-col h-full">
                                        {/* Header: Status & Type (No icon) */}
                                        <div className="flex items-center gap-2 mb-6">
                                            <div className="flex flex-col gap-2">
                                                <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-black border ${getStatusStyles(release.status)}`}>
                                                    <div className={`w-1 h-1 rounded-full ${release.status === 'ACTIVE' ? 'bg-emerald-500 animate-pulse' : 'bg-current'}`} />
                                                    {getStatusLabel(release.status)}
                                                </span>
                                                {release.release_type && (
                                                    <span className="inline-flex items-center px-3 py-1 bg-white/5 border border-white/10 rounded-full text-[8px] font-black text-slate-400 uppercase tracking-widest">
                                                        {release.release_type}
                                                    </span>
                                                )}
                                            </div>
                                        </div>

                                        {/* Title & Description */}
                                        <div className="mb-8 relative z-10">
                                            <h3 className="text-xl md:text-2xl font-black text-slate-900 dark:text-white mb-2 group-hover:text-blue-400 transition-colors tracking-tight truncate uppercase">
                                                {release.name}
                                            </h3>
                                            <p className="text-slate-400 text-sm font-medium leading-relaxed line-clamp-2 h-10">
                                                {release.description || <span className="italic opacity-60">Aucune description</span>}
                                            </p>
                                        </div>

                                        {/* Horizontal Progression */}
                                        <div className="mb-10">
                                            <div
                                                className="flex items-center justify-between mb-3 cursor-pointer group/audit"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    if (readinessScores[release.id]) {
                                                        setSelectedReadinessData(readinessScores[release.id]);
                                                        setSelectedEntityName(release.name);
                                                        setIsDetailModalOpen(true);
                                                    }
                                                }}
                                            >
                                                <span className="text-[10px] font-black text-slate-400 dark:text-slate-600 uppercase tracking-[0.15em] group-hover/audit:text-blue-600 dark:group-hover/audit:text-blue-400 transition-colors">
                                                    Progression
                                                </span>
                                                <span className={`text-xs font-black tracking-wider group-hover/audit:scale-110 transition-transform ${(readinessScores[release.id]?.score || 0) >= 80 ? 'text-emerald-500' : (readinessScores[release.id]?.score || 0) >= 40 ? 'text-blue-500' : 'text-rose-500'}`}>
                                                    {readinessScores[release.id]?.score || 0}%
                                                </span>
                                            </div>
                                            <div className="h-1.5 w-full bg-slate-100 dark:bg-white/5 rounded-full overflow-hidden">
                                                <motion.div
                                                    initial={{ width: 0 }}
                                                    animate={{ width: `${readinessScores[release.id]?.score || 0}%` }}
                                                    transition={{ duration: 1, ease: 'easeOut' }}
                                                    className={`h-full rounded-full ${(readinessScores[release.id]?.score || 0) >= 80 ? 'bg-emerald-500' : (readinessScores[release.id]?.score || 0) >= 40 ? 'bg-blue-500' : 'bg-rose-500'}`}
                                                />
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-2 gap-3 mb-10 relative z-10">
                                            <div className="p-4 bg-white/[0.02] group-hover:bg-white/[0.04] transition-colors border border-white/5 rounded-2xl flex flex-col justify-between">
                                                <div className="flex items-center gap-2 mb-2">
                                                    <Calendar className="w-3.5 h-3.5 text-emerald-400" />
                                                    <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Créé le</p>
                                                </div>
                                                <div className="flex items-baseline gap-1.5">
                                                    <p className="text-xl font-black text-white leading-tight uppercase tracking-tighter">
                                                        {new Date(release.created_at).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' }).replace('.', '')}
                                                    </p>
                                                    <p className="text-xs text-slate-500 font-bold">{new Date(release.created_at).getFullYear()}</p>
                                                </div>
                                            </div>
                                            <div className="p-4 bg-white/[0.02] group-hover:bg-white/[0.04] transition-colors border border-white/5 rounded-2xl flex flex-col justify-between">
                                                <div className="flex items-center gap-2 mb-2">
                                                    <BookOpen className="w-3.5 h-3.5 text-blue-400" />
                                                    <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Campagnes</p>
                                                </div>
                                                <p className="text-2xl font-black text-white">{release.campaign_count || 1}</p>
                                            </div>
                                        </div>

                                        <div className="mt-auto pt-6 border-t border-slate-100 dark:border-white/5 flex items-center justify-between relative z-10">
                                            <span className="text-[10px] font-black text-blue-400 uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                                                Explorer la release
                                            </span>
                                            <button
                                                onClick={() => navigate('/manager', { state: { releaseName: release.name, releaseId: release.id } })}
                                                className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-500 hover:text-blue-400 transition-colors group/btn whitespace-nowrap"
                                            >
                                                Ouvrir
                                                <ChevronRight className="w-4 h-4 group-hover/btn:translate-x-1 transition-transform" />
                                            </button>
                                        </div>
                                    </div>
                                </motion.div>
                            ))
                        )}
                    </AnimatePresence>
                </div>

                <div className="pt-10">
                    <Pagination
                        currentPage={currentPage}
                        totalItems={totalItems}
                        pageSize={pageSize}
                        onPageChange={handlePageChange}
                        loading={loading}
                    />
                </div>
            </div>

            {/* Add/Edit Modal */}
            <AnimatePresence>
                {isModalOpen && (
                    <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 sm:p-6 backdrop-blur-2xl bg-black/60 overflow-y-auto">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.9, y: 20 }}
                            className="relative w-full max-w-xl bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-white/10 rounded-[2rem] overflow-y-auto shadow-2xl flex flex-col max-h-[70vh]"
                        >
                            <div className="px-6 py-8 border-b border-slate-100 dark:border-white/5 flex justify-between items-center bg-gradient-to-r from-blue-600/10 to-transparent flex-shrink-0">
                                <div>
                                    <h2 className="text-xl font-black text-slate-900 dark:text-white tracking-tight uppercase">{editingRelease ? t('releaseManager.modal.editTitle') : t('releaseManager.modal.createTitle')}</h2>
                                    <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 mt-1 uppercase tracking-[0.2em]">Release Management Terminal</p>
                                </div>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={resetForm}
                                    icon={XCircle}
                                />
                            </div>

                            <div className="p-6 space-y-4 flex-1">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">{t('releaseManager.modal.name')}</label>
                                    <input
                                        type="text"
                                        required
                                        className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl px-6 py-3 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-600/50 outline-none transition-all font-bold"
                                        placeholder={t('releaseManager.modal.namePlaceholder')}
                                        value={newRelease.name}
                                        onChange={(e) => setNewRelease({ ...newRelease, name: e.target.value })}
                                    />
                                </div>

                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">{t('releaseManager.modal.description')}</label>
                                    <textarea
                                        className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl px-6 py-3 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-600/50 outline-none transition-all font-bold h-24 resize-none"
                                        placeholder={t('releaseManager.modal.descriptionPlaceholder')}
                                        value={newRelease.description}
                                        onChange={(e) => setNewRelease({ ...newRelease, description: e.target.value })}
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-6">
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">{t('releaseManager.modal.initialStatus')}</label>
                                        <div className={`relative border rounded-2xl overflow-hidden group ${!editingRelease ? 'bg-slate-100 dark:bg-white/[0.02] border-transparent opacity-70' : 'bg-slate-50 dark:bg-white/5 border-slate-200 dark:border-white/10'}`}>
                                            <Activity className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 dark:text-slate-500 group-focus-within:text-blue-600 dark:group-focus-within:text-blue-500 transition-colors" />
                                            <select
                                                className={`w-full bg-transparent pl-16 pr-6 py-3 text-slate-900 dark:text-white font-bold outline-none appearance-none ${!editingRelease ? 'cursor-not-allowed' : 'cursor-pointer'}`}
                                                value={newRelease.status}
                                                onChange={(e) => setNewRelease({ ...newRelease, status: e.target.value })}
                                                disabled={!editingRelease}
                                            >
                                                <option value="ACTIVE" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">{t('releaseManager.status.active')}</option>
                                                <option value="COMPLETED" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">{t('releaseManager.status.completed')}</option>
                                            </select>
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Type de Release</label>
                                        <div className="relative bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl overflow-hidden group">
                                            <Layers className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 dark:text-slate-500 group-focus-within:text-emerald-600 dark:group-focus-within:text-emerald-500 transition-colors" />
                                            <select
                                                className="w-full bg-transparent pl-16 pr-6 py-3 text-slate-900 dark:text-white font-bold outline-none cursor-pointer appearance-none"
                                                value={newRelease.release_type}
                                                onChange={(e) => setNewRelease({ ...newRelease, release_type: e.target.value })}
                                            >
                                                <option value="RECETTE" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">RECETTE</option>
                                                <option value="PREPROD" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">PREPROD</option>
                                            </select>
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Projet Parent (Portefeuille)</label>
                                    <div className={`relative border rounded-2xl overflow-hidden group ${businessProjectId ? 'bg-slate-100 dark:bg-white/[0.02] border-transparent opacity-70' : 'bg-slate-50 dark:bg-white/5 border-slate-200 dark:border-white/10'}`}>
                                        <BookOpen className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 dark:text-slate-500 group-focus-within:text-blue-600 dark:group-focus-within:text-blue-500 transition-colors" />
                                        <select
                                            className={`w-full bg-transparent pl-16 pr-6 py-3 text-slate-900 dark:text-white font-bold outline-none appearance-none ${businessProjectId ? 'cursor-not-allowed' : 'cursor-pointer'}`}
                                            value={newRelease.business_project}
                                            onChange={(e) => setNewRelease({ ...newRelease, business_project: e.target.value })}
                                            disabled={!!businessProjectId}
                                        >
                                            <option value="" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">Aucun projet (Global)</option>
                                            {businessProjects.map(bp => (
                                                <option key={bp.id} value={bp.id} className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">{bp.name}</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>
                                </div>
                                
                                <div className="p-6 border-t border-slate-100 dark:border-white/5 flex items-center justify-end gap-5 flex-shrink-0">
                                    <Button
                                        variant="ghost"
                                        onClick={resetForm}
                                    >
                                        {t('releaseManager.modal.cancel')}
                                    </Button>
                                    <Button
                                        onClick={handleSaveRelease}
                                        disabled={!newRelease.name}
                                        icon={editingRelease ? Save : Plus}
                                    >
                                        {editingRelease ? t('releaseManager.modal.save') : t('releaseManager.modal.create')}
                                    </Button>
                                </div>
                        </motion.div>
                    </div>
                )
                }
            </AnimatePresence >

            <ConfirmModal
                isOpen={isDeleteModalOpen}
                title={t('releaseManager.modal.deleteTitle')}
                message={t('releaseManager.modal.deleteMessage')}
                onConfirm={confirmDelete}
                onCancel={() => setIsDeleteModalOpen(false)}
                confirmText={t('releaseManager.modal.deleteConfirm')}
                type="danger"
            />

            <ReadinessDetailModal
                isOpen={isDetailModalOpen}
                onClose={() => setIsDetailModalOpen(false)}
                data={selectedReadinessData}
                title={selectedEntityName}
            />
        </PageLayout >
    );
};

export default ReleaseManager;
