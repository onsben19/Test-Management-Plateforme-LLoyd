import React, { useEffect, useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import PageLayout from '../../components/PageLayout';
import { useSidebar } from '../../context/SidebarContext';
import StatCard from '../../components/StatCard';
import DashboardWidget from '../../components/DashboardWidget';
import AIBriefCard from '../../components/AIBriefCard';
import {
    projectService,
    campaignService,
    anomalyService,
    aiService,
    businessProjectService
} from '../../services/api';
import {
    Layers,
    AlertTriangle,
    TrendingUp,
    PieChart as PieChartIcon,
    Activity,
    RefreshCw,
    Sparkles,
    LayoutDashboard,
    CheckCircle2,
    Target,
    FolderOpen,
    FileText,
    Award,
    X,
    ChevronRight,
    LayoutGrid,
    Briefcase,
    Calendar,
    ArrowRight,
    Pencil,
    Trash,
    Clock
} from 'lucide-react';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    PieChart, Pie, Cell, Legend
} from 'recharts';
import { motion, AnimatePresence } from 'framer-motion';
import DashboardTabs from './components/DashboardTabs';
import CampaignDrawer from './components/CampaignDrawer';
import CatchupPlanIA from '../../components/CatchupPlanIA';
import ManagerRealtimeDashboard from './components/ManagerRealtimeDashboard';
import HistoricalAnalyticsDashboard from './components/HistoricalAnalyticsDashboard';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
interface RawData {
    projects: any[];
    campaigns: any[];
    anomalies: any[];
}


