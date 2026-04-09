import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Award, Info, CheckCircle2, AlertTriangle, ShieldAlert, FileText, Download, Loader2 } from 'lucide-react';
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
            anomalies: { total: number; critical: number; penalty: number };
            ml: { status: string; delay_days: number; confidence: number };
            critical_coverage: { count: number; passed: number };
        };
    } | null;
    title: string;
}

const ReadinessDetailModal: React.FC<ReadinessDetailModalProps> = ({ isOpen, onClose, data, title }) => {
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

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[100] flex items-start justify-center p-4 overflow-y-auto pt-12 pb-12">
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="absolute inset-0 bg-slate-950/80 backdrop-blur-md"
                    />

                    <motion.div
                        initial={{ opacity: 0, scale: 0.9, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.9, y: 20 }}
                        className="relative w-full max-w-2xl bg-slate-900 border border-white/10 rounded-[2.5rem] shadow-2xl overflow-hidden"
                    >
                        {/* Header */}
                        <div className="relative p-8 border-b border-white/5 bg-gradient-to-b from-white/[0.02] to-transparent">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-4">
                                    <div className="p-3 bg-blue-500/10 rounded-2xl">
                                        <Award className="w-6 h-6 text-blue-500" />
                                    </div>
                                    <div>
                                        <h3 className="text-xl font-black text-white uppercase tracking-tight">{title}</h3>
                                        <p className="text-xs text-slate-500 font-bold uppercase tracking-widest mt-1">
                                            {t('dataDriven.timelineGuard.predictiveAnalysis')}
                                        </p>
                                    </div>
                                </div>
                                <button
                                    onClick={onClose}
                                    className="p-2 hover:bg-white/5 rounded-xl transition-colors group"
                                >
                                    <X className="w-6 h-6 text-slate-500 group-hover:text-white" />
                                </button>
                            </div>
                        </div>

                        {/* Content */}
                        <div className="p-8 space-y-8 max-h-[70vh] overflow-y-auto custom-scrollbar">
                            {/* Score Overview */}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                <div className="col-span-1 flex flex-col items-center justify-center p-6 bg-white/[0.02] border border-white/5 rounded-3xl">
                                    <div className="relative w-24 h-24 flex items-center justify-center mb-4">
                                        <svg className="w-full h-full -rotate-90 transform" viewBox="0 0 100 100">
                                            <circle
                                                cx="50"
                                                cy="50"
                                                r="40"
                                                fill="none"
                                                stroke="rgba(255, 255, 255, 0.05)"
                                                strokeWidth="10"
                                            />
                                            <motion.circle
                                                cx="50"
                                                cy="50"
                                                r="40"
                                                fill="none"
                                                stroke={color}
                                                strokeWidth="10"
                                                strokeDasharray={2 * Math.PI * 40}
                                                initial={{ strokeDashoffset: 2 * Math.PI * 40 }}
                                                animate={{ strokeDashoffset: (2 * Math.PI * 40) - (data.score / 100) * (2 * Math.PI * 40) }}
                                                transition={{ duration: 1.5, ease: "easeOut" }}
                                                strokeLinecap="round"
                                            />
                                        </svg>
                                        <span className="absolute text-2xl font-black text-white">{data.score}%</span>
                                    </div>
                                    <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{t('dataDriven.timelineGuard.readinessScore')}</span>
                                </div>

                                <div className="col-span-2 space-y-4">
                                    <div className="flex items-center gap-3 p-4 bg-white/[0.02] border border-white/5 rounded-2xl">
                                        {data.score >= 80 ? (
                                            <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                                        ) : data.score >= 40 ? (
                                            <AlertTriangle className="w-5 h-5 text-amber-500" />
                                        ) : (
                                            <ShieldAlert className="w-5 h-5 text-red-500" />
                                        )}
                                        <p className="text-sm text-slate-300 font-medium leading-relaxed">
                                            {data.reasons[0]}
                                        </p>
                                    </div>

                                    <div className="grid grid-cols-2 gap-3">
                                        {Object.entries(data.breakdown).map(([key, val]) => (
                                            <div key={key} className="p-3 bg-white/[0.02] border border-white/5 rounded-2xl">
                                                <div className="text-[9px] font-black text-slate-500 uppercase tracking-tighter mb-1">{key}</div>
                                                <div className="flex items-center gap-2">
                                                    <div className="flex-1 h-1.5 bg-white/5 rounded-full overflow-hidden">
                                                        <motion.div
                                                            initial={{ width: 0 }}
                                                            animate={{ width: `${val}%` }}
                                                            className="h-full bg-blue-500/50"
                                                        />
                                                    </div>
                                                    <span className="text-xs font-black text-white">{val}%</span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            {/* Audit Trail / Journal de Transparence */}
                            {data.source_data && (
                                <div className="space-y-4">
                                    <h4 className="text-[10px] font-black text-emerald-400 uppercase tracking-widest flex items-center gap-2">
                                        <ShieldAlert className="w-3 h-3" />
                                        Audit Trail : Journal de Transparence
                                    </h4>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <div className="p-4 bg-white/[0.02] border border-white/5 rounded-2xl">
                                            <div className="flex items-center gap-3 mb-2">
                                                <div className="p-1.5 bg-blue-500/10 rounded-lg">
                                                    <CheckCircle2 className="w-3.5 h-3.5 text-blue-500" />
                                                </div>
                                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-tighter">Tests & Qualité</span>
                                            </div>
                                            <p className="text-sm text-white font-bold">
                                                {data.source_data.tests.passed} / {data.source_data.tests.total} tests validés
                                            </p>
                                            <p className="text-[10px] text-slate-500 mt-1">
                                                Taux de succès réel : {data.source_data.tests.percent}%
                                            </p>
                                        </div>

                                        <div className="p-4 bg-white/[0.02] border border-white/5 rounded-2xl">
                                            <div className="flex items-center gap-3 mb-2">
                                                <div className="p-1.5 bg-red-500/10 rounded-lg">
                                                    <AlertTriangle className="w-3.5 h-3.5 text-red-500" />
                                                </div>
                                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-tighter">Anomalies Actives</span>
                                            </div>
                                            <p className="text-sm text-white font-bold">
                                                {data.source_data.anomalies.total} anomalies ({data.source_data.anomalies.critical} critiques)
                                            </p>
                                            <p className="text-[10px] text-slate-500 mt-1">
                                                Pénalité calculée : -{data.source_data.anomalies.penalty} pts
                                            </p>
                                        </div>

                                        <div className="p-4 bg-white/[0.02] border border-white/5 rounded-2xl">
                                            <div className="flex items-center gap-3 mb-2">
                                                <div className="p-1.5 bg-amber-500/10 rounded-lg">
                                                    <Info className="w-3.5 h-3.5 text-amber-500" />
                                                </div>
                                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-tighter">Prédiction ML</span>
                                            </div>
                                            <p className="text-sm text-white font-bold uppercase">
                                                Statut : {data.source_data.ml.status}
                                            </p>
                                            <p className="text-[10px] text-slate-500 mt-1">
                                                Retard estimé : {data.source_data.ml.delay_days} jours (IA confiante à {Math.round(data.source_data.ml.confidence * 100)}%)
                                            </p>
                                        </div>

                                        <div className="p-4 bg-white/[0.02] border border-white/5 rounded-2xl">
                                            <div className="flex items-center gap-3 mb-2">
                                                <div className="p-1.5 bg-indigo-500/10 rounded-lg">
                                                    <Award className="w-3.5 h-3.5 text-indigo-500" />
                                                </div>
                                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-tighter">Modules Critiques</span>
                                            </div>
                                            <p className="text-sm text-white font-bold">
                                                {data.source_data.critical_coverage.passed} / {data.source_data.critical_coverage.count} validés
                                            </p>
                                            <p className="text-[10px] text-slate-500 mt-1">
                                                Couverture des zones à haut risque
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Detailed Reasons */}
                            <div className="space-y-4">
                                <h4 className="text-[10px] font-black text-blue-400 uppercase tracking-widest flex items-center gap-2">
                                    <Info className="w-3 h-3" />
                                    {t('dataDriven.timelineGuard.predictiveAnalysis')}
                                </h4>
                                <div className="grid grid-cols-1 gap-3">
                                    {data.reasons.map((reason, i) => (
                                        <motion.div
                                            key={i}
                                            initial={{ opacity: 0, x: -10 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            transition={{ delay: i * 0.1 }}
                                            className="flex items-start gap-4 p-4 bg-white/[0.01] border border-white/5 rounded-2xl hover:bg-white/[0.03] transition-colors"
                                        >
                                            <div className="mt-1 w-2 h-2 rounded-full bg-blue-500/50 shrink-0" />
                                            <p className="text-sm text-slate-400 font-medium leading-relaxed">{reason}</p>
                                        </motion.div>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* Footer */}
                        <div className="p-8 border-t border-white/5 bg-white/[0.01] flex items-center justify-between gap-4">
                            <button
                                onClick={handleExport}
                                disabled={isExporting}
                                className="flex-1 flex items-center justify-center gap-2 py-4 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-500 font-black text-xs rounded-2xl transition-all border border-emerald-500/20 group disabled:opacity-50"
                            >
                                {isExporting ? (
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                    <FileText className="w-4 h-4 group-hover:scale-110 transition-transform" />
                                )}
                                EXPORTER LA FICHE DE CLÔTURE (PDF)
                            </button>
                            <button
                                onClick={onClose}
                                className="px-10 py-4 bg-white/5 hover:bg-white/10 text-white font-bold text-xs rounded-2xl transition-all border border-white/10"
                            >
                                {t('common.cancel')}
                            </button>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
};

export default ReadinessDetailModal;
