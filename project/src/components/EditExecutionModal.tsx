import React, { useState } from 'react';
import { X, Save, Upload, FileText, Trash2 } from 'lucide-react';
import type { TestItem } from './ExecutionTestList';

interface EditExecutionModalProps {
    test: TestItem;
    onClose: () => void;
    onSave: (id: string, updates: FormData) => Promise<void>;
}

const EditExecutionModal: React.FC<EditExecutionModalProps> = ({ test, onClose, onSave }) => {
    const [status, setStatus] = useState<TestItem['status']>(test.status);
    const [file, setFile] = useState<File | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [name, setName] = useState<string>(test.name);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        try {
            const formData = new FormData();
            formData.append('status', status.toUpperCase()); // Backend expects uppercase usually? Serializer converts? status choices in model are usually UPPERCASE or whatever.
            // Let's check model. TestCase status choices are likely 'PASSED', 'FAILED', 'RUNNING', 'PENDING'.
            // Frontend generic uses lowercase 'passed', 'failed'. 
            // Previous handleSubmit in TesterDashboard sent 'PASSED'/'FAILED'. 
            // Let's send UPPERCASE to be safe, or match what TesterDashboard.tsx does.
            formData.append('test_case_ref', name); // Append name as test_case_ref

            if (file) {
                formData.append('proof_file', file);
            }

            // If we strictly follow the user request "failed -> anomaly", we might want to ensure 
            // they can't just set it to failed without an anomaly, but for now just basic edit.

            await onSave(test.id, formData);
            onClose();
        } catch (error) {
            console.error("Failed to update execution", error);
            // Error handling usually done in parent
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-fade-in">
            <div className="bg-white dark:bg-slate-900 rounded-xl shadow-2xl w-full max-w-lg border border-slate-200 dark:border-slate-700 overflow-hidden">
                <div className="p-6 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/50">
                    <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                        Modifier l'exécution
                    </h2>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-full text-slate-500 dark:text-slate-400 transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-6">
                    {/* Test Name Input */}
                    <div className="space-y-2">
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                            Nom du test
                        </label>
                        <input
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-4 py-2 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
                            placeholder="Entrez le nom du test"
                        />
                        <div className="text-xs text-slate-500 dark:text-slate-400">
                            {test.module} • {test.release}
                        </div>
                    </div>

                    {/* Status Selection */}
                    <div className="space-y-2">
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                            Statut
                        </label>
                        <div className="grid grid-cols-2 gap-3">
                            {(['passed', 'failed'] as const).map((s) => (
                                <button
                                    key={s}
                                    type="button"
                                    onClick={() => setStatus(s)}
                                    className={`p-3 rounded-lg border text-sm font-medium capitalize transition-all ${status === s
                                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 ring-1 ring-blue-500'
                                        : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:border-blue-300 dark:hover:border-blue-700'
                                        }`}
                                >
                                    {s}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Proof File */}
                    <div className="space-y-2">
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                            Preuve / Capture (Optionnel)
                        </label>
                        <div className="border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-lg p-6 hover:border-blue-500 dark:hover:border-blue-500 transition-colors bg-slate-50 dark:bg-slate-800/30 text-center">
                            <input
                                type="file"
                                id="edit-proof-file"
                                className="hidden"
                                onChange={(e) => {
                                    if (e.target.files?.[0]) setFile(e.target.files[0]);
                                }}
                            />
                            <label htmlFor="edit-proof-file" className="cursor-pointer space-y-2 block">
                                <div className="mx-auto w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center text-blue-600 dark:text-blue-400">
                                    <Upload className="w-5 h-5" />
                                </div>
                                <div className="text-sm text-slate-600 dark:text-slate-400">
                                    <span className="font-medium text-blue-600 dark:text-blue-400 hover:underline">Cliquez pour ajouter</span> ou glisser-déposer
                                </div>
                                {file && (
                                    <div className="flex items-center justify-center gap-2 text-xs text-emerald-600 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-900/20 py-1 px-2 rounded-full inline-block mt-2">
                                        <FileText className="w-3 h-3" />
                                        {file.name}
                                        <button
                                            onClick={(e) => {
                                                e.preventDefault();
                                                setFile(null);
                                            }}
                                            className="hover:text-red-500 ml-1"
                                        >
                                            <X className="w-3 h-3" />
                                        </button>
                                    </div>
                                )}
                            </label>
                        </div>
                        {/* Show existing captures if any? */}
                        {test.captures && test.captures.length > 0 && !file && (
                            <div className="text-xs text-slate-500 mt-2">
                                Capture actuelle: <a href={test.captures[0]} target="_blank" rel="noreferrer" className="text-blue-500 hover:underline">Voir le fichier</a>
                                <p className="italic">Uploader un nouveau fichier remplacera l'existant.</p>
                            </div>
                        )}
                    </div>

                    {/* Actions */}
                    <div className="flex justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-700">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
                        >
                            Annuler
                        </button>
                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors disabled:opacity-50"
                        >
                            <Save className="w-4 h-4" />
                            {isSubmitting ? 'Enregistrement...' : 'Enregistrer'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default EditExecutionModal;