// ---------------------------------------------------------------------------
// ManagerDashboard
// ---------------------------------------------------------------------------
const ManagerDashboard = () => {
    const { t } = useTranslation();
    useSidebar();

    const [loading, setLoading] = useState(true);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [activeTab, setActiveTab] = useState('overview');
    const [groupMode, setGroupMode] = useState<'none' | 'release' | 'project'>('release');
    const [selectedProjectId, setSelectedProjectId] = useState<string | 'all'>('all');
    const [selectedRelease, setSelectedRelease] = useState<string | 'all'>('all');
    const [selectedCampaign, setSelectedCampaign] = useState<any | null>(null);
    const [isDrawerOpen, setIsDrawerOpen] = useState(false);
    const [aiBrief, setAiBrief] = useState<string | undefined>();
    const [aiBriefTargetId, setAiBriefTargetId] = useState<string | undefined>();
    const [isCatchupPlanOpen, setIsCatchupPlanOpen] = useState(false);
    const [catchupCampaignId, setCatchupCampaignId] = useState<number | null>(null);
    const [realtimeCampaignId, setRealtimeCampaignId] = useState<number | null>(null);

    const [rawData, setRawData] = useState<RawData & { businessProjects: any[] }>({
        projects: [],
        campaigns: [],
        anomalies: [],
        businessProjects: []
    });

    // -------------------------------------------------------------------------
    // Data fetching
    // -------------------------------------------------------------------------
    const fetchData = async () => {
        setLoading(true);
        try {
            const [projectsRes, campaignsRes, anomaliesRes, businessProjectsRes] = await Promise.all([
                projectService.getProjects(),
                campaignService.getCampaigns(),
                anomalyService.getAnomalies(),
                businessProjectService.getBusinessProjects()
            ]);

            const projData: any[] = projectsRes.data.results ?? projectsRes.data;
            const campData: any[] = campaignsRes.data.results ?? campaignsRes.data;
            const anomData: any[] = anomaliesRes.data.results ?? anomaliesRes.data;
            const bProjData: any[] = businessProjectsRes.data.results ?? businessProjectsRes.data;

            setRawData({
                projects: projData,
                campaigns: campData,
                anomalies: anomData,
                businessProjects: bProjData
            });


            // Fetch dynamic AI brief
            const briefRes = await aiService.getDashboardBrief({
                active_projects: projData.length,
                total_campaigns: campData.length,
                open_anomalies: anomData.filter((a: any) => (a.statut || a.status) === 'OUVERTE').length,
                success_rate: Math.round((campData.reduce((s, c) => s + (c.passed_count || 0), 0) / (campData.reduce((s, c) => s + (c.nb_test_cases || 0), 0) || 1)) * 100),
            });
            setAiBrief(briefRes.data.brief);
            setAiBriefTargetId(briefRes.data.target_id);

            // Set default realtime campaign if not set
            if (!realtimeCampaignId && campData.length > 0) {
                setRealtimeCampaignId(campData[0].id);
            }
        } catch (err) {
            console.error('Manager dashboard fetch error', err);
        } finally {
            setLoading(false);
            setIsRefreshing(false);
        }
    };

    const handleViewAIBrief = () => {
        if (!aiBriefTargetId) return;

        const scrollToTarget = () => {
            const el = document.getElementById(aiBriefTargetId);
            if (el) {
                el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                el.classList.add('ring-2', 'ring-blue-500', 'ring-offset-4', 'ring-offset-slate-900', 'transition-all');
                setTimeout(() => el.classList.remove('ring-2', 'ring-blue-500', 'ring-offset-4', 'ring-offset-slate-900'), 3000);
            }
        };

        if (activeTab !== 'activity' && aiBriefTargetId === 'recent-activity') {
            setActiveTab('activity');
            setTimeout(scrollToTarget, 400);
        } else {
            scrollToTarget();
        }
    };

    useEffect(() => { fetchData(); }, []);

    // Reset release filter when project changes
    useEffect(() => { setSelectedRelease('all'); }, [selectedProjectId]);

    // -------------------------------------------------------------------------
    // Derived / filtered data
    // -------------------------------------------------------------------------
    const filteredData = useMemo(() => {
        const { projects, campaigns, anomalies } = rawData;

        // --- Project-level filter ---
        const filteredCamps = selectedProjectId === 'all'
            ? campaigns
            : campaigns.filter((c: any) => String(c.project_id ?? c.project) === selectedProjectId);

        const filteredAnoms = anomalies.filter((a: any) => {
            if (selectedProjectId === 'all') return true;
            // We don't have project_id on anomaly, we filter by matching campaign
            const campIds = filteredCamps.map((c: any) => c.id);
            return campIds.some((id: number) => a.campaign_id === id);
        });

        // --- Stats (computed from campaign fields directly) ---
        const totalTestCases = filteredCamps.reduce((s: number, c: any) => s + (c.nb_test_cases || 0), 0);
        const totalPassed = filteredCamps.reduce((s: number, c: any) => s + (c.passed_count || 0), 0);
        const successRate = totalTestCases > 0 ? Math.round((totalPassed / totalTestCases) * 100) : 0;
        const openAnomalies = filteredAnoms.filter((a: any) => (a.statut || a.status) === 'OUVERTE').length;

        // --- Weekly bar chart (campaigns created per day) ---
        const last7Days = Array.from({ length: 7 }, (_, i) => {
            const d = new Date();
            d.setDate(d.getDate() - (6 - i));
            return d.toISOString().split('T')[0];
        });

        const weeklyChart = last7Days.map(date => {
            const dayCamps = filteredCamps.filter((c: any) => {
                const created = (c.created_at || c.start_date || '').split('T')[0];
                return created === date;
            });
            const dayPassed = dayCamps.reduce((s: number, c: any) => s + (c.passed_count || 0), 0);
            const dayTotal = dayCamps.reduce((s: number, c: any) => s + (c.nb_test_cases || 0), 0);
            const dayFailed = dayTotal - dayPassed;
            return {
                name: new Date(date).toLocaleDateString('fr-FR', { weekday: 'short' }),
                passed: dayPassed,
                failed: dayFailed > 0 ? dayFailed : 0,
            };
        });

        // --- Anomaly distribution for pie chart ---
        const distribution = [
            { name: 'Critique / Bloquante', value: filteredAnoms.filter((a: any) => ['CRITIQUE', 'BLOQUANTES'].includes(a.impact)).length, color: '#f43f5e' },
            { name: 'Majeure / Mineure', value: filteredAnoms.filter((a: any) => ['MAJEUR', 'MINEURS'].includes(a.impact)).length, color: '#f59e0b' },
            { name: 'Autres (UX/Text)', value: filteredAnoms.filter((a: any) => ['COSMETIQUE', 'TEXTE', 'SIMPLE', 'FONCTIONNALITE'].includes(a.impact)).length, color: '#3b82f6' },
        ].filter(d => d.value > 0);

        // --- Release grouping ---
        const releaseNames: string[] = Array.from(
            new Set(filteredCamps.map((c: any) => {
                if (groupMode === 'project') return c.business_project_name || 'Global';
                return `${c.business_project_name || 'Global'} > ${c.project_name}`;
            }).filter(Boolean))
        ) as string[];

        const campaignsByRelease: Record<string, any[]> = {};
        releaseNames.forEach(r => {
            campaignsByRelease[r] = filteredCamps.filter((c: any) => {
                const key = groupMode === 'project' ? (c.business_project_name || 'Global') : `${c.business_project_name || 'Global'} > ${c.project_name}`;
                return key === r;
            });
        });
        const noReleaseCamps = filteredCamps.filter((c: any) => !c.project_name);
        if (noReleaseCamps.length > 0) campaignsByRelease['__no_release__'] = noReleaseCamps;

        // --- Recent activity from anomalies (most recent first) ---
        const recentActivity = [...filteredAnoms]
            .sort((a, b) => new Date(b.cree_le ?? b.date_signalement ?? 0).getTime()
                - new Date(a.cree_le ?? a.date_signalement ?? 0).getTime())
            .slice(0, 10);

        return {
            stats: {
                activeProjects: projects.length,
                totalCampaigns: filteredCamps.length,
                openAnomalies,
                successRate,
                totalTestCases,
                totalPassed,
            },
            weeklyChart,
            distribution: distribution.length > 0
                ? distribution
                : [{ name: 'Aucune', value: 1, color: '#94a3b8' }],
            releaseNames,
            campaignsByRelease,
            filteredCamps,
            recentActivity,
            groupMode
        };
    }, [rawData, selectedProjectId, groupMode]);

    // -------------------------------------------------------------------------
    // Tabs configuration
    // -------------------------------------------------------------------------

    const dashboardTabs = [
        { id: 'overview', label: t('managerDashboard.tabs.overview') || 'Vue d\'ensemble', icon: LayoutDashboard },
        { id: 'projects', label: t('managerDashboard.tabs.projects') || 'Projets', icon: Briefcase, badge: rawData.businessProjects.length },
        { id: 'campaigns', label: t('managerDashboard.tabs.campaigns') || 'Campagnes', icon: Layers, badge: filteredData.stats.totalCampaigns },

        { id: 'activity', label: t('managerDashboard.tabs.activity') || 'Activité', icon: Activity },
    ];

    // -------------------------------------------------------------------------
    // Helpers
    // -------------------------------------------------------------------------
    const openCampaignDrawer = (camp: any) => {
        setSelectedCampaign(camp);
        setIsDrawerOpen(true);
    };


    // -------------------------------------------------------------------------
    // Render helpers
    // -------------------------------------------------------------------------
    const CampaignCard = ({ camp }: { camp: any }) => {
        const total = camp.nb_test_cases || 0;
        const passed = camp.passed_count || 0;
        const failed = camp.failed_count ?? (total - passed);
        const rate = total > 0 ? Math.round((passed / total) * 100) : 0;

        const rateClass = rate >= 80
            ? 'bg-emerald-500/10 text-emerald-500'
            : rate >= 50
                ? 'bg-blue-500/10 text-blue-500'
                : total === 0
                    ? 'bg-slate-500/10 text-slate-400'
                    : 'bg-amber-500/10 text-amber-500';

        const barColor = rate >= 80 ? 'bg-emerald-500' : rate >= 50 ? 'bg-blue-500' : 'bg-amber-500';


        const downloadReport = async (e: React.MouseEvent, campId: number) => {
            e.stopPropagation();
            try {
                const res = await aiService.exportClosureReport(campId);
                const blob = new Blob([res.data], { type: 'application/pdf' });
                const url = window.URL.createObjectURL(blob);
                const link = document.createElement('a');
                link.href = url;
                link.setAttribute('download', `fiche_cloture_${campId}.pdf`);
                document.body.appendChild(link);
                link.click();
                link.parentNode?.removeChild(link);
            } catch (err) {
                console.error('Download error', err);
            }
        };

        return (
            <motion.div
                whileHover={{ y: -4, scale: 1.01 }}
                whileTap={{ scale: 0.99 }}
                onClick={() => openCampaignDrawer(camp)}
                className="group p-5 bg-white dark:bg-white/[0.03] border border-slate-200 dark:border-white/5 rounded-[2rem] hover:shadow-xl hover:shadow-blue-500/10 hover:border-blue-500/20 dark:hover:border-blue-500/20 transition-all cursor-pointer relative"
            >
                {/* PDF Shortcut */}
                <button
                    onClick={(e) => downloadReport(e, camp.id)}
                    className="absolute top-4 right-4 p-2 bg-white dark:bg-white/10 border border-slate-200 dark:border-white/10 rounded-xl text-slate-400 hover:text-emerald-500 hover:border-emerald-500/30 transition-all opacity-0 group-hover:opacity-100 z-10"
                    title="Télécharger la fiche de clôture"
                >
                    <FileText className="w-3.5 h-3.5" />
                </button>

                {/* Title row */}
                <div className="flex items-start justify-between mb-3 gap-2 pr-8">
                    <div className="flex-1 min-w-0">
                        <p className="font-black text-slate-900 dark:text-white truncate text-sm">{camp.title || camp.name}</p>
                        <div className="flex items-center gap-1.5 mt-0.5">
                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">{camp.project_name || '—'}</p>
                            {camp.release_type && (
                                <span className={`text-[8px] px-1.5 py-0.5 rounded-md font-black uppercase tracking-widest ${camp.release_type === 'PREPROD' ? 'bg-indigo-500/10 text-indigo-400' : 'bg-emerald-500/10 text-emerald-400'}`}>
                                    {camp.release_type}
                                </span>
                            )}
                        </div>
                    </div>
                    <span className={`shrink-0 text-[10px] px-2.5 py-1 rounded-full font-black uppercase tracking-tight ${rateClass}`}>
                        {total === 0 ? 'Vide' : `${rate}%`}
                    </span>
                </div>

                {/* Stats row */}
                <div className="flex items-center gap-3 text-[11px] font-bold text-slate-500 dark:text-slate-500 mb-3">
                    <span className="flex items-center gap-1 text-emerald-500 dark:text-emerald-400">
                        <CheckCircle2 className="w-3 h-3" /> {passed}
                    </span>
                    <span className="flex items-center gap-1 text-rose-500 dark:text-rose-400">
                        <AlertTriangle className="w-3 h-3" /> {failed}
                    </span>
                    <span className="ml-auto flex items-center gap-1">
                        <Target className="w-3 h-3" /> {total} tests
                    </span>
                </div>

                {/* Progress bar */}
                <div className="h-1.5 w-full bg-slate-100 dark:bg-white/5 rounded-full overflow-hidden">
                    <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${rate}%` }}
                        transition={{ duration: 0.8 }}
                        className={`h-full rounded-full ${barColor}`}
                    />
                </div>
            </motion.div>
        );
    };

    // -------------------------------------------------------------------------
    // JSX
    // -------------------------------------------------------------------------
    return (
        <PageLayout
            title={
                <div className="flex items-center gap-3">
                    <span>{t('Dashboard')}</span>
                    <span className="bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-blue-400 dark:to-indigo-400 bg-clip-text text-transparent italic">
                        Manager
                    </span>
                </div>
            }
            subtitle={t('managerDashboard.subtitle')}
            actions={
                <div className="flex items-center gap-3">
                    {/* Project filter */}
                    <div className="flex items-center gap-2 px-4 py-2.5 bg-white dark:bg-white/5 border border-slate-200 dark:border-white/5 rounded-2xl shadow-sm">
                        <FolderOpen className="w-4 h-4 text-slate-400 shrink-0" />
                        <select
                            value={selectedProjectId}
                            onChange={e => setSelectedProjectId(e.target.value)}
                            className="bg-transparent border-none text-sm font-bold text-slate-700 dark:text-slate-200 focus:ring-0 cursor-pointer pr-1"
                        >
                            <option value="all">{t('managerDashboard.projectFilter.all') || 'Tous les projets'}</option>
                            {rawData.projects.map((p: any) => (
                                <option key={p.id} value={String(p.id)}>{p.name || p.title}</option>
                            ))}
                        </select>
                    </div>

                    {/* Refresh */}
                    <button
                        onClick={() => { setIsRefreshing(true); fetchData(); }}
                        title="Rafraîchir"
                        className={`p-3 bg-white dark:bg-white/5 border border-slate-200 dark:border-white/5 rounded-2xl text-slate-500 dark:text-slate-400 hover:text-blue-600 dark:hover:text-white transition-all shadow-sm ${isRefreshing ? 'animate-spin' : ''}`}
                    >
                        <RefreshCw className="w-4 h-4" />
                    </button>
                </div>
            }
        >
            {/* AI Brief */}
            <AIBriefCard
                stats={{
                    totalUsers: 0,
                    activeProjects: filteredData.stats.activeProjects,
                    openAnomalies: filteredData.stats.openAnomalies,
                    successRate: filteredData.stats.successRate,
                }}
                loading={loading}
                customBrief={aiBrief}
                anchorId={aiBriefTargetId}
                onViewAnalysis={handleViewAIBrief}
            />

            {/* Tabs */}
            <DashboardTabs activeTab={activeTab} onChange={setActiveTab} tabs={dashboardTabs} />

            {/* Tab content */}
            <AnimatePresence mode="wait">
                <motion.div
                    key={activeTab}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    transition={{ duration: 0.18 }}
                >
                    {/* ================================================================
                        TAB 0 — PROJECTS
                    ================================================================ */}
                    {activeTab === 'projects' && (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 pb-10">
                            {rawData.businessProjects.map((project, idx) => (
                                <motion.div
                                    key={project.id}
                                    initial={{ opacity: 0, scale: 0.95 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    transition={{ delay: idx * 0.05 }}
                                    className="group relative bg-[#0f172a]/40 backdrop-blur-2xl border border-white/5 rounded-[2.5rem] p-9 hover:border-emerald-500/20 transition-all duration-500 shadow-2xl"
                                >
                                    <div className="flex items-start justify-between mb-10">
                                        <div className="w-20 h-20 rounded-3xl bg-[#112121] border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                                            <div className="p-3 bg-emerald-500/5 rounded-2xl border border-emerald-500/10">
                                                <Briefcase className="w-8 h-8" />
                                            </div>
                                        </div>
                                    </div>

                                    <div className="space-y-4 mb-10">
                                        <div className="flex items-center gap-2.5">
                                            <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]" />
                                            <span className="text-[11px] font-black text-emerald-500 uppercase tracking-widest">Actif</span>
                                        </div>
                                        <h3 className="text-3xl font-black text-white tracking-tight leading-none group-hover:text-emerald-400 transition-colors">{project.name}</h3>
                                        <p className="text-slate-500 text-sm font-medium leading-relaxed line-clamp-2 min-h-[3rem] opacity-70">{project.description || 'Description du projet métier'}</p>
                                    </div>

                                    <div className="h-px w-full bg-white/5 mb-10" />

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

                                    <button
                                        onClick={() => {
                                            setSelectedProjectId(String(project.id));
                                            setActiveTab('campaigns');
                                            setGroupMode('release');
                                        }}
                                        className="w-full flex items-center justify-between px-10 py-7 bg-[#112121] hover:bg-[#1a2f2b] border border-emerald-500/10 hover:border-emerald-500/30 text-[#10b981] rounded-[2rem] text-xs font-black uppercase tracking-[0.25em] transition-all group/btn shadow-xl"
                                    >
                                        Explorer les Releases
                                        <div className="w-10 h-10 bg-white/5 rounded-2xl flex items-center justify-center group-hover/btn:bg-emerald-500 group-hover/btn:text-white transition-all">
                                            <ArrowRight size={18} className="group-hover/btn:translate-x-0.5 transition-transform" />
                                        </div>
                                    </button>
                                </motion.div>
                            ))}
                        </div>
                    )}

                    {/* ================================================================
                        TAB 1 — OVERVIEW
                    ================================================================ */}
                    {activeTab === 'overview' && (
                        <div className="space-y-8">
                            {/* Stats row */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                                <StatCard
                                    title={t('managerDashboard.stats.successRate') || 'Taux de réussite'}
                                    value={`${filteredData.stats.successRate}%`}
                                    icon={TrendingUp}
                                    variant="green"
                                    description={`${filteredData.stats.totalPassed} / ${filteredData.stats.totalTestCases} tests`}
                                    isLoading={loading}
                                />
                                <StatCard
                                    title="Projets actifs"
                                    value={filteredData.stats.activeProjects}
                                    icon={Layers}
                                    variant="purple"
                                    description={`${filteredData.stats.totalCampaigns} campagne(s)`}
                                    isLoading={loading}
                                />
                                <StatCard
                                    title={t('managerDashboard.stats.openAnomalies') || 'Anomalies ouvertes'}
                                    value={filteredData.stats.openAnomalies}
                                    icon={AlertTriangle}
                                    variant="red"
                                    description="Non résolues"
                                    isLoading={loading}
                                />
                                <StatCard
                                    title="Tests total"
                                    value={filteredData.stats.totalTestCases}
                                    icon={Target}
                                    variant="blue"
                                    description={`${filteredData.stats.totalPassed} réussis`}
                                    isLoading={loading}
                                />
                            </div>

                            {/* Analytics Panel (Historical/Global) */}
                            <div className="mb-12">
                                <HistoricalAnalyticsDashboard projectId={selectedProjectId} />
                            </div>

                            {selectedProjectId === 'all' && (
                                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                                    {/* Weekly bar chart */}
                                    <div className="lg:col-span-8">
                                        <DashboardWidget
                                            id="weekly-activity"
                                            title="Activité hebdomadaire"
                                            subtitle="7 derniers jours — tests passés vs échoués"
                                            icon={Activity}
                                            isLoading={loading}
                                            onSettingsClick={() => { setIsRefreshing(true); fetchData(); }}
                                        >
                                            <div className="h-[300px] w-full">
                                                <ResponsiveContainer width="100%" height="100%">
                                                    <BarChart data={filteredData.weeklyChart} barSize={22} barCategoryGap="30%">
                                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" opacity={0.15} />
                                                        <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 12, fontWeight: 700 }} dy={8} />
                                                        <YAxis allowDecimals={false} axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 12, fontWeight: 700 }} />
                                                        <Tooltip
                                                            contentStyle={{ backgroundColor: '#0f172a', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '16px', color: '#fff', fontSize: 12, fontWeight: 700 }}
                                                            cursor={{ fill: 'rgba(255,255,255,0.03)' }}
                                                        />
                                                        <Bar dataKey="passed" name="Passés" fill="#10b981" radius={[6, 6, 0, 0]} />
                                                        <Bar dataKey="failed" name="Échoués" fill="#f43f5e" radius={[6, 6, 0, 0]} />
                                                        <Legend formatter={(v) => <span className="text-xs font-bold text-slate-400">{v}</span>} />
                                                    </BarChart>
                                                </ResponsiveContainer>
                                            </div>
                                        </DashboardWidget>
                                    </div>

                                    {/* Anomaly pie */}
                                    <div className="lg:col-span-4">
                                        <DashboardWidget
                                            id="manager-anomaly-dist"
                                            title="Anomalies"
                                            subtitle="Répartition par criticité"
                                            icon={PieChartIcon}
                                            isLoading={loading}
                                            onSettingsClick={() => { setIsRefreshing(true); fetchData(); }}
                                        >
                                            <div className="h-[260px] w-full">
                                                <ResponsiveContainer width="100%" height="100%">
                                                    <PieChart>
                                                        <Pie
                                                            data={filteredData.distribution}
                                                            cx="50%" cy="45%"
                                                            innerRadius={52} outerRadius={80}
                                                            paddingAngle={6} dataKey="value"
                                                        >
                                                            {filteredData.distribution.map((entry, i) => (
                                                                <Cell key={i} fill={entry.color} />
                                                            ))}
                                                        </Pie>
                                                        <Tooltip
                                                            contentStyle={{ backgroundColor: '#0f172a', border: 'none', borderRadius: '12px', color: '#fff', fontSize: 12 }}
                                                        />
                                                        <Legend iconSize={8} formatter={(v) => <span className="text-xs font-bold text-slate-400">{v}</span>} />
                                                    </PieChart>
                                                </ResponsiveContainer>
                                            </div>
                                        </DashboardWidget>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* ================================================================
                        TAB 2 — CAMPAGNES PAR RELEASE
                    ================================================================ */}
                    {activeTab === 'projects' && (
                        <div className="space-y-8">
                            {/* Group Mode Switcher */}
                            <div className="flex items-center gap-3 bg-white/5 p-1.5 rounded-2xl border border-white/10 w-fit">
                                <button
                                    onClick={() => setGroupMode('project')}
                                    className={`flex items-center gap-2 px-6 py-3 rounded-xl text-[10px] font-black tracking-widest uppercase transition-all ${groupMode === 'project' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20' : 'text-slate-400 hover:text-white'}`}
                                >
                                    <Target className="w-4 h-4" />
                                    PROJET
                                </button>
                                <button
                                    onClick={() => setGroupMode('release')}
                                    className={`flex items-center gap-2 px-6 py-3 rounded-xl text-[10px] font-black tracking-widest uppercase transition-all ${groupMode === 'release' ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20' : 'text-slate-400 hover:text-white'}`}
                                >
                                    <Layers className="w-4 h-4" />
                                    RELEASE
                                </button>
                                <button
                                    onClick={() => setGroupMode('none')}
                                    className={`flex items-center gap-2 px-6 py-3 rounded-xl text-[10px] font-black tracking-widest uppercase transition-all ${groupMode === 'none' ? 'bg-slate-700 text-white shadow-lg shadow-slate-600/20' : 'text-slate-400 hover:text-white'}`}
                                >
                                    <LayoutGrid className="w-4 h-4" />
                                    GRILLE
                                </button>
                            </div>

                            {/* Release filter pills */}
                            <div className="flex flex-wrap gap-2">
                                <button
                                    onClick={() => setSelectedRelease('all')}
                                    className={`px-4 py-2 rounded-2xl text-xs font-black transition-all border ${selectedRelease === 'all'
                                        ? 'bg-blue-600 text-white border-blue-600 shadow-lg shadow-blue-500/25'
                                        : 'bg-white dark:bg-white/5 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-white/10 hover:border-blue-400'}`}
                                >
                                    Toutes les releases
                                    <span className="ml-1.5 opacity-70">({filteredData.filteredCamps.length})</span>
                                </button>
                                {filteredData.releaseNames.map((rel: string) => (
                                    <button
                                        key={rel}
                                        onClick={() => setSelectedRelease(rel)}
                                        className={`px-4 py-2 rounded-2xl text-xs font-black transition-all border ${selectedRelease === rel
                                            ? 'bg-blue-600 text-white border-blue-600 shadow-lg shadow-blue-500/25'
                                            : 'bg-white dark:bg-white/5 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-white/10 hover:border-blue-400'}`}
                                    >
                                        {rel}
                                        <span className="ml-1.5 opacity-70">
                                            ({filteredData.campaignsByRelease[rel]?.length ?? 0})
                                        </span>
                                    </button>
                                ))}
                                {filteredData.campaignsByRelease['__no_release__'] && (
                                    <button
                                        onClick={() => setSelectedRelease('__no_release__')}
                                        className={`px-4 py-2 rounded-2xl text-xs font-black transition-all border ${selectedRelease === '__no_release__'
                                            ? 'bg-slate-700 text-white border-slate-600'
                                            : 'bg-white dark:bg-white/5 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-white/10'}`}
                                    >
                                        Sans release
                                    </button>
                                )}
                            </div>

                            {/* Campaign cards */}
                            {(() => {
                                const releasesToShow = selectedRelease === 'all'
                                    ? Object.keys(filteredData.campaignsByRelease)
                                    : [selectedRelease];

                                if (releasesToShow.length === 0 || filteredData.filteredCamps.length === 0) {
                                    return (
                                        <div className="py-24 bg-white dark:bg-white/[0.02] border border-dashed border-slate-200 dark:border-white/10 rounded-[3rem] flex flex-col items-center gap-4">
                                            <Layers className="w-12 h-12 text-slate-200 dark:text-white/10" />
                                            <p className="text-slate-400 font-bold">Aucune campagne disponible</p>
                                        </div>
                                    );
                                }

                                return releasesToShow.map(rel => {
                                    const camps = filteredData.campaignsByRelease[rel] ?? [];
                                    const label = rel === '__no_release__' ? 'Sans release' : rel;
                                    return (
                                        <div key={rel} className="space-y-4">
                                            {selectedRelease === 'all' && (
                                                <h3 className="flex items-center gap-3 text-[10px] font-black uppercase tracking-widest text-slate-400">
                                                    <span className="w-5 h-0.5 bg-blue-500 rounded-full" />
                                                    {groupMode === 'project' ? (
                                                        <span className="text-blue-500">{label}</span>
                                                    ) : (
                                                        <>
                                                            <span className="text-slate-600 dark:text-slate-500">{label.split(' > ')[0]}</span>
                                                            <ChevronRight className="w-3 h-3 text-slate-700" />
                                                            <span className="text-blue-500">{label.split(' > ')[1]}</span>
                                                        </>
                                                    )}
                                                    <span className="px-2 py-0.5 bg-blue-500/10 text-blue-400 rounded-full text-[10px]">
                                                        {camps.length}
                                                    </span>
                                                </h3>
                                            )}
                                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                                                {camps.map((camp: any) => (
                                                    <CampaignCard key={camp.id} camp={camp} />
                                                ))}
                                            </div>
                                        </div>
                                    );
                                });
                            })()}
                        </div>
                    )}


                    {/* ================================================================
                        TAB 4 — ACTIVITÉ (REAL-TIME)
                    ================================================================ */}
                    {activeTab === 'activity' && (
                        <div className="space-y-8">
                            {/* Campaign Selector for Real-time */}
                            {filteredData.filteredCamps.length > 1 && (
                                <div className="flex items-center gap-4 bg-white/5 border border-white/5 p-4 rounded-3xl max-w-md">
                                    <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest pl-2">Superviser :</span>
                                    <select
                                        value={realtimeCampaignId || ''}
                                        onChange={(e) => setRealtimeCampaignId(Number(e.target.value))}
                                        className="bg-transparent text-sm font-black text-white focus:outline-none flex-1 cursor-pointer"
                                    >
                                        {filteredData.filteredCamps.map((c: any) => (
                                            <option key={c.id} value={c.id} className="bg-slate-900 text-white">
                                                {c.title}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            )}

                            {realtimeCampaignId ? (
                                <ManagerRealtimeDashboard campaignId={realtimeCampaignId} />
                            ) : (
                                <div className="py-20 text-center">
                                    <Activity className="w-10 h-10 text-slate-200 dark:text-white/10 mx-auto mb-3" />
                                    <p className="text-slate-400 font-bold text-sm">Veuillez sélectionner une campagne pour voir le live</p>
                                </div>
                            )}
                        </div>
                    )}
                </motion.div>
            </AnimatePresence>

            {/* Campaign Drawer */}
            <CampaignDrawer
                campaign={selectedCampaign}
                isOpen={isDrawerOpen}
                onClose={() => { setIsDrawerOpen(false); setSelectedCampaign(null); }}
            />
            {/* AI Catchup Plan Modal */}
            <AnimatePresence>
                {isCatchupPlanOpen && catchupCampaignId && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[2000] flex items-center justify-center bg-black/80 backdrop-blur-md p-4 overflow-y-auto"
                    >
                        <motion.div
                            initial={{ scale: 0.9, y: 20 }}
                            animate={{ scale: 1, y: 0 }}
                            exit={{ scale: 0.9, y: 20 }}
                            className="relative w-full max-w-2xl my-8"
                        >
                            <button
                                onClick={() => setIsCatchupPlanOpen(false)}
                                className="absolute -top-12 right-0 text-white/50 hover:text-white transition-colors"
                            >
                                <X className="w-8 h-8" />
                            </button>
                            <CatchupPlanIA
                                campaignId={catchupCampaignId}
                                onClose={() => setIsCatchupPlanOpen(false)}
                            />
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </PageLayout>
    );
};

export default ManagerDashboard;
