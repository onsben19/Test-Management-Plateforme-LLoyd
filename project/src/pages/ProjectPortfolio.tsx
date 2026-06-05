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
    const [filterOwner, setFilterOwner] = useState('ALL');
    const [openMenuId, setOpenMenuId] = useState<string | null>(null);
    const [currentPage, setCurrentPage] = useState(1);
    const pageSize = 10;

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
        setCurrentPage(1);
        fetchProjects();
    }, [searchQuery, filterOwner, sortBy]);

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
            className="text-[10px] font-bold tracking-wider rounded-lg"
        >
            {t('portfolio.newProject', 'NOUVEAU PROJET')}
        </Button>
    );

    const DescriptionCell = ({ text }: { text: string }) => {
        const [expanded, setExpanded] = useState(false);
        if (!text) return <span className="text-xs text-slate-500 dark:text-slate-400">N/A</span>;
        
        const isLong = text.length > 80;
        
        return (
            <div className="text-xs text-slate-500 dark:text-slate-400 max-w-sm">
                <span className={expanded ? "whitespace-normal break-words" : "line-clamp-2"}>
                    {text}
                </span>
                {isLong && (
                    <button 
                        onClick={(e) => { e.stopPropagation(); setExpanded(!expanded); }}
                        className="text-blue-500 hover:text-blue-400 font-bold mt-1 text-[10px] uppercase tracking-widest transition-colors"
                    >
                        {expanded ? t('portfolio.readLess', 'Réduire') : t('portfolio.readMore', 'Lire la suite')}
                    </button>
                )}
            </div>
        );
    };

    const columns = [
        {
            header: t('portfolio.table.project', 'Projet'),
            accessor: (item: any) => (
                <div className="flex items-center cursor-pointer">
                    <div className="flex flex-col gap-0.5">
                        <span className="font-bold text-slate-200 group-hover:text-blue-400 transition-colors tracking-tight text-base">{item.name}</span>
                    </div>
                </div>
            )
        },
        { header: t('portfolio.table.description'), accessor: (item: any) => <DescriptionCell text={item.description} /> },
        { header: t('portfolio.table.releases'), accessor: (item: any) => <span className="font-bold text-blue-600 dark:text-blue-400">{item.releases_count || 0}</span> },
        { header: t('portfolio.table.createdAt'), accessor: (item: any) => new Date(item.created_at).toLocaleDateString() },
        { header: t('portfolio.table.owner'), accessor: 'created_by_username' }
    ];

    const isAdmin = user?.role?.toUpperCase() === 'ADMIN';
    const isManager = user?.role?.toUpperCase() === 'MANAGER';

    const processedProjects = [...projects]
        .filter((p) => filterOwner === 'ALL' || p.created_by_username === filterOwner)
        .filter((p) => p.name.toLowerCase().includes(searchQuery.toLowerCase()) || (p.description && p.description.toLowerCase().includes(searchQuery.toLowerCase())))
        .sort((a, b) => {
            const timeA = new Date(a.created_at).getTime();
            const timeB = new Date(b.created_at).getTime();
            return sortBy === 'newest' ? timeB - timeA : timeA - timeB;
        });

    const totalPages = Math.ceil(processedProjects.length / pageSize);
    const paginatedProjects = processedProjects.slice((currentPage - 1) * pageSize, currentPage * pageSize);

    return (
        <PageLayout
            title={isAdmin ? t('portfolio.titleAdmin') : t('portfolio.title')}
            subtitle={isAdmin ? t('portfolio.subtitleAdmin') : t('portfolio.subtitle')}
            actions={HeaderActions}
        >
            <div className="space-y-8">
                {/* Manager Stats (Optional, keeping it clean as requested) */}
                {isAdmin && (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <StatCard
                            title="Projets Actifs"
                            value={projects.length}
                            variant="blue"
                        />
                        <StatCard
                            title="Total Releases"
                            value={projects.reduce((sum, p) => sum + (p.releases_count || 0), 0)}
                            variant="blue"
                        />
                        <StatCard
                            title="Nouveaux ce mois"
                            value={projects.filter(p => new Date(p.created_at).getMonth() === new Date().getMonth()).length}
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
                                <div className="flex-1 bg-slate-50 dark:bg-white/[0.02] border border-slate-200 dark:border-white/[0.05] rounded-xl p-3 flex items-center gap-3">
                                    <input
                                        type="text"
                                        placeholder={t('portfolio.search', 'Rechercher un projet...')}
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        className="flex-1 bg-transparent border-none text-sm text-foreground focus:ring-0 outline-none placeholder-slate-400"
                                    />
                                </div>
                                <div className="bg-slate-50 dark:bg-white/[0.02] border border-slate-200 dark:border-white/[0.05] rounded-xl p-1 flex gap-1">
                                    <Button
                                        variant={sortBy === 'newest' ? 'primary' : 'ghost'}
                                        size="sm"
                                        onClick={() => setSortBy('newest')}
                                        className="rounded-lg text-[10px] font-bold"
                                    >
                                        RÉCENTS
                                    </Button>
                                    <Button
                                        variant={sortBy === 'oldest' ? 'primary' : 'ghost'}
                                        size="sm"
                                        onClick={() => setSortBy('oldest')}
                                        className="rounded-lg text-[10px] font-bold"
                                    >
                                        ANCIENS
                                    </Button>
                                </div>
                            </div>

                            {/* Grid */}
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 pb-10">
                                {loading ? (
                                    [1, 2, 3].map(i => <div key={i} className="h-64 bg-white/5 rounded-[2rem] animate-pulse border border-white/10" />)
                                ) : processedProjects.length === 0 ? (
                                    <div className="col-span-full py-40 text-center opacity-30">
                                        <p className="text-sm font-bold uppercase tracking-widest">{t('portfolio.noProjects', 'Aucun projet trouvé')}</p>
                                    </div>
                                ) : (
                                    processedProjects
                                        .map((project, idx) => (
                                            <motion.div
                                                key={project.id}
                                                initial={{ opacity: 0, scale: 0.95 }}
                                                animate={{ opacity: 1, scale: 1 }}
                                                transition={{ delay: idx * 0.05 }}
                                                onClick={() => navigate('/releases', { state: { businessProjectId: project.id, businessProjectName: project.name } })}
                                                className="group relative bg-[#0f1729]/80 backdrop-blur-xl hover:bg-[#131c31] border border-white/5 hover:border-blue-500/30 rounded-[2.5rem] p-8 overflow-hidden shadow-xl hover:shadow-[0_15px_40px_-10px_rgba(59,130,246,0.15)] cursor-pointer transition-all duration-500"
                                            >
                                                {/* Subtle ambient glow */}
                                                <div className="absolute -top-32 -right-32 w-64 h-64 bg-blue-500/10 rounded-full blur-[80px] opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none" />
                                                {/* Card Header - Title & Status & Actions */}
                                                <div className="flex items-start justify-between mb-6">
                                                    <div className="space-y-2 flex-1 min-w-0 pr-4">
                                                        <div className="flex items-center gap-2 mb-1">
                                                            <div className={`w-1.5 h-1.5 rounded-full ${project.status === 'TERMINÉ' ? 'bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.5)]' : 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]'}`} />
                                                            <span className={`text-[9px] font-black uppercase tracking-widest ${project.status === 'TERMINÉ' ? 'text-rose-500' : 'text-emerald-500'}`}>{project.status || 'ACTIF'}</span>
                                                        </div>
                                                        <h3 className="text-xl md:text-2xl font-black text-white tracking-tight leading-none group-hover:text-blue-400 transition-colors uppercase truncate relative z-10">{project.name}</h3>
                                                    </div>
                                                    <div className="relative shrink-0" onClick={e => e.stopPropagation()}>
                                                        <Button
                                                            variant="secondary"
                                                            size="icon"
                                                            onClick={(e) => { e.stopPropagation(); setOpenMenuId(openMenuId === project.id ? null : project.id); }}
                                                            icon={MoreVertical}
                                                        />

                                                        <AnimatePresence>
                                                            {openMenuId === project.id && (
                                                                <motion.div
                                                                    initial={{ opacity: 0, scale: 0.95, y: 10 }}
                                                                    animate={{ opacity: 1, scale: 1, y: 0 }}
                                                                    exit={{ opacity: 0, scale: 0.95, y: 10 }}
                                                                    className="absolute right-0 mt-2 w-48 bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-white/10 rounded-2xl shadow-2xl z-50 overflow-hidden"
                                                                >
                                                                    <div className="p-2 space-y-1">
                                                                        <button
                                                                            onClick={async (e) => {
                                                                                e.stopPropagation();
                                                                                try {
                                                                                    await businessProjectService.updateBusinessProject(project.id, { name: project.name, description: project.description, status: project.status === 'ACTIF' ? 'TERMINÉ' : 'ACTIF' });
                                                                                    fetchProjects();
                                                                                    toast.success("Statut mis à jour");
                                                                                } catch (error) {
                                                                                    toast.error("Erreur lors de la mise à jour");
                                                                                }
                                                                                setOpenMenuId(null);
                                                                            }}
                                                                            className="w-full flex items-center gap-3 px-4 py-3 text-xs font-bold text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-white/5 rounded-xl transition-all"
                                                                        >
                                                                            <Activity className={`w-3.5 h-3.5 ${project.status === 'ACTIF' ? 'text-rose-600 dark:text-rose-500/70' : 'text-emerald-600 dark:text-emerald-500/70'}`} />
                                                                            {project.status === 'ACTIF' ? 'Marquer Terminé' : 'Marquer Actif'}
                                                                        </button>
                                                                        <button
                                                                            onClick={() => { setEditingProject(project); setNewProject({ name: project.name, description: project.description }); setIsModalOpen(true); setOpenMenuId(null); }}
                                                                            className="w-full flex items-center gap-3 px-4 py-3 text-xs font-bold text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-white/5 rounded-xl transition-all"
                                                                        >
                                                                            <Pencil className="w-3.5 h-3.5 text-blue-600 dark:text-blue-500/70" />
                                                                            {t('releaseManager.menu.edit') || 'Modifier'}
                                                                        </button>
                                                                        <div className="h-px bg-slate-100 dark:bg-white/5 mx-2 my-1" />
                                                                        <button
                                                                            onClick={() => { setProjectToDelete(project.id); setIsDeleteModalOpen(true); setOpenMenuId(null); }}
                                                                            className="w-full flex items-center gap-3 px-4 py-3 text-xs font-bold text-rose-600 dark:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10 rounded-xl transition-all"
                                                                        >
                                                                            <Trash className="w-3.5 h-3.5" />
                                                                            {t('releaseManager.menu.delete') || 'Supprimer'}
                                                                        </button>
                                                                    </div>
                                                                </motion.div>
                                                            )}
                                                        </AnimatePresence>
                                                    </div>
                                                </div>

                                                {/* Description */}
                                                <div className="space-y-2 mb-8 relative z-10">
                                                    <p className="text-slate-400 text-sm font-medium leading-relaxed line-clamp-2">{project.description || <span className="italic opacity-60">{t('portfolio.defaultDesc', 'Aucune description fournie pour ce projet métier.')}</span>}</p>
                                                </div>

                                                {/* Stats */}
                                                <div className="grid grid-cols-2 gap-3 relative z-10">
                                                    <div className="p-4 bg-white/[0.02] group-hover:bg-white/[0.04] transition-colors border border-white/5 rounded-2xl flex flex-col justify-between">
                                                        <div className="flex items-center gap-2 mb-2">
                                                            <Layers className="w-3.5 h-3.5 text-blue-400" />
                                                            <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">{t('portfolio.table.releases', 'Releases')}</p>
                                                        </div>
                                                        <p className="text-2xl font-black text-white">{project.releases_count || 0}</p>
                                                    </div>
                                                    <div className="p-4 bg-white/[0.02] group-hover:bg-white/[0.04] transition-colors border border-white/5 rounded-2xl flex flex-col justify-between">
                                                        <div className="flex items-center gap-2 mb-2">
                                                            <Calendar className="w-3.5 h-3.5 text-emerald-400" />
                                                            <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">{t('portfolio.table.createdAt', 'Créé le')}</p>
                                                        </div>
                                                        <div className="flex items-baseline gap-1.5">
                                                            <p className="text-xl font-black text-white leading-tight uppercase tracking-tighter">
                                                                {new Date(project.created_at).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' }).replace('.', '')}
                                                            </p>
                                                            <p className="text-xs text-slate-500 font-bold">{new Date(project.created_at).getFullYear()}</p>
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
                                                <div className="mt-8 flex items-center justify-between relative z-10">
                                                    <span className="text-[10px] font-black text-blue-400 uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                                                        {project.releases_count > 0 ? "Explorer le projet" : "Commencer"}
                                                    </span>
                                                    <div className="flex items-center gap-2 text-[10px] font-black text-slate-500 group-hover:text-blue-400 transition-colors uppercase tracking-widest">
                                                        {t('portfolio.viewReleases', 'Ouvrir')}
                                                        <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                                                    </div>
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
                                data={paginatedProjects}
                                isLoading={loading}
                                searchable
                                onSearch={setSearchQuery}
                                filters={
                                    <>
                                        <select
                                            value={sortBy}
                                            onChange={(e) => setSortBy(e.target.value as any)}
                                            className="bg-transparent border-none text-xs font-bold text-slate-300 focus:ring-0 outline-none cursor-pointer appearance-none"
                                        >
                                            <option value="newest" className="bg-[#0f172a] text-slate-300">{t('portfolio.filter.newest', 'RÉCENTS')}</option>
                                            <option value="oldest" className="bg-[#0f172a] text-slate-300">{t('portfolio.filter.oldest', 'ANCIENS')}</option>
                                        </select>
                                        <div className="w-px h-4 bg-white/10 mx-2" />
                                        <select
                                            value={filterOwner}
                                            onChange={(e) => setFilterOwner(e.target.value)}
                                            className="bg-transparent border-none text-xs font-bold text-slate-300 focus:ring-0 outline-none cursor-pointer appearance-none"
                                        >
                                            <option value="ALL" className="bg-[#0f172a] text-slate-300">{t('portfolio.filter.allOwners', 'TOUS LES PROPRIÉTAIRES')}</option>
                                            {Array.from(new Set(projects.map(p => p.created_by_username).filter(Boolean))).map(owner => (
                                                <option key={owner as string} value={owner as string} className="bg-[#0f172a] text-slate-300">{owner as string}</option>
                                            ))}
                                        </select>
                                    </>
                                }
                                actions={(item) => (
                                    <div className="flex items-center gap-6 pr-4">
                                        <button
                                            onClick={(e) => { e.stopPropagation(); setEditingProject(item); setNewProject({ name: item.name, description: item.description }); setIsModalOpen(true); }}
                                            className="text-slate-500 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                                            title="Modifier"
                                        >
                                            <Edit size={18} strokeWidth={2.5} />
                                        </button>
                                        <button
                                            onClick={(e) => { e.stopPropagation(); setProjectToDelete(item.id); setIsDeleteModalOpen(true); }}
                                            className="text-slate-500 dark:text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 transition-colors"
                                            title="Supprimer"
                                        >
                                            <Trash2 size={18} strokeWidth={2.5} />
                                        </button>
                                    </div>
                                )}
                            />

                            {/* Pagination */}
                            {totalPages > 1 && (
                                <div className="flex justify-center gap-2 mt-10 pb-10">
                                    <button
                                        onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                                        disabled={currentPage === 1}
                                        className="w-12 h-12 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-slate-400 disabled:opacity-20 disabled:cursor-not-allowed hover:bg-blue-500/10 hover:text-blue-400 hover:border-blue-500/20 transition-all font-black"
                                    >
                                        <ChevronRight className="w-5 h-5 rotate-180" />
                                    </button>
                                    {Array.from({ length: totalPages }).map((_, i) => (
                                        <button
                                            key={i}
                                            onClick={() => setCurrentPage(i + 1)}
                                            className={`w-12 h-12 rounded-xl border font-black text-xs transition-all ${currentPage === i + 1
                                                ? 'bg-blue-600 border-blue-500 text-white shadow-[0_0_20px_rgba(37,99,235,0.4)]'
                                                : 'bg-white/5 border-white/10 text-slate-400 hover:bg-white/10'
                                                }`}
                                        >
                                            {i + 1}
                                        </button>
                                    ))}
                                    <button
                                        onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                                        disabled={currentPage === totalPages}
                                        className="w-12 h-12 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-slate-400 disabled:opacity-20 disabled:cursor-not-allowed hover:bg-blue-500/10 hover:text-blue-400 hover:border-blue-500/20 transition-all font-black"
                                    >
                                        <ChevronRight className="w-5 h-5" />
                                    </button>
                                </div>
                            )}
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
