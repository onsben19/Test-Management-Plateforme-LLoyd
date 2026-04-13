import React, { useState, useMemo, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'react-toastify';
import { useLocation } from 'react-router-dom';
import { useSidebar } from '../context/SidebarContext';
import {
    Upload, FileSpreadsheet, Calendar, Eye, Trash2, Edit, Search, Filter,
    Layers, X, CheckCircle, ShieldAlert, ShieldCheck, ShieldQuestion,
    Zap, TrendingUp, Clock, AlertTriangle, ArrowRight, LayoutGrid,
    Sparkles, ChevronRight, History, XCircle
} from 'lucide-react';

import { campaignService, userService, aiService } from '../services/api';
import Pagination from '../components/Pagination';
import StarBorder from '../components/bits/StarBorder';
import StatCard from '../components/StatCard';
import ReadinessGauge from '../components/ReadinessGauge';
import ReadinessDetailModal from '../components/ReadinessDetailModal';
import AIInsightModal from '../components/AIInsightModal';
import CatchupPlanIA from '../components/CatchupPlanIA';
import { Briefcase, Activity, Target, ShieldAlert as ShieldAlertIcon, Award, Info } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import PageLayout from '../components/PageLayout';
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
    const { isOpen } = useSidebar();
    const activeReleaseName = location.state?.releaseName;
    const activeReleaseId = location.state?.releaseId;

    const [importedFiles, setImportedFiles] = useState<ImportedFile[]>([]);
    const [timelineGuards, setTimelineGuards] = useState<Record<string, TimelineGuardData>>({});
    const [readinessScores, setReadinessScores] = useState<Record<string, any>>({});
    const [loading, setLoading] = useState(true);
    const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
    const [isAIModalOpen, setIsAIModalOpen] = useState(false);
    const [selectedReadinessData, setSelectedReadinessData] = useState<any>(null);
    const [selectedEntityName, setSelectedEntityName] = useState("");
    const [selectedAIInsight, setSelectedAIInsight] = useState<string | undefined>(undefined);
    const [isCatchupPlanOpen, setIsCatchupPlanOpen] = useState(false);
    const [activeCampaignId, setActiveCampaignId] = useState<number | null>(null);

    const [currentPage, setCurrentPage] = useState(1);
    const [totalItems, setTotalItems] = useState(0);
    const pageSize = 10;

    const [searchQuery, setSearchQuery] = useState('');
    const [testerFilter, setTesterFilter] = useState('');

    const [deleteModal, setDeleteModal] = useState<{ isOpen: boolean; fileId: string | null }>({
        isOpen: false,
        fileId: null
    });

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingCampaign, setEditingCampaign] = useState<ImportedFile | null>(null);
    const [testers, setTesters] = useState<User[]>([]);
    const [showScheduleSelector, setShowScheduleSelector] = useState(false);

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
    }, [activeReleaseId, searchQuery, testerFilter]);

    const handleOpenReadinessDetails = (campaignId: string, name: string) => {
        const readiness = readinessScores[campaignId];
        const guard = timelineGuards[campaignId];
        setSelectedAIInsight(guard?.message);

        if (readiness) {
            setSelectedReadinessData(readiness);
            setSelectedEntityName(name);
            setIsDetailModalOpen(true);
        } else {
            aiService.getReadinessScore(campaignId).then(res => {
                setSelectedReadinessData(res.data);
                setSelectedEntityName(name);
                setIsDetailModalOpen(true);
            });
        }
    };

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
            });
            const data = response.data.results || response.data;
            const count = response.data.count || (Array.isArray(response.data) ? response.data.length : 0);

            setTotalItems(count);

            const mappedCampaigns = data.map((camp: any) => ({
                id: camp.id.toString(),
                name: camp.title,
                description: camp.description || '',
                date: new Date(camp.created_at).toLocaleDateString('fr-FR'),
                size: 'N/A',
                rowCount: camp.nb_test_cases || 0,
                data: [],
                excel_file: camp.excel_file,
                assigned_testers_names: camp.assigned_testers_names || [],
                assigned_testers: camp.assigned_testers || [],
                project_id: camp.project,
                start_date: camp.start_date,
                estimated_end_date: camp.estimated_end_date,
                scheduled_at: camp.scheduled_at
            }));
            setImportedFiles(mappedCampaigns);

            mappedCampaigns.forEach((camp: any) => {
                fetchTimelineGuard(camp.id);
                fetchReadinessScore(camp.id);
            });
        } catch (error) {
            console.error("Failed to fetch campaigns", error);
            toast.error("Erreur de chargement des campagnes");
        } finally {
            setLoading(false);
        }
    };

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

    const fetchReadinessScore = async (campaignId: string) => {
        try {
            const response = await aiService.getReadinessScore(campaignId);
            setReadinessScores(prev => ({
                ...prev,
                [campaignId]: response.data
            }));
        } catch (error) {
            console.error(`Failed to fetch readiness score for ${campaignId}`, error);
        }
    };

    const fetchTesters = async () => {
        try {
            const response = await userService.getUsers({ role: 'TESTER' });
            setTesters(response.data.results || response.data);
        } catch (error) {
            console.error("Failed to fetch testers", error);
        }
    };

    const stats = useMemo(() => {
        const total = importedFiles.length;
        const active = importedFiles.filter(f => {
            const guard = timelineGuards[f.id];
            return guard && guard.progress.percentage < 100;
        }).length;
        const critical = Object.values(timelineGuards).filter(g => g.status === 'CRITICAL').length;
        const finished = importedFiles.filter(f => {
            const guard = timelineGuards[f.id];
            return guard && guard.progress.percentage === 100;
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
        setShowScheduleSelector(!!campaign.scheduled_at);
        setIsModalOpen(true);
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setCampaignForm({ ...campaignForm, file, title: campaignForm.title || file.name });
        }
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

        try {
            if (editingCampaign) {
                await campaignService.updateCampaign(editingCampaign.id, formData);
                toast.success("Campagne modifiée avec succès");
            } else {
                await campaignService.createCampaign(formData);
                toast.success("Campagne créée avec succès");
            }
            setIsModalOpen(false);
            fetchCampaigns();
        } catch (error) {
            console.error('Save error:', error);
            toast.error("Erreur lors de l'enregistrement de la campagne.");
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
                <button
                    onClick={openCreateModal}
                    className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all shadow-lg shadow-blue-500/20 hover:scale-105 active:scale-95"
                >
                    <Upload className="w-4 h-4" />
                    NOUVELLE CAMPAGNE
                </button>
            }
        >
            <div className="space-y-12">
                {/* Stats Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                    <StatCard
                        title="Total Campagnes"
                        value={stats.total}
                        icon={Briefcase}
                        variant="blue"
                        description="Toutes les campagnes"
                    />
                    <StatCard
                        title="Campagnes Actives"
                        value={stats.active}
                        icon={Activity}
                        variant="purple"
                        description="En cours d'exécution"
                    />
                    <StatCard
                        title="Risques Critiques"
                        value={stats.critical}
                        icon={ShieldAlertIcon}
                        variant="red"
                        description="Détecté par ML Guard"
                        change={stats.critical > 0 ? `+${stats.critical}` : undefined}
                        changeType="negative"
                    />
                    <StatCard
                        title="Terminées"
                        value={stats.finished}
                        icon={Target}
                        variant="green"
                        description="Tests clôturés"
                    />
                </div>

                {/* Search & Filter Bar */}
                <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-[3.5rem] p-6 shadow-2xl shadow-blue-900/10 flex flex-col md:flex-row gap-6 items-center">
                    <div className="relative flex-1 w-full group">
                        <Search className="absolute left-8 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 group-focus-within:text-blue-500 transition-colors" />
                        <input
                            type="text"
                            placeholder="Rechercher une campagne..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full bg-white/5 border border-white/10 rounded-full pl-16 pr-8 py-4 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500/30 transition-all font-medium placeholder-slate-500"
                        />
                    </div>
                    <div className="relative w-full md:w-80 group">
                        <Filter className="absolute left-8 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 group-focus-within:text-blue-500 transition-colors" />
                        <input
                            type="text"
                            placeholder="Filtrer par testeur..."
                            value={testerFilter}
                            onChange={(e) => setTesterFilter(e.target.value)}
                            className="w-full bg-white/5 border border-white/10 rounded-full pl-16 pr-8 py-4 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500/30 transition-all font-medium placeholder-slate-500"
                        />
                    </div>
                </div>

                {/* Campaign Grid */}
                {loading ? (
                    <div className="flex flex-col items-center justify-center py-32 space-y-4">
                        <div className="w-12 h-12 border-4 border-blue-500/20 border-t-blue-500 rounded-full animate-spin"></div>
                        <p className="text-slate-500 font-bold uppercase tracking-widest text-xs">Chargement des campagnes...</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                        {importedFiles.map((file, index) => {
                            const guard = timelineGuards[file.id];
                            const readiness = readinessScores[file.id];
                            const total = file.rowCount || 0;
                            const passed = guard?.progress?.finished || 0;
                            const failed = total - passed;
                            const rate = guard?.progress?.percentage || 0;

                            return (
                                <div
                                    key={file.id}
                                    style={{ animationDelay: `${index * 100}ms` }}
                                    className="group bg-[#0b0e14] border border-white/5 rounded-[2.5rem] p-6 relative overflow-hidden animate-slide-up hover:shadow-2xl hover:shadow-blue-500/10 transition-all hover:border-blue-500/20 flex flex-col h-full"
                                >
                                    {/* Top Right Area (Badges + Actions) */}
                                    <div className="absolute top-6 right-6 flex items-center gap-3 z-20">
                                        <button
                                            onClick={(e) => { e.stopPropagation(); handleOpenReadinessDetails(file.id, file.name); }}
                                            className="px-4 py-2 bg-white/[0.03] hover:bg-blue-500/10 border border-white/10 hover:border-blue-500/30 rounded-2xl flex flex-col items-center justify-center transition-all cursor-pointer group/readiness relative overflow-hidden shrink-0"
                                        >
                                            <div className="absolute inset-0 bg-blue-500/5 opacity-0 group-hover/readiness:opacity-100 transition-opacity" />
                                            <span className="text-sm font-black text-white leading-none relative z-10">
                                                {readiness?.score || 0}<span className="text-[9px] opacity-40 ml-0.5">%</span>
                                            </span>
                                            <div className="mt-1 flex items-center gap-1 relative z-10">
                                                <div className={`w-1 h-1 rounded-full animate-pulse ${readiness?.score >= 80 ? 'bg-emerald-500' : readiness?.score >= 40 ? 'bg-amber-500' : 'bg-rose-500'}`} />
                                                <span className="text-[7px] font-black text-slate-500 uppercase tracking-widest group-hover/readiness:text-blue-400 transition-colors">READY</span>
                                            </div>
                                        </button>

                                        {/* Hover Actions */}
                                        <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-all">
                                            <button onClick={(e) => openEditModal(file, e)} className="p-2.5 bg-white/5 hover:bg-white/10 rounded-xl border border-white/5 text-slate-500 hover:text-white transition-all">
                                                <Edit size={14} />
                                            </button>
                                            <button onClick={(e) => handleDeleteFile(file.id, e)} className="p-2.5 bg-white/5 hover:bg-red-500/10 rounded-xl border border-white/5 text-slate-500 hover:text-red-400 transition-all">
                                                <Trash2 size={14} />
                                            </button>
                                        </div>
                                    </div>

                                    {/* Top Left Icon & Status */}
                                    <div className="flex items-start justify-between mb-6">
                                        <div className="flex flex-col gap-4">
                                            <div className="w-12 h-12 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
                                                <FileSpreadsheet size={22} />
                                            </div>
                                            {guard?.status === 'CRITICAL' && (
                                                <div className="px-3 py-1 bg-amber-500/10 border border-amber-500/20 rounded-full flex items-center gap-1.5 text-[8px] font-black text-amber-500 uppercase tracking-widest w-fit">
                                                    <AlertTriangle size={10} />
                                                    DÉRIVE
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {/* Title & Metas */}
                                    <div className="mb-6">
                                        <h3 className="text-xl font-black text-white leading-tight tracking-tight mb-2 line-clamp-2 min-h-[3rem]">
                                            {file.name}
                                        </h3>
                                        {file.description && (
                                            <p className="text-[11px] text-slate-300 leading-relaxed line-clamp-3 mb-5">
                                                {file.description}
                                            </p>
                                        )}
                                        <div className="flex items-center gap-3">
                                            <div className="px-3 py-1.5 bg-white/5 border border-white/5 rounded-lg flex items-center gap-2">
                                                <Calendar size={12} className="text-slate-500" />
                                                <span className="text-[10px] font-bold text-slate-300">{file.date}</span>
                                            </div>
                                            <div className="px-3 py-1.5 bg-white/5 border border-white/5 rounded-lg flex items-center gap-2">
                                                <Clock size={12} className="text-slate-500" />
                                                <span className="text-[10px] font-bold text-slate-300">
                                                    Deadline {guard?.projected_end_date ? new Date(guard.projected_end_date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' }) : '—'}
                                                </span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Progression Section */}
                                    <div className="bg-[#151921] border border-white/5 rounded-2xl p-5 mb-4">
                                        <div className="flex items-center gap-2 text-[8px] font-black text-slate-600 uppercase tracking-widest mb-6">
                                            <TrendingUp size={12} />
                                            PROGRESSION & CADENCE
                                        </div>

                                        <div className="flex items-center gap-4 mb-6">
                                            <div className="relative w-16 h-16 flex-shrink-0">
                                                <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
                                                    <circle cx="50" cy="50" r="42" fill="none" stroke="rgba(255,255,255,0.03)" strokeWidth="10" />
                                                    <motion.circle
                                                        cx="50" cy="50" r="42" fill="none"
                                                        stroke={rate >= 80 ? '#10b981' : rate >= 40 ? '#f59e0b' : '#ef4444'}
                                                        strokeWidth="10"
                                                        strokeDasharray={2 * Math.PI * 42}
                                                        initial={{ strokeDashoffset: 2 * Math.PI * 42 }}
                                                        animate={{ strokeDashoffset: (2 * Math.PI * 42) * (1 - rate / 100) }}
                                                        transition={{ duration: 1.5, ease: 'easeOut' }}
                                                        strokeLinecap="round"
                                                    />
                                                </svg>
                                                <div className="absolute inset-0 flex items-center justify-center">
                                                    <span className="text-sm font-black text-white">{Math.round(rate)}%</span>
                                                </div>
                                            </div>

                                            <div className="flex-1 min-w-0">
                                                <div className="flex flex-col gap-2 mb-3">
                                                    <div className="flex items-center gap-2">
                                                        <CheckCircle size={12} className="text-emerald-500" />
                                                        <span className="text-[10px] font-black text-emerald-400">{passed} validés</span>
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <XCircle size={12} className="text-orange-500" />
                                                        <span className="text-[10px] font-black text-orange-400">{failed} restants</span>
                                                    </div>
                                                </div>
                                                <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden mb-2">
                                                    <motion.div
                                                        initial={{ width: 0 }}
                                                        animate={{ width: `${rate}%` }}
                                                        className="h-full bg-orange-500 rounded-full"
                                                    />
                                                </div>
                                                <div className="flex justify-between text-[7px] font-black text-slate-600 uppercase tracking-widest">
                                                    <span>{passed} TESTS VALIDÉS</span>
                                                    <span>CIBLE : {total}</span>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-2 gap-3">
                                            <div className="bg-white/[0.02] border border-white/5 rounded-xl p-3">
                                                <div className="flex items-center gap-2 text-[8px] font-black text-slate-600 uppercase tracking-widest mb-1">
                                                    <History size={10} />
                                                    CADENCE IA
                                                </div>
                                                <div className="text-sm font-black text-white">{guard?.velocity || 0} <span className="text-[10px] text-slate-500">tests/j</span></div>
                                            </div>
                                            <div className={`border rounded-xl p-3 ${guard?.status === 'CRITICAL' ? 'bg-rose-500/5 border-rose-500/10' : 'bg-white/[0.02] border-white/5'}`}>
                                                <div className={`flex items-center gap-2 text-[8px] font-black uppercase tracking-widest mb-1 ${guard?.status === 'CRITICAL' ? 'text-rose-500/50' : 'text-slate-600'}`}>
                                                    <Clock size={10} />
                                                    FIN ESTIMÉE
                                                </div>
                                                <div className={`text-sm font-black ${guard?.status === 'CRITICAL' ? 'text-rose-500' : 'text-white'}`}>
                                                    {guard?.projected_end_date ? new Date(guard.projected_end_date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' }) : '—'}
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Insight IA Area - Intelligent Integration */}
                                    <div className="bg-blue-600/5 border border-blue-600/10 rounded-2xl p-5 border-l-2 border-l-blue-500/50 mb-4 flex-1 shadow-lg shadow-blue-900/5 group/insight">
                                        <div className="flex items-center gap-3 mb-3">
                                            <div className="w-6 h-6 rounded-lg bg-blue-500/20 flex items-center justify-center text-blue-400">
                                                <Zap size={14} className="fill-blue-400/20" />
                                            </div>
                                            <span className="text-[10px] font-black text-blue-400 uppercase tracking-widest">INSIGHT IA</span>
                                        </div>
                                        <p className="text-[11px] text-slate-400 leading-relaxed mb-4 line-clamp-2 italic">
                                            {guard?.message || "Il est essentiel d'accélérer le rythme des tests pour respecter la date limite."}
                                        </p>
                                        <button
                                            onClick={() => handleOpenAIInsight(file.id, file.name)}
                                            className="px-4 py-2 bg-white/5 hover:bg-white hover:text-black border border-white/10 rounded-lg text-[9px] font-black uppercase tracking-widest text-white transition-all flex items-center gap-2 group/btn"
                                        >
                                            Lire la suite
                                            <ArrowRight size={12} className="group-hover/btn:translate-x-1 transition-transform" />
                                        </button>
                                    </div>

                                    {/* Footer */}
                                    <div className="pt-4 border-t border-white/5 space-y-4">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-3">
                                                <div className="flex -space-x-2">
                                                    {(file.assigned_testers_names || []).slice(0, 2).map((name, i) => (
                                                        <div key={i} className="w-8 h-8 rounded-full bg-slate-800 border-2 border-[#0b0e14] flex items-center justify-center text-[10px] font-black text-white" title={name}>
                                                            {name.charAt(0).toUpperCase()}
                                                        </div>
                                                    ))}
                                                    {(file.assigned_testers_names || []).length > 2 && (
                                                        <div className="w-8 h-8 rounded-full bg-slate-900 border-2 border-[#0b0e14] flex items-center justify-center text-[8px] font-black text-slate-500">
                                                            +{(file.assigned_testers_names || []).length - 2}
                                                        </div>
                                                    )}
                                                </div>
                                                <div className="flex flex-col">
                                                    <span className="text-xs font-black text-white">{(file.assigned_testers_names || []).length}</span>
                                                    <span className="text-[8px] font-black text-slate-600 uppercase tracking-widest">TESTEURS</span>
                                                </div>
                                            </div>
                                            <div className="px-5 py-3 bg-white/5 border border-white/5 rounded-xl flex flex-col items-center">
                                                <span className="text-lg font-black text-white">{total}</span>
                                                <span className="text-[8px] font-black text-slate-600 uppercase tracking-widest">CAS TEST</span>
                                            </div>
                                        </div>

                                        <button
                                            onClick={() => handleOpenPreview(file)}
                                            className="w-full py-4 bg-[#0b0e14] hover:bg-white/[0.02] border border-white/10 rounded-2xl flex items-center justify-center gap-4 text-xs font-black uppercase tracking-widest text-white transition-all group/footer shadow-lg"
                                        >
                                            <div className="flex flex-col gap-1 group-hover/footer:scale-110 transition-transform">
                                                <div className="w-1.5 h-1.5 rounded-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.5)]" />
                                                <div className="w-1.5 h-1.5 rounded-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.5)]" />
                                                <div className="w-1.5 h-1.5 rounded-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.5)]" />
                                            </div>
                                            VOIR LE CAHIER DE TESTS
                                        </button>
                                    </div>
                                </div>
                            );
                        })}
                        {importedFiles.length === 0 && (
                            <div className="col-span-full py-24 text-center bg-white/5 rounded-[3rem] border-2 border-dashed border-white/10">
                                <FileSpreadsheet className="w-16 h-16 text-slate-700 mx-auto mb-6" />
                                <h3 className="text-xl font-bold text-white mb-2">Aucune campagne disponible</h3>
                                <p className="text-slate-500 text-sm max-w-sm mx-auto">Importez votre premier cahier de tests Excel pour commencer le suivi.</p>
                            </div>
                        )}
                    </div>
                )}

                <Pagination
                    currentPage={currentPage}
                    totalItems={totalItems}
                    pageSize={pageSize}
                    onPageChange={handlePageChange}
                    loading={loading}
                />

                <ReadinessDetailModal
                    isOpen={isDetailModalOpen}
                    onClose={() => setIsDetailModalOpen(false)}
                    data={selectedReadinessData}
                    title={selectedEntityName}
                    aiInsight={selectedAIInsight}
                />

                <AIInsightModal
                    isOpen={isAIModalOpen}
                    onClose={() => setIsAIModalOpen(false)}
                    title={selectedEntityName}
                    insight={selectedAIInsight || "Analyse en attente..."}
                    onOptimize={() => setIsCatchupPlanOpen(true)}
                    showOptimizeButton={activeCampaignId ? timelineGuards[activeCampaignId.toString()]?.status === 'CRITICAL' : false}
                />

                {/* AI Catchup Plan Modal via Portal */}
                {isCatchupPlanOpen && activeCampaignId && createPortal(
                    <div className="fixed inset-0 z-[2000] flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-4 overflow-y-auto">
                        <div className="relative w-full max-w-2xl my-8">
                            <button
                                onClick={() => setIsCatchupPlanOpen(false)}
                                className="absolute -top-12 right-0 text-white/50 hover:text-white transition-colors"
                            >
                                <X className="w-8 h-8" />
                            </button>
                            <CatchupPlanIA
                                campaignId={activeCampaignId}
                                onClose={() => setIsCatchupPlanOpen(false)}
                            />
                        </div>
                    </div>,
                    document.body
                )}
            </div>

            {/* Campaign Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-xl p-4 animate-in fade-in">
                    <div className="bg-slate-900 border border-white/10 rounded-[3rem] w-full max-w-2xl shadow-[0_0_100px_rgba(37,99,235,0.1)] overflow-hidden animate-in zoom-in-95 duration-300 flex flex-col max-h-[90vh]">
                        <div className="px-10 py-8 border-b border-white/5 flex justify-between items-center bg-white/5">
                            <div>
                                <h2 className="text-2xl font-black text-white uppercase tracking-tight">
                                    {editingCampaign ? 'Modifier Campagne' : 'Nouvelle Campagne'}
                                </h2>
                                <p className="text-blue-500 font-bold uppercase tracking-widest text-[10px] mt-1">Gérer les cahiers de tests</p>
                            </div>
                            <button onClick={() => setIsModalOpen(false)} className="bg-white/5 p-3 rounded-full text-slate-400 hover:text-white hover:bg-white/10 border border-white/10 transition-all">
                                <X className="w-6 h-6" />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
                            <div className="p-10 space-y-8 overflow-y-auto custom-scrollbar">
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                                    <div className="md:col-span-2 space-y-2">
                                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">Titre de la campagne</label>
                                        <input
                                            type="text"
                                            value={campaignForm.title}
                                            onChange={(e) => setCampaignForm({ ...campaignForm, title: e.target.value })}
                                            className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-white focus:ring-2 focus:ring-blue-500/50 outline-none transition-all placeholder:text-slate-700"
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
                                            className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-white focus:ring-2 focus:ring-blue-500/50 outline-none transition-all"
                                            min="0"
                                        />
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">Notes & Description</label>
                                    <textarea
                                        value={campaignForm.description}
                                        onChange={(e) => setCampaignForm({ ...campaignForm, description: e.target.value })}
                                        className="w-full bg-white/5 border border-white/10 rounded-[2rem] px-6 py-5 text-white focus:ring-2 focus:ring-blue-500/50 outline-none min-h-[120px] resize-none transition-all placeholder:text-slate-700"
                                        placeholder="Décrivez les objectifs de cette campagne..."
                                    />
                                </div>

                                <div className={`p-8 rounded-[2.5rem] border transition-all duration-500 ${showScheduleSelector ? 'bg-amber-500/5 border-amber-500/20' : 'bg-white/5 border-white/10'}`}>
                                    <div className="flex items-center justify-between mb-6">
                                        <div className="flex items-center gap-3">
                                            <div className={`p-2 rounded-xl border ${showScheduleSelector ? 'bg-amber-500/20 border-amber-500/20 text-amber-500' : 'bg-white/5 border-white/10 text-slate-500'}`}>
                                                <Clock className="w-5 h-5" />
                                            </div>
                                            <span className="text-sm font-black text-white uppercase tracking-widest">Planification</span>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => setShowScheduleSelector(!showScheduleSelector)}
                                            className={`text-[10px] font-black uppercase tracking-widest px-4 py-2 rounded-full border transition-all ${showScheduleSelector ? 'bg-rose-500/10 text-rose-500 border-rose-500/20' : 'bg-blue-500/10 text-blue-500 border-blue-500/20'}`}
                                        >
                                            {showScheduleSelector ? 'Annuler le différé' : 'Programmer'}
                                        </button>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        {showScheduleSelector && (
                                            <div className="space-y-2 animate-in slide-in-from-top-2">
                                                <label className="text-[9px] font-bold text-amber-500 uppercase tracking-[0.2em] ml-1">Date de lancement</label>
                                                <input
                                                    type="datetime-local"
                                                    value={campaignForm.scheduled_at}
                                                    onChange={(e) => setCampaignForm({ ...campaignForm, scheduled_at: e.target.value, start_date: e.target.value.split('T')[0] })}
                                                    className="w-full bg-slate-950 border border-amber-500/30 rounded-2xl px-6 py-4 text-white focus:ring-2 focus:ring-amber-500/50 outline-none outline-none transition-all"
                                                />
                                            </div>
                                        )}
                                        <div className="space-y-2">
                                            <label className="text-[9px] font-bold text-blue-500 uppercase tracking-[0.2em] ml-1">Date d'échéance</label>
                                            <input
                                                type="date"
                                                value={campaignForm.estimated_end_date}
                                                onChange={(e) => setCampaignForm({ ...campaignForm, estimated_end_date: e.target.value })}
                                                className="w-full bg-slate-950 border border-white/10 rounded-2xl px-6 py-4 text-white focus:ring-2 focus:ring-blue-500/50 outline-none transition-all"
                                                required
                                            />
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">Import Excel (.xlsx)</label>
                                    <div className={`relative border-2 border-dashed rounded-[2.5rem] p-12 flex flex-col items-center justify-center transition-all ${campaignForm.file ? 'border-blue-500 bg-blue-500/5' : 'border-white/10 hover:border-white/20 bg-white/5'}`}>
                                        <input type="file" onChange={handleFileChange} accept=".xlsx, .xls" className="absolute inset-0 opacity-0 cursor-pointer" required={!editingCampaign} />
                                        <Upload className={`w-10 h-10 mb-4 ${campaignForm.file ? 'text-blue-500 animate-bounce' : 'text-slate-600'}`} />
                                        <p className={`text-sm font-bold uppercase tracking-widest ${campaignForm.file ? 'text-white' : 'text-slate-500'}`}>
                                            {campaignForm.file ? campaignForm.file.name : 'Déposez votre cahier de tests'}
                                        </p>
                                        <p className="text-[9px] text-slate-600 font-bold uppercase tracking-widest mt-2">{editingCampaign ? 'Optionnel: Cliquez pour remplacer' : 'Maximum 10 Mo'}</p>
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">Équipe assignée</label>
                                    <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 bg-white/5 p-6 rounded-[2rem] border border-white/10 max-h-56 overflow-y-auto custom-scrollbar">
                                        {testers.map(tester => (
                                            <label key={tester.id} className={`flex items-center gap-3 p-3 rounded-2xl cursor-pointer transition-all border ${campaignForm.assigned_testers.includes(tester.id) ? 'bg-blue-600/20 border-blue-500 text-white' : 'bg-transparent border-white/5 text-slate-500 hover:border-white/20'}`}>
                                                <input
                                                    type="checkbox"
                                                    checked={campaignForm.assigned_testers.includes(tester.id)}
                                                    onChange={(e) => {
                                                        const id = tester.id;
                                                        setCampaignForm({
                                                            ...campaignForm,
                                                            assigned_testers: e.target.checked
                                                                ? [...campaignForm.assigned_testers, id]
                                                                : campaignForm.assigned_testers.filter(tid => tid !== id)
                                                        });
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

                            <div className="px-10 py-8 bg-white/5 border-t border-white/5 flex gap-4 shrink-0">
                                <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-white transition-colors">
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
                    <div className="bg-slate-900 border border-white/10 rounded-[3rem] p-10 max-w-sm w-full shadow-2xl animate-in zoom-in-95">
                        <div className="flex flex-col items-center text-center">
                            <div className="w-20 h-20 rounded-full bg-rose-500/10 flex items-center justify-center mb-6 border border-rose-500/20 shadow-[0_0_50px_rgba(244,63,94,0.1)]">
                                <Trash2 className="w-10 h-10 text-rose-500" />
                            </div>
                            <h3 className="text-2xl font-black text-white uppercase tracking-tight mb-3">Supprimer ?</h3>
                            <p className="text-slate-400 text-sm leading-relaxed mb-8">Cette action est définitive. Toutes les données de la campagne seront perdues.</p>
                            <div className="flex gap-4 w-full">
                                <button onClick={() => setDeleteModal({ isOpen: false, fileId: null })} className="flex-1 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest hover:text-white transition-colors">
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
            {/* Readiness Details Modal */}
            <ReadinessDetailModal
                isOpen={isDetailModalOpen}
                onClose={() => setIsDetailModalOpen(false)}
                data={selectedReadinessData}
                title={selectedEntityName}
                aiInsight={selectedAIInsight}
            />
            <AIInsightModal
                isOpen={isAIModalOpen}
                onClose={() => setIsAIModalOpen(false)}
                title={selectedEntityName}
                insight={selectedAIInsight || ""}
                onOptimize={() => setIsCatchupPlanOpen(true)}
                showOptimizeButton={activeCampaignId ? timelineGuards[activeCampaignId.toString()]?.status === 'CRITICAL' : false}
            />
        </PageLayout>
    );
};

export default DataDrivenManager;
