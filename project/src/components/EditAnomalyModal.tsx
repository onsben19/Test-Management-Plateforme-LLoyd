import React, { useState, useEffect } from 'react';
import { X, Save, Upload, FileText, Trash2, AlertTriangle, Bug, Loader2, Sparkles } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { executionService, campaignService, anomalyService } from '../services/api';
import { toast } from 'react-toastify';

export interface AnomalyItem {
    id: string;
    title: string;
    description?: string;
    impact: string;
    priority: string;
    visibility: string;
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
    const [title, setTitle] = useState(anomaly?.title?.replace(/^\[SCRIPT\]\s*/i, '') || '');
    const [description, setDescription] = useState(anomaly?.description || '');
    const [impact, setImpact] = useState<string>(anomaly?.impact || 'MINEURS');
    const [priority, setPriority] = useState<string>(anomaly?.priority || 'NORMALE');
    const [visibility, setVisibility] = useState<string>(anomaly?.visibility || 'PUBLIQUE');
    const [selectedCampaignId, setSelectedCampaignId] = useState<string>('');
    const [status, setStatus] = useState<AnomalyItem['status']>(anomaly?.status || 'OUVERTE');
    const [file, setFile] = useState<File | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [campaigns, setCampaigns] = useState<any[]>([]);
    const [loadingTests, setLoadingTests] = useState(false);

    // AI Assistant States
    const [showAiAssistant, setShowAiAssistant] = useState(false);
    const [externalLogs, setExternalLogs] = useState('');
    const [externalCode, setExternalCode] = useState('');
    const [isDiagnosing, setIsDiagnosing] = useState(false);

    useEffect(() => {
        if (!isEditing && user) {
            fetchCampaigns();
        }
    }, [isEditing, user]);

    const fetchCampaigns = async () => {
        setLoadingTests(true);
        try {
            const response = await campaignService.getCampaigns();
            const data = response.data.results || response.data;
            setCampaigns(data);
        } catch (error) {
            console.error("Failed to fetch campaigns", error);
        } finally {
            setLoadingTests(false);
        }
    };

