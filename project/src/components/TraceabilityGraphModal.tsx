import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Database } from 'lucide-react';

interface TraceabilityGraphModalProps {
    isOpen: boolean;
    onClose: () => void;
    releaseData?: any;
    projectData?: any;
}

interface NodeColor {
    dot: string;
    ring: string;
    glow: string;
}

interface NodeProps {
    title: string;
    value: string | number;
    subtitle?: string;
    delay: number;
    color: NodeColor;
}

const Node = ({ title, value, subtitle, delay, color }: NodeProps) => (
    <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        whileHover={{ y: -6, scale: 1.02 }}
        transition={{
            opacity: { duration: 0.4, delay },
            y: { type: 'spring', stiffness: 100, damping: 12, delay },
            scale: { duration: 0.2, ease: 'easeOut' },
        }}
        className="relative flex flex-col items-center z-10 group cursor-pointer"
    >
        <div className={`absolute -inset-4 rounded-[2.5rem] bg-gradient-to-br ${color.glow} opacity-0 group-hover:opacity-15 blur-xl transition-all duration-500 pointer-events-none`} />

        {/* Point coloré — repère visuel du nœud */}
        <div className="relative mb-3 flex flex-col items-center">
            <div className={`w-3.5 h-3.5 rounded-full ${color.dot} ring-[6px] ${color.ring} transition-all duration-300 group-hover:scale-125 group-hover:ring-[8px]`} />
            <div className="w-px h-5 bg-gradient-to-b from-white/25 to-transparent mt-2" />
        </div>

        <div className="bg-slate-200/80 dark:bg-slate-200/80 dark:bg-slate-950/80 border border-slate-200 dark:border-white/5 rounded-2xl p-4 text-center min-w-[160px] max-w-[200px] backdrop-blur-xl shadow-2xl transition-all duration-300 group-hover:border-slate-200 dark:border-white/10 group-hover:bg-slate-900/90 relative">
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-10 h-[2px] bg-gradient-to-r from-transparent via-white/20 to-transparent" />
            <h4 className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-500 mb-2">{title}</h4>
            <div className="text-sm font-black text-slate-900 dark:text-white group-hover:text-blue-400 transition-colors leading-snug break-words">{value}</div>
            {subtitle && <div className="text-[9px] font-bold text-slate-400 mt-1.5 opacity-60">{subtitle}</div>}
        </div>
    </motion.div>
);

const Edge = ({ delay, color }: { delay: number; color: string }) => (
    <motion.div
        initial={{ scaleX: 0, opacity: 0 }}
        animate={{ scaleX: 1, opacity: 1 }}
        transition={{ delay, duration: 0.6, ease: 'easeInOut' }}
        className="hidden md:flex flex-1 h-[2px] bg-slate-100 dark:bg-white/[0.04] origin-left relative z-0 mx-3 rounded-full self-start mt-[7px]"
    >
        <div className={`absolute inset-0 bg-gradient-to-r ${color} opacity-40`} />
        <motion.div
            animate={{ x: ['-20%', '120%'] }}
            transition={{ duration: 3, repeat: Infinity, ease: 'linear', delay }}
            className="absolute top-1/2 -translate-y-1/2 w-8 h-[2px] bg-gradient-to-r from-transparent via-white to-transparent shadow-[0_0_8px_rgba(255,255,255,0.8)]"
        />
    </motion.div>
);

