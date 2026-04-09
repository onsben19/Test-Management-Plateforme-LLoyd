import React, { useState } from 'react';
import { X, Plus, Folder, Sparkles } from 'lucide-react';
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
        setIsSubmitting(true);
        try {
            const formData = new FormData();
            formData.append('name', name);
            formData.append('description', description);

            await onSubmit(formData);

            // Reset form
            setName('');
            setDescription('');
        } catch (error) {
            console.error("Failed to create project", error);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="absolute inset-0 bg-slate-950/60 backdrop-blur-md"
                    />

                    {/* Modal Content */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.9, y: 20 }}
                        className="relative bg-white/80 dark:bg-slate-900/80 backdrop-blur-2xl rounded-[2rem] shadow-2xl w-full max-w-lg border border-white/20 dark:border-slate-700/50 overflow-hidden flex flex-col max-h-[90vh]"
                    >
                        {/* Header */}
                        <div className="p-8 border-b border-slate-200/50 dark:border-slate-700/50 flex items-center justify-between">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 rounded-2xl bg-blue-500/10 flex items-center justify-center">
                                    <Folder className="w-6 h-6 text-blue-500" />
                                </div>
                                <div>
                                    <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                                        {t('adminDashboard.newProject.title')}
                                    </h2>
                                    <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
                                        INITIALISER UNE NOUVELLE RELEASE
                                    </p>
                                </div>
                            </div>
                            <button
                                onClick={onClose}
                                className="p-3 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-2xl text-slate-500 dark:text-slate-400 transition-all hover:scale-110 active:scale-90"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Form */}
                        <form id="new-project-form" onSubmit={handleSubmit} className="p-8 space-y-8 overflow-y-auto">
                            <div className="space-y-3">
                                <label className="block text-sm font-bold text-slate-700 dark:text-slate-200 uppercase tracking-wider">
                                    {t('adminDashboard.newProject.nameLabel')}
                                </label>
                                <div className="relative group">
                                    <input
                                        type="text"
                                        value={name}
                                        onChange={(e) => setName(e.target.value)}
                                        className="w-full bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/50 rounded-2xl px-5 py-4 text-slate-900 dark:text-white focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all group-hover:border-slate-300 dark:group-hover:border-slate-600"
                                        placeholder={t('adminDashboard.newProject.namePlaceholder')}
                                        required
                                    />
                                    <Sparkles className="absolute right-5 top-1/2 -translate-y-1/2 w-4 h-4 text-blue-500/50 opacity-0 group-hover:opacity-100 transition-opacity" />
                                </div>
                            </div>

                            <div className="space-y-3">
                                <label className="block text-sm font-bold text-slate-700 dark:text-slate-200 uppercase tracking-wider">
                                    {t('adminDashboard.newProject.descLabel')}
                                </label>
                                <textarea
                                    value={description}
                                    onChange={(e) => setDescription(e.target.value)}
                                    className="w-full bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/50 rounded-2xl px-5 py-4 text-slate-900 dark:text-white focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all min-h-[140px] group-hover:border-slate-300 dark:group-hover:border-slate-600 shadow-inner"
                                    placeholder={t('adminDashboard.newProject.descPlaceholder')}
                                />
                            </div>
                        </form>

                        {/* Footer */}
                        <div className="p-8 border-t border-slate-200/50 dark:border-slate-700/50 flex justify-end gap-4 bg-slate-50/30 dark:bg-slate-800/30">
                            <button
                                type="button"
                                onClick={onClose}
                                className="px-6 py-3 text-sm font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-2xl transition-all active:scale-95"
                            >
                                {t('adminDashboard.newProject.cancel')}
                            </button>
                            <button
                                form="new-project-form"
                                type="submit"
                                disabled={isSubmitting}
                                className="flex items-center gap-2.5 px-8 py-3 text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-2xl transition-all shadow-xl shadow-blue-500/25 hover:scale-105 active:scale-95 disabled:opacity-50 disabled:hover:scale-100"
                            >
                                <Plus className="w-5 h-5" />
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
