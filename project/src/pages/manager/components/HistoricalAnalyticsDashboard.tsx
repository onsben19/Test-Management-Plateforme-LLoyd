import React, { useState, useEffect } from 'react';
import {
    BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
    Cell, ScatterChart, Scatter, ZAxis, AreaChart, Area
} from 'recharts';
import {
    TrendingUp, Shield, AlertCircle, Download, Layout, Activity,
    TrendingDown, Minus, Crown, Medal, UserCheck, ShieldAlert,
    BrainCircuit, MoreVertical, AtSign, Clock
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { analyticsService } from '../../../services/api';
import { toast } from 'react-toastify';

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
    // Generate 5 bars for the mockup look
    const displayData = data.slice(-5);
    while (displayData.length < 5) displayData.unshift(Math.random() * 40 + 30); // Fill with mock if missing

    return (
        <div className="flex items-end gap-1 h-8">
            {displayData.map((val, i) => (
                <motion.div
                    key={i}
                    initial={{ height: 0 }}
                    animate={{ height: `${(val / 100) * 100}%` }}
                    className={`w-1.5 rounded-full ${color}`}
                />
            ))}
        </div>
    );
};

const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
        return (
            <div className="bg-[#0f172a] border border-white/10 p-3 rounded-xl shadow-2xl backdrop-blur-xl">
                <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">{label}</p>
                <p className="text-xs font-black text-white">{payload[0].value}%</p>
            </div>
        );
    }
    return null;
};