export default function TraceabilityGraphModal({ isOpen, onClose, releaseData, projectData }: TraceabilityGraphModalProps) {
    if (!isOpen) return null;

    const data = {
        project: projectData?.name || releaseData?.project_name || 'InsureTM Core',
        release: releaseData?.name || (projectData ? `${projectData.releases_count || 0} Release(s)` : 'Toutes Releases'),
        campaigns: projectData ? (projectData.campaigns_count || 4) : 4,
        testCases: projectData ? (projectData.test_cases_count || 120) : 120,
        anomalies: projectData ? (projectData.anomalies_count || 3) : 3,
    };

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={onClose}
                    className="absolute inset-0 bg-slate-950/85 backdrop-blur-md"
                />

                <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: 20 }}
                    className="relative w-full max-w-6xl bg-[#060a13]/95 border border-slate-200 dark:border-white/10 rounded-[3rem] shadow-2xl overflow-hidden backdrop-blur-3xl my-8"
                >
                    <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-indigo-500 via-blue-500 via-emerald-500 via-amber-500 to-rose-500 opacity-60" />

                    <div className="absolute -top-40 left-1/4 w-[450px] h-[450px] bg-blue-500/10 rounded-full blur-[120px] pointer-events-none" />
                    <div className="absolute -bottom-40 right-1/4 w-[450px] h-[450px] bg-purple-500/10 rounded-full blur-[120px] pointer-events-none" />

                    <div className="relative p-8 sm:p-10">
                        <div className="flex items-center justify-between mb-16">
                            <div className="flex items-center gap-4">
                                <div className="flex items-center gap-1.5 px-3 py-2 rounded-full bg-white dark:bg-white/[0.03] border border-slate-200 dark:border-white/5">
                                    {['bg-indigo-400', 'bg-blue-400', 'bg-emerald-400', 'bg-amber-400', 'bg-rose-400'].map((c, i) => (
                                        <span key={i} className={`w-2 h-2 rounded-full ${c} opacity-80`} />
                                    ))}
                                </div>
                                <div>
                                    <h2 className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-white via-slate-100 to-slate-300 uppercase tracking-tight">
                                        Graphe de Traçabilité
                                    </h2>
                                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em] mt-1">
                                        Vue end-to-end des relations relationnelles
                                    </p>
                                </div>
                            </div>
                            <button
                                onClick={onClose}
                                className="w-10 h-10 rounded-full bg-white/5 hover:bg-slate-100 dark:hover:bg-white/10 flex items-center justify-center text-slate-400 hover:text-slate-900 dark:hover:text-white transition-all transform hover:rotate-90 duration-300 border border-slate-200 dark:border-white/5"
                            >
                                <X size={18} />
                            </button>
                        </div>

                        <div className="py-10 px-4 relative">
                            <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.01)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.01)_1px,transparent_1px)] bg-[size:32px_32px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_50%,#000_70%,transparent_100%)] pointer-events-none opacity-40" />

                            <div className="flex flex-col md:flex-row items-start justify-between gap-10 md:gap-0 relative z-10 w-full">
                                <Node
                                    title="Projet Métier"
                                    value={data.project}
                                    delay={0.1}
                                    color={{
                                        dot: 'bg-indigo-400 shadow-[0_0_14px_rgba(129,140,248,0.7)]',
                                        ring: 'ring-indigo-500/20 group-hover:ring-indigo-500/35',
                                        glow: 'from-indigo-500 to-purple-500',
                                    }}
                                />

                                <Edge delay={0.2} color="from-indigo-500/50 to-blue-500/50" />

                                <Node
                                    title="Release"
                                    value={data.release}
                                    subtitle="Version Cible"
                                    delay={0.3}
                                    color={{
                                        dot: 'bg-blue-400 shadow-[0_0_14px_rgba(96,165,250,0.7)]',
                                        ring: 'ring-blue-500/20 group-hover:ring-blue-500/35',
                                        glow: 'from-blue-500 to-cyan-500',
                                    }}
                                />

                                <Edge delay={0.4} color="from-blue-500/50 to-emerald-500/50" />

                                <Node
                                    title="Campagnes"
                                    value={`${data.campaigns} Actives`}
                                    delay={0.5}
                                    color={{
                                        dot: 'bg-emerald-400 shadow-[0_0_14px_rgba(52,211,153,0.7)]',
                                        ring: 'ring-emerald-500/20 group-hover:ring-emerald-500/35',
                                        glow: 'from-emerald-500 to-teal-500',
                                    }}
                                />

                                <Edge delay={0.6} color="from-emerald-500/50 to-amber-500/50" />

                                <Node
                                    title="Cas de Tests"
                                    value={data.testCases}
                                    subtitle="Total planifié"
                                    delay={0.7}
                                    color={{
                                        dot: 'bg-amber-400 shadow-[0_0_14px_rgba(251,191,36,0.7)]',
                                        ring: 'ring-amber-500/20 group-hover:ring-amber-500/35',
                                        glow: 'from-amber-500 to-orange-500',
                                    }}
                                />

                                <Edge delay={0.8} color="from-amber-500/50 to-rose-500/50" />

                                <Node
                                    title="Anomalies"
                                    value={data.anomalies}
                                    subtitle="Remontées liées"
                                    delay={0.9}
                                    color={{
                                        dot: 'bg-rose-400 shadow-[0_0_14px_rgba(251,113,133,0.7)]',
                                        ring: 'ring-rose-500/20 group-hover:ring-rose-500/35',
                                        glow: 'from-rose-500 to-red-500',
                                    }}
                                />
                            </div>
                        </div>

                        <div className="mt-12 bg-white/[0.02] border border-slate-200 dark:border-white/5 rounded-3xl p-6 flex items-start sm:items-center gap-5 text-xs font-medium text-slate-400 shadow-inner relative overflow-hidden">
                            <div className="absolute top-0 left-0 w-[3px] h-full bg-gradient-to-b from-blue-500 to-indigo-500" />
                            <Database size={24} className="text-slate-500 flex-shrink-0" />
                            <span className="leading-relaxed">
                                Le moteur relationnel assure une <strong className="text-white font-extrabold">traçabilité stricte</strong> de bout-en-bout.
                                Chaque anomalie remontée hérite systématiquement du contexte d'exécution de son cas de test,
                                rattaché à sa campagne d'origine, elle-même dépendante des objectifs de la Release et du Projet Métier global.
                            </span>
                        </div>
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>
    );
}
