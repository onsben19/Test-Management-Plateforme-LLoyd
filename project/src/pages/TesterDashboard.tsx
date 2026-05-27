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
    const [executionResult, setExecutionResult] = useState<{ status: string; logs: string } | null>(null);

    useEffect(() => {
        if (user) {
            fetchAssignedCampaigns(currentPage);
        }
    }, [user, searchQuery, sortOrder, currentPage]);

    const fetchAssignedCampaigns = async (page = 1) => {
        try {
            setLoading(true);
            const response = await campaignService.getCampaigns({
                page,
                search: searchQuery,
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
    };

    const filteredCampaigns = useMemo(() => {
        return (campaigns || []).filter(camp => {
            if (releaseTypeFilter === 'all') return true;
            return camp.release_type === releaseTypeFilter;
        });
    }, [campaigns, releaseTypeFilter]);

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

                // 3. Execute script (backend handles PASSED/FAILED and Anomaly creation)
                const execRes = await executionService.executeScript(testId);

                if (execRes.data.status === 'FAILED') {
                    toast.warning(`Test échoué. Une anomalie a été déclarée automatiquement.`);
                } else {
                    toast.success(`Test réussi !`);
                }

                setExecutionResult({
                    status: execRes.data.status,
                    logs: execRes.data.logs
                });

                fetchAssignedCampaigns(currentPage);
            } catch (error) {
                console.error("AI Execution failed", error);
                toast.error("Erreur lors de l'exécution automatique");
            } finally {
                setExecutingCode(false);
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
                await anomalyService.createAnomaly(anomalyData);
                toast.warning(t('testerDashboard.toasts.anomalyReported'));
            } else {
                toast.success(t('testerDashboard.toasts.testValidated'));
            }

            setValidationModal({ isOpen: false, campaign: null });
            fetchAssignedCampaigns(currentPage);
        } catch (error) {
            console.error("Submission failed", error);
            toast.error(t('testerDashboard.toasts.validationError'));
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

        return (
            <motion.div
                key={camp.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="group relative overflow-hidden bg-white/5 backdrop-blur-xl border border-white/10 rounded-[2.5rem] p-8 hover:bg-white/10 transition-all duration-500 flex flex-col h-full shadow-2xl shadow-black/20"
            >
                <div className="flex justify-between items-start mb-8">
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
                                        className="text-white/5"
                                    />
                                    <circle
                                        cx="28" cy="28" r="24"
                                        stroke="currentColor"
                                        strokeWidth="4"
                                        fill="transparent"
                                        strokeDasharray={150.8}
                                        strokeDashoffset={150.8 - (150.8 * score) / 100}
                                        strokeLinecap="round"
                                        className={`${score >= 80 ? 'text-emerald-500' : score >= 40 ? 'text-amber-500' : 'text-rose-500'} transition-all duration-1000`}
                                    />
                                </svg>
                                <div className="absolute inset-0 flex flex-col items-center justify-center">
                                    <span className="text-[10px] font-black text-white leading-none">{score}%</span>
                                    <TrendingUp className={`w-2 h-2 mt-0.5 ${score >= 80 ? 'text-emerald-400' : 'text-amber-400'}`} />
                                </div>
                                <div className="absolute -top-1 -right-1">
                                    <div className="bg-blue-600 text-white p-1 rounded-full shadow-lg opacity-0 group-hover/readiness:opacity-100 transition-opacity">
                                        <Sparkles className="w-2 h-2" />
                                    </div>
                                </div>
                            </button>
                        )}
                    </div>
                    <div className="flex flex-col items-end gap-2">
                        <div className="px-4 py-2 bg-white/5 rounded-2xl text-[10px] font-black text-slate-400 tracking-widest uppercase border border-white/5">
                            {t('testerDashboard.card.testsPlanned', { count: camp.nb_test_cases })}
                        </div>
                        <div className="flex gap-2">
                            {camp.release_type && (
                                <div className={`px-3 py-1 rounded-full border text-[8px] font-black tracking-[0.2em] uppercase ${camp.release_type === 'PREPROD' ? 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20' : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'}`}>
                                    {camp.release_type}
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                <div className="flex-1">
                    <h3 className="text-2xl font-black text-white mb-4 tracking-tighter leading-tight group-hover:text-blue-400 transition-colors">
                        {camp.title}
                    </h3>
                    <p className="text-sm text-slate-400 mb-8 line-clamp-3 leading-relaxed font-medium">
                        {camp.description || t('testerDashboard.card.noDescription')}
                    </p>
                </div>

                <div className="space-y-4 mb-10 border-t border-white/5 pt-6">
                    <div className="flex items-center gap-3 text-[11px] font-black text-slate-500 uppercase tracking-widest">
                        <Calendar className="w-4 h-4 opacity-70" />
                        {new Date(camp.created_at).toLocaleDateString(t('common.dateLocale'))}
                    </div>
                    {ml?.projected_end_date && (
                        <div className="flex items-center gap-3 text-[10px] font-black text-blue-400/70 uppercase tracking-widest">
                            <Clock className="w-4 h-4 opacity-70" />
                            AI Forecast: {new Date(ml.projected_end_date).toLocaleDateString()}
                        </div>
                    )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-auto">
                    <button
                        type="button"
                        onClick={() => handleOpenExcel(camp.excel_file)}
                        className="px-6 py-4 bg-white/5 hover:bg-white/10 text-white rounded-2xl text-[11px] font-black tracking-widest uppercase transition-all duration-300 flex items-center justify-center gap-3 active:scale-95 border border-white/5 cursor-pointer"
                    >
                        <Eye className="w-4 h-4 text-blue-400" />
                        {t('testerDashboard.card.viewExcel')}
                    </button>
                    <button
                        type="button"
                        onClick={(e) => {
                            e.stopPropagation();
                            handleOpenValidation(camp);
                        }}
                        className="px-6 py-4 bg-blue-600 hover:bg-blue-500 text-white rounded-2xl text-[11px] font-black tracking-widest uppercase transition-all duration-300 flex items-center justify-center gap-3 shadow-lg shadow-blue-500/20 active:scale-95 cursor-pointer z-10"
                    >
                        <CheckCircle className="w-4 h-4" />
                        {t('testerDashboard.card.validateTask')}
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
                {/* QA Intelligence Hub Teaser - NEW */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="relative overflow-hidden bg-gradient-to-r from-indigo-600/20 to-cyan-600/20 border border-white/10 rounded-[2.5rem] p-8 group cursor-pointer"
                    onClick={() => navigate('/qa-intelligence')}
                >
                    <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-6">
                        <div className="flex items-center gap-6">
                            <div className="w-16 h-16 rounded-2xl bg-indigo-500/20 flex items-center justify-center text-indigo-400 border border-indigo-500/30">
                                <Sparkles size={32} />
                            </div>
                            <div>
                                <h2 className="text-xl font-black text-white uppercase tracking-tighter italic">QA Intelligence Hub</h2>
                                <p className="text-sm text-slate-400 font-medium">Découvrez les dernières tendances et conseils IA pour booster vos tests.</p>
                            </div>
                        </div>
                        <button className="px-8 py-3 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-black uppercase tracking-widest transition-all border border-white/10 group-hover:scale-105 active:scale-95">
                            Accéder au Hub →
                        </button>
                    </div>
                    {/* Background decoration */}
                    <div className="absolute top-0 right-0 w-64 h-full bg-white/5 skew-x-[-20deg] translate-x-20 group-hover:translate-x-10 transition-transform duration-700" />
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
                                className="w-full bg-white/5 border border-white/10 rounded-2xl pl-12 pr-6 py-4 text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all font-medium"
                            />
                        </div>

                        <div className="flex items-center gap-3 bg-white/5 px-6 rounded-2xl border border-white/10 min-w-[200px]">
                            <LayoutGrid className="w-4 h-4 text-slate-500" />
                            <select
                                value={groupMode}
                                onChange={(e) => setGroupMode(e.target.value as 'project' | 'release' | 'none')}
                                className="bg-transparent border-none py-4 text-sm font-bold text-white focus:ring-0 w-full cursor-pointer"
                            >
                                <option value="none" className="bg-slate-900">{t('testerDashboard.controls.simpleGrid')}</option>
                                <option value="project" className="bg-slate-900">{t('testerDashboard.controls.groupByProject')}</option>
                                <option value="release" className="bg-slate-900">{t('testerDashboard.controls.groupByRelease')}</option>
                            </select>
                        </div>

                        <div className="flex items-center gap-3 bg-white/5 px-6 rounded-2xl border border-white/10 min-w-[200px]">
                            <Layers className="w-4 h-4 text-slate-500" />
                            <select
                                value={releaseTypeFilter}
                                onChange={(e) => setReleaseTypeFilter(e.target.value as 'all' | 'PREPROD' | 'RECETTE')}
                                className="bg-transparent border-none py-4 text-sm font-bold text-white focus:ring-0 w-full cursor-pointer"
                            >
                                <option value="all" className="bg-slate-900">Toutes les releases</option>
                                <option value="PREPROD" className="bg-slate-900">Preprod</option>
                                <option value="RECETTE" className="bg-slate-900">Recette</option>
                            </select>
                        </div>

                        <div className="flex items-center gap-3 bg-white/5 px-6 rounded-2xl border border-white/10 min-w-[200px]">
                            <Filter className="w-4 h-4 text-slate-500" />
                            <select
                                value={sortOrder}
                                onChange={(e) => setSortOrder(e.target.value as 'newest' | 'oldest')}
                                className="bg-transparent border-none py-4 text-sm font-bold text-white focus:ring-0 w-full cursor-pointer"
                            >
                                <option value="newest" className="bg-slate-900">{t('testerDashboard.controls.recent')}</option>
                                <option value="oldest" className="bg-slate-900">{t('testerDashboard.controls.oldest')}</option>
                            </select>
                        </div>
                    </div>

                    {loading ? (
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                            {[1, 2, 3].map(i => (
                                <div key={i} className="h-[400px] bg-white/5 animate-pulse rounded-[2.5rem] border border-white/10" />
                            ))}
                        </div>
                    ) : (campaigns || []).length === 0 ? (
                        <div className="text-center py-32 bg-white/5 rounded-[2.5rem] border border-dashed border-white/10">
                            <List className="w-16 h-16 text-slate-600 mx-auto mb-4 opacity-50" />
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
                                        <h2 className="text-xl font-black text-white tracking-widest uppercase">
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
                                        <div className="h-px flex-1 bg-gradient-to-r from-white/10 to-transparent" />
                                        <span className="text-[10px] font-black text-slate-500 bg-white/5 px-3 py-1.5 rounded-lg border border-white/5 uppercase tracking-widest">
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
