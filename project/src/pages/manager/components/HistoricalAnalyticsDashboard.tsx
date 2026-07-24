import React, { useState, useEffect } from 'react';
import {
    BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
    Cell, ScatterChart, Scatter, ZAxis, AreaChart, Area,
    ComposedChart, Line, Legend
} from 'recharts';
import {
    TrendingUp, Shield, AlertCircle, Download, Layout, Activity,
    TrendingDown, Minus, Crown, Medal, UserCheck, ShieldAlert,
    BrainCircuit, MoreVertical, AtSign, Clock, Target
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { analyticsService } from '../../../services/api';
import { toast } from 'react-toastify';
import { useTranslation } from 'react-i18next';
import Pagination from '../../../components/Pagination';

const QUALITY_PAGE_SIZE = 10;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ReleaseMetrics {
    release_id: number;
    version: string;
    pass_rate: number;
    total_tests: number;
    avg_velocity: number;
    anomaly_count: number;
    duration_days: number;
    completed_at: string;
}

interface TesterPerformance {
    tester: { id: number; name: string; initials: string };
    releases: { version: string; pass_rate: number; velocity: number }[];
    trend: 'improving' | 'stable' | 'declining';
    latest_pass_rate: number;
    delta_vs_first: number;
    ml_score: number;
    ml_label: string;
    ml_metrics: any;
}

interface ModuleHealth {
    module_name: string;
    tc_range: string;
    fail_rates: number[];
    avg_fail_rate: number;
    status: 'critical' | 'warning' | 'healthy';
    releases_affected: number;
}

// ---------------------------------------------------------------------------
// UI Components
// ---------------------------------------------------------------------------

const SparkBars = ({ data, color }: { data: number[], color: string }) => {
    // Generate bars up to 5
    const displayData = data.slice(-5);
    const maxVal = Math.max(...displayData, 1);

    return (
        <div className="flex items-end gap-1 h-8">
            {displayData.map((val, i) => (
                <motion.div
                    key={i}
                    initial={{ height: 0 }}
                    animate={{ height: `${(val / maxVal) * 100}%` }}
                    className={`w-1.5 rounded-full ${color}`}
                />
            ))}
        </div>
    );
};

const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
        return (
            <div className="bg-white/90 dark:bg-[#0f172a]/90 border border-slate-200 dark:border-white/10 p-3 rounded-xl shadow-2xl backdrop-blur-xl">
                <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">{label}</p>
                <p className="text-xs font-black text-slate-900 dark:text-white">{payload[0].value}%</p>
            </div>
        );
    }
    return null;
};

interface QualitySummary {
    stable_percent: number;
    stable_releases: number;
    trend_delta: number | null;
}

