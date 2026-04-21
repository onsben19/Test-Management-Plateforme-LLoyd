import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import PageLayout from '../components/PageLayout';
import { useAuth } from '../context/AuthContext';
import { useSidebar } from '../context/SidebarContext';
import { campaignService, executionService, anomalyService, aiService } from '../services/api';
import { CheckCircle, XCircle, AlertTriangle, Eye, List, Calendar, Layers, LayoutGrid, Search, Filter, User, Sparkles, TrendingUp, Clock, ChevronRight } from 'lucide-react';
import { toast } from 'react-toastify';
import Pagination from '../components/Pagination';
import { motion, AnimatePresence } from 'framer-motion';
import StatCard from '../components/StatCard';
import { Target, Activity, FileText as FileIcon } from 'lucide-react';
import ReadinessDetailModal from '../components/ReadinessDetailModal';

const TesterDashboard = () => {
    const { t } = useTranslation();
    const { user } = useAuth();
    const [campaigns, setCampaigns] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [currentPage, setCurrentPage] = useState(1);
    const [totalItems, setTotalItems] = useState(0);
    const [searchQuery, setSearchQuery] = useState('');
    const [sortOrder, setSortOrder] = useState<'newest' | 'oldest'>('newest');
    const [groupMode, setGroupMode] = useState<'none' | 'release' | 'project'>('release');
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
        anomaly_file: null as File | null
    });

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
            const data = response.data.results || response.data;
            const count = response.data.count || (Array.isArray(response.data) ? response.data.length : 0);
            setTotalItems(count);
            setCampaigns(data);

            // Calculate total tests planned
            const total = data.reduce((sum: number, c: any) => sum + (c.nb_test_cases || 0), 0);

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
                Promise.all(campaignIds.map((id: any) => aiService.getReadinessScore(id).catch(() => ({ data: { readiness_score: 0 } }))))
                    .then(results => {
                        const scoreMap: Record<string, number> = {};
                        let totalReadiness = 0;
                        results.forEach((res, i) => {
                            const s = res.data.readiness_score || 0;
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

    const groupedCampaigns = (campaigns || []).reduce((acc, camp) => {
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
            anomaly_file: null
        });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!validationModal.campaign || !user) return;

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
                        <div className="w-14 h-14 rounded-2xl bg-blue-500/20 flex items-center justify-center text-blue-400 border border-blue-500/30 group-hover:scale-110 group-hover:rotate-6 transition-all duration-500">
                            <List className="w-7 h-7" />
                        </div>
                        {score !== undefined && (
                            <button
                                onClick={() => handleOpenReadiness(camp)}
                                className="relative w-14 h-14 group/readiness active:scale-95 transition-all"
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
                            {ml && (
                                <div className={`px-3 py-1 rounded-full border text-[8px] font-black tracking-[0.2em] uppercase ${getMLStatusStyle(ml.status)}`}>
                                    AI: {ml.status}
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
                        <div className="flex items-center gap-3 text-[10px] font-black text-amber-400/70 uppercase tracking-widest">
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
                        className="px-6 py-4 bg-emerald-600 hover:bg-emerald-500 text-white rounded-2xl text-[11px] font-black tracking-widest uppercase transition-all duration-300 flex items-center justify-center gap-3 shadow-lg shadow-emerald-500/20 active:scale-95 cursor-pointer z-10"
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

                        <div className="flex items-center gap-3 bg-white/5 p-1.5 rounded-2xl border border-white/10">
                            <button
                                onClick={() => setGroupMode('project')}
                                className={`flex items-center gap-2 px-6 py-3 rounded-xl text-xs font-black tracking-widest uppercase transition-all ${groupMode === 'project' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20' : 'text-slate-400 hover:text-white'}`}
                            >
                                <Target className="w-4 h-4" />
                                {t('testerDashboard.controls.groupByProject') || 'GROUPÉ PAR PROJET'}
                            </button>
                            <button
                                onClick={() => setGroupMode('release')}
                                className={`flex items-center gap-2 px-6 py-3 rounded-xl text-xs font-black tracking-widest uppercase transition-all ${groupMode === 'release' ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20' : 'text-slate-400 hover:text-white'}`}
                            >
                                <Layers className="w-4 h-4" />
                                {t('testerDashboard.controls.groupByRelease')}
                            </button>
                            <button
                                onClick={() => setGroupMode('none')}
                                className={`flex items-center gap-2 px-6 py-3 rounded-xl text-xs font-black tracking-widest uppercase transition-all ${groupMode === 'none' ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20' : 'text-slate-400 hover:text-white'}`}
                            >
                                <LayoutGrid className="w-4 h-4" />
                                {t('testerDashboard.controls.simpleGrid')}
                            </button>
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
                            {Object.keys(groupedCampaigns).map(releaseName => (
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
                                        {groupedCampaigns[releaseName].map(camp => renderCampaignCard(camp))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                            {(campaigns || []).map(camp => renderCampaignCard(camp))}
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
                        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                onClick={() => setValidationModal({ isOpen: false, campaign: null })}
                                className="absolute inset-0 bg-black/60 backdrop-blur-md"
                            />
                            <motion.div
                                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                                animate={{ opacity: 1, scale: 1, y: 0 }}
                                exit={{ opacity: 0, scale: 0.9, y: 20 }}
                                className="relative w-full max-w-2xl bg-[#0f172a] border border-white/10 rounded-[2.5rem] overflow-hidden shadow-2xl"
                            >
                                <div className="p-8 border-b border-white/5 flex justify-between items-center bg-gradient-to-r from-blue-600/10 to-transparent">
                                    <div>
                                        <h2 className="text-2xl font-black text-white tracking-widest uppercase">{t('testerDashboard.modal.title')}</h2>
                                        <div className="flex flex-wrap gap-4 mt-3">
                                            <div className="flex items-center gap-2 text-[10px] font-black text-slate-500 uppercase tracking-widest">
                                                <Layers className="w-3 h-3 text-blue-400" />
                                                {validationModal.campaign?.project_name}
                                            </div>
                                            <div className="flex items-center gap-2 text-[10px] font-black text-slate-500 uppercase tracking-widest">
                                                <Calendar className="w-3 h-3 text-blue-400" />
                                                {validationModal.campaign?.title}
                                            </div>
                                            <div className="flex items-center gap-2 text-[10px] font-black text-slate-500 uppercase tracking-widest">
                                                <User className="w-3 h-3 text-blue-400" />
                                                {t('testerDashboard.modal.manager')} {validationModal.campaign?.manager_name}
                                            </div>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => setValidationModal({ isOpen: false, campaign: null })}
                                        className="p-3 bg-white/5 hover:bg-white/10 rounded-full text-slate-400 hover:text-white transition-all border border-white/5"
                                    >
                                        <XCircle className="w-6 h-6" />
                                    </button>
                                </div>

                                <form onSubmit={handleSubmit} className="p-8 space-y-6">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">{t('testerDashboard.modal.testRefLabel')}</label>
                                            <input
                                                type="text"
                                                required
                                                value={testCaseForm.test_case_ref}
                                                onChange={e => setTestCaseForm({ ...testCaseForm, test_case_ref: e.target.value })}
                                                className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-white focus:ring-2 focus:ring-blue-500/50 outline-none transition-all font-bold"
                                                placeholder={t('testerDashboard.modal.testRefPlaceholder')}
                                            />
                                        </div>

                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">{t('testerDashboard.modal.proofLabel')}</label>
                                            <div className="flex items-center gap-3">
                                                <label className={`flex-1 cursor-pointer border-2 border-dashed rounded-2xl p-4 text-center transition-all ${testCaseForm.anomaly_file ? 'border-blue-500 bg-blue-500/10' : 'border-white/10 hover:bg-white/5'}`}>
                                                    <input
                                                        type="file"
                                                        accept="image/*, .pdf, .docx"
                                                        onChange={e => {
                                                            if (e.target.files && e.target.files[0]) {
                                                                setTestCaseForm({ ...testCaseForm, anomaly_file: e.target.files[0] });
                                                            }
                                                        }}
                                                        className="hidden"
                                                    />
                                                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest truncate block">
                                                        {testCaseForm.anomaly_file ? testCaseForm.anomaly_file.name : t('testerDashboard.modal.addCapture')}
                                                    </span>
                                                </label>
                                                {testCaseForm.anomaly_file && (
                                                    <button
                                                        type="button"
                                                        onClick={() => setTestCaseForm({ ...testCaseForm, anomaly_file: null })}
                                                        className="p-4 bg-rose-500/10 border border-rose-500/20 text-rose-500 rounded-2xl transition-all"
                                                    >
                                                        <XCircle className="w-5 h-5" />
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="space-y-3">
                                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">{t('testerDashboard.modal.statusLabel')}</label>
                                        <div className="grid grid-cols-2 gap-4">
                                            <button
                                                type="button"
                                                onClick={() => setTestCaseForm({ ...testCaseForm, status: 'PASSED' })}
                                                className={`p-6 rounded-3xl border-2 flex items-center justify-center gap-3 transition-all ${testCaseForm.status === 'PASSED' ? 'bg-emerald-500/10 border-emerald-500 text-emerald-400 shadow-lg shadow-emerald-500/10' : 'bg-white/5 border-white/5 text-slate-500 hover:border-white/10'}`}
                                            >
                                                <CheckCircle className="w-6 h-6" />
                                                <span className="text-xs font-black tracking-widest uppercase">{t('testerDashboard.modal.success')}</span>
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => setTestCaseForm({ ...testCaseForm, status: 'FAILED' })}
                                                className={`p-6 rounded-3xl border-2 flex items-center justify-center gap-3 transition-all ${testCaseForm.status === 'FAILED' ? 'bg-rose-500/10 border-rose-500 text-rose-400 shadow-lg shadow-rose-500/10' : 'bg-white/5 border-white/5 text-slate-500 hover:border-white/10'}`}
                                            >
                                                <AlertTriangle className="w-6 h-6" />
                                                <span className="text-xs font-black tracking-widest uppercase">{t('testerDashboard.modal.failure')}</span>
                                            </button>
                                        </div>
                                    </div>

                                    <AnimatePresence>
                                        {testCaseForm.status === 'FAILED' && (
                                            <motion.div
                                                initial={{ opacity: 0, height: 0, marginTop: 0 }}
                                                animate={{ opacity: 1, height: 'auto', marginTop: 24 }}
                                                exit={{ opacity: 0, height: 0, marginTop: 0 }}
                                                className="bg-rose-500/5 border border-rose-500/20 rounded-3xl p-6 space-y-6 overflow-hidden"
                                            >
                                                <div className="flex items-center gap-3 text-rose-500 animate-pulse">
                                                    <AlertTriangle className="w-5 h-5" />
                                                    <h3 className="text-xs font-black tracking-widest uppercase">{t('testerDashboard.modal.anomalyTitle')}</h3>
                                                </div>

                                                <div className="space-y-2">
                                                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">{t('testerDashboard.modal.anomalyNameLabel')}</label>
                                                    <input
                                                        type="text"
                                                        required
                                                        value={testCaseForm.anomaly_title}
                                                        onChange={e => setTestCaseForm({ ...testCaseForm, anomaly_title: e.target.value })}
                                                        className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-white focus:border-rose-500/50 outline-none transition-all font-bold"
                                                    />
                                                </div>

                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                                    <div className="space-y-2">
                                                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Impact</label>
                                                        <select
                                                            value={testCaseForm.anomaly_impact}
                                                            onChange={e => setTestCaseForm({ ...testCaseForm, anomaly_impact: e.target.value })}
                                                            className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-white focus:border-rose-500/50 outline-none transition-all font-bold appearance-none cursor-pointer"
                                                        >
                                                            <option value="BLOQUANTES" className="bg-slate-900">BLOQUANTES</option>
                                                            <option value="CRITIQUE" className="bg-slate-900">CRITIQUE</option>
                                                            <option value="MAJEUR" className="bg-slate-900">MAJEUR</option>
                                                            <option value="MINEURS" className="bg-slate-900">MINEURS</option>
                                                            <option value="SIMPLE" className="bg-slate-900">SIMPLE</option>
                                                            <option value="FONCTIONNALITE" className="bg-slate-900">FONCTIONNALITÉ</option>
                                                        </select>
                                                    </div>
                                                    <div className="space-y-2">
                                                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Priorité</label>
                                                        <select
                                                            value={testCaseForm.anomaly_priority}
                                                            onChange={e => setTestCaseForm({ ...testCaseForm, anomaly_priority: e.target.value })}
                                                            className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-white focus:border-rose-500/50 outline-none transition-all font-bold appearance-none cursor-pointer"
                                                        >
                                                            <option value="IMMEDIATE" className="bg-slate-900">IMMÉDIATE</option>
                                                            <option value="URGENTE" className="bg-slate-900">URGENTE</option>
                                                            <option value="ELEVEE" className="bg-slate-900">ÉLEVÉE</option>
                                                            <option value="NORMALE" className="bg-slate-900">NORMALE</option>
                                                            <option value="BASSE" className="bg-slate-900">BASSE</option>
                                                        </select>
                                                    </div>
                                                    <div className="space-y-2">
                                                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Visibilité</label>
                                                        <select
                                                            value={testCaseForm.anomaly_visibility}
                                                            onChange={e => setTestCaseForm({ ...testCaseForm, anomaly_visibility: e.target.value })}
                                                            className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-white focus:border-rose-500/50 outline-none transition-all font-bold appearance-none cursor-pointer"
                                                        >
                                                            <option value="PUBLIQUE" className="bg-slate-900">PUBLIQUE</option>
                                                            <option value="PRIVEE" className="bg-slate-900">PRIVÉE</option>
                                                        </select>
                                                    </div>
                                                    <div className="space-y-2">
                                                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">{t('testerDashboard.modal.anomalyDescLabel')}</label>
                                                        <textarea
                                                            required
                                                            value={testCaseForm.anomaly_description}
                                                            onChange={e => setTestCaseForm({ ...testCaseForm, anomaly_description: e.target.value })}
                                                            className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-white focus:border-rose-500/50 outline-none transition-all font-bold min-h-[100px]"
                                                        />
                                                    </div>
                                                </div>
                                            </motion.div>
                                        )}
                                    </AnimatePresence>

                                    <button
                                        type="submit"
                                        className="w-full py-5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-[2rem] font-black tracking-[0.2em] uppercase transition-all shadow-xl shadow-blue-900/40 active:scale-95 group flex items-center justify-center gap-3 mt-4"
                                    >
                                        <CheckCircle className="w-5 h-5 group-hover:scale-110 transition-transform" />
                                        {t('testerDashboard.modal.save')}
                                    </button>
                                </form>
                            </motion.div>
                        </div>
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
