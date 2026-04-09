import React, { useEffect, useState, useMemo } from 'react';
import PageLayout from '../../components/PageLayout';
import AdminTable from '../../components/AdminTable';
import { campaignService } from '../../services/api';
import { toast } from 'react-toastify';
import { Trash2, BookOpen, Edit, Briefcase, Calendar, Layers, Rocket, Search, Filter, Plus, XCircle, Save, ChevronRight, LayoutGrid } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import StatCard from '../../components/StatCard';
import Pagination from '../../components/Pagination';
import { motion, AnimatePresence } from 'framer-motion';
import ConfirmModal from '../../components/ConfirmModal';

const AdminCampaigns = () => {
    const { t } = useTranslation();
    const location = useLocation();

    const [campaigns, setCampaigns] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState(() => {
        const params = new URLSearchParams(location.search);
        return params.get('search') || '';
    });
    const [statusFilter, setStatusFilter] = useState('ALL');
    const [sortOrder, setSortOrder] = useState<'newest' | 'oldest'>('newest');
    const [currentPage, setCurrentPage] = useState(1);
    const pageSize = 12;

    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [campaignToDelete, setCampaignToDelete] = useState<string | null>(null);

    const [editingCampaign, setEditingCampaign] = useState<any>(null);
    const [editForm, setEditForm] = useState({ title: '', description: '' });
    const [isSaving, setIsSaving] = useState(false);

    const fetchCampaigns = async () => {
        try {
            setLoading(true);
            const response = await campaignService.getCampaigns();
            const data = response.data.results || response.data;
            setCampaigns(data);
        } catch (error) {
            console.error("Failed to fetch campaigns", error);
            toast.error(t('adminCampaigns.toasts.fetchError'));
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchCampaigns();
    }, []);

    useEffect(() => {
        setCurrentPage(1);
    }, [searchQuery, statusFilter]);

    const filteredCampaigns = useMemo(() => {
        return campaigns.filter(campaign => {
            const matchesSearch = campaign.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                (campaign.description && campaign.description.toLowerCase().includes(searchQuery.toLowerCase()));
            const matchesStatus = statusFilter === 'ALL' || (statusFilter === 'active' ? campaign.project : !campaign.project);
            return matchesSearch && matchesStatus;
        }).sort((a, b) => {
            const dateA = new Date(a.created_at || 0).getTime();
            const dateB = new Date(b.created_at || 0).getTime();
            return sortOrder === 'newest' ? dateB - dateA : dateA - dateB;
        });
    }, [campaigns, searchQuery, sortOrder, statusFilter]);

    const paginatedCampaigns = useMemo(() => {
        const startIndex = (currentPage - 1) * pageSize;
        return filteredCampaigns.slice(startIndex, startIndex + pageSize);
    }, [filteredCampaigns, currentPage, pageSize]);

    const stats = useMemo(() => {
        const total = campaigns.length;
        const recent = campaigns.filter(c => {
            const diff = new Date().getTime() - new Date(c.created_at).getTime();
            return diff < (7 * 24 * 60 * 60 * 1000);
        }).length;
        const uniqueProjects = new Set(campaigns.map(c => c.project)).size;

        return { total, recent, uniqueProjects };
    }, [campaigns]);

    const handleDeleteClick = (id: any) => {
        setCampaignToDelete(id);
        setIsDeleteModalOpen(true);
    };

    const confirmDelete = async () => {
        if (!campaignToDelete) return;
        try {
            await campaignService.deleteCampaign(campaignToDelete);
            toast.success(t('adminCampaigns.toasts.deleteSuccess'));
            fetchCampaigns();
        } catch (error) {
            toast.error(t('adminCampaigns.toasts.deleteError'));
        } finally {
            setIsDeleteModalOpen(false);
            setCampaignToDelete(null);
        }
    };

    const handleEditClick = (campaign: any) => {
        setEditingCampaign(campaign);
        setEditForm({ title: campaign.title, description: campaign.description || '' });
    };

    const handleSaveEdit = async () => {
        if (!editForm.title.trim() || !editingCampaign) return;
        setIsSaving(true);
        try {
            await campaignService.updateCampaign(editingCampaign.id, {
                title: editForm.title,
                description: editForm.description,
            });
            toast.success(t('adminCampaigns.toasts.updateSuccess'));
            setEditingCampaign(null);
            fetchCampaigns();
        } catch (error) {
            toast.error(t('adminCampaigns.toasts.updateError'));
        } finally {
            setIsSaving(false);
        }
    };

    const columns = [
        {
            header: t('adminCampaigns.table.title'),
            accessor: (item: any) => (
                <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-purple-500/10 flex items-center justify-center text-purple-400 border border-purple-500/20 group-hover:scale-110 transition-transform">
                        <BookOpen className="w-5 h-5" />
                    </div>
                    <div className="flex flex-col gap-0.5">
                        <span className="font-bold text-white group-hover:text-purple-400 transition-colors tracking-tight text-base">{item.title}</span>
                        <span className="text-[10px] text-slate-500 font-medium tracking-widest">REF: #{String(item.id).substring(0, 8)}</span>
                    </div>
                </div>
            )
        },
        {
            header: t('adminCampaigns.table.description'),
            accessor: (item: any) => (
                <span className="text-slate-500 text-xs italic line-clamp-1 max-w-xs" title={item.description}>
                    {item.description || t('common.noDescription')}
                </span>
            )
        },
        {
            header: t('adminCampaigns.table.project'),
            accessor: (item: any) => (
                item.project_name ? (
                    <Link
                        to={`/admin/releases?search=${encodeURIComponent(item.project_name)}`}
                        className="inline-flex items-center gap-2 px-3 py-1 bg-blue-500/10 text-blue-400 border border-blue-500/20 rounded-full text-[9px] font-bold uppercase tracking-widest hover:bg-blue-500/20 transition-all"
                    >
                        <Rocket className="w-2.5 h-2.5" />
                        {item.project_name}
                    </Link>
                ) : <span className="text-slate-600 font-bold text-[9px] uppercase tracking-widest italic opacity-50">Aucun projet</span>
            )
        },
        {
            header: t('adminCampaigns.table.createdAt'),
            accessor: (item: any) => (
                <div className="flex flex-col gap-0.5">
                    <span className="text-slate-300 text-[11px] font-bold tracking-tight">{new Date(item.created_at).toLocaleDateString(t('common.dateLocale'))}</span>
                    <span className="text-[9px] text-slate-600 font-bold uppercase tracking-widest italic opacity-60">Enregistré</span>
                </div>
            )
        }
    ];

    return (
        <PageLayout
            title={t('adminCampaigns.title')}
            subtitle="CAMPAIGN REPOSITORY"
        >
            <div className="space-y-10">
                {/* Stats Summary */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                    <StatCard
                        title={t('adminCampaigns.stats.total')}
                        value={stats.total}
                        icon={Briefcase}
                        variant="blue"
                        description={t('adminCampaigns.stats.totalDesc')}
                        isLoading={loading}
                    />
                    <StatCard
                        title={t('adminCampaigns.stats.recent')}
                        value={stats.recent}
                        icon={Calendar}
                        variant="green"
                        description={t('adminCampaigns.stats.recentDesc')}
                        change={stats.recent > 0 ? `+${stats.recent}` : undefined}
                        changeType="positive"
                        isLoading={loading}
                    />
                    <StatCard
                        title={t('adminCampaigns.stats.projects')}
                        value={stats.uniqueProjects}
                        icon={Layers}
                        variant="purple"
                        description={t('adminCampaigns.stats.projectsDesc')}
                        isLoading={loading}
                    />
                    <StatCard
                        title={t('adminCampaigns.stats.status')}
                        value="LIVE"
                        icon={Rocket}
                        variant="blue"
                        description={t('adminCampaigns.stats.statusDesc')}
                        isLoading={loading}
                    />
                </div>

                {/* Filters & Table Card */}
                <AdminTable
                    columns={columns}
                    data={paginatedCampaigns}
                    isLoading={loading}
                    searchable
                    onSearch={setSearchQuery}
                    filters={
                        <div className="flex items-center gap-4">
                            <select
                                className="bg-transparent text-white text-[10px] font-bold uppercase tracking-widest px-4 py-2 h-10 outline-none w-full cursor-pointer appearance-none hover:bg-white/5 transition-all rounded-xl"
                                value={statusFilter}
                                onChange={(e) => setStatusFilter(e.target.value)}
                            >
                                <option value="ALL" className="bg-slate-900">{t('adminCampaigns.filters.all')}</option>
                                <option value="active" className="bg-slate-900">{t('adminCampaigns.filters.active')}</option>
                                <option value="inactive" className="bg-slate-900">{t('adminCampaigns.filters.inactive')}</option>
                            </select>
                            <select
                                className="bg-transparent text-white text-[10px] font-bold uppercase tracking-widest px-4 py-2 h-10 outline-none w-full cursor-pointer appearance-none hover:bg-white/5 transition-all rounded-xl"
                                value={sortOrder}
                                onChange={(e) => setSortOrder(e.target.value as 'newest' | 'oldest')}
                            >
                                <option value="newest" className="bg-slate-900">Plus récent</option>
                                <option value="oldest" className="bg-slate-900">Plus ancien</option>
                            </select>
                        </div>
                    }
                    actions={(item) => (
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => handleEditClick(item)}
                                className="p-2.5 bg-white/5 text-slate-400 hover:text-blue-400 hover:bg-blue-500/10 rounded-xl transition-all"
                                title={t('adminCampaigns.actions.edit')}
                            >
                                <Edit className="w-4 h-4" />
                            </button>
                            <button
                                onClick={() => handleDeleteClick(item.id)}
                                className="p-2.5 bg-white/5 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-xl transition-all"
                                title={t('adminCampaigns.actions.delete')}
                            >
                                <Trash2 className="w-4 h-4" />
                            </button>
                        </div>
                    )}
                />
                <div className="pt-6">
                    <Pagination
                        currentPage={currentPage}
                        totalItems={filteredCampaigns.length}
                        pageSize={pageSize}
                        onPageChange={setCurrentPage}
                        loading={loading}
                    />
                </div>
            </div>

            {/* Edit Modal */}
            <AnimatePresence>
                {editingCampaign && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 backdrop-blur-xl bg-black/60">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.9, y: 20 }}
                            className="relative w-full max-w-xl bg-[#0f172a] border border-white/10 rounded-[3rem] overflow-hidden shadow-2xl"
                        >
                            <div className="p-8 border-b border-white/5 flex justify-between items-center bg-gradient-to-r from-blue-600/10 to-transparent">
                                <div>
                                    <h2 className="text-2xl font-black text-white tracking-widest uppercase">{t('adminCampaigns.modal.editTitle')}</h2>
                                    <p className="text-[10px] font-black text-slate-500 mt-1 uppercase tracking-[0.2em]">Modifier les détails de la campagne</p>
                                </div>
                                <button
                                    onClick={() => setEditingCampaign(null)}
                                    className="p-3 bg-white/5 hover:bg-white/10 rounded-full text-slate-400 hover:text-white transition-all border border-white/5"
                                >
                                    <XCircle className="w-6 h-6" />
                                </button>
                            </div>

                            <div className="p-8 space-y-6">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">{t('adminCampaigns.modal.fieldTitle')}</label>
                                    <div className="relative group">
                                        <BookOpen className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500 group-focus-within:text-blue-500 transition-colors" />
                                        <input
                                            type="text"
                                            className="w-full bg-white/5 border border-white/10 rounded-2xl pl-16 pr-6 py-4 text-white focus:ring-2 focus:ring-blue-500/50 outline-none transition-all font-bold"
                                            value={editForm.title}
                                            onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                                        />
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">{t('adminCampaigns.modal.fieldDescription')}</label>
                                    <textarea
                                        className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-white focus:ring-2 focus:ring-blue-500/50 outline-none transition-all font-bold h-32 resize-none"
                                        value={editForm.description}
                                        onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                                    />
                                </div>

                                <div className="flex items-center justify-end gap-5 pt-6 border-t border-white/5">
                                    <button
                                        onClick={() => setEditingCampaign(null)}
                                        className="px-8 py-4 text-[10px] font-black uppercase tracking-widest text-slate-500 hover:text-white transition-all"
                                    >
                                        {t('adminCampaigns.modal.cancel')}
                                    </button>
                                    <button
                                        onClick={handleSaveEdit}
                                        disabled={!editForm.title.trim() || isSaving}
                                        className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white px-10 py-4 rounded-3xl font-black text-[10px] tracking-widest uppercase transition-all shadow-xl shadow-blue-900/40 active:scale-95 disabled:opacity-30"
                                    >
                                        {isSaving ? t('adminCampaigns.modal.saving') : t('adminCampaigns.modal.save')}
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            <ConfirmModal
                isOpen={isDeleteModalOpen}
                title={t('adminCampaigns.modal.deleteTitle')}
                message={t('adminCampaigns.modal.deleteConfirm')}
                onConfirm={confirmDelete}
                onCancel={() => setIsDeleteModalOpen(false)}
                confirmText={t('adminCampaigns.modal.delete')}
                type="danger"
            />
        </PageLayout >
    );
};

export default AdminCampaigns;
