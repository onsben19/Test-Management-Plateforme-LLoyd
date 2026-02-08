import React, { useState } from 'react';
import { X, Plus, Folder } from 'lucide-react';

interface NewProjectModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (formData: FormData) => Promise<void>;
}

const NewProjectModal: React.FC<NewProjectModalProps> = ({ isOpen, onClose, onSubmit }) => {
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    if (!isOpen) return null;

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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-fade-in">
            <div className="bg-white dark:bg-slate-900 rounded-xl shadow-2xl w-full max-w-lg border border-slate-200 dark:border-slate-700 overflow-hidden flex flex-col max-h-[90vh]">
                <div className="p-6 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/50">
                    <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                        <Folder className="w-5 h-5 text-blue-500" />
                        Nouveau Projet
                    </h2>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-full text-slate-500 dark:text-slate-400 transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-6 overflow-y-auto">
                    <div className="space-y-2">
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                            Nom du projet
                        </label>
                        <input
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-4 py-2 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
                            placeholder="Ex: Refonte Application Mobile"
                            required
                        />
                    </div>

                    <div className="space-y-2">
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                            Description
                        </label>
                        <textarea
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-4 py-2 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors min-h-[100px]"
                            placeholder="Description des objectifs du projet..."
                        />
                    </div>
                </form>

                <div className="p-6 border-t border-slate-200 dark:border-slate-700 flex justify-end gap-3 bg-slate-50/50 dark:bg-slate-800/50">
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
                    >
                        Annuler
                    </button>
                    <button
                        onClick={handleSubmit}
                        disabled={isSubmitting}
                        className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors disabled:opacity-50"
                    >
                        <Plus className="w-4 h-4" />
                        {isSubmitting ? 'Création...' : 'Créer le projet'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default NewProjectModal;
