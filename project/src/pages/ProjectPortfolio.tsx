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
import { Clock, ArrowDownZa, SortAsc, SortDesc } from 'lucide-react';
import Button from '../components/ui/Button';


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
        <Button
            onClick={() => { setEditingProject(null); setNewProject({ name: '', description: '' }); setIsModalOpen(true); }}
            icon={Plus}
        >
            NOUVEAU PROJET
        </Button>
    );

    const columns = [
        {
            header: 'Projet',
            accessor: (item: any) => (
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center text-blue-600 dark:text-blue-400 border border-blue-500/20">
                        <Briefcase size={14} />
                    </div>
                    <span className="font-bold">{item.name}</span>
                </div>
            )
        },
        { header: 'Description', accessor: (item: any) => <span className="text-xs truncate max-w-xs block text-slate-500 dark:text-slate-400">{item.description || 'N/A'}</span> },
        { header: 'Releases', accessor: (item: any) => <span className="font-bold text-blue-600 dark:text-blue-400">{item.releases_count || 0}</span> },
        { header: 'Créé le', accessor: (item: any) => new Date(item.created_at).toLocaleDateString() },
        { header: 'Propriétaire', accessor: 'created_by_username' }
    ];

    const isAdmin = user?.role?.toUpperCase() === 'ADMIN';
    const isManager = user?.role?.toUpperCase() === 'MANAGER';

    return (
        <PageLayout
            title={isAdmin ? "Audit des Projets" : "Gestion des Projets"}
            subtitle={isAdmin ? "VUE DÉTAILLÉE DU RÉFÉRENTIEL" : "PROJETS DISPONIBLES"}
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
                            variant="blue"
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
                                <div className="flex-1 glass-card p-4 flex items-center gap-4">
                                    <Search className="w-5 h-5 text-slate-400 ml-4" />
                                    <input
                                        type="text"
                                        placeholder="Rechercher un projet..."
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        className="flex-1 bg-transparent border-none text-sm text-foreground focus:ring-0 outline-none placeholder-slate-400"
                                    />
                                </div>
                                <div className="glass-card p-2 flex gap-1">
                                    <Button
                                        variant={sortBy === 'newest' ? 'primary' : 'ghost'}
                                        size="sm"
                                        onClick={() => setSortBy('newest')}
                                        icon={SortDesc}
                                    >
                                        RÉCENTS
                                    </Button>
                                    <Button
                                        variant={sortBy === 'oldest' ? 'primary' : 'ghost'}
                                        size="sm"
                                        onClick={() => setSortBy('oldest')}
                                        icon={SortAsc}
                                    >
                                        ANCIENS
                                    </Button>
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
                                                onClick={() => navigate('/releases', { state: { businessProjectId: project.id, businessProjectName: project.name } })}
                                                className="group relative glass-card rounded-[2.5rem] p-8 overflow-hidden shadow-xl hover:shadow-2xl cursor-pointer"
                                            >
                                                {/* Card Header - Icon & Actions */}
                                                <div className="flex items-start justify-between mb-8">
                                                    <div className="w-16 h-16 rounded-3xl bg-blue-50 dark:bg-[#111827] border border-blue-200 dark:border-blue-500/20 flex items-center justify-center text-blue-600 dark:text-blue-400">
                                                        <div className="p-2.5 bg-blue-500/5 rounded-2xl border border-blue-500/10">
                                                            <Briefcase className="w-6 h-6" />
                                                        </div>
                                                    </div>
                                                    <div className="flex gap-2" onClick={e => e.stopPropagation()}>
                                                        <Button
                                                            variant="secondary"
                                                            size="icon"
                                                            onClick={() => { setEditingProject(project); setNewProject({ name: project.name, description: project.description }); setIsModalOpen(true); }}
                                                            icon={Pencil}
                                                        />
                                                        <Button
                                                            variant="danger"
                                                            size="icon"
                                                            onClick={() => { setProjectToDelete(project.id); setIsDeleteModalOpen(true); }}
                                                            icon={Trash}
                                                        />
                                                    </div>
                                                </div>

                                                {/* Status & Info */}
                                                <div className="space-y-2 mb-6">
                                                    <div className="flex items-center gap-2">
                                                        <div className="w-1.5 h-1.5 rounded-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.5)]" />
                                                        <span className="text-[10px] font-black text-blue-600 dark:text-blue-500 uppercase tracking-widest">Actif</span>
                                                    </div>
                                                    <h3 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight leading-none group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors uppercase">{project.name}</h3>
                                                    <p className="text-slate-500 dark:text-slate-400 text-xs font-medium leading-relaxed line-clamp-2">{project.description || 'Description du projet métier'}</p>
                                                </div>

                                                <div className="h-px w-full bg-slate-200 dark:bg-white/5 mb-6" />

                                                {/* Stats */}
                                                <div className="grid grid-cols-2 gap-4">
                                                    <div className="p-5 bg-white/50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-[1.5rem] space-y-3">
                                                        <div className="flex items-center gap-2">
                                                            <Layers className="w-3.5 h-3.5 text-slate-400 dark:text-slate-600" />
                                                            <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Releases</p>
                                                        </div>
                                                        <p className="text-3xl font-black text-slate-900 dark:text-white">{project.releases_count || 0}</p>
                                                    </div>
                                                    <div className="p-5 bg-white/50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-[1.5rem] space-y-3">
                                                        <div className="flex items-center gap-2">
                                                            <Calendar className="w-3.5 h-3.5 text-slate-400 dark:text-slate-600" />
                                                            <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Créé le</p>
                                                        </div>
                                                        <div>
                                                            <p className="text-xl font-black text-slate-900 dark:text-white leading-tight uppercase tracking-tighter">
                                                                {new Date(project.created_at).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })}
                                                            </p>
                                                            <p className="text-xs text-slate-500 dark:text-slate-600 font-bold mt-0.5">{new Date(project.created_at).getFullYear()}</p>
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* Testers & Footer */}
                                                <div className="mt-8 pt-6 border-t border-slate-200/50 dark:border-white/5 flex items-center justify-between">
                                                    <div className="flex -space-x-3">
                                                        {project.testers?.slice(0, 3).map((t: any, i: number) => (
                                                            <div key={i} className="w-10 h-10 rounded-xl border-2 border-white dark:border-slate-900 bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-[10px] font-black text-slate-600 dark:text-slate-300 shadow-lg group-hover:-translate-y-1 transition-transform" style={{ transitionDelay: `${i * 50}ms` }}>
                                                                {t.initials}
                                                            </div>
                                                        ))}
                                                        {(project.testers?.length || 0) > 3 && (
                                                            <div className="w-10 h-10 rounded-xl border-2 border-white dark:border-slate-900 bg-white dark:bg-slate-800 flex items-center justify-center text-[10px] font-black text-blue-600 dark:text-blue-400 shadow-lg">
                                                                +{project.testers.length - 3}
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>

                                                {/* Hover indicator */}
                                                <div className="mt-5 flex items-center gap-2 text-[10px] font-black text-slate-600 group-hover:text-blue-500 transition-colors uppercase tracking-widest">
                                                    <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                                                    Voir les releases
                                                </div>
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
                                        <Button
                                            variant="secondary"
                                            size="icon"
                                            onClick={() => { setEditingProject(item); setNewProject({ name: item.name, description: item.description }); setIsModalOpen(true); }}
                                            icon={Edit}
                                        />
                                        <Button
                                            variant="danger"
                                            size="icon"
                                            onClick={() => { setProjectToDelete(item.id); setIsDeleteModalOpen(true); }}
                                            icon={Trash2}
                                        />
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
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-6 backdrop-blur-2xl bg-black/60">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="w-full max-w-lg bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-white/10 rounded-[2.5rem] p-10 shadow-2xl"
                        >
                            <h2 className="text-2xl font-black text-slate-900 dark:text-white mb-8 tracking-tight uppercase">{editingProject ? 'Modifier le Projet' : 'Nouveau Projet'}</h2>
                            <div className="space-y-6">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Nom du Projet</label>
                                    <input
                                        type="text"
                                        className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl px-6 py-4 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-600/50 outline-none transition-all"
                                        value={newProject.name}
                                        onChange={(e) => setNewProject({ ...newProject, name: e.target.value })}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Description</label>
                                    <textarea
                                        className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl px-6 py-4 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-600/50 outline-none h-32 resize-none transition-all"
                                        value={newProject.description}
                                        onChange={(e) => setNewProject({ ...newProject, description: e.target.value })}
                                    />
                                </div>
                                <div className="flex justify-end gap-4 pt-4">
                                    <Button variant="ghost" onClick={() => setIsModalOpen(false)}>Annuler</Button>
                                    <Button onClick={handleSaveProject}>
                                        Enregistrer
                                    </Button>
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
