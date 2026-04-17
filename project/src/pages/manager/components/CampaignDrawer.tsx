import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    X, Calendar, CheckCircle2, XCircle, AlertTriangle, Loader2, Award,
    CheckCircle, FileText, Zap, TrendingUp, Clock, FileSpreadsheet, History,
    ChevronRight, ArrowRight
} from 'lucide-react';
import { aiService, anomalyService } from '../../../services/api';
import ReadinessGauge from '../../../components/ReadinessGauge';
import ReadinessDetailModal from '../../../components/ReadinessDetailModal';
import AIInsightModal from '../../../components/AIInsightModal';
import CatchupPlanIA from '../../../components/CatchupPlanIA';
import { useNavigate } from 'react-router-dom';
import { createPortal } from 'react-dom';

interface Campaign {
    id: number;
    title: string;
    project_name?: string;
    nb_test_cases: number;
    passed_count?: number;
    failed_count?: number;
    start_date?: string;
    estimated_end_date?: string;
    created_at?: string;
    description?: string;
}

interface CampaignDrawerProps {
    campaign: Campaign | null;
    isOpen: boolean;
    onClose: () => void;
}

const Section: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <div style={{
        background: 'rgba(255,255,255,0.02)',
        border: '0.5px solid rgba(255,255,255,0.06)',
        borderRadius: 16,
        padding: '20px 20px',
    }}>
        {children}
    </div>
);

const SectionLabel: React.FC<{ icon?: React.ReactNode; children: React.ReactNode }> = ({ icon, children }) => (
    <div style={{
        display: 'flex', alignItems: 'center', gap: 6,
        fontSize: 10, fontWeight: 800, letterSpacing: '0.08em',
        textTransform: 'uppercase', color: '#4b5563',
        marginBottom: 14,
    }}>
        {icon}
        {children}
    </div>
);

