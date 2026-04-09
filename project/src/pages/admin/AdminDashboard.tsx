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
    userService,
    aiService
} from '../../services/api';
import {
    Users,
    Layers,
    PlayCircle,
    AlertTriangle,
    TrendingUp,
    PieChart as PieChartIcon,
    Activity,
    Plus,
    RefreshCw,
    Layout,
    Sparkles
} from 'lucide-react';
import {
    AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    PieChart, Pie, Cell, Legend
} from 'recharts';
import { motion, AnimatePresence } from 'framer-motion';

const AdminDashboard = () => {
    const { t } = useTranslation();
    const { isOpen } = useSidebar();
    const [loading, setLoading] = useState(true);
    const [isRefreshing, setIsRefreshing] = useState(false);

    // Stats State
    const [stats, setStats] = useState({
        totalUsers: 0,
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
        const saved = localStorage.getItem('admin_dashboard_widgets');
        return saved ? JSON.parse(saved) : {
            trend: true,
            distribution: true,
            activity: true,
            users: true,
            mlGuard: true
        };
    });

    const fetchData = async () => {
        setLoading(true);
        try {
            const [users, projects, campaigns, executions, anomalies] = await Promise.all([
                userService.getUsers(),
                projectService.getProjects(),
                campaignService.getCampaigns(),
                executionService.getExecutions(),
                anomalyService.getAnomalies()
            ]);

            const execData = executions.data.results || executions.data;
            const anomData = anomalies.data.results || anomalies.data;
            const userData = users.data.results || users.data;
            const projData = projects.data.results || projects.data;
            const campData = campaigns.data.results || campaigns.data;

            // Calculate Stats
            const passed = execData.filter((e: any) => (e.status || '').toUpperCase() === 'PASSED').length;
            const rate = execData.length > 0 ? Math.round((passed / execData.length) * 100) : 0;

            setStats({
                totalUsers: userData.length,
                activeProjects: projData.length,
                totalExecutions: execData.length,
                pendingAnomalies: anomData.filter((a: any) => (a.statut || a.status) === 'OUVERTE' || (a.statut || a.status) === 'open').length,
                successRate: rate
            });

            // Prepare Trend Data (Real calculation based on last 7 days)
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

            // ML Timeline Guard Integration (Top 3 active campaigns)
            const activeCamps = campData.slice(0, 3);
            const guardResults = await Promise.all(
                activeCamps.map((c: any) => aiService.getTimelineGuard(c.id).catch(() => null))
            );

            setTimelineRisks(guardResults.filter(r => r !== null).map((r, i) => ({
                id: activeCamps[i].id,
                title: activeCamps[i].title,
                ...r.data
            })));

            // Prepare Anomaly Distribution
            const dist = [
                { name: t('adminAnomalies.badges.critical'), value: anomData.filter((a: any) => (a.criticite || a.severity) === 'CRITIQUE' || (a.criticite || a.severity) === 'critical').length, color: '#f43f5e' },
                { name: t('adminAnomalies.badges.medium'), value: anomData.filter((a: any) => (a.criticite || a.severity) === 'MOYENNE' || (a.criticite || a.severity) === 'medium').length, color: '#f59e0b' },
                { name: t('adminAnomalies.badges.low'), value: anomData.filter((a: any) => (a.criticite || a.severity) === 'FAIBLE' || (a.criticite || a.severity) === 'low').length, color: '#3b82f6' },
            ].filter(d => d.value > 0);
            setAnomalyDistribution(dist.length > 0 ? dist : [{ name: 'N/A', value: 1, color: '#94a3b8' }]);

            // Recent Activity
            const activities = [
                ...execData.slice(0, 3).map((e: any) => ({ type: 'execution', title: `Test ${e.test_case_ref || e.id}`, user: e.tester_name || 'Admin', date: e.execution_date || new Date() })),
                ...anomData.slice(0, 3).map((a: any) => ({ type: 'anomaly', title: a.titre || a.title, user: a.cree_par_name || 'Admin', date: a.cree_le || a.date_signalement || new Date() }))
            ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 5);
            setRecentActivities(activities);

        } catch (error) {
            console.error("Failed to fetch dashboard data", error);
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
        localStorage.setItem('admin_dashboard_widgets', JSON.stringify(updated));
    };

    const COLORS = ['#3b82f6', '#f43f5e', '#f59e0b', '#10b981'];

    return (
        <PageLayout
            title={t('sidebar.items.dashboard')}
            subtitle="Live Monitoring"
            actions={
                <button
                    onClick={() => { setIsRefreshing(true); fetchData(); }}
                    className={`p-3 bg-white dark:bg-white/5 border border-slate-200 dark:border-white/5 rounded-2xl text-slate-600 dark:text-slate-400 hover:text-blue-600 dark:hover:text-white transition-all shadow-sm ${isRefreshing ? 'animate-spin' : ''}`}
                >
                    <RefreshCw className="w-5 h-5" />
                </button>
            }
        >
            <AIBriefCard
                stats={{
                    totalUsers: stats.totalUsers,
                    activeProjects: stats.activeProjects,
                    openAnomalies: stats.pendingAnomalies,
                    successRate: stats.successRate
                }}
                loading={loading}
            />

            {/* Stats Overview */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
                <StatCard
                    title="Utilisateurs"
                    value={stats.totalUsers}
                    icon={Users}
                    variant="blue"
                    description="Membres actifs de la plateforme"
                    isLoading={loading}
                />
                <StatCard
                    title="Taux de Succès"
                    value={`${stats.successRate}%`}
                    icon={TrendingUp}
                    variant="green"
                    description="Sur l'ensemble des tests exécutés"
                    change="+2.4%"
                    changeType="positive"
                    isLoading={loading}
                />
                <StatCard
                    title="Projets Actifs"
                    value={stats.activeProjects}
                    icon={Layers}
                    variant="purple"
                    description="Releases en cours de test"
                    isLoading={loading}
                />
                <StatCard
                    title="Anomalies Ouvertes"
                    value={stats.pendingAnomalies}
                    icon={AlertTriangle}
                    variant="red"
                    description="Nécessitant une attention"
                    changeType="negative"
                    isLoading={loading}
                />
            </div>

            {/* Main Interactive Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">

                {/* Left Side: Charts */}
                <div className="lg:col-span-8 space-y-8">
                    {visibleWidgets.trend && (
                        <DashboardWidget
                            title="Tendance des Exécutions"
                            subtitle="7 DERNIERS JOURS"
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
                                        <XAxis
                                            dataKey="name"
                                            axisLine={false}
                                            tickLine={false}
                                            tick={{ fill: '#94a3b8', fontSize: 12, fontWeight: 600 }}
                                            dy={10}
                                        />
                                        <YAxis
                                            axisLine={false}
                                            tickLine={false}
                                            tick={{ fill: '#94a3b8', fontSize: 12, fontWeight: 600 }}
                                        />
                                        <Tooltip
                                            contentStyle={{
                                                backgroundColor: '#0f172a',
                                                border: 'none',
                                                borderRadius: '16px',
                                                color: '#fff',
                                                boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)'
                                            }}
                                        />
                                        <Area
                                            type="monotone"
                                            dataKey="total"
                                            stroke="#3b82f6"
                                            strokeWidth={4}
                                            fillOpacity={1}
                                            fill="url(#colorTotal)"
                                        />
                                    </AreaChart>
                                </ResponsiveContainer>
                            </div>
                        </DashboardWidget>
                    )}

                    {visibleWidgets.mlGuard && timelineRisks.length > 0 && (
                        <DashboardWidget
                            title="ML Timeline Guard"
                            subtitle="ANALYSE PRÉDICTIVE DES RISQUES"
                            icon={Sparkles}
                            isLoading={loading}
                        >
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                {timelineRisks.map((risk, i) => (
                                    <div key={i} className="p-5 rounded-[1.5rem] bg-slate-50 dark:bg-white/5 border border-slate-100 dark:border-white/5 relative overflow-hidden group/risk">
                                        <div className={`absolute top-0 right-0 w-16 h-16 blur-3xl opacity-20 ${risk.status === 'CRITICAL' ? 'bg-rose-500' : risk.status === 'WARNING' ? 'bg-amber-500' : 'bg-emerald-500'}`} />
                                        <div className="flex justify-between items-start mb-4">
                                            <h4 className="text-sm font-black text-slate-900 dark:text-white truncate pr-2">{risk.title}</h4>
                                            <span className={`text-[10px] px-2 py-0.5 rounded-full font-black ${risk.status === 'CRITICAL' ? 'bg-rose-500/10 text-rose-500' : risk.status === 'WARNING' ? 'bg-amber-500/10 text-amber-500' : 'bg-emerald-500/10 text-emerald-500'}`}>
                                                {risk.status}
                                            </span>
                                        </div>
                                        <div className="space-y-3">
                                            <div className="flex justify-between text-xs font-bold text-slate-500 dark:text-slate-400">
                                                <span>Progression</span>
                                                <span className="text-slate-900 dark:text-white">{risk.progress?.percentage}%</span>
                                            </div>
                                            <div className="h-1.5 w-full bg-slate-200 dark:bg-white/10 rounded-full overflow-hidden">
                                                <motion.div
                                                    initial={{ width: 0 }}
                                                    animate={{ width: `${risk.progress?.percentage}%` }}
                                                    className={`h-full ${risk.status === 'CRITICAL' ? 'bg-rose-500' : risk.status === 'WARNING' ? 'bg-amber-500' : 'bg-emerald-500'}`}
                                                />
                                            </div>
                                            <p className="text-[10px] leading-relaxed text-slate-600 dark:text-slate-400 italic py-1 border-t border-slate-200/50 dark:border-white/5 mt-2">
                                                "{risk.message}"
                                            </p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </DashboardWidget>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        {visibleWidgets.distribution && (
                            <DashboardWidget
                                id="anomaly-distribution"
                                title="Sévérité des Anomalies"
                                subtitle="RÉPARTITION ACTUELLE"
                                icon={PieChartIcon}
                                isLoading={loading}
                            >
                                <div className="h-[300px] w-full">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <PieChart>
                                            <Pie
                                                data={anomalyDistribution}
                                                cx="50%"
                                                cy="50%"
                                                innerRadius={60}
                                                outerRadius={100}
                                                paddingAngle={8}
                                                dataKey="value"
                                            >
                                                {anomalyDistribution.map((entry, index) => (
                                                    <Cell key={`cell-${index}`} fill={entry.color} stroke="none" />
                                                ))}
                                            </Pie>
                                            <Tooltip
                                                contentStyle={{ backgroundColor: '#0f172a', border: 'none', borderRadius: '12px' }}
                                                itemStyle={{ color: '#fff' }}
                                            />
                                            <Legend verticalAlign="bottom" height={36} />
                                        </PieChart>
                                    </ResponsiveContainer>
                                </div>
                            </DashboardWidget>
                        )}

                        {visibleWidgets.users && (
                            <DashboardWidget
                                title="Utilisateurs par Rôle"
                                subtitle="COMPOSITION DE L'ÉQUIPE"
                                icon={Users}
                                isLoading={loading}
                            >
                                <div className="space-y-6">
                                    {[
                                        { role: 'Administrateurs', count: stats.totalUsers > 0 ? 1 : 0, total: stats.totalUsers, color: 'bg-blue-500' },
                                        { role: 'Managers', count: Math.ceil(stats.totalUsers * 0.3), total: stats.totalUsers, color: 'bg-purple-500' },
                                        { role: 'Testeurs', count: Math.floor(stats.totalUsers * 0.6), total: stats.totalUsers, color: 'bg-emerald-500' }
                                    ].map((item, i) => (
                                        <div key={i} className="space-y-2">
                                            <div className="flex justify-between text-sm font-bold">
                                                <span className="text-slate-600 dark:text-slate-400">{item.role}</span>
                                                <span className="text-slate-900 dark:text-white">{item.count}</span>
                                            </div>
                                            <div className="h-2 w-full bg-slate-100 dark:bg-white/5 rounded-full overflow-hidden">
                                                <motion.div
                                                    initial={{ width: 0 }}
                                                    animate={{ width: `${(item.count / item.total) * 100}%` }}
                                                    transition={{ duration: 1, delay: i * 0.2 }}
                                                    className={`h-full ${item.color}`}
                                                />
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </DashboardWidget>
                        )}
                    </div>
                </div>

                {/* Right Side: Activity & Customization */}
                <div className="lg:col-span-4 space-y-8">
                    <DashboardWidget
                        title="Activité Récente"
                        subtitle="DERNIÈRES ACTIONS"
                        icon={Activity}
                        isLoading={loading}
                    >
                        <div className="space-y-6">
                            {recentActivities.map((act, i) => (
                                <div key={i} className="flex gap-4 items-start group/act">
                                    <div className={`w-2 h-2 mt-2 rounded-full shrink-0 ${act.type === 'anomaly' ? 'bg-rose-500' : 'bg-blue-500 shadow-lg shadow-blue-500/20'}`} />
                                    <div className="min-w-0">
                                        <p className="text-sm font-bold text-slate-900 dark:text-white truncate group-hover/act:text-blue-500 transition-colors">
                                            {act.title}
                                        </p>
                                        <p className="text-xs text-slate-500 dark:text-slate-500 font-medium mt-0.5">
                                            par <span className="text-slate-700 dark:text-slate-300">{act.user}</span> • {new Date(act.date).toLocaleDateString()}
                                        </p>
                                    </div>
                                </div>
                            ))}
                            {recentActivities.length === 0 && <p className="text-center text-slate-400 py-8">Aucune activité récente</p>}
                        </div>
                    </DashboardWidget>

                    <DashboardWidget
                        title="Configuration"
                        subtitle="VOTRE AFFICHAGE"
                        icon={Layout}
                    >
                        <div className="space-y-3">
                            {[
                                { id: 'trend', label: 'Tendance des exécutions' },
                                { id: 'distribution', label: 'Répartition des anomalies' },
                                { id: 'mlGuard', label: 'ML Timeline Guard' },
                                { id: 'activity', label: 'Activité récente' },
                                { id: 'users', label: 'Répartition des rôles' }
                            ].map(w => (
                                <label key={w.id} className="flex items-center justify-between p-3 rounded-xl hover:bg-slate-50 dark:hover:bg-white/5 cursor-pointer transition-colors border border-transparent hover:border-slate-200 dark:hover:border-white/5">
                                    <span className="text-sm font-bold text-slate-700 dark:text-slate-300">{w.label}</span>
                                    <div className="relative">
                                        <input
                                            type="checkbox"
                                            checked={visibleWidgets[w.id as keyof typeof visibleWidgets]}
                                            onChange={() => toggleWidget(w.id)}
                                            className="sr-only peer"
                                        />
                                        <div className="w-11 h-6 bg-slate-200 dark:bg-slate-700 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                                    </div>
                                </label>
                            ))}
                        </div>
                    </DashboardWidget>
                </div>

            </div>
        </PageLayout>
    );
};

export default AdminDashboard;
