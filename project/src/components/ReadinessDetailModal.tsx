import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { createPortal } from 'react-dom';
import { X, Award, Info, CheckCircle2, AlertTriangle, ShieldAlert, FileText, Download, Loader2, Sparkles, TrendingUp, Clock, Zap, Layers } from 'lucide-react';
import { useTranslation } from 'react-i18next';
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

const ReadinessDetailModal: React.FC<ReadinessDetailModalProps> = ({ isOpen, onClose, data, title, aiInsight }) => {
    const { t } = useTranslation();
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

            // Create a blob link to download
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
            console.error("Export failed", error);
            toast.error("Erreur lors de la génération du PDF.");
        } finally {
            setIsExporting(false);
        }
    };

    const getColor = (s: number) => {
        if (s >= 80) return '#10b981';
        if (s >= 40) return '#f59e0b';
        return '#ef4444';
    };

    const color = getColor(data.score);

    if (typeof document === 'undefined') return null;

    return createPortal(
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[99999] flex items-start justify-center p-4 overflow-y-auto custom-scrollbar">
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="absolute inset-0 bg-slate-950/95 backdrop-blur-xl"
                    />

                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 20 }}
                        className="relative w-full max-w-2xl bg-[#0b0e14] border border-white/10 rounded-[2.5rem] shadow-[0_0_80px_rgba(0,0,0,0.8)] overflow-hidden my-auto"
                    >
                        {/* Header */}
                        <div className="relative p-6 border-b border-white/5 bg-[#0b0e14]">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-500/20 to-indigo-500/20 flex items-center justify-center border border-blue-500/20">
                                        <Layers className="w-6 h-6 text-blue-400" />
                                    </div>
                                    <div>
                                        <h2 className="text-xl font-black text-white tracking-tight uppercase">
                                            {title}
                                        </h2>
                                        <p className="text-[10px] font-black text-blue-400/60 uppercase tracking-[0.2em]">
                                            Analyse Prédictive
                                        </p>
                                    </div>
                                </div>
                                <button
                                    onClick={onClose}
                                    className="p-3 hover:bg-white/5 rounded-2xl transition-all text-slate-500 hover:text-white"
                                >
                                    <X size={20} />
                                </button>
                            </div>
                        </div>

                        {/* Content */}
                        <div className="p-6 space-y-8 max-h-[60vh] overflow-y-auto custom-scrollbar bg-[#0b0e14]">
                            {/* TOP DASHBOARD: GAUGE + STATUS */}
                            <div className="bg-white/[0.01] border border-white/5 rounded-[1.5rem] p-6 flex items-center gap-8">
                                {/* Left: Gauge */}
                                <div className="relative w-20 h-20 flex items-center justify-center shrink-0">
                                    <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                                        <circle cx="50" cy="50" r="44" fill="none" stroke="rgba(255, 255, 255, 0.03)" strokeWidth="10" />
                                        <motion.circle
                                            cx="50" cy="50" r="44" fill="none"
                                            stroke={color} strokeWidth="10"
                                            strokeDasharray={2 * Math.PI * 44}
                                            initial={{ strokeDashoffset: 2 * Math.PI * 44 }}
                                            animate={{ strokeDashoffset: (2 * Math.PI * 44) * (1 - data.score / 100) }}
                                            transition={{ duration: 1.5, ease: "easeOut" }}
                                            strokeLinecap="round"
                                        />
                                    </svg>
                                    <span className="absolute text-lg font-black text-white">{data.score}%</span>
                                </div>

                                {/* Right: Global Status */}
                                <div className="flex-1 space-y-3">
                                    <div className="space-y-0.5">
                                        <div className="text-[8px] font-black text-slate-600 uppercase tracking-widest">STATUT GLOBAL</div>
                                        <div className={`flex items-center gap-1.5 text-sm font-black uppercase tracking-tight
                                            ${data.score < 40 ? 'text-rose-500' : data.score < 80 ? 'text-amber-500' : 'text-emerald-500'}`}>
                                            <AlertTriangle size={14} />
                                            {data.score < 40 ? 'CRITICAL' : data.score < 80 ? 'WARNING' : 'STABLE'}
                                        </div>
                                    </div>

                                    <div className="p-4 bg-rose-500/5 border border-rose-500/10 rounded-xl flex items-start gap-3">
                                        <div className="p-1 bg-rose-500/20 rounded-full mt-0.5 text-rose-500/80 shrink-0">
                                            <AlertTriangle size={12} strokeWidth={3} />
                                        </div>
                                        <div className="text-[10px] font-bold text-rose-200/80 leading-relaxed">
                                            {data.source_data ? (
                                                <>Taux de réussite insuffisant ({data.source_data.tests.passed}/{data.source_data.tests.total})</>
                                            ) : (
                                                data.reasons[0]
                                            )}
                                            <br />
                                            <span className="opacity-50">Retard estimé : {data.source_data?.ml?.delay_days || 4} jours.</span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* MÉTRIQUES DE SCORE */}
                            <div className="space-y-4">
                                <div className="flex items-center gap-2 text-[8px] font-black text-slate-600 uppercase tracking-[0.2em]">
                                    <TrendingUp size={12} />
                                    MÉTRIQUES DE SCORE
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    {Object.entries(data.breakdown).map(([key, val], idx) => (
                                        <div key={key} className="bg-white/[0.01] border border-white/5 rounded-[1.2rem] p-4 relative overflow-hidden">
                                            <div className="flex justify-between items-start mb-4">
                                                <div className="flex items-center gap-2 text-[8px] font-black text-slate-500 uppercase tracking-widest">
                                                    <div className={`w-2 h-2 rounded-full ${idx === 0 ? 'bg-emerald-500' : idx === 1 ? 'bg-blue-500' : idx === 2 ? 'bg-amber-500' : 'bg-rose-500'}`} />
                                                    {key.replace(/_/g, ' ')}
                                                </div>
                                            </div>
                                            <div className="h-1 w-full bg-white/5 rounded-full overflow-hidden mb-3">
                                                <div className="h-full bg-blue-500 rounded-full" style={{ width: `${val}%` }} />
                                            </div>
                                            <div className="text-xl font-black text-white">{val}%</div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* AUDIT TRAIL — JOURNAL DE TRANSPARENCE */}
                            <div className="space-y-4">
                                <div className="flex items-center gap-2 text-[8px] font-black text-slate-600 uppercase tracking-[0.2em]">
                                    <Clock size={12} />
                                    AUDIT TRAIL — JOURNAL DE TRANSPARENCE
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                    <div className="p-5 bg-white/[0.01] border border-white/5 rounded-[1.2rem] transition-all">
                                        <div className="flex items-center gap-2 mb-4">
                                            <div className="p-1.5 bg-emerald-500/10 rounded-lg">
                                                <CheckCircle2 size={12} className="text-emerald-500" />
                                            </div>
                                            <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest">TESTS & QUALITÉ</span>
                                        </div>
                                        {data.source_data ? (
                                            <>
                                                <div className="text-xl font-black text-white mb-0.5">{data.source_data.tests.passed} / {data.source_data.tests.total}</div>
                                                <div className="text-[9px] font-bold text-slate-500">tests validés · taux réel {data.source_data.tests.percent}%</div>
                                            </>
                                        ) : (
                                            <>
                                                <div className="text-xl font-black text-white mb-0.5">0 / 0</div>
                                                <div className="text-[9px] font-bold text-slate-500">Chargement...</div>
                                            </>
                                        )}
                                    </div>
                                    <div className="p-5 bg-rose-500/5 border border-rose-500/10 rounded-[1.2rem]">
                                        <div className="flex items-center gap-2 mb-4">
                                            <div className="p-1.5 bg-rose-500/20 rounded-lg">
                                                <AlertTriangle size={12} className="text-rose-500" />
                                            </div>
                                            <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest">ANOMALIES</span>
                                        </div>
                                        {data.source_data ? (
                                            <>
                                                <div className="text-xl font-black text-rose-500 mb-0.5">{data.source_data.anomalies.total} actives</div>
                                                <div className="text-[9px] font-bold text-slate-500">{data.source_data.anomalies.critical} critiques · pénalité -{data.source_data.anomalies.penalty} pts</div>
                                            </>
                                        ) : (
                                            <>
                                                <div className="text-xl font-black text-rose-500 mb-0.5">0 actives</div>
                                                <div className="text-[9px] font-bold text-slate-500">Aucune détectée</div>
                                            </>
                                        )}
                                    </div>
                                    <div className="p-5 bg-rose-500/5 border border-rose-500/10 rounded-[1.2rem]">
                                        <div className="flex items-center gap-2 mb-4">
                                            <div className="p-1.5 bg-rose-500/20 rounded-lg">
                                                <AlertTriangle size={12} className="text-rose-500" />
                                            </div>
                                            <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest">PRÉDICTION ML</span>
                                        </div>
                                        {data.source_data ? (
                                            <>
                                                <div className="text-xl font-black text-rose-500 mb-0.5">{data.source_data.ml.status}</div>
                                                <div className="text-[9px] font-bold text-slate-500">+{data.source_data.ml.delay_days}j retard · IA à {Math.round(data.source_data.ml.confidence * 100)}%</div>
                                            </>
                                        ) : (
                                            <>
                                                <div className="text-xl font-black text-rose-500 mb-0.5">Critical</div>
                                                <div className="text-[9px] font-bold text-slate-500">Analyse IA...</div>
                                            </>
                                        )}
                                    </div>
                                    <div className="p-5 bg-white/[0.01] border border-white/5 rounded-[1.2rem]">
                                        <div className="flex items-center gap-2 mb-4">
                                            <div className="p-1.5 bg-rose-500/10 rounded-lg">
                                                <ShieldAlert size={12} className={data.source_data?.anomalies.blocking ? "text-rose-500" : "text-emerald-500"} />
                                            </div>
                                            <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest">IMPACT BLOQUANT</span>
                                        </div>
                                        {data.source_data ? (
                                            <>
                                                <div className={`text-xl font-black mb-0.5 ${data.source_data.anomalies.blocking ? "text-rose-500" : "text-emerald-500"}`}>
                                                    {data.source_data.anomalies.blocking} BLOQUANT
                                                </div>
                                                <div className="text-[9px] font-bold text-slate-500">
                                                    {data.source_data.anomalies.blocking > 0 ? "⚠️ Arrêt immédiat requis" : "✅ Aucun point de blocage"}
                                                </div>
                                            </>
                                        ) : (
                                            <>
                                                <div className="text-xl font-black text-white mb-0.5">0</div>
                                                <div className="text-[9px] font-bold text-slate-500">Aucun identifié</div>
                                            </>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* ANALYSE PRÉDICTIVE */}
                            <div className="space-y-4">
                                <div className="flex items-center gap-2 text-[8px] font-black text-slate-600 uppercase tracking-[0.2em]">
                                    <Zap size={12} className="text-blue-500" />
                                    ANALYSE PRÉDICTIVE
                                </div>
                                <div className="space-y-2">
                                    {(data.reasons || []).map((text, i) => (
                                        <div key={i} className="p-3.5 bg-white/[0.01] border border-white/5 rounded-xl flex items-center gap-3">
                                            <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${text.toLowerCase().includes('insuffisant') || text.toLowerCase().includes('critique') ? 'bg-rose-500' : 'bg-amber-500'}`} />
                                            <p className="text-[10px] font-bold text-slate-400 leading-tight">{text}</p>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* Footer */}
                        <div className="p-6 border-t border-white/5 bg-[#0b0e14] flex items-center gap-3">
                            <button
                                onClick={handleExport}
                                disabled={isExporting}
                                className="flex-[3] flex items-center justify-center gap-3 py-4 bg-[#0b0e14] border border-white/10 rounded-xl text-[9px] font-black tracking-[0.2em] text-white hover:bg-white/5 transition-all group disabled:opacity-50"
                            >
                                <Download size={14} className="opacity-50 group-hover:opacity-100 transition-opacity" />
                                {isExporting ? 'EXPORTATION...' : 'EXPORTER LA FICHE DE CLÔTURE (PDF)'}
                            </button>
                            <button
                                onClick={onClose}
                                className="flex-1 py-4 bg-white/5 hover:bg-white/10 border border-white/5 rounded-xl text-[9px] font-black tracking-widest text-white transition-all"
                            >
                                Annuler
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
