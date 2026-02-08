import React, { useEffect, useState } from 'react';
import Header from '../../components/Header';
import Sidebar from '../../components/Sidebar';
import AdminTable from '../../components/AdminTable';
import { projectService } from '../../services/api';
import { toast } from 'react-toastify';
import { Edit, Trash2, Layers } from 'lucide-react';

const AdminReleases = () => {
    const [releases, setReleases] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState('ALL');
    const [sortOrder, setSortOrder] = useState<'newest' | 'oldest'>('newest');

    // Modal State
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingRelease, setEditingRelease] = useState<any>(null);
    const [newRelease, setNewRelease] = useState({
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
        setNewRelease({ name: '', description: '', status: 'ACTIVE' });
        setEditingRelease(null);
        setIsModalOpen(false);
    };

    const handleSaveRelease = async () => {
        if (!newRelease.name) return;

        try {
            if (editingRelease) {
                // UPDATE
                await projectService.updateProject(editingRelease.id, newRelease);
                toast.success("Release modifiée avec succès");
            } else {
                // CREATE
                await projectService.createProject(newRelease);
                toast.success("Release créée avec succès");
            }
            resetForm();
            fetchReleases();
        } catch (error) {
            console.error("Failed to save release", error);
            toast.error("Erreur lors de la sauvegarde de la release");
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
            case 'ACTIVE': return 'Activé';
            case 'PLANNING': return 'Planning';
            case 'COMPLETED': return 'Terminé';
            case 'ARCHIVED': return 'Archivé';
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
        <div className="min-h-screen bg-slate-900">
            <Header />
            <div className="flex">
                <Sidebar />
                <main className="flex-1 lg:ml-64 relative p-8">
                    <div className="max-w-7xl mx-auto">
                        <AdminTable
                            title="Administration des Releases"
                            columns={columns}
                            data={releases}
                            isLoading={loading}
                            onAdd={() => { resetForm(); setIsModalOpen(true); }}
                            addButtonLabel="Nouvelle Release"
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
                                        <option value="ACTIVE">Activé</option>
                                        <option value="COMPLETED">Terminé</option>
                                        <option value="ARCHIVED">Archivé</option>
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

            {/* Add/Edit Release Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/80 backdrop-blur-sm animate-in fade-in">
                    <div className="bg-slate-800 border border-slate-700 rounded-xl p-6 max-w-lg w-full shadow-2xl animate-in zoom-in-95 duration-200">
                        <h2 className="text-xl font-bold text-white mb-6">
                            {editingRelease ? 'Modifier la Release' : 'Créer une nouvelle Release'}
                        </h2>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-400 mb-1">Nom de la Release</label>
                                <input
                                    type="text"
                                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                                    placeholder="Ex: Release Q3 2024"
                                    value={newRelease.name}
                                    onChange={(e) => setNewRelease({ ...newRelease, name: e.target.value })}
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-400 mb-1">Description</label>
                                <textarea
                                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white focus:ring-2 focus:ring-blue-500 outline-none transition-all h-24 resize-none"
                                    placeholder="Description des objectifs de la release..."
                                    value={newRelease.description}
                                    onChange={(e) => setNewRelease({ ...newRelease, description: e.target.value })}
                                />
                            </div>

                            <div className="grid grid-cols-1 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-400 mb-1">Statut Initial</label>
                                    <select
                                        className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                                        value={newRelease.status}
                                        onChange={(e) => setNewRelease({ ...newRelease, status: e.target.value })}
                                    >
                                        <option value="ACTIVE">Activé</option>
                                        <option value="COMPLETED">Terminé</option>
                                        <option value="ARCHIVED">Archivé</option>
                                    </select>
                                </div>
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
                                disabled={!newRelease.name}
                                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-all shadow-lg shadow-blue-900/20"
                            >
                                {editingRelease ? 'Enregistrer' : 'Créer la Release'}
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
