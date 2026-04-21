import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import PageLayout from '../components/PageLayout';
import {
    Briefcase, Plus, Search, MoreVertical, Edit, Trash2,
    Layers, Calendar, ChevronRight, LayoutGrid, LayoutList, ArrowRight, Pencil, Trash,
    BarChart3, Activity, List
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { businessProjectService } from '../services/api';
import { toast } from 'react-toastify';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import ConfirmModal from '../components/ConfirmModal';
import AdminTable from '../components/AdminTable';
import StatCard from '../components/StatCard';
import { Clock, ArrowDownWideZap, SortAsc, SortDesc } from 'lucide-react';

const ProjectPortfolio = () => {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const { user } = useAuth();
    const isAdminOrManager = ['ADMIN', 'MANAGER'].includes(user?.role?.toUpperCase() || '');

    const [activeTab, setActiveTab] = useState('portfolio');
    const [projects, setProjects] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingProject, setEditingProject] = useState<any>(null);
    const [newProject, setNewProject] = useState({ name: '', description: '' });

    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [projectToDelete, setProjectToDelete] = useState<string | null>(null);

    const [sortBy, setSortBy] = useState<'newest' | 'oldest'>('newest');

    const fetchProjects = async () => {
        try {
            setLoading(true);
            const response = await businessProjectService.getBusinessProjects({ search: searchQuery });
            setProjects(response.data.results || response.data);
        } catch (error) {
            console.error("Failed to fetch business projects", error);
            toast.error("Erreur lors de la récupération des projets");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchProjects();
    }, [searchQuery]);

    const handleSaveProject = async () => {
        if (!newProject.name) return;
        try {
            if (editingProject) {
                await businessProjectService.updateBusinessProject(editingProject.id, newProject);
                toast.success("Projet mis à jour");
            } else {
                await businessProjectService.createBusinessProject(newProject);
                toast.success("Nouveau projet créé");
            }
            setIsModalOpen(false);
            setNewProject({ name: '', description: '' });
            setEditingProject(null);
            fetchProjects();
        } catch {
            toast.error("Erreur lors de l'enregistrement");
        }
    };

    const confirmDelete = async () => {
        if (!projectToDelete) return;
        try {
            await businessProjectService.deleteBusinessProject(projectToDelete);
            toast.success("Projet supprimé");
            fetchProjects();
        } catch {
            toast.error("Erreur lors de la suppression");
        } finally {
            setIsDeleteModalOpen(false);
            setProjectToDelete(null);
        }
    };

    const HeaderActions = isAdminOrManager && (
        <button
            onClick={() => { setEditingProject(null); setNewProject({ name: '', description: '' }); setIsModalOpen(true); }}
            className="flex items-center gap-3 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white px-8 py-3.5 rounded-2xl transition-all shadow-xl shadow-emerald-900/30 font-bold text-xs tracking-tight"
        >
            <Plus className="w-4 h-4" />
            NOUVEAU PROJET
        </button>
    );

    const columns = [
        {
            header: 'Projet',
            accessor: (item: any) => (
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-400 border border-emerald-500/20">
                        <Briefcase size={14} />
                    </div>
                    <span className="font-bold">{item.name}</span>
                </div>
            )
        },
        { header: 'Description', accessor: (item: any) => <span className="text-xs truncate max-w-xs block">{item.description || 'N/A'}</span> },
        { header: 'Releases', accessor: (item: any) => <span className="font-bold text-blue-400">{item.releases_count || 0}</span> },
        { header: 'Créé le', accessor: (item: any) => new Date(item.created_at).toLocaleDateString() },
        { header: 'Propriétaire', accessor: 'created_by_username' }
    ];

    const isAdmin = user?.role?.toUpperCase() === 'ADMIN';
    const isManager = user?.role?.toUpperCase() === 'MANAGER';

    return (
        <PageLayout
            title={isAdmin ? "Audit des Projets" : "Gestion des Projets"}
            subtitle={isAdmin ? "VUE DÉTAILLÉE DU RÉFÉRENTIEL" : "PILOTAGE DU PORTEFEUILLE APPLICATIF"}
            actions={HeaderActions}
        >
            <div className="space-y-8">
                {/* Manager Stats (Optional, keeping it clean as requested) */}
                {isAdmin && (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <StatCard
                            title="Projets Actifs"
                            value={projects.length}
                            icon={Briefcase}
                            variant="blue"
                        />
                        <StatCard
                            title="Total Releases"
                            value={projects.reduce((sum, p) => sum + (p.releases_count || 0), 0)}
                            icon={Layers}
                            variant="green"
                        />
                        <StatCard
                            title="Nouveaux ce mois"
                            value={projects.filter(p => new Date(p.created_at).getMonth() === new Date().getMonth()).length}
                            icon={Calendar}
                            variant="purple"
                        />
                    </div>
                )}

                <AnimatePresence mode="wait">
                    {/* MANAGER VIEW: PREMIUM CARDS */}
                    {isManager && (
                        <motion.div
                            key="portfolio"
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="space-y-10"
                        >
                            {/* Search & Sort Bar */}
                            <div className="flex flex-col md:flex-row gap-4 items-stretch md:items-center">
                                <div className="flex-1 bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-4 flex items-center gap-4">
                                    <Search className="w-5 h-5 text-slate-500 ml-4" />
                                    <input
                                        type="text"
                                        placeholder="Rechercher un projet..."
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        className="flex-1 bg-transparent border-none text-sm text-white focus:ring-0 outline-none"
                                    />
                                </div>
                                <div className="bg-white/5 border border-white/10 rounded-3xl p-2 flex gap-1">
                                    <button
                                        onClick={() => setSortBy('newest')}
                                        className={`flex items-center gap-2 px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${sortBy === 'newest' ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20' : 'text-slate-500 hover:text-white hover:bg-white/5'}`}
                                    >
                                        <SortDesc className="w-3.5 h-3.5" />
                                        Plus Récents
                                    </button>
                                    <button
                                        onClick={() => setSortBy('oldest')}
                                        className={`flex items-center gap-2 px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${sortBy === 'oldest' ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20' : 'text-slate-500 hover:text-white hover:bg-white/5'}`}
                                    >
                                        <SortAsc className="w-3.5 h-3.5" />
                                        Plus Anciens
                                    </button>
                                </div>
                            </div>

                            {/* Grid */}
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 pb-10">
                                {loading ? (
                                    [1, 2, 3].map(i => <div key={i} className="h-64 bg-white/5 rounded-[2rem] animate-pulse border border-white/10" />)
                                ) : projects.length === 0 ? (
                                    <div className="col-span-full py-40 text-center opacity-30">
                                        <Briefcase className="w-16 h-16 mx-auto mb-4" />
                                        <p className="text-sm font-bold uppercase tracking-widest">Aucun projet trouvé</p>
                                    </div>
                                ) : (
                                    [...projects]
                                        .sort((a, b) => {
                                            const timeA = new Date(a.created_at).getTime();
                                            const timeB = new Date(b.created_at).getTime();
                                            return sortBy === 'newest' ? timeB - timeA : timeA - timeB;
                                        })
                                        .map((project, idx) => (
                                            <motion.div
                                                key={project.id}
                                                initial={{ opacity: 0, scale: 0.95 }}
                                                animate={{ opacity: 1, scale: 1 }}
                                                transition={{ delay: idx * 0.05 }}
                                                className="group relative bg-[#0f172a]/40 backdrop-blur-2xl border border-white/5 rounded-[2.5rem] p-9 hover:border-emerald-500/20 transition-all duration-500 shadow-2xl"
                                            >
                                                {/* Card Header - Icon & Actions */}
                                                <div className="flex items-start justify-between mb-10">
                                                    <div className="w-20 h-20 rounded-3xl bg-[#112121] border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                                                        <div className="p-3 bg-emerald-500/5 rounded-2xl border border-emerald-500/10">
                                                            <Briefcase className="w-8 h-8" />
                                                        </div>
                                                    </div>
                                                    <div className="flex gap-3">
                                                        <button
                                                            onClick={() => { setEditingProject(project); setNewProject({ name: project.name, description: project.description }); setIsModalOpen(true); }}
                                                            className="p-3.5 bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white rounded-2xl border border-white/5 transition-all shadow-lg active:scale-95"
                                                        >
                                                            <Pencil size={20} />
                                                        </button>
                                                        <button
                                                            onClick={() => { setProjectToDelete(project.id); setIsDeleteModalOpen(true); }}
                                                            className="p-3.5 bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white rounded-2xl border border-white/5 transition-all shadow-lg active:scale-95"
                                                        >
                                                            <Trash size={20} />
                                                        </button>
                                                    </div>
                                                </div>

                                                {/* Status & Info */}
                                                <div className="space-y-4 mb-10">
                                                    <div className="flex items-center gap-2.5">
                                                        <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]" />
                                                        <span className="text-[11px] font-black text-emerald-500 uppercase tracking-widest">Actif</span>
                                                    </div>
                                                    <h3 className="text-3xl font-black text-white tracking-tight leading-none group-hover:text-emerald-400 transition-colors">{project.name}</h3>
                                                    <p className="text-slate-500 text-sm font-medium leading-relaxed line-clamp-2 min-h-[3rem] opacity-70">{project.description || 'Description du projet métier'}</p>
                                                </div>

                                                <div className="h-px w-full bg-white/5 mb-10" />

                                                {/* Stats Sections */}
                                                <div className="grid grid-cols-2 gap-5 mb-10">
                                                    <div className="p-7 bg-[#131b26]/60 border border-white/10 rounded-[2rem] space-y-4 relative overflow-hidden group/stat">
                                                        <div className="flex items-center gap-2.5">
                                                            <Layers className="w-4 h-4 text-slate-600" />
                                                            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Releases</p>
                                                        </div>
                                                        <p className="text-4xl font-black text-white">{project.releases_count || 0}</p>
                                                        <div className="flex flex-wrap gap-2">
                                                            {(project.recent_releases || []).slice(0, 2).map((rel: string, i: number) => (
                                                                <span key={i} className={`text-[9px] px-3 py-1 rounded-lg font-black uppercase tracking-widest ${i === 0 ? 'bg-emerald-500/10 text-emerald-500' : 'bg-blue-500/10 text-blue-500'}`}>
                                                                    {rel}
                                                                </span>
                                                            ))}
                                                        </div>
                                                    </div>
                                                    <div className="p-7 bg-[#131b26]/60 border border-white/10 rounded-[2rem] space-y-4">
                                                        <div className="flex items-center gap-2.5">
                                                            <Calendar className="w-4 h-4 text-slate-600" />
                                                            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Créé le</p>
                                                        </div>
                                                        <div>
                                                            <p className="text-2xl font-black text-white leading-tight uppercase tracking-tighter">
                                                                {new Date(project.created_at).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })}
                                                            </p>
                                                            <p className="text-sm text-slate-600 font-bold mt-1">{new Date(project.created_at).getFullYear()}</p>
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* Footer Action */}
                                                <button
                                                    onClick={() => navigate('/releases', { state: { businessProjectId: project.id, businessProjectName: project.name } })}
                                                    className="w-full flex items-center justify-between px-10 py-7 bg-[#112121] hover:bg-[#1a2f2b] border border-emerald-500/10 hover:border-emerald-500/30 text-[#10b981] rounded-[2rem] text-xs font-black uppercase tracking-[0.25em] transition-all group/btn shadow-xl"
                                                >
                                                    Explorer les Releases
                                                    <div className="w-10 h-10 bg-white/5 rounded-2xl flex items-center justify-center group-hover/btn:bg-emerald-500 group-hover/btn:text-white transition-all shadow-lg">
                                                        <ArrowRight size={18} className="group-hover/btn:translate-x-0.5 transition-transform" />
                                                    </div>
                                                </button>
                                            </motion.div>
                                        ))
                                )}
                            </div>
                        </motion.div>
                    )}

                    {/* ADMIN VIEW: TABLE */}
                    {isAdmin && (
                        <motion.div
                            key="management"
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                        >
                            <AdminTable
                                columns={columns}
                                data={projects}
                                isLoading={loading}
                                searchable
                                onSearch={setSearchQuery}
                                actions={(item) => (
                                    <div className="flex items-center gap-2">
                                        <button
                                            onClick={() => { setEditingProject(item); setNewProject({ name: item.name, description: item.description }); setIsModalOpen(true); }}
                                            className="p-2 text-slate-400 hover:text-blue-400 hover:bg-blue-500/10 rounded-lg transition-colors"
                                        >
                                            <Edit className="w-4 h-4" />
                                        </button>
                                        <button
                                            onClick={() => { setProjectToDelete(item.id); setIsDeleteModalOpen(true); }}
                                            className="p-2 text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                )}
                            />
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            {/* Modal */}
            <AnimatePresence>
                {isModalOpen && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-6 backdrop-blur-xl bg-black/60">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="w-full max-w-lg bg-[#0f172a] border border-white/10 rounded-[2.5rem] p-10"
                        >
                            <h2 className="text-2xl font-bold text-white mb-8">{editingProject ? 'Modifier le Projet' : 'Nouveau Projet'}</h2>
                            <div className="space-y-6">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Nom du Projet</label>
                                    <input
                                        type="text"
                                        className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-white focus:ring-2 focus:ring-emerald-500/50 outline-none"
                                        value={newProject.name}
                                        onChange={(e) => setNewProject({ ...newProject, name: e.target.value })}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Description</label>
                                    <textarea
                                        className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-white focus:ring-2 focus:ring-emerald-500/50 outline-none h-32 resize-none"
                                        value={newProject.description}
                                        onChange={(e) => setNewProject({ ...newProject, description: e.target.value })}
                                    />
                                </div>
                                <div className="flex justify-end gap-4 pt-4">
                                    <button onClick={() => setIsModalOpen(false)} className="px-6 py-3 text-[10px] font-black uppercase tracking-widest text-slate-500">Annuler</button>
                                    <button onClick={handleSaveProject} className="bg-emerald-600 hover:bg-emerald-500 text-white px-8 py-3 rounded-xl font-bold text-[11px] uppercase tracking-widest transition-all shadow-lg shadow-emerald-900/30">
                                        Enregistrer
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            <ConfirmModal
                isOpen={isDeleteModalOpen}
                title="Supprimer le Projet ?"
                message="Toutes les releases associées resteront mais ne seront plus rattachées à ce projet."
                onConfirm={confirmDelete}
                onCancel={() => setIsDeleteModalOpen(false)}
                confirmText="Supprimer"
                type="danger"
            />
        </PageLayout>
    );
};

export default ProjectPortfolio;
