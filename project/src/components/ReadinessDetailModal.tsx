import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { createPortal } from 'react-dom';
import { X, Loader2 } from 'lucide-react';
import { aiService } from '../services/api';
import { toast } from 'react-toastify';
import { useTheme } from '../context/ThemeContext';

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

const getMlColor = (status: string, isDark: boolean) => {
    if (status === 'OPTIMAL') {
        return {
            text: isDark ? 'text-emerald-400' : 'text-emerald-700',
            bg: isDark ? 'bg-emerald-500/10' : 'bg-emerald-50',
            border: isDark ? 'border-emerald-500/20' : 'border-emerald-200',
        };
    }
    if (status === 'WARNING') {
        return {
            text: isDark ? 'text-amber-400' : 'text-amber-700',
            bg: isDark ? 'bg-amber-500/10' : 'bg-amber-50',
            border: isDark ? 'border-amber-500/20' : 'border-amber-200',
        };
    }
    if (status === 'CRITICAL') {
        return {
            text: isDark ? 'text-rose-400' : 'text-rose-700',
            bg: isDark ? 'bg-rose-500/10' : 'bg-rose-50',
            border: isDark ? 'border-rose-500/20' : 'border-rose-200',
        };
    }
    return {
        text: isDark ? 'text-slate-400' : 'text-slate-600',
        bg: isDark ? 'bg-white/[0.02]' : 'bg-slate-50',
        border: isDark ? 'border-white/5' : 'border-slate-200',
    };
};

