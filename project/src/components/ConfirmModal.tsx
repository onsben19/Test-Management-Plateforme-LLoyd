import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, X } from 'lucide-react';
import Button from './ui/Button';

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
    const typeStyles: Record<string, { icon: React.ReactNode, variant: 'danger' | 'primary' | 'secondary', bg: string }> = {
        danger: {
            icon: <AlertTriangle className="w-6 h-6 text-red-500" />,
            variant: 'danger',
            bg: 'bg-red-500/10'
        },
        warning: {
            icon: <AlertTriangle className="w-6 h-6 text-amber-500" />,
            variant: 'secondary',
            bg: 'bg-amber-500/10'
        },
        info: {
            icon: <AlertTriangle className="w-6 h-6 text-blue-500" />,
            variant: 'primary',
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
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={onCancel}
                            >
                                {cancelText}
                            </Button>
                            <Button
                                variant={style.variant}
                                size="sm"
                                onClick={() => {
                                    onConfirm();
                                    onCancel();
                                }}
                            >
                                {confirmText}
                            </Button>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
};

export default ConfirmModal;
