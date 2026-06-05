import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    Zap, AlertTriangle, CheckCircle, ArrowRight, 
    UserPlus, ShieldCheck, Clock, Brain, RefreshCw, 
    ChevronRight, Sparkles, Activity
} from 'lucide-react';
import { aiService } from '../services/api';
import { toast } from 'react-toastify';
import Button from './ui/Button';

interface CatchupRecommendation {
    id: number;
    name: string;
    ml_score: number;
    ml_label: string;
    current_load: number;
    recommended_extra: number;
    status: string;
}

interface CatchupPlan {
    campaign_id: string;
    campaign_title: string;
    delay_days: number;
    required_velocity: number;
    current_velocity: number;
    tester_distribution: CatchupRecommendation[];
    recommendation_engine: string;
    deadline: string;
}

interface CatchupPlanIAProps {
    campaignId: string;
    onPlanApplied?: () => void;
}

const CatchupPlanIA: React.FC<CatchupPlanIAProps> = ({ campaignId, onPlanApplied }) => {
    const [plan, setPlan] = useState<any | null>(null);
    const [loading, setLoading] = useState(false);
    const [applying, setApplying] = useState(false);
    const [selectedTesterIds, setSelectedTesterIds] = useState<number[]>([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [assignments, setAssignments] = useState<Record<number, number>>({});
    const [notifying, setNotifying] = useState(false);
    const [monitoring, setMonitoring] = useState<any>(null);

    const fetchPlan = async () => {
        try {
            setLoading(true);
            const response = await aiService.getCatchupPlan(campaignId);
            const data = response.data;
            setPlan(data);
            
            // Auto-select recommended testers
            if (data?.tester_distribution) {
                const recommended = data.tester_distribution
                    .filter((t: any) => t.status === 'RECOMMENDED')
                    .map((t: any) => t.id);
                setSelectedTesterIds(recommended);
                
                // Init assignments with recommended extra or default
                const initialAssignments: Record<number, number> = {};
                data.tester_distribution.forEach((t: any) => {
                    if (t.status === 'RECOMMENDED') {
                        initialAssignments[t.id] = Math.ceil(t.recommended_extra * (data.days_left || 7));
                    }
                });
                setAssignments(initialAssignments);
            }
        } catch (error) {
            toast.error("Impossible de générer le plan de rattrapage");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (campaignId) {
            fetchPlan();
        }
    }, [campaignId]);

    // Poll monitoring status every 15 seconds
    useEffect(() => {
        const fetchStatus = async () => {
            try {
                const res = await aiService.getReinforcementStatus(campaignId);
                setMonitoring(res.data);
            } catch {}
        };
        fetchStatus();
        const interval = setInterval(fetchStatus, 15000);
        return () => clearInterval(interval);
    }, [campaignId]);

    const toggleTesterSelection = (id: number) => {
        setSelectedTesterIds(prev => {
            const isRemoving = prev.includes(id);
            if (isRemoving) {
                const { [id]: _, ...rest } = assignments;
                setAssignments(rest);
                return prev.filter(tid => tid !== id);
            } else {
                setAssignments({ ...assignments, [id]: 10 }); // Default 10 tests
                return [...prev, id];
            }
        });
    };

    const handleApplyPlan = async () => {
        try {
            setApplying(true);
            const payload = selectedTesterIds.map(id => ({
                tester_id: id,
                test_count: assignments[id] || 0
            }));

            await aiService.applyCatchupPlan(campaignId, payload);
            
            toast.success("Stratégie appliquée : les renforts ont été assignés");
            if (onPlanApplied) onPlanApplied();
            fetchPlan();
        } catch (error) {
            toast.error("Erreur lors de l'application du plan");
        } finally {
            setApplying(false);
        }
    };

    const handleNotifyN8N = async () => {
        try {
            setNotifying(true);
            await aiService.notifyCatchupPlan(campaignId, selectedTesterIds);
            toast.success("Notification envoyée à n8n pour les renforts !");
        } catch (error) {
            toast.error("Erreur lors de l'envoi de la notification");
        } finally {
            setNotifying(false);
        }
    };

    if (loading) {
        return (
            <div className="bg-slate-900/50 border border-slate-200 dark:border-white/5 rounded-3xl p-12 flex flex-col items-center justify-center space-y-6">
                <div className="relative">
                    <div className="w-16 h-16 border-4 border-blue-500/20 border-t-blue-500 rounded-full animate-spin" />
                    <Brain className="absolute inset-0 m-auto text-blue-500 animate-pulse" size={24} />
                </div>
                <div className="text-center">
                    <h3 className="text-slate-900 dark:text-white font-black uppercase tracking-widest text-sm mb-2">Calcul du Plan Optimal</h3>
                    <p className="text-slate-500 text-[10px] uppercase font-bold tracking-tight">Analyse des ressources et de la timeline...</p>
                </div>
            </div>
        );
    }

    if (!plan) return null;

    return (
        <div className="space-y-8 animate-fade-in">
            {/* Header Strategy */}
            <div className="bg-slate-50 dark:bg-white/[0.02] backdrop-blur-xl border border-slate-300 dark:border-white/10 rounded-[2.5rem] p-8 relative overflow-hidden group">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-8 relative z-10">
                    <div className="max-w-2xl">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="px-3 py-1 bg-blue-500/10 border border-blue-500/20 rounded-full flex items-center gap-2">
                                <Brain size={12} className="text-blue-400" />
                                <span className="text-[10px] font-bold text-blue-400 uppercase tracking-widest">Stratégie IA</span>
                            </div>
                            <div className="px-3 py-1 bg-amber-500/10 border border-amber-500/20 rounded-full flex items-center gap-2">
                                <Clock size={12} className="text-amber-400" />
                                <span className="text-[10px] font-bold text-amber-400 uppercase tracking-widest">Retard : {plan.delay_days || 0} jours</span>
                            </div>
                        </div>
                        <h2 className="text-2xl font-bold text-slate-900 dark:text-white uppercase tracking-tight mb-3">{plan.campaign_title || 'Optimisation de Campagne'}</h2>
                        <p className="text-slate-400 text-sm leading-relaxed italic border-l-2 border-blue-500/30 pl-4">
                            "{plan.recommendation_engine || "Analyse des performances en cours..."}"
                        </p>
                    </div>

                    <div className="flex flex-col items-center gap-4 bg-slate-50 dark:bg-white/[0.03] backdrop-blur-xl border border-slate-200 dark:border-white/5 p-6 rounded-2xl min-w-[200px]">
                        <div className="text-center">
                            <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest block mb-1">Vélocité requise</span>
                            <div className="text-3xl font-bold text-slate-900 dark:text-white">{Math.round(plan.required_velocity || 0)} <span className="text-xs text-blue-500">t/j</span></div>
                        </div>
                        <div className="w-full h-px bg-slate-100 dark:bg-white/5" />
                        <div className="text-center">
                            <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest block mb-1">Vélocité actuelle</span>
                            <div className="text-xl font-bold text-slate-400">{Math.round(plan.current_velocity || 0)} <span className="text-[10px]">t/j</span></div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Recommendations Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {(plan.tester_distribution || []).map((rec: any, idx: number) => {
                    const isSelected = selectedTesterIds.includes(rec.id);
                    const isRecommended = rec.status === 'RECOMMENDED';
                    const isAlreadyIn = rec.is_already_in;

                    return (
                        <motion.div 
                            key={rec.id}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: idx * 0.1 }}
                            onClick={() => toggleTesterSelection(rec.id)}
                            className={`relative cursor-pointer bg-slate-50 dark:bg-white/[0.02] border rounded-3xl p-6 transition-all group overflow-hidden ${
                                isSelected 
                                    ? 'border-blue-500 bg-blue-500/[0.02] shadow-lg shadow-blue-500/5' 
                                    : 'border-slate-200 dark:border-white/5 hover:border-slate-300 dark:border-white/10'
                            }`}
                        >
                            {/* Selection Indicator */}
                            <div className={`absolute top-4 right-4 w-5 h-5 rounded-full border flex items-center justify-center transition-all ${
                                isSelected ? 'bg-blue-500 border-blue-500' : 'border-slate-300 dark:border-white/10'
                            }`}>
                                {isSelected && <CheckCircle size={12} className="text-slate-900 dark:text-white" />}
                            </div>

                            <div className="flex items-start justify-between mb-4">
                                <div className="flex items-center gap-4">
                                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-white transition-all ${
                                        isSelected ? 'bg-blue-500' : 'bg-slate-100 dark:bg-white/5'
                                    }`}>
                                        <UserPlus size={20} />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2">
                                            <h3 className="text-lg font-bold text-slate-900 dark:text-white uppercase tracking-tight truncate">{rec.name}</h3>
                                            {isAlreadyIn && (
                                                <span className="px-2 py-0.5 bg-blue-500/10 border border-blue-500/20 rounded-md text-[7px] font-bold text-blue-400 uppercase tracking-widest">Déjà assigné</span>
                                            )}
                                        </div>
                                        <div className="flex items-center gap-2 mt-1">
                                            <ShieldCheck size={12} className={isRecommended ? "text-emerald-500" : "text-slate-500"} />
                                            <span className={`text-[9px] font-bold uppercase tracking-widest ${isRecommended ? "text-emerald-500" : "text-slate-500"}`}>
                                                Fit Score : {rec.ml_score}%
                                            </span>
                                        </div>
                                    </div>
                                </div>
                                {rec.recommended_extra > 0 && (
                                    <div className="text-right">
                                        <span className="text-[8px] font-bold text-slate-500 uppercase tracking-widest block mb-0.5">Charge additionnelle</span>
                                        <span className="text-lg font-bold text-slate-900 dark:text-white">+{rec.recommended_extra} <span className="text-[10px] text-blue-500">tests</span></span>
                                    </div>
                                )}
                            </div>

                            <div className="bg-slate-50 dark:bg-white/[0.01] border border-slate-200 dark:border-white/5 rounded-xl p-3 mb-4">
                                <p className="text-[10px] text-slate-400 leading-relaxed">
                                    {rec.ml_label || "Ressource qualifiée pour cette campagne."}
                                </p>
                            </div>

                            <div className="space-y-2">
                                <div className="flex justify-between text-[8px] font-bold text-slate-500 uppercase tracking-widest">
                                    <span>Charge actuelle</span>
                                    <span className={rec.current_load > 8 ? 'text-rose-500' : 'text-emerald-500'}>
                                        {rec.current_load} units/jour
                                    </span>
                                </div>
                                <div className="h-1 w-full bg-slate-100 dark:bg-white/5 rounded-full overflow-hidden">
                                    <div 
                                        className={`h-full rounded-full ${rec.current_load > 8 ? 'bg-rose-500' : 'bg-blue-500'}`}
                                        style={{ width: `${Math.min((rec.current_load / 10) * 100, 100)}%` }}
                                    />
                                </div>
                            </div>
                        </motion.div>
                    );
                })}
            </div>

            {/* N8N Monitoring Panel */}
            {monitoring && monitoring.notifications?.length > 0 && (
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-slate-50 dark:bg-white/[0.02] border border-slate-300 dark:border-white/10 rounded-3xl p-6"
                >
                    <div className="flex items-center justify-between mb-5">
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-xl bg-blue-500/10 flex items-center justify-center">
                                <Activity size={16} className="text-blue-400" />
                            </div>
                            <div>
                                <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-widest">Suivi des Notifications</h3>
                                <p className="text-[9px] text-slate-500 font-bold uppercase tracking-widest">Mise à jour automatique toutes les 15s</p>
                            </div>
                        </div>
                        {/* Summary badges */}
                        <div className="flex items-center gap-2">
                            {monitoring.summary.accepted > 0 && (
                                <span className="px-2 py-1 bg-emerald-500/10 border border-emerald-500/20 rounded-lg text-[9px] font-bold text-emerald-400 uppercase tracking-widest">
                                    ✓ {monitoring.summary.accepted} Accepté
                                </span>
                            )}
                            {monitoring.summary.pending > 0 && (
                                <span className="px-2 py-1 bg-amber-500/10 border border-amber-500/20 rounded-lg text-[9px] font-bold text-amber-400 uppercase tracking-widest">
                                    ⏳ {monitoring.summary.pending} En attente
                                </span>
                            )}
                            {monitoring.summary.refused > 0 && (
                                <span className="px-2 py-1 bg-rose-500/10 border border-rose-500/20 rounded-lg text-[9px] font-bold text-rose-400 uppercase tracking-widest">
                                    ✗ {monitoring.summary.refused} Refusé
                                </span>
                            )}
                        </div>
                    </div>

                    <div className="space-y-2">
                        {monitoring.notifications.map((n: any) => (
                            <div key={n.tester_id} className="flex items-center justify-between bg-slate-50 dark:bg-white/[0.02] border border-slate-200 dark:border-white/5 rounded-xl px-4 py-3">
                                <div className="flex items-center gap-3">
                                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold text-white ${
                                        n.status === 'ACCEPTED' ? 'bg-emerald-500/20' :
                                        n.status === 'REFUSED'  ? 'bg-rose-500/20' :
                                        'bg-amber-500/20'
                                    }`}>
                                        {n.tester_name?.charAt(0).toUpperCase()}
                                    </div>
                                    <div>
                                        <p className="text-sm font-bold text-slate-900 dark:text-white">{n.tester_name}</p>
                                        <p className="text-[9px] text-slate-500 font-mono">{n.tester_email}</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-4">
                                    <div className="text-right">
                                        <p className="text-[8px] text-slate-600 uppercase tracking-widest">Envoyé</p>
                                        <p className="text-[10px] font-bold text-slate-400">{n.sent_at}</p>
                                    </div>
                                    {n.replied_at && (
                                        <div className="text-right">
                                            <p className="text-[8px] text-slate-600 uppercase tracking-widest">Répondu</p>
                                            <p className="text-[10px] font-bold text-slate-400">{n.replied_at}</p>
                                        </div>
                                    )}
                                    <div className={`px-3 py-1.5 rounded-lg border text-[9px] font-bold uppercase tracking-widest ${
                                        n.status === 'ACCEPTED'
                                            ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                                            : n.status === 'REFUSED'
                                            ? 'bg-rose-500/10 border-rose-500/20 text-rose-400'
                                            : 'bg-amber-500/10 border-amber-500/20 text-amber-400'
                                    }`}>
                                        {n.status === 'ACCEPTED' ? '✓ Accepté' : n.status === 'REFUSED' ? '✗ Refusé' : '⏳ En attente'}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </motion.div>
            )}

            {/* Action Footer */}
            <div className="flex items-center justify-between bg-slate-50 dark:bg-white/[0.01] border border-slate-200 dark:border-white/5 p-6 rounded-[2rem]">
                <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-500">
                        <Activity size={20} />
                    </div>
                    <div>
                        <h4 className="text-base font-bold text-slate-900 dark:text-white uppercase tracking-tight">
                            {selectedTesterIds.length} Testeur(s) sélectionné(s)
                        </h4>
                        <p className="text-[9px] text-slate-500 font-bold uppercase tracking-widest">
                            Impact estimé : +{Math.round((plan.current_velocity || 0) * (selectedTesterIds.length * 0.25))} tests/jour
                        </p>
                    </div>
                </div>
                
                <div className="flex gap-3">
                    <Button 
                        variant="secondary"
                        size="icon"
                        onClick={fetchPlan}
                        isLoading={loading}
                        disabled={applying || notifying}
                        icon={RefreshCw}
                    />
                    <Button 
                        variant="primary"
                        onClick={handleNotifyN8N}
                        isLoading={notifying}
                        disabled={applying || notifying || !plan || selectedTesterIds.length === 0}
                        icon={Sparkles}
                        className="px-6 text-xs font-bold"
                    >
                        {notifying ? 'Envoi...' : 'Informer le testeur'}
                    </Button>
                </div>
            </div>
        </div>
    );
};

export default CatchupPlanIA;