const ReadinessDetailModal: React.FC<ReadinessDetailModalProps> = ({ isOpen, onClose, data, title }) => {
    const [isExporting, setIsExporting] = useState(false);
    const { resolvedTheme } = useTheme();
    const isDark = resolvedTheme === 'dark';

    if (!data) return null;

    const ui = {
        overlay: isDark ? 'bg-slate-950/90' : 'bg-slate-900/40',
        panel: isDark
            ? 'bg-[#060a16] border-white/[0.08] shadow-[0_0_100px_rgba(0,0,0,0.9)]'
            : 'bg-white border-slate-200 shadow-slate-300/40',
        headerBorder: isDark ? 'border-white/[0.06]' : 'border-slate-200',
        footerBorder: isDark ? 'border-white/[0.06]' : 'border-slate-200',
        subtitle: isDark ? 'text-blue-400/70' : 'text-blue-600',
        title: isDark ? 'text-white' : 'text-slate-900',
        closeBtn: isDark
            ? 'bg-white/[0.04] hover:bg-white/[0.08] border-white/[0.06] text-slate-400 hover:text-white'
            : 'bg-slate-100 hover:bg-slate-200 border-slate-200 text-slate-500 hover:text-slate-900',
        sectionLabel: isDark ? 'text-white/30' : 'text-slate-500',
        card: isDark ? 'bg-white/[0.02] border-white/[0.06] hover:bg-white/[0.04]' : 'bg-slate-50 border-slate-200 hover:bg-slate-100',
        cardLabel: isDark ? 'text-white/40' : 'text-slate-500',
        cardValue: isDark ? 'text-white' : 'text-slate-900',
        cardMuted: isDark ? 'text-white/30' : 'text-slate-400',
        cardSub: isDark ? 'text-white/40' : 'text-slate-500',
        cardPts: isDark ? 'text-white/25' : 'text-slate-400',
        barTrack: isDark ? 'bg-white/[0.05]' : 'bg-slate-200',
        ringTrack: isDark ? 'rgba(255,255,255,0.05)' : '#e2e8f0',
        totalRow: isDark ? 'bg-white/[0.02] border-white/[0.06] text-white/40' : 'bg-slate-50 border-slate-200 text-slate-500',
        totalValue: isDark ? 'text-white/70' : 'text-slate-700',
        exportBtn: isDark
            ? 'bg-blue-600/10 hover:bg-blue-600/20 border-blue-500/20 hover:border-blue-500/40 text-blue-300'
            : 'bg-blue-50 hover:bg-blue-100 border-blue-200 hover:border-blue-300 text-blue-700',
        secondaryBtn: isDark
            ? 'bg-white/[0.04] hover:bg-white/[0.08] border-white/[0.06] text-white/50 hover:text-white'
            : 'bg-slate-100 hover:bg-slate-200 border-slate-200 text-slate-600 hover:text-slate-900',
        alertNeutral: isDark
            ? 'bg-white/[0.02] border-white/[0.06] text-white/50'
            : 'bg-slate-50 border-slate-200 text-slate-600',
        alertCritical: isDark
            ? 'bg-rose-500/5 border-rose-500/15 text-rose-300/80'
            : 'bg-rose-50 border-rose-200 text-rose-800',
        alertWarning: isDark
            ? 'bg-amber-500/5 border-amber-500/15 text-amber-300/80'
            : 'bg-amber-50 border-amber-200 text-amber-800',
        anomalyActive: isDark ? 'bg-rose-500/5 border-rose-500/15' : 'bg-rose-50 border-rose-200',
        emeraldText: isDark ? 'text-emerald-400' : 'text-emerald-700',
        roseText: isDark ? 'text-rose-400' : 'text-rose-700',
    };

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
    const scoreBgClass = score >= 80
        ? (isDark ? 'bg-emerald-500/10 border-emerald-500/20' : 'bg-emerald-50 border-emerald-200')
        : score >= 40
        ? (isDark ? 'bg-amber-500/10 border-amber-500/20' : 'bg-amber-50 border-amber-200')
        : (isDark ? 'bg-rose-500/10 border-rose-500/20' : 'bg-rose-50 border-rose-200');
    const scoreTextClass = score >= 80
        ? ui.emeraldText
        : score >= 40
        ? (isDark ? 'text-amber-400' : 'text-amber-700')
        : ui.roseText;

    const sd = data.source_data;
    const bd = data.breakdown;
    const mlStatus = sd?.ml?.status || 'INITIAL';
    const mlColors = getMlColor(mlStatus, isDark);

    const pillarSum = bd
        ? Math.round(
            (bd.test_pass_rate ?? 0) +
            (bd.ml_stability ?? 0) +
            (bd.anomalies_health ?? 0) +
            (bd.blocking_guard ?? 0)
        )
        : score;
    const anomalyPillarMalus = sd?.anomalies?.penalty != null ? Math.round(sd.anomalies.penalty / 2) : 0;

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
                        className={`absolute inset-0 backdrop-blur-xl ${ui.overlay}`}
                    />

                    <motion.div
                        key={resolvedTheme}
                        initial={{ opacity: 0, scale: 0.95, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 20 }}
                        transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
                        className={`relative w-full max-w-2xl rounded-3xl overflow-hidden border ${ui.panel}`}
                    >
                        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-blue-500/50 to-transparent" />

                        <div className={`relative px-7 pt-6 pb-5 border-b ${ui.headerBorder}`}>
                            <div className="flex items-start justify-between gap-4">
                                <div>
                                    <span className={`text-[9px] font-black uppercase tracking-[0.25em] block mb-1 ${ui.subtitle}`}>Analyse Prédictive</span>
                                    <h2 className={`text-lg font-black tracking-tight uppercase leading-tight ${ui.title}`}>
                                        {title}
                                    </h2>
                                </div>
                                <button
                                    onClick={onClose}
                                    className={`p-2.5 border rounded-xl transition-all shrink-0 mt-0.5 ${ui.closeBtn}`}
                                >
                                    <X size={16} />
                                </button>
                            </div>
                        </div>

                        <div className="max-h-[65vh] overflow-y-auto custom-scrollbar p-7 space-y-6">
                            <div className={`flex items-center gap-6 p-5 border rounded-2xl ${scoreBgClass}`}>
                                <div className="relative w-[80px] h-[80px] shrink-0">
                                    <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                                        <circle cx="50" cy="50" r="42" fill="none" stroke={ui.ringTrack} strokeWidth="9" />
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
                                        <span className={`text-xl font-black leading-none ${ui.cardValue}`}>{score}%</span>
                                    </div>
                                </div>

                                <div className="flex-1 min-w-0">
                                    <div className={`text-[8px] font-black uppercase tracking-[0.2em] mb-1.5 ${ui.sectionLabel}`}>STATUT GLOBAL</div>
                                    <div className={`text-sm font-black tracking-wider mb-3 ${scoreTextClass}`}>
                                        {scoreLabel}
                                    </div>
                                    <p className={`text-[10px] font-semibold opacity-80 leading-relaxed ${scoreTextClass}`}>
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

                            <div>
                                <span className={`text-[8px] font-black uppercase tracking-[0.2em] block mb-3 ${ui.sectionLabel}`}>Audit Trail — Journal de Transparence</span>
                                <div className="grid grid-cols-2 gap-3">
                                    <div className={`p-4 border rounded-2xl transition-colors ${ui.card}`}>
                                        <span className={`text-[8px] font-black uppercase tracking-widest block mb-3 ${ui.cardLabel}`}>Tests & Qualité</span>
                                        {sd ? (
                                            <>
                                                <div className={`text-2xl font-black mb-0.5 ${ui.cardValue}`}>{sd.tests.passed}<span className={`text-base font-bold ${ui.cardMuted}`}> / {sd.tests.total}</span></div>
                                                <div className={`text-[9px] font-semibold mb-2 ${ui.cardSub}`}>tests validés · taux réel {Math.round(sd.tests.percent)}%</div>
                                                <div className={`h-1 w-full rounded-full overflow-hidden ${ui.barTrack}`}>
                                                    <motion.div
                                                        initial={{ width: 0 }}
                                                        animate={{ width: `${testBarPct}%` }}
                                                        transition={{ duration: 1, ease: "easeOut" }}
                                                        className="h-full bg-emerald-500 rounded-full"
                                                    />
                                                </div>
                                                <div className={`text-[8px] mt-1 text-right ${ui.cardPts}`}>{Math.round(bd.test_pass_rate ?? 0)} / 40 pts</div>
                                            </>
                                        ) : (
                                            <>
                                                <div className={`text-2xl font-black mb-0.5 ${ui.cardMuted}`}>— / —</div>
                                                <div className={ui.cardSub}>Chargement...</div>
                                            </>
                                        )}
                                    </div>

                                    <div className={`p-4 rounded-2xl border transition-colors ${sd && sd.anomalies.total > 0 ? ui.anomalyActive : ui.card}`}>
                                        <span className={`text-[8px] font-black uppercase tracking-widest block mb-3 ${ui.cardLabel}`}>Anomalies</span>
                                        {sd ? (
                                            <>
                                                <div className={`text-2xl font-black mb-0.5 ${sd.anomalies.total > 0 ? ui.roseText : ui.emeraldText}`}>
                                                    {sd.anomalies.total} <span className="text-base font-bold opacity-70">actives</span>
                                                </div>
                                                <div className={`text-[9px] font-semibold mb-2 ${ui.cardSub}`}>
                                                    {sd.anomalies.critical} critiques · malus pilier −{anomalyPillarMalus} pts
                                                    <span className={ui.cardPts}> (pénalité brute {sd.anomalies.penalty})</span>
                                                </div>
                                                <div className={`h-1 w-full rounded-full overflow-hidden ${ui.barTrack}`}>
                                                    <motion.div
                                                        initial={{ width: 0 }}
                                                        animate={{ width: `${anomalyBarPct}%` }}
                                                        transition={{ duration: 1, delay: 0.1, ease: "easeOut" }}
                                                        className="h-full bg-amber-500 rounded-full"
                                                    />
                                                </div>
                                                <div className={`text-[8px] mt-1 text-right ${ui.cardPts}`}>{Math.round(bd.anomalies_health ?? 0)} / 20 pts</div>
                                            </>
                                        ) : (
                                            <div className={`text-2xl font-black mb-0.5 ${ui.cardMuted}`}>0 actives</div>
                                        )}
                                    </div>

                                    <div className={`p-4 rounded-2xl border transition-colors ${mlColors.bg} ${mlColors.border}`}>
                                        <span className={`text-[8px] font-black uppercase tracking-widest block mb-3 ${ui.cardLabel}`}>Prédiction ML</span>
                                        {sd ? (
                                            <>
                                                <div className={`text-2xl font-black mb-0.5 ${mlColors.text}`}>{sd.ml.status}</div>
                                                <div className={`text-[9px] font-semibold mb-2 ${ui.cardSub}`}>
                                                    {sd.ml.delay_days > 0 ? `+${sd.ml.delay_days}j retard · ` : 'Aucun retard · '}
                                                    IA à {Math.round(sd.ml.confidence * 100)}%
                                                </div>
                                                <div className={`h-1 w-full rounded-full overflow-hidden ${ui.barTrack}`}>
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
                                                <div className={`text-[8px] mt-1 text-right ${ui.cardPts}`}>{Math.round(bd.ml_stability ?? 0)} / 30 pts</div>
                                            </>
                                        ) : (
                                            <div className={`text-2xl font-black mb-0.5 ${ui.cardMuted}`}>–</div>
                                        )}
                                    </div>

                                    <div className={`p-4 rounded-2xl border transition-colors ${sd && sd.anomalies.blocking > 0 ? ui.anomalyActive : ui.card}`}>
                                        <span className={`text-[8px] font-black uppercase tracking-widest block mb-3 ${ui.cardLabel}`}>Impact Bloquant</span>
                                        {sd ? (
                                            <>
                                                <div className={`text-2xl font-black mb-0.5 ${sd.anomalies.blocking > 0 ? ui.roseText : ui.emeraldText}`}>
                                                    {sd.anomalies.blocking} <span className="text-base font-bold opacity-70">bloquant{sd.anomalies.blocking > 1 ? 's' : ''}</span>
                                                </div>
                                                <div className={`text-[9px] font-semibold mb-2 ${ui.cardSub}`}>
                                                    {sd.anomalies.blocking > 0 ? 'Déploiement bloqué' : 'Aucun bloquant détecté'}
                                                </div>
                                                <div className={`h-1 w-full rounded-full overflow-hidden ${ui.barTrack}`}>
                                                    <motion.div
                                                        initial={{ width: 0 }}
                                                        animate={{ width: `${blockingBarPct}%` }}
                                                        transition={{ duration: 1, delay: 0.3, ease: "easeOut" }}
                                                        className={`h-full rounded-full ${sd.anomalies.blocking > 0 ? 'bg-rose-500' : 'bg-emerald-500'}`}
                                                    />
                                                </div>
                                                <div className={`text-[8px] mt-1 text-right ${ui.cardPts}`}>{Math.round(bd.blocking_guard ?? 0)} / 10 pts</div>
                                            </>
                                        ) : (
                                            <div className={`text-2xl font-black mb-0.5 ${ui.cardMuted}`}>0</div>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {bd && (
                                <div className={`flex items-center justify-between px-4 py-2.5 border rounded-xl text-[9px] ${ui.totalRow}`}>
                                    <span>Total des piliers</span>
                                    <span className={`font-black ${ui.totalValue}`}>
                                        {pillarSum} / 100 pts
                                        {pillarSum !== score && (
                                            <span className={`font-semibold ml-1 ${isDark ? 'text-amber-400/80' : 'text-amber-700'}`}>(affiché {score}%)</span>
                                        )}
                                    </span>
                                </div>
                            )}

                            {data.reasons && data.reasons.length > 0 && (
                                <div>
                                    <span className={`text-[8px] font-black uppercase tracking-[0.2em] block mb-3 ${ui.sectionLabel}`}>Alertes & Recommandations</span>
                                    <div className="space-y-2">
                                        {data.reasons.map((text, i) => {
                                            const isCritical = text.toLowerCase().includes('bloquant') || text.toLowerCase().includes('critique');
                                            const isWarning = text.toLowerCase().includes('insuffisant') || text.toLowerCase().includes('retard') || text.toLowerCase().includes('risque');
                                            return (
                                                <div
                                                    key={i}
                                                    className={`flex items-start gap-3 p-3 rounded-xl border text-[10px] font-semibold leading-relaxed ${
                                                        isCritical ? ui.alertCritical
                                                        : isWarning ? ui.alertWarning
                                                        : ui.alertNeutral
                                                    }`}
                                                >
                                                    <div className={`w-1.5 h-1.5 rounded-full shrink-0 mt-1.5 ${isCritical ? 'bg-rose-500' : isWarning ? 'bg-amber-500' : 'bg-blue-500'}`} />
                                                    {text}
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className={`px-7 py-5 border-t flex items-center gap-3 ${ui.footerBorder}`}>
                            <button
                                onClick={handleExport}
                                disabled={isExporting}
                                className={`flex-[3] flex items-center justify-center gap-2.5 py-3.5 border rounded-xl text-[9px] font-black tracking-[0.2em] transition-all disabled:opacity-50 ${ui.exportBtn}`}
                            >
                                {isExporting && <Loader2 size={13} className="animate-spin" />}
                                {isExporting ? 'EXPORTATION...' : 'EXPORTER LA FICHE DE CLÔTURE (PDF)'}
                            </button>
                            <button
                                onClick={onClose}
                                className={`flex-1 py-3.5 border rounded-xl text-[9px] font-black tracking-widest transition-all ${ui.secondaryBtn}`}
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
