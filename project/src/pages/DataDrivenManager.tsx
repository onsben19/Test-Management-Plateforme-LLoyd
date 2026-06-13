import React, { useState, useMemo, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'react-toastify';
import { useLocation, useNavigate } from 'react-router-dom';
import { useSidebar } from '../context/SidebarContext';
import {
    Upload, FileSpreadsheet, Calendar, Eye, Trash2, Edit, Search, Filter, MoreVertical, FileText,
    Layers, X, CheckCircle, ShieldAlert, ShieldCheck, ShieldQuestion,
    Zap, TrendingUp, Clock, AlertTriangle, ArrowRight, ArrowLeft, LayoutGrid,
    Sparkles, ChevronRight, History, XCircle, Briefcase, Activity, Target,
    Award, Info, SortAsc, Bot, Flag, Users
} from 'lucide-react';

// --- Composant réutilisable : description extensible ---
const ExpandableDescription = ({ text, maxChars = 90, emptyLabel = 'Aucune description.' }: { text?: string; maxChars?: number; emptyLabel?: string }) => {
    const [expanded, setExpanded] = useState(false);
    if (!text) return <p className="text-sm text-slate-400 leading-relaxed mb-5 italic opacity-60">{emptyLabel}</p>;
    const isLong = text.length > maxChars;
    return (
        <p className="text-sm text-slate-400 leading-relaxed mb-5 opacity-70">
            {expanded || !isLong ? text : text.slice(0, maxChars) + '…'}
            {isLong && (
                <button
                    onClick={(e) => { e.stopPropagation(); setExpanded(v => !v); }}
                    className="ml-1.5 text-blue-400 hover:text-blue-300 text-[11px] font-black uppercase tracking-widest transition-colors"
                >
                    {expanded ? 'Réduire' : 'Lire la suite'}
                </button>
            )}
        </p>
    );
};


import { campaignService, userService, aiService, projectService } from '../services/api';
import Pagination from '../components/Pagination';
import StarBorder from '../components/bits/StarBorder';
import StatCard from '../components/StatCard';
import ReadinessGauge from '../components/ReadinessGauge';
import AIInsightModal from '../components/AIInsightModal';
import CatchupPlanIA from '../components/CatchupPlanIA';
import { motion, AnimatePresence } from 'framer-motion';
import PageLayout from '../components/PageLayout';
import Button from '../components/ui/Button';
import { createPortal } from 'react-dom';

interface TimelineGuardData {
    status: 'OPTIMAL' | 'WARNING' | 'CRITICAL' | 'INITIAL' | 'WAITING';
    velocity: number;
    projected_end_date: string | null;
    delay_days: number;
    message: string;
    progress: {
        finished: number;
        total: number;
        percentage: number;
    };
}

interface ImportedFile {
    id: string;
    name: string;
    description: string;
    date: string;
    size: string;
    rowCount: number;
    data: any[];
    excel_file?: string;
    assigned_testers_names?: string[];
    assigned_testers?: number[];
    tester_quotas?: Record<string, number>;
    project_id?: string;
    start_date?: string;
    estimated_end_date?: string;
    scheduled_at?: string;
}

interface User {
    id: number;
    username: string;
    email: string;
    role: string;
}

const DataDrivenManager = () => {
    const { t } = useTranslation();
    const location = useLocation();
    const navigate = useNavigate();
    useSidebar();

    const [activeReleaseId, setActiveReleaseId] = useState<string | undefined>(location.state?.releaseId?.toString());
    const [activeReleaseName, setActiveReleaseName] = useState<string | undefined>(location.state?.releaseName);

    useEffect(() => {
        if (!activeReleaseId) {
            projectService.getProjects()
                .then(res => {
                    const data = res.data.results ?? res.data;
                    if (data && data.length > 0) {
                        setActiveReleaseId(data[0].id.toString());
                        setActiveReleaseName(data[0].name);
                    } else {
                        setLoading(false);
                    }
                })
                .catch(() => {
                    setLoading(false);
                });
        }
    }, [activeReleaseId]);

    const [importedFiles, setImportedFiles] = useState<ImportedFile[]>([]);
    const [timelineGuards, setTimelineGuards] = useState<Record<string, TimelineGuardData>>({});
    const [loading, setLoading] = useState(true);
    const [isAIModalOpen, setIsAIModalOpen] = useState(false);
    const [selectedEntityName, setSelectedEntityName] = useState("");
    const [selectedAIInsight, setSelectedAIInsight] = useState<string | undefined>(undefined);
    const [activeCampaignId, setActiveCampaignId] = useState<number | null>(null);
    const [selectedCampaignId, setSelectedCampaignId] = useState<string | null>(null);
    const [isOptimizingSidebar, setIsOptimizingSidebar] = useState(false);

    const [currentPage, setCurrentPage] = useState(1);
    const [totalItems, setTotalItems] = useState(0);
    const pageSize = 10;

    const [searchQuery, setSearchQuery] = useState('');
    const [testerFilter, setTesterFilter] = useState('');
    const [sortOrder, setSortOrder] = useState<'newest' | 'oldest'>('newest');

    const [deleteModal, setDeleteModal] = useState<{ isOpen: boolean; fileId: string | null }>({
        isOpen: false,
        fileId: null
    });

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingCampaign, setEditingCampaign] = useState<ImportedFile | null>(null);
    const [testers, setTesters] = useState<User[]>([]);
    const [showScheduleSelector, setShowScheduleSelector] = useState(false);
    const [isQuotaModalOpen, setIsQuotaModalOpen] = useState(false);
    const [isSingleQuotaModalOpen, setIsSingleQuotaModalOpen] = useState(false);
    const [pendingTester, setPendingTester] = useState<any | null>(null);
    const [openMenuId, setOpenMenuId] = useState<string | null>(null);
    const [openTestersId, setOpenTestersId] = useState<string | null>(null);
    const [testerQuotas, setTesterQuotas] = useState<Record<number, number>>({});
    const [tempQuota, setTempQuota] = useState<number>(0);

    const [campaignForm, setCampaignForm] = useState({
        title: '',
        description: '',
        nb_test_cases: 0,
        file: null as File | null,
        assigned_testers: [] as number[],
        start_date: '',
        estimated_end_date: '',
        scheduled_at: ''
    });

    useEffect(() => {
        if (activeReleaseId) {
            fetchCampaigns(1);
            fetchTesters();
            setCurrentPage(1);
        } else {
            setLoading(false);
        }
    }, [activeReleaseId, searchQuery, testerFilter, sortOrder]);



    const handleOpenAIInsight = (campaignId: string, name: string) => {
        const guard = timelineGuards[campaignId];
        setSelectedAIInsight(guard?.message || "Analyse en attente...");
        setSelectedEntityName(name);
        setActiveCampaignId(parseInt(campaignId)); // Track current campaign for potential optimization
        setIsAIModalOpen(true);
    };

    const handlePageChange = (page: number) => {
        setCurrentPage(page);
        fetchCampaigns(page);
    };

    const fetchCampaigns = async (page = 1) => {
        if (!activeReleaseId) return;
        try {
            setLoading(true);
            const response = await campaignService.getCampaigns({
                project: activeReleaseId,
                page,
                search: searchQuery,
                tester: testerFilter,
                ordering: sortOrder === 'newest' ? '-created_at' : 'created_at'
            });
            const responseData = response.data || {};
            const data = (responseData.results || (Array.isArray(responseData) ? responseData : []));
            const count = responseData.count || (Array.isArray(data) ? data.length : 0);

            setTotalItems(count);

            const mappedCampaigns = Array.isArray(data) ? data.map((camp: any) => ({
                id: camp.id.toString(),
                name: camp.title,
                description: camp.description || '',
                date: new Date(camp.created_at).toLocaleDateString('fr-FR'),
                rawDate: camp.created_at,
                size: 'N/A',
                rowCount: camp.nb_test_cases || 0,
                data: [],
                excel_file: camp.excel_file,
                assigned_testers_names: camp.assigned_testers_names || [],
                assigned_testers: camp.assigned_testers || [],
                tester_quotas: camp.tester_quotas || {},
                project_id: camp.project,
                start_date: camp.start_date,
                estimated_end_date: camp.estimated_end_date,
                scheduled_at: camp.scheduled_at
            })) : [];
            setImportedFiles(mappedCampaigns);

            mappedCampaigns.forEach((camp: any) => {
                fetchTimelineGuard(camp.id);
            });
        } catch (error) {
            console.error("Failed to fetch campaigns", error);
            toast.error("Erreur de chargement des campagnes");
        } finally {
            setLoading(false);
        }
    };

    const filteredAndSortedFiles = importedFiles;

    const fetchTimelineGuard = async (campaignId: string) => {
        try {
            const response = await aiService.getTimelineGuard(campaignId);
            setTimelineGuards(prev => ({
                ...prev,
                [campaignId]: response.data
            }));
        } catch (error) {
            console.error(`Failed to fetch timeline guard for ${campaignId}`, error);
        }
    };



    const fetchTesters = async () => {
        try {
            const response = await userService.getUsers({ role: 'TESTER' });
            const responseData = response.data || {};
            setTesters(responseData.results || (Array.isArray(responseData) ? responseData : []));
        } catch (error) {
            console.error("Failed to fetch testers", error);
        }
    };

    const stats = useMemo(() => {
        const total = (importedFiles || []).length;
        const active = (importedFiles || []).filter(f => {
            const guard = timelineGuards?.[f.id];
            return guard && guard.progress?.percentage < 100;
        }).length;
        const critical = Object.values(timelineGuards || {}).filter(g => g?.status === 'CRITICAL').length;
        const finished = (importedFiles || []).filter(f => {
            const guard = timelineGuards?.[f.id];
            return guard && guard.progress?.percentage === 100;
        }).length;

        return { total, active, critical, finished };
    }, [importedFiles, timelineGuards]);

    const openCreateModal = () => {
        setEditingCampaign(null);
        setCampaignForm({
            title: '',
            description: '',
            nb_test_cases: 0,
            file: null,
            assigned_testers: [],
            start_date: '',
            estimated_end_date: '',
            scheduled_at: ''
        });
        setShowScheduleSelector(false);
        setIsModalOpen(true);
    };

    const openEditModal = (campaign: ImportedFile, e: React.MouseEvent) => {
        e.stopPropagation();
        setEditingCampaign(campaign);
        setCampaignForm({
            title: campaign.name,
            description: campaign.description,
            nb_test_cases: campaign.rowCount,
            file: null,
            assigned_testers: campaign.assigned_testers || [],
            start_date: campaign.start_date || '',
            estimated_end_date: campaign.estimated_end_date || '',
            scheduled_at: campaign.scheduled_at || ''
        });

        // Charger les quotas existants
        if (campaign.tester_quotas) {
            const quotas: Record<number, number> = {};
            Object.entries(campaign.tester_quotas).forEach(([id, quota]) => {
                quotas[Number(id)] = Number(quota);
            });
            setTesterQuotas(quotas);
        }

        setShowScheduleSelector(!!campaign.scheduled_at);
        setIsModalOpen(true);
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setCampaignForm({ ...campaignForm, file, title: campaignForm.title || file.name });
        }
    };

    // State definitions moved to top

    const confirmSingleQuota = () => {
        if (!pendingTester) return;

        setCampaignForm({
            ...campaignForm,
            assigned_testers: [...campaignForm.assigned_testers, pendingTester.id]
        });

        setTesterQuotas({
            ...testerQuotas,
            [pendingTester.id]: tempQuota || campaignForm.nb_test_cases || 10
        });

        setIsSingleQuotaModalOpen(false);
        setPendingTester(null);
        setTempQuota(0);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!activeReleaseId) return;

        if (!editingCampaign && !campaignForm.file) {
            toast.error("Veuillez sélectionner un fichier.");
            return;
        }

        const formData = new FormData();
        formData.append('title', campaignForm.title);
        formData.append('description', campaignForm.description);
        formData.append('project', activeReleaseId);
        formData.append('nb_test_cases', campaignForm.nb_test_cases.toString());
        if (campaignForm.start_date) formData.append('start_date', campaignForm.start_date);
        if (campaignForm.estimated_end_date) formData.append('estimated_end_date', campaignForm.estimated_end_date);
        if (campaignForm.scheduled_at) formData.append('scheduled_at', campaignForm.scheduled_at);

        if (campaignForm.file) {
            formData.append('excel_file', campaignForm.file);
        }

        campaignForm.assigned_testers.forEach(id => {
            formData.append('assigned_testers', id.toString());
        });

        // Ajouter les quotas au format JSON
        formData.append('tester_quotas', JSON.stringify(testerQuotas));

        try {
            if (editingCampaign) {
                await campaignService.updateCampaign(editingCampaign.id, formData);
                toast.success("Campagne modifiée avec succès");
            } else {
                await campaignService.createCampaign(formData);
                toast.success("Campagne créée avec succès");
            }
            setIsModalOpen(false);
            setIsQuotaModalOpen(false);
            fetchCampaigns();
        } catch (error) {
            console.error('Save error:', error);
            toast.error("Erreur lors de l'enregistrement de la campagne.");
        }
    };

    const handleQuickUnassign = async (e: React.MouseEvent, file: any, testerId: number) => {
        e.stopPropagation();
        
        try {
            const formData = new FormData();
            formData.append('title', file.title || file.name);
            if (file.description) formData.append('description', file.description);
            formData.append('project', activeReleaseId?.toString() || '');
            formData.append('nb_test_cases', file.nb_test_cases?.toString() || '0');
            
            const newTesters = (file.assigned_testers || []).filter((id: number) => id !== testerId);
            newTesters.forEach((id: number) => {
                formData.append('assigned_testers', id.toString());
            });

            await campaignService.updateCampaign(file.id, formData);
            fetchCampaigns();
            toast.success("Testeur retiré avec succès");
        } catch (error) {
            console.error(error);
            toast.error("Erreur lors du retrait du testeur");
        }
    };

    const handleDeleteFile = (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        setDeleteModal({ isOpen: true, fileId: id });
    };

    const confirmDelete = async () => {
        if (!deleteModal.fileId) return;
        try {
            await campaignService.deleteCampaign(deleteModal.fileId);
            toast.success("Campagne supprimée");
            fetchCampaigns();
        } catch (error) {
            toast.error("Erreur suppression");
        } finally {
            setDeleteModal({ isOpen: false, fileId: null });
        }
    };

    const handleOpenPreview = (file: ImportedFile) => {
        if (file.excel_file) {
            window.open(file.excel_file, '_blank');
        } else {
            toast.warning("Fichier introuvable");
        }
    };

    return (
        <PageLayout
            title="Campagnes de Tests"
            subtitle={`${activeReleaseName || 'SANS RELEASE'}`}
            actions={
                <Button
                    onClick={openCreateModal}
                    icon={Upload}
                >
                    NOUVELLE CAMPAGNE
                </Button>
            }
        >
            <div className="space-y-12">
                {/* Stats Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                    <StatCard
                        title="Total Campagnes"
                        value={stats.total}
                        icon={Layers}
                        variant="blue"
                        description="Toutes les campagnes"
                    />
                    <StatCard
                        title="Campagnes Actives"
                        value={stats.active}
                        icon={Zap}
                        variant="purple"
                        description="En cours d'exécution"
                    />
                    <StatCard
                        title="Risques Critiques"
                        value={stats.critical}
                        icon={AlertTriangle}
                        variant="red"
                        description="Détecté par ML Guard"
                        change={stats.critical > 0 ? `+${stats.critical}` : undefined}
                        changeType="negative"
                    />
                    <StatCard
                        title="Terminées"
                        value={stats.finished}
                        icon={CheckCircle}
                        variant="green"
                        description="Tests clôturés"
                    />
                </div>

                {/* Search & Filter Bar */}
                <div className="flex flex-col md:flex-row gap-4 items-stretch md:items-center">
                    <div className="flex-1 bg-slate-50 dark:bg-white/[0.02] border border-slate-200 dark:border-white/[0.05] rounded-xl p-3 flex items-center gap-3">
                        <Search className="w-4 h-4 text-slate-400 ml-2" />
                        <input
                            type="text"
                            placeholder="Rechercher une campagne..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="flex-1 bg-transparent border-none text-sm text-slate-900 dark:text-white focus:ring-0 outline-none placeholder-slate-400"
                        />
                    </div>
                    <div className="flex-1 bg-slate-50 dark:bg-white/[0.02] border border-slate-200 dark:border-white/[0.05] rounded-xl p-3 flex items-center gap-3">
                        <Filter className="w-4 h-4 text-slate-400 ml-2" />
                        <input
                            type="text"
                            placeholder="Filtrer par testeur..."
                            value={testerFilter}
                            onChange={(e) => setTesterFilter(e.target.value)}
                            className="flex-1 bg-transparent border-none text-sm text-slate-900 dark:text-white focus:ring-0 outline-none placeholder-slate-400"
                        />
                    </div>
                    <div className="bg-slate-50 dark:bg-white/[0.02] border border-slate-200 dark:border-white/[0.05] rounded-xl p-1 flex items-center gap-1">
                        <div className="relative flex items-center">
                            <select
                                className="bg-transparent text-slate-900 dark:text-white text-[10px] font-black uppercase tracking-[0.2em] pl-4 pr-10 py-2 outline-none cursor-pointer appearance-none relative z-10"
                                value={sortOrder}
                                onChange={(e) => setSortOrder(e.target.value as 'newest' | 'oldest')}
                            >
                                <option value="newest" className="bg-slate-950">PLUS RÉCENT</option>
                                <option value="oldest" className="bg-slate-950">PLUS ANCIEN</option>
                            </select>
                            <SortAsc className="absolute right-3 w-3.5 h-3.5 text-slate-500 pointer-events-none" />
                        </div>
                    </div>
                </div>

                {/* Campaign Grid */}
                {loading ? (
                    <div className="flex flex-col items-center justify-center py-32 space-y-4">
                        <div className="w-12 h-12 border-4 border-blue-500/20 border-t-blue-500 rounded-full animate-spin"></div>
                        <p className="text-slate-500 font-bold uppercase tracking-widest text-xs">Chargement des campagnes...</p>
                    </div>
                ) : (
                    <>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        {/* 1. EN RETARD */}
                        <div className="bg-[#111827] border border-white/[0.07] rounded-xl overflow-hidden flex flex-col h-[700px]">
                            <div className="px-3.5 py-3 border-b border-white/[0.07] flex items-center justify-between shrink-0">
                                <span className="text-[11px] font-medium tracking-[0.07em] text-[#F09595]">EN RETARD</span>
                                <span className="bg-white/[0.07] text-white/40 text-[11px] px-2 py-0.5 rounded-full">
                                    {(filteredAndSortedFiles || []).filter(f => ['CRITICAL', 'WARNING'].includes(timelineGuards[f.id]?.status) && timelineGuards[f.id]?.progress?.percentage !== 100).length}
                                </span>
                            </div>
                            <div className="p-2.5 flex flex-col gap-2 overflow-y-auto flex-1 custom-scrollbar">
                                {(filteredAndSortedFiles || []).filter(f => ['CRITICAL', 'WARNING'].includes(timelineGuards[f.id]?.status) && timelineGuards[f.id]?.progress?.percentage !== 100).map(file => {
                                    const guard = timelineGuards[file.id];
                                    const rate = guard?.progress?.percentage || 0;
                                    return (
                                        <div key={file.id} onClick={() => setSelectedCampaignId(file.id)} className="bg-[#1a2235] border border-white/[0.07] rounded-lg p-3 cursor-pointer hover:border-[#F09595]/50 hover:bg-[#1f2937] transition-all">
                                            <div className="text-[13px] font-medium text-[#e8eaf6] whitespace-nowrap overflow-hidden text-ellipsis mb-1.5">{file.name}</div>
                                            <div className="h-[3px] bg-white/[0.07] rounded-full w-full mb-3">
                                                <div className="h-full bg-[#E24B4A] rounded-full" style={{ width: `${rate}%` }} />
                                            </div>
                                            <div className="flex items-center justify-between">
                                                <span className="text-[#E24B4A] font-bold text-[11px]">{Math.round(rate)}%</span>
                                                <div className="flex items-center gap-1 text-white/30 text-[11px]">
                                                    <FileText size={10} /> {file.rowCount} cas
                                                </div>
                                            </div>
                                            {file.assigned_testers_names && file.assigned_testers_names.length > 0 && (
                                                <div className="flex items-center justify-between mt-3 pt-3 border-t border-white/[0.04]">
                                                    <div className="flex -space-x-1.5">
                                                        {file.assigned_testers_names.slice(0, 3).map((n, i) => (
                                                            <div key={i} className="w-5 h-5 rounded-full bg-[#185FA5] border-[1.5px] border-[#1a2235] flex items-center justify-center text-[8px] font-bold text-white uppercase" title={n}>
                                                                {n.charAt(0)}
                                                            </div>
                                                        ))}
                                                    </div>
                                                    <span className="text-[10px] text-white/30">{guard?.projected_end_date ? `Fin : ${new Date(guard.projected_end_date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}` : ''}</span>
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        {/* 2. EN COURS */}
                        <div className="bg-[#111827] border border-white/[0.07] rounded-xl overflow-hidden flex flex-col h-[700px]">
                            <div className="px-3.5 py-3 border-b border-white/[0.07] flex items-center justify-between shrink-0">
                                <span className="text-[11px] font-medium tracking-[0.07em] text-[#EF9F27]">EN COURS</span>
                                <span className="bg-white/[0.07] text-white/40 text-[11px] px-2 py-0.5 rounded-full">
                                    {(filteredAndSortedFiles || []).filter(f => !['CRITICAL', 'WARNING'].includes(timelineGuards[f.id]?.status) && timelineGuards[f.id]?.progress?.percentage !== 100).length}
                                </span>
                            </div>
                            <div className="p-2.5 flex flex-col gap-2 overflow-y-auto flex-1 custom-scrollbar">
                                {(filteredAndSortedFiles || []).filter(f => !['CRITICAL', 'WARNING'].includes(timelineGuards[f.id]?.status) && timelineGuards[f.id]?.progress?.percentage !== 100).map(file => {
                                    const guard = timelineGuards[file.id];
                                    const rate = guard?.progress?.percentage || 0;
                                    return (
                                        <div key={file.id} onClick={() => setSelectedCampaignId(file.id)} className="bg-[#1a2235] border border-white/[0.07] rounded-lg p-3 cursor-pointer hover:border-[#EF9F27]/50 hover:bg-[#1f2937] transition-all">
                                            <div className="text-[13px] font-medium text-[#e8eaf6] whitespace-nowrap overflow-hidden text-ellipsis mb-1.5">{file.name}</div>
                                            <div className="h-[3px] bg-white/[0.07] rounded-full w-full mb-3">
                                                <div className="h-full bg-[#1D9E75] rounded-full" style={{ width: `${rate}%` }} />
                                            </div>
                                            <div className="flex items-center justify-between">
                                                <span className="text-[#1D9E75] font-bold text-[11px]">{Math.round(rate)}%</span>
                                                <div className="flex items-center gap-1 text-white/30 text-[11px]">
                                                    <FileText size={10} /> {file.rowCount} cas
                                                </div>
                                            </div>
                                            {file.assigned_testers_names && file.assigned_testers_names.length > 0 && (
                                                <div className="flex items-center justify-between mt-3 pt-3 border-t border-white/[0.04]">
                                                    <div className="flex -space-x-1.5">
                                                        {file.assigned_testers_names.slice(0, 3).map((n, i) => (
                                                            <div key={i} className="w-5 h-5 rounded-full bg-[#185FA5] border-[1.5px] border-[#1a2235] flex items-center justify-center text-[8px] font-bold text-white uppercase" title={n}>
                                                                {n.charAt(0)}
                                                            </div>
                                                        ))}
                                                    </div>
                                                    <span className="text-[10px] text-white/30">{guard?.projected_end_date ? `Fin : ${new Date(guard.projected_end_date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}` : ''}</span>
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        {/* 3. TERMINÉ */}
                        <div className="bg-[#111827] border border-white/[0.07] rounded-xl overflow-hidden flex flex-col h-[700px]">
                            <div className="px-3.5 py-3 border-b border-white/[0.07] flex items-center justify-between shrink-0">
                                <span className="text-[11px] font-medium tracking-[0.07em] text-[#5DCAA5]">TERMINÉ</span>
                                <span className="bg-white/[0.07] text-white/40 text-[11px] px-2 py-0.5 rounded-full">
                                    {(filteredAndSortedFiles || []).filter(f => timelineGuards[f.id]?.progress?.percentage === 100).length}
                                </span>
                            </div>
                            <div className="p-2.5 flex flex-col gap-2 overflow-y-auto flex-1 custom-scrollbar">
                                {(filteredAndSortedFiles || []).filter(f => timelineGuards[f.id]?.progress?.percentage === 100).map(file => {
                                    const guard = timelineGuards[file.id];
                                    const rate = guard?.progress?.percentage || 0;
                                    return (
                                        <div key={file.id} onClick={() => setSelectedCampaignId(file.id)} className="bg-[#1a2235] border border-white/[0.07] rounded-lg p-3 cursor-pointer hover:border-[#5DCAA5]/50 hover:bg-[#1f2937] transition-all">
                                            <div className="text-[13px] font-medium text-[#e8eaf6] whitespace-nowrap overflow-hidden text-ellipsis mb-1.5">{file.name}</div>
                                            <div className="h-[3px] bg-white/[0.07] rounded-full w-full mb-3">
                                                <div className="h-full bg-[#5DCAA5] rounded-full" style={{ width: `100%` }} />
                                            </div>
                                            <div className="flex items-center justify-between">
                                                <span className="text-[#5DCAA5] font-bold text-[11px]">100%</span>
                                                <div className="flex items-center gap-1 text-white/30 text-[11px]">
                                                    <FileText size={10} /> {file.rowCount} cas
                                                </div>
                                            </div>
                                            {file.assigned_testers_names && file.assigned_testers_names.length > 0 && (
                                                <div className="flex items-center justify-between mt-3 pt-3 border-t border-white/[0.04]">
                                                    <div className="flex -space-x-1.5">
                                                        {file.assigned_testers_names.slice(0, 3).map((n, i) => (
                                                            <div key={i} className="w-5 h-5 rounded-full bg-[#185FA5] border-[1.5px] border-[#1a2235] flex items-center justify-center text-[8px] font-bold text-white uppercase" title={n}>
                                                                {n.charAt(0)}
                                                            </div>
                                                        ))}
                                                    </div>
                                                    <span className="text-[10px] text-white/30">{guard?.projected_end_date ? `Fin : ${new Date(guard.projected_end_date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}` : ''}</span>
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                        </div>
                        {importedFiles.length === 0 && (
                            <div className="col-span-full py-24 text-center bg-slate-100 dark:bg-white/5 rounded-[3rem] border-2 border-dashed border-slate-300 dark:border-white/10">
                                <FileSpreadsheet className="w-16 h-16 text-slate-700 mx-auto mb-6" />
                                <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">Aucune campagne disponible</h3>
                                <p className="text-slate-500 text-sm max-w-sm mx-auto">Importez votre premier cahier de tests Excel pour commencer le suivi.</p>
                            </div>
                        )}
                    </>
                )}

                <Pagination
                    currentPage={currentPage}
                    totalItems={totalItems}
                    pageSize={pageSize}
                    onPageChange={handlePageChange}
                    loading={loading}
                />



                <AIInsightModal
                    isOpen={isAIModalOpen}
                    onClose={() => setIsAIModalOpen(false)}
                    title={selectedEntityName}
                    insight={selectedAIInsight || "Analyse en attente..."}
                    onOptimize={() => {
                        setIsAIModalOpen(false);
                        if (activeCampaignId) {
                            navigate(`/manager/optimization/${activeCampaignId}`);
                        }
                    }}
                    showOptimizeButton={activeCampaignId ? ['CRITICAL', 'WARNING'].includes(timelineGuards[activeCampaignId.toString()]?.status) : false}
                />
            </div>

            
            {/* Campaign Sidebar */}
            {typeof document !== 'undefined' && createPortal(
                <AnimatePresence>
                    {selectedCampaignId && (() => {
                        const file = importedFiles.find(f => f.id === selectedCampaignId);
                        if (!file) return null;
                        const guard = timelineGuards[file.id];
                        const total = guard?.progress?.total || file.rowCount || 0;
                        const passed = guard?.progress?.finished || 0;
                        const failed = Math.max(0, total - passed);
                        const rate = guard?.progress?.percentage || 0;

                        return (
                            <div className="fixed inset-0 z-[99999] flex justify-end">
                                <motion.div
                                    key="sidebar-bg"
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    exit={{ opacity: 0 }}
                                    className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm"
                                    onClick={() => { setSelectedCampaignId(null); setIsOptimizingSidebar(false); }}
                                />
                                <motion.div
                                    key="sidebar-panel"
                                    initial={{ x: '100%' }}
                                    animate={{ x: 0 }}
                                    exit={{ x: '100%' }}
                                    transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                                    className="relative w-full max-w-3xl bg-[#0f172a] border-l border-white/[0.07] h-full shadow-2xl flex flex-col"
                                >
                                    {/* Header */}
                                <div className="p-6 border-b border-white/[0.05] flex items-center justify-between shrink-0">
                                    <h2 className="text-lg font-bold text-white truncate pr-4">{file.name}</h2>
                                    <div className="flex items-center gap-2">
                                        <button onClick={(e) => { openEditModal(file, e); }} className="p-2 text-white/50 hover:text-white hover:bg-white/5 rounded-lg transition-colors">
                                            <Edit size={16} />
                                        </button>
                                        <button onClick={(e) => { handleDeleteFile(file.id, e); setSelectedCampaignId(null); }} className="p-2 text-rose-500/70 hover:text-rose-500 hover:bg-rose-500/10 rounded-lg transition-colors">
                                            <Trash2 size={16} />
                                        </button>
                                        <div className="w-px h-6 bg-white/[0.07] mx-1" />
                                        <button onClick={() => { setSelectedCampaignId(null); setIsOptimizingSidebar(false); }} className="p-2 text-white/50 hover:text-white bg-white/[0.03] hover:bg-white/10 rounded-lg transition-colors">
                                            <X size={16} />
                                        </button>
                                    </div>
                                </div>

                                {/* Body */}
                                <div className="p-6 overflow-y-auto flex-1 custom-scrollbar space-y-6 relative">
                                    {isOptimizingSidebar ? (
                                        <div className="animate-fade-in">
                                            <button onClick={() => setIsOptimizingSidebar(false)} className="mb-4 flex items-center gap-2 text-xs font-bold text-slate-400 hover:text-white uppercase tracking-widest transition-colors">
                                                <ArrowLeft size={14} /> Retour aux détails
                                            </button>
                                            <CatchupPlanIA campaignId={file.id} onClose={() => setIsOptimizingSidebar(false)} />
                                        </div>
                                    ) : (
                                        <>
                                    {/* Section 1 — Meta dates */}
                                        <div className="flex gap-2">
                                            <div className="flex items-center gap-1.5 px-[11px] py-[5px] bg-white/[0.06] border-[0.5px] border-white/10 rounded-[20px]">
                                                <Calendar size={12} className="text-white/50" />
                                                <span className="text-[11px] font-medium text-white/50">{file.date}</span>
                                            </div>
                                            <div className="flex items-center gap-1.5 px-[11px] py-[5px] bg-[#E24B4A]/12 border-[0.5px] border-[#E24B4A]/25 rounded-[20px]">
                                                <Clock size={12} className="text-[#F09595]" />
                                                <span className="text-[11px] font-medium text-[#F09595]">
                                                    Deadline {guard?.projected_end_date ? new Date(guard.projected_end_date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' }) : '—'}
                                                </span>
                                            </div>
                                        </div>

                                        {/* Section 2 — Description */}
                                        {file.description && (
                                            <div className="bg-[#1a2235] rounded-[12px] border-[0.5px] border-white/[0.07] p-[14px]">
                                                <div className="flex items-center gap-1.5 text-[10px] font-bold text-white/40 uppercase tracking-widest mb-2">
                                                    <FileText size={12} />
                                                    DESCRIPTION
                                                </div>
                                                <p className="text-[13px] text-white/55 leading-[1.6]">{file.description}</p>
                                            </div>
                                        )}

                                        {/* Section 3 — Progression & Cadence */}
                                        <div className="bg-[#1a2235] rounded-[12px] border-[0.5px] border-white/[0.07] p-[14px]">
                                            <div className="flex items-center gap-1.5 text-[10px] font-bold text-white/40 uppercase tracking-widest mb-4">
                                                <TrendingUp size={12} />
                                                PROGRESSION & CADENCE
                                            </div>

                                            <div className="flex items-center gap-4 mb-4">
                                                <div className="relative w-[56px] h-[56px] shrink-0">
                                                    <svg viewBox="0 0 50 50" className="w-full h-full -rotate-90">
                                                        <circle cx="25" cy="25" r="22" fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth="4" />
                                                        <motion.circle
                                                            cx="25" cy="25" r="22" fill="none"
                                                            stroke="#E24B4A"
                                                            strokeWidth="4"
                                                            strokeDasharray={2 * 3.14159 * 22}
                                                            initial={{ strokeDashoffset: 2 * 3.14159 * 22 }}
                                                            animate={{ strokeDashoffset: (2 * 3.14159 * 22) * (1 - rate / 100) }}
                                                            transition={{ duration: 1.5, ease: 'easeOut' }}
                                                            strokeLinecap="round"
                                                        />
                                                    </svg>
                                                    <div className="absolute inset-0 flex items-center justify-center">
                                                        <span className="text-[13px] font-bold text-white">{Math.round(rate)}%</span>
                                                    </div>
                                                </div>

                                                <div className="flex flex-col justify-center gap-1.5">
                                                    <div className="flex items-center gap-1.5">
                                                        <CheckCircle size={12} className="text-[#5DCAA5]" />
                                                        <span className="text-[12px] font-medium text-[#5DCAA5]">{passed} validés</span>
                                                    </div>
                                                    <div className="flex items-center gap-1.5">
                                                        <Clock size={12} className="text-[#85B7EB]" />
                                                        <span className="text-[12px] font-medium text-[#85B7EB]">{failed} restants</span>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="relative h-[4px] w-full bg-white/[0.07] rounded-[2px] overflow-hidden mb-2">
                                                <motion.div
                                                    initial={{ width: 0 }}
                                                    animate={{ width: `${rate}%` }}
                                                    className="h-full rounded-[2px] bg-[#E24B4A]"
                                                />
                                            </div>
                                            <div className="flex justify-between text-[11px] text-white/40 mb-4 font-medium">
                                                <span>{passed} tests validés</span>
                                                <span>Cible : {total}</span>
                                            </div>

                                            <div className="grid grid-cols-2 gap-[8px]">
                                                <div className="bg-[#111827] rounded-[8px] px-[12px] py-[10px]">
                                                    <div className="flex items-center gap-1.5 text-[10px] font-bold text-white/40 uppercase tracking-widest mb-1">
                                                        <Bot size={10} />
                                                        CADENCE IA
                                                    </div>
                                                    <div className="flex items-baseline gap-1 mt-1">
                                                        <span className="text-[16px] font-bold text-white leading-none">{guard?.velocity || 0}</span>
                                                        <span className="text-[12px] text-white/40">test/j</span>
                                                    </div>
                                                </div>
                                                <div className="bg-[#1a0f0f] border-[0.5px] border-[#E24B4A]/15 rounded-[8px] px-[12px] py-[10px]">
                                                    <div className="flex items-center gap-1.5 text-[10px] font-bold text-[#F09595] uppercase tracking-widest mb-1">
                                                        <Flag size={10} />
                                                        FIN ESTIMÉE
                                                    </div>
                                                    <div className="text-[16px] font-bold text-[#F09595] leading-none mt-1">
                                                        {guard?.projected_end_date ? new Date(guard.projected_end_date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' }) : '—'}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Section 4 — Insight IA */}
                                        <div className="bg-[#0d1a2e] border-l-[3px] border-l-[#378ADD] rounded-r-[12px] p-[14px]">
                                            <div className="flex items-center gap-2 mb-3">
                                                <div className="w-[26px] h-[26px] bg-[#378ADD]/15 rounded-[8px] flex items-center justify-center shrink-0">
                                                    <Sparkles size={12} className="text-[#378ADD]" />
                                                </div>
                                                <span className="text-[11px] font-bold text-[#378ADD] uppercase tracking-[0.07em]">INSIGHT IA</span>
                                            </div>
                                            <p className="text-[12px] italic text-white/45 leading-[1.6] mb-4 overflow-hidden" style={{ display: '-webkit-box', WebkitLineClamp: 4, WebkitBoxOrient: 'vertical' }}>
                                                {guard?.message || "Il est essentiel d'accélérer le rythme des tests pour atteindre l'échéance."}
                                            </p>
                                            <button
                                                onClick={() => setIsOptimizingSidebar(true)}
                                                className="px-[16px] py-[8px] bg-[#185FA5] text-[#B5D4F4] border-[0.5px] border-[#378ADD] rounded-[8px] text-[12px] font-medium transition-all hover:bg-[#1a68b5] flex items-center gap-2"
                                            >
                                                <Sparkles size={14} className="text-[#B5D4F4]" />
                                                Optimiser
                                            </button>
                                        </div>

                                        {/* Section 5 — Testeurs assignés */}
                                        <div className="bg-[#1a2235] rounded-[12px] border-[0.5px] border-white/[0.07] p-[14px]">
                                            <div className="flex items-center gap-1.5 text-[10px] font-bold text-white/40 uppercase tracking-widest mb-4">
                                                <Users size={12} />
                                                TESTEURS ASSIGNÉS ({(file.assigned_testers_names || []).length})
                                            </div>
                                            <div className="flex flex-col gap-3">
                                                {(file.assigned_testers_names || []).map((name, i) => (
                                                    <div key={i} className="flex items-center justify-between">
                                                        <div className="flex items-center gap-3">
                                                            <div className="w-[32px] h-[32px] rounded-full bg-[#185FA5] flex items-center justify-center text-[13px] font-medium text-white shrink-0">
                                                                {name ? name.charAt(0).toUpperCase() : '?'}
                                                            </div>
                                                            <div className="flex flex-col">
                                                                <span className="text-[13px] font-medium text-white leading-tight mb-0.5">{name}</span>
                                                                <span className="text-[11px] text-white/40">Charge : {guard?.velocity || 1} test/j</span>
                                                            </div>
                                                        </div>
                                                        <div className="px-[9px] py-[3px] bg-[#1D9E75]/15 border-[0.5px] border-[#1D9E75]/25 rounded-[20px]">
                                                            <span className="text-[11px] font-medium text-[#5DCAA5]">Actif</span>
                                                        </div>
                                                    </div>
                                                ))}
                                                {(file.assigned_testers_names || []).length === 0 && (
                                                    <div className="text-[12px] text-white/40 italic">Aucun testeur assigné.</div>
                                                )}
                                            </div>
                                        </div>
                                        </>
                                    )}
                                    
                                    {!isOptimizingSidebar && (
                                        <button
                                            onClick={() => handleOpenPreview(file)}
                                            className="w-full bg-[#1a2235] border-[0.5px] border-white/[0.08] hover:bg-[#202940] transition-colors rounded-[12px] p-[14px] px-[16px] flex items-center justify-between mt-2"
                                        >
                                            <span className="text-[13px] font-medium text-white/60">Voir le cahier de tests</span>
                                            <ArrowRight size={16} className="text-white/25" />
                                        </button>
                                    )}

                                </div>
                            </motion.div>
                        </div>
                    );
                })()}
                </AnimatePresence>,
                document.body
            )}
            {/* Campaign Modal */}

            {isModalOpen && (
                <div className="fixed inset-0 z-[99999] flex items-start justify-center bg-slate-950/80 backdrop-blur-xl p-4 overflow-y-auto pt-24">
                    <div className="bg-slate-900 border border-slate-300 dark:border-white/10 rounded-[2rem] w-full max-w-3xl shadow-[0_0_100px_rgba(37,99,235,0.1)] overflow-hidden flex flex-col max-h-[85vh]">
                        <div className="px-6 py-6 border-b border-slate-200 dark:border-white/5 flex justify-between items-center bg-slate-100 dark:bg-white/5 flex-shrink-0">
                            <div>
                                <h2 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tight">
                                    {editingCampaign ? 'Modifier Campagne' : 'Nouvelle Campagne'}
                                </h2>
                                <p className="text-blue-500 font-bold uppercase tracking-widest text-[10px] mt-1">Gérer les cahiers de tests</p>
                            </div>
                            <button onClick={() => setIsModalOpen(false)} className="bg-slate-100 dark:bg-white/5 p-2 rounded-full text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200 dark:bg-white/10 border border-slate-300 dark:border-white/10 transition-all">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
                            <div className="p-6 space-y-4 overflow-y-auto flex-1">
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                                    <div className="md:col-span-2 space-y-2">
                                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">Titre de la campagne</label>
                                        <input
                                            type="text"
                                            value={campaignForm.title}
                                            onChange={(e) => setCampaignForm({ ...campaignForm, title: e.target.value })}
                                            className="w-full bg-slate-100 dark:bg-white/5 border border-slate-300 dark:border-white/10 rounded-2xl px-6 py-3 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500/50 outline-none transition-all placeholder:text-slate-700 font-bold"
                                            placeholder="Ex: Regression Sprint 42"
                                            required
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">Nb. Tests</label>
                                        <input
                                            type="number"
                                            value={campaignForm.nb_test_cases}
                                            onChange={(e) => setCampaignForm({ ...campaignForm, nb_test_cases: parseInt(e.target.value) || 0 })}
                                            className="w-full bg-slate-100 dark:bg-white/5 border border-slate-300 dark:border-white/10 rounded-2xl px-6 py-3 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500/50 outline-none transition-all font-bold"
                                            min="0"
                                        />
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">Notes & Description</label>
                                    <textarea
                                        value={campaignForm.description}
                                        onChange={(e) => setCampaignForm({ ...campaignForm, description: e.target.value })}
                                        className="w-full bg-slate-100 dark:bg-white/5 border border-slate-300 dark:border-white/10 rounded-[1.5rem] px-6 py-3 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500/50 outline-none min-h-[100px] resize-none transition-all placeholder:text-slate-700 font-bold"
                                        placeholder="Décrivez les objectifs de cette campagne..."
                                    />
                                </div>

                                <div className={`p-5 rounded-[1.5rem] border transition-all duration-500 ${showScheduleSelector ? 'bg-indigo-500/5 border-indigo-500/20' : 'bg-slate-100 dark:bg-white/5 border-slate-300 dark:border-white/10'}`}>
                                    <div className="flex items-center justify-between mb-4">
                                        <div className="flex items-center gap-3">
                                            <div className={`p-1.5 rounded-xl border ${showScheduleSelector ? 'bg-indigo-500/20 border-indigo-500/20 text-indigo-500' : 'bg-slate-100 dark:bg-white/5 border-slate-300 dark:border-white/10 text-slate-500'}`}>
                                                <Clock className="w-4 h-4" />
                                            </div>
                                            <span className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-widest">Planification</span>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => setShowScheduleSelector(!showScheduleSelector)}
                                            className={`text-[10px] font-black uppercase tracking-widest px-3 py-1.5 rounded-full border transition-all ${showScheduleSelector ? 'bg-rose-500/10 text-rose-500 border-rose-500/20' : 'bg-blue-500/10 text-blue-500 border-blue-500/20'}`}
                                        >
                                            {showScheduleSelector ? 'Annuler le différé' : 'Programmer'}
                                        </button>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        {showScheduleSelector && (
                                            <div className="space-y-2 animate-in slide-in-from-top-2">
                                                <label className="text-[9px] font-bold text-indigo-500 uppercase tracking-[0.2em] ml-1">Date de lancement</label>
                                                <input
                                                    type="datetime-local"
                                                    value={campaignForm.scheduled_at}
                                                    onChange={(e) => setCampaignForm({ ...campaignForm, scheduled_at: e.target.value, start_date: e.target.value.split('T')[0] })}
                                                    className="w-full bg-slate-950 border border-indigo-500/30 rounded-2xl px-6 py-3 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500/50 outline-none transition-all font-bold"
                                                />
                                            </div>
                                        )}
                                        <div className="space-y-2">
                                            <label className="text-[9px] font-bold text-blue-500 uppercase tracking-[0.2em] ml-1">Date d'échéance</label>
                                            <input
                                                type="date"
                                                value={campaignForm.estimated_end_date}
                                                onChange={(e) => setCampaignForm({ ...campaignForm, estimated_end_date: e.target.value })}
                                                className="w-full bg-slate-950 border border-slate-300 dark:border-white/10 rounded-2xl px-6 py-3 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500/50 outline-none transition-all font-bold"
                                                required
                                            />
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">Import Excel (.xlsx)</label>
                                    <div className={`relative border-2 border-dashed rounded-[1.5rem] p-6 flex flex-col items-center justify-center transition-all ${campaignForm.file ? 'border-blue-500 bg-blue-500/5' : 'border-slate-300 dark:border-white/10 hover:border-slate-400 dark:border-white/20 bg-slate-100 dark:bg-white/5'}`}>
                                        <input type="file" onChange={handleFileChange} accept=".xlsx, .xls" className="absolute inset-0 opacity-0 cursor-pointer" required={!editingCampaign} />
                                        <Upload className={`w-8 h-8 mb-2 ${campaignForm.file ? 'text-blue-500 animate-bounce' : 'text-slate-600'}`} />
                                        <p className={`text-xs font-bold uppercase tracking-widest ${campaignForm.file ? 'text-white' : 'text-slate-500'}`}>
                                            {campaignForm.file ? campaignForm.file.name : 'Déposez votre cahier de tests'}
                                        </p>
                                        <p className="text-[9px] text-slate-600 font-bold uppercase tracking-widest mt-1">{editingCampaign ? 'Optionnel: Cliquez pour remplacer' : 'Maximum 10 Mo'}</p>
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">Équipe assignée</label>
                                    <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 bg-slate-100 dark:bg-white/5 p-4 rounded-[1.5rem] border border-slate-300 dark:border-white/10 max-h-56 overflow-y-auto custom-scrollbar">
                                        {(testers || []).map(tester => (
                                            <label key={tester.id} className={`flex items-center gap-3 p-3 rounded-2xl cursor-pointer transition-all border ${campaignForm.assigned_testers.includes(tester.id) ? 'bg-blue-600/20 border-blue-500 text-white' : 'bg-transparent border-slate-200 dark:border-white/5 text-slate-500 hover:border-slate-400 dark:border-white/20'}`}>
                                                <input
                                                    type="checkbox"
                                                    checked={campaignForm.assigned_testers.includes(tester.id)}
                                                    onChange={(e) => {
                                                        const id = tester.id;
                                                        if (e.target.checked) {
                                                            // Ouvre le popup pour ce testeur spécifique
                                                            setPendingTester(tester);
                                                            setTempQuota(campaignForm.nb_test_cases || 0);
                                                            setIsSingleQuotaModalOpen(true);
                                                        } else {
                                                            // Supprime simplement
                                                            setCampaignForm({
                                                                ...campaignForm,
                                                                assigned_testers: campaignForm.assigned_testers.filter(tid => tid !== id)
                                                            });
                                                            const newQuotas = { ...testerQuotas };
                                                            delete newQuotas[id];
                                                            setTesterQuotas(newQuotas);
                                                        }
                                                    }}
                                                    className="hidden"
                                                />
                                                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-black ${campaignForm.assigned_testers.includes(tester.id) ? 'bg-blue-500 text-white' : 'bg-slate-800 text-slate-400'}`}>
                                                    {tester.username.charAt(0).toUpperCase()}
                                                </div>
                                                <span className="text-xs font-bold truncate">{tester.username}</span>
                                            </label>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            <div className="px-10 py-8 bg-slate-100 dark:bg-white/5 border-t border-slate-200 dark:border-white/5 flex gap-4 shrink-0">
                                <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors">
                                    Annuler
                                </button>
                                <button type="submit" className="flex-[2] py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all shadow-xl shadow-blue-900/40 active:scale-95 flex items-center justify-center gap-3">
                                    <CheckCircle className="w-4 h-4" />
                                    {editingCampaign ? 'Enregistrer les modifications' : 'Lancer la campagne'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Delete Confirmation */}
            {deleteModal.isOpen && (
                <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/80 backdrop-blur-xl animate-in fade-in">
                    <div className="bg-slate-900 border border-slate-300 dark:border-white/10 rounded-[3rem] p-10 max-w-sm w-full shadow-2xl animate-in zoom-in-95">
                        <div className="flex flex-col items-center text-center">
                            <div className="w-20 h-20 rounded-full bg-rose-500/10 flex items-center justify-center mb-6 border border-rose-500/20 shadow-[0_0_50px_rgba(244,63,94,0.1)]">
                                <Trash2 className="w-10 h-10 text-rose-500" />
                            </div>
                            <h3 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tight mb-3">Supprimer ?</h3>
                            <p className="text-slate-400 text-sm leading-relaxed mb-8">Cette action est définitive. Toutes les données de la campagne seront perdues.</p>
                            <div className="flex gap-4 w-full">
                                <button onClick={() => setDeleteModal({ isOpen: false, fileId: null })} className="flex-1 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest hover:text-slate-900 dark:hover:text-white transition-colors">
                                    Retour
                                </button>
                                <button onClick={confirmDelete} className="flex-1 py-4 bg-rose-600 hover:bg-rose-700 text-white rounded-2xl text-[10px] font-bold uppercase tracking-widest transition-all shadow-lg shadow-rose-900/40">
                                    Supprimer
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
            {/* Single Quota Modal */}
            <AnimatePresence>
                {isSingleQuotaModalOpen && pendingTester && (
                    <div className="fixed inset-0 z-[100000] flex items-center justify-center p-6">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="absolute inset-0 bg-slate-950/90 backdrop-blur-md"
                        />
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.9, y: 20 }}
                            className="relative w-full max-w-lg bg-slate-900 border border-slate-300 dark:border-white/10 rounded-[3rem] shadow-2xl overflow-hidden"
                        >
                            <div className="p-10 border-b border-slate-200 dark:border-white/5 bg-gradient-to-r from-blue-600/10 to-transparent">
                                <h3 className="text-3xl font-black text-slate-900 dark:text-white uppercase tracking-tight">Assignation</h3>
                                <p className="text-slate-500 text-[10px] font-bold uppercase tracking-widest mt-2">Définissez l'objectif pour {pendingTester.username}</p>
                            </div>

                            <div className="p-10 space-y-6">
                                <div className="flex items-center justify-between gap-6 p-6 bg-slate-100 dark:bg-white/5 rounded-[2rem] border border-slate-200 dark:border-white/5">
                                    <div className="flex items-center gap-4">
                                        <div className="w-12 h-12 rounded-2xl bg-blue-500/10 flex items-center justify-center text-blue-400">
                                            <Target size={20} />
                                        </div>
                                        <div className="flex flex-col">
                                            <span className="font-black text-slate-900 dark:text-white uppercase tracking-tight text-sm">{pendingTester.username}</span>
                                            <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest">Membre de l'équipe</span>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-4">
                                        <input
                                            type="number"
                                            autoFocus
                                            value={tempQuota || ''}
                                            placeholder={campaignForm.nb_test_cases?.toString() || '10'}
                                            min="0"
                                            max={campaignForm.nb_test_cases || undefined}
                                            onChange={(e) => {
                                                const val = parseInt(e.target.value) || 0;
                                                const maxVal = campaignForm.nb_test_cases || Infinity;
                                                setTempQuota(Math.min(Math.max(0, val), maxVal));
                                            }}
                                            onKeyDown={(e) => e.key === 'Enter' && confirmSingleQuota()}
                                            className="w-24 bg-black/40 border border-slate-300 dark:border-white/10 rounded-2xl px-4 py-3 text-slate-900 dark:text-white font-black text-center focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                                        />
                                        <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Tests</span>
                                    </div>
                                </div>
                            </div>

                            <div className="p-10 bg-black/20 flex gap-4">
                                <button
                                    type="button"
                                    onClick={() => {
                                        setIsSingleQuotaModalOpen(false);
                                        setPendingTester(null);
                                    }}
                                    className="flex-1 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"
                                >
                                    ANNULER
                                </button>
                                <button
                                    type="button"
                                    onClick={confirmSingleQuota}
                                    className="flex-[2] py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all shadow-xl shadow-blue-900/40 flex items-center justify-center gap-3"
                                >
                                    <CheckCircle size={16} />
                                    CONFIRMER
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </PageLayout>
    );
};

export default DataDrivenManager;