import React, { useState } from 'react';
import { X, Plus } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';

interface NewProjectModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (formData: FormData) => Promise<void>;
}

const NewProjectModal: React.FC<NewProjectModalProps> = ({ isOpen, onClose, onSubmit }) => {
    const { t } = useTranslation();
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (isSubmitting) return;
        setIsSubmitting(true);
        try {
            const formData = new FormData();
            formData.append('name', name);
            formData.append('description', description);
            await onSubmit(formData);
            setName('');
            setDescription('');
        } catch (error) {
            console.error('Failed to create project', error);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[200000] flex items-center justify-center p-4 bg-slate-900/50 dark:bg-slate-900/50 dark:bg-black/70 backdrop-blur-sm">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.97, y: 12 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.97, y: 12 }}
                        transition={{ duration: 0.18 }}
                        className="bg-white dark:bg-[#0d1117] border border-slate-200 dark:border-white/[0.08] rounded-[20px] w-full max-w-md shadow-[0_32px_80px_rgba(0,0,0,0.6)] overflow-hidden flex flex-col"
                    >
                        {/* Header */}
                        <div className="px-6 pt-6 pb-5 flex items-center justify-between border-b border-slate-200 dark:border-white/[0.06]">
                            <div>
                                <div className="flex items-center gap-2 mb-1">
                                    <div className="w-1.5 h-5 rounded-full bg-[#378ADD]" />
                                    <h2 className="text-[17px] font-semibold text-slate-900 dark:text-white">
                                        {t('adminDashboard.newProject.title')}
                                    </h2>
                                </div>
                                <p className="text-[11px] text-slate-500 dark:text-white/30 ml-4">Créer un nouveau projet de portefeuille</p>
                            </div>
                            <button
                                onClick={onClose}
                                className="w-8 h-8 flex items-center justify-center rounded-full bg-slate-100 dark:bg-white/[0.05] hover:bg-slate-100 dark:hover:bg-white/10 text-slate-500 dark:text-white/40 hover:text-slate-900 dark:hover:text-white transition-all border border-slate-200 dark:border-white/[0.06]"
                            >
                                <X size={15} />
                            </button>
                        </div>

                        {/* Body */}
                        <form id="new-project-form" onSubmit={handleSubmit} className="p-6 space-y-4">
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-bold text-slate-500 dark:text-white/30 uppercase tracking-[0.15em]">
                                    {t('adminDashboard.newProject.nameLabel')}
                                </label>
                                <input
                                    type="text"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    className="w-full bg-slate-50 dark:bg-[#1a2235] border border-slate-200 dark:border-white/[0.08] rounded-[10px] px-4 py-2.5 text-[13px] text-slate-900 dark:text-white placeholder:text-slate-400 dark:text-white/20 focus:border-[#378ADD]/50 focus:ring-0 outline-none transition-colors"
                                    placeholder={t('adminDashboard.newProject.namePlaceholder')}
                                    required
                                />
                            </div>

                            <div className="space-y-1.5">
                                <label className="text-[10px] font-bold text-slate-500 dark:text-white/30 uppercase tracking-[0.15em]">
                                    {t('adminDashboard.newProject.descLabel')}
                                </label>
                                <textarea
                                    value={description}
                                    onChange={(e) => setDescription(e.target.value)}
                                    className="w-full bg-slate-50 dark:bg-[#1a2235] border border-slate-200 dark:border-white/[0.08] rounded-[10px] px-4 py-2.5 text-[13px] text-slate-900 dark:text-white placeholder:text-slate-400 dark:text-white/20 focus:border-[#378ADD]/50 focus:ring-0 outline-none min-h-[100px] resize-none transition-colors"
                                    placeholder={t('adminDashboard.newProject.descPlaceholder')}
                                />
                            </div>
                        </form>

                        {/* Footer */}
                        <div className="px-6 py-4 border-t border-slate-200 dark:border-white/[0.06] flex items-center gap-3">
                            <button
                                type="button"
                                onClick={onClose}
                                className="px-5 py-2.5 text-[12px] font-medium text-slate-500 dark:text-white/40 hover:text-slate-900 dark:hover:text-white transition-colors rounded-[8px] hover:bg-slate-100 dark:bg-white/[0.05]"
                            >
                                {t('adminDashboard.newProject.cancel')}
                            </button>
                            <button
                                form="new-project-form"
                                type="submit"
                                disabled={isSubmitting || !name.trim()}
                                className="flex-1 py-2.5 bg-[#378ADD] hover:bg-[#2e75bc] disabled:opacity-40 text-white rounded-[10px] text-[13px] font-semibold transition-all flex items-center justify-center gap-2 active:scale-[0.98]"
                            >
                                <Plus size={14} />
                                {isSubmitting ? t('adminDashboard.newProject.submitting') : t('adminDashboard.newProject.submit')}
                            </button>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
};

export default NewProjectModal;
