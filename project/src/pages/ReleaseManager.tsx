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

// --- Composant réutilisable : description extensible ---
const ExpandableDescription = ({ text, maxChars = 90, emptyLabel = 'Aucune description.' }: { text?: string; maxChars?: number; emptyLabel?: string }) => {
    const [expanded, setExpanded] = useState(false);
    if (!text) return <span className="italic opacity-50 text-xs">{emptyLabel}</span>;
    const isLong = text.length > maxChars;
    return (
        <span>
            {expanded || !isLong ? text : text.slice(0, maxChars) + '…'}
            {isLong && (
                <button
                    onClick={(e) => { e.stopPropagation(); setExpanded(v => !v); }}
                    className="ml-1.5 text-blue-400 hover:text-blue-300 text-[11px] font-black uppercase tracking-widest transition-colors"
                >
                    {expanded ? 'Réduire' : 'Lire la suite'}
                </button>
            )}
        </span>
    );
};

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

    const HeaderActions = (
        <div className="flex gap-3">
            {isAdminOrManager && (
                <Button
                    variant="secondary"
                    onClick={() => { resetForm(); setIsModalOpen(true); }}
                >
                    {t('releaseManager.newRelease')}
                </Button>
            )}
        </div>
    );

    return (
        <PageLayout
            title={businessProjectName ? `Releases: ${businessProjectName}` : t('releaseManager.title')}
            subtitle="L'ENSEMBLE DES RELEASES"
            actions={HeaderActions}
            onBack={businessProjectName ? () => navigate('/portfolio') : undefined}
            backLabel="Liste des projets"
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
                            className="flex-1 bg-transparent border-none text-sm text-slate-900 dark:text-white focus:ring-0 outline-none placeholder-slate-400"
                        />
                    </div>

                    {/* Sort Select */}
                    <div className="bg-slate-50 dark:bg-white/[0.02] border border-slate-200 dark:border-white/[0.05] rounded-xl p-3 flex items-center gap-3">
                        <Filter className="w-4 h-4 text-slate-400 ml-2" />
                        <select
                            value={sortOrder}
                            onChange={(e) => setSortOrder(e.target.value as 'newest' | 'oldest')}
                            className="bg-transparent text-slate-900 dark:text-white text-xs font-bold outline-none cursor-pointer appearance-none uppercase tracking-widest"
                        >
                            <option value="newest" className="bg-slate-900 text-slate-900 dark:text-white">{t('releaseManager.sort.newest')}</option>
                            <option value="oldest" className="bg-slate-900 text-slate-900 dark:text-white">{t('releaseManager.sort.oldest')}</option>
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
                                    : 'text-slate-400 hover:text-white hover:bg-slate-100 dark:hover:bg-white/5'
                                    }`}
                            >
                                {tab.label}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Timeline of Releases */}
                <div className="flex flex-col max-w-6xl mx-auto pb-10 w-full overflow-visible">
                    <AnimatePresence mode="popLayout">
                        {loading && releases.length === 0 ? (
                            [1, 2, 3].map(i => <div key={i} className="h-24 bg-[#111827] border border-white/[0.07] rounded-[10px] animate-pulse mb-6" />)
                        ) : releases.length === 0 ? (
                            <div className="py-40 text-center opacity-30">
                                <Sparkles className="w-16 h-16 mx-auto mb-6 text-slate-500" />
                                <h3 className="font-bold text-sm text-slate-500">{t('releaseManager.card.noReleases')}</h3>
                            </div>
                        ) : (
                            releases.map((release, idx) => {
                                const isActive = release.status === 'ACTIVE';
                                const readinessScore = readinessScores[release.id]?.score || 0;
                                const isReady = readinessScore >= 80;
                                
                                return (
                                    <motion.div
                                        key={release.id}
                                        initial={{ opacity: 0, x: -20 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        transition={{ delay: idx * 0.05 }}
                                        onClick={() => navigate('/manager', { state: { releaseName: release.name, releaseId: release.id, businessProjectId, businessProjectName } })}
                                        className="relative flex items-stretch gap-6 cursor-pointer group"
                                    >
                                        {/* Left column (Timeline Fixed) */}
                                        <div className="w-14 flex flex-col items-center mt-5 relative shrink-0">
                                            <div className={`w-9 h-9 rounded-full flex items-center justify-center relative z-10 border ${isActive ? 'bg-[#1D9E75]/15 border-[#1D9E75]/30 shadow-[0_0_15px_rgba(29,158,117,0.15)]' : 'bg-[#E24B4A]/15 border-[#E24B4A]/30 shadow-[0_0_15px_rgba(226,75,74,0.15)]'}`}>
                                                <div className={`w-2.5 h-2.5 rounded-full ${isActive ? 'bg-[#5DCAA5] shadow-[0_0_8px_rgba(93,202,165,0.6)]' : 'bg-[#F09595] shadow-[0_0_8px_rgba(240,149,149,0.6)]'}`} />
                                            </div>
                                            {idx !== releases.length - 1 && (
                                                <div className="absolute top-9 bottom-[-24px] w-px bg-white/[0.07]" style={{ left: '50%', transform: 'translateX(-50%)' }} />
                                            )}
                                        </div>

                                        {/* Right area */}
                                        <div className="flex-1 pb-6 min-w-0">
                                            <div className="flex items-center gap-2 text-[11px] font-medium text-white/30 uppercase tracking-[0.06em] mb-2 ml-1">
                                                {formatDate(release.created_at).replace('.', '').toUpperCase()}
                                                {release.release_type && (
                                                    <>
                                                        <span className="w-1 h-1 rounded-full bg-white/20" />
                                                        <span className="text-white/40 font-bold">{release.release_type.toLowerCase()}</span>
                                                    </>
                                                )}
                                            </div>
                                            <div className="bg-[#111827] border border-white/[0.07] rounded-[14px] py-5 px-7 flex flex-col justify-center hover:border-blue-500/30 hover:bg-[#1f2937] transition-all max-w-full shadow-lg">
                                                <div className="flex items-center gap-5">
                                                    {/* Left: Name & Desc */}
                                                    <div className="flex-1 min-w-0 pr-4">
                                                        <h4 className="text-[16px] font-semibold text-[#e8eaf6] truncate leading-tight group-hover:text-blue-400 transition-colors">{release.name}</h4>
                                                        <div className="text-[13px] text-white/[0.35] mt-1 max-w-[500px]" onClick={(e) => e.stopPropagation()}>
                                                            <ExpandableDescription
                                                                text={release.description}
                                                                maxChars={70}
                                                                emptyLabel="Aucune description"
                                                            />
                                                        </div>
                                                    </div>

                                                    {/* Center: Readiness Score & Campaigns */}
                                                    <div className="flex items-center gap-4 shrink-0 border-l border-white/[0.07] pl-5 h-8">
                                                        <div 
                                                            className="flex flex-col items-center gap-1 cursor-pointer group/readiness hover:opacity-80 transition-opacity" 
                                                            title="Readiness Score"
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                if (readinessScores[release.id]) {
                                                                    setSelectedReadinessData(readinessScores[release.id]);
                                                                    setSelectedEntityName(release.name);
                                                                    setIsDetailModalOpen(true);
                                                                }
                                                            }}
                                                        >
                                                            <span className={`text-[15px] font-black leading-none ${isReady ? 'text-emerald-500' : 'text-rose-500'}`}>
                                                                {readinessScore}%
                                                            </span>
                                                            <span className={`text-[8px] font-black uppercase tracking-widest leading-none ${isReady ? 'text-emerald-500/70' : 'text-rose-500/70'}`}>
                                                                {isReady ? 'Prêt' : 'À Risque'}
                                                            </span>
                                                        </div>
                                                        <div className="w-1 h-1 rounded-full bg-white/10" />
                                                        <div className="flex items-center gap-1.5 text-white/50" title="Cahiers de test">
                                                            <span className="text-[13px] font-bold leading-tight text-white/70">{release.campaign_count || 0}</span>
                                                            <span className="text-[10px] font-medium uppercase tracking-widest text-white/40">{(release.campaign_count || 0) > 1 ? 'Cahiers de test' : 'Cahier de test'}</span>
                                                        </div>
                                                    </div>

                                                    {/* Right: Progress & Status */}
                                                    <div className="flex items-center gap-5 shrink-0 border-l border-white/[0.07] pl-5 h-8">


                                                        <span className={`text-[11px] px-[10px] py-[4px] rounded-[20px] font-bold uppercase tracking-wider border leading-tight ${isActive ? 'bg-[#1D9E75]/15 text-[#5DCAA5] border-[#1D9E75]/25' : 'bg-[#E24B4A]/15 text-[#F09595] border-[#E24B4A]/25'}`}>
                                                            {getStatusLabel(release.status)}
                                                        </span>
                                                    </div>

                                                    {/* Far Right: Actions */}
                                                    <div className="flex items-center shrink-0 border-l border-white/[0.07] pl-4 h-8 relative">
                                                        <button
                                                            onClick={(e) => { e.stopPropagation(); setOpenMenuId(openMenuId === release.id ? null : release.id); }}
                                                            className="p-1.5 text-white/30 hover:text-white rounded-md hover:bg-white/5 transition-colors"
                                                        >
                                                            <MoreVertical className="w-4 h-4" />
                                                        </button>
                                                        
                                                        <AnimatePresence>
                                                            {openMenuId === release.id && isAdminOrManager && (
                                                                <motion.div
                                                                    initial={{ opacity: 0, scale: 0.95, y: 10 }}
                                                                    animate={{ opacity: 1, scale: 1, y: 0 }}
                                                                    exit={{ opacity: 0, scale: 0.95, y: 10 }}
                                                                    className="absolute right-0 top-full mt-2 w-48 bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-white/10 rounded-2xl shadow-2xl z-[100] overflow-hidden"
                                                                    onClick={e => e.stopPropagation()}
                                                                >
                                                                    <div className="p-2 space-y-1">
                                                                        <button
                                                                            onClick={() => handleEditClick(release)}
                                                                            className="w-full flex items-center gap-3 px-4 py-3 text-xs font-bold text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-white/10 rounded-xl transition-all"
                                                                        >
                                                                            <Edit className="w-3.5 h-3.5 text-blue-600 dark:text-blue-500/70" />
                                                                            {t('releaseManager.menu.edit')}
                                                                        </button>
                                                                        <div className="h-px bg-slate-100 dark:bg-white/5 mx-2 my-1" />
                                                                        <button
                                                                            onClick={() => handleStatusChange(release, release.status === 'ACTIVE' ? 'COMPLETED' : 'ACTIVE')}
                                                                            className="w-full flex items-center gap-3 px-4 py-3 text-xs font-bold text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-white/10 rounded-xl transition-all"
                                                                        >
                                                                            <Activity className={`w-3.5 h-3.5 ${release.status === 'ACTIVE' ? 'text-rose-600 dark:text-rose-500/70' : 'text-emerald-600 dark:text-emerald-500/70'}`} />
                                                                            {release.status === 'ACTIVE' ? getStatusLabel('COMPLETED') : getStatusLabel('ACTIVE')}
                                                                        </button>
                                                                        <div className="h-px bg-slate-100 dark:bg-white/5 mx-2 my-1" />
                                                                        <button
                                                                            onClick={() => { setReleaseToDelete(release.id); setIsDeleteModalOpen(true); setOpenMenuId(null); }}
                                                                            className="w-full flex items-center gap-3 px-4 py-3 text-xs font-bold text-rose-600 dark:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10 rounded-xl transition-all"
                                                                        >
                                                                            <Trash2 className="w-3.5 h-3.5" />
                                                                            {t('releaseManager.menu.delete')}
                                                                        </button>
                                                                    </div>
                                                                </motion.div>
                                                            )}
                                                        </AnimatePresence>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </motion.div>
                                )
                            })
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
                    <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 backdrop-blur-sm bg-black/70 overflow-y-auto">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.97, y: 12 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.97, y: 12 }}
                            transition={{ duration: 0.18 }}
                            className="relative w-full max-w-lg bg-[#0d1117] border border-white/[0.08] rounded-[20px] shadow-[0_32px_80px_rgba(0,0,0,0.6)] flex flex-col max-h-[92vh] my-auto overflow-hidden"
                        >
                            {/* Header */}
                            <div className="px-6 pt-6 pb-5 flex items-center justify-between border-b border-white/[0.06] shrink-0">
                                <div>
                                    <div className="flex items-center gap-2 mb-1">
                                        <div className={`w-1.5 h-5 rounded-full ${editingRelease ? 'bg-[#EF9F27]' : 'bg-[#378ADD]'}`} />
                                        <h2 className="text-[17px] font-semibold text-white">
                                            {editingRelease ? t('releaseManager.modal.editTitle') : t('releaseManager.modal.createTitle')}
                                        </h2>
                                    </div>
                                    <p className="text-[11px] text-white/30 ml-4">
                                        {editingRelease ? `Édition · ${editingRelease.name}` : 'Créer une nouvelle release de test'}
                                    </p>
                                </div>
                                <button
                                    onClick={resetForm}
                                    className="w-8 h-8 flex items-center justify-center rounded-full bg-white/[0.05] hover:bg-white/10 text-white/40 hover:text-white transition-all border border-white/[0.06]"
                                >
                                    <XCircle size={15} />
                                </button>
                            </div>

                            {/* Body */}
                            <div className="p-6 space-y-4 overflow-y-auto flex-1">

                                {/* Nom */}
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-bold text-white/30 uppercase tracking-[0.15em]">{t('releaseManager.modal.name')}</label>
                                    <input
                                        type="text"
                                        required
                                        className="w-full bg-[#1a2235] border border-white/[0.08] rounded-[10px] px-4 py-2.5 text-[13px] text-white placeholder:text-white/20 focus:border-[#378ADD]/50 focus:ring-0 outline-none transition-colors"
                                        placeholder={t('releaseManager.modal.namePlaceholder')}
                                        value={newRelease.name}
                                        onChange={(e) => setNewRelease({ ...newRelease, name: e.target.value })}
                                    />
                                </div>

                                {/* Description */}
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-bold text-white/30 uppercase tracking-[0.15em]">{t('releaseManager.modal.description')}</label>
                                    <textarea
                                        className="w-full bg-[#1a2235] border border-white/[0.08] rounded-[10px] px-4 py-2.5 text-[13px] text-white placeholder:text-white/20 focus:border-[#378ADD]/50 focus:ring-0 outline-none min-h-[80px] resize-none transition-colors"
                                        placeholder={t('releaseManager.modal.descriptionPlaceholder')}
                                        value={newRelease.description}
                                        onChange={(e) => setNewRelease({ ...newRelease, description: e.target.value })}
                                    />
                                </div>

                                {/* Statut + Type */}
                                <div className="grid grid-cols-2 gap-3">
                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-bold text-white/30 uppercase tracking-[0.15em]">{t('releaseManager.modal.initialStatus')}</label>
                                        <select
                                            className={`w-full bg-[#1a2235] border border-white/[0.08] rounded-[10px] px-3 py-2.5 text-[13px] text-white focus:border-[#378ADD]/50 focus:ring-0 outline-none transition-colors appearance-none ${!editingRelease ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                                            value={newRelease.status}
                                            onChange={(e) => setNewRelease({ ...newRelease, status: e.target.value })}
                                            disabled={!editingRelease}
                                        >
                                            <option value="ACTIVE" className="bg-[#0d1117]">{t('releaseManager.status.active')}</option>
                                            <option value="COMPLETED" className="bg-[#0d1117]">{t('releaseManager.status.completed')}</option>
                                        </select>
                                    </div>

                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-bold text-white/30 uppercase tracking-[0.15em]">Type de release</label>
                                        <select
                                            className="w-full bg-[#1a2235] border border-white/[0.08] rounded-[10px] px-3 py-2.5 text-[13px] text-white focus:border-[#378ADD]/50 focus:ring-0 outline-none cursor-pointer transition-colors appearance-none"
                                            value={newRelease.release_type}
                                            onChange={(e) => setNewRelease({ ...newRelease, release_type: e.target.value })}
                                        >
                                            <option value="RECETTE" className="bg-[#0d1117]">Recette</option>
                                            <option value="PREPROD" className="bg-[#0d1117]">Pré-production</option>
                                        </select>
                                    </div>
                                </div>

                                {/* Projet parent */}
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-bold text-white/30 uppercase tracking-[0.15em]">Projet parent (portefeuille)</label>
                                    {businessProjectId ? (
                                        <div className="flex items-center justify-between bg-[#1a2235] border border-[#378ADD]/20 rounded-[10px] px-4 py-2.5">
                                            <span className="text-[13px] text-white font-medium">{businessProjectName}</span>
                                            <span className="text-[10px] font-semibold text-[#85B7EB] bg-[#378ADD]/10 border border-[#378ADD]/20 px-2 py-0.5 rounded-full">Verrouillé</span>
                                        </div>
                                    ) : (
                                        <select
                                            className="w-full bg-[#1a2235] border border-white/[0.08] rounded-[10px] px-3 py-2.5 text-[13px] text-white focus:border-[#378ADD]/50 focus:ring-0 outline-none transition-colors appearance-none cursor-pointer"
                                            value={newRelease.business_project}
                                            onChange={(e) => setNewRelease({ ...newRelease, business_project: e.target.value })}
                                        >
                                            <option value="" className="bg-[#0d1117]">Aucun projet (global)</option>
                                            {businessProjects.map(bp => (
                                                <option key={bp.id} value={bp.id} className="bg-[#0d1117]">{bp.name}</option>
                                            ))}
                                        </select>
                                    )}
                                </div>
                            </div>

                            {/* Footer */}
                            <div className="px-6 py-4 border-t border-white/[0.06] flex items-center gap-3 shrink-0">
                                <button
                                    type="button"
                                    onClick={resetForm}
                                    className="px-5 py-2.5 text-[12px] font-medium text-white/40 hover:text-white transition-colors rounded-[8px] hover:bg-white/[0.05]"
                                >
                                    {t('releaseManager.modal.cancel')}
                                </button>
                                <button
                                    onClick={handleSaveRelease}
                                    disabled={!newRelease.name}
                                    className="flex-1 py-2.5 bg-[#378ADD] hover:bg-[#2e75bc] disabled:opacity-40 text-white rounded-[10px] text-[13px] font-semibold transition-all flex items-center justify-center gap-2 active:scale-[0.98]"
                                >
                                    {editingRelease ? <Save size={14} /> : <Plus size={14} />}
                                    {editingRelease ? t('releaseManager.modal.save') : t('releaseManager.modal.create')}
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

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
