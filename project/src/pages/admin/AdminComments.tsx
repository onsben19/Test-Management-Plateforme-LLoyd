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

                <div className="grid grid-cols-12 gap-6 h-[600px]">
                    {/* Sidebar: List of conversations */}
                    <div className="col-span-4 bg-[#0b0e14]/60 border border-white/[0.03] rounded-[2rem] overflow-hidden flex flex-col">
                        <div className="p-4 border-b border-white/5 bg-white/[0.01]">
                            <h3 className="text-sm font-black text-white uppercase tracking-widest">Discussions</h3>
                        </div>
                        <div className="flex-1 overflow-y-auto p-2 space-y-2">
                            {groupedConversations.map(conv => (
                                <div
                                    key={conv.id}
                                    onClick={() => setActiveConversationId(conv.id)}
                                    className={`p-4 rounded-xl cursor-pointer transition-all ${activeConversationId === conv.id ? 'bg-blue-500/10 border border-blue-500/20' : 'hover:bg-white/5 border border-transparent'}`}
                                >
                                    <div className="flex justify-between items-center mb-1">
                                        <span className="text-xs font-black text-white uppercase truncate">
                                            {conv.id === 'general' ? 'Général' : `Cas de Test #${conv.id}`}
                                        </span>
                                        <span className="text-[10px] text-slate-500 font-bold">
                                            {new Date(conv.lastMessage.created_at).toLocaleDateString()}
                                        </span>
                                    </div>
                                    <p className="text-xs text-slate-400 truncate">"{conv.lastMessage.message}"</p>
                                    <div className="flex justify-between items-center mt-2">
                                        <span className="text-[9px] text-slate-600 font-bold uppercase tracking-widest">
                                            {conv.lastMessage.author_name || conv.lastMessage.author_username}
                                        </span>
                                        <span className="px-2 py-0.5 bg-white/5 rounded-full text-[9px] font-bold text-slate-400">
                                            {conv.count} msg
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Main Area: Messages */}
                    <div className="col-span-8 bg-[#0b0e14]/60 border border-white/[0.03] rounded-[2rem] overflow-hidden flex flex-col">
                        {activeConversationId ? (
                            <>
                                <div className="p-4 border-b border-white/5 bg-white/[0.01] flex justify-between items-center">
                                    <div>
                                        <h3 className="text-sm font-black text-white uppercase tracking-widest">
                                            {activeConversationId === 'general' ? 'Général' : `Cas de Test #${activeConversationId}`}
                                        </h3>
                                        <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-0.5">Fil de discussion</p>
                                    </div>
                                </div>
                                <div className="flex-1 overflow-y-auto p-6 space-y-6">
                                    {groupedConversations.find(c => c.id === activeConversationId)?.messages.map((msg, idx) => (
                                        <div key={idx} className="flex gap-4 items-start">
                                            <div className="w-8 h-8 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-slate-400 shrink-0">
                                                <User className="w-4 h-4" />
                                            </div>
                                            <div className="flex-1 bg-white/[0.02] border border-white/5 rounded-2xl p-4 space-y-1">
                                                <div className="flex justify-between items-center">
                                                    <span className="text-xs font-black text-white uppercase">
                                                        {msg.author_name || msg.author_username || msg.author}
                                                    </span>
                                                    <span className="text-[10px] text-slate-500 font-bold">
                                                        {new Date(msg.created_at).toLocaleString()}
                                                    </span>
                                                </div>
                                                <p className="text-sm text-slate-300 leading-relaxed">{msg.message}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </>
                        ) : (
                            <div className="flex-1 flex flex-col items-center justify-center text-slate-500 gap-4">
                                <MessageSquare className="w-12 h-12 opacity-20" />
                                <p className="text-sm font-bold uppercase tracking-widest opacity-50">Sélectionnez une discussion</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </PageLayout>
    );
};

export default AdminComments;
