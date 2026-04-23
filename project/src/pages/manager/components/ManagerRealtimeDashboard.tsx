import React, { useEffect, useState, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Users, TrendingUp, Clock, AlertTriangle, CheckCircle2,
    XCircle, Zap, MessageSquare, Send, Radio
} from 'lucide-react';
import { campaignService } from '../../../services/api';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';
import { useNavigate } from 'react-router-dom';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type TesterStatus = 'active' | 'idle' | 'offline';

export interface TesterLiveStatus {
    id: number;
    name: string;
    avatar?: string;
    status: TesterStatus;
    action: string;
    velocity: number;
    dailyProgress: number; // 0 to 100
    idleSince?: string | null;
}

export type LiveEvent =
    | { type: 'tester_activity'; tester_id: number; action: 'started' | 'completed' | 'failed'; tc_id: number; timestamp: string }
    | { type: 'velocity_update'; tester_id: number; velocity_2h: number }
    | { type: 'tester_status'; tester_id: number; status: TesterStatus; idle_since?: string }
    | { type: 'ai_alert'; severity: 'critical' | 'warning'; message: string };

export interface ActivityFeedItem {
    id: string;
    type: 'success' | 'failure' | 'alert' | 'info';
    message: string;
    timestamp: Date;
    isAI?: boolean;
}

export interface DashboardKPIs {
    activeTesters: number;
    velocity2h: number;
    velocityYesterday: number;
    blockedTesters: number;
}

