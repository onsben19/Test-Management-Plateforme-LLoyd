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

    if (loading) {
        return (
            <div className="bg-slate-900/50 border border-white/5 rounded-3xl p-12 flex flex-col items-center justify-center space-y-6">
                <div className="relative">
                    <div className="w-16 h-16 border-4 border-blue-500/20 border-t-blue-500 rounded-full animate-spin" />
                    <Brain className="absolute inset-0 m-auto text-blue-500 animate-pulse" size={24} />
                </div>
                <div className="text-center">
                    <h3 className="text-white font-black uppercase tracking-widest text-sm mb-2">Calcul du Plan Optimal</h3>
                    <p className="text-slate-500 text-[10px] uppercase font-bold tracking-tight">Analyse des ressources et de la timeline...</p>
                </div>
            </div>
        );
    }

    if (!plan) return null;

    return (
        <div className="space-y-8 animate-fade-in">
            {/* Header Strategy */}
            <div className="bg-gradient-to-br from-blue-600/20 to-purple-600/20 border border-white/10 rounded-[2.5rem] p-8 relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-12 opacity-5 group-hover:opacity-10 transition-opacity">
                    <Zap size={120} className="fill-white" />
                </div>
                
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-8 relative z-10">
                    <div className="max-w-2xl">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="px-3 py-1 bg-blue-500/20 border border-blue-500/30 rounded-full flex items-center gap-2">
                                <Brain size={14} className="text-blue-400" />
                                <span className="text-[10px] font-black text-blue-400 uppercase tracking-widest">STRATÉGIE IA</span>
                            </div>
                            <div className="px-3 py-1 bg-amber-500/20 border border-amber-500/30 rounded-full flex items-center gap-2">
                                <Clock size={14} className="text-amber-400" />
                                <span className="text-[10px] font-black text-amber-400 uppercase tracking-widest">RETARD : {plan.delay_days || 0} JOURS</span>
                            </div>
                        </div>
                        <h2 className="text-3xl font-black text-white uppercase tracking-tight mb-4">{plan.campaign_title || 'Optimisation de Campagne'}</h2>
                        <p className="text-slate-300 text-sm leading-relaxed italic border-l-2 border-blue-500/50 pl-6">
                            "{plan.recommendation_engine || "Analyse des performances en cours..."}"
                        </p>
                    </div>

                    <div className="flex flex-col items-center gap-4 bg-white/5 backdrop-blur-xl border border-white/10 p-8 rounded-3xl min-w-[240px]">
                        <div className="text-center">
                            <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-2">VÉLOCITÉ REQUISE</span>
                            <div className="text-4xl font-black text-white">{plan.required_velocity || 0} <span className="text-xs text-blue-500">t/j</span></div>
                        </div>
                        <div className="w-full h-px bg-white/10" />
                        <div className="text-center">
                            <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-2">VÉLOCITÉ ACTUELLE</span>
                            <div className="text-2xl font-bold text-slate-400">{plan.current_velocity || 0} <span className="text-[10px]">t/j</span></div>
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
                            className={`relative cursor-pointer bg-slate-900/40 border-2 rounded-3xl p-6 transition-all group overflow-hidden ${
                                isSelected 
                                    ? 'border-blue-500 bg-blue-500/5 shadow-lg shadow-blue-500/10' 
                                    : 'border-white/5 hover:border-white/20'
                            }`}
                        >
                            {/* Selection Indicator */}
                            <div className={`absolute top-4 right-4 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${
                                isSelected ? 'bg-blue-500 border-blue-500' : 'border-white/10'
                            }`}>
                                {isSelected && <CheckCircle size={14} className="text-white" />}
                            </div>

                            <div className="flex items-start justify-between mb-6">
                                <div className="flex items-center gap-4">
                                    <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-white shadow-xl transition-all group-hover:scale-110 ${
                                        isSelected ? 'bg-blue-500 shadow-blue-500/20' : 'bg-slate-800'
                                    }`}>
                                        <UserPlus size={24} />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2">
                                            <h3 className="text-xl font-black text-white uppercase tracking-tight truncate">{rec.name}</h3>
                                            {isAlreadyIn && (
                                                <span className="px-2 py-0.5 bg-blue-500/10 border border-blue-500/20 rounded-md text-[7px] font-black text-blue-400 uppercase tracking-widest">DÉJÀ ASSIGNÉ</span>
                                            )}
                                        </div>
                                        <div className="flex items-center gap-2 mt-1">
                                            <ShieldCheck size={12} className={isRecommended ? "text-emerald-500" : "text-slate-500"} />
                                            <span className={`text-[10px] font-black uppercase tracking-widest ${isRecommended ? "text-emerald-500" : "text-slate-500"}`}>
                                                FIT SCORE : {rec.ml_score}%
                                            </span>
                                        </div>
                                    </div>
                                </div>
                                {rec.recommended_extra > 0 && (
                                    <div className={`rounded-2xl p-3 text-right transition-colors ${isSelected ? 'bg-blue-500/10' : 'bg-white/5'}`}>
                                        <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest block mb-1">CHARGE ADDITIONNELLE</span>
                                        <span className="text-lg font-black text-white">+{rec.recommended_extra} <span className="text-[10px] text-blue-500">tests</span></span>
                                    </div>
                                )}
                            </div>

                            <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-4 mb-6 relative overflow-hidden">
                                <div className="absolute top-2 right-2 text-blue-500/10">
                                    <Brain size={40} />
                                </div>
                                <p className="text-[11px] text-slate-400 leading-relaxed relative z-10">
                                    {rec.ml_label || "Ressource qualifiée pour cette campagne."}
                                </p>
                            </div>

                            <div className="space-y-3">
                                <div className="flex justify-between text-[8px] font-black text-slate-500 uppercase tracking-widest">
                                    <span>Charge actuelle</span>
                                    <span className={rec.current_load > 8 ? 'text-rose-500' : 'text-emerald-500'}>
                                        {rec.current_load} units/jour
                                    </span>
                                </div>
                                <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden">
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

            {/* Action Footer */}
            <div className="flex items-center justify-between bg-white/[0.02] border border-white/5 p-8 rounded-[2rem]">
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 flex items-center justify-center text-emerald-500">
                        <Activity size={24} />
                    </div>
                    <div>
                        <h4 className="text-lg font-black text-white uppercase tracking-tight">
                            {selectedTesterIds.length} Testeur(s) sélectionné(s)
                        </h4>
                        <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">
                            Impact estimé : +{((plan.current_velocity || 0) * (1 + selectedTesterIds.length * 0.25)).toFixed(1)} tests/jour
                        </p>
                    </div>
                </div>
                
                <div className="flex gap-4">
                    <Button 
                        variant="secondary"
                        size="icon"
                        onClick={fetchPlan}
                        isLoading={loading}
                        disabled={applying}
                        icon={RefreshCw}
                    />
                    <Button 
                        variant="primary"
                        onClick={handleApplyPlan}
                        isLoading={applying}
                        disabled={applying || !plan || selectedTesterIds.length === 0}
                        icon={ArrowRight}
                        className="px-8"
                    >
                        {applying ? 'APPLICATION...' : 'APPLIQUER LA STRATÉGIE'}
                    </Button>
                </div>
            </div>
        </div>
    );
};

export default CatchupPlanIA;
