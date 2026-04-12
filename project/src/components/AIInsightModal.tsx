import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Sparkles, Brain } from 'lucide-react';

interface AIInsightModalProps {
    isOpen: boolean;
    onClose: () => void;
    title: string;
    insight: string;
}

const AIInsightModal: React.FC<AIInsightModalProps> = ({ isOpen, onClose, title, insight }) => {
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
                        className="relative w-full max-w-lg bg-slate-900 border border-white/10 rounded-3xl shadow-2xl overflow-hidden"
                    >
                        {/* Header */}
                        <div className="p-6 border-b border-white/5 flex items-center justify-between bg-gradient-to-r from-blue-500/5 to-transparent">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-blue-500/20 rounded-lg">
                                    <Brain className="w-5 h-5 text-blue-400" />
                                </div>
                                <div>
                                    <h3 className="text-lg font-black text-white leading-none mb-1">Expert IA</h3>
                                    <p className="text-[10px] font-black text-blue-400/60 uppercase tracking-widest">{title}</p>
                                </div>
                            </div>
                            <button
                                onClick={onClose}
                                className="p-2 hover:bg-white/5 rounded-full transition-colors text-slate-500 hover:text-white"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        {/* Content */}
                        <div className="p-8">
                            <div className="relative">
                                <Sparkles className="absolute -top-4 -left-4 w-8 h-8 text-blue-500/10" />
                                <p className="text-lg text-slate-300 font-medium leading-relaxed italic">
                                    "{insight}"
                                </p>
                            </div>
                        </div>

                        {/* Footer */}
                        <div className="p-6 bg-slate-950/40 border-t border-white/5 flex justify-end">
                            <button
                                onClick={onClose}
                                className="py-2.5 px-6 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-black tracking-widest transition-all shadow-lg shadow-blue-500/20"
                            >
                                COMPRIS
                            </button>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
};

export default AIInsightModal;
