import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import PageLayout from '../components/PageLayout';
import { useAuth } from '../context/AuthContext';
import { useSidebar } from '../context/SidebarContext';
import { campaignService, executionService, anomalyService, aiService } from '../services/api';
import { CheckCircle, XCircle, AlertTriangle, Eye, List, Calendar, Layers, LayoutGrid, Search, Filter, User, Sparkles, TrendingUp, Clock, ChevronRight, Play, Code } from 'lucide-react';
import { toast } from 'react-toastify';
import Pagination from '../components/Pagination';
import { motion, AnimatePresence } from 'framer-motion';
import StatCard from '../components/StatCard';
import { Target, Activity, FileText as FileIcon } from 'lucide-react';
import ReadinessDetailModal from '../components/ReadinessDetailModal';
import QANewsHub from '../components/QANewsHub';
import ValidateCasDeTest from '../components/ValidateCasDeTest';
import { PendingReinforcements } from '../components/PendingReinforcements';

const TesterDashboard = () => {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const { user } = useAuth();
    const [campaigns, setCampaigns] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [currentPage, setCurrentPage] = useState(1);
    const [totalItems, setTotalItems] = useState(0);
    const [searchQuery, setSearchQuery] = useState('');
    const [sortOrder, setSortOrder] = useState<'newest' | 'oldest'>('newest');
    const [groupMode, setGroupMode] = useState<'none' | 'release' | 'project'>('release');
    const [releaseTypeFilter, setReleaseTypeFilter] = useState<'all' | 'PREPROD' | 'RECETTE'>('all');
    const pageSize = 12;

    const [validationModal, setValidationModal] = useState<{ isOpen: boolean; campaign: any | null }>({
        isOpen: false,
        campaign: null
    });

    const [readinessScores, setReadinessScores] = useState<Record<string, number>>({});
    const [mlInsights, setMlInsights] = useState<Record<string, any>>({});
    const [selectedReadiness, setSelectedReadiness] = useState<{ isOpen: boolean; data: any; title: string } | null>(null);
    const [expandedDescMap, setExpandedDescMap] = useState<Record<string, boolean>>({});
    const [stats, setStats] = useState({
        totalTests: 0,
        openAnomalies: 0,
        avgReadiness: 0
    });

    const [testCaseForm, setTestCaseForm] = useState({
        test_case_ref: '',
        status: 'PASSED',
        anomaly_title: '',
        anomaly_description: '',
        anomaly_impact: 'MINEURS',
        anomaly_priority: 'NORMALE',
        anomaly_visibility: 'PUBLIQUE',
        anomaly_file: null as File | null,
        executionType: 'ai' as 'manual' | 'ai',
        manualData: '',
        code: ''
    });
    const [generatingCode, setGeneratingCode] = useState(false);
    const [executingCode, setExecutingCode] = useState(false);
    const [executionResult, setExecutionResult] = useState<{ status: string; logs: string; anomaly_id?: string } | null>(null);
    const [liveLogs, setLiveLogs] = useState<string>('');

    useEffect(() => {
        if (user) {
            setCurrentPage(1);
            fetchAssignedCampaigns(1);
        }
    }, [user, searchQuery, sortOrder, releaseTypeFilter]);

    const fetchAssignedCampaigns = async (page = 1) => {
        try {
            setLoading(true);
            const response = await campaignService.getCampaigns({
                page,
                search: searchQuery,
                ordering: sortOrder === 'newest' ? '-created_at' : 'created_at',
                release_type: releaseTypeFilter
            });
            const responseData = response.data || {};
            const data = (responseData.results || (Array.isArray(responseData) ? responseData : []));
            const count = responseData.count || (Array.isArray(data) ? data.length : 0);
            setTotalItems(count);
            setCampaigns(data);

            // Calculate total tests planned
            const total = Array.isArray(data) ? data.reduce((sum: number, c: any) => sum + (c.nb_test_cases || 0), 0) : 0;

            // Fetch Anomalies for the user
            try {
                const anomaliesRes = await anomalyService.getAnomalies();
                const anomData = anomaliesRes.data.results || anomaliesRes.data;
                const openAnom = anomData.filter((a: any) => a.statut !== 'REALISE').length;
                setStats(prev => ({ ...prev, totalTests: total, openAnomalies: openAnom }));
            } catch (err) {
                console.error("Failed to fetch anomalies for stats", err);
            }

            // Fetch AI data for each campaign
            const campaignIds = data.map((c: any) => c.id);
            if (campaignIds.length > 0) {
                // Readiness scores
                Promise.all(campaignIds.map((id: any) => aiService.getReadinessScore(id).catch(() => ({ data: { score: 0 } }))))
                    .then(results => {
                        const scoreMap: Record<string, number> = {};
                        let totalReadiness = 0;
                        results.forEach((res, i) => {
                            const s = res.data.score !== undefined ? res.data.score : (res.data.readiness_score || 0);
                            scoreMap[campaignIds[i]] = s;
                            totalReadiness += s;
                        });
                        setReadinessScores(prev => ({ ...prev, ...scoreMap }));
                        setStats(prev => ({ ...prev, avgReadiness: Math.round(totalReadiness / results.length) }));
                    }).catch(err => console.error("Error fetching readiness", err));

                // ML Insights (Timeline Guard)
                Promise.all(campaignIds.map((id: any) => aiService.getTimelineGuard(id).catch(() => null)))
                    .then(results => {
                        const mlMap: Record<string, any> = {};
                        results.forEach((res, i) => {
                            if (res) mlMap[campaignIds[i]] = res.data;
                        });
                        setMlInsights(prev => ({ ...prev, ...mlMap }));
                    }).catch(err => console.error("Error fetching ML insights", err));
            }
        } catch (error) {
            console.error("Failed to fetch campaigns", error);
        } finally {
            setLoading(false);
        }
    };

    const handlePageChange = (page: number) => {
        setCurrentPage(page);
        fetchAssignedCampaigns(page);
    };

    const filteredCampaigns = campaigns || [];

    const groupedCampaigns = filteredCampaigns.reduce((acc, camp) => {
        if (groupMode === 'none') return acc;

        let key = '';
        if (groupMode === 'project') {
            key = camp.business_project_name || t('common.globalProject');
        } else {
            const businessProject = camp.business_project_name || t('common.globalProject');
            const releaseName = camp.project_name || t('common.noRelease');
            key = `${businessProject} > ${releaseName}`;
        }

        if (!acc[key]) acc[key] = [];
        acc[key].push(camp);
        return acc;
    }, {} as Record<string, any[]>);

    const handleOpenValidation = (campaign: any) => {
        setValidationModal({ isOpen: true, campaign: campaign });
        setTestCaseForm({
            test_case_ref: '',
            status: 'PASSED',
            anomaly_title: '',
            anomaly_description: '',
            anomaly_impact: 'MINEURS',
            anomaly_priority: 'NORMALE',
            anomaly_visibility: 'PUBLIQUE',
            anomaly_file: null,
            executionType: 'ai',
            manualData: '',
            code: ''
        });
    };

    const handleGenerateScript = async () => {
        if (!testCaseForm.test_case_ref || !testCaseForm.manualData) {
            toast.error("Veuillez saisir la référence et les étapes du test.");
            return;
        }
        setGeneratingCode(true);
        try {
            const res = await executionService.generateScriptStandalone({
                title: testCaseForm.test_case_ref,
                manual_data: testCaseForm.manualData
            });
            setTestCaseForm(prev => ({ ...prev, code: res.data.code }));
            toast.success("Code généré avec succès");
        } catch (error) {
            toast.error("Erreur lors de la génération du code");
        } finally {
            setGeneratingCode(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!validationModal.campaign || !user) return;

        if (testCaseForm.executionType === 'ai') {
            if (!testCaseForm.code) {
                toast.error("Veuillez d'abord générer le code Playwright.");
                return;
            }
            setExecutingCode(true);
            setLiveLogs('');
            setExecutionResult(null);

            let ws: WebSocket | null = null;
            try {
                // 1. Create TestCase with status PENDING
                const executionData = new FormData();
                executionData.append('campaign', validationModal.campaign.id);
                executionData.append('test_case_ref', testCaseForm.test_case_ref);
                executionData.append('status', 'PASSED');
                executionData.append('tester', user.id.toString());
                executionData.append('data_json', JSON.stringify({ manualData: testCaseForm.manualData }));

                const execResponse = await executionService.createExecution(executionData);
                const testId = execResponse.data.id;

                // 2. Save script
                await executionService.saveScript(testId, testCaseForm.code);

                // 2b. Connect WebSocket for live logs
                const protocol = window.location.protocol === 'https:' ? 'wss' : 'ws';
                const token = localStorage.getItem('access_token');
                const wsUrl = `${protocol}://${window.location.host}/ws/testcases/${testId}/logs/${token ? `?token=${token}` : ''}`;

                try {
                    ws = new WebSocket(wsUrl);
                    ws.onmessage = (e) => {
                        const data = JSON.parse(e.data);
                        if (data.type === 'log') {
                            setLiveLogs(prev => prev + data.message);
                        }
                    };
                    ws.onerror = (err) => {
                        console.error("WS Error:", err);
                    };

                    // Attendre l'ouverture du WebSocket avant de lancer l'exécution (résout la race condition)
                    await new Promise<void>((resolve) => {
                        if (!ws) return resolve();
                        let resolved = false;
                        ws.onopen = () => {
                            if (!resolved) {
                                resolved = true;
                                resolve();
                            }
                        };
                        setTimeout(() => {
                            if (!resolved) {
                                resolved = true;
                                resolve(); // fallback
                            }
                        }, 2000);
                    });
                } catch (err) {
                    console.error("Failed to connect WebSocket for logs", err);
                }

                // 3. Execute script (backend handles PASSED/FAILED and Anomaly creation)
                const execRes = await executionService.executeScript(testId);

                if (execRes.data.status === 'FAILED') {
                    toast.warning(`Test échoué. Une anomalie a été déclarée automatiquement.`);
                } else {
                    toast.success(`Test réussi !`);
                }

                setExecutionResult({
                    status: execRes.data.status,
                    logs: execRes.data.logs,
                    anomaly_id: execRes.data.anomaly_id
                });

                fetchAssignedCampaigns(currentPage);
            } catch (error) {
                console.error("AI Execution failed", error);
                toast.error("Erreur lors de l'exécution automatique");
            } finally {
                setExecutingCode(false);
                if (ws) {
                    ws.close();
                }
            }
            return;
        }

        try {
            const executionData = new FormData();
            executionData.append('campaign', validationModal.campaign.id);
            executionData.append('test_case_ref', testCaseForm.test_case_ref);
            executionData.append('status', testCaseForm.status);
            executionData.append('tester', user.id.toString());
            executionData.append('data_json', JSON.stringify({ manual: true }));

            if (testCaseForm.anomaly_file) {
                executionData.append('proof_file', testCaseForm.anomaly_file);
            }

            const execResponse = await executionService.createExecution(executionData);

            if (testCaseForm.status === 'FAILED') {
                const anomalyData = new FormData();
                anomalyData.append('test_case', execResponse.data.id);
                anomalyData.append('titre', testCaseForm.anomaly_title);
                anomalyData.append('description', testCaseForm.anomaly_description);
                anomalyData.append('impact', testCaseForm.anomaly_impact);
                anomalyData.append('priorite', testCaseForm.anomaly_priority);
                anomalyData.append('visibilite', testCaseForm.anomaly_visibility);
                anomalyData.append('cree_par', user.id.toString());
                if (testCaseForm.anomaly_file) {
                    anomalyData.append('preuve_image', testCaseForm.anomaly_file);
                }
                const anomalyRes = await anomalyService.createAnomaly(anomalyData);
                toast.warning(t('testerDashboard.toasts.anomalyReported'));

                setExecutionResult({
                    status: 'FAILED',
                    logs: 'Exécution manuelle échouée. L\'anomalie a été déclarée avec succès dans le système.',
                    anomaly_id: anomalyRes.data?.id || anomalyRes.data?.anomaly_id
                });
            } else {
                toast.success(t('testerDashboard.toasts.testValidated'));
                setValidationModal({ isOpen: false, campaign: null });
            }

            setValidationModal({ isOpen: false, campaign: null });
            fetchAssignedCampaigns(currentPage);
        } catch (error) {
            console.error("Submission failed", error);
            let errMsg = t('testerDashboard.toasts.validationError');
            const axiosError = error as any;
            if (axiosError.response?.data) {
                const data = axiosError.response.data;
                if (data.proof_file) {
                    errMsg = Array.isArray(data.proof_file) ? data.proof_file[0] : data.proof_file;
                } else if (data.preuve_image) {
                    errMsg = Array.isArray(data.preuve_image) ? data.preuve_image[0] : data.preuve_image;
                } else if (data.non_field_errors) {
                    errMsg = Array.isArray(data.non_field_errors) ? data.non_field_errors[0] : data.non_field_errors;
                } else if (data.detail) {
                    errMsg = data.detail;
                } else if (typeof data === 'object') {
                    const keys = Object.keys(data);
                    if (keys.length > 0) {
                        const val = data[keys[0]];
                        errMsg = Array.isArray(val) ? val[0] : String(val);
                    }
                }
            }
            toast.error(errMsg);
        }
    };

    const handleOpenExcel = (url: string) => {
        if (!url) {
            toast.error(t('testerDashboard.toasts.fileNotFound'));
            return;
        }
        let link = url;
        if (url.includes('/media/')) {
            link = url.substring(url.indexOf('/media/'));
        }
        window.open(link, '_blank');
    };

    const handleOpenReadiness = async (campaign: any) => {
        const score = readinessScores[campaign.id];
        if (score === undefined) return;

        try {
            const res = await aiService.getReadinessScore(campaign.id);
            setSelectedReadiness({
                isOpen: true,
                data: res.data,
                title: campaign.title
            });
        } catch (error) {
            console.error("Failed to fetch readiness details", error);
            toast.error("Impossible de récupérer les détails du readiness");
        }
    };

    const getMLStatusStyle = (status: string) => {
        switch (status) {
            case 'CRITICAL': return 'bg-rose-500/10 text-rose-400 border-rose-500/20';
            case 'WARNING': return 'bg-amber-500/10 text-amber-400 border-amber-500/20';
            case 'OPTIMAL': return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
            default: return 'bg-slate-500/10 text-slate-400 border-slate-500/20';
        }
    };

    const renderCampaignCard = (camp: any) => {
        const score = readinessScores[camp.id];
        const ml = mlInsights[camp.id];

        const getEnvColor = (env: string) => {
            if (env === 'PREPROD') return 'teal';
            if (env === 'RECETTE') return 'amber';
            return 'blue';
        };
        const envColor = getEnvColor(camp.release_type);
        const ringColor = envColor === 'teal' ? 'text-teal-500' : envColor === 'amber' ? 'text-amber-500' : 'text-blue-500';

        return (
            <motion.div
                key={camp.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="group relative overflow-hidden bg-white dark:bg-white/5 backdrop-blur-xl border border-slate-200 dark:border-white/10 rounded-[2.5rem] p-8 hover:bg-slate-50 dark:hover:bg-white/10 transition-all duration-500 flex flex-col h-full shadow-2xl shadow-slate-200/50 dark:shadow-black/20"
            >
                <div className="flex justify-between items-start mb-6">
                    {/* Top Left: Badges */}
                    <div className="flex flex-col items-start gap-2">
                        {camp.release_type && (
                            <div className={`px-3 py-1 rounded-full border text-[9px] font-black tracking-[0.2em] uppercase ${envColor === 'teal' ? 'bg-teal-500/10 text-teal-400 border-teal-500/20' :
                                    envColor === 'amber' ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' :
                                        'bg-blue-500/10 text-blue-400 border-blue-500/20'
                                }`}>
                                {camp.release_type}
                            </div>
                        )}
                        <div className="px-3 py-1 bg-slate-100 dark:bg-white/5 rounded-full text-[9px] font-black text-slate-400 tracking-widest uppercase border border-slate-200 dark:border-white/5">
                            {camp.nb_test_cases} TEST{camp.nb_test_cases > 1 ? 'S' : ''}
                        </div>
                    </div>

                    {/* Top Right: Progress Ring */}
                    <div className="flex items-center gap-4">
                        {score !== undefined && (
                            <button
                                onClick={() => handleOpenReadiness(camp)}
                                className="relative w-14 h-14 group/readiness active:scale-95 group-hover:scale-110 transition-all duration-500"
                            >
                                <svg className="w-full h-full transform -rotate-90">
                                    <circle
                                        cx="28" cy="28" r="24"
                                        stroke="currentColor"
                                        strokeWidth="4"
                                        fill="transparent"
                                        className="text-slate-100 dark:text-white/5"
                                    />
                                    <circle
                                        cx="28" cy="28" r="24"
                                        stroke="currentColor"
                                        strokeWidth="4"
                                        fill="transparent"
                                        strokeDasharray={150.8}
                                        strokeDashoffset={150.8 - (150.8 * score) / 100}
                                        strokeLinecap="round"
                                        className={`${ringColor} transition-all duration-1000`}
                                    />
                                </svg>
                                <div className="absolute inset-0 flex flex-col items-center justify-center">
                                    <span className="text-[10px] font-black text-slate-900 dark:text-white leading-none">{score}%</span>
                                </div>
                                <div className="absolute -top-1 -right-1">
                                    <div className="bg-blue-600 text-white p-1 rounded-full shadow-lg opacity-0 group-hover/readiness:opacity-100 transition-opacity">
                                        <TrendingUp className="w-2 h-2" />
                                    </div>
                                </div>
                            </button>
                        )}
                    </div>
                </div>

                <div className="flex-1">
                    <h3 className="text-xl font-black text-slate-900 dark:text-white mb-3 tracking-tighter leading-tight group-hover:text-blue-500 dark:group-hover:text-blue-400 transition-colors">
                        {camp.title}
                    </h3>
                    {camp.description ? (
                        <div className="mb-8">
                            <p className={`text-sm text-slate-400 leading-relaxed font-medium ${!expandedDescMap[camp.id] ? 'line-clamp-3' : ''}`}>
                                {camp.description}
                            </p>
                            {camp.description.length > 150 && (
                                <button 
                                    onClick={() => setExpandedDescMap(prev => ({ ...prev, [camp.id]: !prev[camp.id] }))}
                                    className="text-[10px] font-black uppercase tracking-widest text-blue-400 hover:text-blue-300 mt-2 transition-colors focus:outline-none"
                                >
                                    {expandedDescMap[camp.id] ? 'Réduire' : 'Lire la suite'}
                                </button>
                            )}
                        </div>
                    ) : (
                        <p className="text-sm text-slate-500/60 mb-8 italic font-medium">
                            Aucune description pour cette campagne.
                        </p>
                    )}
                </div>

                <div className="flex flex-wrap items-center gap-3 mb-8 border-t border-slate-200 dark:border-white/5 pt-6">
                    <div className="flex items-center gap-2 text-[10px] font-black text-slate-500 uppercase tracking-widest bg-slate-100 dark:bg-white/5 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-white/5">
                        Créé le {new Date(camp.created_at).toLocaleDateString(t('common.dateLocale'))}
                    </div>
                    {ml?.projected_end_date && (
                        <div className="flex items-center gap-2 text-[10px] font-black text-purple-400 uppercase tracking-widest bg-purple-500/10 border border-purple-500/20 px-3 py-1.5 rounded-lg">
                            Fin estimée  : {new Date(ml.projected_end_date).toLocaleDateString()}
                        </div>
                    )}
                </div>

                <div className="grid grid-cols-2 gap-3 mt-auto relative z-10">
                    <button
                        type="button"
                        onClick={() => handleOpenExcel(camp.excel_file)}
                        className="py-3 bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 text-slate-900 dark:text-white rounded-xl text-[10px] font-black tracking-widest uppercase transition-all duration-300 flex items-center justify-center gap-2 active:scale-95 border border-slate-200 dark:border-white/5"
                    >
                        Excel
                    </button>
                    <button
                        type="button"
                        onClick={(e) => {
                            e.stopPropagation();
                            handleOpenValidation(camp);
                        }}
                        className="py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-[10px] font-black tracking-widest uppercase transition-all duration-300 flex items-center justify-center gap-2 shadow-lg shadow-blue-500/20 active:scale-95"
                    >
                        Valider
                    </button>
                </div>
                <div className="absolute -right-20 -bottom-20 w-64 h-64 bg-blue-600/10 rounded-full blur-[100px] opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none" />
            </motion.div>
        );
    };

    return (
        <PageLayout
            title={t('testerDashboard.title')}
            subtitle={t('testerDashboard.subtitle')}
        >
            <div className="space-y-12">
                <PendingReinforcements />

                {/* QA Intelligence Hub Teaser - Finesse */}
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="relative overflow-hidden bg-slate-50 dark:bg-white/[0.02] border border-slate-200 dark:border-white/5 rounded-2xl p-4 md:p-5 group cursor-pointer hover:bg-slate-50 dark:bg-white/[0.04] hover:border-indigo-500/30 transition-all duration-500 shadow-lg shadow-black/10"
                    onClick={() => navigate('/qa-intelligence')}
                >
                    {/* Glowing left accent */}
                    <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-indigo-500 to-purple-500 opacity-30 group-hover:opacity-100 transition-opacity duration-500" />

                    <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-4 ml-2">
                        <div className="flex items-center gap-4 w-full md:w-auto">
                            <div>
                                <h2 className="text-sm font-bold text-slate-900 dark:text-white tracking-wide flex items-center gap-2">
                                    Veille & Innovations IA
                                    <span className="px-2 py-0.5 bg-indigo-500/20 text-indigo-300 text-[9px] uppercase tracking-widest rounded-full font-black">Nouveau</span>
                                </h2>
                                <p className="text-xs text-slate-400 mt-1 font-medium">Explorez les dernières tendances IA pour booster vos stratégies de test.</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-2 text-[11px] font-black text-indigo-400 uppercase tracking-widest group-hover:text-indigo-300 group-hover:translate-x-1 transition-all duration-300 w-full md:w-auto justify-end">
                            Découvrir <ChevronRight size={14} />
                        </div>
                    </div>
                </motion.div>

                {/* Stats Section */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    <StatCard
                        title={t('testerDashboard.stats.assignedCampaigns')}
                        value={totalItems}
                        icon={Layers}
                        variant="blue"
                        description="Campagnes actives assignées"
                    />
                    <StatCard
                        title={t('testerDashboard.stats.testsPlanned')}
                        value={stats.totalTests}
                        icon={Target}
                        variant="purple"
                        description="Volume de tests à couvrir"
                    />
                    <StatCard
                        title={t('testerDashboard.stats.avgReadiness')}
                        value={stats.avgReadiness}
                        icon={TrendingUp}
                        variant="green"
                        description="Score de préparation moyen"
                        change={`${stats.avgReadiness}%`}
                        changeType="positive"
                    />
                    <StatCard
                        title={t('testerDashboard.stats.openAnomalies')}
                        value={stats.openAnomalies}
                        icon={AlertTriangle}
                        variant="red"
                        description="Bugs en attente de validation"
                    />
                </div>

                <div className="space-y-8">
                    <div className="flex flex-col lg:flex-row gap-6">
                        <div className="relative flex-1">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                            <input
                                type="text"
                                placeholder={t('testerDashboard.searchPlaceholder')}
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl pl-12 pr-6 py-4 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all font-medium placeholder-slate-500"
                            />
                        </div>

                        <div className="flex items-center gap-3 bg-slate-100 dark:bg-white/5 px-6 rounded-2xl border border-slate-200 dark:border-white/10 min-w-[200px]">
                            <LayoutGrid className="w-4 h-4 text-slate-500" />
                            <select
                                value={groupMode}
                                onChange={(e) => setGroupMode(e.target.value as 'project' | 'release' | 'none')}
                                className="bg-transparent border-none py-4 text-sm font-bold text-slate-900 dark:text-white focus:ring-0 w-full cursor-pointer"
                            >
                                <option value="none" className="bg-white dark:bg-slate-900">{t('testerDashboard.controls.simpleGrid')}</option>
                                <option value="project" className="bg-white dark:bg-slate-900">{t('testerDashboard.controls.groupByProject')}</option>
                                <option value="release" className="bg-white dark:bg-slate-900">{t('testerDashboard.controls.groupByRelease')}</option>
                            </select>
                        </div>

                        <div className="flex items-center gap-3 bg-slate-100 dark:bg-white/5 px-6 rounded-2xl border border-slate-200 dark:border-white/10 min-w-[200px]">
                            <Layers className="w-4 h-4 text-slate-500" />
                            <select
                                value={releaseTypeFilter}
                                onChange={(e) => setReleaseTypeFilter(e.target.value as 'all' | 'PREPROD' | 'RECETTE')}
                                className="bg-transparent border-none py-4 text-sm font-bold text-slate-900 dark:text-white focus:ring-0 w-full cursor-pointer"
                            >
                                <option value="all" className="bg-white dark:bg-slate-900">Toutes les releases</option>
                                <option value="PREPROD" className="bg-white dark:bg-slate-900">Preprod</option>
                                <option value="RECETTE" className="bg-white dark:bg-slate-900">Recette</option>
                            </select>
                        </div>

                        <div className="flex items-center gap-3 bg-slate-100 dark:bg-white/5 px-6 rounded-2xl border border-slate-200 dark:border-white/10 min-w-[200px]">
                            <Filter className="w-4 h-4 text-slate-500" />
                            <select
                                value={sortOrder}
                                onChange={(e) => setSortOrder(e.target.value as 'newest' | 'oldest')}
                                className="bg-transparent border-none py-4 text-sm font-bold text-slate-900 dark:text-white focus:ring-0 w-full cursor-pointer"
                            >
                                <option value="newest" className="bg-white dark:bg-slate-900">{t('testerDashboard.controls.recent')}</option>
                                <option value="oldest" className="bg-white dark:bg-slate-900">{t('testerDashboard.controls.oldest')}</option>
                            </select>
                        </div>
                    </div>

                    {loading ? (
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                            {[1, 2, 3].map(i => (
                                <div key={i} className="h-[400px] bg-slate-100 dark:bg-white/5 animate-pulse rounded-[2.5rem] border border-slate-200 dark:border-white/10" />
                            ))}
                        </div>
                    ) : (campaigns || []).length === 0 ? (
                        <div className="text-center py-32 bg-slate-50 dark:bg-white/5 rounded-[2.5rem] border border-dashed border-slate-300 dark:border-white/10">
                            <List className="w-16 h-16 text-slate-400 dark:text-slate-600 mx-auto mb-4 opacity-50" />
                            <p className="text-xl font-bold text-slate-400 italic">
                                {(campaigns || []).length === 0 ? t('testerDashboard.state.emptyAssigned') : t('testerDashboard.state.emptySearch')}
                            </p>
                        </div>
                    ) : groupMode !== 'none' ? (
                        <div className="space-y-12">
                            {Object.keys(groupedCampaigns || {}).map(releaseName => (
                                <div key={releaseName} className="space-y-6">
                                    <div className="flex items-center gap-4">
                                        <div className="w-10 h-10 rounded-xl bg-blue-600/20 flex items-center justify-center border border-blue-600/30">
                                            <Layers className="w-5 h-5 text-blue-400" />
                                        </div>
                                        <h2 className="text-xl font-black text-slate-900 dark:text-white tracking-widest uppercase">
                                            {groupMode === 'project' ? (
                                                <span className="text-blue-500">{releaseName}</span>
                                            ) : (
                                                <>
                                                    <span className="text-slate-500">{releaseName.split(' > ')[0]}</span>
                                                    <ChevronRight className="w-4 h-4 inline-block mx-2 text-slate-700" />
                                                    <span className="text-blue-500">{releaseName.split(' > ')[1]}</span>
                                                </>
                                            )}
                                        </h2>
                                        <div className="h-px flex-1 bg-gradient-to-r from-slate-200 dark:from-white/10 to-transparent" />
                                        <span className="text-[10px] font-black text-slate-500 bg-slate-100 dark:bg-white/5 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-white/5 uppercase tracking-widest">
                                            {t('testerDashboard.group.count', { count: groupedCampaigns[releaseName].length })}
                                        </span>
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                                        {(groupedCampaigns[releaseName] || []).map(camp => renderCampaignCard(camp))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                            {filteredCampaigns.map(camp => renderCampaignCard(camp))}
                        </div>
                    )}

                    <div className="pt-10">
                        <Pagination
                            currentPage={currentPage}
                            totalItems={totalItems}
                            pageSize={pageSize}
                            onPageChange={handlePageChange}
                            loading={loading}
                        />
                    </div>
                </div>

                <AnimatePresence>
                    {validationModal.isOpen && (
                        <ValidateCasDeTest
                            isOpen={validationModal.isOpen}
                            onClose={() => setValidationModal({ isOpen: false, campaign: null })}
                            campaign={validationModal.campaign}
                            testCaseForm={testCaseForm}
                            setTestCaseForm={setTestCaseForm}
                            handleGenerateScript={handleGenerateScript}
                            handleSubmit={handleSubmit}
                            executingCode={executingCode}
                            generatingCode={generatingCode}
                            executionResult={executionResult}
                            setExecutionResult={setExecutionResult}
                            liveLogs={liveLogs}
                        />
                    )}
                </AnimatePresence>

                <ReadinessDetailModal
                    isOpen={!!selectedReadiness?.isOpen}
                    onClose={() => setSelectedReadiness(null)}
                    data={selectedReadiness?.data}
                    title={selectedReadiness?.title || ''}
                />
            </div>
        </PageLayout>
    );
};

export default TesterDashboard;
