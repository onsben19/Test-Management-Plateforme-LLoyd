import React, { useEffect, useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import PageLayout from '../../components/PageLayout';
import AdminTable from '../../components/AdminTable';
import { commentService } from '../../services/api';
import { toast } from 'react-toastify';
import { MessageSquare, Trash2, Calendar, Users, BarChart3, TrendingUp, Search, User, Clock, ShieldCheck, XCircle } from 'lucide-react';
import StatCard from '../../components/StatCard';
import Pagination from '../../components/Pagination';
import ConfirmModal from '../../components/ConfirmModal';
import { motion, AnimatePresence } from 'framer-motion';

const AdminComments = () => {
    const { t } = useTranslation();
    const [comments, setComments] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const pageSize = 12;

    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [commentToDelete, setCommentToDelete] = useState<string | null>(null);

    const fetchComments = async () => {
        try {
            setLoading(true);
            const response = await commentService.getComments();
            const data = response.data.results || response.data;
            setComments(data);
        } catch (error) {
            console.error("Failed to fetch comments", error);
            toast.error(t('adminComments.toasts.fetchError'));
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchComments();
    }, []);

    useEffect(() => {
        setCurrentPage(1);
    }, [searchQuery]);

    const filteredComments = useMemo(() => {
        return comments.filter(c =>
            c.message.toLowerCase().includes(searchQuery.toLowerCase()) ||
            (c.author_name || c.author_username || '').toLowerCase().includes(searchQuery.toLowerCase())
        );
    }, [comments, searchQuery]);

    const paginatedComments = useMemo(() => {
        const startIndex = (currentPage - 1) * pageSize;
        return filteredComments.slice(startIndex, startIndex + pageSize);
    }, [filteredComments, currentPage, pageSize]);

    const stats = useMemo(() => {
        const total = comments.length;
        const recent = comments.filter(c => {
            const diff = new Date().getTime() - new Date(c.created_at).getTime();
            return diff < (24 * 60 * 60 * 1000);
        }).length;
        const uniqueAuthors = new Set(comments.map(c => c.author_username || c.author)).size;

        return { total, recent, uniqueAuthors };
    }, [comments]);

    const confirmDelete = async () => {
        if (!commentToDelete) return;
        try {
            await commentService.deleteComment(commentToDelete);
            toast.success(t('adminComments.toasts.deleteSuccess'));
            fetchComments();
        } catch (error) {
            toast.error(t('adminComments.toasts.deleteError'));
        } finally {
            setIsDeleteModalOpen(false);
            setCommentToDelete(null);
        }
    };

    const columns = [
        {
            header: t('adminComments.table.message'),
            accessor: (item: any) => (
                <div className="flex items-start gap-4 max-w-2xl group">
                    <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-400 border border-blue-500/20 group-hover:scale-110 transition-all shrink-0">
                        <MessageSquare className="w-5 h-5" />
                    </div>
                    <div className="space-y-1 py-1">
                        <span className="text-white text-sm font-bold leading-relaxed block group-hover:text-blue-400 transition-colors" title={item.message}>
                            {item.message}
                        </span>
                        <div className="flex items-center gap-2 text-[10px] text-slate-500 font-black uppercase tracking-widest">
                            <Clock className="w-3 h-3" />
                            {new Date(item.created_at).toLocaleTimeString(t('common.dateLocale'))}
                        </div>
                    </div>
                </div>
            )
        },
        {
            header: t('adminComments.table.author'),
            accessor: (item: any) => (
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-slate-400">
                        <User className="w-4 h-4" />
                    </div>
                    <div className="flex flex-col">
                        <span className="text-white text-xs font-black uppercase tracking-tighter">
                            {item.author_name || item.author_username || item.author || t('adminComments.unknown')}
                        </span>
                        <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Auditor</span>
                    </div>
                </div>
            )
        },
        {
            header: t('adminComments.table.date'),
            accessor: (item: any) => (
                <div className="flex flex-col">
                    <span className="text-white text-xs font-bold">{new Date(item.created_at).toLocaleDateString(t('common.dateLocale'))}</span>
                    <span className="text-[10px] text-slate-600 font-black uppercase tracking-widest">Signed</span>
                </div>
            )
        }
    ];

    return (
        <PageLayout
            title={t('adminComments.title')}
            subtitle="AUDIT LOGS & DISCUSSIONS"
        >
            <div className="space-y-10">
                {/* Stats Summary */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                    <StatCard
                        title={t('adminComments.stats.total')}
                        value={stats.total}
                        icon={MessageSquare}
                        variant="blue"
                        description={t('adminComments.stats.totalDesc')}
                        isLoading={loading}
                    />
                    <StatCard
                        title={t('adminComments.stats.authors')}
                        value={stats.uniqueAuthors}
                        icon={Users}
                        variant="purple"
                        description={t('adminComments.stats.authorsDesc')}
                        isLoading={loading}
                    />
                    <StatCard
                        title={t('adminComments.stats.activity')}
                        value={stats.recent}
                        icon={TrendingUp}
                        variant="green"
                        description={t('adminComments.stats.activityDesc')}
                        change={stats.recent > 0 ? `+${stats.recent}` : undefined}
                        changeType="positive"
                        isLoading={loading}
                    />
                    <StatCard
                        title={t('adminComments.stats.health')}
                        value="STABLE"
                        icon={ShieldCheck}
                        variant="blue"
                        description={t('adminComments.stats.healthDesc')}
                        isLoading={loading}
                    />
                </div>

                {/* Filters & Table Card */}
                <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-[3rem] overflow-hidden shadow-2xl">
                    <div className="p-8 border-b border-white/5 flex flex-col md:flex-row items-center gap-6">
                        <div className="relative flex-1 w-full group">
                            <Search className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500 group-focus-within:text-blue-500 transition-colors" />
                            <input
                                type="text"
                                placeholder={t('adminComments.searchPlaceholder') || "Search comments..."}
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full bg-white/5 border border-white/10 rounded-[1.5rem] pl-16 pr-8 py-4 text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all font-bold placeholder-slate-500"
                            />
                        </div>
                    </div>

                    <AdminTable
                        columns={columns}
                        data={paginatedComments}
                        isLoading={loading}
                        variant="transparent"
                        actions={(item) => (
                            <div className="flex items-center justify-end pr-8">
                                <button
                                    onClick={() => {
                                        setCommentToDelete(item.id);
                                        setIsDeleteModalOpen(true);
                                    }}
                                    className="p-3 bg-white/5 hover:bg-rose-500/10 text-slate-500 hover:text-rose-400 rounded-2xl transition-all border border-white/5 group"
                                    title={t('adminComments.modal.delete')}
                                >
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            </div>
                        )}
                    />
                </div>

                <div className="pt-6">
                    <Pagination
                        currentPage={currentPage}
                        totalItems={filteredComments.length}
                        pageSize={pageSize}
                        onPageChange={setCurrentPage}
                        loading={loading}
                    />
                </div>
            </div>

            {/* Modals */}
            <ConfirmModal
                isOpen={isDeleteModalOpen}
                title={t('adminComments.modal.deleteTitle')}
                message={t('adminComments.modal.deleteConfirm')}
                onConfirm={confirmDelete}
                onCancel={() => setIsDeleteModalOpen(false)}
                confirmText={t('adminComments.modal.delete')}
                type="danger"
            />
        </PageLayout>
    );
};

export default AdminComments;
