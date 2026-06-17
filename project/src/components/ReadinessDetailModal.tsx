import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { createPortal } from 'react-dom';
import { X, Loader2 } from 'lucide-react';
import { aiService } from '../services/api';
import { toast } from 'react-toastify';

interface ReadinessDetailModalProps {
    isOpen: boolean;
    onClose: () => void;
    data: {
        score: number;
        reasons: string[];
        breakdown: Record<string, number>;
        source_data?: {
            campaign_id?: number;
            tests: { passed: number; total: number; percent: number };
            anomalies: { total: number; critical: number; blocking: number; penalty: number };
            ml: { status: string; delay_days: number; confidence: number };
        };
    } | null;
    title: string;
    aiInsight?: string;
}

const getMlColor = (status: string) => {
    if (status === 'OPTIMAL') return { text: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20' };
    if (status === 'WARNING') return { text: 'text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/20' };
    if (status === 'CRITICAL') return { text: 'text-rose-400', bg: 'bg-rose-500/10', border: 'border-rose-500/20' };
    return { text: 'text-slate-400', bg: 'bg-white/[0.02]', border: 'border-white/5' };
};

const ReadinessDetailModal: React.FC<ReadinessDetailModalProps> = ({ isOpen, onClose, data, title }) => {
    const [isExporting, setIsExporting] = useState(false);

    if (!data) return null;

    const handleExport = async () => {
        const campaignId = data.source_data?.campaign_id;
        if (!campaignId) {
            toast.error("ID de campagne manquant pour l'export.");
            return;
        }
        try {
            setIsExporting(true);
            const response = await aiService.exportClosureReport(campaignId);
            const blob = new Blob([response.data], { type: 'application/pdf' });
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `fiche_cloture_${campaignId}.pdf`);
            document.body.appendChild(link);
            link.click();
            link.parentNode?.removeChild(link);
            toast.success("Fiche de clôture générée avec succès !");
        } catch (error) {
            toast.error("Erreur lors de la génération du PDF.");
        } finally {
            setIsExporting(false);
        }
    };

    const score = data.score;
    const scoreColor = score >= 80 ? '#10b981' : score >= 40 ? '#f59e0b' : '#ef4444';
    const scoreLabel = score >= 80 ? 'STABLE' : score >= 40 ? 'WARNING' : 'CRITIQUE';
    const scoreBgClass = score >= 80 ? 'bg-emerald-500/10 border-emerald-500/20' : score >= 40 ? 'bg-amber-500/10 border-amber-500/20' : 'bg-rose-500/10 border-rose-500/20';
    const scoreTextClass = score >= 80 ? 'text-emerald-400' : score >= 40 ? 'text-amber-400' : 'text-rose-400';

    const sd = data.source_data;
    const bd = data.breakdown;
    const mlStatus = sd?.ml?.status || 'INITIAL';
    const mlColors = getMlColor(mlStatus);

    const testBarPct = Math.min(100, bd.test_pass_rate != null ? (bd.test_pass_rate / 40) * 100 : 0);
    const mlBarPct = Math.min(100, bd.ml_stability != null ? (bd.ml_stability / 30) * 100 : 0);
    const anomalyBarPct = Math.min(100, bd.anomalies_health != null ? (bd.anomalies_health / 20) * 100 : 0);
    const blockingBarPct = Math.min(100, bd.blocking_guard != null ? (bd.blocking_guard / 10) * 100 : 0);

    if (typeof document === 'undefined') return null;

    return createPortal(
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4">
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="absolute inset-0 bg-slate-950/90 backdrop-blur-xl"
                    />

                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 20 }}
                        transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
                        className="relative w-full max-w-2xl bg-[#060a16] border border-white/[0.08] rounded-3xl shadow-[0_0_100px_rgba(0,0,0,0.9)] overflow-hidden"
                    >
                        {/* Gradient top accent */}
                        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-blue-500/50 to-transparent" />

                        {/* Header */}
                        <div className="relative px-7 pt-6 pb-5 border-b border-white/[0.06]">
                            <div className="flex items-start justify-between gap-4">
                                <div>
                                    <span className="text-[9px] font-black text-blue-400/70 uppercase tracking-[0.25em] block mb-1">Analyse Prédictive</span>
                                    <h2 className="text-lg font-black text-white tracking-tight uppercase leading-tight">
                                        {title}
                                    </h2>
                                </div>
                                <button
                                    onClick={onClose}
                                    className="p-2.5 bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.06] rounded-xl transition-all text-slate-400 hover:text-white shrink-0 mt-0.5"
                                >
                                    <X size={16} />
                                </button>
                            </div>
                        </div>

                        {/* Scrollable Content */}
                        <div className="max-h-[65vh] overflow-y-auto custom-scrollbar p-7 space-y-6">

                            {/* SCORE HERO */}
                            <div className={`flex items-center gap-6 p-5 ${scoreBgClass} border rounded-2xl`}>
                                <div className="relative w-[80px] h-[80px] shrink-0">
                                    <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                                        <circle cx="50" cy="50" r="42" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="9" />
                                        <motion.circle
                                            cx="50" cy="50" r="42" fill="none"
                                            stroke={scoreColor}
                                            strokeWidth="9"
                                            strokeDasharray={2 * Math.PI * 42}
                                            initial={{ strokeDashoffset: 2 * Math.PI * 42 }}
                                            animate={{ strokeDashoffset: (2 * Math.PI * 42) * (1 - score / 100) }}
                                            transition={{ duration: 1.5, ease: "easeOut" }}
                                            strokeLinecap="round"
                                        />
                                    </svg>
                                    <div className="absolute inset-0 flex items-center justify-center">
                                        <span className="text-xl font-black text-white leading-none">{score}%</span>
                                    </div>
                                </div>

                                <div className="flex-1 min-w-0">
                                    <div className="text-[8px] font-black text-white/30 uppercase tracking-[0.2em] mb-1.5">STATUT GLOBAL</div>
                                    <div className={`text-sm font-black tracking-wider mb-3 ${scoreTextClass}`}>
                                        {scoreLabel}
                                    </div>
                                    <p className={`text-[10px] font-semibold ${scoreTextClass} opacity-80 leading-relaxed`}>
                                        {data.reasons && data.reasons.length > 0
                                            ? data.reasons[0]
                                            : 'La situation est optimale, aucune alerte majeure.'
                                        }
                                        {sd?.ml?.delay_days ? (
                                            <span className="block opacity-60 mt-0.5">Retard estimé : {sd.ml.delay_days} jours.</span>
                                        ) : null}
                                    </p>
                                </div>
                            </div>

                            {/* AUDIT TRAIL — 4 cards */}
                            <div>
                                <span className="text-[8px] font-black text-white/30 uppercase tracking-[0.2em] block mb-3">Audit Trail — Journal de Transparence</span>
                                <div className="grid grid-cols-2 gap-3">

                                    {/* Tests & Qualité */}
                                    <div className="p-4 bg-white/[0.02] border border-white/[0.06] rounded-2xl hover:bg-white/[0.04] transition-colors">
                                        <span className="text-[8px] font-black text-white/40 uppercase tracking-widest block mb-3">Tests & Qualité</span>
                                        {sd ? (
                                            <>
                                                <div className="text-2xl font-black text-white mb-0.5">{sd.tests.passed}<span className="text-white/30 text-base font-bold"> / {sd.tests.total}</span></div>
                                                <div className="text-[9px] font-semibold text-white/40 mb-2">tests validés · taux réel {sd.tests.percent}%</div>
                                                <div className="h-1 w-full bg-white/[0.05] rounded-full overflow-hidden">
                                                    <motion.div
                                                        initial={{ width: 0 }}
                                                        animate={{ width: `${testBarPct}%` }}
                                                        transition={{ duration: 1, ease: "easeOut" }}
                                                        className="h-full bg-emerald-500 rounded-full"
                                                    />
                                                </div>
                                                <div className="text-[8px] text-white/25 mt-1 text-right">{bd.test_pass_rate?.toFixed(1)} / 40 pts</div>
                                            </>
                                        ) : (
                                            <>
                                                <div className="text-2xl font-black text-white/30 mb-0.5">— / —</div>
                                                <div className="text-[9px] text-white/30">Chargement...</div>
                                            </>
                                        )}
                                    </div>

                                    {/* Anomalies */}
                                    <div className={`p-4 rounded-2xl border transition-colors ${sd && sd.anomalies.total > 0 ? 'bg-rose-500/5 border-rose-500/15' : 'bg-white/[0.02] border-white/[0.06] hover:bg-white/[0.04]'}`}>
                                        <span className="text-[8px] font-black text-white/40 uppercase tracking-widest block mb-3">Anomalies</span>
                                        {sd ? (
                                            <>
                                                <div className={`text-2xl font-black mb-0.5 ${sd.anomalies.total > 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
                                                    {sd.anomalies.total} <span className="text-base font-bold opacity-70">actives</span>
                                                </div>
                                                <div className="text-[9px] font-semibold text-white/40 mb-2">{sd.anomalies.critical} critiques · pénalité -{sd.anomalies.penalty} pts</div>
                                                <div className="h-1 w-full bg-white/[0.05] rounded-full overflow-hidden">
                                                    <motion.div
                                                        initial={{ width: 0 }}
                                                        animate={{ width: `${anomalyBarPct}%` }}
                                                        transition={{ duration: 1, delay: 0.1, ease: "easeOut" }}
                                                        className="h-full bg-amber-500 rounded-full"
                                                    />
                                                </div>
                                                <div className="text-[8px] text-white/25 mt-1 text-right">{bd.anomalies_health?.toFixed(1)} / 20 pts</div>
                                            </>
                                        ) : (
                                            <div className="text-2xl font-black text-white/30 mb-0.5">0 actives</div>
                                        )}
                                    </div>

                                    {/* Prédiction ML */}
                                    <div className={`p-4 rounded-2xl border transition-colors ${mlColors.bg} ${mlColors.border}`}>
                                        <span className="text-[8px] font-black text-white/40 uppercase tracking-widest block mb-3">Prédiction ML</span>
                                        {sd ? (
                                            <>
                                                <div className={`text-2xl font-black mb-0.5 ${mlColors.text}`}>{sd.ml.status}</div>
                                                <div className="text-[9px] font-semibold text-white/40 mb-2">
                                                    {sd.ml.delay_days > 0 ? `+${sd.ml.delay_days}j retard · ` : 'Aucun retard · '}
                                                    IA à {Math.round(sd.ml.confidence * 100)}%
                                                </div>
                                                <div className="h-1 w-full bg-white/[0.05] rounded-full overflow-hidden">
                                                    <motion.div
                                                        initial={{ width: 0 }}
                                                        animate={{ width: `${mlBarPct}%` }}
                                                        transition={{ duration: 1, delay: 0.2, ease: "easeOut" }}
                                                        className="h-full rounded-full"
                                                        style={{
                                                            backgroundColor: mlStatus === 'OPTIMAL' ? '#10b981' : mlStatus === 'WARNING' ? '#f59e0b' : mlStatus === 'CRITICAL' ? '#ef4444' : '#64748b'
                                                        }}
                                                    />
                                                </div>
                                                <div className="text-[8px] text-white/25 mt-1 text-right">{bd.ml_stability?.toFixed(1)} / 30 pts</div>
                                            </>
                                        ) : (
                                            <div className="text-2xl font-black text-white/30 mb-0.5">–</div>
                                        )}
                                    </div>

                                    {/* Impact Bloquant */}
                                    <div className={`p-4 rounded-2xl border transition-colors ${sd && sd.anomalies.blocking > 0 ? 'bg-rose-500/5 border-rose-500/15' : 'bg-white/[0.02] border-white/[0.06] hover:bg-white/[0.04]'}`}>
                                        <span className="text-[8px] font-black text-white/40 uppercase tracking-widest block mb-3">Impact Bloquant</span>
                                        {sd ? (
                                            <>
                                                <div className={`text-2xl font-black mb-0.5 ${sd.anomalies.blocking > 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
                                                    {sd.anomalies.blocking} <span className="text-base font-bold opacity-70">bloquant{sd.anomalies.blocking > 1 ? 's' : ''}</span>
                                                </div>
                                                <div className="text-[9px] font-semibold text-white/40 mb-2">
                                                    {sd.anomalies.blocking > 0 ? 'Déploiement bloqué' : 'Aucun bloquant détecté'}
                                                </div>
                                                <div className="h-1 w-full bg-white/[0.05] rounded-full overflow-hidden">
                                                    <motion.div
                                                        initial={{ width: 0 }}
                                                        animate={{ width: `${blockingBarPct}%` }}
                                                        transition={{ duration: 1, delay: 0.3, ease: "easeOut" }}
                                                        className={`h-full rounded-full ${sd.anomalies.blocking > 0 ? 'bg-rose-500' : 'bg-emerald-500'}`}
                                                    />
                                                </div>
                                                <div className="text-[8px] text-white/25 mt-1 text-right">{bd.blocking_guard?.toFixed(1)} / 10 pts</div>
                                            </>
                                        ) : (
                                            <div className="text-2xl font-black text-white/30 mb-0.5">0</div>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Alertes */}
                            {data.reasons && data.reasons.length > 0 && (
                                <div>
                                    <span className="text-[8px] font-black text-white/30 uppercase tracking-[0.2em] block mb-3">Alertes & Recommandations</span>
                                    <div className="space-y-2">
                                        {data.reasons.map((text, i) => {
                                            const isCritical = text.toLowerCase().includes('bloquant') || text.toLowerCase().includes('critique');
                                            const isWarning = text.toLowerCase().includes('insuffisant') || text.toLowerCase().includes('retard') || text.toLowerCase().includes('risque');
                                            return (
                                                <div key={i} className={`flex items-start gap-3 p-3 rounded-xl border text-[10px] font-semibold leading-relaxed
                                                    ${isCritical ? 'bg-rose-500/5 border-rose-500/15 text-rose-300/80' :
                                                      isWarning ? 'bg-amber-500/5 border-amber-500/15 text-amber-300/80' :
                                                      'bg-white/[0.02] border-white/[0.06] text-white/50'}`}>
                                                    <div className={`w-1.5 h-1.5 rounded-full shrink-0 mt-1.5 ${isCritical ? 'bg-rose-500' : isWarning ? 'bg-amber-500' : 'bg-blue-500'}`} />
                                                    {text}
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Footer */}
                        <div className="px-7 py-5 border-t border-white/[0.06] flex items-center gap-3">
                            <button
                                onClick={handleExport}
                                disabled={isExporting}
                                className="flex-[3] flex items-center justify-center gap-2.5 py-3.5 bg-blue-600/10 hover:bg-blue-600/20 border border-blue-500/20 hover:border-blue-500/40 rounded-xl text-[9px] font-black tracking-[0.2em] text-blue-300 transition-all disabled:opacity-50"
                            >
                                {isExporting && <Loader2 size={13} className="animate-spin" />}
                                {isExporting ? 'EXPORTATION...' : 'EXPORTER LA FICHE DE CLÔTURE (PDF)'}
                            </button>
                            <button
                                onClick={onClose}
                                className="flex-1 py-3.5 bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.06] rounded-xl text-[9px] font-black tracking-widest text-white/50 hover:text-white transition-all"
                            >
                                Fermer
                            </button>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>,
        document.body
    );
};

export default ReadinessDetailModal;
