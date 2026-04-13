import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Sparkles, Brain, Zap } from 'lucide-react';

interface AIInsightModalProps {
    isOpen: boolean;
    onClose: () => void;
    title: string;
    insight: string;
    onOptimize?: () => void;
    showOptimizeButton?: boolean;
}

const AIInsightModal: React.FC<AIInsightModalProps> = ({ isOpen, onClose, title, insight, onOptimize, showOptimizeButton }) => {
    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4">
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="absolute inset-0 bg-slate-950/90 backdrop-blur-xl"
                    />

                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 10 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 10 }}
                        className="relative w-full max-w-lg bg-[#0b0e14] border border-white/10 rounded-[2.5rem] shadow-2xl overflow-hidden"
                    >
                        {/* Header */}
                        <div className="p-8 border-b border-white/5 flex items-center justify-between bg-gradient-to-r from-blue-500/5 to-transparent">
                            <div className="flex items-center gap-4">
                                <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-2xl">
                                    <Brain className="w-6 h-6 text-blue-400" />
                                </div>
                                <div>
                                    <h3 className="text-xl font-black text-white leading-none mb-1.5 uppercase tracking-tight">Analyse Expert IA</h3>
                                    <p className="text-[10px] font-black text-blue-400/60 uppercase tracking-widest">{title}</p>
                                </div>
                            </div>
                            <button
                                onClick={onClose}
                                className="p-2 hover:bg-white/5 rounded-full transition-colors text-slate-500 hover:text-white"
                            >
                                <X size={24} />
                            </button>
                        </div>

                        {/* Content */}
                        <div className="p-10">
                            <div className="relative">
                                <Sparkles className="absolute -top-6 -left-6 w-12 h-12 text-blue-500/5" />
                                <p className="text-xl text-slate-300 font-bold leading-relaxed italic tracking-tight">
                                    "{insight}"
                                </p>
                            </div>
                        </div>

                        {/* Footer */}
                        <div className="p-8 bg-slate-950/40 border-t border-white/5 flex items-center justify-end gap-4">
                            <button
                                onClick={onClose}
                                className="py-3 px-8 bg-white/5 hover:bg-white/10 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all border border-white/10"
                            >
                                COMPRIS
                            </button>
                            {showOptimizeButton && onOptimize && (
                                <button
                                    onClick={() => {
                                        onClose();
                                        onOptimize();
                                    }}
                                    className="py-3 px-8 bg-blue-600 hover:bg-blue-500 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all shadow-xl shadow-blue-500/30 flex items-center gap-3 animate-pulse-subtle hover:scale-105 active:scale-95"
                                >
                                    <Zap size={14} className="fill-white" />
                                    Optimiser avec l'IA
                                </button>
                            )}
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
};

export default AIInsightModal;
