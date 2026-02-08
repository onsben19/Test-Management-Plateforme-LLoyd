import React, { useState, useEffect } from 'react';
import Header from '../components/Header';
import Sidebar from '../components/Sidebar';
import { useAuth } from '../context/AuthContext';
import { campaignService, executionService, anomalyService } from '../services/api'; // Ensure executionService supports create
import { CheckCircle, XCircle, AlertTriangle, FileSpreadsheet, Eye, Play, List, Calendar } from 'lucide-react';
import { toast } from 'react-toastify';

const TesterDashboard = () => {
    const { user } = useAuth();
    const [campaigns, setCampaigns] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    // Validation Modal State
    const [validationModal, setValidationModal] = useState<{ isOpen: boolean; campaign: any | null }>({
        isOpen: false,
        campaign: null
    });

    const [testCaseForm, setTestCaseForm] = useState({
        test_case_ref: '', // Manual entry
        status: 'PASSED', // PASSED | FAILED
        // Anomaly fields
        anomaly_title: '',
        anomaly_description: '',
        anomaly_criticite: 'FAIBLE',
        anomaly_file: null as File | null
    });

    useEffect(() => {
        if (user) {
            fetchAssignedCampaigns();
        }
    }, [user]);

    const fetchAssignedCampaigns = async () => {
        try {
            setLoading(true);
            const response = await campaignService.getCampaigns(); // Fetch all (filter locally for now if backend doesn't filter)
            // Filter by assigned_testers containing user.id
            // Backend Campaign model: assigned_testers is M2M. Serializer returns list of IDs?
            // Assuming response.data is array of objects with assigned_testers: [id1, id2]
            const myCampaigns = response.data.filter((c: any) =>
                c.assigned_testers && c.assigned_testers.includes(user?.id)
            );
            setCampaigns(myCampaigns);
        } catch (error) {
            console.error("Failed to fetch campaigns", error);
        } finally {
            setLoading(false);
        }
    };

    const [searchQuery, setSearchQuery] = useState('');
    const [sortOrder, setSortOrder] = useState<'newest' | 'oldest'>('newest');
    const [filteredCampaigns, setFilteredCampaigns] = useState<any[]>([]);

    useEffect(() => {
        let result = [...campaigns];

        // Search
        if (searchQuery) {
            const lowerQuery = searchQuery.toLowerCase();
            result = result.filter(c =>
                c.title.toLowerCase().includes(lowerQuery) ||
                (c.description && c.description.toLowerCase().includes(lowerQuery))
            );
        }

        // Sort
        result.sort((a, b) => {
            const dateA = new Date(a.created_at || 0).getTime();
            const dateB = new Date(b.created_at || 0).getTime();
            return sortOrder === 'newest' ? dateB - dateA : dateA - dateB;
        });

        setFilteredCampaigns(result);
    }, [campaigns, searchQuery, sortOrder]);

    const handleOpenValidation = (campaign: any) => {
        setValidationModal({ isOpen: true, campaign: campaign });
        setTestCaseForm({
            test_case_ref: '',
            status: 'PASSED',
            anomaly_title: '',
            anomaly_description: '',
            anomaly_criticite: 'FAIBLE',
            anomaly_file: null
        });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        console.log("Submitting validation...", { validationModal, user });

        if (!validationModal.campaign || !user) {
            console.error("Missing campaign or user");
            return;
        }

        try {
            // 1. Create Execution (TestCase record) with FormData
            const executionData = new FormData();
            executionData.append('campaign', validationModal.campaign.id);
            executionData.append('test_case_ref', testCaseForm.test_case_ref);
            executionData.append('status', testCaseForm.status);
            executionData.append('tester', user.id.toString());
            executionData.append('data_json', JSON.stringify({ manual: true }));

            // Attach proof file if exists (reusing anomaly_file state or adding a new dedicated state would be better, but reusing for now if appropriate or adding new field)
            // Let's assume we use anomaly_file as the general proof file
            // Attach proof file if exists and is a valid File object
            if (testCaseForm.anomaly_file && testCaseForm.anomaly_file instanceof File) {
                executionData.append('proof_file', testCaseForm.anomaly_file);
            }

            const execResponse = await executionService.createExecution(executionData);

            // 2. If Failed, create Anomaly linked to this TestCase
            if (testCaseForm.status === 'FAILED') {
                const anomalyData = new FormData();
                anomalyData.append('test_case', execResponse.data.id);
                anomalyData.append('titre', testCaseForm.anomaly_title);
                anomalyData.append('description', testCaseForm.anomaly_description);
                anomalyData.append('criticite', testCaseForm.anomaly_criticite);
                anomalyData.append('cree_par', user.id.toString());

                // If the proof file was also meant for the anomaly, we can attach it here too, 
                // OR logically, if the execution failed, the proof file IS the anomaly proof.
                // But the Anomaly model has 'preuve_image'. 
                // Let's attach it to both to be safe or just execution. 
                // User requirement: "si valider il peut aussi ajouter le capture" -> So it's primary for execution.
                // For anomaly, let's keep it linked.
                if (testCaseForm.anomaly_file) {
                    anomalyData.append('preuve_image', testCaseForm.anomaly_file);
                }

                await anomalyService.createAnomaly(anomalyData);
                toast.warning(
                    <div onClick={() => window.location.href = '/anomalies'}>
                        Anomalie signalée ! Cliquez pour voir.
                    </div>
                );
            } else {
                toast.success(
                    <div onClick={() => window.location.href = '/execution'}>
                        Test validé ! Voir le suivi.
                    </div>
                );
            }

            setValidationModal({ isOpen: false, campaign: null });
        } catch (error) {
            console.error("Submission failed", error);
            toast.error("Erreur lors de la validation");
        }
    };

    const handleOpenExcel = (url: string) => {
        if (url) window.open(url, '_blank');
        else toast.error("Fichier introuvable");
    };

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-900 transition-colors duration-300">
            <Header />
            <div className="flex">
                <Sidebar />
                <main className="flex-1 lg:ml-64 relative p-8">
                    <div className="max-w-7xl mx-auto">
                        <div className="mb-6">
                            <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-2 transition-colors">Mon Espace Testeur</h1>
                            <p className="text-slate-500 dark:text-slate-400 transition-colors">Retrouvez les campagnes qui vous sont assignées et validez vos tests.</p>
                        </div>

                        {/* Search and Sort Controls */}
                        <div className="flex flex-col sm:flex-row gap-4 mb-8">
                            <div className="relative flex-1">
                                <input
                                    type="text"
                                    placeholder="Rechercher une campagne..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg pl-4 pr-4 py-2 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
                                />
                            </div>
                            <select
                                value={sortOrder}
                                onChange={(e) => setSortOrder(e.target.value as 'newest' | 'oldest')}
                                className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-4 py-2 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
                            >
                                <option value="newest">Plus récent</option>
                                <option value="oldest">Plus ancien</option>
                            </select>
                        </div>

                        {loading ? (
                            <div className="text-slate-900 dark:text-white transition-colors">Chargement...</div>
                        ) : filteredCampaigns.length === 0 ? (
                            <div className="text-slate-500 dark:text-slate-500 bg-white dark:bg-slate-800 p-8 rounded-xl text-center shadow-sm dark:shadow-none transition-colors">
                                {campaigns.length === 0 ? "Aucune campagne assignée pour le moment." : "Aucune campagne trouvée pour cette recherche."}
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {filteredCampaigns.map(camp => (
                                    <div key={camp.id} className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-5 hover:border-blue-500/50 transition-colors shadow-sm dark:shadow-none">
                                        <div className="flex justify-between items-start mb-4">
                                            <div className="w-10 h-10 rounded-lg bg-blue-100 dark:bg-blue-500/10 flex items-center justify-center text-blue-600 dark:text-blue-400 transition-colors">
                                                <List className="w-5 h-5" />
                                            </div>
                                            <div className="bg-slate-100 dark:bg-slate-700 px-2 py-1 rounded text-xs text-slate-600 dark:text-slate-300 transition-colors">
                                                {camp.nb_test_cases} Tests Prévus
                                            </div>
                                        </div>

                                        <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2 transition-colors">{camp.title}</h3>
                                        <p className="text-sm text-slate-500 dark:text-slate-400 mb-4 line-clamp-2 transition-colors">{camp.description || "Aucune description"}</p>

                                        <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-500 mb-6 transition-colors">
                                            <Calendar className="w-3 h-3" />
                                            {new Date(camp.created_at).toLocaleDateString()}
                                        </div>

                                        <div className="grid grid-cols-2 gap-3">
                                            <button
                                                onClick={() => handleOpenExcel(camp.excel_file)}
                                                className="px-3 py-2 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-700 dark:text-white rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2"
                                            >
                                                <Eye className="w-4 h-4" />
                                                Voir Excel
                                            </button>
                                            <button
                                                onClick={() => handleOpenValidation(camp)}
                                                className="px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2"
                                            >
                                                <CheckCircle className="w-4 h-4" />
                                                Valider Tâche
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </main>

                {/* Validation Modal */}
                {validationModal.isOpen && validationModal.campaign && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/80 dark:bg-slate-900/90 backdrop-blur-sm p-4 transition-colors">
                        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl w-full max-w-lg shadow-2xl transition-colors">
                            <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center bg-slate-50 dark:bg-slate-700/20 transition-colors">
                                <div>
                                    <h2 className="text-lg font-bold text-slate-900 dark:text-white transition-colors">Valider une tâche</h2>
                                    <div className="flex flex-col gap-1 mt-1">
                                        <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 transition-colors">
                                            <span className="font-semibold text-slate-700 dark:text-slate-300 transition-colors">Release:</span> {validationModal.campaign.project_name}
                                        </div>
                                        <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 transition-colors">
                                            <span className="font-semibold text-slate-700 dark:text-slate-300 transition-colors">Campagne:</span> {validationModal.campaign.title}
                                        </div>
                                        <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 transition-colors">
                                            <span className="font-semibold text-slate-700 dark:text-slate-300 transition-colors">Manager:</span> {validationModal.campaign.manager_name}
                                        </div>
                                    </div>
                                </div>
                                <button onClick={() => setValidationModal({ isOpen: false, campaign: null })} className="text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors">
                                    <XCircle className="w-6 h-6" />
                                </button>
                            </div>

                            <form onSubmit={handleSubmit} className="p-6 space-y-4">
                                {/* Proof File Input (Always visible) - Moved to top */}
                                <div>
                                    <label className="block text-sm font-medium text-slate-600 dark:text-slate-400 mb-1 transition-colors">Preuve d'Exécution / Capture</label>
                                    <div className="flex items-center gap-2">
                                        <label className={`flex-1 cursor-pointer border border-dashed rounded-lg p-3 text-center transition-colors ${testCaseForm.anomaly_file ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/10' : 'border-slate-300 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-800'}`}>
                                            <input
                                                type="file"
                                                accept="image/*, .pdf, .docx"
                                                onChange={e => {
                                                    if (e.target.files && e.target.files[0]) {
                                                        setTestCaseForm({ ...testCaseForm, anomaly_file: e.target.files[0] });
                                                    }
                                                }}
                                                className="hidden"
                                            />
                                            <span className="text-sm text-slate-600 dark:text-slate-300">
                                                {testCaseForm.anomaly_file ? `Fichier: ${testCaseForm.anomaly_file.name}` : "Cliquez pour ajouter une capture"}
                                            </span>
                                        </label>
                                        {testCaseForm.anomaly_file && (
                                            <button
                                                type="button"
                                                onClick={() => setTestCaseForm({ ...testCaseForm, anomaly_file: null })}
                                                className="p-3 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/10 rounded-lg transition-colors"
                                                title="Supprimer le fichier"
                                            >
                                                <XCircle className="w-5 h-5" />
                                            </button>
                                        )}
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-slate-600 dark:text-slate-400 mb-1 transition-colors">Nom du Cas de Test / Référence</label>
                                    <input
                                        type="text"
                                        required
                                        value={testCaseForm.test_case_ref}
                                        onChange={e => setTestCaseForm({ ...testCaseForm, test_case_ref: e.target.value })}
                                        className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-2 text-slate-900 dark:text-white focus:ring-blue-500 outline-none transition-colors"
                                        placeholder="Ex: TC-001 Connexion"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-slate-600 dark:text-slate-400 mb-1 transition-colors">Statut</label>
                                    <div className="grid grid-cols-2 gap-3">
                                        <button
                                            type="button"
                                            onClick={() => setTestCaseForm({ ...testCaseForm, status: 'PASSED' })}
                                            className={`p-3 rounded-lg border flex items-center justify-center gap-2 transition-all ${testCaseForm.status === 'PASSED'
                                                ? 'bg-emerald-100 dark:bg-emerald-500/10 border-emerald-500 text-emerald-700 dark:text-emerald-400'
                                                : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-600 text-slate-500 dark:text-slate-400 hover:border-slate-400 dark:hover:border-slate-500'
                                                }`}
                                        >
                                            <CheckCircle className="w-5 h-5" />
                                            Succès (Valide)
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setTestCaseForm({ ...testCaseForm, status: 'FAILED' })}
                                            className={`p-3 rounded-lg border flex items-center justify-center gap-2 transition-all ${testCaseForm.status === 'FAILED'
                                                ? 'bg-red-100 dark:bg-red-500/10 border-red-500 text-red-700 dark:text-red-400'
                                                : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-600 text-slate-500 dark:text-slate-400 hover:border-slate-400 dark:hover:border-slate-500'
                                                }`}
                                        >
                                            <AlertTriangle className="w-5 h-5" />
                                            Échec (Invalid)
                                        </button>
                                    </div>
                                </div>

                                {/* Anomaly Sub-form */}
                                {testCaseForm.status === 'FAILED' && (
                                    <div className="bg-red-50 dark:bg-red-500/5 border border-red-200 dark:border-red-500/20 rounded-lg p-4 space-y-3 animate-in fade-in slide-in-from-top-2 transition-colors">
                                        <h3 className="text-sm font-bold text-red-600 dark:text-red-400 flex items-center gap-2 transition-colors">
                                            <AlertTriangle className="w-4 h-4" />
                                            Déclaration d'anomalie
                                        </h3>

                                        <div>
                                            <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1 transition-colors">Titre de l'anomalie</label>
                                            <input
                                                type="text"
                                                required
                                                value={testCaseForm.anomaly_title}
                                                onChange={e => setTestCaseForm({ ...testCaseForm, anomaly_title: e.target.value })}
                                                className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded px-3 py-2 text-sm text-slate-900 dark:text-white focus:border-red-500 outline-none transition-colors"
                                            />
                                        </div>

                                        <div>
                                            <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1 transition-colors">Description</label>
                                            <textarea
                                                required
                                                value={testCaseForm.anomaly_description}
                                                onChange={e => setTestCaseForm({ ...testCaseForm, anomaly_description: e.target.value })}
                                                className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded px-3 py-2 text-sm text-slate-900 dark:text-white focus:border-red-500 outline-none min-h-[80px] transition-colors"
                                            />
                                        </div>

                                        <div>
                                            <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1 transition-colors">Criticité</label>
                                            <select
                                                value={testCaseForm.anomaly_criticite}
                                                onChange={e => setTestCaseForm({ ...testCaseForm, anomaly_criticite: e.target.value })}
                                                className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded px-3 py-2 text-sm text-slate-900 dark:text-white focus:border-red-500 outline-none transition-colors"
                                            >
                                                <option value="FAIBLE">Faible</option>
                                                <option value="MOYENNE">Moyenne</option>
                                                <option value="CRITIQUE">Critique</option>
                                            </select>
                                        </div>


                                    </div>
                                )}

                                <button
                                    type="submit"
                                    className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold transition-all shadow-lg shadow-blue-900/20 mt-2"
                                >
                                    Enregistrer
                                </button>
                            </form>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default TesterDashboard;
