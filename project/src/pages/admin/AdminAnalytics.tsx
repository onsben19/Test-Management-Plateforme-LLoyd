import React, { useState, useEffect, useMemo } from 'react';
import Header from '../../components/Header';
import Sidebar from '../../components/Sidebar';
import AdminTable from '../../components/AdminTable';
import api from '../../services/api';
import { useSidebar } from '../../context/SidebarContext';
import { Sparkles, MessageSquare, Trash2, Eye, Calendar, User } from 'lucide-react';
import { toast } from 'react-toastify';
import ConfirmModal from '../../components/ConfirmModal';
import Pagination from '../../components/Pagination';
import StatCard from '../../components/StatCard';

const AdminAnalytics = () => {
    const { isOpen } = useSidebar();
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

    useEffect(() => {
        setCurrentPage(1);
    }, [searchQuery]);

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
        }
    };

    const columns = [
        { header: 'ID', accessor: 'id' },
        {
            header: 'Utilisateur',
            accessor: (item: any) => (
                <div className="flex items-center gap-2">
                    <User className="w-3.5 h-3.5 text-slate-400" />
                    <span className="font-medium text-slate-700 dark:text-slate-300">{item.user_name || `User #${item.user}`}</span>
                </div>
            )
        },
        { header: 'Titre', accessor: 'title' },
        {
            header: 'Date',
            accessor: (item: any) => (
                <div className="flex items-center gap-2 text-slate-500">
                    <Calendar className="w-3.5 h-3.5" />
                    {new Date(item.created_at).toLocaleString('fr-FR')}
                </div>
            )
        }
    ];

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-900 transition-colors flex flex-col">
            <Header />
            <div className="flex flex-1 relative">
                <Sidebar />
                <main className={`flex-1 p-8 transition-all duration-300 ${isOpen ? 'lg:ml-64' : 'lg:ml-16'}`}>
                    <div className="max-w-7xl mx-auto">
                        <div className="mb-8">
                            <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-2 font-heading tracking-tight">Administration des Analytics</h1>
                            <p className="text-slate-500 dark:text-slate-400 text-sm">Suivi global de l'utilisation de l'agent IA par tous les utilisateurs</p>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                            <StatCard
                                title="Sessions Totales"
                                value={conversations.length}
                                icon={MessageSquare}
                                variant="blue"
                                description="Historique complet"
                                isLoading={loading}
                            />
                            <StatCard
                                title="Utilisateurs Actifs"
                                value={new Set(conversations.map(c => c.user)).size}
                                icon={User}
                                variant="purple"
                                description="Contributeurs IA"
                                isLoading={loading}
                            />
                            <StatCard
                                title="Messages Échangés"
                                value="N/A"
                                icon={Sparkles}
                                variant="green"
                                description="Volume d'interactions"
                                isLoading={loading}
                            />
                            <StatCard
                                title="Santé IA"
                                value="OK"
                                icon={Calendar}
                                variant="slate"
                                description="Disponibilité Groq"
                                isLoading={loading}
                            />
                        </div>

                        <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
                            <div className="xl:col-span-2">
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
                                                className="p-2 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-full text-slate-500 transition-colors"
                                                title="Consulter"
                                            >
                                                <Eye className="w-4 h-4" />
                                            </button>
                                            <button
                                                onClick={() => handleDeleteConv(item.id)}
                                                className="p-2 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-full text-slate-500 hover:text-red-600 transition-colors"
                                                title="Supprimer"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    )}
                                />
                                <div className="mt-6">
                                    <Pagination
                                        currentPage={currentPage}
                                        totalItems={filteredConversations.length}
                                        pageSize={pageSize}
                                        onPageChange={setCurrentPage}
                                        loading={loading}
                                    />
                                </div>
                            </div>

                            <div className="xl:col-span-1">
                                {selectedConv ? (
                                    <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 flex flex-col h-[600px] shadow-sm sticky top-24">
                                        <div className="p-4 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 rounded-t-xl">
                                            <div className="flex justify-between items-center mb-1">
                                                <span className="text-[10px] font-bold text-blue-500 uppercase tracking-widest">Conversation</span>
                                                <button onClick={() => setSelectedConv(null)} className="text-slate-400 hover:text-slate-600 text-[10px] font-bold">FERMER</button>
                                            </div>
                                            <h3 className="font-bold text-slate-900 dark:text-white truncate">{selectedConv.title}</h3>
                                            <p className="text-[10px] text-slate-500 mt-1 uppercase font-medium">Utilisateur : {selectedConv.user_name || 'Inconnu'}</p>
                                        </div>

                                        <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar bg-slate-50/30 dark:bg-transparent">
                                            {loadingMessages ? (
                                                <div className="flex justify-center py-10 italic text-slate-400 text-sm">Chargement de l'historique...</div>
                                            ) : messages.length === 0 ? (
                                                <div className="flex justify-center py-10 italic text-slate-400 text-sm">Aucun message dans cette session.</div>
                                            ) : messages.map((m, idx) => (
                                                <div key={idx} className={`flex flex-col ${m.sender === 'user' ? 'items-end' : 'items-start'}`}>
                                                    <span className="text-[9px] text-slate-400 mb-1 uppercase font-bold tracking-tighter">{m.sender === 'user' ? 'Utilisateur' : 'Agent IA'}</span>
                                                    <div className={`max-w-[90%] p-3 rounded-2xl text-sm ${m.sender === 'user'
                                                        ? 'bg-blue-600 text-white rounded-tr-none'
                                                        : 'bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-600 rounded-tl-none shadow-sm'
                                                        }`}>
                                                        <p className="whitespace-pre-wrap">{m.text}</p>
                                                        {m.sql && (
                                                            <div className="mt-2 pt-2 border-t border-slate-200/50 text-[10px] font-mono text-emerald-600 dark:text-emerald-400 opacity-80">
                                                                SQL: {m.sql.substring(0, 50)}...
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                ) : (
                                    <div className="bg-slate-100 dark:bg-slate-800/30 rounded-xl border border-dashed border-slate-300 dark:border-slate-700 p-12 text-center sticky top-24">
                                        <MessageSquare className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-4 opacity-50" />
                                        <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">Audit des conversations IA.</p>
                                        <p className="text-[10px] text-slate-400 mt-2 px-4 italic leading-relaxed">Sélectionnez une session pour auditer les requêtes et les réponses de l'agent.</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </main>
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
        </div>
    );
};

export default AdminAnalytics;
