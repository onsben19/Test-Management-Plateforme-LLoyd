import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import PageLayout from '../components/PageLayout';
import { Layers, Calendar, User, BookOpen, Plus, MoreVertical, ArrowRight, Edit, Trash2, Activity, Search, Sparkles, Filter, ChevronRight, Save } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { projectService } from '../services/api';
import { toast } from 'react-toastify';
import Pagination from '../components/Pagination';
import { useAuth } from '../context/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';
import ConfirmModal from '../components/ConfirmModal';
import ReadinessGauge from '../components/ReadinessGauge';
import ReadinessDetailModal from '../components/ReadinessDetailModal';
import { aiService } from '../services/api';
import { Award, Info, XCircle } from 'lucide-react';

const ReleaseManager = () => {
    const { t, i18n } = useTranslation();
    const navigate = useNavigate();
    const { user } = useAuth();
    const isAdminOrManager = ['ADMIN', 'MANAGER'].includes(user?.role?.toUpperCase() || '');

    const [releases, setReleases] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
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
        status: 'ACTIVE'
    });

    const [openMenuId, setOpenMenuId] = useState<string | null>(null);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [releaseToDelete, setReleaseToDelete] = useState<string | null>(null);

    const fetchReleases = async (page = currentPage) => {
        try {
            setLoading(true);
            const response = await projectService.getProjects({
                page,
                search: searchQuery,
                ordering: sortOrder === 'newest' ? '-created_at' : 'created_at'
            });
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
        fetchReleases(1);
        setCurrentPage(1);
    }, [searchQuery, sortOrder]);

    const handlePageChange = (page: number) => {
        setCurrentPage(page);
        fetchReleases(page);
    };

    const resetForm = () => {
        setNewRelease({ name: '', description: '', status: 'ACTIVE' });
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
            status: release.status
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
            case 'ACTIVE': return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
            case 'COMPLETED': return 'bg-blue-500/10 text-blue-400 border-blue-500/20';
            case 'PLANNING': return 'bg-violet-500/10 text-violet-400 border-violet-500/20';
            default: return 'bg-slate-500/10 text-slate-400 border-slate-500/20';
        }
    };

    const getStatusLabel = (status: string) => {
        switch (status) {
            case 'ACTIVE': return t('releaseManager.status.active');
            case 'PLANNING': return t('releaseManager.status.planning');
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
        <button
            onClick={() => { resetForm(); setIsModalOpen(true); }}
            className="group flex items-center gap-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white px-8 py-3.5 rounded-2xl transition-all shadow-xl shadow-blue-900/30 active:scale-95 font-bold text-xs tracking-tight"
        >
            <Plus className="w-4 h-4 group-hover:scale-110 transition-transform" />
            {t('releaseManager.newRelease')}
        </button>
    );

    return (
        <PageLayout
            title={t('releaseManager.title')}
            subtitle="RELEASE AUDIT"
            actions={HeaderActions}
        >
            <div className="space-y-10">
                {/* Search & Sort Toolbar */}
                <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-[2.5rem] p-6 flex flex-col md:flex-row items-center gap-6 shadow-2xl">
                    <div className="relative flex-1 w-full group">
                        <Search className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500 group-focus-within:text-blue-500 transition-colors" />
                        <input
                            type="text"
                            placeholder={t('releaseManager.searchPlaceholder')}
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full bg-white/5 border border-white/10 rounded-[1.5rem] pl-16 pr-8 py-4 text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all font-medium placeholder-slate-500"
                        />
                    </div>
                    <div className="flex items-center gap-4 w-full md:w-auto">
                        <div className="flex items-center gap-3 bg-white/5 p-2 rounded-[1.5rem] border border-white/5 pr-6 w-full md:w-auto">
                            <div className="p-2 bg-blue-500/10 rounded-full border border-blue-500/20">
                                <Filter className="w-4 h-4 text-blue-500" />
                            </div>
                            <select
                                value={sortOrder}
                                onChange={(e) => setSortOrder(e.target.value as 'newest' | 'oldest')}
                                className="bg-transparent text-white text-xs font-bold outline-none cursor-pointer appearance-none"
                            >
                                <option value="newest" className="bg-slate-900">{t('releaseManager.sort.newest')}</option>
                                <option value="oldest" className="bg-slate-900">{t('releaseManager.sort.oldest')}</option>
                            </select>
                        </div>
                    </div>
                </div>

                {/* Grid of Releases */}
                <div className="grid grid-cols-1 xl:grid-cols-2 2xl:grid-cols-3 gap-8">
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
                                    className="group relative bg-white/5 backdrop-blur-xl border border-white/10 rounded-[3rem] p-8 hover:bg-white/10 transition-all duration-500 shadow-xl hover:shadow-2xl hover:shadow-blue-900/20"
                                >
                                    <div className="absolute top-8 right-8 flex items-center gap-4">
                                        {/* Readiness Score for the Release */}
                                        {readinessScores[release.id] && (
                                            <div
                                                className="cursor-pointer hover:scale-105 transition-transform"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setSelectedReadinessData(readinessScores[release.id]);
                                                    setSelectedEntityName(release.name);
                                                    setIsDetailModalOpen(true);
                                                }}
                                            >
                                                <ReadinessGauge score={readinessScores[release.id].score} size={45} label="" />
                                            </div>
                                        )}

                                        <div className="relative">
                                            <button
                                                onClick={(e) => { e.stopPropagation(); setOpenMenuId(openMenuId === release.id ? null : release.id); }}
                                                className="p-3 bg-white/5 hover:bg-white/10 rounded-2xl text-slate-400 hover:text-white transition-all border border-white/5"
                                            >
                                                <MoreVertical className="w-5 h-5" />
                                            </button>

                                            <AnimatePresence>
                                                {openMenuId === release.id && isAdminOrManager && (
                                                    <motion.div
                                                        initial={{ opacity: 0, scale: 0.95, y: 10 }}
                                                        animate={{ opacity: 1, scale: 1, y: 0 }}
                                                        exit={{ opacity: 0, scale: 0.95, y: 10 }}
                                                        className="absolute right-0 mt-4 w-56 bg-[#0f172a] border border-white/10 rounded-[2rem] shadow-2xl z-50 overflow-hidden"
                                                    >
                                                        <div className="p-3 space-y-1">
                                                            <button
                                                                onClick={() => handleEditClick(release)}
                                                                className="w-full flex items-center gap-3 px-6 py-4 text-xs font-bold text-slate-400 hover:text-white hover:bg-white/5 rounded-2xl transition-all"
                                                            >
                                                                <Edit className="w-4 h-4 text-blue-500/70" />
                                                                {t('releaseManager.menu.edit')}
                                                            </button>
                                                            <div className="h-px bg-white/5 mx-4 my-2" />
                                                            <p className="px-6 py-2 text-[8px] font-black text-slate-600 uppercase tracking-widest">{t('releaseManager.status.label')}</p>
                                                            {['ACTIVE', 'PLANNING', 'COMPLETED'].map(status => (
                                                                <button
                                                                    key={status}
                                                                    onClick={() => handleStatusChange(release, status)}
                                                                    className={`w-full flex items-center gap-3 px-6 py-3 text-[9px] font-black uppercase tracking-widest rounded-2xl transition-all ${release.status === status ? 'text-blue-400 bg-blue-500/5' : 'text-slate-500 hover:text-slate-200 hover:bg-white/5'}`}
                                                                >
                                                                    <Activity className={`w-3.5 h-3.5 ${release.status === status ? 'animate-pulse' : 'opacity-40'}`} />
                                                                    {getStatusLabel(status)}
                                                                </button>
                                                            ))}
                                                            <div className="h-px bg-white/5 mx-4 my-2" />
                                                            <button
                                                                onClick={() => { setReleaseToDelete(release.id); setIsDeleteModalOpen(true); setOpenMenuId(null); }}
                                                                className="w-full flex items-center gap-3 px-6 py-4 text-[10px] font-black uppercase tracking-widest text-rose-500 hover:bg-rose-500/10 rounded-2xl transition-all"
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
                                        <div className="flex items-center gap-5 mb-8">
                                            <div className="w-16 h-16 rounded-[1.5rem] bg-indigo-600/20 border border-indigo-600/30 flex items-center justify-center text-indigo-400 group-hover:scale-110 group-hover:rotate-6 transition-all duration-500">
                                                <Layers className="w-8 h-8" />
                                            </div>
                                            <div className="flex-1">
                                                <div className="flex items-center gap-3 mb-1">
                                                    <h3 className="text-xl font-bold text-white group-hover:text-blue-400 transition-colors tracking-tight">{release.name}</h3>
                                                </div>
                                                <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold border ${getStatusStyles(release.status)}`}>
                                                    <div className={`w-1 h-1 rounded-full ${release.status === 'ACTIVE' ? 'bg-emerald-500 animate-pulse' : 'bg-current'}`} />
                                                    {getStatusLabel(release.status)}
                                                </span>
                                            </div>
                                        </div>

                                        <p className="text-slate-400 text-sm font-medium leading-relaxed mb-10 line-clamp-2 h-10 group-hover:text-slate-300 transition-colors">
                                            {release.description}
                                        </p>

                                        <div className="grid grid-cols-2 gap-4 mb-10">
                                            <div className="p-4 bg-white/5 rounded-2xl border border-white/5 space-y-1">
                                                <div className="flex items-center gap-2 text-[9px] font-black text-slate-500 uppercase tracking-widest">
                                                    <Calendar className="w-3.5 h-3.5" />
                                                    {t('releaseManager.card.createdAt')}
                                                </div>
                                                <div className="text-white text-xs font-bold">{formatDate(release.created_at)}</div>
                                            </div>
                                            <div className="p-4 bg-white/5 rounded-2xl border border-white/5 space-y-1">
                                                <div className="flex items-center gap-2 text-[9px] font-black text-slate-500 uppercase tracking-widest">
                                                    <BookOpen className="w-3.5 h-3.5" />
                                                    Campaigns
                                                </div>
                                                <div className="text-white text-xs font-bold">{release.campaign_count || 0} Sets</div>
                                            </div>
                                        </div>

                                        <div className="mt-auto pt-6 border-t border-white/5 flex items-center justify-between">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-full bg-blue-500/20 border border-blue-500/30 flex items-center justify-center text-[10px] font-black text-blue-400">
                                                    {release.created_by_username?.[0]?.toUpperCase() || 'U'}
                                                </div>
                                                <span className="text-[10px] font-black text-slate-500 uppercase tracking-tight">{release.created_by_username || 'System'}</span>
                                            </div>
                                            <button
                                                onClick={() => navigate('/manager', { state: { releaseName: release.name, releaseId: release.id } })}
                                                className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-blue-400 hover:text-blue-300 transition-all group/btn"
                                            >
                                                {t('releaseManager.card.viewTests')}
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
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 backdrop-blur-xl bg-black/60">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.9, y: 20 }}
                            className="relative w-full max-w-xl bg-[#0f172a] border border-white/10 rounded-[3rem] overflow-hidden shadow-2xl"
                        >
                            <div className="p-8 border-b border-white/5 flex justify-between items-center bg-gradient-to-r from-blue-600/10 to-transparent">
                                <div>
                                    <h2 className="text-2xl font-bold text-white tracking-tight">{editingRelease ? t('releaseManager.modal.editTitle') : t('releaseManager.modal.createTitle')}</h2>
                                    <p className="text-[10px] font-black text-slate-500 mt-1 uppercase tracking-[0.2em]">Release Management Terminal</p>
                                </div>
                                <button
                                    onClick={resetForm}
                                    className="p-3 bg-white/5 hover:bg-white/10 rounded-full text-slate-400 hover:text-white transition-all border border-white/5"
                                >
                                    <XCircle className="w-6 h-6" />
                                </button>
                            </div>

                            <div className="p-8 space-y-6">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">{t('releaseManager.modal.name')}</label>
                                    <input
                                        type="text"
                                        required
                                        className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-white focus:ring-2 focus:ring-blue-500/50 outline-none transition-all font-bold"
                                        placeholder={t('releaseManager.modal.namePlaceholder')}
                                        value={newRelease.name}
                                        onChange={(e) => setNewRelease({ ...newRelease, name: e.target.value })}
                                    />
                                </div>

                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">{t('releaseManager.modal.description')}</label>
                                    <textarea
                                        className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-white focus:ring-2 focus:ring-blue-500/50 outline-none transition-all font-bold h-32 resize-none"
                                        placeholder={t('releaseManager.modal.descriptionPlaceholder')}
                                        value={newRelease.description}
                                        onChange={(e) => setNewRelease({ ...newRelease, description: e.target.value })}
                                    />
                                </div>

                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">{t('releaseManager.modal.initialStatus')}</label>
                                    <div className="relative bg-white/5 border border-white/10 rounded-2xl overflow-hidden group">
                                        <Activity className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500 group-focus-within:text-blue-500 transition-colors" />
                                        <select
                                            className="w-full bg-transparent pl-16 pr-6 py-4 text-white font-bold outline-none cursor-pointer appearance-none"
                                            value={newRelease.status}
                                            onChange={(e) => setNewRelease({ ...newRelease, status: e.target.value })}
                                        >
                                            <option value="ACTIVE" className="bg-slate-900">{t('releaseManager.status.active')}</option>
                                            <option value="PLANNING" className="bg-slate-900">{t('releaseManager.status.planning')}</option>
                                            <option value="COMPLETED" className="bg-slate-900">{t('releaseManager.status.completed')}</option>
                                        </select>
                                    </div>
                                </div>

                                <div className="flex items-center justify-end gap-5 pt-6 border-t border-white/5">
                                    <button
                                        onClick={resetForm}
                                        className="px-8 py-4 text-[10px] font-black uppercase tracking-widest text-slate-500 hover:text-white transition-all"
                                    >
                                        {t('releaseManager.modal.cancel')}
                                    </button>
                                    <button
                                        onClick={handleSaveRelease}
                                        disabled={!newRelease.name}
                                        className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white px-10 py-4 rounded-2xl font-bold text-xs tracking-tight transition-all shadow-xl shadow-blue-900/30 active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed flex items-center gap-3"
                                    >
                                        {editingRelease ? <Save className="w-5 h-5" /> : <Plus className="w-5 h-5" />}
                                        {editingRelease ? t('releaseManager.modal.save') : t('releaseManager.modal.create')}
                                    </button>
                                </div>
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
