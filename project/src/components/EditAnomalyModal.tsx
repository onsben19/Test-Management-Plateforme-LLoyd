import React, { useState, useEffect } from 'react';
import { X, Save, Upload, FileText, Trash2, AlertTriangle, Bug, Loader2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { executionService } from '../services/api';

export interface AnomalyItem {
    id: string;
    title: string;
    description?: string;
    severity: 'Critique' | 'Moyenne' | 'Faible';
    status: 'OUVERTE' | 'EN_INVESTIGATION' | 'RESOLUE';
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
    const { user } = useAuth();

    // Initial States
    const [title, setTitle] = useState(anomaly?.title || '');
    const [description, setDescription] = useState(anomaly?.description || '');
    const [severity, setSeverity] = useState<AnomalyItem['severity']>(anomaly?.severity || 'Critique');
    const [selectedTestCaseId, setSelectedTestCaseId] = useState<string>('');
    const [status, setStatus] = useState<AnomalyItem['status']>(anomaly?.status || 'OUVERTE');
    const [file, setFile] = useState<File | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [testCases, setTestCases] = useState<any[]>([]);
    const [loadingTests, setLoadingTests] = useState(false);

    useEffect(() => {
        if (!isEditing && user) {
            fetchUserTestCases();
        }
    }, [isEditing, user]);

    const fetchUserTestCases = async () => {
        setLoadingTests(true);
        try {
            const response = await executionService.getExecutions();
            const data = response.data.results || response.data;
            // Filter by current user
            const userTests = data.filter((tc: any) => tc.tester === user?.id || tc.tester_id === user?.id);
            setTestCases(userTests);
        } catch (error) {
            console.error("Failed to fetch test cases", error);
        } finally {
            setLoadingTests(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        try {
            const formData = new FormData();
            formData.append('titre', title);
            formData.append('criticite', severity.toUpperCase());
            formData.append('statut', status);
            formData.append('description', description);

            if (!isEditing && selectedTestCaseId) {
                formData.append('test_case', selectedTestCaseId);
            }

            if (file) {
                formData.append('preuve_image', file);
            }

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

                    <div className="space-y-2">
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                            Gravité / Criticité
                        </label>
                        <div className="grid grid-cols-3 gap-3">
                            {(['Critique', 'Moyenne', 'Faible'] as const).map((s) => (
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

                    {isEditing && (
                        <div className="space-y-2">
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 transition-colors">
                                Statut de l'anomalie
                            </label>
                            <select
                                value={status}
                                onChange={(e) => setStatus(e.target.value as any)}
                                className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-4 py-2 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
                            >
                                <option value="OUVERTE">Ouverte</option>
                                <option value="EN_INVESTIGATION">En investigation</option>
                                <option value="RESOLUE">Résolue</option>
                            </select>
                        </div>
                    )}

                    {!isEditing && (
                        <div className="space-y-2">
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                                Test Lié (Précédemment validé)
                            </label>
                            {loadingTests ? (
                                <div className="flex items-center gap-2 text-slate-500 text-sm py-2">
                                    <Loader2 className="w-4 h-4 animate-spin text-blue-500" />
                                    Chargement de vos tests...
                                </div>
                            ) : (
                                <select
                                    value={selectedTestCaseId}
                                    onChange={(e) => setSelectedTestCaseId(e.target.value)}
                                    className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-4 py-2 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
                                >
                                    <option value="">-- Sélectionner un test (Optionnel) --</option>
                                    {testCases.map((tc) => (
                                        <option key={tc.id} value={tc.id}>
                                            [{tc.test_case_ref}] {tc.data_json?.titre || tc.data_json?.Title || 'Sans titre'}
                                        </option>
                                    ))}
                                </select>
                            )}
                        </div>
                    )}

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
                        className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors disabled:opacity-50 shadow-lg shadow-blue-500/20"
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
