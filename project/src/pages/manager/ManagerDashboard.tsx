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
    executionService,
    anomalyService,
    aiService
} from '../../services/api';
import {
    Layers,
    PlayCircle,
    AlertTriangle,
    TrendingUp,
    PieChart as PieChartIcon,
    Activity,
    RefreshCw,
    Sparkles
} from 'lucide-react';
import {
    AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    PieChart, Pie, Cell, Legend
} from 'recharts';
import { motion } from 'framer-motion';

const ManagerDashboard = () => {
    const { t } = useTranslation();
    const { isOpen } = useSidebar();
    const [loading, setLoading] = useState(true);
    const [isRefreshing, setIsRefreshing] = useState(false);

    // Stats State
    const [stats, setStats] = useState({
        activeProjects: 0,
        totalExecutions: 0,
        pendingAnomalies: 0,
        successRate: 0
    });

    // Data State
    const [executionTrend, setExecutionTrend] = useState<any[]>([]);
    const [anomalyDistribution, setAnomalyDistribution] = useState<any[]>([]);
    const [recentActivities, setRecentActivities] = useState<any[]>([]);
    const [timelineRisks, setTimelineRisks] = useState<any[]>([]);

    // Customization State
    const [visibleWidgets, setVisibleWidgets] = useState(() => {
        const saved = localStorage.getItem('manager_dashboard_widgets');
        return saved ? JSON.parse(saved) : {
            trend: true,
            distribution: true,
            activity: true,
            mlGuard: true
        };
    });

    const fetchData = async () => {
        setLoading(true);
        try {
            const [projects, campaigns, executions, anomalies] = await Promise.all([
                projectService.getProjects(),
                campaignService.getCampaigns(),
                executionService.getExecutions(),
                anomalyService.getAnomalies()
            ]);

            const execData = executions.data.results || executions.data;
            const anomData = anomalies.data.results || anomalies.data;
            const projData = projects.data.results || projects.data;
            const campData = campaigns.data.results || campaigns.data;

            // Calculate Stats
            const passed = execData.filter((e: any) => (e.status || '').toUpperCase() === 'PASSED').length;
            const rate = execData.length > 0 ? Math.round((passed / execData.length) * 100) : 0;

            setStats({
                activeProjects: projData.length,
                totalExecutions: execData.length,
                pendingAnomalies: anomData.filter((a: any) => (a.statut || a.status) === 'OUVERTE' || (a.statut || a.status) === 'open').length,
                successRate: rate
            });

            // Prepare Trend Data
            const last7Days = Array.from({ length: 7 }, (_, i) => {
                const d = new Date();
                d.setDate(d.getDate() - i);
                return d.toISOString().split('T')[0];
            }).reverse();

            const trend = last7Days.map(date => {
                const dayExecs = execData.filter((e: any) => (e.execution_date || '').startsWith(date));
                return {
                    name: new Date(date).toLocaleDateString(t('common.dateLocale') === 'fr-FR' ? 'fr-FR' : 'en-US', { weekday: 'short' }),
                    passed: dayExecs.filter((e: any) => (e.status || '').toUpperCase() === 'PASSED').length,
                    failed: dayExecs.filter((e: any) => (e.status || '').toUpperCase() === 'FAILED').length,
                    total: dayExecs.length
                };
            });
            setExecutionTrend(trend);

            // ML Timeline Guard
            const activeCamps = campData.slice(0, 3);
            const guardResults = await Promise.all(
                activeCamps.map((c: any) => aiService.getTimelineGuard(c.id).catch(() => null))
            );

            setTimelineRisks(guardResults.filter(r => r !== null).map((r, i) => ({
                id: activeCamps[i].id,
                title: activeCamps[i].title,
                ...r.data
            })));

            // Anomaly Distribution
            const dist = [
                { name: t('adminAnomalies.badges.critical'), value: anomData.filter((a: any) => (a.criticite || a.severity) === 'CRITIQUE' || (a.criticite || a.severity) === 'critical').length, color: '#f43f5e' },
                { name: t('adminAnomalies.badges.medium'), value: anomData.filter((a: any) => (a.criticite || a.severity) === 'MOYENNE' || (a.criticite || a.severity) === 'medium').length, color: '#f59e0b' },
                { name: t('adminAnomalies.badges.low'), value: anomData.filter((a: any) => (a.criticite || a.severity) === 'FAIBLE' || (a.criticite || a.severity) === 'low').length, color: '#3b82f6' },
            ].filter(d => d.value > 0);
            setAnomalyDistribution(dist.length > 0 ? dist : [{ name: 'N/A', value: 1, color: '#94a3b8' }]);

            // Recent Activity
            const activities = [
                ...execData.slice(0, 3).map((e: any) => ({ type: 'execution', title: `Test ${e.test_case_ref || e.id}`, user: e.tester_name || 'System', date: e.execution_date || new Date() })),
                ...anomData.slice(0, 3).map((a: any) => ({ type: 'anomaly', title: a.titre || a.title, user: a.cree_par_name || 'System', date: a.cree_le || a.date_signalement || new Date() }))
            ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 5);
            setRecentActivities(activities);

        } catch (error) {
            console.error("Failed to fetch manager dashboard data", error);
        } finally {
            setLoading(false);
            setIsRefreshing(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const toggleWidget = (widget: string) => {
        const updated = { ...visibleWidgets, [widget]: !visibleWidgets[widget] };
        setVisibleWidgets(updated);
        localStorage.setItem('manager_dashboard_widgets', JSON.stringify(updated));
    };

    return (
        <PageLayout
            title={
                <div className="flex items-center gap-3">
                    <span>{t('sidebar.items.dashboard')}</span>
                    <span className="bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-blue-500 dark:to-indigo-400 bg-clip-text text-transparent italic">Manager</span>
                </div>
            }
            subtitle={t('managerDashboard.subtitle')}
            actions={
                <button
                    onClick={() => { setIsRefreshing(true); fetchData(); }}
                    className={`p-3 bg-white dark:bg-white/5 border border-slate-200 dark:border-white/5 rounded-2xl text-slate-600 dark:text-slate-400 hover:text-blue-600 dark:hover:text-white transition-all shadow-sm ${isRefreshing ? 'animate-spin' : ''}`}
                >
                    <RefreshCw className="w-5 h-5" />
                </button>
            }
        >
            {/* Description over the content */}
            <div className="mb-8">
                <p className="text-slate-500 dark:text-slate-400 font-medium">
                    {t('managerDashboard.description')}
                </p>
            </div>

            <AIBriefCard
                stats={{
                    totalUsers: 0, // Placeholder
                    activeProjects: stats.activeProjects,
                    openAnomalies: stats.pendingAnomalies,
                    successRate: stats.successRate
                }}
                loading={loading}
                onViewAnalysis={() => {
                    const el = document.getElementById('manager-anomaly-dist');
                    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }}
            />

            {/* Stats Overview */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-10">
                <StatCard
                    title={t('managerDashboard.stats.successRate')}
                    value={`${stats.successRate}%`}
                    icon={TrendingUp}
                    variant="green"
                    description={t('managerDashboard.stats.successRateDesc')}
                    isLoading={loading}
                />
                <StatCard
                    title={t('managerDashboard.stats.activeProjects')}
                    value={stats.activeProjects}
                    icon={Layers}
                    variant="purple"
                    description={t('managerDashboard.stats.activeProjectsDesc')}
                    isLoading={loading}
                />
                <StatCard
                    title={t('managerDashboard.stats.openAnomalies')}
                    value={stats.pendingAnomalies}
                    icon={AlertTriangle}
                    variant="red"
                    description={t('managerDashboard.stats.openAnomaliesDesc')}
                    isLoading={loading}
                />
            </div>

            {/* Main Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                <div className="lg:col-span-8 space-y-8">
                    {visibleWidgets.trend && (
                        <DashboardWidget
                            title={t('managerDashboard.widgets.trend')}
                            subtitle={t('managerDashboard.widgets.trendSubtitle') || '7 DERNIERS JOURS'}
                            icon={Activity}
                            isLoading={loading}
                        >
                            <div className="h-[350px] w-full">
                                <ResponsiveContainer width="100%" height="100%">
                                    <AreaChart data={executionTrend}>
                                        <defs>
                                            <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                                                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                                            </linearGradient>
                                        </defs>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#cbd5e1" opacity={0.2} />
                                        <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 12, fontWeight: 600 }} dy={10} />
                                        <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 12, fontWeight: 600 }} />
                                        <Tooltip contentStyle={{ backgroundColor: '#0f172a', border: 'none', borderRadius: '16px', color: '#fff' }} />
                                        <Area type="monotone" dataKey="passed" stroke="#10b981" strokeWidth={4} fillOpacity={1} fill="url(#colorTotal)" />
                                    </AreaChart>
                                </ResponsiveContainer>
                            </div>
                        </DashboardWidget>
                    )}

                    {visibleWidgets.mlGuard && (
                        <DashboardWidget
                            title={t('managerDashboard.widgets.mlGuard')}
                            subtitle={t('managerDashboard.widgets.mlGuardSubtitle')}
                            icon={Sparkles}
                            isLoading={loading}
                        >
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {timelineRisks.map((risk, i) => (
                                    <div key={i} className="p-5 rounded-3xl bg-slate-50 dark:bg-white/5 border border-slate-100 dark:border-white/5">
                                        <div className="flex justify-between items-start mb-4">
                                            <h4 className="text-sm font-bold text-slate-900 dark:text-white truncate">{risk.title}</h4>
                                            <span className={`text-[10px] px-2 py-0.5 rounded-full font-black ${risk.status === 'CRITICAL' ? 'bg-rose-500/10 text-rose-500' : 'bg-amber-500/10 text-amber-500'}`}>
                                                {risk.status}
                                            </span>
                                        </div>
                                        <p className="text-[11px] text-slate-600 dark:text-slate-400 mb-4">{risk.message}</p>
                                        <div className="h-1.5 w-full bg-slate-200 dark:bg-white/10 rounded-full overflow-hidden">
                                            <motion.div initial={{ width: 0 }} animate={{ width: `${risk.progress?.percentage}%` }} className="h-full bg-blue-500" />
                                        </div>
                                    </div>
                                ))}
                                {timelineRisks.length === 0 && <p className="text-center text-slate-400 py-8 col-span-2">{t('managerDashboard.widgets.mlGuardEmpty')}</p>}
                            </div>
                        </DashboardWidget>
                    )}
                </div>

                <div className="lg:col-span-4 space-y-8">
                    {visibleWidgets.distribution && (
                        <DashboardWidget
                            id="manager-anomaly-dist"
                            title={t('adminAnomalies.title')}
                            subtitle={t('managerDashboard.widgets.distributionSubtitle')}
                            icon={PieChartIcon}
                            isLoading={loading}
                        >
                            <div className="h-[250px] w-full">
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie data={anomalyDistribution} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={8} dataKey="value">
                                            {anomalyDistribution.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} />)}
                                        </Pie>
                                        <Tooltip />
                                    </PieChart>
                                </ResponsiveContainer>
                            </div>
                        </DashboardWidget>
                    )}

                    {visibleWidgets.activity && (
                        <DashboardWidget id="recent-activity" title={t('managerDashboard.widgets.activity')} subtitle={t('managerDashboard.widgets.activitySubtitle')} icon={Activity} isLoading={loading}>
                            <div className="space-y-6">
                                {recentActivities.map((act, i) => (
                                    <div key={i} className="flex gap-4 items-start">
                                        <div className={`w-2 h-2 mt-2 rounded-full shrink-0 ${act.type === 'anomaly' ? 'bg-rose-500' : 'bg-blue-500'}`} />
                                        <div className="min-w-0">
                                            <p className="text-sm font-bold text-slate-900 dark:text-white truncate">{act.title}</p>
                                            <p className="text-[10px] text-slate-500">Par {act.user} • {new Date(act.date).toLocaleDateString()}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </DashboardWidget>
                    )}
                </div>
            </div>
        </PageLayout>
    );
};

export default ManagerDashboard;
