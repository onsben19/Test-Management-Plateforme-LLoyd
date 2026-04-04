import React, { useEffect, useState, useMemo } from 'react';
import Header from '../../components/Header';
import Sidebar from '../../components/Sidebar';
import AdminTable from '../../components/AdminTable';
import { commentService } from '../../services/api';
import { toast } from 'react-toastify';
import { MessageSquare, Trash2, Calendar, Users, BarChart3, TrendingUp } from 'lucide-react';
import { useSidebar } from '../../context/SidebarContext';
import StatCard from '../../components/StatCard';
import Pagination from '../../components/Pagination';

const AdminComments = () => {
    const { isOpen } = useSidebar();
    const [comments, setComments] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const pageSize = 10;
    const [deleteModal, setDeleteModal] = useState({ isOpen: false, commentId: null });

    const fetchComments = async () => {
        try {
            const response = await commentService.getComments();
            const data = response.data.results || response.data;
            setComments(data);
        } catch (error) {
            console.error("Failed to fetch comments", error);
            toast.error("Erreur lors du chargement des commentaires");
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

    const handleDeleteClick = (id: any) => {
        setDeleteModal({ isOpen: true, commentId: id });
    };

    const confirmDelete = async () => {
        if (!deleteModal.commentId) return;

        try {
            await commentService.deleteComment(deleteModal.commentId);
            toast.success("Commentaire supprimé");
            fetchComments();
            setDeleteModal({ isOpen: false, commentId: null });
        } catch (error) {
            toast.error("Erreur lors de la suppression");
        }
    };

    const columns = [
        {
            header: 'Message',
            accessor: (item: any) => (
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded bg-slate-500/10 flex items-center justify-center text-slate-400">
                        <MessageSquare className="w-4 h-4" />
                    </div>
                    <span className="text-white truncate max-w-md block" title={item.message}>{item.message}</span>
                </div>
            )
        },
        {
            header: 'Auteur',
            accessor: (item: any) => item.author_name || item.author_username || item.author || 'Inconnu'
        },
        {
            header: 'Date',
            accessor: (item: any) => new Date(item.created_at).toLocaleDateString('fr-FR')
        }
    ];

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-900 transition-colors">
            <Header />
            <div className="flex relative">
                <Sidebar />
                <main className={`flex-1 p-8 transition-all duration-300 ${isOpen ? 'lg:ml-64' : 'lg:ml-16'}`}>
                    <div className="max-w-7xl mx-auto">
                        <div className="mb-8">
                            <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-2 font-heading tracking-tight">Journal des Commentaires</h1>
                            <p className="text-slate-500 dark:text-slate-400 text-sm">Gérez les échanges et retours d'expérience sur les tests de manière proactive</p>
                        </div>

                        {/* Summary Stats Grid */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                            <StatCard
                                title="Commentaires"
                                value={stats.total}
                                icon={MessageSquare}
                                variant="blue"
                                description="Total des échanges"
                            />
                            <StatCard
                                title="Contributeurs"
                                value={stats.uniqueAuthors}
                                icon={Users}
                                variant="purple"
                                description="Auteurs uniques"
                            />
                            <StatCard
                                title="Activité (24h)"
                                value={stats.recent}
                                icon={TrendingUp}
                                variant="green"
                                description="Nouveaux posts"
                                change={stats.recent > 0 ? `+${stats.recent}` : undefined}
                                changeType="positive"
                            />
                            <StatCard
                                title="Santé Sociale"
                                value="Stable"
                                icon={BarChart3}
                                variant="slate"
                                description="Modération optimale"
                            />
                        </div>

                        <AdminTable
                            columns={columns}
                            data={paginatedComments}
                            isLoading={loading}
                            searchable
                            onSearch={setSearchQuery}
                            actions={(item) => (
                                <button
                                    onClick={() => handleDeleteClick(item.id)}
                                    className="p-2 text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                                    title="Supprimer"
                                >
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            )}
                        />
                        <div className="mt-6">
                            <Pagination
                                currentPage={currentPage}
                                totalItems={filteredComments.length}
                                pageSize={pageSize}
                                onPageChange={setCurrentPage}
                                loading={loading}
                            />
                        </div>
                    </div>
                </main>
            </div>

            {/* Delete Confirmation Modal */}
            {deleteModal.isOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/80 backdrop-blur-sm animate-in fade-in">
                    <div className="bg-slate-800 border border-slate-700 rounded-xl p-6 max-w-sm w-full shadow-2xl animate-in zoom-in-95 duration-200">
                        <div className="flex flex-col items-center text-center">
                            <div className="w-12 h-12 rounded-full bg-red-500/10 flex items-center justify-center mb-4">
                                <Trash2 className="w-6 h-6 text-red-500" />
                            </div>
                            <h3 className="text-lg font-bold text-white mb-2">Supprimer le commentaire</h3>
                            <p className="text-slate-400 mb-6">
                                Êtes-vous sûr de vouloir supprimer ce commentaire ?
                            </p>
                            <div className="flex gap-3 w-full">
                                <button
                                    onClick={() => setDeleteModal({ isOpen: false, commentId: null })}
                                    className="flex-1 px-4 py-2 text-slate-300 hover:text-white hover:bg-slate-700 rounded-lg transition-colors"
                                >
                                    Annuler
                                </button>
                                <button
                                    onClick={confirmDelete}
                                    className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-colors"
                                >
                                    Supprimer
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdminComments;
