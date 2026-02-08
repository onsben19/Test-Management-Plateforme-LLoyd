import React, { useEffect, useState } from 'react';
import Header from '../../components/Header';
import Sidebar from '../../components/Sidebar';
import AdminTable from '../../components/AdminTable';
import { commentService } from '../../services/api';
import { toast } from 'react-toastify';
import { MessageSquare, Trash2 } from 'lucide-react';

const AdminComments = () => {
    const [comments, setComments] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [deleteModal, setDeleteModal] = useState({ isOpen: false, commentId: null });

    const fetchComments = async () => {
        try {
            const response = await commentService.getComments();
            setComments(response.data);
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

    const filteredComments = comments.filter(comment => {
        const matchesSearch = (comment.message || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
            (comment.author_username || comment.author || '').toLowerCase().includes(searchQuery.toLowerCase());
        return matchesSearch;
    });

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
            accessor: (item: any) => item.author_username || item.author || 'Inconnu'
        },
        {
            header: 'Date',
            accessor: (item: any) => new Date(item.created_at).toLocaleDateString('fr-FR')
        }
    ];

    return (
        <div className="min-h-screen bg-slate-900">
            <Header />
            <div className="flex">
                <Sidebar />
                <main className="flex-1 lg:ml-64 relative p-8">
                    <div className="max-w-7xl mx-auto">
                        <AdminTable
                            title="Administration des Commentaires"
                            columns={columns}
                            data={comments}
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
