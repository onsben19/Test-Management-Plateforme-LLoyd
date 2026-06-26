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
    const [activeConversationId, setActiveConversationId] = useState<string | null>(null);

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

    const groupedConversations = useMemo(() => {
        const groups: Record<string, any[]> = {};
        filteredComments.forEach(c => {
            const key = c.test_case_id || 'general';
            if (!groups[key]) groups[key] = [];
            groups[key].push(c);
        });
        return Object.entries(groups).map(([key, msgs]) => ({
            id: key,
            test_case_id: key === 'general' ? null : key,
            messages: msgs.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()),
            lastMessage: msgs[msgs.length - 1],
            count: msgs.length
        })).sort((a, b) => new Date(b.lastMessage.created_at).getTime() - new Date(a.lastMessage.created_at).getTime());
    }, [filteredComments]);

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



    const conversationColumns = [
        {
            header: 'ID',
            accessor: (item: any) => <span className="font-mono text-[10px] text-slate-500">{String(item.id).substring(0, 8)}</span>
        },
        {
            header: 'Discussion / Contexte',
            accessor: (conv: any) => (
                <div className="flex flex-col gap-0.5">
                    <span className="text-[14px] font-bold text-slate-900 dark:text-white tracking-tight uppercase">
                        {conv.id === 'general' ? 'Fil de discussion Général' : `Cas de Test #${conv.id}`}
                    </span>
                    <p className="text-[11px] text-slate-500 font-medium line-clamp-1 italic">
                        "{conv.lastMessage.message}"
                    </p>
                </div>
            )
        },
        {
            header: 'Dernier Intervenant',
            accessor: (conv: any) => (
                <div className="flex flex-col">
                    <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-widest">
                        {conv.lastMessage.author_name || conv.lastMessage.author_username}
                    </span>
                    <span className="text-[9px] text-slate-500 font-medium">
                        {new Date(conv.lastMessage.created_at).toLocaleString()}
                    </span>
                </div>
            )
        },
        {
            header: 'Volume',
            accessor: (conv: any) => (
                <div className="inline-flex items-center gap-2 px-2.5 py-1 bg-slate-100 dark:bg-white/5 rounded-full border border-slate-200 dark:border-white/5">
                    <span className="text-[10px] font-bold text-blue-400">{conv.count}</span>
                    <span className="text-[9px] font-black text-slate-600 uppercase tracking-tighter">Messages</span>
                </div>
            )
        }
    ];

    return (
        <PageLayout
            title={t('adminComments.title')}
            subtitle={t('adminComments.subtitle')}
        >
            <div className="space-y-10">
                {/* Stats Summary */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                    <StatCard
                        title={t('adminComments.stats.total')}
                        value={stats.total}
                        variant="blue"
                        description={t('adminComments.stats.totalDesc')}
                        isLoading={loading}
                    />
                    <StatCard
                        title={t('adminComments.stats.authors')}
                        value={stats.uniqueAuthors}
                        variant="purple"
                        description={t('adminComments.stats.authorsDesc')}
                        isLoading={loading}
                    />
                    <StatCard
                        title={t('adminComments.stats.activity')}
                        value={stats.recent}
                        variant="green"
                        description={t('adminComments.stats.activityDesc')}
                        change={stats.recent > 0 ? `+${stats.recent}` : undefined}
                        changeType="positive"
                        isLoading={loading}
                    />
                    <StatCard
                        title={t('adminComments.stats.health')}
                        value="STABLE"
                        variant="blue"
                        description={t('adminComments.stats.healthDesc')}
                        isLoading={loading}
                    />
                </div>

                <div className="bg-slate-50 dark:bg-[#0b0e14]/40 border border-slate-200 dark:border-white/[0.03] rounded-[2.5rem] overflow-hidden">
                    <AdminTable
                        columns={conversationColumns}
                        data={groupedConversations}
                        isLoading={loading}
                        searchable
                        onSearch={setSearchQuery}
                        onRowClick={(conv) => setActiveConversationId(conv.id)}
                        variant="transparent"
                    />
                </div>

                {/* Conversation Modal */}
                <AnimatePresence>
                    {activeConversationId && (
                        <div className="fixed inset-0 z-50 flex items-center justify-end bg-slate-200/60 dark:bg-slate-900/40 backdrop-blur-sm">
                            <motion.div
                                initial={{ x: '100%' }}
                                animate={{ x: 0 }}
                                exit={{ x: '100%' }}
                                transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                                className="w-full max-w-2xl h-full bg-slate-50 dark:bg-[#0b0e14] border-l border-slate-200 dark:border-white/5 shadow-2xl flex flex-col"
                            >
                                <div className="p-8 border-b border-slate-200 dark:border-white/5 flex justify-between items-center bg-slate-50 dark:bg-white/[0.01]">
                                    <div>
                                        <h2 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tighter">
                                            {activeConversationId === 'general' ? 'Discussion Générale' : `Audit Cas de Test #${activeConversationId}`}
                                        </h2>
                                        <p className="text-[10px] text-slate-500 font-bold uppercase tracking-[0.2em] mt-1">
                                            Fil de discussion complet
                                        </p>
                                    </div>
                                    <button
                                        onClick={() => setActiveConversationId(null)}
                                        className="p-3 hover:bg-slate-100 dark:bg-white/5 rounded-full text-slate-400 transition-colors"
                                    >
                                        <XCircle className="w-6 h-6" />
                                    </button>
                                </div>

                                <div className="flex-1 overflow-y-auto p-8 space-y-8 scrollbar-hide">
                                    {groupedConversations.find(c => c.id === activeConversationId)?.messages.map((msg, idx) => (
                                        <div key={idx} className="flex flex-col gap-2">
                                            <div className="flex justify-between items-end px-2">
                                                <span className="text-[10px] font-black text-blue-500 uppercase tracking-widest">
                                                    {msg.author_name || msg.author_username || msg.author}
                                                </span>
                                                <span className="text-[9px] text-slate-600 font-medium">
                                                    {new Date(msg.created_at).toLocaleString()}
                                                </span>
                                            </div>
                                            <div className="bg-slate-50 dark:bg-white/[0.02] border border-slate-200 dark:border-white/5 rounded-[1.5rem] p-5 shadow-sm">
                                                <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed font-medium">
                                                    {msg.message}
                                                </p>
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                <div className="p-8 border-t border-slate-200 dark:border-white/5 bg-slate-50 dark:bg-white/[0.01]">
                                    <p className="text-center text-[10px] text-slate-600 font-bold uppercase tracking-widest italic">
                                        Mode consultation admin - discussions archivées & actives
                                    </p>
                                </div>
                            </motion.div>
                        </div>
                    )}
                </AnimatePresence>
            </div>
        </PageLayout>
    );
};

export default AdminComments;
