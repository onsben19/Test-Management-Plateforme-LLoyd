import React, { useState } from 'react';
import { X, Save, Upload, FileText, Trash2, AlertTriangle, Bug } from 'lucide-react';

export interface AnomalyItem {
    id: string;
    title: string;
    description?: string;
    severity: 'Critique' | 'Haute' | 'Moyenne' | 'Faible';
    status: 'Ouverte' | 'En investigation' | 'Résolue';
    proofImage?: string;
    relatedTest?: string;
}

interface EditAnomalyModalProps {
    anomaly?: AnomalyItem; // Optional for creation
    onClose: () => void;
    onSave: (id: string | null, updates: FormData) => Promise<void>;
}

const EditAnomalyModal: React.FC<EditAnomalyModalProps> = ({ anomaly, onClose, onSave }) => {
    const isEditing = !!anomaly;

    // Initial States
    const [title, setTitle] = useState(anomaly?.title || '');
    const [description, setDescription] = useState(anomaly?.description || '');
    const [severity, setSeverity] = useState<AnomalyItem['severity']>(anomaly?.severity || 'Faible');
    const [relatedTest, setRelatedTest] = useState(anomaly?.relatedTest || '');

    // Status only for editing (creation defaults to Open)
    const [status, setStatus] = useState<AnomalyItem['status']>(anomaly?.status || 'Ouverte');

    const [file, setFile] = useState<File | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        try {
            const formData = new FormData();
            formData.append('titre', title);
            formData.append('description', description);
            formData.append('criticite', severity.toUpperCase()); // Backend expects uppercase

            // Only append relatedTest if creating (or if we allow editing it)
            // Backend might expect 'test_case' ID, but we only have string reference here.
            // If creating from Anomalies page, user might just type text reference.
            // Backend needs to handle this or we need a real Test selection.
            // For now, let's assume we pass it as 'test_case_ref' if supported, or just in description?
            // Anomalies created without test case might be "General".
            if (!isEditing && relatedTest) {
                // formData.append('test_case_ref', relatedTest);
            }

            if (file) {
                formData.append('preuve_image', file);
            }

            // Pass null id for creation
            await onSave(anomaly?.id || null, formData);
            onClose();
        } catch (error) {
            console.error("Failed to save anomaly", error);
        } finally {
            setIsSubmitting(false);
        }
    };

    const severityColors = {
        'Critique': 'text-red-600 bg-red-50 border-red-200 dark:bg-red-900/20 dark:border-red-800 dark:text-red-400',
        'Haute': 'text-orange-600 bg-orange-50 border-orange-200 dark:bg-orange-900/20 dark:border-orange-800 dark:text-orange-400',
        'Moyenne': 'text-yellow-600 bg-yellow-50 border-yellow-200 dark:bg-yellow-900/20 dark:border-yellow-800 dark:text-yellow-400',
        'Faible': 'text-blue-600 bg-blue-50 border-blue-200 dark:bg-blue-900/20 dark:border-blue-800 dark:text-blue-400',
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-fade-in">
            <div className="bg-white dark:bg-slate-900 rounded-xl shadow-2xl w-full max-w-lg border border-slate-200 dark:border-slate-700 overflow-hidden flex flex-col max-h-[90vh]">
                <div className="p-6 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/50">
                    <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                        {isEditing ? <AlertTriangle className="w-5 h-5 text-orange-500" /> : <Bug className="w-5 h-5 text-red-500" />}
                        {isEditing ? "Modifier l'anomalie" : "Signalement d'anomalie"}
                    </h2>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-full text-slate-500 dark:text-slate-400 transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-6 overflow-y-auto">
                    {/* Title */}
                    <div className="space-y-2">
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                            Titre
                        </label>
                        <input
                            type="text"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-4 py-2 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
                            placeholder="Ex: Erreur lors de la validation du formulaire"
                            required
                        />
                    </div>

                    {/* Description */}
                    <div className="space-y-2">
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                            Description
                        </label>
                        <textarea
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-4 py-2 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors min-h-[100px]"
                            placeholder="Description détaillée des étapes pour reproduire..."
                        />
                    </div>

                    {/* Severity */}
                    <div className="space-y-2">
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                            Gravité / Criticité
                        </label>
                        <div className="grid grid-cols-2 gap-3">
                            {(['Critique', 'Haute', 'Moyenne', 'Faible'] as const).map((s) => (
                                <button
                                    key={s}
                                    type="button"
                                    onClick={() => setSeverity(s)}
                                    className={`p-3 rounded-lg border text-sm font-medium transition-all flex items-center justify-center gap-2 ${severity === s
                                        ? `ring-1 ring-offset-1 dark:ring-offset-slate-900 ${severityColors[s]}`
                                        : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:border-slate-300 dark:hover:border-slate-600'
                                        }`}
                                >
                                    {s}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Related Test (Creation Only or Display) */}
                    {!isEditing && (
                        <div className="space-y-2">
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                                Test Lié (Optionnel)
                            </label>
                            <input
                                type="text"
                                value={relatedTest}
                                onChange={(e) => setRelatedTest(e.target.value)}
                                className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-4 py-2 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
                                placeholder="Référence du Cas de Test (Ex: TC-001)"
                            />
                        </div>
                    )}

                    {/* Proof Image */}
                    <div className="space-y-2">
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                            Preuve / Capture (Optionnel)
                        </label>
                        <div className="border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-lg p-6 hover:border-blue-500 dark:hover:border-blue-500 transition-colors bg-slate-50 dark:bg-slate-800/30 text-center">
                            <input
                                type="file"
                                id="edit-anomaly-proof"
                                className="hidden"
                                accept="image/*"
                                onChange={(e) => {
                                    if (e.target.files?.[0]) setFile(e.target.files[0]);
                                }}
                            />
                            <label htmlFor="edit-anomaly-proof" className="cursor-pointer space-y-2 block">
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
                        {isEditing && anomaly?.proofImage && !file && (
                            <div className="text-xs text-slate-500 mt-2">
                                <a href={anomaly.proofImage} target="_blank" rel="noreferrer" className="text-blue-500 hover:underline flex items-center gap-1">
                                    <FileText className="w-3 h-3" />
                                    Voir la capture actuelle
                                </a>
                            </div>
                        )}
                    </div>

                    {isEditing && anomaly?.relatedTest && (
                        <div className="flex flex-col gap-2">
                            <div className="text-xs text-slate-500 dark:text-slate-400">
                                Test lié: {anomaly.relatedTest}
                            </div>
                        </div>
                    )}
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
                        <Save className="w-4 h-4" />
                        {isSubmitting ? 'Enregistrement...' : 'Enregistrer'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default EditAnomalyModal;
