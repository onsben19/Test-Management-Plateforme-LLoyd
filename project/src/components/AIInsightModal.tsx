import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Sparkles, Brain, Zap } from 'lucide-react';
import Button from './ui/Button';

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
                        className="absolute inset-0 bg-slate-950/80 backdrop-blur-md"
                    />
                    
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.9, y: 20 }}
                        className="bg-slate-900 border border-white/10 w-full max-w-lg rounded-[2.5rem] p-8 shadow-2xl relative overflow-hidden"
                    >
                        {/* Header Decoration */}
                        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 to-purple-500" />
                        
                        <div className="flex items-center justify-between mb-8">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 rounded-2xl bg-blue-500/10 flex items-center justify-center text-blue-400">
                                    <Brain size={24} />
                                </div>
                                <div>
                                    <h2 className="text-xl font-black text-white uppercase tracking-tight">{title}</h2>
                                    <span className="text-[10px] font-black text-blue-500 uppercase tracking-[0.2em]">ANALYSE IA GÉNÉRATIVE</span>
                                </div>
                            </div>
                            <button 
                                onClick={onClose}
                                className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center text-slate-400 hover:bg-white/10 hover:text-white transition-all"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        <div className="space-y-6">
                            <div className="bg-[#131b26]/80 border border-white/5 rounded-2xl p-6 relative group overflow-hidden">
                                <div className="absolute -right-4 -top-4 opacity-5 group-hover:opacity-10 transition-opacity">
                                    <Zap size={80} />
                                </div>
                                <div className="flex items-center gap-2 mb-4 text-amber-500">
                                    <Sparkles size={16} />
                                    <span className="text-[10px] font-black uppercase tracking-widest">Diagnostic IA</span>
                                </div>
                                <p className="text-slate-300 leading-relaxed font-medium italic">
                                    "{insight}"
                                </p>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="bg-white/5 border border-white/5 rounded-2xl p-4">
                                    <div className="text-slate-500 text-[9px] font-black uppercase tracking-widest mb-1">Confiance</div>
                                    <div className="text-lg font-black text-white">94.2%</div>
                                </div>
                                <div className="bg-white/5 border border-white/5 rounded-2xl p-4">
                                    <div className="text-slate-500 text-[9px] font-black uppercase tracking-widest mb-1">Impact</div>
                                    <div className="text-lg font-black text-blue-400">CRITIQUE</div>
                                </div>
                            </div>
                        </div>

                        <div className="mt-10 flex gap-4">
                            <Button 
                                variant="secondary"
                                onClick={onClose}
                                className="flex-1"
                            >
                                FERMER
                            </Button>
                            {showOptimizeButton && (
                                <Button 
                                    variant="primary"
                                    onClick={onOptimize}
                                    icon={Zap}
                                    className="flex-[1.5]"
                                >
                                    OPTIMISER MAINTENANT
                                </Button>
                            )}
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
};

export default AIInsightModal;
