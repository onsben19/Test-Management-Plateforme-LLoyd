import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'react-toastify';
import { useLocation, useNavigate } from 'react-router-dom';
import { useSidebar } from '../context/SidebarContext';
import {
    Upload, FileSpreadsheet, Calendar, Eye, Trash2, Edit, Search, Filter, MoreVertical, FileText,
    Layers, X, Check, CheckCircle, ShieldAlert, ShieldCheck, ShieldQuestion,
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


import { campaignService, userService, aiService, projectService, businessProjectService } from '../services/api';
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
import { useTheme } from '../context/ThemeContext';
import { formatCadencePerDay } from '../utils/cadence';

interface TimelineGuardData {
    status: 'OPTIMAL' | 'WARNING' | 'CRITICAL' | 'INITIAL' | 'WAITING';
    velocity: number;
    projected_end_date: string | null;
    delay_days: number;
    advance_days?: number;
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
    current_quotas?: Record<string, number>;
    tester_progress?: Record<string, { executed: number; quota: number }>;
    project_id?: string;
    project_name?: string;
    business_project_name?: string;
    start_date?: string;
    estimated_end_date?: string;
    scheduled_at?: string;
    passed_count?: number;
    failed_count?: number;
    executed_count?: number;
    progress_percentage?: number;
    anomalies_count?: number;
}

const getCampaignExecuted = (file: ImportedFile): number =>
    file.executed_count ?? ((file.passed_count || 0) + (file.failed_count || 0));

const getCampaignProgress = (file: ImportedFile): number => {
    if (file.progress_percentage != null) return file.progress_percentage;
    const total = file.rowCount || 0;
    const executed = getCampaignExecuted(file);
    return total > 0 ? Math.round((executed / total) * 100) : 0;
};

const getInsightMessage = (guard?: TimelineGuardData): string => {
    if (guard?.message) return guard.message;
    if (!guard) return 'Analyse en cours...';
    if ((guard.advance_days ?? 0) > 0) {
        return `Campagne en avance de ${guard.advance_days} jour(s) sur la deadline. Maintenez le rythme actuel.`;
    }
    if (guard.delay_days > 0 || guard.status === 'CRITICAL' || guard.status === 'WARNING') {
        return 'Un retard est détecté sur le planning. Utilisez le plan d\'optimisation pour rattraper.';
    }
    return 'La campagne progresse selon le planning prévu.';
};

const shouldShowOptimizeAction = (guard?: TimelineGuardData): boolean =>
    !!guard && (guard.delay_days > 0 || guard.status === 'WARNING' || guard.status === 'CRITICAL');

interface CampaignKanbanCardProps {
    file: ImportedFile;
    guard?: TimelineGuardData;
    rate: number;
    accentColor: string;
    barColor: string;
    hoverBorder: string;
    onClick: () => void;
}

const CampaignKanbanCard: React.FC<CampaignKanbanCardProps> = ({
    file, guard, rate, accentColor, barColor, hoverBorder, onClick
}) => {
    const executed = getCampaignExecuted(file);
    const total = file.rowCount || 0;
    return (
        <div
            onClick={onClick}
            className={`bg-slate-50 dark:bg-[#1a2235] border border-slate-200 dark:border-white/[0.07] rounded-lg p-3 cursor-pointer hover:bg-slate-100 dark:bg-[#1f2937] transition-all ${hoverBorder}`}
        >
            {file.business_project_name && (
                <div className="text-[9px] text-slate-400 dark:text-white/25 uppercase tracking-wider mb-0.5 truncate" title={file.business_project_name}>
                    {file.business_project_name}
                </div>
            )}
            {file.project_name && (
                <div className="text-[9px] text-[#85B7EB]/70 uppercase tracking-wider mb-1 truncate" title={file.project_name}>
                    {file.project_name}
                </div>
            )}
            <div className="text-[13px] font-medium text-slate-800 dark:text-[#e8eaf6] whitespace-nowrap overflow-hidden text-ellipsis mb-1.5">{file.name}</div>
            <div className="h-[3px] bg-white/[0.07] rounded-full w-full mb-2">
                <div className="h-full rounded-full" style={{ width: `${rate}%`, backgroundColor: barColor }} />
            </div>
            <div className="flex items-center justify-between">
                <span className="font-bold text-[11px]" style={{ color: accentColor }}>{Math.round(rate)}%</span>
                <span className="text-slate-500 dark:text-white/30 text-[10px]">{executed}/{total} validés</span>
            </div>
            {file.assigned_testers_names && file.assigned_testers_names.length > 0 && (
                <div className="flex items-center justify-between mt-3 pt-3 border-t border-white/[0.04]">
                    <div className="flex -space-x-1.5">
                        {file.assigned_testers_names.slice(0, 3).map((n, i) => (
                            <div key={i} className="w-5 h-5 rounded-full bg-[#185FA5] border-[1.5px] border-[#1a2235] flex items-center justify-center text-[8px] font-bold text-slate-900 dark:text-white uppercase" title={n}>
                                {n.charAt(0)}
                            </div>
                        ))}
                    </div>
                    <div className="flex flex-col items-end gap-0.5">
                        {file.estimated_end_date && (
                            <span className="text-[10px] text-slate-500 dark:text-white/30">
                                Fin : {new Date(file.estimated_end_date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
                            </span>
                        )}
                        {guard?.projected_end_date && (
                            <span className={`text-[10px] ${
                                (guard.advance_days ?? 0) > 0 ? 'text-[#5DCAA5]'
                                : guard.delay_days > 0 ? 'text-[#F09595]'
                                : 'text-violet-400'
                            }`}>
                                Fin estimée : {new Date(guard.projected_end_date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
                                {(guard.advance_days ?? 0) > 0 && ` · ${guard.advance_days}j d'avance`}
                            </span>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

interface User {
    id: number;
    username: string;
    email: string;
    role: string;
}

const DataDrivenManager = () => {
    const { t } = useTranslation();
    const { resolvedTheme } = useTheme();
    const isDark = resolvedTheme === 'dark';
    const location = useLocation();
    const navigate = useNavigate();
    useSidebar();

    const [activeReleaseId, setActiveReleaseId] = useState<string>(
        location.state?.releaseId?.toString()
        || (location.state?.businessProjectId ? 'all' : '')
    );
    const [activeReleaseName, setActiveReleaseName] = useState<string | undefined>(
        location.state?.releaseName
        || (location.state?.businessProjectId ? 'Toutes les releases' : undefined)
    );
    const [availableReleases, setAvailableReleases] = useState<any[]>([]);
    const [businessProjects, setBusinessProjects] = useState<any[]>([]);
    const [selectedBusinessProjectId, setSelectedBusinessProjectId] = useState<string | undefined>(
        location.state?.businessProjectId?.toString()
    );
    const [selectedBusinessProjectName, setSelectedBusinessProjectName] = useState<string | undefined>(
        location.state?.businessProjectName
    );
    const backBusinessProjectId = location.state?.businessProjectId?.toString() || selectedBusinessProjectId;
    const backBusinessProjectName = location.state?.businessProjectName || selectedBusinessProjectName;

    useEffect(() => {
        if (!location.state?.businessProjectId) {
            businessProjectService.getBusinessProjects()
                .then(res => {
                    const data = res.data.results ?? res.data;
                    setBusinessProjects(Array.isArray(data) ? data : []);
                })
                .catch(() => setBusinessProjects([]));
        }
    }, [location.state?.businessProjectId]);

    useEffect(() => {
        if (!backBusinessProjectId) {
            setAvailableReleases([]);
            return;
        }
        projectService.getProjects({ business_project: backBusinessProjectId })
            .then(res => {
                const data = res.data.results ?? res.data;
                setAvailableReleases(Array.isArray(data) ? data : []);
                if (!activeReleaseId && data && data.length > 0) {
                    setActiveReleaseId(backBusinessProjectId ? 'all' : data[0].id.toString());
                    setActiveReleaseName(backBusinessProjectId ? 'Toutes les releases' : data[0].name);
                }
            })
            .catch(() => {
                if (!activeReleaseId) setLoading(false);
            });
    }, [backBusinessProjectId]);

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
    const [isSubmitting, setIsSubmitting] = useState(false);
    const currentPageRef = useRef(1);

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
        currentPageRef.current = currentPage;
    }, [currentPage]);

    const getTargetReleaseId = (): string => {
        if (activeReleaseId && activeReleaseId !== 'all') return activeReleaseId;
        return location.state?.releaseId?.toString() || availableReleases[0]?.id?.toString() || '';
    };

    useEffect(() => {
        const canFetch = Boolean(backBusinessProjectId || (activeReleaseId && activeReleaseId !== 'all'));
        if (canFetch) {
            fetchCampaigns(1);
            fetchTesters();
            setCurrentPage(1);
        } else {
            setLoading(false);
        }
    }, [activeReleaseId, backBusinessProjectId, searchQuery, testerFilter, sortOrder]);

    const fetchCampaigns = useCallback(async (page = 1, silent = false) => {
        const canFetch = Boolean(backBusinessProjectId || (activeReleaseId && activeReleaseId !== 'all'));
        if (!canFetch) return;
        try {
            if (!silent) setLoading(true);
            const params: Record<string, unknown> = {
                page,
                search: searchQuery,
                tester: testerFilter,
                ordering: sortOrder === 'newest' ? '-created_at' : 'created_at',
            };
            if (backBusinessProjectId) {
                params.business_project = backBusinessProjectId;
            }
            if (activeReleaseId && activeReleaseId !== 'all') {
                params.project = activeReleaseId;
            }
            if (backBusinessProjectId && (!activeReleaseId || activeReleaseId === 'all')) {
                params.page_size = 200;
            }
            const response = await campaignService.getCampaigns(params);
            const responseData = response.data || {};
            const data = (responseData.results || (Array.isArray(responseData) ? responseData : []));
            const count = responseData.count ?? (Array.isArray(data) ? data.length : 0);

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
                current_quotas: camp.current_quotas || {},
                tester_progress: camp.tester_progress || {},
                project_id: camp.project,
                project_name: camp.project_name,
                business_project_name: camp.business_project_name,
                start_date: camp.start_date,
                estimated_end_date: camp.estimated_end_date,
                scheduled_at: camp.scheduled_at,
                passed_count: camp.passed_count ?? 0,
                failed_count: camp.failed_count ?? 0,
                executed_count: camp.executed_count ?? ((camp.passed_count ?? 0) + (camp.failed_count ?? 0)),
                progress_percentage: camp.progress_percentage,
                anomalies_count: camp.anomalies_count ?? 0
            })) : [];
            setImportedFiles(mappedCampaigns);

            mappedCampaigns.forEach((camp: any) => {
                fetchTimelineGuard(camp.id);
            });
        } catch (error) {
            if (!silent) {
                console.error("Failed to fetch campaigns", error);
                toast.error("Erreur de chargement des campagnes");
            }
        } finally {
            if (!silent) setLoading(false);
        }
    }, [activeReleaseId, backBusinessProjectId, searchQuery, testerFilter, sortOrder]);

    // Rafraîchissement automatique quand un testeur valide des cas
    useEffect(() => {
        const canFetch = Boolean(backBusinessProjectId || (activeReleaseId && activeReleaseId !== 'all'));
        if (!canFetch) return;

        const poll = setInterval(() => {
            fetchCampaigns(currentPageRef.current, true);
        }, 20000);

        const onFocus = () => fetchCampaigns(currentPageRef.current, true);
        window.addEventListener('focus', onFocus);

        return () => {
            clearInterval(poll);
            window.removeEventListener('focus', onFocus);
        };
    }, [activeReleaseId, backBusinessProjectId, fetchCampaigns]);

    const campaignIdsKey = importedFiles.map(f => f.id).join(',');

    useEffect(() => {
        if (!campaignIdsKey) return;

        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const token = localStorage.getItem('access_token');
        const sockets: WebSocket[] = [];

        importedFiles.forEach(file => {
            const wsUrl = `${protocol}//${window.location.host}/ws/campaigns/${file.id}/live/?token=${token}`;
            const ws = new WebSocket(wsUrl);
            ws.onmessage = () => {
                fetchCampaigns(currentPageRef.current, true);
            };
            sockets.push(ws);
        });

        return () => sockets.forEach(ws => ws.close());
    }, [campaignIdsKey, fetchCampaigns]);

    const openCampaignSidebar = (campaignId: string) => {
        setSelectedCampaignId(campaignId);
        fetchTimelineGuard(campaignId);
    };

    useEffect(() => {
        if (!selectedCampaignId) return;
        const file = importedFiles.find(f => f.id === selectedCampaignId);
        const guard = timelineGuards[selectedCampaignId];
        if (!file || !guard?.progress) return;

        const expectedTotal = file.rowCount || 0;
        const expectedFinished = file.executed_count ?? ((file.passed_count || 0) + (file.failed_count || 0));
        if (guard.progress.total !== expectedTotal || guard.progress.finished !== expectedFinished) {
            fetchTimelineGuard(selectedCampaignId);
        }
    }, [selectedCampaignId, importedFiles, timelineGuards]);

    useEffect(() => {
        const campaignId = new URLSearchParams(location.search).get('campaign');
        if (!campaignId || importedFiles.length === 0) return;
        if (importedFiles.some((f) => String(f.id) === campaignId)) {
            openCampaignSidebar(campaignId);
        }
    }, [location.search, importedFiles]);

    const filteredAndSortedFiles = importedFiles;

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
        if (!getTargetReleaseId()) return;

        if (!editingCampaign && !campaignForm.file) {
            toast.error("Veuillez sélectionner un fichier.");
            return;
        }

        if (isSubmitting) return;
        setIsSubmitting(true);

        const formData = new FormData();
        formData.append('title', campaignForm.title);
        formData.append('description', campaignForm.description);
        formData.append('project', getTargetReleaseId());
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
                await fetchTimelineGuard(editingCampaign.id);
            } else {
                await campaignService.createCampaign(formData);
                toast.success("Campagne créée avec succès");
            }
            setIsModalOpen(false);
            setIsQuotaModalOpen(false);
            await fetchCampaigns();
        } catch (error) {
            console.error('Save error:', error);
            toast.error("Erreur lors de l'enregistrement de la campagne.");
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleQuickUnassign = async (e: React.MouseEvent, file: any, testerId: number) => {
        e.stopPropagation();
        
        try {
            const formData = new FormData();
            formData.append('title', file.title || file.name);
            if (file.description) formData.append('description', file.description);
            formData.append('project', getTargetReleaseId());
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
            subtitle={[backBusinessProjectName, activeReleaseName].filter(Boolean).join(' · ') || 'Sélectionnez une release'}
            onBack={backBusinessProjectId ? () => navigate('/releases', { state: { businessProjectId: backBusinessProjectId, businessProjectName: backBusinessProjectName } }) : () => navigate(-1)}
            backLabel={backBusinessProjectName ? `Releases: ${backBusinessProjectName}` : 'Retour'}
            actions={
                <Button
                    variant="secondary"
                    onClick={openCreateModal}
                >
                    Nouvelle campagne
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
                    {!location.state?.businessProjectId && businessProjects.length > 0 && (
                        <div className="bg-slate-50 dark:bg-white/[0.02] border border-slate-200 dark:border-white/[0.05] rounded-xl p-1 flex items-center shrink-0">
                            <select
                                className="bg-transparent text-slate-900 dark:text-white text-[11px] font-semibold pl-3 pr-8 py-2.5 outline-none cursor-pointer appearance-none min-w-[220px]"
                                value={selectedBusinessProjectId || ''}
                                onChange={(e) => {
                                    const bp = businessProjects.find(p => p.id.toString() === e.target.value);
                                    setSelectedBusinessProjectId(e.target.value || undefined);
                                    setSelectedBusinessProjectName(bp?.name);
                                    setActiveReleaseId('all');
                                    setActiveReleaseName('Toutes les releases');
                                    setCurrentPage(1);
                                }}
                            >
                                <option value="" className="bg-slate-950">Choisir un projet business…</option>
                                {businessProjects.map(bp => (
                                    <option key={bp.id} value={bp.id} className="bg-slate-950">{bp.name}</option>
                                ))}
                            </select>
                        </div>
                    )}
                    {availableReleases.length > 0 && (
                        <div className="bg-slate-50 dark:bg-white/[0.02] border border-slate-200 dark:border-white/[0.05] rounded-xl p-1 flex items-center shrink-0">
                            <select
                                className="bg-transparent text-slate-900 dark:text-white text-[11px] font-semibold pl-3 pr-8 py-2.5 outline-none cursor-pointer appearance-none min-w-[200px]"
                                value={activeReleaseId || ''}
                                onChange={(e) => {
                                    const val = e.target.value;
                                    if (val === 'all') {
                                        setActiveReleaseId('all');
                                        setActiveReleaseName('Toutes les releases');
                                    } else {
                                        const rel = availableReleases.find(r => r.id.toString() === val);
                                        setActiveReleaseId(val);
                                        setActiveReleaseName(rel?.name);
                                    }
                                    setCurrentPage(1);
                                }}
                            >
                                {backBusinessProjectId && (
                                    <option value="all" className="bg-slate-950">Toutes les releases</option>
                                )}
                                {availableReleases.map(rel => (
                                    <option key={rel.id} value={rel.id} className="bg-slate-950">
                                        {rel.name}
                                    </option>
                                ))}
                            </select>
                        </div>
                    )}
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
                ) : !backBusinessProjectId ? (
                    <div className="flex flex-col items-center justify-center py-32 space-y-4 text-center">
                        <p className="text-slate-400 font-medium">Sélectionnez un projet business pour afficher ses campagnes.</p>
                        <p className="text-slate-500 text-sm">Ou accédez via Portefeuille → Releases → Campagnes.</p>
                    </div>
                ) : (
                    <>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        {/* 1. EN RETARD */}
                        <div className="bg-white dark:bg-[#111827] border border-slate-200 dark:border-white/[0.07] rounded-xl overflow-hidden flex flex-col h-[700px]">
                            <div className="px-3.5 py-3 border-b border-white/[0.07] flex items-center justify-between shrink-0">
                                <span className="text-[11px] font-medium tracking-[0.07em] text-[#F09595]">EN RETARD</span>
                                <span className="bg-white/[0.07] text-slate-500 dark:text-white/40 text-[11px] px-2 py-0.5 rounded-full">
                                    {(filteredAndSortedFiles || []).filter(f => ['CRITICAL', 'WARNING'].includes(timelineGuards[f.id]?.status) && getCampaignProgress(f) < 100).length}
                                </span>
                            </div>
                            <div className="p-2.5 flex flex-col gap-2 overflow-y-auto flex-1 custom-scrollbar">
                                {(filteredAndSortedFiles || []).filter(f => ['CRITICAL', 'WARNING'].includes(timelineGuards[f.id]?.status) && getCampaignProgress(f) < 100).map(file => (
                                    <CampaignKanbanCard
                                        key={file.id}
                                        file={file}
                                        guard={timelineGuards[file.id]}
                                        rate={getCampaignProgress(file)}
                                        accentColor="#E24B4A"
                                        barColor="#E24B4A"
                                        hoverBorder="hover:border-[#F09595]/50"
                                        onClick={() => openCampaignSidebar(file.id)}
                                    />
                                ))}
                            </div>
                        </div>

                        {/* 2. EN COURS */}
                        <div className="bg-white dark:bg-[#111827] border border-slate-200 dark:border-white/[0.07] rounded-xl overflow-hidden flex flex-col h-[700px]">
                            <div className="px-3.5 py-3 border-b border-white/[0.07] flex items-center justify-between shrink-0">
                                <span className="text-[11px] font-medium tracking-[0.07em] text-[#EF9F27]">EN COURS</span>
                                <span className="bg-white/[0.07] text-slate-500 dark:text-white/40 text-[11px] px-2 py-0.5 rounded-full">
                                    {(filteredAndSortedFiles || []).filter(f => !['CRITICAL', 'WARNING'].includes(timelineGuards[f.id]?.status) && getCampaignProgress(f) < 100).length}
                                </span>
                            </div>
                            <div className="p-2.5 flex flex-col gap-2 overflow-y-auto flex-1 custom-scrollbar">
                                {(filteredAndSortedFiles || []).filter(f => !['CRITICAL', 'WARNING'].includes(timelineGuards[f.id]?.status) && getCampaignProgress(f) < 100).map(file => (
                                    <CampaignKanbanCard
                                        key={file.id}
                                        file={file}
                                        guard={timelineGuards[file.id]}
                                        rate={getCampaignProgress(file)}
                                        accentColor="#1D9E75"
                                        barColor="#1D9E75"
                                        hoverBorder="hover:border-[#EF9F27]/50"
                                        onClick={() => openCampaignSidebar(file.id)}
                                    />
                                ))}
                            </div>
                        </div>

                        {/* 3. TERMINÉ */}
                        <div className="bg-white dark:bg-[#111827] border border-slate-200 dark:border-white/[0.07] rounded-xl overflow-hidden flex flex-col h-[700px]">
                            <div className="px-3.5 py-3 border-b border-white/[0.07] flex items-center justify-between shrink-0">
                                <span className="text-[11px] font-medium tracking-[0.07em] text-[#5DCAA5]">TERMINÉ</span>
                                <span className="bg-white/[0.07] text-slate-500 dark:text-white/40 text-[11px] px-2 py-0.5 rounded-full">
                                    {(filteredAndSortedFiles || []).filter(f => f.rowCount > 0 && getCampaignProgress(f) >= 100).length}
                                </span>
                            </div>
                            <div className="p-2.5 flex flex-col gap-2 overflow-y-auto flex-1 custom-scrollbar">
                                {(filteredAndSortedFiles || []).filter(f => f.rowCount > 0 && getCampaignProgress(f) >= 100).map(file => (
                                    <CampaignKanbanCard
                                        key={file.id}
                                        file={file}
                                        guard={timelineGuards[file.id]}
                                        rate={100}
                                        accentColor="#5DCAA5"
                                        barColor="#5DCAA5"
                                        hoverBorder="hover:border-[#5DCAA5]/50"
                                        onClick={() => openCampaignSidebar(file.id)}
                                    />
                                ))}
                            </div>
                        </div>
                    </div>
                        {importedFiles.length === 0 && (
                            <div className="col-span-full py-24 text-center bg-slate-100 dark:bg-white/5 rounded-[3rem] border-2 border-dashed border-slate-300 dark:border-slate-200 dark:border-white/10">
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
                    showOptimizeButton={activeCampaignId ? shouldShowOptimizeAction(timelineGuards[activeCampaignId.toString()]) : false}
                />
            </div>

            
            {/* Campaign Sidebar */}
            {typeof document !== 'undefined' && createPortal(
                <AnimatePresence>
                    {selectedCampaignId && (() => {
                        const file = importedFiles.find(f => f.id === selectedCampaignId);
                        if (!file) return null;
                        const guard = timelineGuards[file.id];
                        const total = file.rowCount || 0;
                        const passed = file.passed_count || 0;
                        const failed = file.failed_count || 0;
                        const validated = file.executed_count ?? (passed + failed);
                        const restants = Math.max(0, total - validated);
                        const rate = getCampaignProgress(file);

                        return (
                            <div className="fixed inset-0 z-[99999] flex justify-end">
                                <motion.div
                                    key="sidebar-bg"
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    exit={{ opacity: 0 }}
                                    className="absolute inset-0 bg-slate-200/60 dark:bg-slate-200/60 dark:bg-slate-950/60 backdrop-blur-sm"
                                    onClick={() => { setSelectedCampaignId(null); setIsOptimizingSidebar(false); }}
                                />
                                <motion.div
                                    key="sidebar-panel"
                                    initial={{ x: '100%' }}
                                    animate={{ x: 0 }}
                                    exit={{ x: '100%' }}
                                    transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                                    className="relative w-full max-w-3xl bg-white dark:bg-[#0f172a] border-l border-slate-200 dark:border-white/[0.07] h-full shadow-2xl flex flex-col"
                                >
                                    {/* Header */}
                                <div className="p-6 border-b border-slate-200 dark:border-white/[0.05] flex items-center justify-between shrink-0">
                                    <h2 className="text-lg font-bold text-slate-900 dark:text-white truncate pr-4">{file.name}</h2>
                                    <div className="flex items-center gap-2">
                                        <button onClick={(e) => { openEditModal(file, e); }} className="p-2 text-slate-500 dark:text-white/50 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5 rounded-lg transition-colors">
                                            <Edit size={16} />
                                        </button>
                                        <button onClick={(e) => { handleDeleteFile(file.id, e); setSelectedCampaignId(null); }} className="p-2 text-rose-500/70 hover:text-rose-500 hover:bg-rose-500/10 rounded-lg transition-colors">
                                            <Trash2 size={16} />
                                        </button>
                                        <div className="w-px h-6 bg-white/[0.07] mx-1" />
                                        <button onClick={() => { setSelectedCampaignId(null); setIsOptimizingSidebar(false); }} className="p-2 text-slate-500 dark:text-white/50 hover:text-slate-900 dark:hover:text-white bg-white dark:bg-white/[0.03] hover:bg-slate-100 dark:hover:bg-white/10 rounded-lg transition-colors">
                                            <X size={16} />
                                        </button>
                                    </div>
                                </div>

                                {/* Body */}
                                <div className="p-6 overflow-y-auto flex-1 custom-scrollbar space-y-6 relative">
                                    {isOptimizingSidebar ? (
                                        <div className="animate-fade-in">
                                            <button onClick={() => setIsOptimizingSidebar(false)} className="mb-4 flex items-center gap-2 text-xs font-bold text-slate-400 hover:text-slate-900 dark:hover:text-white uppercase tracking-widest transition-colors">
                                                <ArrowLeft size={14} /> Retour aux détails
                                            </button>
                                            <CatchupPlanIA campaignId={file.id} onClose={() => setIsOptimizingSidebar(false)} />
                                        </div>
                                    ) : (
                                        <>
                                    {/* Section 1 — Meta dates */}
                                        <div className="flex gap-2">
                                            <div className="flex items-center gap-1.5 px-[11px] py-[5px] bg-slate-100 dark:bg-white/[0.06] border-[0.5px] border-slate-200 dark:border-white/10 rounded-[20px]">
                                                <Calendar size={12} className="text-slate-500 dark:text-white/50" />
                                                <span className="text-[11px] font-medium text-slate-900 dark:text-white/50">{file.date}</span>
                                            </div>
                                            <div className="flex items-center gap-1.5 px-[11px] py-[5px] bg-[#E24B4A]/12 border-[0.5px] border-[#E24B4A]/25 rounded-[20px]">
                                                <Clock size={12} className="text-[#F09595]" />
                                                <span className="text-[11px] font-medium text-[#F09595]">
                                                    Deadline {file.estimated_end_date ? new Date(file.estimated_end_date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' }) : '—'}
                                                </span>
                                            </div>
                                        </div>

                                        {/* Section 2 — Description */}
                                        {file.description && (
                                            <div className="bg-slate-50 dark:bg-[#1a2235] rounded-[12px] border-[0.5px] border-slate-200 dark:border-white/[0.07] p-[14px]">
                                                <div className="text-[10px] font-bold text-slate-500 dark:text-white/40 uppercase tracking-widest mb-2">
                                                    DESCRIPTION
                                                </div>
                                                <p className="text-[13px] text-slate-600 dark:text-white/55 leading-[1.6]">{file.description}</p>
                                            </div>
                                        )}

                                        {/* Section 3 — Progression & Cadence */}
                                        <div className="bg-slate-50 dark:bg-[#1a2235] rounded-[12px] border-[0.5px] border-slate-200 dark:border-white/[0.07] p-[14px]">
                                            <div className="text-[10px] font-bold text-slate-500 dark:text-white/40 uppercase tracking-widest mb-4">
                                                PROGRESSION & CADENCE
                                            </div>

                                            <div className="flex items-center gap-4 mb-4">
                                                <div className="relative w-[56px] h-[56px] shrink-0">
                                                    <svg viewBox="0 0 50 50" className="w-full h-full -rotate-90">
                                                        <circle cx="25" cy="25" r="22" fill="none" stroke={isDark ? 'rgba(255,255,255,0.07)' : '#e2e8f0'} strokeWidth="4" />
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
                                                        <span className="text-[13px] font-bold text-slate-900 dark:text-white">{Math.round(rate)}%</span>
                                                    </div>
                                                </div>

                                                <div className="flex flex-col justify-center gap-1">
                                                    <div className="flex items-center gap-1.5">
                                                        <span className="text-[11px] font-medium text-[#5DCAA5]">{passed} réussis</span>
                                                    </div>
                                                    <div className="flex items-center gap-1.5">
                                                        <span className="text-[11px] font-medium text-[#F09595]">{failed} anomalies</span>
                                                    </div>
                                                    <div className="flex items-center gap-1.5">
                                                        <span className="text-[11px] font-medium text-slate-400">{restants} restants</span>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="relative h-[4px] w-full bg-slate-200 dark:bg-white/[0.07] rounded-[2px] overflow-hidden mb-2">
                                                <motion.div
                                                    initial={{ width: 0 }}
                                                    animate={{ width: `${rate}%` }}
                                                    className="h-full rounded-[2px] bg-[#E24B4A]"
                                                />
                                            </div>
                                            <div className="flex justify-between text-[11px] text-slate-500 dark:text-white/40 mb-4 font-medium">
                                                <span>{validated} tests validés</span>
                                                <span>Cible : {total}</span>
                                            </div>

                                            <div className="grid grid-cols-2 gap-[8px]">
                                                <div className="bg-white dark:bg-[#111827] rounded-[8px] px-[12px] py-[10px]">
                                                    <div className="text-[10px] font-bold text-slate-500 dark:text-white/40 uppercase tracking-widest mb-1">
                                                        CADENCE IA
                                                    </div>
                                                    <div className="flex items-baseline gap-1 mt-1">
                                                        <span className="text-[16px] font-bold text-slate-900 dark:text-white leading-none">{formatCadencePerDay(guard?.velocity)}</span>
                                                        <span className="text-[12px] text-slate-500 dark:text-white/40">test/j</span>
                                                    </div>
                                                </div>
                                                <div className={`rounded-[8px] px-[12px] py-[10px] border-[0.5px] ${
                                                    (guard?.advance_days ?? 0) > 0
                                                        ? 'bg-emerald-50 dark:bg-[#0f1a14] border-emerald-200 dark:border-[#1D9E75]/25'
                                                        : (guard?.delay_days ?? 0) > 0
                                                        ? 'bg-rose-50 dark:bg-[#1a0f0f] border-rose-200 dark:border-[#E24B4A]/15'
                                                        : 'bg-white dark:bg-[#111827] border-slate-200 dark:border-white/[0.07]'
                                                }`}>
                                                    <div className={`text-[10px] font-bold uppercase tracking-widest mb-1 ${
                                                        (guard?.advance_days ?? 0) > 0 ? 'text-emerald-700 dark:text-[#5DCAA5]'
                                                        : (guard?.delay_days ?? 0) > 0 ? 'text-rose-700 dark:text-[#F09595]'
                                                        : 'text-slate-500 dark:text-white/40'
                                                    }`}>
                                                        FIN ESTIMÉE
                                                    </div>
                                                    <div className={`text-[16px] font-bold leading-none mt-1 ${
                                                        (guard?.advance_days ?? 0) > 0 ? 'text-emerald-700 dark:text-[#5DCAA5]'
                                                        : (guard?.delay_days ?? 0) > 0 ? 'text-rose-700 dark:text-[#F09595]'
                                                        : 'text-slate-900 dark:text-white'
                                                    }`}>
                                                        {guard?.projected_end_date ? new Date(guard.projected_end_date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' }) : '—'}
                                                    </div>
                                                    {(guard?.advance_days ?? 0) > 0 && (
                                                        <div className="text-[10px] text-emerald-600 dark:text-[#5DCAA5]/70 mt-1">
                                                            {guard!.advance_days}j d'avance sur la deadline
                                                        </div>
                                                    )}
                                                    {(guard?.delay_days ?? 0) > 0 && (
                                                        <div className="text-[10px] text-rose-600 dark:text-[#F09595]/70 mt-1">
                                                            {guard!.delay_days}j de retard estimé
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>

                                        {/* Section 4 — Insight IA */}
                                        <div className={`rounded-r-[12px] p-[14px] border-l-[3px] border-l-[#378ADD] ${
                                            (guard?.advance_days ?? 0) > 0
                                                ? 'bg-emerald-50/80 dark:bg-[#0d1a2e] border border-emerald-100 dark:border-transparent'
                                                : (guard?.delay_days ?? 0) > 0 || guard?.status === 'WARNING' || guard?.status === 'CRITICAL'
                                                ? 'bg-blue-50 dark:bg-[#0d1a2e] border border-blue-100 dark:border-transparent'
                                                : 'bg-slate-50 dark:bg-[#0d1a2e] border border-slate-200 dark:border-transparent'
                                        }`}>
                                            <div className="mb-3">
                                                <span className="text-[11px] font-bold text-[#185FA5] dark:text-[#378ADD] uppercase tracking-[0.07em]">INSIGHT IA</span>
                                            </div>
                                            <p className="text-[12px] italic text-slate-600 dark:text-white/45 leading-[1.6] mb-4 overflow-hidden" style={{ display: '-webkit-box', WebkitLineClamp: 4, WebkitBoxOrient: 'vertical' }}>
                                                {getInsightMessage(guard)}
                                            </p>
                                            {shouldShowOptimizeAction(guard) && (
                                                <button
                                                    onClick={() => setIsOptimizingSidebar(true)}
                                                    className="px-[16px] py-[8px] bg-[#185FA5] text-white dark:text-[#B5D4F4] border-[0.5px] border-[#378ADD] rounded-[8px] text-[12px] font-medium transition-all hover:bg-[#1a68b5]"
                                                >
                                                    Optimiser
                                                </button>
                                            )}
                                        </div>

                                        {/* Section 5 — Testeurs assignés */}
                                        <div className="bg-slate-50 dark:bg-[#1a2235] rounded-[12px] border-[0.5px] border-slate-200 dark:border-white/[0.07] p-[14px]">
                                            <div className="text-[10px] font-bold text-slate-500 dark:text-white/40 uppercase tracking-widest mb-4">
                                                TESTEURS ASSIGNÉS ({(file.assigned_testers_names || []).length})
                                            </div>
                                            <div className="flex flex-col gap-3">
                                                {(file.assigned_testers_names || []).map((name, i) => {
                                                    const testerId = String(file.assigned_testers?.[i] ?? '');
                                                    const progress = file.tester_progress?.[testerId];
                                                    const quota = progress?.quota ?? file.current_quotas?.[testerId] ?? 0;
                                                    const executed = progress?.executed ?? 0;
                                                    const isComplete = quota > 0 && executed >= quota;
                                                    const isStarted = executed > 0;
                                                    return (
                                                    <div key={i} className="flex items-center justify-between">
                                                        <div className="flex items-center gap-3">
                                                            <div className="w-[32px] h-[32px] rounded-full bg-[#185FA5] flex items-center justify-center text-[13px] font-medium text-slate-900 dark:text-white shrink-0">
                                                                {name ? name.charAt(0).toUpperCase() : '?'}
                                                            </div>
                                                            <div className="flex flex-col">
                                                                <span className="text-[13px] font-medium text-slate-900 dark:text-white leading-tight mb-0.5">{name}</span>
                                                                <span className={`text-[11px] font-semibold ${isComplete ? 'text-[#5DCAA5]' : isStarted ? 'text-[#EF9F27]' : 'text-slate-500 dark:text-white/40'}`}>
                                                                    {executed}/{quota} exécuté{executed > 1 ? 's' : ''}
                                                                </span>
                                                            </div>
                                                        </div>
                                                        <div className={`px-[9px] py-[3px] rounded-[20px] border-[0.5px] ${
                                                            isComplete
                                                                ? 'bg-[#1D9E75]/15 border-[#1D9E75]/25'
                                                                : isStarted
                                                                ? 'bg-[#EF9F27]/15 border-[#EF9F27]/25'
                                                                : 'bg-[#1D9E75]/15 border-[#1D9E75]/25'
                                                        }`}>
                                                            <span className={`text-[11px] font-medium ${
                                                                isComplete ? 'text-[#5DCAA5]' : isStarted ? 'text-[#EF9F27]' : 'text-[#5DCAA5]'
                                                            }`}>
                                                                {isComplete ? 'Terminé' : isStarted ? 'En cours' : 'Actif'}
                                                            </span>
                                                        </div>
                                                    </div>
                                                    );
                                                })}
                                                {(file.assigned_testers_names || []).length === 0 && (
                                                    <div className="text-[12px] text-slate-500 dark:text-white/40 italic">Aucun testeur assigné.</div>
                                                )}
                                            </div>
                                        </div>
                                        </>
                                    )}
                                    
                                    {!isOptimizingSidebar && (
                                        <button
                                            onClick={() => handleOpenPreview(file)}
                                            className="w-full bg-slate-50 dark:bg-[#1a2235] border-[0.5px] border-slate-200 dark:border-white/[0.08] hover:bg-[#202940] transition-colors rounded-[12px] p-[14px] px-[16px] flex items-center justify-between mt-2"
                                        >
                                            <span className="text-[13px] font-medium text-slate-900 dark:text-white/60">Voir le cahier de tests</span>
                                            <ArrowRight size={16} className="text-slate-400 dark:text-white/25" />
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
            {typeof document !== 'undefined' && createPortal(
                isModalOpen ? (
                <div className="fixed inset-0 z-[200000] flex items-start justify-center bg-slate-900/50 dark:bg-slate-900/50 dark:bg-black/70 backdrop-blur-sm p-4 sm:p-6 pt-20 overflow-y-auto">
                    <div className="bg-white dark:bg-[#0d1117] border border-slate-200 dark:border-white/[0.08] rounded-[20px] w-full max-w-2xl shadow-[0_32px_80px_rgba(0,0,0,0.6)] overflow-hidden flex flex-col max-h-[calc(100vh-6rem)] my-auto">
                        
                        {/* Header */}
                        <div className="px-6 pt-6 pb-5 flex items-center justify-between border-b border-slate-200 dark:border-white/[0.06] shrink-0">
                            <div>
                                <div className="flex items-center gap-2 mb-1">
                                    <div className={`w-1.5 h-5 rounded-full ${editingCampaign ? 'bg-[#EF9F27]' : 'bg-[#378ADD]'}`} />
                                    <h2 className="text-[17px] font-semibold text-slate-900 dark:text-white">
                                        {editingCampaign ? 'Modifier la campagne' : 'Nouvelle campagne'}
                                    </h2>
                                </div>
                                <p className="text-[11px] text-slate-500 dark:text-white/30 ml-4">
                                    {editingCampaign ? `Édition · ${editingCampaign.name}` : 'Créer un nouveau cahier de tests'}
                                </p>
                            </div>
                            <button
                                onClick={() => setIsModalOpen(false)}
                                className="w-8 h-8 flex items-center justify-center rounded-full bg-slate-100 dark:bg-white/[0.05] hover:bg-slate-100 dark:hover:bg-white/10 text-slate-500 dark:text-white/40 hover:text-slate-900 dark:hover:text-white transition-all border border-slate-200 dark:border-white/[0.06]"
                            >
                                <X size={15} />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
                            <div className="p-6 space-y-5 overflow-y-auto flex-1">

                                {/* Titre + Nb Tests */}
                                <div className="grid grid-cols-3 gap-3">
                                    <div className="col-span-2 space-y-1.5">
                                        <label className="text-[10px] font-bold text-slate-500 dark:text-white/30 uppercase tracking-[0.15em]">Titre de la campagne</label>
                                        <input
                                            type="text"
                                            value={campaignForm.title}
                                            onChange={(e) => setCampaignForm({ ...campaignForm, title: e.target.value })}
                                            className="w-full bg-slate-50 dark:bg-[#1a2235] border border-slate-200 dark:border-white/[0.08] rounded-[10px] px-4 py-2.5 text-[13px] text-slate-900 dark:text-white placeholder:text-slate-400 dark:text-white/20 focus:border-[#378ADD]/50 focus:ring-0 outline-none transition-colors"
                                            placeholder="Ex : Régression Sprint 42"
                                            required
                                        />
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-bold text-slate-500 dark:text-white/30 uppercase tracking-[0.15em]">Nb. tests</label>
                                        <input
                                            type="number"
                                            value={campaignForm.nb_test_cases}
                                            onChange={(e) => setCampaignForm({ ...campaignForm, nb_test_cases: parseInt(e.target.value) || 0 })}
                                            className="w-full bg-slate-50 dark:bg-[#1a2235] border border-slate-200 dark:border-white/[0.08] rounded-[10px] px-4 py-2.5 text-[13px] text-slate-900 dark:text-white focus:border-[#378ADD]/50 focus:ring-0 outline-none transition-colors"
                                            min="0"
                                        />
                                    </div>
                                </div>

                                {/* Description */}
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-bold text-slate-500 dark:text-white/30 uppercase tracking-[0.15em]">Description</label>
                                    <textarea
                                        value={campaignForm.description}
                                        onChange={(e) => setCampaignForm({ ...campaignForm, description: e.target.value })}
                                        className="w-full bg-slate-50 dark:bg-[#1a2235] border border-slate-200 dark:border-white/[0.08] rounded-[10px] px-4 py-2.5 text-[13px] text-slate-900 dark:text-white placeholder:text-slate-400 dark:text-white/20 focus:border-[#378ADD]/50 focus:ring-0 outline-none min-h-[80px] resize-none transition-colors"
                                        placeholder="Objectifs de cette campagne…"
                                    />
                                </div>

                                {/* Planification */}
                                <div className={`rounded-[12px] border transition-all duration-300 overflow-hidden ${showScheduleSelector ? 'border-[#6366f1]/30 bg-[#6366f1]/[0.04]' : 'border-white/[0.08] bg-slate-50 dark:bg-[#1a2235]'}`}>
                                    <div className="flex items-center justify-between px-4 py-3">
                                        <div className="flex items-center gap-2">
                                            <Clock size={14} className={showScheduleSelector ? 'text-[#818cf8]' : 'text-slate-500 dark:text-white/30'} />
                                            <span className="text-[11px] font-semibold text-slate-900 dark:text-white/60 uppercase tracking-widest">Planification</span>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => setShowScheduleSelector(!showScheduleSelector)}
                                            className={`text-[10px] font-bold uppercase tracking-wider px-3 py-1 rounded-full border transition-all ${showScheduleSelector ? 'bg-rose-500/10 text-[#F09595] border-rose-500/20' : 'bg-[#378ADD]/10 text-[#85B7EB] border-[#378ADD]/20 hover:bg-[#378ADD]/20'}`}
                                        >
                                            {showScheduleSelector ? 'Annuler' : 'Programmer'}
                                        </button>
                                    </div>
                                    <div className={`grid gap-3 px-4 pb-4 ${showScheduleSelector ? 'grid-cols-2' : 'grid-cols-1'}`}>
                                        {showScheduleSelector && (
                                            <div className="space-y-1.5 animate-in slide-in-from-top-2 duration-200">
                                                <label className="text-[10px] font-bold text-[#818cf8] uppercase tracking-[0.15em]">Date de lancement</label>
                                                <input
                                                    type="datetime-local"
                                                    value={campaignForm.scheduled_at}
                                                    onChange={(e) => setCampaignForm({ ...campaignForm, scheduled_at: e.target.value, start_date: e.target.value.split('T')[0] })}
                                                    className="w-full bg-white dark:bg-[#0d1117] border border-[#6366f1]/30 rounded-[8px] px-3 py-2 text-[12px] text-slate-900 dark:text-white focus:border-[#6366f1]/60 focus:ring-0 outline-none transition-colors"
                                                />
                                            </div>
                                        )}
                                        <div className="space-y-1.5">
                                            <label className="text-[10px] font-bold text-[#85B7EB] uppercase tracking-[0.15em]">Date d'échéance</label>
                                            <input
                                                type="date"
                                                value={campaignForm.estimated_end_date}
                                                onChange={(e) => setCampaignForm({ ...campaignForm, estimated_end_date: e.target.value })}
                                                className="w-full bg-white dark:bg-[#0d1117] border border-slate-200 dark:border-white/[0.08] rounded-[8px] px-3 py-2 text-[12px] text-slate-900 dark:text-white focus:border-[#378ADD]/50 focus:ring-0 outline-none transition-colors"
                                                required
                                            />
                                        </div>
                                    </div>
                                </div>

                                {/* Import Excel */}
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-bold text-slate-500 dark:text-white/30 uppercase tracking-[0.15em]">Cahier de tests (.xlsx)</label>
                                    <div className={`relative border border-dashed rounded-[12px] p-5 flex flex-col items-center justify-center gap-2 cursor-pointer transition-all ${campaignForm.file ? 'border-[#378ADD]/60 bg-[#378ADD]/[0.06]' : 'border-slate-200 dark:border-white/10 hover:border-slate-300 dark:border-white/20 bg-slate-50 dark:bg-[#1a2235]'}`}>
                                        <input type="file" onChange={handleFileChange} accept=".xlsx, .xls" className="absolute inset-0 opacity-0 cursor-pointer" required={!editingCampaign} />
                                        <Upload size={20} className={campaignForm.file ? 'text-[#378ADD]' : 'text-slate-400 dark:text-white/20'} />
                                        <p className={`text-[12px] font-medium text-center ${campaignForm.file ? 'text-[#85B7EB]' : 'text-slate-500 dark:text-white/30'}`}>
                                            {campaignForm.file ? campaignForm.file.name : 'Glisser ou cliquer pour importer'}
                                        </p>
                                        <p className="text-[10px] text-slate-400 dark:text-white/20">
                                            {editingCampaign ? 'Optionnel — cliquez pour remplacer le fichier existant' : 'Formats acceptés : .xlsx, .xls · max 10 Mo'}
                                        </p>
                                    </div>
                                </div>

                                {/* Équipe */}
                                <div className="space-y-2">
                                    <div className="flex items-center justify-between">
                                        <label className="text-[10px] font-bold text-slate-500 dark:text-white/30 uppercase tracking-[0.15em]">Équipe assignée</label>
                                        {campaignForm.assigned_testers.length > 0 && (
                                            <span className="text-[10px] font-semibold text-[#5DCAA5] bg-[#1D9E75]/10 border border-[#1D9E75]/20 px-2 py-0.5 rounded-full">
                                                {campaignForm.assigned_testers.length} sélectionné{campaignForm.assigned_testers.length > 1 ? 's' : ''}
                                            </span>
                                        )}
                                    </div>
                                    <div className="grid grid-cols-2 lg:grid-cols-3 gap-2 max-h-48 overflow-y-auto pr-1">
                                        {(testers || []).map(tester => {
                                            const isSelected = campaignForm.assigned_testers.includes(tester.id);
                                            const quota = testerQuotas[tester.id];
                                            return (
                                                <label
                                                    key={tester.id}
                                                    className={`flex items-center gap-2.5 p-2.5 rounded-[10px] cursor-pointer transition-all border ${isSelected ? 'bg-[#378ADD]/10 border-[#378ADD]/40' : 'bg-slate-50 dark:bg-[#1a2235] border-slate-200 dark:border-white/[0.06] hover:border-slate-300 dark:border-white/20'}`}
                                                >
                                                    <input
                                                        type="checkbox"
                                                        checked={isSelected}
                                                        onChange={(e) => {
                                                            const id = tester.id;
                                                            if (e.target.checked) {
                                                                setPendingTester(tester);
                                                                setTempQuota(campaignForm.nb_test_cases || 0);
                                                                setIsSingleQuotaModalOpen(true);
                                                            } else {
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
                                                    <div className={`w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-bold shrink-0 ${isSelected ? 'bg-[#378ADD] text-white' : 'bg-slate-100 dark:bg-white/[0.08] text-slate-500 dark:text-white/40'}`}>
                                                        {tester.username.charAt(0).toUpperCase()}
                                                    </div>
                                                    <div className="flex flex-col min-w-0">
                                                        <span className={`text-[12px] font-medium truncate leading-tight ${isSelected ? 'text-white' : 'text-slate-500 dark:text-white/50'}`}>{tester.username}</span>
                                                        {isSelected && quota != null && (
                                                            <span className="text-[10px] text-[#5DCAA5] leading-tight">{quota} tests</span>
                                                        )}
                                                    </div>
                                                    {isSelected && <Check size={12} className="text-[#378ADD] ml-auto shrink-0" />}
                                                </label>
                                            );
                                        })}
                                    </div>
                                </div>
                            </div>

                            {/* Footer */}
                            <div className="px-6 py-4 border-t border-slate-200 dark:border-white/[0.06] flex items-center gap-3 shrink-0">
                                <button
                                    type="button"
                                    onClick={() => setIsModalOpen(false)}
                                    disabled={isSubmitting}
                                    className="px-5 py-2.5 text-[12px] font-medium text-slate-500 dark:text-white/40 hover:text-slate-900 dark:hover:text-white transition-colors rounded-[8px] hover:bg-slate-100 dark:bg-white/[0.05]"
                                >
                                    Annuler
                                </button>
                                <button
                                    type="submit"
                                    disabled={isSubmitting}
                                    className="flex-1 py-2.5 bg-[#378ADD] hover:bg-[#2e75bc] disabled:opacity-50 text-white rounded-[10px] text-[13px] font-semibold transition-all flex items-center justify-center gap-2 active:scale-[0.98]"
                                >
                                    <CheckCircle size={15} />
                                    {isSubmitting ? 'Enregistrement…' : (editingCampaign ? 'Enregistrer les modifications' : 'Lancer la campagne')}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
                ) : null,
                document.body
            )}

            {/* Delete Confirmation */}
            {typeof document !== 'undefined' && createPortal(
                deleteModal.isOpen ? (
                <div className="fixed inset-0 z-[200000] flex items-center justify-center bg-slate-200/80 dark:bg-slate-200/80 dark:bg-slate-950/80 backdrop-blur-xl animate-in fade-in p-4">
                    <div className="bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-200 dark:border-white/10 rounded-[3rem] p-10 max-w-sm w-full shadow-2xl animate-in zoom-in-95">
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
                ) : null,
                document.body
            )}
            {/* Single Quota Modal */}
            {typeof document !== 'undefined' && createPortal(
                <AnimatePresence>
                    {isSingleQuotaModalOpen && pendingTester && (
                    <div className="fixed inset-0 z-[200000] flex items-center justify-center p-6">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="absolute inset-0 bg-slate-200/90 dark:bg-slate-200/90 dark:bg-slate-950/90 backdrop-blur-md"
                        />
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.9, y: 20 }}
                            className="relative w-full max-w-lg bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-200 dark:border-white/10 rounded-[3rem] shadow-2xl overflow-hidden"
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
                                            className="w-24 bg-slate-100 dark:bg-slate-100 dark:bg-black/40 border border-slate-300 dark:border-slate-200 dark:border-white/10 rounded-2xl px-4 py-3 text-slate-900 dark:text-white font-black text-center focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                                        />
                                        <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Tests</span>
                                    </div>
                                </div>
                            </div>

                            <div className="p-10 bg-slate-100 dark:bg-slate-100 dark:bg-black/20 flex gap-4">
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
                </AnimatePresence>,
                document.body
            )}
        </PageLayout>
    );
};

export default DataDrivenManager;