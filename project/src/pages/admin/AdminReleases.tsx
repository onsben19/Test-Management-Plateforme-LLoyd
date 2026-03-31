import React, { useEffect, useState } from 'react';
import Header from '../../components/Header';
import Sidebar from '../../components/Sidebar';
import AdminTable from '../../components/AdminTable';
import { projectService } from '../../services/api';
import { toast } from 'react-toastify';
import { Edit, Trash2, Layers } from 'lucide-react';
import { useLocation } from 'react-router-dom';
import { useSidebar } from '../../context/SidebarContext';

const AdminReleases = () => {
    const { isOpen } = useSidebar();
    const location = useLocation();
    const [releases, setReleases] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState(() => {
        const params = new URLSearchParams(location.search);
        return params.get('search') || '';
    });
    const [statusFilter, setStatusFilter] = useState('ALL');
    const [sortOrder, setSortOrder] = useState<'newest' | 'oldest'>('newest');

    // Modal State
    const [editingRelease, setEditingRelease] = useState<any>(null);
    const [editForm, setEditForm] = useState({
        name: '',
        description: '',
        status: 'ACTIVE'
    });

    const [deleteModal, setDeleteModal] = useState({ isOpen: false, releaseId: null });

    const fetchReleases = async () => {
        try {
            const response = await projectService.getProjects();
            setReleases(response.data);
        } catch (error) {
            console.error("Failed to fetch releases", error);
            toast.error("Erreur lors du chargement des releases");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchReleases();
    }, []);

    const filteredReleases = releases.filter(release => {
        const matchesSearch = release.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            (release.description && release.description.toLowerCase().includes(searchQuery.toLowerCase()));
        const matchesStatus = statusFilter === 'ALL' || release.status === statusFilter;
        return matchesSearch && matchesStatus;
    }).sort((a, b) => {
        const dateA = new Date(a.created_at).getTime();
        const dateB = new Date(b.created_at).getTime();
        return sortOrder === 'newest' ? dateB - dateA : dateA - dateB;
    });

    const resetForm = () => {
        setEditForm({ name: '', description: '', status: 'ACTIVE' });
        setEditingRelease(null);
    };

    const handleSaveRelease = async () => {
        if (!editForm.name || !editingRelease) return;
        try {
            await projectService.updateProject(editingRelease.id, editForm);
            toast.success("Release modifiée avec succès");
            resetForm();
            fetchReleases();
        } catch (error) {
            console.error("Failed to update release", error);
            toast.error("Erreur lors de la sauvegarde de la release");
        }
    };

    const handleEditClick = (release: any) => {
        setEditingRelease(release);
        setEditForm({
            name: release.name,
            description: release.description,
            status: release.status
        });
    };

    const handleDeleteClick = (id: any) => {
        setDeleteModal({ isOpen: true, releaseId: id });
    };

    const confirmDelete = async () => {
        if (!deleteModal.releaseId) return;

        try {
            await projectService.deleteProject(deleteModal.releaseId);
            toast.success("Release supprimée");
            fetchReleases();
            setDeleteModal({ isOpen: false, releaseId: null });
        } catch (error) {
            toast.error("Erreur lors de la suppression");
        }
    };

    const getStatusLabel = (status: string) => {
        switch (status) {
            case 'ACTIVE': return 'Actif';
            case 'PLANNING': return 'Planifié';
            case 'COMPLETED': return 'Terminé';
            default: return status;
        }
    };

    const columns = [
        {
            header: 'Nom',
            accessor: (item: any) => (
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded bg-blue-500/10 flex items-center justify-center text-blue-400">
                        <Layers className="w-4 h-4" />
                    </div>
                    <span className="font-medium text-white">{item.name}</span>
                </div>
            )
        },
        {
            header: 'Description',
            accessor: (item: any) => (
                <span className="truncate max-w-xs block text-slate-400" title={item.description}>
                    {item.description || '-'}
                </span>
            )
        },
        {
            header: 'Statut',
            accessor: (item: any) => (
                <span className={`px-2 py-1 rounded text-xs font-medium ${item.status === 'ACTIVE' ? 'bg-emerald-500/10 text-emerald-400' :
                    item.status === 'COMPLETED' ? 'bg-blue-500/10 text-blue-400' :
                        item.status === 'PLANNING' ? 'bg-violet-500/10 text-violet-400' :
                            'bg-slate-500/10 text-slate-400'
                    }`}>
                    {getStatusLabel(item.status)}
                </span>
            )
        },
        {
            header: 'Créé par',
            accessor: 'created_by_username'
        },
        {
            header: 'Date de création',
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
                        <AdminTable
                            title="Administration des Releases"
                            columns={columns}
                            data={releases}
                            isLoading={loading}
                            searchable
                            onSearch={setSearchQuery}
                            filters={
                                <div className="flex items-center gap-2">
                                    <select
                                        className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                                        value={statusFilter}
                                        onChange={(e) => setStatusFilter(e.target.value)}
                                    >
                                        <option value="ALL">Tous les statuts</option>
                                        <option value="ACTIVE">Actif</option>
                                        <option value="PLANNING">Planifié</option>
                                        <option value="COMPLETED">Terminé</option>
                                    </select>
                                    <select
                                        className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                                        value={sortOrder}
                                        onChange={(e) => setSortOrder(e.target.value as 'newest' | 'oldest')}
                                    >
                                        <option value="newest">Plus récents</option>
                                        <option value="oldest">Plus anciens</option>
                                    </select>
                                </div>
                            }
                            actions={(item) => (
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={() => handleEditClick(item)}
                                        className="p-2 text-slate-400 hover:text-blue-400 hover:bg-blue-500/10 rounded-lg transition-colors"
                                        title="Modifier"
                                    >
                                        <Edit className="w-4 h-4" />
                                    </button>
                                    <button
                                        onClick={() => handleDeleteClick(item.id)}
                                        className="p-2 text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                                        title="Supprimer"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            )}
                        />
                    </div>
                </main>
            </div>

            {/* Edit Release Modal */}
            {editingRelease && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/80 backdrop-blur-sm animate-in fade-in">
                    <div className="bg-slate-800 border border-slate-700 rounded-xl p-6 max-w-lg w-full shadow-2xl animate-in zoom-in-95 duration-200">
                        <h2 className="text-xl font-bold text-white mb-6">
                            Modifier la Release
                        </h2>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-400 mb-1">Nom de la Release</label>
                                <input
                                    type="text"
                                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                                    value={editForm.name}
                                    onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-400 mb-1">Description</label>
                                <textarea
                                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white focus:ring-2 focus:ring-blue-500 outline-none transition-all h-24 resize-none"
                                    value={editForm.description}
                                    onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-400 mb-1">Statut</label>
                                <select
                                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                                    value={editForm.status}
                                    onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}
                                >
                                    <option value="ACTIVE">Actif</option>
                                    <option value="PLANNING">Planifié</option>
                                    <option value="COMPLETED">Terminé</option>
                                </select>
                            </div>
                        </div>

                        <div className="flex justify-end gap-3 mt-8">
                            <button
                                onClick={resetForm}
                                className="px-4 py-2 text-slate-300 hover:text-white hover:bg-slate-700 rounded-lg transition-colors"
                            >
                                Annuler
                            </button>
                            <button
                                onClick={handleSaveRelease}
                                disabled={!editForm.name}
                                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-all shadow-lg shadow-blue-900/20"
                            >
                                Enregistrer
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Delete Confirmation Modal */}
            {deleteModal.isOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/80 backdrop-blur-sm animate-in fade-in">
                    <div className="bg-slate-800 border border-slate-700 rounded-xl p-6 max-w-sm w-full shadow-2xl animate-in zoom-in-95 duration-200">
                        <div className="flex flex-col items-center text-center">
                            <div className="w-12 h-12 rounded-full bg-red-500/10 flex items-center justify-center mb-4">
                                <Trash2 className="w-6 h-6 text-red-500" />
                            </div>
                            <h3 className="text-lg font-bold text-white mb-2">Supprimer la release</h3>
                            <p className="text-slate-400 mb-6">
                                Êtes-vous sûr de vouloir supprimer cette release ?
                            </p>
                            <div className="flex gap-3 w-full">
                                <button
                                    onClick={() => setDeleteModal({ isOpen: false, releaseId: null })}
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

export default AdminReleases;
