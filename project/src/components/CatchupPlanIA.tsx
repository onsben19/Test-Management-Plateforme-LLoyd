import React, { useState, useEffect } from 'react';
import {
    AlertTriangle,
    TrendingUp,
    Users,
    Sparkles,
    CheckCircle2,
    ArrowRight,
    UserPlus,
    Zap,
    Clock,
    ChevronRight,
    Target,
    BarChart3,
    X
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { aiService } from '../services/api';
import { toast } from 'react-toastify';

interface TesterLoad {
    id: number;
    name: string;
    current_load: number;
    is_overloaded: boolean;
    recommended_extra?: number;
    status?: 'RECOMMENDED' | 'OVERLOADED';
    total_executed?: number;
}

interface AIAction {
    id: string;
    title: string;
    description: string;
    type: 'success' | 'warning' | 'error';
    action_label: string;
    impact: string;
}

interface CatchupPlanData {
    campaign_id: number;
    campaign_title: string;
    delay_days: number;
    current_velocity: number;
    required_velocity: number;
    days_left: number;
    remaining_tests: number;
    progress_percentage: number;
    tester_distribution: TesterLoad[];
    ai_actions: AIAction[];
    deadline: string;
}

interface CatchupPlanIAProps {
    campaignId: string | number;
    onClose?: () => void;
}

const CatchupPlanIA: React.FC<CatchupPlanIAProps> = ({ campaignId, onClose }) => {
    const [data, setData] = useState<CatchupPlanData | null>(null);
    const [loading, setLoading] = useState(true);
    const [appliedActions, setAppliedActions] = useState<string[]>([]);

    useEffect(() => {
        const fetchPlan = async () => {
            try {
                setLoading(true);
                const response = await aiService.getCatchupPlan(campaignId);
                setData(response.data);
            } catch (error) {
                console.error("Error fetching catchup plan:", error);
                toast.error("Impossible de charger le plan de rattrapage.");
            } finally {
                setLoading(false);
            }
        };

        if (campaignId) fetchPlan();
    }, [campaignId]);

    const handleApplyAction = async (actionId: string) => {
        try {
            await aiService.applyRecommendation(campaignId, actionId);
            setAppliedActions(prev => [...prev, actionId]);
            toast.success("Action IA appliquée avec succès !");
        } catch (error) {
            toast.error("Erreur lors de l'application de l'action.");
        }
    };

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center h-[600px] bg-[#0b0e14] rounded-[3rem] border border-white/5 overflow-hidden relative">
                <div className="absolute inset-0 bg-gradient-to-br from-indigo-600/10 to-purple-600/10 blur-[120px] opacity-40 animate-pulse" />
                <div className="relative z-10 flex flex-col items-center">
                    <div className="w-20 h-20 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin shadow-[0_0_30px_rgba(99,102,241,0.5)] mb-8"></div>
                    <p className="text-slate-400 font-black tracking-[0.3em] uppercase text-[10px] animate-pulse">Synchronisation IA en cours...</p>
                </div>
            </div>
        );
    }

    if (!data) return null;

    return (
        <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-[#0b0e14] text-white rounded-[3.5rem] border border-white/[0.08] shadow-[0_50px_100px_-20px_rgba(0,0,0,0.8)] max-w-2xl mx-auto overflow-hidden relative backdrop-blur-3xl"
        >
            {/* Premium Background Effects */}
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(99,102,241,0.1),transparent_70%)] pointer-events-none" />
            <div className="absolute top-0 right-0 w-80 h-80 bg-indigo-600/10 blur-[130px] -mr-40 -mt-40 rounded-full pointer-events-none" />
            <div className="absolute bottom-0 left-0 w-80 h-80 bg-amber-600/5 blur-[130px] -ml-40 -mb-40 rounded-full pointer-events-none" />

            {/* Fixed Header */}
            <div className="relative z-20 px-10 pt-10 pb-6 border-b border-white/5 bg-[#0b0e14]/50 backdrop-blur-md">
                <div className="flex justify-between items-center">
                    <div>
                        <p className="text-slate-500 font-black uppercase tracking-[0.4em] text-[9px] mb-1.5 opacity-60">Optimiseur Stratégique IA</p>
                        <h2 className="text-xl font-black tracking-tight flex items-center gap-3">
                            {data.campaign_title}
                            <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full shadow-[0_0_10px_rgba(16,185,129,0.8)] animate-pulse" />
                        </h2>
                    </div>
                    <div className="flex flex-col items-end gap-1.5">
                        <div className="bg-indigo-500/10 border border-indigo-500/20 px-4 py-1.5 rounded-xl flex items-center gap-2 shadow-[0_0_30px_rgba(99,102,241,0.15)]">
                            <Sparkles className="w-3.5 h-3.5 text-indigo-400 fill-indigo-400" />
                            <span className="text-indigo-300 font-black text-[9px] uppercase tracking-widest">Expert Connecté</span>
                        </div>
                        {data.delay_days > 0 && (
                            <span className="text-rose-500/80 font-black text-[8px] uppercase tracking-[0.2em] bg-rose-500/5 px-2 py-0.5 rounded-full border border-rose-500/10">
                                +{data.delay_days}j retard détecté
                            </span>
                        )}
                    </div>
                </div>
            </div>

            {/* Scrollable Content Area */}
            <div className="h-[550px] overflow-y-auto px-10 py-8 custom-scrollbar relative z-10">
                <style dangerouslySetInnerHTML={{
                    __html: `
                    .custom-scrollbar::-webkit-scrollbar { width: 4px; }
                    .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
                    .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255, 255, 255, 0.05); border-radius: 10px; }
                    .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(99, 102, 241, 0.3); }
                `}} />

                {/* Required Goal Section */}
                <div className="mb-10">
                    <label className="text-[9px] uppercase font-black tracking-[0.4em] text-slate-500 flex items-center gap-3 mb-6">
                        <div className="w-1.5 h-1.5 bg-indigo-500 rounded-full shadow-[0_0_8px_rgba(99,102,241,1)]" />
                        Objectif requis
                    </label>

                    <div className="flex justify-between items-end mb-6">
                        <div>
                            <div className="flex items-baseline gap-3">
                                <span className="text-6xl font-black text-white tracking-tighter tabular-nums drop-shadow-[0_0_20px_rgba(255,255,255,0.1)]">{data.required_velocity}</span>
                                <span className="text-slate-500 font-black uppercase text-[10px] tracking-[0.2em] mb-2">tests/jour</span>
                            </div>
                            <div className="flex items-center gap-2.5 bg-white/[0.03] w-fit px-3 py-1 rounded-lg border border-white/5 mt-2">
                                <TrendingUp className="w-3 h-3 text-amber-500" />
                                <span className="text-[9px] text-slate-400 font-black uppercase tracking-widest">Actuel : {data.current_velocity}</span>
                                <div className="w-1 h-3 bg-white/10 rounded-full" />
                                <span className="text-[9px] font-black text-amber-500 uppercase tracking-widest">Rattrapage requis</span>
                            </div>
                        </div>
                        <div className="text-right">
                            <div className="flex items-baseline justify-end gap-2">
                                <span className="text-4xl font-black text-amber-500 tracking-tighter">{data.days_left}</span>
                                <span className="text-slate-500 font-black uppercase text-[10px] tracking-[0.2em] mb-1">jours</span>
                            </div>
                            <p className="text-[9px] text-slate-400 font-black uppercase tracking-[0.2em] opacity-40">{data.remaining_tests} tests restants</p>
                        </div>
                    </div>

                    <div className="space-y-3">
                        <div className="h-2.5 w-full bg-white/[0.03] rounded-full overflow-hidden relative border border-white/[0.05] p-0.5">
                            <motion.div
                                initial={{ width: 0 }}
                                animate={{ width: `${data.progress_percentage}%` }}
                                transition={{ duration: 1, ease: "circOut" }}
                                className="h-full bg-gradient-to-r from-indigo-600 to-indigo-400 rounded-full shadow-[0_0_15px_rgba(99,102,241,0.5)]"
                            />
                        </div>
                        <div className="flex justify-between items-center text-[9px] font-black uppercase tracking-[0.2em]">
                            <span className="text-indigo-400">{data.progress_percentage}% COMPLÉTÉ</span>
                            <span className="text-slate-600 italic">Deadline : {new Date(data.deadline).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}</span>
                        </div>
                    </div>
                </div>

                {/* Tester Distribution Section */}
                <div className="mb-10">
                    <label className="text-[9px] uppercase font-black tracking-[0.4em] text-slate-500 flex items-center gap-3 mb-6">
                        <div className="w-1.5 h-1.5 bg-amber-500 rounded-full shadow-[0_0_8px_rgba(245,158,11,1)]" />
                        Répartition des ressources
                    </label>

                    <div className="grid gap-3">
                        {data.tester_distribution.map((tester, idx) => {
                            const maxLoad = 15; // Échelle max pour le graph
                            const currentPercent = (tester.current_load / maxLoad) * 100;
                            const extraPercent = ((tester.recommended_extra || 0) / maxLoad) * 100;

                            return (
                                <motion.div
                                    key={tester.id}
                                    initial={{ opacity: 0, x: -20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: 0.2 + (idx * 0.05) }}
                                    className="bg-white/[0.01] border border-white/[0.05] rounded-2xl p-4 flex items-center justify-between group hover:bg-white/[0.03] hover:border-white/10 transition-all duration-300"
                                >
                                    <div className="flex items-center gap-4">
                                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-xs ${tester.status === 'OVERLOADED' ? 'bg-rose-500/10 text-rose-500 border border-rose-500/20' : 'bg-indigo-500/10 text-indigo-500 border border-indigo-500/20'}`}>
                                            {tester.name.split(' ').map(n => n[0]).join('').toUpperCase()}
                                        </div>
                                        <div>
                                            <h4 className="font-bold text-sm tracking-tight">{tester.name}</h4>
                                            <p className="text-[9px] text-slate-500 font-bold uppercase tracking-widest">Charge : {tester.current_load} t/j</p>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-6">
                                        {tester.recommended_extra && (
                                            <div className="flex flex-col items-end gap-1.5">
                                                <div className="h-1.5 w-24 bg-white/5 rounded-full overflow-hidden flex">
                                                    <div className="h-full bg-slate-500/30" style={{ width: `${currentPercent}%` }} />
                                                    <motion.div
                                                        initial={{ width: 0 }}
                                                        animate={{ width: `${extraPercent}%` }}
                                                        className="h-full bg-indigo-400 shadow-[0_0_10px_rgba(129,140,248,0.5)]"
                                                    />
                                                </div>
                                                <span className="text-[8px] font-black text-indigo-400 tracking-widest">+{tester.recommended_extra} OPTIMISATION</span>
                                            </div>
                                        )}
                                        <div className={`px-3 py-1 rounded-lg text-[8px] font-black uppercase tracking-widest border ${tester.status === 'OVERLOADED' ? 'bg-rose-500/5 text-rose-500 border-rose-500/20' : 'bg-emerald-500/5 text-emerald-500 border-emerald-500/20'}`}>
                                            {tester.status === 'OVERLOADED' ? 'Saturé' : 'Recommandé'}
                                        </div>
                                    </div>
                                </motion.div>
                            );
                        })}
                    </div>
                </div>

                {/* AI Actions Section */}
                <div>
                    <label className="text-[9px] uppercase font-black tracking-[0.4em] text-slate-500 flex items-center gap-3 mb-6">
                        <Zap className="w-3 h-3 text-indigo-400 fill-indigo-400" />
                        Actions correctives IA
                    </label>

                    <div className="grid gap-3">
                        {data.ai_actions.map((action, idx) => {
                            const isApplied = appliedActions.includes(action.id);
                            return (
                                <motion.div
                                    key={action.id}
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: 0.4 + (idx * 0.1) }}
                                    className="bg-white/[0.03] border border-white/10 rounded-2xl p-5 relative overflow-hidden group hover:bg-white/[0.05] hover:border-indigo-500/30 transition-all duration-300 shadow-xl"
                                >
                                    <div className="flex gap-5 items-start relative z-10">
                                        <div className={`w-10 h-10 rounded-xl border flex items-center justify-center shrink-0 ${action.type === 'success' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-500' :
                                            action.type === 'warning' ? 'bg-amber-500/10 border-amber-500/20 text-amber-500' :
                                                'bg-rose-500/10 border-rose-500/20 text-rose-500'
                                            }`}>
                                            {isApplied ? <CheckCircle2 size={20} /> : (
                                                action.type === 'success' ? <UserPlus size={20} /> :
                                                    action.type === 'warning' ? <BarChart3 size={20} /> :
                                                        <AlertTriangle size={20} />
                                            )}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center justify-between gap-4 mb-2">
                                                <h5 className="font-bold text-sm tracking-tight truncate">{action.title}</h5>
                                                <span className="text-[8px] font-black text-indigo-400 uppercase tracking-widest px-2 py-0.5 bg-indigo-500/10 rounded border border-indigo-500/20 shrink-0">{action.impact}</span>
                                            </div>
                                            <p className="text-[11px] text-slate-500 font-medium leading-relaxed mb-4 line-clamp-2">
                                                {action.description}
                                            </p>

                                            <div className="flex gap-4">
                                                {isApplied ? (
                                                    <div className="flex items-center gap-2 text-emerald-400 text-[9px] font-black uppercase tracking-widest bg-emerald-500/10 px-4 py-2 rounded-xl border border-emerald-500/20 w-fit">
                                                        <CheckCircle2 className="w-3 h-3" /> Appliqué
                                                    </div>
                                                ) : (
                                                    <button
                                                        onClick={() => handleApplyAction(action.id)}
                                                        className="bg-white/5 border border-white/10 hover:bg-white hover:text-black transition-all duration-300 text-white px-6 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest flex items-center gap-2 group/btn"
                                                    >
                                                        {action.action_label}
                                                        <ArrowRight className="w-3 h-3 group-hover/btn:translate-x-1 transition-transform" />
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </motion.div>
                            );
                        })}
                    </div>
                </div>
            </div>

            {/* Fixed Footer */}
            <div className="relative z-20 p-6 border-t border-white/5 bg-[#0b0e14]/80 backdrop-blur-md">
                <button
                    onClick={onClose}
                    className="w-full py-4 text-slate-500 hover:text-white text-[10px] font-black uppercase tracking-[0.4em] transition-all flex items-center justify-center gap-2.5 group hover:bg-white/[0.02] rounded-2xl border border-transparent hover:border-white/5"
                >
                    <X className="w-3.5 h-3.5 opacity-50 group-hover:rotate-90 transition-transform duration-300" />
                    Fermer la session IA
                </button>
            </div>
        </motion.div>
    );
};

export default CatchupPlanIA;