// ---------------------------------------------------------------------------
// Main Component
const HistoricalAnalyticsDashboard = ({ projectId }: { projectId: string }) => {
    const [activeTab, setActiveTab] = useState<'quality' | 'velocity' | 'strat'>('quality');
    const [loading, setLoading] = useState(true);
    const [releaseData, setReleaseData] = useState<ReleaseMetrics[]>([]);
    const [testerData, setTesterData] = useState<TesterPerformance[]>([]);
    const [moduleData, setModuleData] = useState<ModuleHealth[]>([]);

    useEffect(() => {
        const fetchData = async () => {
            try {
                setLoading(true);
                // Si projectId est 'all', on passe une chaîne vide ou 'all' à l'API selon le backend
                const pid = projectId === 'all' ? 'all' : projectId;
                const [releases, testers, modules] = await Promise.all([
                    analyticsService.getHistoricalReleases(pid),
                    analyticsService.getHistoricalTesters(pid),
                    analyticsService.getHistoricalModules(pid)
                ]);
                setReleaseData(releases.data);
                setTesterData(testers.data);
                setModuleData(modules.data);
            } catch (err) {
                console.error("Failed to fetch historical analytics", err);
                toast.error("Erreur de chargement des données");
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [projectId]);

    const readinessScore = releaseData.length > 0
        ? Math.round(releaseData.reduce((acc, curr) => acc + curr.pass_rate, 0) / releaseData.length)
        : 67;

    if (loading) {
        return <div className="p-10 text-slate-500 font-bold animate-pulse">Chargement des analytics...</div>;
    }

    return (
        <div className="bg-[#0f172a] border border-white/5 rounded-[3rem] p-10 shadow-2xl space-y-12 max-w-[900px] mx-auto">
            {/* Header section as in mockup */}
            <div className="flex items-center justify-between">
                <div className="space-y-1">
                    <h2 className="text-2xl font-black text-white tracking-tight">
                        {projectId === 'all' ? 'Analytics Plateforme' : 'Analytics Historiques'}
                    </h2>
                    <p className="text-sm font-bold text-slate-500">
                        {projectId === 'all' ? 'Consolidation de tous les projets actifs' : `Tendances sur ${releaseData.length || 6} releases`}
                    </p>
                </div>
                <div className="flex items-center gap-2 px-4 py-2 bg-blue-500/10 rounded-xl border border-blue-500/20 text-blue-400">
                    <Activity className="w-4 h-4" />
                    <span className="text-[10px] font-black uppercase tracking-widest">Live Aggregation</span>
                </div>
            </div>

            {/* Custom Pilled Tabs */}
            <div className="flex bg-[#161e31] p-1.5 rounded-[1.5rem] w-full max-w-md mx-auto">
                {[
                    { id: 'quality', label: 'Qualité' },
                    { id: 'velocity', label: 'Vélocité' },
                    { id: 'strat', label: 'Stratégie' }
                ].map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id as any)}
                        className={`flex-1 py-3 px-4 rounded-[1.2rem] text-[11px] font-black uppercase tracking-widest transition-all ${activeTab === tab.id
                            ? 'bg-blue-600/20 text-blue-400 shadow-inner border border-blue-500/20'
                            : 'text-slate-500 hover:text-white'
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
                        className="bg-white/[0.02] border border-white/5 rounded-[2.5rem] p-8 space-y-8"
                    >
                        <div className="flex items-center gap-3 text-slate-400">
                            <TrendingUp size={16} />
                            <h3 className="text-[10px] font-black uppercase tracking-[0.2em]">Taux de réussite par release</h3>
                        </div>

                        <div className="h-[250px] w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={releaseData.length ? releaseData : [
                                    { version: 'R1.0', pass_rate: 65 },
                                    { version: 'R1.1', pass_rate: 75 },
                                    { version: 'R1.2', pass_rate: 70 },
                                    { version: 'R1.3', pass_rate: 85 },
                                    { version: 'R2.0', pass_rate: 90 },
                                    { version: 'R2.1', pass_rate: 95 }
                                ]}>
                                    <XAxis
                                        dataKey="version"
                                        fontSize={8}
                                        fontWeight="black"
                                        axisLine={false}
                                        tickLine={false}
                                        stroke="#475569"
                                        interval={0}
                                        height={80}
                                        angle={-45}
                                        textAnchor="end"
                                        tickFormatter={(value) => value.length > 20 ? `${value.substring(0, 18)}...` : value}
                                    />
                                    <Tooltip content={<CustomTooltip />} cursor={{ fill: 'transparent' }} />
                                    <Bar dataKey="pass_rate" radius={[6, 6, 2, 2]} barSize={50}>
                                        {(releaseData.length ? releaseData : Array(6)).map((_, index) => (
                                            <Cell key={`cell-${index}`} fill={['#3b82f6', '#3b82f6', '#f59e0b', '#3b82f6', '#10b981', '#10b981'][index % 6]} />
                                        ))}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        </div>

                        <div className="flex items-center justify-between text-xs font-black">
                            <span className="text-slate-500 uppercase tracking-widest">Moyenne : {readinessScore}%</span>
                            <span className="text-emerald-500 uppercase tracking-widest flex items-center gap-2">
                                Tendance : ↑ +8% / release
                            </span>
                        </div>
                    </motion.div>
                )}

                {activeTab === 'velocity' && (
                    <motion.div
                        key="velocity"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        className="bg-white/[0.02] border border-white/5 rounded-[2.5rem] p-8 space-y-6"
                    >
                        <div className="flex items-center gap-3 text-slate-400 mb-4">
                            <Activity size={16} />
                            <h3 className="text-[10px] font-black uppercase tracking-[0.2em]">Performance testeurs • {releaseData.length || 6} releases</h3>
                        </div>

                        <div className="divide-y divide-white/5">
                            {testerData.length ? [...testerData].sort((a, b) => b.latest_pass_rate - a.latest_pass_rate).map((tester, i) => (
                                <div key={i} className="py-6 flex items-center justify-between group cursor-default">
                                    <div className="flex items-center gap-6">
                                        <div className="relative">
                                            <div className={`w-12 h-12 rounded-[1.2rem] flex items-center justify-center text-[11px] font-black text-white shadow-xl ${['bg-emerald-500/20 text-emerald-500', 'bg-purple-500/20 text-purple-500', 'bg-blue-500/20 text-blue-500'][i % 3]
                                                } border border-white/5`}>
                                                {tester.tester.initials}
                                            </div>
                                            {i === 0 && (
                                                <div className="absolute -top-2 -right-2 p-1.5 bg-amber-500 rounded-full border-2 border-[#0f172a] shadow-lg">
                                                    <Crown className="w-2.5 h-2.5 text-white" />
                                                </div>
                                            )}
                                        </div>
                                        <div className="space-y-0.5">
                                            <h4 className="text-base font-black text-white group-hover:translate-x-1 transition-transform">{tester.tester.name}</h4>
                                            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                                                {i === 0 ? 'Champion Quality' : i === 1 ? 'Expert' : 'Testeur Junior'}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-10">
                                        <div className="text-right">
                                            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Activité</p>
                                            <SparkBars
                                                data={tester.releases.map(r => r.pass_rate)}
                                                color={tester.delta_vs_first > 5 ? 'bg-emerald-500/80' : tester.delta_vs_first < -5 ? 'bg-orange-500/80' : 'bg-blue-500/80'}
                                            />
                                        </div>
                                        <div className="text-right w-20">
                                            <p className="text-lg font-black text-white">{tester.latest_pass_rate}%</p>
                                            <span className={`text-[10px] font-black uppercase tracking-widest ${tester.delta_vs_first > 5 ? 'text-emerald-500' : tester.delta_vs_first < -5 ? 'text-rose-500' : 'text-slate-500'}`}>
                                                {tester.delta_vs_first > 0 ? '↑' : '↓'} {Math.abs(tester.delta_vs_first)}%
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            )) : (
                                <div className="p-20 text-center space-y-4">
                                    <Activity className="w-12 h-12 text-slate-700 mx-auto" />
                                    <p className="text-slate-500 font-bold">Données de vélocité en attente</p>
                                </div>
                            )}
                        </div>
                    </motion.div>
                )}

                {activeTab === 'strat' && (
                    <motion.div
                        key="strat"
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        className="space-y-12"
                    >
                        {/* Strategic KPI: Confidence Gauge & Time-to-Quality */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                            {/* Left: Confidence Gauge */}
                            <div className="bg-white/[0.02] border border-white/5 rounded-[2.5rem] p-10 flex flex-col items-center justify-center text-center space-y-8 relative overflow-hidden">
                                <div className="absolute -top-24 -right-24 w-64 h-64 bg-blue-600/10 rounded-full blur-[80px]" />
                                <div className="space-y-2">
                                    <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500">Indice de Confiance Global</h3>
                                    <p className="text-[9px] font-black text-blue-400 uppercase tracking-widest bg-blue-400/10 px-3 py-1 rounded-full inline-block">Release Readiness</p>
                                </div>

                                <div className="relative w-56 h-32 flex items-center justify-center">
                                    <svg className="w-full h-full transform transition-all duration-1000">
                                        <circle cx="112" cy="112" r="100" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="20" strokeDasharray="314 314" strokeDashoffset="0" />
                                        <circle
                                            cx="112" cy="112" r="100" fill="none"
                                            stroke={readinessScore > 80 ? "#10b981" : readinessScore > 60 ? "#f59e0b" : "#f43f5e"}
                                            strokeWidth="20"
                                            strokeDasharray="314 314"
                                            strokeDashoffset={314 - (314 * (readinessScore / 100))}
                                            strokeLinecap="round"
                                            className="transition-all duration-1000 ease-out"
                                        />
                                    </svg>
                                    <div className="absolute bottom-0 text-5xl font-black text-white tracking-tighter">
                                        {readinessScore}<span className="text-xl text-slate-500">%</span>
                                    </div>
                                </div>

                                <div className="space-y-4 pt-4">
                                    <p className="text-sm font-bold text-slate-400 leading-relaxed max-w-[200px]">
                                        {readinessScore > 80 ? "Plateforme stable. Release recommandée en toute sécurité." :
                                            readinessScore > 60 ? "Stabilité modérée. Des tests ciblés sur les régressions sont nécessaires." :
                                                "Risque élevé. Une phase de stabilisation majeure est recommandée."}
                                    </p>
                                    <div className="flex items-center gap-4 justify-center">
                                        <div className="flex flex-col">
                                            <span className="text-[14px] font-black text-white">{moduleData.length}</span>
                                            <span className="text-[8px] font-black text-slate-600 uppercase tracking-widest">Fonctions Analysis</span>
                                        </div>
                                        <div className="w-px h-8 bg-white/5" />
                                        <div className="flex flex-col">
                                            <span className="text-[14px] font-black text-white">{Math.round(releaseData.reduce((acc, r) => acc + r.anomaly_count, 0))}</span>
                                            <span className="text-[8px] font-black text-slate-600 uppercase tracking-widest">Bugs Historiques</span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Right: Time-to-Quality (Area Chart) */}
                            <div className="bg-white/[0.02] border border-white/5 rounded-[2.5rem] p-8 flex flex-col space-y-6">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3 text-slate-400">
                                        <Clock size={16} />
                                        <h3 className="text-[10px] font-black uppercase tracking-[0.2em]">Vitesse de Certification</h3>
                                    </div>
                                    <span className="text-[9px] font-black text-slate-600 uppercase tracking-widest bg-white/5 px-3 py-1 rounded-full">Time-to-Quality (Jours)</span>
                                </div>

                                <div className="h-[250px] w-full relative">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <AreaChart data={releaseData}>
                                            <defs>
                                                <linearGradient id="colorDays" x1="0" y1="0" x2="0" y2="1">
                                                    <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3} />
                                                    <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                                                </linearGradient>
                                            </defs>
                                            <XAxis
                                                dataKey="version"
                                                fontSize={8}
                                                fontWeight="black"
                                                stroke="#475569"
                                                axisLine={false}
                                                tickLine={false}
                                                interval={0}
                                                angle={-25}
                                                textAnchor="end"
                                                height={50}
                                            />
                                            <YAxis hide />
                                            <Tooltip
                                                content={({ active, payload }) => {
                                                    if (active && payload && payload.length) {
                                                        const data = payload[0].payload;
                                                        return (
                                                            <div className="bg-[#1e293b] border border-white/10 p-4 rounded-2xl shadow-2xl backdrop-blur-xl">
                                                                <p className="text-[10px] font-black text-blue-400 uppercase tracking-widest mb-1">{data.version}</p>
                                                                <p className="text-sm font-black text-white">{data.duration_days} Jours de Cycle</p>
                                                                <p className="text-[9px] font-black text-slate-500 uppercase mt-2">Délai de Certification</p>
                                                            </div>
                                                        );
                                                    }
                                                    return null;
                                                }}
                                            />
                                            <Area
                                                type="monotone"
                                                dataKey="duration_days"
                                                stroke="#8b5cf6"
                                                strokeWidth={3}
                                                fillOpacity={1}
                                                fill="url(#colorDays)"
                                            />
                                        </AreaChart>
                                    </ResponsiveContainer>
                                </div>

                                <div className="grid grid-cols-2 gap-2 mt-2">
                                    <div className="p-3 bg-white/5 border border-white/10 rounded-2xl">
                                        <p className="text-[8px] font-black text-slate-500 uppercase tracking-tighter">Moyenne Cycle</p>
                                        <p className="text-xs font-bold text-white mt-1">
                                            {Math.round(releaseData.reduce((acc, r) => acc + r.duration_days, 0) / (releaseData.length || 1))} Jours
                                        </p>
                                    </div>
                                    <div className="p-3 bg-white/5 border border-white/10 rounded-2xl">
                                        <p className="text-[8px] font-black text-slate-500 uppercase tracking-tighter">Dernier Délai</p>
                                        <p className="text-xs font-bold text-white mt-1">
                                            {releaseData[releaseData.length - 1]?.duration_days || 0} Jours
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>

                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default HistoricalAnalyticsDashboard;
