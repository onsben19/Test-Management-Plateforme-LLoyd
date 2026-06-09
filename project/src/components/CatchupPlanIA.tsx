import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Zap, AlertTriangle, CheckCircle, ArrowRight, X,
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
    onClose?: () => void;
}

const formatDate = (dateStr?: string | Date) => {
    if (!dateStr) return '—';
    try {
        const d = new Date(dateStr);
        if (isNaN(d.getTime())) return '—';
        return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
    } catch {
        return '—';
    }
};

const CatchupPlanIA: React.FC<CatchupPlanIAProps> = ({ campaignId, onPlanApplied, onClose }) => {
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
            } catch { }
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
                    <h3 className="text-slate-900 dark:text-white font-black uppercase tracking-widest text-sm mb-2">Préparation des Recommandations</h3>
                    <p className="text-slate-500 text-[10px] uppercase font-bold tracking-tight">L'assistant cherche les meilleurs testeurs disponibles...</p>
                </div>
            </div>
        );
    }

    if (!plan) return null;

    return (
        <div className="space-y-8 animate-fade-in relative">
            {onClose && (
                <button
                    onClick={onClose}
                    className="absolute top-6 right-6 p-2 rounded-full hover:bg-white/10 text-slate-400 transition-colors z-50"
                >
                    <X size={20} />
                </button>
            )}

            {/* Header Strategy */}
            <div className="bg-slate-900/40 backdrop-blur-xl border border-white/5 rounded-[2.5rem] p-8 relative overflow-hidden group shadow-2xl">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-8 relative z-10">
                    <div className="max-w-2xl">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="px-3 py-1 bg-blue-500/10 border border-blue-500/20 rounded-full flex items-center gap-2">
                                <span className="text-[10px] font-bold text-blue-400 uppercase tracking-widest">Recommandation</span>
                            </div>
                            <div className="px-3 py-1 bg-amber-500/10 border border-amber-500/20 rounded-full flex items-center gap-2">
                                <span className="text-[10px] font-bold text-amber-400 uppercase tracking-widest">Retard : {plan.delay_days || 0} jours</span>
                            </div>
                        </div>
                        <h2 className="text-2xl font-bold text-slate-900 dark:text-white uppercase tracking-tight mb-3">{plan.campaign_title || 'Optimisation de Campagne'}</h2>
                        <p className="text-slate-400 text-sm leading-relaxed italic border-l-2 border-blue-500/30 pl-4">
                            "{plan.recommendation_engine || "Analyse des performances en cours..."}"
                        </p>
                    </div>

                    <div className="flex flex-col items-center gap-4 bg-black/20 border border-white/5 p-6 rounded-3xl min-w-[200px]">
                        <div className="text-center">
                            <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest block mb-1">Rythme nécessaire</span>
                            <div className="text-3xl font-bold text-slate-900 dark:text-white">{Math.round(plan.required_velocity || 0)} <span className="text-xs text-blue-500">tests/j</span></div>
                        </div>
                        <div className="w-full h-px bg-slate-100 dark:bg-white/5" />
                        <div className="text-center">
                            <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest block mb-1">Rythme actuel</span>
                            <div className="text-xl font-bold text-slate-400">{Math.round(plan.current_velocity || 0)} <span className="text-[10px]">tests/j</span></div>
                        </div>
                    </div>
                </div>

                {/* Embedded Predictive Timeline */}
                <div className="relative z-10 mt-8 pt-8 border-t border-white/5">
                    <div className="flex items-center justify-between mb-4">
                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2">
                            <Activity size={12} className="text-purple-400" />
                            Projection IA (Impact du Retard)
                        </span>
                        <span className="text-[10px] font-bold text-rose-400 uppercase tracking-widest bg-rose-500/10 border border-rose-500/20 px-2 py-1 rounded-md animate-pulse">
                            Estimation : +{plan.delay_days || 0} jours
                        </span>
                    </div>

                    <div className="relative h-2 bg-slate-800 rounded-full w-full overflow-hidden flex">
                        <div className="h-full bg-blue-500 w-[60%] rounded-l-full" />
                        <div className="h-full bg-slate-700 w-[20%]" />
                        <div className="h-full bg-rose-500/80 w-[20%] rounded-r-full" />
                    </div>
                    
                    <div className="flex justify-between text-[9px] font-bold text-slate-500 uppercase tracking-widest mt-3">
                        <div className="flex flex-col items-start gap-0.5">
                            <span>Début</span>
                            <span className="text-[10px] text-slate-400 font-medium normal-case tracking-normal mt-0.5">{formatDate(plan.start_date)}</span>
                        </div>
                        <div className="flex flex-col items-center gap-0.5 translate-x-[20%]">
                            <span className="text-blue-400">Aujourd'hui</span>
                            <span className="text-[10px] text-blue-500/70 font-medium normal-case tracking-normal mt-0.5">{formatDate(new Date())}</span>
                        </div>
                        <div className="flex flex-col items-center gap-0.5 translate-x-[15%]">
                            <span className="text-emerald-500">Deadline</span>
                            <span className="text-[10px] text-emerald-600/70 font-medium normal-case tracking-normal mt-0.5">{formatDate(plan.deadline)}</span>
                        </div>
                        <div className="flex flex-col items-end gap-0.5">
                            <span className="text-rose-500">Fin Estimée</span>
                            <span className="text-[10px] text-rose-500/70 font-medium normal-case tracking-normal mt-0.5">{formatDate(plan.projected_end_date)}</span>
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
                            className={`relative cursor-pointer bg-slate-900/40 backdrop-blur-xl border rounded-[2rem] p-6 transition-all group overflow-hidden shadow-xl ${isSelected
                                    ? 'border-blue-500 bg-blue-900/20 shadow-lg shadow-blue-500/10'
                                    : 'border-white/5 hover:border-white/10'
                                }`}
                        >
                            {/* Selection Indicator */}
                            <div className={`absolute top-4 right-4 w-5 h-5 rounded-full border flex items-center justify-center transition-all ${isSelected ? 'bg-blue-500 border-blue-500' : 'border-slate-300 dark:border-white/10'
                                }`}>
                                {isSelected && <CheckCircle size={12} className="text-slate-900 dark:text-white" />}
                            </div>

                            <div className="flex items-start justify-between mb-4">
                                <div className="flex items-center gap-4">
                                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-white transition-all ${isSelected ? 'bg-blue-500' : 'bg-slate-100 dark:bg-white/5'
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
                                            <span className={`text-[9px] font-bold uppercase tracking-widest ${isRecommended ? "text-emerald-500" : "text-slate-500"}`}>
                                                Compatibilité : {rec.ml_score}%
                                            </span>
                                        </div>
                                    </div>
                                </div>
                                {rec.recommended_extra > 0 && (
                                    <div className="text-right">
                                        <span className="text-[8px] font-bold text-slate-500 uppercase tracking-widest block mb-0.5">Tests à ajouter</span>
                                        <span className="text-lg font-bold text-slate-900 dark:text-white">+{rec.recommended_extra}</span>
                                    </div>
                                )}
                            </div>

                            <div className="bg-black/20 border border-white/5 rounded-2xl p-4 mb-4">
                                <p className="text-[10px] text-slate-400 leading-relaxed">
                                    {rec.ml_label || "Ressource qualifiée pour cette campagne."}
                                </p>
                            </div>

                            <div className="space-y-2">
                                <div className="flex justify-between text-[8px] font-bold text-slate-500 uppercase tracking-widest">
                                    <span>Tests assignés</span>
                                    <span className={rec.current_load > 8 ? 'text-rose-500' : 'text-emerald-500'}>
                                        {rec.current_load} tests/j
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
                    className="bg-slate-900/40 backdrop-blur-xl border border-white/5 rounded-[2.5rem] p-8 shadow-2xl"
                >
                    <div className="flex items-center justify-between mb-5">
                        <div className="flex items-center gap-3">
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
                            <div key={n.tester_id} className="flex items-center justify-between bg-black/20 border border-white/5 rounded-2xl px-5 py-4">
                                <div className="flex items-center gap-3">
                                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold text-white ${n.status === 'ACCEPTED' ? 'bg-emerald-500/20' :
                                            n.status === 'REFUSED' ? 'bg-rose-500/20' :
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
                                    <div className={`px-3 py-1.5 rounded-lg border text-[9px] font-bold uppercase tracking-widest ${n.status === 'ACCEPTED'
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
            <div className="flex items-center justify-between bg-slate-900/40 backdrop-blur-xl border border-white/5 p-6 rounded-[2.5rem] shadow-2xl">
                <div className="flex items-center gap-4">
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
