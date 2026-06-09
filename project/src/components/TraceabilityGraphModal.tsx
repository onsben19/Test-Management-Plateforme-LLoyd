import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Database, ShieldAlert, GitMerge, FileSpreadsheet, Layers, Target, Briefcase } from 'lucide-react';

interface TraceabilityGraphModalProps {
    isOpen: boolean;
    onClose: () => void;
    releaseData?: any; 
}

const Node = ({ icon: Icon, title, value, subtitle, delay, color }: any) => (
    <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay, duration: 0.5, type: 'spring' }}
        className="relative flex flex-col items-center z-10"
    >
        <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mb-3 shadow-xl backdrop-blur-md border ${color.bg} ${color.border} ${color.text}`}>
            <Icon size={24} />
        </div>
        <div className="bg-slate-900/80 border border-white/10 rounded-xl p-3 text-center min-w-[140px] backdrop-blur-xl shadow-2xl">
            <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1">{title}</h4>
            <div className="text-lg font-black text-white">{value}</div>
            {subtitle && <div className="text-[9px] font-bold text-slate-400 mt-1">{subtitle}</div>}
        </div>
    </motion.div>
);

const Edge = ({ delay }: { delay: number }) => (
    <motion.div
        initial={{ scaleX: 0, opacity: 0 }}
        animate={{ scaleX: 1, opacity: 1 }}
        transition={{ delay, duration: 0.5, ease: 'easeInOut' }}
        className="hidden md:flex flex-1 h-0.5 bg-gradient-to-r from-slate-700/50 via-blue-500/50 to-slate-700/50 origin-left relative z-0 mx-2"
    >
        <motion.div 
            animate={{ x: ["0%", "100%"] }}
            transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
            className="absolute top-1/2 -translate-y-1/2 w-2 h-2 bg-blue-400 rounded-full shadow-[0_0_10px_#60a5fa]" 
        />
    </motion.div>
);

export default function TraceabilityGraphModal({ isOpen, onClose, releaseData }: TraceabilityGraphModalProps) {
    if (!isOpen) return null;

    // Données factices mais réalistes pour la démo
    const data = {
        project: "InsureTM Core",
        release: releaseData?.name || "Release v1.2",
        campaigns: 4,
        testCases: 120,
        anomalies: 3
    };

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={onClose}
                    className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm"
                />

                <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: 20 }}
                    className="relative w-full max-w-6xl bg-[#0f172a] border border-white/10 rounded-[2.5rem] shadow-2xl overflow-hidden"
                >
                    {/* Ambient Glow */}
                    <div className="absolute top-0 left-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-[100px] pointer-events-none" />
                    <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-[100px] pointer-events-none" />

                    <div className="relative p-8">
                        {/* Header */}
                        <div className="flex items-center justify-between mb-16">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 rounded-2xl bg-blue-500/10 flex items-center justify-center border border-blue-500/20">
                                    <GitMerge className="text-blue-400" size={24} />
                                </div>
                                <div>
                                    <h2 className="text-2xl font-black text-white uppercase tracking-tight">Graphe de Traçabilité</h2>
                                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">Vue end-to-end des relations relationnelles</p>
                                </div>
                            </div>
                            <button
                                onClick={onClose}
                                className="w-10 h-10 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-slate-400 hover:text-white transition-colors"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        {/* Graph Canvas */}
                        <div className="py-12 px-4 relative">
                            {/* Grid BG */}
                            <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:32px_32px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_50%,#000_70%,transparent_100%)] pointer-events-none opacity-50" />

                            <div className="flex flex-col md:flex-row items-center justify-between gap-8 md:gap-0 relative z-10 w-full">
                                <Node 
                                    icon={Briefcase} 
                                    title="Projet Métier" 
                                    value={data.project} 
                                    delay={0.1}
                                    color={{ bg: 'bg-indigo-500/10', border: 'border-indigo-500/30', text: 'text-indigo-400' }}
                                />
                                
                                <Edge delay={0.3} />
                                
                                <Node 
                                    icon={Layers} 
                                    title="Release" 
                                    value={data.release} 
                                    subtitle="Version Cible"
                                    delay={0.4}
                                    color={{ bg: 'bg-blue-500/10', border: 'border-blue-500/30', text: 'text-blue-400' }}
                                />
                                
                                <Edge delay={0.6} />
                                
                                <Node 
                                    icon={FileSpreadsheet} 
                                    title="Campagnes" 
                                    value={`${data.campaigns} Actives`} 
                                    delay={0.7}
                                    color={{ bg: 'bg-emerald-500/10', border: 'border-emerald-500/30', text: 'text-emerald-400' }}
                                />
                                
                                <Edge delay={0.9} />
                                
                                <Node 
                                    icon={Target} 
                                    title="Cas de Tests" 
                                    value={data.testCases} 
                                    subtitle="Total planifié"
                                    delay={1.0}
                                    color={{ bg: 'bg-amber-500/10', border: 'border-amber-500/30', text: 'text-amber-400' }}
                                />
                                
                                <Edge delay={1.2} />
                                
                                <Node 
                                    icon={ShieldAlert} 
                                    title="Anomalies" 
                                    value={data.anomalies} 
                                    subtitle="Remontées liées"
                                    delay={1.3}
                                    color={{ bg: 'bg-rose-500/10', border: 'border-rose-500/30', text: 'text-rose-400' }}
                                />
                            </div>
                        </div>

                        {/* Footer details */}
                        <div className="mt-16 bg-[#131c31] border border-white/5 rounded-2xl p-5 flex items-start sm:items-center gap-4 text-xs font-bold text-slate-400 shadow-inner">
                            <Database size={24} className="text-slate-500 flex-shrink-0" />
                            <span className="leading-relaxed">
                                Le moteur relationnel assure une <strong className="text-white">traçabilité stricte</strong> de bout-en-bout. 
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
