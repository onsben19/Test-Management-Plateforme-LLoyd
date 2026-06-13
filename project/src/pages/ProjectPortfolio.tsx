import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import PageLayout from '../components/PageLayout';
import {
    Briefcase, Plus, Search, MoreVertical, Edit, Trash2,
    Layers, Calendar, ChevronRight, LayoutGrid, LayoutList, ArrowRight, Pencil, Trash,
    BarChart3, Activity, List, GitMerge, Target
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { businessProjectService } from '../services/api';
import TraceabilityGraphModal from '../components/TraceabilityGraphModal';
import { toast } from 'react-toastify';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import ConfirmModal from '../components/ConfirmModal';
import AdminTable from '../components/AdminTable';
import StatCard from '../components/StatCard';
import { Clock, ArrowDownZa, SortAsc, SortDesc } from 'lucide-react';
import Button from '../components/ui/Button';

// --- Composant réutilisable : description extensible ---
const ExpandableDescription = ({ text, maxChars = 90, emptyLabel = 'Aucune description fournie.' }: { text?: string; maxChars?: number; emptyLabel?: string }) => {
    const [expanded, setExpanded] = useState(false);
    if (!text) return <span className="italic opacity-50 text-xs">{emptyLabel}</span>;
    const isLong = text.length > maxChars;
    return (
        <span>
            {expanded || !isLong ? text : text.slice(0, maxChars) + '…'}
            {isLong && (
                <button
                    onClick={(e) => { e.stopPropagation(); setExpanded(v => !v); }}
                    className="ml-1.5 text-blue-400 hover:text-blue-300 text-[11px] font-black uppercase tracking-widest transition-colors"
                >
                    {expanded ? 'Réduire' : 'Lire la suite'}
                </button>
            )}
        </span>
    );
};


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
    const [isGraphOpen, setIsGraphOpen] = useState(false);
    const [selectedProjectForGraph, setSelectedProjectForGraph] = useState<any>(null);
    const [totalItems, setTotalItems] = useState(0);
    const pageSize = 10;

    const fetchProjects = async (page = 1) => {
        try {
            setLoading(true);
            const response = await businessProjectService.getBusinessProjects({
                search: searchQuery,
                page,
                owner: filterOwner,
                ordering: sortBy === 'newest' ? '-created_at' : 'created_at'
            });
            const data = response.data.results || response.data;
            const count = response.data.count || (Array.isArray(response.data) ? response.data.length : 0);
            setTotalItems(count);
            setProjects(data);
        } catch (error) {
            console.error("Failed to fetch business projects", error);
            toast.error("Erreur lors de la récupération des projets");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        setCurrentPage(1);
        fetchProjects(1);
    }, [searchQuery, filterOwner, sortBy]);

    const handlePageChange = (page: number) => {
        setCurrentPage(page);
        fetchProjects(page);
    };

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
            fetchProjects(currentPage);
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
            variant="secondary"
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
            header: 'ID',
            accessor: (item: any) => <span className="font-mono text-[10px] text-slate-500">{String(item.id).substring(0, 8)}</span>
        },
        {
            header: t('portfolio.table.project', 'Projet'),
            accessor: (item: any) => (
                <div className="flex items-center cursor-pointer">
                    <div className="flex flex-col gap-0.5">
                        <span className="font-bold text-slate-800 dark:text-slate-200 group-hover:text-blue-400 transition-colors tracking-tight text-base">{item.name}</span>
                    </div>
                </div>
            )
        },
        { header: t('portfolio.table.description'), accessor: (item: any) => <DescriptionCell text={item.description} /> },
        { header: t('portfolio.table.releases'), accessor: (item: any) => <span className="font-bold text-blue-600 dark:text-blue-400">{item.releases_count || 0}</span> },
        {
            header: t('portfolio.table.createdAt', 'Date de création'),
            accessor: (item: any) => (
                <div className="flex flex-col gap-0.5">
                    <span className="text-slate-700 dark:text-slate-300 text-[11px] font-bold tracking-tight">{new Date(item.created_at).toLocaleDateString('fr-FR')}</span>
                    <span className="text-[9px] text-slate-600 font-bold uppercase tracking-widest italic opacity-60">Enregistré</span>
                </div>
            )
        },
        {
            header: t('portfolio.table.owner', 'Créé par'),
            accessor: (item: any) => (
                <div className="flex flex-col">
                    <span className="text-slate-700 dark:text-slate-300 text-[11px] font-bold tracking-tight">{item.created_by_username || 'Système'}</span>
                    <span className="text-[9px] text-slate-600 font-bold uppercase tracking-widest italic opacity-60">Créateur</span>
                </div>
            )
        }
    ];

    const isAdmin = user?.role?.toUpperCase() === 'ADMIN';
    const isManager = user?.role?.toUpperCase() === 'MANAGER';

    const totalPages = Math.ceil(totalItems / pageSize);
    const paginatedProjects = projects;

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

                            {/* List View */}
                            <div className="flex flex-col gap-3 max-w-6xl mx-auto pb-10 w-full">
                                {/* LIST HEADER ROW */}
                                {!loading && paginatedProjects.length > 0 && (
                                    <div className="flex items-center px-5 py-2 mb-2 text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 border-b border-slate-200/50 dark:border-white/5 pb-3">
                                        <div className="flex-1 min-w-[200px] ml-6">{t('portfolio.table.project', 'Projet')}</div>
                                        <div className="flex-[2] min-w-[300px] hidden lg:block">{t('portfolio.table.description', 'Description')}</div>
                                        <div className="flex-1 text-center">{t('portfolio.table.releases', 'Releases')}</div>
                                        <div className="flex-1 text-center hidden md:block">{t('portfolio.table.createdAt', 'Créé le')}</div>
                                        <div className="flex-1 text-center">Santé</div>
                                        <div className="flex-1 text-center">Statut</div>
                                        <div className="w-10"></div>
                                    </div>
                                )}
                                {loading ? (
                                    [1, 2, 3].map(i => <div key={i} className="h-16 bg-[#111827] border border-white/[0.07] rounded-[10px] animate-pulse mb-6" />)
                                ) : paginatedProjects.length === 0 ? (
                                    <div className="py-40 text-center opacity-30">
                                        <p className="text-sm font-bold uppercase tracking-widest">{t('portfolio.noProjects', 'Aucun projet trouvé')}</p>
                                    </div>
                                ) : (
                                    paginatedProjects.map((project, idx) => {
                                        const isActive = project.status !== 'TERMINÉ';
                                        const progressWidth = isActive ? Math.min(100, Math.max(15, (project.releases_count || 0) * 20)) : 100;
                                        
                                        return (
                                            <motion.div
                                                key={project.id}
                                                initial={{ opacity: 0, y: 10 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                transition={{ delay: idx * 0.05 }}
                                                onClick={() => navigate('/releases', { state: { businessProjectId: project.id, businessProjectName: project.name } })}
                                                className={`bg-[#111827] border border-white/[0.07] rounded-[14px] py-5 px-7 flex items-center hover:border-blue-500/30 hover:bg-[#1f2937] transition-all cursor-pointer group shadow-sm gap-6 relative ${openMenuId === project.id ? 'z-50' : 'z-0'}`}
                                            >
                                                {/* Left: Dot & Name */}
                                                <div className="flex items-center gap-4 w-[28%] min-w-0 shrink-0">
                                                    <div className={`w-2 h-2 rounded-full shrink-0 ${isActive ? 'bg-[#5DCAA5]' : 'bg-[#F09595]'}`} />
                                                    <h4 
                                                        className="text-[15px] font-bold text-[#e8eaf6] line-clamp-2 leading-tight group-hover:text-blue-400 transition-colors"
                                                        title={project.name}
                                                    >
                                                        {project.name}
                                                    </h4>
                                                </div>

                                                {/* Description */}
                                                <div className="flex-1 min-w-0 flex items-center">
                                                    <div className="text-[13px] font-medium text-white/[0.35] max-w-full" onClick={(e) => e.stopPropagation()}>
                                                        <ExpandableDescription
                                                            text={project.description}
                                                            maxChars={60}
                                                            emptyLabel={t('portfolio.defaultDesc', 'Aucune description fournie')}
                                                        />
                                                    </div>
                                                </div>

                                                {/* Releases & Date */}
                                                <div className="flex items-center gap-6 shrink-0 w-[220px]">
                                                    <span className="text-[13px] font-medium text-white/50">{project.releases_count || 0} release{(project.releases_count || 0) > 1 ? 's' : ''}</span>
                                                    <div className="flex items-center text-white/50">
                                                        <span className="text-[13px] font-medium capitalize">{new Date(project.created_at).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' }).replace('.', '')}</span>
                                                    </div>
                                                </div>

                                                {/* Progress & Status & Actions */}
                                                <div className="flex items-center gap-6 shrink-0 justify-end w-[250px]">
                                                    <div className="w-[80px] h-[4px] bg-white/[0.07] rounded-[2px] overflow-hidden shrink-0">
                                                        <div className={`h-full rounded-[2px] ${isActive ? 'bg-[#1D9E75]' : 'bg-[#E24B4A]'}`} style={{ width: `${progressWidth}%` }} />
                                                    </div>
                                                    
                                                    <span className={`text-[12px] px-[12px] py-[4px] rounded-full font-semibold tracking-wide border ${isActive ? 'bg-[#1D9E75]/15 text-[#5DCAA5] border-[#1D9E75]/30' : 'bg-[#E24B4A]/15 text-[#F09595] border-[#E24B4A]/30'}`}>
                                                        {isActive ? 'Actif' : 'Terminé'}
                                                    </span>

                                                    {/* Actions Menu */}
                                                    <div className="relative flex items-center shrink-0" onClick={e => e.stopPropagation()}>
                                                        <button
                                                            onClick={(e) => { e.stopPropagation(); setOpenMenuId(openMenuId === project.id ? null : project.id); }}
                                                            className="p-1 text-white/30 hover:text-white rounded-md hover:bg-white/5 transition-colors"
                                                        >
                                                            <MoreVertical className="w-4 h-4" />
                                                        </button>
                                                        
                                                        <AnimatePresence>
                                                            {openMenuId === project.id && (
                                                                <motion.div
                                                                    initial={{ opacity: 0, scale: 0.95, y: 10 }}
                                                                    animate={{ opacity: 1, scale: 1, y: 0 }}
                                                                    exit={{ opacity: 0, scale: 0.95, y: 10 }}
                                                                    className="absolute right-0 top-full mt-2 w-48 bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-white/10 rounded-2xl shadow-2xl z-[100] overflow-hidden"
                                                                    onClick={e => e.stopPropagation()}
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
                                                                            className="w-full flex items-center gap-3 px-4 py-3 text-xs font-bold text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-white/10 rounded-xl transition-all"
                                                                        >
                                                                            <Activity className={`w-3.5 h-3.5 ${project.status === 'ACTIF' ? 'text-rose-600 dark:text-rose-500/70' : 'text-emerald-600 dark:text-emerald-500/70'}`} />
                                                                            {project.status === 'ACTIF' ? 'Marquer Terminé' : 'Marquer Actif'}
                                                                        </button>
                                                                        <button
                                                                            onClick={() => { setEditingProject(project); setNewProject({ name: project.name, description: project.description }); setIsModalOpen(true); setOpenMenuId(null); }}
                                                                            className="w-full flex items-center gap-3 px-4 py-3 text-xs font-bold text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-white/10 rounded-xl transition-all"
                                                                        >
                                                                            <Pencil className="w-3.5 h-3.5 text-blue-600 dark:text-blue-500/70" />
                                                                            {t('releaseManager.menu.edit') || 'Modifier'}
                                                                        </button>
                                                                        <button
                                                                            onClick={(e) => {
                                                                                e.stopPropagation();
                                                                                setSelectedProjectForGraph(project);
                                                                                setIsGraphOpen(true);
                                                                                setOpenMenuId(null);
                                                                            }}
                                                                            className="w-full flex items-center gap-3 px-4 py-3 text-xs font-bold text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-white/10 rounded-xl transition-all"
                                                                        >
                                                                            <GitMerge className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-500/70" />
                                                                            Vue Graphe
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

                                                    <ChevronRight className="w-4 h-4 text-white/20 ml-2" />
                                                </div>
                                            </motion.div>
                                        )
                                    })
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
                                onRowClick={(item) => navigate('/admin/releases', { state: { businessProjectId: item.id, businessProjectName: item.name } })}
                                filters={
                                    <>
                                        <select
                                            value={sortBy}
                                            onChange={(e) => setSortBy(e.target.value as any)}
                                        >
                                            <option value="newest" className="bg-white dark:bg-[#0f172a] text-slate-700 dark:text-slate-300">{t('portfolio.filter.newest', 'RÉCENTS')}</option>
                                            <option value="oldest" className="bg-white dark:bg-[#0f172a] text-slate-700 dark:text-slate-300">{t('portfolio.filter.oldest', 'ANCIENS')}</option>
                                        </select>
                                        <div className="w-px h-4 bg-slate-200 dark:bg-white/10 mx-2" />
                                        <select
                                            value={filterOwner}
                                            onChange={(e) => setFilterOwner(e.target.value)}
                                            className="bg-transparent border-none text-xs font-bold text-slate-700 dark:text-slate-300 focus:ring-0 outline-none cursor-pointer appearance-none"
                                        >
                                            <option value="ALL" className="bg-white dark:bg-[#0f172a] text-slate-700 dark:text-slate-300">{t('portfolio.filter.allOwners', 'TOUS LES PROPRIÉTAIRES')}</option>
                                            {Array.from(new Set(projects.map(p => p.created_by_username).filter(Boolean))).map(owner => (
                                                <option key={owner as string} value={owner as string} className="bg-white dark:bg-[#0f172a] text-slate-700 dark:text-slate-300">{owner as string}</option>
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
                                        onClick={() => handlePageChange(Math.max(1, currentPage - 1))}
                                        disabled={currentPage === 1}
                                        className="w-12 h-12 rounded-xl bg-slate-100 dark:bg-white/5 border border-slate-300 dark:border-white/10 flex items-center justify-center text-slate-400 disabled:opacity-20 disabled:cursor-not-allowed hover:bg-blue-500/10 hover:text-blue-400 hover:border-blue-500/20 transition-all font-black"
                                    >
                                        <ChevronRight className="w-5 h-5 rotate-180" />
                                    </button>
                                    {Array.from({ length: totalPages }).map((_, i) => (
                                        <button
                                            key={i}
                                            onClick={() => handlePageChange(i + 1)}
                                            className={`w-12 h-12 rounded-xl border font-black text-xs transition-all ${currentPage === i + 1
                                                ? 'bg-blue-600 border-blue-500 text-white shadow-[0_0_20px_rgba(37,99,235,0.4)]'
                                                : 'bg-slate-100 dark:bg-white/5 border-slate-300 dark:border-white/10 text-slate-400 hover:bg-slate-200 dark:bg-white/10'
                                                }`}
                                        >
                                            {i + 1}
                                        </button>
                                    ))}
                                    <button
                                        onClick={() => handlePageChange(Math.min(totalPages, currentPage + 1))}
                                        disabled={currentPage === totalPages}
                                        className="w-12 h-12 rounded-xl bg-slate-100 dark:bg-white/5 border border-slate-300 dark:border-white/10 flex items-center justify-center text-slate-400 disabled:opacity-20 disabled:cursor-not-allowed hover:bg-blue-500/10 hover:text-blue-400 hover:border-blue-500/20 transition-all font-black"
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

            <TraceabilityGraphModal
                isOpen={isGraphOpen}
                onClose={() => setIsGraphOpen(false)}
                projectData={selectedProjectForGraph}
            />
        </PageLayout>
    );
};

export default ProjectPortfolio;