interface ManagerRealtimeDashboardProps {
    campaignId: number;
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

const ManagerRealtimeDashboard: React.FC<ManagerRealtimeDashboardProps> = ({ campaignId }) => {
    const navigate = useNavigate();
    const [kpis, setKpis] = useState<DashboardKPIs>({
        activeTesters: 0,
        velocity2h: 0,
        velocityYesterday: 0,
        blockedTesters: 0
    });

    const [testers, setTesters] = useState<TesterLiveStatus[]>([]);
    const [activityFeed, setActivityFeed] = useState<ActivityFeedItem[]>([]);
    const [lastUpdate, setLastUpdate] = useState<Date>(new Date());
    const [isConnected, setIsConnected] = useState(false);
    const [updateTimer, setUpdateTimer] = useState(0);

    const socketRef = useRef<WebSocket | null>(null);
    const activityFeedRef = useRef<ActivityFeedItem[]>([]);

    // Timer for "Updated Xs ago"
    useEffect(() => {
        const interval = setInterval(() => {
            setUpdateTimer(prev => prev + 1);
        }, 1000);
        return () => clearInterval(interval);
    }, []);

    // Fetch initial snapshot
    useEffect(() => {
        const fetchSnapshot = async () => {
            try {
                const res = await campaignService.getCampaignDashboard(campaignId);
                const data = res.data;
                setKpis(data.kpis);
                setTesters(data.testers);
                const feed = (data.recent_activity || []).map((ev: any) => ({
                    ...ev,
                    timestamp: new Date(ev.timestamp)
                }));
                setActivityFeed(feed);
                activityFeedRef.current = feed;
            } catch (err) {
                console.error("Failed to fetch dashboard snapshot", err);
            }
        };

        fetchSnapshot();

        // Setup WebSocket
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const wsUrl = `${protocol}//${window.location.host}/ws/campaigns/${campaignId}/live/`;

        const connectWs = () => {
            const socket = new WebSocket(wsUrl);
            socketRef.current = socket;

            socket.onopen = () => {
                setIsConnected(true);
                setUpdateTimer(0);
                setLastUpdate(new Date());
            };

            socket.onmessage = (event) => {
                try {
                    const data: LiveEvent = JSON.parse(event.data);
                    handleLiveEvent(data);
                } catch (e) {
                    console.error("WS Message Parse Error", e);
                }
            };

            socket.onclose = () => {
                setIsConnected(false);
                // Attempt reconnect after 5s
                setTimeout(connectWs, 5000);
            };
        };

        connectWs();

        return () => {
            if (socketRef.current) socketRef.current.close();
        };
    }, [campaignId]);

    const handleLiveEvent = (event: LiveEvent) => {
        setUpdateTimer(0);
        setLastUpdate(new Date());

        switch (event.type) {
            case 'tester_activity':
                updateTesterActivity(event);
                break;
            case 'velocity_update':
                updateVelocity(event);
                break;
            case 'tester_status':
                updateTesterStatus(event);
                break;
            case 'ai_alert':
                addAIAlert(event);
                break;
        }
    };

    const updateTesterActivity = (event: Extract<LiveEvent, { type: 'tester_activity' }>) => {
        setTesters(prev => prev.map(t => {
            if (t.id === event.tester_id) {
                let action = t.action;
                if (event.action === 'started') action = `En train de tester TC${event.tc_id}`;
                else if (event.action === 'completed') action = `A terminé TC${event.tc_id}`;
                else if (event.action === 'failed') action = `Échec sur TC${event.tc_id}`;

                return { ...t, action, status: 'active' as const, idleSince: null };
            }
            return t;
        }));

        const feedId = `evt-${Date.now()}-${Math.random()}`;
        const newEvent: ActivityFeedItem = {
            id: feedId,
            type: event.action === 'failed' ? 'failure' : 'success',
            message: `Testeur #${event.tester_id} ${event.action === 'completed' ? 'a validé' : event.action === 'failed' ? 'a échoué sur' : 'a démarré'} TC${event.tc_id}`,
            timestamp: new Date(event.timestamp)
        };
        pushToFeed(newEvent);
    };

    const updateVelocity = (event: Extract<LiveEvent, { type: 'velocity_update' }>) => {
        setKpis(prev => ({ ...prev, velocity2h: event.velocity_2h }));
        setTesters(prev => prev.map(t => t.id === event.tester_id ? { ...t, velocity: event.velocity_2h } : t));
    };

    const updateTesterStatus = (event: Extract<LiveEvent, { type: 'tester_status' }>) => {
        setTesters(prev => prev.map(t => {
            if (t.id === event.tester_id) {
                const idleSince = event.status === 'idle' ? event.idle_since || new Date().toISOString() : t.idleSince;
                return { ...t, status: event.status, idleSince };
            }
            return t;
        }));

        if (event.status === 'idle') {
            const newEvent: ActivityFeedItem = {
                id: `idle-${event.tester_id}-${Date.now()}`,
                type: 'alert',
                message: `Testeur #${event.tester_id} est inactif depuis plus d'une heure.`,
                timestamp: new Date()
            };
            pushToFeed(newEvent);
        }
    };

    const addAIAlert = (event: Extract<LiveEvent, { type: 'ai_alert' }>) => {
        const newEvent: ActivityFeedItem = {
            id: `ai-${Date.now()}`,
            type: 'alert',
            message: event.message,
            timestamp: new Date(),
            isAI: true
        };
        pushToFeed(newEvent);
    };

    const pushToFeed = (item: ActivityFeedItem) => {
        const newFeed = [item, ...activityFeedRef.current].slice(0, 20);
        activityFeedRef.current = newFeed;
        setActivityFeed(newFeed);
    };

    const velocityDelta = kpis.velocity2h - kpis.velocityYesterday;
    const isVelocityUp = velocityDelta >= 0;

    return (
        <div className="space-y-8">
            {/* Header & Live Indicator */}
            <div className="flex justify-between items-center">
                <div className="flex items-center gap-4">
                    <div className="relative">
                        <div className={`w-3 h-3 rounded-full ${isConnected ? 'bg-emerald-500 shadow-[0_0_12px_rgba(16,185,129,0.5)]' : 'bg-rose-500 shadow-[0_0_12px_rgba(244,63,94,0.5)]'} relative z-10`} />
                        {isConnected && <div className="absolute inset-0 w-3 h-3 rounded-full bg-emerald-500 animate-ping opacity-75" />}
                    </div>
                    <div>
                        <h2 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-widest flex items-center gap-2">
                            Dashboard Live <Radio size={16} className={isConnected ? "text-emerald-500" : "text-slate-400"} />
                        </h2>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tight">
                            {isConnected ? `Mis à jour il y a ${updateTimer}s` : 'Déconnecté — Reconnexion...'}
                        </p>
                    </div>
                </div>



            </div>

            {/* KPI Stack */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <KPIComponent
                    label="Testeurs Actifs"
                    value={testers.filter(t => t.status === 'active').length}
                    icon={Users}
                    color="blue"
                />
                <KPIComponent
                    label="Vélocité Live (2h)"
                    value={kpis.velocity2h.toFixed(1)}
                    unit="tests/h"
                    icon={TrendingUp}
                    delta={Math.abs(velocityDelta).toFixed(1)}
                    deltaType={isVelocityUp ? 'up' : 'down'}
                    color="emerald"
                />
                <KPIComponent
                    label="Testeurs Bloqués"
                    value={testers.filter(t => t.status === 'idle').length}
                    icon={AlertTriangle}
                    color="rose"
                    pulse={testers.some(t => t.status === 'idle')}
                />
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">
                {/* Testers List */}
                <div className="xl:col-span-7 space-y-4">
                    <div className="flex items-center justify-between px-4">
                        <h3 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em]">Équipe de Test</h3>
                        <span className="text-[10px] font-bold text-slate-500 uppercase">{testers.length} membres</span>
                    </div>

                    <div className="space-y-3">
                        <AnimatePresence mode="popLayout">
                            {testers.map((tester) => (
                                <TesterRow key={tester.id} tester={tester} />
                            ))}
                        </AnimatePresence>
                    </div>
                </div>

                {/* Activity Feed */}
                <div className="xl:col-span-5 space-y-4">
                    <div className="flex items-center justify-between px-4">
                        <h3 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em]">Flux d'activité</h3>
                        <div className="flex h-1.5 w-1.5 rounded-full bg-blue-500 animate-pulse" />
                    </div>

                    <div className="bg-white/[0.02] border border-white/5 rounded-[2rem] overflow-hidden flex flex-col h-[500px]">
                        <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-6">
                            <AnimatePresence mode="popLayout">
                                {activityFeed.map((item) => (
                                    <ActivityItem key={item.id} item={item} />
                                ))}
                                {activityFeed.length === 0 && (
                                    <div className="h-full flex flex-col items-center justify-center text-slate-500 space-y-4">
                                        <div className="p-4 rounded-full bg-white/5">
                                            <Zap size={24} className="opacity-20" />
                                        </div>
                                        <p className="text-xs font-bold uppercase tracking-widest opacity-40">En attente d'activité...</p>
                                    </div>
                                )}
                            </AnimatePresence>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

const KPIComponent = ({ label, value, unit, icon: Icon, delta, deltaType, color, pulse }: any) => {
    const colorClasses: any = {
        blue: 'text-blue-500 bg-blue-500/10 border-blue-500/20',
        emerald: 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20',
        rose: 'text-rose-500 bg-rose-500/10 border-rose-500/20',
    };

    return (
        <div className={`p-6 rounded-[2.5rem] bg-white dark:bg-white/[0.03] border border-slate-100 dark:border-white/5 relative overflow-hidden group`}>
            {pulse && <div className="absolute inset-0 bg-rose-500/5 animate-pulse" />}
            <div className="flex justify-between items-start relative z-10">
                <div className="space-y-1">
                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{label}</p>
                    <div className="flex items-baseline gap-2">
                        <span className="text-3xl font-black text-slate-900 dark:text-white tabular-nums">{value}</span>
                        {unit && <span className="text-xs font-bold text-slate-400">{unit}</span>}
                    </div>
                </div>
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${colorClasses[color]}`}>
                    <Icon size={20} />
                </div>
            </div>
            {delta && (
                <div className={`mt-4 text-[10px] font-black flex items-center gap-1.5 uppercase ${deltaType === 'up' ? 'text-emerald-500' : 'text-rose-500'}`}>
                    {deltaType === 'up' ? '↑' : '↓'} {delta} {deltaType === 'up' ? 'Hausse' : 'Baisse'}
                </div>
            )}
        </div>
    );
};

const TesterRow = ({ tester }: { tester: TesterLiveStatus }) => {
    const navigate = useNavigate();
    const isIdle = tester.status === 'idle';
    const isOffline = tester.status === 'offline';

    return (
        <motion.div
            layout
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className={`group relative p-4 rounded-3xl border transition-all ${isIdle
                ? 'bg-amber-500/5 border-amber-500/20'
                : 'bg-white dark:bg-white/[0.02] border-slate-100 dark:border-white/5 hover:border-blue-500/30'
                }`}
        >
            <div className="flex items-center gap-4">
                {/* Avatar */}
                <div className="relative shrink-0">
                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-slate-100 to-slate-200 dark:from-white/10 dark:to-white/5 border border-white/10 flex items-center justify-center text-sm font-black text-slate-400 overflow-hidden">
                        {tester.avatar ? <img src={tester.avatar} className="w-full h-full object-cover" /> : tester.name.charAt(0)}
                    </div>
                    <div className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-[#0b0e14] ${tester.status === 'active' ? 'bg-emerald-500' : tester.status === 'idle' ? 'bg-amber-500' : 'bg-slate-500'
                        } ${tester.status === 'active' ? 'animate-pulse' : ''}`} />
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                        <h4 className="text-sm font-black text-slate-900 dark:text-white truncate">{tester.name}</h4>
                        <span className="text-[10px] font-black text-slate-400 tabular-nums">{tester.velocity} T/J</span>
                    </div>
                    <p className={`text-[10px] font-bold truncate ${isIdle ? 'text-amber-400' : 'text-slate-500 uppercase tracking-tight'}`}>
                        {isIdle ? `Bloqué ${tester.idleSince ? formatDistanceToNow(new Date(tester.idleSince), { locale: fr }) : ''}` : tester.action}
                    </p>
                </div>

                {/* Progress */}
                <div className="w-24 shrink-0 px-4 space-y-2">
                    <div className="h-1.5 w-full bg-slate-100 dark:bg-white/10 rounded-full overflow-hidden">
                        <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${tester.dailyProgress}%` }}
                            className={`h-full ${tester.dailyProgress >= 100 ? 'bg-emerald-500' : 'bg-blue-500'} transition-all`}
                        />
                    </div>
                    <div className="text-[8px] font-black text-center text-slate-400 uppercase tracking-widest">
                        Objectif
                    </div>
                </div>

                {/* Hover Action */}
                <div className="opacity-0 group-hover:opacity-100 transition-opacity absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-2">
                    <button
                        onClick={() => navigate(`/chat?userId=${tester.id}`)}
                        className="px-3 py-1.5 bg-blue-600 rounded-xl text-[9px] font-black text-white hover:bg-blue-500 transition-colors shadow-lg shadow-blue-900/40 uppercase tracking-widest"
                    >
                        Contacter
                    </button>
                </div>
            </div>
        </motion.div>
    );
};

const ActivityItem = ({ item }: { item: ActivityFeedItem }) => {
    const icons: any = {
        success: { icon: CheckCircle2, color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
        failure: { icon: XCircle, color: 'text-rose-500', bg: 'bg-rose-500/10' },
        alert: { icon: AlertTriangle, color: 'text-amber-500', bg: 'bg-amber-500/10' },
        info: { icon: Zap, color: 'text-blue-500', bg: 'bg-blue-500/10' },
    };

    const config = icons[item.type];

    return (
        <motion.div
            layout
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            className={`flex gap-4 items-start ${item.isAI ? 'p-4 rounded-2xl bg-blue-500/5 border border-blue-500/10' : ''}`}
        >
            <div className={`w-8 h-8 rounded-xl shrink-0 flex items-center justify-center ${config.bg} ${config.color}`}>
                <config.icon size={16} />
            </div>
            <div className="flex-1 min-w-0">
                <p className={`text-xs leading-relaxed ${item.isAI ? 'text-blue-400 font-bold' : 'text-slate-700 dark:text-slate-300'}`}>
                    {item.message}
                </p>
                <span className="text-[9px] font-bold text-slate-400 uppercase mt-1 block tracking-wider">
                    {formatDistanceToNow(item.timestamp, { addSuffix: true, locale: fr })}
                </span>
            </div>
        </motion.div>
    );
};

export default ManagerRealtimeDashboard;