// ---------------------------------------------------------------------------
// Main Component
const HistoricalAnalyticsDashboard = ({ projectId }: { projectId: string }) => {
    const { t } = useTranslation();
    const [activeTab, setActiveTab] = useState<'quality' | 'velocity'>('quality');
    const [qualityViewMode, setQualityViewMode] = useState<'table' | 'chart'>('table');
    const [loading, setLoading] = useState(true);
    const [releasesLoading, setReleasesLoading] = useState(false);
    const [releaseData, setReleaseData] = useState<ReleaseMetrics[]>([]);
    const [qualityPage, setQualityPage] = useState(1);
    const [qualityTotal, setQualityTotal] = useState(0);
    const [qualitySummary, setQualitySummary] = useState<QualitySummary>({
        stable_percent: 0,
        stable_releases: 0,
        trend_delta: null,
    });
    const [testerData, setTesterData] = useState<TesterPerformance[]>([]);
    const [moduleData, setModuleData] = useState<ModuleHealth[]>([]);

    const pid = projectId === 'all' ? 'all' : projectId;

    useEffect(() => {
        setQualityPage(1);
    }, [projectId]);

    useEffect(() => {
        const fetchStaticData = async () => {
            try {
                setLoading(true);
                const [testers, modules] = await Promise.all([
                    analyticsService.getHistoricalTesters(pid),
                    analyticsService.getHistoricalModules(pid),
                ]);
                setTesterData(testers.data);
                setModuleData(modules.data);
            } catch (err) {
                console.error('Failed to fetch historical analytics', err);
                toast.error('Erreur de chargement des données');
            } finally {
                setLoading(false);
            }
        };
        fetchStaticData();
    }, [pid]);

    useEffect(() => {
        const fetchReleases = async () => {
            try {
                setReleasesLoading(true);
                const releases = await analyticsService.getHistoricalReleases(pid, {
                    page: qualityPage,
                    page_size: QUALITY_PAGE_SIZE,
                });
                const payload = releases.data;
                setReleaseData(payload.results ?? []);
                setQualityTotal(payload.count ?? 0);
                setQualitySummary(payload.summary ?? {
                    stable_percent: 0,
                    stable_releases: 0,
                    trend_delta: null,
                });
            } catch (err) {
                console.error('Failed to fetch release quality data', err);
                toast.error('Erreur de chargement du comparatif releases');
            } finally {
                setReleasesLoading(false);
            }
        };
        fetchReleases();
    }, [pid, qualityPage]);

    const readinessScore = qualitySummary.stable_percent;
    const trendValue = qualitySummary.trend_delta;
    const isQualityLoading = loading || releasesLoading;







    
    const tdClass = "p-4 text-sm text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-[#0b0e14]/60 group-hover:bg-slate-100 dark:group-hover:bg-white/[0.06] transition-colors first:rounded-l-2xl last:rounded-r-2xl border-t border-b first:border-l last:border-r border-slate-200 dark:border-white/[0.03] group-hover:border-slate-300 dark:group-hover:border-white/10";

    if (loading && testerData.length === 0 && releaseData.length === 0) {
        return <div className="p-10 text-slate-500 font-bold animate-pulse">Chargement des analytics...</div>;
    }

    return (
        <div className="glass-panel rounded-[3rem] p-10 shadow-2xl space-y-12 max-w-[900px] mx-auto overflow-hidden">
            {/* Header section as in mockup */}
            <div className="flex items-center justify-between">
                <div className="space-y-1">
                    <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                        {projectId === 'all' ? t('historicalAnalytics.titleAll') : t('historicalAnalytics.title')}
                    </h2>
                    <p className="text-sm font-bold text-slate-500">
                        {projectId === 'all'
                            ? t('historicalAnalytics.subtitleAll')
                            : t('historicalAnalytics.subtitle', { count: qualityTotal })}
                    </p>
                </div>
                <div className="flex items-center gap-2 px-4 py-2 bg-blue-500/10 rounded-xl border border-blue-500/20 text-blue-600 dark:text-blue-400">
                    <Activity className="w-4 h-4" />
                    <span className="text-[10px] font-black uppercase tracking-widest">{t('historicalAnalytics.liveAggregation')}</span>
                </div>
            </div>

            {/* Custom Pilled Tabs */}
            <div className="flex bg-slate-100 dark:bg-[#161e31] p-1.5 rounded-[1.5rem] w-full max-w-md mx-auto border border-slate-200 dark:border-white/5">
                {[
                    { id: 'quality', label: t('historicalAnalytics.tabs.quality') },
                    { id: 'velocity', label: t('historicalAnalytics.tabs.velocity') }
                ].map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id as any)}
                        className={`flex-1 py-3 px-4 rounded-[1.2rem] text-[11px] font-black uppercase tracking-widest transition-all ${activeTab === tab.id
                            ? 'bg-blue-600/20 text-blue-400 shadow-inner border border-blue-500/20'
                            : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                            }`}
                    >
                        {tab.label}
                    </button>
                ))}
            </div>

            <AnimatePresence mode="wait">
                {activeTab === 'quality' && (
                    <motion.div
                        key="quality"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        className="bg-slate-50/50 dark:bg-white/[0.02] border border-slate-200 dark:border-white/5 rounded-[2.5rem] p-8 space-y-10"
                    >
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                            <div className="flex items-center gap-3 text-slate-400">
                                <TrendingUp size={16} />
                                <h3 className="text-[10px] font-black uppercase tracking-[0.2em]">{t('historicalAnalytics.qualityTab.title')}</h3>
                            </div>
                            <div className="flex items-center bg-slate-100 dark:bg-white/5 p-1 rounded-xl">
                                <button 
                                    onClick={() => setQualityViewMode('table')}
                                    className={`px-4 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all flex items-center gap-2 ${qualityViewMode === 'table' ? 'bg-white dark:bg-slate-800 text-blue-500 shadow-sm' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-700 dark:text-slate-300'}`}
                                >
                                    <Layout size={12} /> {t('historicalAnalytics.qualityTab.table')}
                                </button>
                                <button 
                                    onClick={() => setQualityViewMode('chart')}
                                    className={`px-4 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all flex items-center gap-2 ${qualityViewMode === 'chart' ? 'bg-white dark:bg-slate-800 text-blue-500 shadow-sm' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-700 dark:text-slate-300'}`}
                                >
                                    <Activity size={12} /> {t('historicalAnalytics.qualityTab.chart')}
                                </button>
                            </div>
                        </div>

                        {qualityViewMode === 'table' ? (
                            <>
                            <div className="overflow-x-auto rounded-[1.5rem] border border-slate-200 dark:border-white/10 bg-white/50 dark:bg-white/[0.02] max-h-[480px] overflow-y-auto [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-slate-300 dark:[&::-webkit-scrollbar-thumb]:bg-white/10">
                            <table className="w-full text-left border-separate border-spacing-y-3">
                                <thead>
                                    <tr className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                                        <th className="px-4 py-2">{t('historicalAnalytics.qualityTab.release')}</th>
                                        <th className="px-4 py-2">{t('historicalAnalytics.qualityTab.successRate')}</th>
                                        <th className="px-4 py-2">{t('historicalAnalytics.qualityTab.anomalies')}</th>
                                        <th className="px-4 py-2 text-right">{t('historicalAnalytics.qualityTab.status')}</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {isQualityLoading ? (
                                        <tr>
                                            <td colSpan={4} className="p-8 text-center text-slate-500 font-medium text-xs animate-pulse">
                                                Chargement des releases…
                                            </td>
                                        </tr>
                                    ) : releaseData.length === 0 ? (
                                        <tr>
                                            <td colSpan={4} className="p-8 text-center text-slate-500 font-medium text-xs">
                                                {t('historicalAnalytics.qualityTab.empty')}
                                            </td>
                                        </tr>
                                    ) : [...releaseData].reverse().map((rel, idx) => {
                                        const isHigh = rel.pass_rate >= 80;
                                        const isMid = rel.pass_rate >= 60;
                                        
                                        return (
                                            <tr key={rel.release_id ?? idx} className="group transition-all duration-300 cursor-default">
                                                <td className={`font-black text-slate-900 dark:text-white ${tdClass}`}>{rel.version}</td>
                                                <td className={tdClass}>
                                                    <div className="flex items-center gap-3">
                                                        <span className={`font-black w-10 ${isHigh ? 'text-emerald-500 dark:text-emerald-400' : isMid ? 'text-amber-500 dark:text-amber-400' : 'text-rose-500 dark:text-rose-400'}`}>
                                                            {rel.pass_rate}%
                                                        </span>
                                                        <div className="w-24 h-1.5 bg-slate-200 dark:bg-white/10 rounded-full overflow-hidden">
                                                            <div 
                                                                className={`h-full rounded-full ${isHigh ? 'bg-emerald-500' : isMid ? 'bg-amber-500' : 'bg-rose-500'}`} 
                                                                style={{ width: `${rel.pass_rate}%` }}
                                                            />
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className={`font-medium flex items-center gap-2 ${tdClass}`}>
                                                    <Activity size={14} className="opacity-50" />
                                                    {rel.anomaly_count} <span className="opacity-50 text-xs">{rel.anomaly_count !== 1 ? t('historicalAnalytics.qualityTab.reportedPlural') : t('historicalAnalytics.qualityTab.reported')}</span>
                                                </td>
                                                <td className={`text-right ${tdClass}`}>
                                                    <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border ${
                                                        isHigh 
                                                            ? 'bg-emerald-50 text-emerald-600 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20' 
                                                            : isMid 
                                                                ? 'bg-amber-50 text-amber-600 border-amber-200 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/20' 
                                                                : 'bg-rose-50 text-rose-600 border-rose-200 dark:bg-rose-500/10 dark:text-rose-400 dark:border-rose-500/20'
                                                    }`}>
                                                        {isHigh ? t('historicalAnalytics.qualityTab.stable') : isMid ? t('historicalAnalytics.qualityTab.atRisk') : t('historicalAnalytics.qualityTab.critical')}
                                                    </span>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                            </div>
                            <Pagination
                                currentPage={qualityPage}
                                totalItems={qualityTotal}
                                pageSize={QUALITY_PAGE_SIZE}
                                onPageChange={setQualityPage}
                                loading={releasesLoading}
                            />
                            </>
                        ) : (
                            <div className="h-[280px] w-full pt-4 bg-slate-50 dark:bg-white/[0.01] border border-slate-200 dark:border-white/5 rounded-[2rem] p-4">
                                {isQualityLoading ? (
                                    <div className="flex items-center justify-center w-full h-full text-slate-500 font-medium text-xs animate-pulse">
                                        Chargement du graphique…
                                    </div>
                                ) : releaseData.length === 0 ? (
                                    <div className="flex items-center justify-center w-full h-full text-slate-500 font-medium text-xs">
                                        Aucune donnée graphique disponible
                                    </div>
                                ) : (
                                <ResponsiveContainer width="100%" height="100%">
                                    <ComposedChart data={releaseData}>
                                        <XAxis
                                            dataKey="version"
                                            fontSize={9}
                                            fontWeight="black"
                                            axisLine={false}
                                            tickLine={false}
                                            stroke="#475569"
                                            interval={Math.floor(releaseData.length / 8) || 0}
                                            height={30}
                                            tick={{ fill: '#64748b' }}
                                            tickFormatter={(val) => val.length > 15 ? val.substring(0, 15) + '...' : val}
                                        />
                                        <YAxis yAxisId="left" hide domain={[0, 100]} />
                                        <YAxis yAxisId="right" orientation="right" hide />
                                        <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.02)' }} />
                                        <Legend wrapperStyle={{ fontSize: '10px', fontWeight: 'bold' }} />
                                        <Bar yAxisId="right" name="Anomalies Signalées" dataKey="anomaly_count" fill="#ef4444" radius={[4, 4, 0, 0]} maxBarSize={40} opacity={0.8} />
                                        <Line yAxisId="left" name="Taux de Succès (%)" type="monotone" dataKey="pass_rate" stroke="#3b82f6" strokeWidth={3} dot={{ r: 4, fill: '#3b82f6', strokeWidth: 2 }} activeDot={{ r: 6 }} />
                                    </ComposedChart>
                                </ResponsiveContainer>
                                )}
                            </div>
                        )}

                        {qualityViewMode === 'chart' && qualityTotal > QUALITY_PAGE_SIZE && (
                            <Pagination
                                currentPage={qualityPage}
                                totalItems={qualityTotal}
                                pageSize={QUALITY_PAGE_SIZE}
                                onPageChange={setQualityPage}
                                loading={releasesLoading}
                            />
                        )}

                        <div className="flex items-center justify-between text-[10px] font-black p-4 bg-slate-100 dark:bg-white/5 rounded-2xl border border-slate-200 dark:border-white/5">
                            <div className="flex items-center gap-4">
                                <span className="text-slate-500 uppercase tracking-widest flex items-center gap-2">
                                    <Target size={12} className="text-blue-500" />
                                    Releases stables (≥80%) : <span className="text-slate-900 dark:text-white">{readinessScore}%</span>
                                </span>
                                <div className="w-px h-4 bg-slate-200 dark:bg-white/10" />
                                <span className="text-slate-500 uppercase tracking-widest">
                                    Total : <span className="text-slate-900 dark:text-white">{qualityTotal} Releases</span>
                                </span>
                            </div>
                            {trendValue !== null ? (
                                <span className={`uppercase tracking-widest flex items-center gap-2 px-3 py-1 rounded-full border text-[10px] font-black ${trendValue >= 0 ? 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20' : 'text-rose-400 bg-rose-500/10 border-rose-500/20'}`}>
                                    <TrendingUp size={12} />
                                    Tendance : {trendValue >= 0 ? '+' : ''}{trendValue}% / release
                                </span>
                            ) : (
                                <span className="text-slate-500 uppercase tracking-widest text-[10px] font-black">— données insuffisantes</span>
                            )}
                        </div>
                    </motion.div>
                )}

                {activeTab === 'velocity' && (
                    <motion.div
                        key="velocity"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        className="bg-slate-50/50 dark:bg-white/[0.02] border border-slate-200 dark:border-white/5 rounded-[2.5rem] p-8 space-y-6"
                    >
                        <div className="flex items-center gap-3 text-slate-400 mb-4">
                            <Activity size={16} />
                            <h3 className="text-[10px] font-black uppercase tracking-[0.2em]">{t('historicalAnalytics.velocityTab.title', { count: qualityTotal })}</h3>
                        </div>

                        <div className="divide-y divide-white/5">
                            {testerData.length ? [...testerData].sort((a, b) => b.ml_score - a.ml_score).map((tester, i) => {
                                const latestVel = tester.releases.length > 0 ? tester.releases[tester.releases.length - 1].velocity : 0;
                                const firstVel = tester.releases.length > 0 ? tester.releases[0].velocity : 0;
                                const deltaVel = latestVel - firstVel;
                                // Plafonné à ±100% pour un affichage lisible
                                const rawPercent = firstVel > 0.1 ? (deltaVel / firstVel) * 100 : 0;
                                const deltaVelPercent = Math.max(-100, Math.min(100, rawPercent));

                                return (
                                <div key={i} className="py-6 flex items-center justify-between group cursor-default">
                                    <div className="flex items-center gap-6">
                                        <div className="w-10 h-10 rounded-xl flex items-center justify-center text-[11px] font-black bg-blue-500/20 text-blue-400 border border-blue-500/30">
                                            {tester.tester.initials}
                                        </div>
                                        <h4 className="text-base font-black text-slate-900 dark:text-white group-hover:translate-x-1 transition-transform">
                                            {tester.tester.name}
                                        </h4>
                                    </div>
                                    <div className="flex items-center gap-10">
                                        <div className="text-right">
                                            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Activité</p>
                                            <SparkBars
                                                data={tester.releases.map(r => r.velocity)}
                                                color={deltaVel > 0 ? 'bg-emerald-500/80' : deltaVel < 0 ? 'bg-orange-500/80' : 'bg-blue-500/80'}
                                            />
                                        </div>
                                        <div className="text-right w-20">
                                            <p className="text-lg font-black text-slate-900 dark:text-white">
                                                {Number(latestVel).toFixed(1)} <span className="text-[10px]">/j</span>
                                            </p>
                                            <span className={`text-[10px] font-black uppercase tracking-widest ${deltaVel > 0 ? 'text-emerald-500' : deltaVel < 0 ? 'text-rose-500' : 'text-slate-500'}`}>
                                                {deltaVelPercent === 0 ? '—' : `${deltaVel > 0 ? '↑' : '↓'} ${Math.abs(Number(deltaVelPercent.toFixed(1)))}${Math.abs(rawPercent) >= 100 ? '%+' : '%'}`}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            )}) : (
                                <div className="p-20 text-center space-y-4">
                                    <Activity className="w-12 h-12 text-slate-700 mx-auto" />
                                    <p className="text-slate-500 font-bold">Données de performance en attente</p>
                                </div>
                            )}
                        </div>
                    </motion.div>
                )}


            </AnimatePresence>
        </div>
    );
};

export default HistoricalAnalyticsDashboard;
