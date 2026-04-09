import React, { useState, useEffect, useMemo } from 'react';
import PageLayout from '../../components/PageLayout';
import AdminTable from '../../components/AdminTable';
import api from '../../services/api';
import { useTranslation } from 'react-i18next';
import { Sparkles, MessageSquare, Trash2, Eye, Calendar, User, Clock, Zap, X, Database } from 'lucide-react';
import { toast } from 'react-toastify';
import ConfirmModal from '../../components/ConfirmModal';
import Pagination from '../../components/Pagination';
import StatCard from '../../components/StatCard';
import { motion, AnimatePresence } from 'framer-motion';

const AdminAnalytics = () => {
    const { t } = useTranslation();
    const [conversations, setConversations] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedConv, setSelectedConv] = useState<any | null>(null);
    const [messages, setMessages] = useState<any[]>([]);
    const [loadingMessages, setLoadingMessages] = useState(false);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [convToDelete, setConvToDelete] = useState<string | null>(null);
    const [currentPage, setCurrentPage] = useState(1);
    const pageSize = 10;

    const fetchConversations = async () => {
        try {
            setLoading(true);
            const response = await api.get('/analytics/conversations/');
            const data = response.data.results || response.data;
            setConversations(Array.isArray(data) ? data : []);
        } catch (error) {
            console.error("Failed to fetch conversations", error);
            toast.error("Erreur lors de la récupération des conversations.");
        } finally {
            setLoading(false);
        }
    };

    const fetchMessages = async (id: string) => {
        try {
            setLoadingMessages(true);
            const response = await api.get(`/analytics/conversations/${id}/messages/`);
            const data = response.data.results || response.data;
            setMessages(Array.isArray(data) ? data : []);
        } catch (error) {
            console.error("Failed to fetch messages", error);
        } finally {
            setLoadingMessages(false);
        }
    };

    useEffect(() => {
        fetchConversations();
    }, []);

    const filteredConversations = useMemo(() => {
        return conversations.filter(c =>
            c.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            (c.user_name || '').toLowerCase().includes(searchQuery.toLowerCase())
        );
    }, [conversations, searchQuery]);

    const paginatedConversations = useMemo(() => {
        const startIndex = (currentPage - 1) * pageSize;
        return filteredConversations.slice(startIndex, startIndex + pageSize);
    }, [filteredConversations, currentPage, pageSize]);

    const handleSelectConv = (conv: any) => {
        setSelectedConv(conv);
        fetchMessages(conv.id);
    };

    const handleDeleteConv = async (id: string) => {
        setConvToDelete(id);
        setIsDeleteModalOpen(true);
    };

    const confirmDeleteConv = async () => {
        if (!convToDelete) return;
        try {
            await api.delete(`/analytics/conversations/${convToDelete}/`);
            setConversations(prev => prev.filter(c => c.id !== convToDelete));
            if (selectedConv?.id === convToDelete) setSelectedConv(null);
            toast.success("Session supprimée.");
        } catch {
            toast.error("Erreur lors de la suppression.");
        } finally {
            setConvToDelete(null);
            setIsDeleteModalOpen(false);
        }
    };

    const columns = [
        {
            header: 'ID',
            accessor: (item: any) => <span className="font-mono text-[10px] text-slate-500">#{String(item.id).substring(0, 8)}</span>
        },
        {
            header: 'Utilisateur',
            accessor: (item: any) => (
                <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-400 border border-blue-500/20 group-hover:scale-110 transition-transform">
                        <User className="w-5 h-5" />
                    </div>
                    <div className="flex flex-col gap-0.5">
                        <span className="font-bold text-white group-hover:text-blue-400 transition-colors tracking-tight text-base">{item.user_name || `User #${item.user}`}</span>
                        <span className="text-[10px] text-slate-500 font-medium">ID: #{String(item.id).substring(0, 8)}</span>
                    </div>
                </div>
            )
        },
        {
            header: 'Titre de la Session',
            accessor: (item: any) => (
                <span className="font-bold text-xs text-slate-400 group-hover:text-white transition-colors uppercase tracking-widest line-clamp-1">
                    {item.title}
                </span>
            )
        },
        {
            header: 'Date d\'Analyse',
            accessor: (item: any) => (
                <div className="flex flex-col gap-0.5">
                    <div className="flex items-center gap-2 text-slate-500 font-bold text-[10px] uppercase tracking-widest">
                        <Calendar className="w-3.5 h-3.5 opacity-60 text-blue-500" />
                        {new Date(item.created_at).toLocaleDateString('fr-FR')}
                    </div>
                    <div className="flex items-center gap-2 text-slate-600 font-medium text-[9px] lowercase italic pl-5">
                        {new Date(item.created_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                    </div>
                </div>
            )
        }
    ];

    return (
        <PageLayout
            title={t('analytics.title')}
            subtitle="Audit & Performance"
        >
            <div className="space-y-8">
                {/* Stats Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                    <StatCard
                        title={t('analytics.stats.totalSessions')}
                        value={conversations.length}
                        icon={MessageSquare}
                        variant="blue"
                        description={t('analytics.stats.history')}
                        isLoading={loading}
                    />
                    <StatCard
                        title={t('analytics.stats.activeUsers')}
                        value={new Set(conversations.map(c => c.user)).size}
                        icon={User}
                        variant="purple"
                        description={t('analytics.stats.contributors')}
                        isLoading={loading}
                    />
                    <StatCard
                        title={t('analytics.stats.totalMessages')}
                        value={conversations.reduce((acc, conv) => acc + (conv.messages?.length || 0), 0)}
                        icon={Zap}
                        variant="green"
                        description={t('analytics.stats.totalInteractions')}
                        isLoading={loading}
                    />
                    <StatCard
                        title={t('analytics.stats.avgResponseTime')}
                        value="1.2s"
                        icon={Clock}
                        variant="yellow"
                        description={t('analytics.stats.efficiency')}
                        isLoading={loading}
                    />
                </div>

                <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
                    <div className="xl:col-span-2 space-y-6">
                        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-[2.5rem] overflow-hidden shadow-2xl">
                            <AdminTable
                                columns={columns}
                                data={paginatedConversations}
                                isLoading={loading}
                                searchable
                                onSearch={setSearchQuery}
                                actions={(item) => (
                                    <div className="flex items-center gap-2">
                                        <button
                                            onClick={() => handleSelectConv(item)}
                                            className={`p-2.5 rounded-xl transition-all ${selectedConv?.id === item.id ? 'bg-blue-600 text-white' : 'bg-white/5 text-slate-400 hover:text-white hover:bg-white/10'}`}
                                            title="Consulter"
                                        >
                                            <Eye className="w-4 h-4" />
                                        </button>
                                        <button
                                            onClick={() => handleDeleteConv(item.id)}
                                            className="p-2.5 bg-white/5 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-xl transition-all"
                                            title="Supprimer"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                )}
                            />
                        </div>
                        <Pagination
                            currentPage={currentPage}
                            totalItems={filteredConversations.length}
                            pageSize={pageSize}
                            onPageChange={setCurrentPage}
                            loading={loading}
                        />
                    </div>

                    <div className="xl:col-span-1">
                        <AnimatePresence mode="wait">
                            {selectedConv ? (
                                <motion.div
                                    key={selectedConv.id}
                                    initial={{ opacity: 0, x: 20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: 20 }}
                                    className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-[2.5rem] flex flex-col h-[700px] shadow-2xl sticky top-24 overflow-hidden"
                                >
                                    <div className="p-8 border-b border-white/5 bg-gradient-to-r from-blue-600/10 to-transparent">
                                        <div className="flex justify-between items-center mb-4">
                                            <span className="text-[10px] font-bold text-blue-500 uppercase tracking-widest bg-blue-500/10 px-3 py-1 rounded-full border border-blue-500/20">Audit Session</span>
                                            <button onClick={() => setSelectedConv(null)} className="p-2 hover:bg-white/5 rounded-full text-slate-400 transition-colors">
                                                <X className="w-5 h-5" />
                                            </button>
                                        </div>
                                        <h3 className="text-xl font-bold text-white truncate tracking-tight">{selectedConv.title}</h3>
                                        <div className="flex items-center gap-2 mt-3 text-[10px] text-slate-500 uppercase font-bold tracking-widest">
                                            <User className="w-3 h-3 text-blue-400" />
                                            {selectedConv.user_name || 'Inconnu'}
                                        </div>
                                    </div>

                                    <div className="flex-1 overflow-y-auto p-8 space-y-6 custom-scrollbar">
                                        {loadingMessages ? (
                                            <div className="flex flex-col items-center justify-center py-20 gap-4">
                                                <div className="w-10 h-10 border-4 border-blue-500/20 border-t-blue-500 rounded-full animate-spin" />
                                                <span className="text-xs font-bold text-slate-500 uppercase tracking-widest italic">Chargement...</span>
                                            </div>
                                        ) : messages.length === 0 ? (
                                            <div className="flex flex-col items-center justify-center py-20 text-center opacity-50">
                                                <MessageSquare className="w-12 h-12 text-slate-600 mb-4" />
                                                <span className="text-sm font-bold text-slate-500 italic">Aucun message</span>
                                            </div>
                                        ) : messages.map((m, idx) => (
                                            <div key={idx} className={`flex flex-col ${m.sender === 'user' ? 'items-end' : 'items-start'}`}>
                                                <span className="text-[9px] text-slate-500 mb-2 uppercase font-bold tracking-widest opacity-70">
                                                    {m.sender === 'user' ? 'Utilisateur' : 'Agent IA'}
                                                </span>
                                                <div className={`max-w-[90%] p-4 rounded-3xl text-sm leading-relaxed shadow-lg ${m.sender === 'user'
                                                    ? 'bg-blue-600 text-white rounded-tr-none'
                                                    : 'bg-white/5 text-slate-200 border border-white/10 rounded-tl-none'
                                                    }`}>
                                                    <p className="whitespace-pre-wrap font-medium">{m.text}</p>
                                                    {m.sql && (
                                                        <div className="mt-4 pt-4 border-t border-white/5">
                                                            <div className="flex items-center gap-2 mb-2">
                                                                <Database className="w-3 h-3 text-emerald-400" />
                                                                <span className="text-[8px] font-bold text-emerald-400 uppercase tracking-widest">SQL Query</span>
                                                            </div>
                                                            <code className="text-[10px] font-mono text-emerald-400/80 bg-emerald-500/5 p-2 rounded-lg block overflow-x-auto">
                                                                {m.sql}
                                                            </code>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </motion.div>
                            ) : (
                                <div className="bg-white/5 border border-dashed border-white/10 rounded-[2.5rem] p-16 text-center sticky top-24 flex flex-col items-center justify-center min-h-[500px]">
                                    <div className="w-20 h-20 bg-blue-500/10 rounded-full flex items-center justify-center mb-8 relative">
                                        <Sparkles className="w-10 h-10 text-blue-500/40" />
                                        <div className="absolute inset-0 bg-blue-500/20 blur-2xl rounded-full scale-150 animate-pulse" />
                                    </div>
                                    <h3 className="text-xl font-bold text-slate-400 uppercase tracking-widest mb-4">Audit des conversations</h3>
                                    <p className="text-sm font-medium text-slate-500 max-w-[250px] leading-relaxed italic">
                                        Sélectionnez une session dans le tableau pour analyser les interactions et les performances de l'agent.
                                    </p>
                                </div>
                            )}
                        </AnimatePresence>
                    </div>
                </div>
            </div>

            <ConfirmModal
                isOpen={isDeleteModalOpen}
                title="Supprimer la session d'analyse"
                message="Êtes-vous sûr de vouloir supprimer définitivement cette session d'analyse ? Toutes les requêtes et réponses associées seront perdues."
                onConfirm={confirmDeleteConv}
                onCancel={() => setIsDeleteModalOpen(false)}
                confirmText="Supprimer"
                type="danger"
            />
        </PageLayout>
    );
};

export default AdminAnalytics;
