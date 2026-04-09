import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ShieldAlert, Clock, User, Tag, FileText, CheckCircle2, AlertOctagon, AlertCircle, ExternalLink, Calendar } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';

interface AnomalyDetailModalProps {
    anomaly: any;
    onClose: () => void;
}

const AnomalyDetailModal: React.FC<AnomalyDetailModalProps> = ({ anomaly, onClose }) => {
    const { t } = useTranslation();

    if (!anomaly) return null;

    const getSeverityStyles = (severity: string) => {
        switch (severity) {
            case 'Critique': return { color: 'text-rose-400', bg: 'bg-rose-500/10', border: 'border-rose-500/20', icon: AlertOctagon };
            case 'Moyenne': return { color: 'text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/20', icon: AlertCircle };
            case 'Faible': return { color: 'text-blue-400', bg: 'bg-blue-500/10', border: 'border-blue-500/20', icon: ShieldAlert };
            default: return { color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20', icon: CheckCircle2 };
        }
    };

    const styles = getSeverityStyles(anomaly.severity);
    const SeverityIcon = styles.icon;

    return (
        <div className="fixed inset-0 z-[60] flex items-start justify-center p-4 sm:p-6 overflow-y-auto backdrop-blur-2xl bg-black/80 custom-scrollbar pt-20 lg:pt-32">
            <motion.div
                initial={{ opacity: 0, scale: 0.9, y: 30 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 30 }}
                className="relative w-full max-w-2xl bg-[#0f172a] border border-white/10 rounded-[3rem] overflow-hidden shadow-[0_32px_128px_rgba(0,0,0,0.8)]"
            >
                {/* Header Backdrop Pattern */}
                <div className={`absolute top-0 left-0 right-0 h-48 ${styles.bg} opacity-20`} />
                <div className="absolute top-0 right-0 p-12 opacity-[0.03]">
                    <ShieldAlert className="w-64 h-64" />
                </div>

                <div className="relative">
                    {/* Header */}
                    <div className="p-8 border-b border-white/5 flex justify-between items-start">
                        <div className="space-y-3">
                            <div className="flex items-center gap-3">
                                <div className={`p-2.5 ${styles.bg} ${styles.color} rounded-xl border ${styles.border}`}>
                                    <SeverityIcon className="w-5 h-5" />
                                </div>
                                <div className={`px-4 py-1 rounded-full ${styles.bg} ${styles.color} border ${styles.border} text-[10px] font-black uppercase tracking-[0.2em]`}>
                                    {anomaly.severity} Priority
                                </div>
                            </div>
                            <h2 className="text-3xl font-black text-white tracking-tight leading-tight max-w-md">
                                {anomaly.title}
                            </h2>
                        </div>
                        <button
                            onClick={onClose}
                            className="p-2.5 bg-white/5 hover:bg-white/10 rounded-xl text-slate-400 hover:text-white transition-all border border-white/5"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>

                    {/* Content */}
                    <div className="p-8 space-y-8 max-h-[60vh] overflow-y-auto custom-scrollbar">
                        {/* Summary Section */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="bg-white/5 border border-white/5 rounded-2xl p-4 flex items-center gap-4">
                                <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-400">
                                    <Calendar className="w-5 h-5" />
                                </div>
                                <div>
                                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Date Signalée</p>
                                    <p className="text-sm font-bold text-white">{new Date(anomaly.created_at).toLocaleString()}</p>
                                </div>
                            </div>
                            <div className="bg-white/5 border border-white/5 rounded-2xl p-4 flex items-center gap-4">
                                <div className="w-10 h-10 rounded-xl bg-purple-500/10 flex items-center justify-center text-purple-400">
                                    <User className="w-5 h-5" />
                                </div>
                                <div>
                                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Rapporteur</p>
                                    <p className="text-sm font-bold text-white">{anomaly.author_name || anomaly.author_username || "Auditeur Système"}</p>
                                </div>
                            </div>
                        </div>

                        {/* Description */}
                        <div className="space-y-4">
                            <div className="flex items-center gap-2 text-slate-400">
                                <FileText className="w-4 h-4" />
                                <h4 className="text-[10px] font-black uppercase tracking-widest">Détails de l'Anomalie</h4>
                            </div>
                            <div className="bg-white/[0.03] border border-white/5 rounded-3xl p-6 italic leading-relaxed text-slate-300 text-base shadow-inner">
                                {anomaly.description || "Aucune description détaillée n'a été fournie pour cette anomalie."}
                            </div>
                        </div>

                        {/* Context Section */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 pt-4">
                            <div className="space-y-4">
                                <div className="flex items-center gap-2 text-slate-400">
                                    <Tag className="w-4 h-4" />
                                    <h4 className="text-[10px] font-black uppercase tracking-widest">Localisation</h4>
                                </div>
                                <div className="space-y-3">
                                    <div className="flex items-center justify-between p-3 bg-white/5 rounded-xl border border-white/5">
                                        <span className="text-[11px] font-bold text-slate-500">Release</span>
                                        <span className="text-[11px] font-black text-white px-3 py-1 bg-blue-500/10 rounded-lg border border-blue-500/20">{anomaly.release}</span>
                                    </div>
                                    <div className="flex items-center justify-between p-3 bg-white/5 rounded-xl border border-white/5">
                                        <span className="text-[11px] font-bold text-slate-500">Campagne</span>
                                        <span className="text-[11px] font-black text-slate-300">{anomaly.campaign}</span>
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-4">
                                <div className="flex items-center gap-2 text-slate-400">
                                    <ExternalLink className="w-4 h-4" />
                                    <h4 className="text-[10px] font-black uppercase tracking-widest">Lien Direct</h4>
                                </div>
                                {anomaly.relatedTest ? (
                                    <Link
                                        to={`/execution?test=${encodeURIComponent(anomaly.relatedTest)}`}
                                        className="flex items-center group gap-4 p-4 bg-blue-600/10 border border-blue-600/20 rounded-2xl hover:bg-blue-600/20 transition-all"
                                    >
                                        <div className="w-10 h-10 rounded-xl bg-blue-600/20 flex items-center justify-center text-blue-400 group-hover:scale-110 transition-transform">
                                            <ShieldAlert className="w-5 h-5" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-[10px] font-black text-blue-500 uppercase tracking-widest">Test Exécution</p>
                                            <p className="text-sm font-bold text-white truncate">{anomaly.relatedTest}</p>
                                        </div>
                                        <ExternalLink className="w-4 h-4 text-blue-500 group-hover:translate-x-1 transition-transform" />
                                    </Link>
                                ) : (
                                    <div className="p-4 bg-white/5 border border-dashed border-white/10 rounded-2xl text-center">
                                        <p className="text-[10px] font-black text-slate-600 uppercase tracking-widest italic">Aucun test lié</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Footer Actions */}
                    <div className="p-8 border-t border-white/5 bg-white/[0.01] flex items-center justify-end gap-4">
                        <button
                            onClick={onClose}
                            className="px-8 py-4 text-[10px] font-black uppercase tracking-widest text-slate-500 hover:text-white transition-all"
                        >
                            Fermer
                        </button>
                    </div>
                </div>
            </motion.div>
        </div>
    );
};

export default AnomalyDetailModal;