const CampaignDrawer: React.FC<CampaignDrawerProps> = ({ campaign, isOpen, onClose }) => {
    const navigate = useNavigate();
    const [readiness, setReadiness] = useState<any>(null);
    const [anomalies, setAnomalies] = useState<any[]>([]);
    const [loadingReadiness, setLoadingReadiness] = useState(false);
    const [isDetailOpen, setIsDetailOpen] = useState(false);
    const [isAIModalOpen, setIsAIModalOpen] = useState(false);
    const [aiInsight, setAiInsight] = useState<string | undefined>(undefined);
    const [catchupData, setCatchupData] = useState<any | null>(null);
    const [isCatchupPlanOpen, setIsCatchupPlanOpen] = useState(false);

    useEffect(() => {
        if (!campaign || !isOpen) return;
        setReadiness(null);
        setAnomalies([]);

        const fetchDetails = async () => {
            setLoadingReadiness(true);
            try {
                const [readinessRes, anomalyRes, guardRes] = await Promise.allSettled([
                    aiService.getReadinessScore(campaign.id),
                    anomalyService.getAnomalies({ campaign_id: campaign.id }),
                    aiService.getTimelineGuard(campaign.id.toString())
                ]);
                if (readinessRes.status === 'fulfilled') setReadiness(readinessRes.value.data);
                if (anomalyRes.status === 'fulfilled') {
                    const d = anomalyRes.value.data;
                    setAnomalies(d.results || d);
                }
                if (guardRes.status === 'fulfilled') {
                    setAiInsight(guardRes.value.data.message);
                }

                // Fetch catchup plan for detailed insight
                const catchupRes = await aiService.getCatchupPlan(campaign.id);
                setCatchupData(catchupRes.data);
            } catch {
                // Silently fail
            } finally {
                setLoadingReadiness(false);
            }
        };

        fetchDetails();
    }, [campaign, isOpen]);

    if (!campaign) return null;

    const total = campaign.nb_test_cases || 0;
    const passed = campaign.passed_count || 0;
    const failed = total - passed;
    const rate = total > 0 ? Math.round((passed / total) * 100) : 0;
    const velocity = 4; // Mock or from AI service

    return (
        <>
            <AnimatePresence>
                {isOpen && (
                    <>
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={onClose}
                            className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm"
                        />
                        <motion.div
                            initial={{ x: '100%' }}
                            animate={{ x: 0 }}
                            exit={{ x: '100%' }}
                            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                            className="fixed right-0 top-0 bottom-0 z-[110] w-full max-w-lg bg-[#0b0e14] border-l border-white/5 flex flex-col shadow-2xl"
                        >
                            {/* Drawer Content wrapper */}
                            <div className="flex-1 overflow-y-auto custom-scrollbar p-8">
                                {/* Top Actions */}
                                <div className="flex justify-end gap-3 mb-8 items-start">
                                    {/* Un bouton de fermeture plus visible ou autre action pourrait aller ici si besoin */}
                                </div>

                                {/* Icon & Title */}
                                <div className="mb-8">
                                    <div className="w-16 h-16 rounded-2xl bg-blue-500/10 border border-white/5 flex items-center justify-center text-blue-400 mb-6">
                                        <FileText size={28} />
                                    </div>
                                    <h2 className="text-3xl font-black text-white leading-tight mb-2">
                                        {campaign.title}
                                    </h2>

                                    {/* Subtitle */}
                                    <p className="text-sm text-slate-300 leading-relaxed mb-8">
                                        {campaign.description || "Vérification du taux de faux positifs sur la détection de faux bulletins de salaire."}
                                    </p>

                                    {/* Meta row */}
                                    <div className="flex items-center gap-3">
                                        <div className="px-3 py-1.5 bg-white/5 border border-white/10 rounded-xl flex items-center gap-2">
                                            <Calendar size={14} className="text-slate-500" />
                                            <span className="text-xs font-bold text-slate-300">11/04/2026</span>
                                        </div>
                                        <div className="px-3 py-1.5 bg-white/5 border border-white/10 rounded-xl flex items-center gap-2">
                                            <Clock size={14} className="text-slate-500" />
                                            <span className="text-xs font-bold text-slate-400">
                                                Deadline <span className="text-slate-200">18 avr.</span>
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                {/* PROGRESSION & CADENCE Section */}
                                <div className="bg-[#151921] border border-white/5 rounded-3xl p-6 mb-8">
                                    <div className="flex items-center gap-2 text-[10px] font-black text-slate-600 uppercase tracking-widest mb-8">
                                        <TrendingUp size={14} />
                                        Progression & Cadence
                                    </div>

                                    <div className="flex items-center gap-10 mb-10">
                                        {/* Donut percentage */}
                                        <div className="relative w-24 h-24 flex-shrink-0">
                                            <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
                                                <circle cx="50" cy="50" r="42" fill="none" stroke="rgba(255,255,255,0.03)" strokeWidth="12" />
                                                <motion.circle
                                                    cx="50" cy="50" r="42" fill="none"
                                                    stroke="#f97316" strokeWidth="12"
                                                    strokeDasharray={2 * Math.PI * 42}
                                                    initial={{ strokeDashoffset: 2 * Math.PI * 42 }}
                                                    animate={{ strokeDashoffset: (2 * Math.PI * 42) * (1 - rate / 100) }}
                                                    transition={{ duration: 1.5, ease: 'easeOut' }}
                                                    strokeLinecap="round"
                                                />
                                            </svg>
                                            <div className="absolute inset-0 flex items-center justify-center">
                                                <span className="text-xl font-black text-white">{rate}%</span>
                                            </div>
                                        </div>

                                        {/* Progress details */}
                                        <div className="flex-1 min-w-0">
                                            <div className="flex justify-between items-center mb-4">
                                                <div className="flex items-center gap-2">
                                                    <CheckCircle2 size={16} className="text-emerald-500" />
                                                    <span className="text-xs font-black text-emerald-400">{passed} validés</span>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <XCircle size={16} className="text-rose-500" />
                                                    <span className="text-xs font-black text-rose-400">{failed} restants</span>
                                                </div>
                                            </div>
                                            <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden mb-3">
                                                <motion.div
                                                    initial={{ width: 0 }}
                                                    animate={{ width: `${rate}%` }}
                                                    className="h-full bg-orange-600 rounded-full"
                                                />
                                            </div>
                                            <div className="flex justify-between text-[8px] font-black text-slate-600 uppercase tracking-widest">
                                                <span>{passed} TESTS VALIDÉS</span>
                                                <span>CIBLE : {total}</span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Velocity Grid */}
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-4">
                                            <div className="flex items-center gap-2 text-[9px] font-black text-slate-600 uppercase tracking-widest mb-2">
                                                <TrendingUp size={12} className="text-slate-600" />
                                                Cadence IA
                                            </div>
                                            <div className="text-xl font-black text-white">
                                                {catchupData?.current_velocity || 0} <span className="text-xs text-slate-500">tests/j</span>
                                            </div>
                                        </div>
                                        <div className="bg-white/[0.02] border border-rose-500/30 rounded-2xl p-4 relative overflow-hidden">
                                            <div className="absolute inset-0 bg-rose-500/5" />
                                            <div className="relative">
                                                <div className="flex items-center gap-2 text-[9px] font-black text-rose-500 uppercase tracking-widest mb-2">
                                                    <Clock size={12} />
                                                    Fin estimée
                                                </div>
                                                <div className="text-xl font-black text-rose-500">
                                                    {catchupData ? new Date(catchupData.deadline).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' }) : '...'}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* INSIGHT IA Section - Functional & Intelligent */}
                                <AnimatePresence>
                                    {catchupData && catchupData.delay_days > 0 && (
                                        <motion.div
                                            initial={{ opacity: 0, scale: 0.95 }}
                                            animate={{ opacity: 1, scale: 1 }}
                                            className="bg-blue-600/5 border border-blue-600/10 rounded-3xl p-6 relative overflow-hidden mb-10 shadow-lg shadow-blue-900/10"
                                        >
                                            <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 blur-[60px] -mr-16 -mt-16 rounded-full pointer-events-none" />

                                            <div className="flex items-center gap-3 mb-6">
                                                <div className="w-8 h-8 rounded-xl bg-blue-500/20 flex items-center justify-center text-blue-400">
                                                    <Zap size={16} className="fill-blue-400/20" />
                                                </div>
                                                <span className="text-xs font-black text-blue-400 uppercase tracking-widest">Insight IA</span>
                                            </div>
                                            <p className="text-sm text-slate-400 leading-relaxed mb-6 italic">
                                                Il est essentiel d'accélérer le rythme des tests pour atteindre l'objectif, car le délai du {new Date(catchupData.deadline).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })} ne sera pas respecté sans intervention.
                                            </p>
                                            <button
                                                onClick={() => setIsAIModalOpen(true)}
                                                className="px-6 py-3 bg-[#131722]/80 border border-white/10 rounded-[1.2rem] text-[10px] font-black uppercase tracking-[widest] text-white transition-all hover:bg-white hover:text-black flex items-center gap-3 group/btn shadow-xl"
                                            >
                                                Lire la suite
                                                <ArrowRight size={14} className="group-hover/btn:translate-x-1.5 transition-transform" />
                                            </button>
                                        </motion.div>
                                    )}
                                </AnimatePresence>

                                {/* Footer content */}
                                <div className="pt-10 border-t border-white/5 flex items-center justify-between mb-8">
                                    <div className="flex items-center gap-4">
                                        <div className="flex -space-x-2">
                                            <div className="w-10 h-10 rounded-full bg-blue-600 border-2 border-[#0b0e14] flex items-center justify-center text-xs font-black text-white">T</div>
                                            <div className="w-10 h-10 rounded-full bg-emerald-600 border-2 border-[#0b0e14] flex items-center justify-center text-xs font-black text-white">T</div>
                                        </div>
                                        <div className="flex flex-col">
                                            <span className="text-sm font-black text-white leading-none mb-1">2</span>
                                            <span className="text-[10px] font-black text-slate-600 uppercase tracking-widest">Testeurs</span>
                                        </div>
                                    </div>

                                    <div className="w-24 h-16 bg-white/[0.03] border border-white/5 rounded-2xl flex flex-col items-center justify-center">
                                        <span className="text-2xl font-black text-white leading-none mb-1">{total}</span>
                                        <span className="text-[9px] font-black text-slate-600 uppercase tracking-widest">Cas Test</span>
                                    </div>
                                </div>

                                {/* VOIR LE CAHIER DE TESTS Button */}
                                <button
                                    onClick={() => navigate('/explorer')}
                                    className="w-full py-5 bg-[#0b0e14] border border-white/10 rounded-2xl flex items-center justify-center gap-4 text-sm font-black uppercase tracking-widest text-white hover:bg-white/5 transition-all group/footer"
                                >
                                    <div className="flex flex-col gap-1 items-center justify-center scale-75 group-hover/footer:scale-90 transition-transform">
                                        <div className="w-2 h-2 rounded-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.5)]" />
                                        <div className="w-2 h-2 rounded-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.5)]" />
                                        <div className="w-2 h-2 rounded-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.5)]" />
                                    </div>
                                    Voir le cahier de tests
                                </button>
                            </div>

                            {/* Close button top right */}
                            <button
                                onClick={onClose}
                                className="absolute top-8 left-8 p-3 hover:bg-white/5 rounded-full text-slate-500 transition-all"
                            >
                                <X size={24} />
                            </button>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>

            <ReadinessDetailModal
                isOpen={isDetailOpen}
                onClose={() => setIsDetailOpen(false)}
                data={readiness}
                title={campaign.title}
                aiInsight={aiInsight}
            />
            <AIInsightModal
                isOpen={isAIModalOpen}
                onClose={() => setIsAIModalOpen(false)}
                title={campaign.title}
                insight={aiInsight || "Analyse en attente..."}
                onOptimize={() => setIsCatchupPlanOpen(true)}
                showOptimizeButton={catchupData && catchupData.delay_days > 0}
            />

            {/* AI Catchup Plan Modal */}
            {isCatchupPlanOpen && createPortal(
                <div className="fixed inset-0 z-[2000] flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-4 overflow-y-auto">
                    <div className="relative w-full max-w-2xl my-8">
                        <button
                            onClick={() => setIsCatchupPlanOpen(false)}
                            className="absolute -top-12 right-0 text-white/50 hover:text-white transition-colors"
                        >
                            <X className="w-8 h-8" />
                        </button>
                        <CatchupPlanIA
                            campaignId={campaign.id}
                            onClose={() => setIsCatchupPlanOpen(false)}
                        />
                    </div>
                </div>,
                document.body
            )}
        </>
    );
};

export default CampaignDrawer;