    const handleDiagnose = async () => {
        if (!externalLogs) {
            toast.error("Veuillez fournir au moins les logs d'erreur.");
            return;
        }
        setIsDiagnosing(true);
        try {
            const res = await anomalyService.diagnoseExternalLogs({ logs: externalLogs, code: externalCode });
            setTitle(res.data.titre);
            setDescription(res.data.description);
            setImpact('A_DEFINIR');
            setPriority('A_DEFINIR');
            toast.success("Diagnostic IA généré avec succès !");
            setShowAiAssistant(false);
        } catch (error) {
            console.error("Diagnosis error:", error);
            toast.error("Erreur lors du diagnostic IA.");
        } finally {
            setIsDiagnosing(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        try {
            const formData = new FormData();
            formData.append('titre', title);
            formData.append('impact', impact);
            formData.append('priorite', priority);
            formData.append('visibilite', visibility);
            formData.append('statut', status);
            formData.append('description', description);

            if (!isEditing && selectedCampaignId) {
                formData.append('campaign', selectedCampaignId);
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

    const impactOptions = [
        { label: 'À définir', value: 'A_DEFINIR' },
        { label: 'Fonctionnalité', value: 'FONCTIONNALITE' },
        { label: 'Simple', value: 'SIMPLE' },
        { label: 'Texte', value: 'TEXTE' },
        { label: 'Cosmétique', value: 'COSMETIQUE' },
        { label: 'Mineurs', value: 'MINEURS' },
        { label: 'Majeur', value: 'MAJEUR' },
        { label: 'Critique', value: 'CRITIQUE' },
        { label: 'Bloquantes', value: 'BLOQUANTES' },
    ];

    const priorityOptions = [
        { label: 'À définir', value: 'A_DEFINIR' },
        { label: 'Basse', value: 'BASSE' },
        { label: 'Normale', value: 'NORMALE' },
        { label: 'Elevée', value: 'ELEVEE' },
        { label: 'Urgente', value: 'URGENTE' },
        { label: 'Immédiate', value: 'IMMEDIATE' },
    ];

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-fade-in">
            <div className="bg-white dark:bg-slate-900 rounded-xl shadow-2xl w-full max-w-lg border border-slate-200 dark:border-slate-700 overflow-hidden flex flex-col max-h-[90vh]">
                <div className="p-6 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/50">
                    <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
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
                    
                    {/* AI Assistant Section */}
                    {!isEditing && (
                        <div className="bg-indigo-50/50 dark:bg-indigo-900/10 border border-indigo-100 dark:border-indigo-500/20 rounded-xl overflow-hidden transition-all">
                            <button
                                type="button"
                                onClick={() => setShowAiAssistant(!showAiAssistant)}
                                className="w-full px-4 py-3 flex items-center justify-between text-indigo-600 dark:text-indigo-400 font-bold text-sm tracking-wide uppercase hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-colors"
                            >
                                <span className="flex items-center gap-2">
                                    Diagnostic IA depuis des logs externes
                                </span>
                                <span className="text-[10px] bg-indigo-100 dark:bg-indigo-900/40 px-2 py-1 rounded-md">{showAiAssistant ? 'Masquer' : 'Afficher'}</span>
                            </button>
                            
                            {showAiAssistant && (
                                <div className="p-4 space-y-4 border-t border-indigo-100 dark:border-indigo-500/20 animate-fade-in">
                                    <div className="space-y-2">
                                        <label className="block text-[10px] font-black text-indigo-500 uppercase tracking-widest">Logs d'exécution (Obligatoire)</label>
                                        <textarea
                                            value={externalLogs}
                                            onChange={(e) => setExternalLogs(e.target.value)}
                                            className="w-full bg-white dark:bg-slate-900 border border-indigo-200 dark:border-indigo-500/30 rounded-lg px-3 py-2 text-xs text-slate-700 dark:text-slate-300 font-mono min-h-[80px] focus:ring-1 focus:ring-indigo-500 outline-none"
                                            placeholder="Collez ici les logs d'erreur bruts..."
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="block text-[10px] font-black text-indigo-500 uppercase tracking-widest">Code Playwright (Optionnel)</label>
                                        <textarea
                                            value={externalCode}
                                            onChange={(e) => setExternalCode(e.target.value)}
                                            className="w-full bg-white dark:bg-slate-900 border border-indigo-200 dark:border-indigo-500/30 rounded-lg px-3 py-2 text-xs text-slate-700 dark:text-slate-300 font-mono min-h-[60px] focus:ring-1 focus:ring-indigo-500 outline-none"
                                            placeholder="Collez le script qui a échoué..."
                                        />
                                    </div>
                                    <button
                                        type="button"
                                        onClick={handleDiagnose}
                                        disabled={isDiagnosing || !externalLogs}
                                        className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-[11px] font-black uppercase tracking-widest transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                                    >
                                        {isDiagnosing ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Sparkles className="w-4 h-4" />}
                                        {isDiagnosing ? "Analyse en cours..." : "Générer le diagnostic IA"}
                                    </button>
                                </div>
                            )}
                        </div>
                    )}

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

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                                Impact
                            </label>
                            <select
                                value={impact}
                                onChange={(e) => setImpact(e.target.value)}
                                className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-4 py-2 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
                            >
                                {impactOptions.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                            </select>
                        </div>

                        <div className="space-y-2">
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                                Priorité
                            </label>
                            <select
                                value={priority}
                                onChange={(e) => setPriority(e.target.value)}
                                className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-4 py-2 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
                            >
                                {priorityOptions.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                            </select>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                            Visibilité
                        </label>
                        <div className="flex gap-4">
                            {(['PUBLIQUE', 'PRIVEE'] as const).map((v) => (
                                <button
                                    key={v}
                                    type="button"
                                    onClick={() => setVisibility(v)}
                                    className={`flex-1 p-3 rounded-lg border text-sm font-medium transition-all ${visibility === v
                                        ? 'bg-blue-600 border-blue-600 text-white shadow-lg shadow-blue-500/20'
                                        : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-slate-300'
                                        }`}
                                >
                                    {v === 'PUBLIQUE' ? 'Publique' : 'Privée'}
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
                                Campagne Liée
                            </label>
                            {loadingTests ? (
                                <div className="flex items-center gap-2 text-slate-500 text-sm py-2">
                                    <Loader2 className="w-4 h-4 animate-spin text-blue-500" />
                                    Chargement des campagnes...
                                </div>
                            ) : (
                                <select
                                    value={selectedCampaignId}
                                    onChange={(e) => setSelectedCampaignId(e.target.value)}
                                    className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-4 py-2 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
                                >
                                    <option value="">-- Sélectionner une campagne (Optionnel) --</option>
                                    {campaigns.map((c) => (
                                        <option key={c.id} value={c.id}>
                                            {c.title}
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
