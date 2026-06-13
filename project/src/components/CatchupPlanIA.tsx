import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
    Clock, Brain, RefreshCw, Send, Users, Check, Plus, ArrowLeft, ArrowRight, User, AlertTriangle
} from 'lucide-react';
import { aiService } from '../services/api';
import { toast } from 'react-toastify';
import { useNavigate } from 'react-router-dom';

interface CatchupRecommendation {
    id: number;
    name: string;
    ml_score: number;
    ml_label: string;
    current_load: number;
    recommended_extra: number;
    status: string;
    is_already_in?: boolean;
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
    const navigate = useNavigate();
    const [plan, setPlan] = useState<any | null>(null);
    const [loading, setLoading] = useState(false);
    const [applying, setApplying] = useState(false);
    const [selectedTesterIds, setSelectedTesterIds] = useState<number[]>([]);
    const [assignments, setAssignments] = useState<Record<number, number>>({});
    const [notifying, setNotifying] = useState(false);
    const [monitoring, setMonitoring] = useState<any>(null);

    const fetchPlan = async () => {
        try {
            setLoading(true);
            const response = await aiService.getCatchupPlan(campaignId);
            const data = response.data;
            setPlan(data);

            if (data?.tester_distribution) {
                const recommended = data.tester_distribution
                    .filter((t: any) => t.status === 'RECOMMENDED')
                    .map((t: any) => t.id);
                setSelectedTesterIds(recommended);

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
                setAssignments({ ...assignments, [id]: 10 });
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
            <div className="bg-[#111827] border border-white/5 rounded-2xl p-12 flex flex-col items-center justify-center space-y-6">
                <div className="relative">
                    <div className="w-16 h-16 border-4 border-[#378ADD]/20 border-t-[#378ADD] rounded-full animate-spin" />
                    <Brain className="absolute inset-0 m-auto text-[#378ADD] animate-pulse" size={24} />
                </div>
                <div className="text-center">
                    <h3 className="text-white font-medium text-sm mb-2">Préparation des Recommandations</h3>
                    <p className="text-white/40 text-[10px] uppercase font-bold tracking-tight">L'assistant cherche les meilleurs testeurs...</p>
                </div>
            </div>
        );
    }

    if (!plan) return null;

    const delayDays = plan.delay_days || 0;
    const reqVel = Math.round(plan.required_velocity || 0);
    const curVel = Math.round(plan.current_velocity || 0);
    const velRatio = curVel > 0 ? Math.round(reqVel / curVel) : reqVel;

    return (
        <div className="flex flex-col gap-[10px] animate-fade-in relative pb-4">
            {/* Bouton Retour (si onClose est fourni, sinon on l'affiche quand même par défaut) */}
            {onClose && (
                <button
                    onClick={onClose}
                    className="flex items-center gap-2 text-[12px] font-medium text-white/40 hover:text-white transition-colors self-start mb-2"
                >
                    <ArrowLeft size={14} /> Retour aux détails
                </button>
            )}

            {/* Section 1 — Header */}
            <div className="bg-[#111827] rounded-[14px] border-[0.5px] border-white/[0.08] p-4">
                <div className="flex items-center gap-2 mb-3">
                    <div className="px-3 py-1 bg-[#378ADD]/15 rounded-full flex items-center justify-center">
                        <span className="text-[11px] font-semibold text-[#85B7EB]">Recommandation</span>
                    </div>
                    <div className="px-3 py-1 bg-[#E24B4A]/15 rounded-full flex items-center justify-center gap-1.5">
                        <Clock size={12} className="text-[#F09595]" />
                        <span className="text-[11px] font-semibold text-[#F09595]">Retard : {delayDays} jours</span>
                    </div>
                </div>

                <h2 className="text-[18px] font-medium text-[#e8eaf6] mb-2">{plan.campaign_title || 'Optimisation de Campagne'}</h2>
                <div className="border-l-[2px] border-[#378ADD]/40 pl-3 mb-5">
                    <p className="text-[12px] italic text-white/40">"{plan.recommendation_engine || "Modèle d'analyse de performance v1.0"}"</p>
                </div>

                <div className="grid grid-cols-2 gap-3">
                    <div className="bg-[#1a2235] rounded-[10px] px-[13px] py-[11px]">
                        <div className="text-[10px] font-bold text-white/40 uppercase tracking-widest mb-1">RYTHME NÉCESSAIRE</div>
                        <div className="flex items-baseline gap-1">
                            <span className="text-[20px] font-bold text-white leading-none">{reqVel}</span>
                            <span className="text-[12px] text-white/40">tests/j</span>
                        </div>
                    </div>
                    <div className="bg-[#1a2235] rounded-[10px] px-[13px] py-[11px] relative">
                        <div className="text-[10px] font-bold text-white/40 uppercase tracking-widest mb-1">RYTHME ACTUEL</div>
                        <div className="flex items-baseline gap-1 mb-1">
                            <span className="text-[20px] font-bold text-[#F09595] leading-none">{curVel}</span>
                            <span className="text-[12px] text-white/40">tests/j</span>
                        </div>
                        {reqVel > curVel && (
                            <div className="absolute right-[13px] top-[11px] bg-[#E24B4A]/10 px-2 py-0.5 rounded-md flex items-center gap-1 border border-[#E24B4A]/20">
                                <AlertTriangle size={10} className="text-[#F09595]" />
                                <span className="text-[9px] font-bold text-[#F09595]">×{velRatio} en dessous</span>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Section 2 — Timeline Projection IA */}
            <div className="bg-[#111827] rounded-[14px] border-[0.5px] border-white/[0.08] p-4">
                <div className="flex items-center justify-between mb-6">
                    <div className="text-[11px] font-medium text-white/40 tracking-widest uppercase">PROJECTION IA — IMPACT DU RETARD</div>
                    <div className="bg-[#E24B4A]/15 px-3 py-1 rounded-full border border-[#E24B4A]/20">
                        <span className="text-[11px] font-semibold text-[#F09595]">+{delayDays} jours</span>
                    </div>
                </div>

                <div className="relative mb-3 pt-2">
                    <div className="h-[6px] w-full rounded-[3px] bg-[#E24B4A] flex items-center relative">
                        <div className="h-full rounded-l-[3px] bg-[#1D9E75]" style={{ width: '35%' }}></div>
                        {/* Marqueur Bleu */}
                        <div className="absolute w-3 h-3 rounded-full bg-[#378ADD] border-[2px] border-[#111827]" style={{ left: 'calc(35% - 6px)' }}></div>
                        {/* Marqueur Ambré */}
                        <div className="absolute w-3 h-3 rounded-full bg-[#EF9F27] border-[2px] border-[#111827]" style={{ left: 'calc(50% - 6px)' }}></div>
                    </div>
                </div>

                <div className="grid grid-cols-4 gap-2 text-center">
                    <div className="flex flex-col items-start">
                        <span className="text-[9px] font-bold text-white/40 uppercase tracking-widest mb-0.5">DÉBUT</span>
                        <span className="text-[11px] font-medium text-white/60">{formatDate(plan.start_date)}</span>
                    </div>
                    <div className="flex flex-col items-center">
                        <span className="text-[9px] font-bold text-[#378ADD] uppercase tracking-widest mb-0.5">AUJOURD'HUI</span>
                        <span className="text-[11px] font-medium text-[#378ADD]">{formatDate(new Date())}</span>
                    </div>
                    <div className="flex flex-col items-center">
                        <span className="text-[9px] font-bold text-white/40 uppercase tracking-widest mb-0.5">DEADLINE</span>
                        <span className="text-[11px] font-medium text-white/60">{formatDate(plan.deadline)}</span>
                    </div>
                    <div className="flex flex-col items-end">
                        <span className="text-[9px] font-bold text-[#F09595] uppercase tracking-widest mb-0.5">FIN ESTIMÉE</span>
                        <span className="text-[11px] font-medium text-[#F09595]">{formatDate(plan.projected_end_date)}</span>
                    </div>
                </div>
            </div>

            {/* Section 3 — Testeurs recommandés */}
            <div className="bg-[#111827] rounded-[14px] p-4">
                <div className="flex items-center gap-2 mb-4 text-[10px] font-bold text-white/40 uppercase tracking-widest">
                    <Users size={12} />
                    TESTEURS RECOMMANDÉS PAR L'IA
                </div>

                <div className="grid grid-cols-2 gap-[8px]">
                    {(plan.tester_distribution || []).map((rec: any, idx: number) => {
                        const isSelected = selectedTesterIds.includes(rec.id);
                        return (
                            <div
                                key={rec.id}
                                onClick={() => toggleTesterSelection(rec.id)}
                                className={`bg-[#1a2235] rounded-[10px] border-[0.5px] p-3 flex flex-col justify-between cursor-pointer transition-all ${isSelected ? 'border-[#378ADD]' : 'border-[#378ADD]/20 hover:border-[#378ADD]/40'}`}
                            >
                                <div className="flex gap-3 mb-3">
                                    <div className="w-[34px] h-[34px] rounded-[10px] bg-[#185FA5] flex items-center justify-center shrink-0">
                                        <User size={16} className="text-white" />
                                    </div>
                                    <div className="flex flex-col justify-center">
                                        <span className="text-[13px] font-medium text-white leading-tight">{rec.name}</span>
                                        <div className="flex items-center gap-1 mt-0.5 text-[#5DCAA5]">
                                            <span className="text-[11px] font-semibold">{rec.ml_score}% fit</span>
                                        </div>
                                    </div>
                                </div>

                                <div className="bg-white/[0.06] rounded-[6px] py-1 px-2 text-center mb-3">
                                    <span className="text-[11px] text-white/40">{rec.ml_label || 'Stable'}</span>
                                </div>

                                <button
                                    className={`w-full py-1.5 rounded-[7px] border-[0.5px] flex items-center justify-center gap-1 text-[11px] font-semibold transition-all ${isSelected ? 'bg-[#378ADD] text-white border-[#378ADD]' : 'bg-[#378ADD]/10 text-[#85B7EB] border-[#378ADD]/20 hover:bg-[#378ADD]/20'}`}
                                >
                                    {isSelected ? <Check size={12} /> : <Plus size={12} />}
                                    {isSelected ? 'Ajouté' : `Ajouter · +${rec.recommended_extra || 9} tests`}
                                </button>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Section 4 — Suivi des notifications */}
            <div className="bg-[#111827] rounded-[14px] p-4">
                <div className="flex items-center justify-between mb-4">
                    <div>
                        <div className="text-[13px] font-medium text-white leading-tight mb-0.5">Suivi des notifications</div>
                        <div className="text-[11px] text-white/40">Mise à jour toutes les 15s</div>
                    </div>
                    {monitoring?.summary?.accepted > 0 && (
                        <div className="bg-[#1D9E75]/15 border border-[#1D9E75]/20 px-3 py-1 rounded-full">
                            <span className="text-[11px] font-semibold text-[#5DCAA5]">{monitoring.summary.accepted} accepté</span>
                        </div>
                    )}
                </div>

                <div className="flex flex-col gap-2">
                    {monitoring?.notifications?.map((n: any) => (
                        <div key={n.tester_id} className="bg-[#1a2235] rounded-[9px] px-[11px] py-[9px] flex items-center justify-between">
                            <div className="flex items-center gap-2 overflow-hidden flex-1 pr-4">
                                <div className={`w-[28px] h-[28px] rounded-full flex items-center justify-center shrink-0 text-[12px] font-bold text-white ${n.status === 'ACCEPTED' ? 'bg-[#1D9E75]' : 'bg-[#378ADD]'}`}>
                                    {n.tester_name?.charAt(0).toUpperCase() || 'U'}
                                </div>
                                <div className="flex flex-col min-w-0">
                                    <span className="text-[12px] font-medium text-white truncate">{n.tester_name}</span>
                                    <span className="text-[10px] text-white/40 truncate">{n.tester_email}</span>
                                </div>
                            </div>
                            <div className="flex items-center gap-4 shrink-0">
                                <div className="flex flex-col items-end">
                                    <span className="text-[9px] font-bold text-white/40 uppercase tracking-widest">ENVOYÉ</span>
                                    <span className="text-[11px] text-white/60">{n.sent_at || '—'}</span>
                                </div>
                                <div className="flex flex-col items-end">
                                    <span className="text-[9px] font-bold text-white/40 uppercase tracking-widest">RÉPONDU</span>
                                    <span className="text-[11px] text-white/60">{n.replied_at || '—'}</span>
                                </div>
                                <div className={`px-2 py-0.5 rounded-[6px] border ${n.status === 'ACCEPTED' ? 'bg-[#1D9E75]/15 border-[#1D9E75]/30' : 'bg-[#378ADD]/15 border-[#378ADD]/30'}`}>
                                    <span className={`text-[10px] font-semibold ${n.status === 'ACCEPTED' ? 'text-[#5DCAA5]' : 'text-[#85B7EB]'}`}>
                                        {n.status === 'ACCEPTED' ? 'Accepté' : 'Envoyé'}
                                    </span>
                                </div>
                            </div>
                        </div>
                    ))}
                    {(!monitoring?.notifications || monitoring.notifications.length === 0) && (
                        <div className="text-[11px] text-white/40 italic py-2">Aucune notification en cours.</div>
                    )}
                </div>
            </div>

            {/* Section 5 — Footer action */}
            <div className="flex flex-col gap-3">
                <div className="bg-[#111827] rounded-[14px] border-[0.5px] border-[#378ADD]/20 p-[14px] flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-[34px] h-[34px] rounded-[8px] bg-[#378ADD]/10 flex items-center justify-center shrink-0 border border-[#378ADD]/20">
                            <Users size={16} className="text-[#378ADD]" />
                        </div>
                        <div>
                            <div className="text-[13px] font-medium text-white">{selectedTesterIds.length} testeur(s) sélectionné(s)</div>
                            <div className="text-[11px] text-white/40">Impact estimé : +{Math.round((plan.current_velocity || 0) * (selectedTesterIds.length * 0.25))} tests/jour</div>
                        </div>
                    </div>
                    <div className="flex gap-2">
                        <button
                            onClick={fetchPlan}
                            className="w-[34px] h-[34px] flex items-center justify-center rounded-[8px] border border-white/10 hover:bg-white/5 transition-colors text-white/60 hover:text-white"
                        >
                            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
                        </button>
                        <button
                            onClick={handleNotifyN8N}
                            disabled={notifying || selectedTesterIds.length === 0}
                            className="h-[34px] px-4 bg-[#378ADD] hover:bg-[#2e75bc] disabled:opacity-50 text-white rounded-[8px] text-[13px] font-medium flex items-center gap-2 transition-colors"
                        >
                            <Send size={14} />
                            {notifying ? 'Envoi...' : 'Informer'}
                        </button>
                    </div>
                </div>
                
            </div>
        </div>
    );
};

export default CatchupPlanIA;
