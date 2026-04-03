import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, X } from 'lucide-react';

interface ConfirmModalProps {
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
    onCancel: () => void;
    confirmText?: string;
    cancelText?: string;
    type?: 'danger' | 'warning' | 'info';
}

const ConfirmModal: React.FC<ConfirmModalProps> = ({
    isOpen,
    title,
    message,
    onConfirm,
    onCancel,
    confirmText = 'Confirmer',
    cancelText = 'Annuler',
    type = 'danger'
}) => {
    const typeStyles = {
        danger: {
            icon: <AlertTriangle className="w-6 h-6 text-red-500" />,
            button: 'bg-red-600 hover:bg-red-700 shadow-red-500/20',
            bg: 'bg-red-500/10'
        },
        warning: {
            icon: <AlertTriangle className="w-6 h-6 text-amber-500" />,
            button: 'bg-amber-600 hover:bg-amber-700 shadow-amber-500/20',
            bg: 'bg-amber-500/10'
        },
        info: {
            icon: <AlertTriangle className="w-6 h-6 text-blue-500" />,
            button: 'bg-blue-600 hover:bg-blue-700 shadow-blue-500/20',
            bg: 'bg-blue-500/10'
        }
    };

    const style = typeStyles[type];

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onCancel}
                        className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm"
                    />

                    {/* Modal Content */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.9, y: 20 }}
                        className="relative w-full max-w-md bg-slate-900 border border-slate-700/50 rounded-2xl shadow-2xl overflow-hidden shadow-black/50"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="p-6">
                            <div className="flex items-start gap-4">
                                <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${style.bg}`}>
                                    {style.icon}
                                </div>
                                <div className="flex-1">
                                    <h3 className="text-xl font-bold text-white mb-2">{title}</h3>
                                    <p className="text-slate-400 text-sm leading-relaxed">{message}</p>
                                </div>
                                <button
                                    onClick={onCancel}
                                    className="p-1 hover:bg-white/10 rounded-lg text-slate-500 hover:text-white transition-colors"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            </div>
                        </div>

                        <div className="p-4 bg-slate-800/50 flex items-center justify-end gap-3 border-t border-slate-700/50">
                            <button
                                onClick={onCancel}
                                className="px-5 py-2.5 rounded-xl text-sm font-bold text-slate-400 hover:text-white hover:bg-white/5 transition-all active:scale-95"
                            >
                                {cancelText}
                            </button>
                            <button
                                onClick={() => {
                                    onConfirm();
                                    onCancel(); // Close after confirming
                                }}
                                className={`px-6 py-2.5 rounded-xl text-sm font-bold text-white shadow-lg transition-all active:scale-95 ${style.button}`}
                            >
                                {confirmText}
                            </button>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
};

export default ConfirmModal;
