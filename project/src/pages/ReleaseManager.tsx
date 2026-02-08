import React, { useEffect, useState } from 'react';
import Header from '../components/Header';
import Sidebar from '../components/Sidebar';
import { Layers, Calendar, User, BookOpen, Plus, MoreVertical, ArrowRight, Edit, Trash2, Activity, Search } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { projectService } from '../services/api';
import { toast } from 'react-toastify';
import { useAuth } from '../context/AuthContext';

const ReleaseManager = () => {
    const navigate = useNavigate();
    const { user } = useAuth();
    const isAdminOrManager = ['ADMIN', 'MANAGER'].includes(user?.role?.toUpperCase() || '');

    // State for Release List
    const [releases, setReleases] = useState<any[]>([]);
    const [filteredReleases, setFilteredReleases] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [sortOrder, setSortOrder] = useState<'newest' | 'oldest'>('newest');

    // Modal State
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingRelease, setEditingRelease] = useState<any>(null); // Track if editing
    const [newRelease, setNewRelease] = useState({
        name: '',
        description: '',
        status: 'ACTIVE'
    });

    // Action Menu State
    const [openMenuId, setOpenMenuId] = useState<string | null>(null);

    // Delete Confirmation State
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

    useEffect(() => {
        let result = [...releases];

        // Search
        if (searchQuery) {
            const lowerQuery = searchQuery.toLowerCase();
            result = result.filter(r =>
                r.name.toLowerCase().includes(lowerQuery) ||
                (r.description && r.description.toLowerCase().includes(lowerQuery))
            );
        }

        // Sort
        result.sort((a, b) => {
            const dateA = new Date(a.created_at || 0).getTime();
            const dateB = new Date(b.created_at || 0).getTime();
            return sortOrder === 'newest' ? dateB - dateA : dateA - dateB;
        });

        setFilteredReleases(result);
    }, [releases, searchQuery, sortOrder]);

    // Close menu when clicking outside
    useEffect(() => {
        const handleClickOutside = () => setOpenMenuId(null);
        window.addEventListener('click', handleClickOutside);
        return () => window.removeEventListener('click', handleClickOutside);
    }, []);

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

    const handleEditClick = (release: any, e: React.MouseEvent) => {
        e.stopPropagation();
        setEditingRelease(release);
        setNewRelease({
            name: release.name,
            description: release.description,
            status: release.status
        });
        setIsModalOpen(true);
        setOpenMenuId(null);
    };

    const confirmDelete = async () => {
        if (!deleteModal.releaseId) return;

        try {
            await projectService.deleteProject(deleteModal.releaseId);
            toast.success("Release supprimée");
            fetchReleases();
            setDeleteModal({ isOpen: false, releaseId: null });
        } catch (error) {
            console.error("Failed to delete release", error);
            toast.error("Erreur lors de la suppression");
        }
    };

    const handleDeleteClick = (id: any, e: React.MouseEvent) => {
        e.stopPropagation();
        setDeleteModal({ isOpen: true, releaseId: id });
        setOpenMenuId(null);
    };

    const handleStatusChange = async (release: any, newStatus: string, e: React.MouseEvent) => {
        e.stopPropagation();
        try {
            await projectService.updateProject(release.id, { status: newStatus });
            toast.success(`Statut mis à jour : ${newStatus}`);
            fetchReleases();
        } catch (error) {
            toast.error("Erreur lors du changement de statut");
        }
        setOpenMenuId(null);
    };

    const toggleMenu = (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        setOpenMenuId(openMenuId === id ? null : id);
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'ACTIVE': return 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20';
            case 'COMPLETED': return 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20';
            case 'ARCHIVED': return 'bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/20';
            default: return 'bg-slate-500/10 text-slate-600 dark:text-slate-400';
        }
    };

    const formatDate = (dateString: string) => {
        if (!dateString) return '';
        return new Date(dateString).toLocaleDateString('fr-FR');
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

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-900 transition-colors duration-300">
            <Header />
            <div className="flex">
                <Sidebar />
                <main className="flex-1 lg:ml-64 relative p-8">
                    <div className="max-w-7xl mx-auto">

                        {/* Header Section */}
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10">
                            <div>
                                <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-2 tracking-tight transition-colors">
                                    <span className="text-gradient">Gestion des Releases</span>
                                </h1>
                                <p className="text-slate-500 dark:text-slate-400 transition-colors">Gérez vos releases et suivez l'avancement des projets.</p>
                            </div>

                            {isAdminOrManager && (
                                <button
                                    onClick={() => { resetForm(); setIsModalOpen(true); }}
                                    className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-all shadow-lg shadow-blue-500/20 dark:shadow-blue-900/20 animate-slide-up"
                                >
                                    <Plus className="w-4 h-4" />
                                    Nouvelle Release
                                </button>
                            )}
                        </div>

                        {/* Search and Sort Toolbar */}
                        <div className="flex flex-col sm:flex-row gap-4 mb-6">
                            <div className="relative flex-1">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                                <input
                                    type="text"
                                    placeholder="Rechercher une release..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg pl-10 pr-4 py-2 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
                                />
                            </div>
                            <select
                                value={sortOrder}
                                onChange={(e) => setSortOrder(e.target.value as 'newest' | 'oldest')}
                                className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-4 py-2 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
                            >
                                <option value="newest">Plus récent</option>
                                <option value="oldest">Plus ancien</option>
                            </select>
                        </div>

                        {/* Releases Grid */}
                        {loading ? (
                            <div className="text-center text-slate-500 dark:text-slate-400 mt-20 transition-colors">Chargement...</div>
                        ) : (
                            <div className="grid grid-cols-1 gap-6">
                                {filteredReleases.map((release, index) => (
                                    <div
                                        key={release.id}
                                        style={{ animationDelay: `${index * 100}ms` }}
                                        className={`bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-6 relative animate-slide-up group shadow-sm dark:shadow-xl transition-all ${openMenuId === release.id ? 'z-50' : 'z-0'}`}
                                    >
                                        <div className="absolute top-0 right-0 p-4">
                                            <div className="relative">
                                                {isAdminOrManager && (
                                                    <button
                                                        onClick={(e) => toggleMenu(release.id, e)}
                                                        className="p-2 text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-700/50 rounded-lg transition-colors"
                                                    >
                                                        <MoreVertical className="w-5 h-5" />
                                                    </button>
                                                )}

                                                {/* Dropdown Menu */}
                                                {openMenuId === release.id && isAdminOrManager && (
                                                    <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-xl z-10 overflow-hidden animate-in fade-in zoom-in-95 duration-100">
                                                        <div className="py-1">
                                                            <button
                                                                onClick={(e) => handleEditClick(release, e)}
                                                                className="w-full text-left px-4 py-2 text-sm text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 hover:text-slate-900 dark:hover:text-white flex items-center gap-2 transition-colors"
                                                            >
                                                                <Edit className="w-4 h-4" />
                                                                Modifier
                                                            </button>

                                                            {/* Status Submenu (Simplified as flat items for now) */}
                                                            <div className="border-t border-slate-100 dark:border-slate-700/50 my-1"></div>
                                                            <p className="px-4 py-1 text-xs text-slate-400 dark:text-slate-500 font-medium uppercase transition-colors">Statut</p>
                                                            <button
                                                                onClick={(e) => handleStatusChange(release, 'ACTIVE', e)}
                                                                className="w-full text-left px-4 py-2 text-sm text-emerald-600 dark:text-emerald-400 hover:bg-slate-50 dark:hover:bg-slate-700 flex items-center gap-2 transition-colors"
                                                            >
                                                                <Activity className="w-4 h-4" />
                                                                Activé
                                                            </button>
                                                            <button
                                                                onClick={(e) => handleStatusChange(release, 'COMPLETED', e)}
                                                                className="w-full text-left px-4 py-2 text-sm text-blue-600 dark:text-blue-400 hover:bg-slate-50 dark:hover:bg-slate-700 flex items-center gap-2 transition-colors"
                                                            >
                                                                <Activity className="w-4 h-4" />
                                                                Terminé
                                                            </button>
                                                            <button
                                                                onClick={(e) => handleStatusChange(release, 'ARCHIVED', e)}
                                                                className="w-full text-left px-4 py-2 text-sm text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700 flex items-center gap-2 transition-colors"
                                                            >
                                                                <Activity className="w-4 h-4" />
                                                                Archivé
                                                            </button>

                                                            <div className="border-t border-slate-100 dark:border-slate-700/50 my-1"></div>
                                                            <button
                                                                onClick={(e) => handleDeleteClick(release.id, e)}
                                                                className="w-full text-left px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 flex items-center gap-2 transition-colors"
                                                            >
                                                                <Trash2 className="w-4 h-4" />
                                                                Supprimer
                                                            </button>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        <div className="flex flex-col md:flex-row items-start md:items-center gap-6 justify-between">

                                            <div className="flex items-start gap-4 flex-1">
                                                <div className="w-12 h-12 rounded-lg bg-indigo-50 dark:bg-indigo-500/10 flex items-center justify-center border border-indigo-200 dark:border-indigo-500/20 group-hover:scale-110 transition-transform duration-300 shrink-0">
                                                    <Layers className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
                                                </div>

                                                <div>
                                                    <div className="flex items-center gap-3 mb-1">
                                                        <h3 className="text-xl font-bold text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">{release.name}</h3>
                                                        <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium border ${getStatusColor(release.status)} transition-colors`}>
                                                            {getStatusLabel(release.status)}
                                                        </span>
                                                    </div>
                                                    <p className="text-slate-500 dark:text-slate-400 mb-3 max-w-2xl transition-colors">{release.description}</p>

                                                    <div className="flex items-center gap-6 text-sm text-slate-500 dark:text-slate-500 transition-colors">
                                                        <div className="flex items-center gap-2">
                                                            <Calendar className="w-4 h-4" />
                                                            <span>Créé le {formatDate(release.created_at)}</span>
                                                        </div>
                                                        <div className="flex items-center gap-2">
                                                            <User className="w-4 h-4" />
                                                            <span>Par {release.created_by_username || 'Inconnu'}</span>
                                                        </div>
                                                        <div className="flex items-center gap-2">
                                                            <BookOpen className="w-4 h-4" />
                                                            <span>{release.campaign_count || 0} Campagne{release.campaign_count > 1 ? 's' : ''}</span>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-3 self-end md:self-center">
                                                <button
                                                    onClick={() => navigate('/manager', { state: { releaseName: release.name, releaseId: release.id } })}
                                                    className="px-4 py-2 rounded-lg bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white border border-slate-200 dark:border-slate-700 transition-colors flex items-center gap-2 shadow-sm"
                                                >
                                                    <span>Voir cahier de tests</span>
                                                    <ArrowRight className="w-4 h-4" />
                                                </button>
                                            </div>

                                        </div>
                                    </div>
                                ))}
                                {filteredReleases.length === 0 && (
                                    <div className="text-center text-slate-500 dark:text-slate-400 py-12 transition-colors">
                                        Aucune release trouvée. Créez-en une nouvelle pour commencer.
                                    </div>
                                )}
                            </div>
                        )}

                    </div>
                </main>
            </div>

            {/* Add/Edit Release Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 dark:bg-slate-900/80 backdrop-blur-sm animate-in fade-in transition-colors">
                    <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-6 max-w-lg w-full shadow-2xl animate-in zoom-in-95 duration-200 transition-colors">
                        <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-6 transition-colors">
                            {editingRelease ? 'Modifier la Release' : 'Créer une nouvelle Release'}
                        </h2>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-400 mb-1 transition-colors">Nom de la Release</label>
                                <input
                                    type="text"
                                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                                    placeholder="Ex: Release Q3 2024"
                                    value={newRelease.name}
                                    onChange={(e) => setNewRelease({ ...newRelease, name: e.target.value })}
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-400 mb-1 transition-colors">Description</label>
                                <textarea
                                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none transition-all h-24 resize-none"
                                    placeholder="Description des objectifs de la release..."
                                    value={newRelease.description}
                                    onChange={(e) => setNewRelease({ ...newRelease, description: e.target.value })}
                                />
                            </div>

                            <div className="grid grid-cols-1 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-400 mb-1 transition-colors">Statut Initial</label>
                                    <select
                                        className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none transition-all"
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
                                className="px-4 py-2 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
                            >
                                Annuler
                            </button>
                            <button
                                onClick={handleSaveRelease}
                                disabled={!newRelease.name}
                                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-all shadow-lg shadow-blue-500/20 dark:shadow-blue-900/20"
                            >
                                {editingRelease ? 'Enregistrer' : 'Créer la Release'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Delete Confirmation Modal */}
            {deleteModal.isOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 dark:bg-slate-900/80 backdrop-blur-sm animate-in fade-in transition-colors">
                    <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-6 max-w-sm w-full shadow-2xl animate-in zoom-in-95 duration-200 transition-colors">
                        <div className="flex flex-col items-center text-center">
                            <div className="w-12 h-12 rounded-full bg-red-100 dark:bg-red-500/10 flex items-center justify-center mb-4 transition-colors">
                                <Trash2 className="w-6 h-6 text-red-600 dark:text-red-500 transition-colors" />
                            </div>
                            <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2 transition-colors">Supprimer la release</h3>
                            <p className="text-slate-500 dark:text-slate-400 mb-6 transition-colors">
                                Êtes-vous sûr de vouloir supprimer cette release ?
                            </p>
                            <div className="flex gap-3 w-full">
                                <button
                                    onClick={() => setDeleteModal({ isOpen: false, releaseId: null })}
                                    className="flex-1 px-4 py-2 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
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

export default ReleaseManager;
