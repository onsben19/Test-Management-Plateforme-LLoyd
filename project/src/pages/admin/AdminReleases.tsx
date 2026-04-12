import React, { useEffect, useState } from 'react';
import PageLayout from '../../components/PageLayout';
import AdminTable from '../../components/AdminTable';
import { projectService } from '../../services/api';
import { toast } from 'react-toastify';
import { Edit, Trash2, Layers } from 'lucide-react';
import { useLocation } from 'react-router-dom';
import { useSidebar } from '../../context/SidebarContext';
import StatCard from '../../components/StatCard';
import { CheckCircle2, Clock, Calendar, Rocket } from 'lucide-react';
import { useMemo } from 'react';
import Pagination from '../../components/Pagination';
import ReadinessGauge from '../../components/ReadinessGauge';
import { aiService } from '../../services/api';
import { Award, Info } from 'lucide-react';

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
    const [currentPage, setCurrentPage] = useState(1);
    const [readinessScores, setReadinessScores] = useState<Record<string, any>>({});
    const pageSize = 8;

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
            const data = response.data.results || response.data;
            setReleases(data);

            // Fetch readiness scores for each project/release concurrently
            data.forEach(async (project: any) => {
                try {
                    const scoreRes = await aiService.getReadinessScoreByProject(project.id);
                    setReadinessScores(prev => ({ ...prev, [project.id]: scoreRes.data }));
                } catch (e) {
                    console.warn(`Could not fetch score for project ${project.id}`);
                }
            });
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
        setCurrentPage(1);
    }, [searchQuery, statusFilter]);

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

    const paginatedReleases = useMemo(() => {
        const startIndex = (currentPage - 1) * pageSize;
        return filteredReleases.slice(startIndex, startIndex + pageSize);
    }, [filteredReleases, currentPage, pageSize]);

    const stats = useMemo(() => {
        const total = releases.length;
        const active = releases.filter(r => r.status === 'ACTIVE').length;
        const completed = releases.filter(r => r.status === 'COMPLETED').length;

        return { total, active, completed };
    }, [releases]);

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
            case 'COMPLETED': return 'Terminé';
            default: return status;
        }
    };

    const columns = [
        {
            header: 'Nom de la Release',
            accessor: (item: any) => (
                <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-400 border border-blue-500/20 group-hover:scale-110 transition-transform">
                        <Layers className="w-5 h-5" />
                    </div>
                    <div className="flex flex-col gap-0.5">
                        <span className="text-[15px] font-bold text-white group-hover:text-blue-400 transition-colors tracking-tight">{item.name}</span>
                        <span className="text-[10px] text-slate-500 font-medium">ID: #{item.id}</span>
                    </div>
                </div>
            )
        },
        {
            header: 'Description',
            accessor: (item: any) => (
                <span className="text-slate-500 text-xs italic line-clamp-2 max-w-xs" title={item.description}>
                    {item.description || "Aucune description fournie"}
                </span>
            )
        },
        {
            header: 'Statut',
            accessor: (item: any) => {
                const colors: Record<string, string> = {
                    'ACTIVE': 'bg-emerald-500',
                    'COMPLETED': 'bg-blue-500'
                };
                const color = colors[item.status] || 'bg-slate-500';
                return (
                    <div className="flex items-center gap-2">
                        <div className={`w-1.5 h-1.5 rounded-full ${color} shadow-[0_0_8px_rgba(0,0,0,0.5)]`} />
                        <span className="text-[11px] font-bold text-slate-300 uppercase tracking-widest">{getStatusLabel(item.status)}</span>
                    </div>
                );
            }
        },
        {
            header: 'Créé par',
            accessor: 'created_by_username'
        },
        {
            header: 'Date de création',
            accessor: (item: any) => new Date(item.created_at).toLocaleDateString('fr-FR')
        },
        {
            header: 'Readiness Score',
            className: 'w-[140px]',
            accessor: (item: any) => {
                const data = readinessScores[item.id];
                if (!data) return <div className="animate-pulse bg-white/5 h-12 w-12 rounded-full" />;
                return (
                    <div className="flex items-center gap-3">
                        <ReadinessGauge score={data.score} size={50} label="" />
                        <div className="group relative">
                            <Info className="w-3.5 h-3.5 text-slate-500 cursor-help" />
                            <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 w-48 p-2 bg-slate-800 border border-white/10 rounded-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all text-[9px] text-slate-300 z-50">
                                <p className="font-bold text-white mb-1 uppercase tracking-tighter">Facteurs d'analyse :</p>
                                <ul className="list-disc pl-3 mt-1 space-y-1">
                                    {data.reasons?.slice(0, 3).map((r: string, i: number) => (
                                        <li key={i}>{r}</li>
                                    ))}
                                </ul>
                            </div>
                        </div>
                    </div>
                );
            }
        }
    ];

    return (
        <>
            <PageLayout
                title="Administration des Releases"
                subtitle="Vision globale et historique complet des livrables"
            >
                <div className="space-y-12">

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                        <StatCard
                            title="Total Releases"
                            value={stats.total}
                            icon={Layers}
                            variant="blue"
                            description="Tous les projets rattachés"
                        />
                        <StatCard
                            title="Releases Actives"
                            value={stats.active}
                            icon={Rocket}
                            variant="green"
                            description="En cours de test"
                            changeType="positive"
                        />
                        <StatCard
                            title="Terminées"
                            value={stats.completed}
                            icon={CheckCircle2}
                            variant="slate"
                            description="Historique clôturé"
                        />
                    </div>

                    <AdminTable
                        columns={columns}
                        data={paginatedReleases}
                        isLoading={loading}
                        searchable
                        onSearch={setSearchQuery}
                        filters={
                            <div className="flex items-center gap-4">
                                <select
                                    className="bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-white outline-none focus:ring-2 focus:ring-blue-500 text-[10px] font-bold uppercase tracking-widest appearance-none cursor-pointer hover:bg-white/10 transition-all"
                                    value={statusFilter}
                                    onChange={(e) => setStatusFilter(e.target.value)}
                                >
                                    <option value="ALL" className="bg-slate-900">Tous les statuts</option>
                                    <option value="ACTIVE" className="bg-slate-900">Actif</option>
                                    <option value="COMPLETED" className="bg-slate-900">Terminé</option>
                                </select>
                                <select
                                    className="bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-white outline-none focus:ring-2 focus:ring-blue-500 text-[10px] font-bold uppercase tracking-widest appearance-none cursor-pointer hover:bg-white/10 transition-all"
                                    value={sortOrder}
                                    onChange={(e) => setSortOrder(e.target.value as 'newest' | 'oldest')}
                                >
                                    <option value="newest" className="bg-slate-900">Plus récent</option>
                                    <option value="oldest" className="bg-slate-900">Plus ancien</option>
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

                    <div className="mt-6">
                        <Pagination
                            currentPage={currentPage}
                            totalItems={filteredReleases.length}
                            pageSize={pageSize}
                            onPageChange={setCurrentPage}
                            loading={loading}
                        />
                    </div>
                </div>
            </PageLayout>

            {/* Edit Release Modal */}
            {
                editingRelease && (
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
                )
            }

            {/* Delete Confirmation Modal */}
            {
                deleteModal.isOpen && (
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
        </>
    );
};

export default AdminReleases;
