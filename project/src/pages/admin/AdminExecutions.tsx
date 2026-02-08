import React, { useEffect, useState } from 'react';
import Header from '../../components/Header';
import Sidebar from '../../components/Sidebar';
import ExecutionTestList, { type TestItem } from '../../components/ExecutionTestList';
import { executionService } from '../../services/api';
import { toast } from 'react-toastify';
import { LayoutGrid, List } from 'lucide-react';
import EditExecutionModal from '../../components/EditExecutionModal';
import { useLocation } from 'react-router-dom';

const AdminExecutions = () => {
    const location = useLocation();
    const queryParams = new URLSearchParams(location.search);
    const initialSearch = queryParams.get('search') || '';

    const [executions, setExecutions] = useState<TestItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState(initialSearch);
    const [groupBy, setGroupBy] = useState<'none' | 'campaign' | 'release'>('none');
    const [sortOrder, setSortOrder] = useState<'newest' | 'oldest'>('newest');
    const [selectedTest, setSelectedTest] = useState<TestItem | null>(null);
    const [editingTest, setEditingTest] = useState<TestItem | null>(null);

    const fetchExecutions = async () => {
        try {
            setLoading(true);
            const response = await executionService.getExecutions();
            const mappedTests: TestItem[] = response.data.map((t: any, index: number) => ({
                id: (t.id || index).toString(),
                name: t.test_case_ref || `Test ${t.id}`,
                module: t.campaign_title || `Campagne #${t.campaign}`,
                assigned_to: t.assigned_tester_name || 'Non assigné',
                realized_by: t.tester_name || 'Non assigné',
                status: (t.status || 'pending').toLowerCase(),
                duration: 'N/A',
                lastRun: new Date(t.execution_date || Date.now()).toLocaleString('fr-FR'),
                rawDate: t.execution_date,
                captures: t.proof_file ? [t.proof_file] : [],
                release: t.project_name || 'Release A',
                ...t.data_json
            }));
            setExecutions(mappedTests);
        } catch (error) {
            console.error("Failed to fetch executions", error);
            toast.error("Erreur lors du chargement des exécutions");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchExecutions();
    }, []);

    const filteredTests = executions.filter(t => {
        const highlightId = queryParams.get('highlight');
        if (highlightId && t.id === highlightId) return true;

        const query = searchQuery.toLowerCase();
        return (
            (t.name?.toLowerCase() || '').includes(query) ||
            (t.module?.toLowerCase() || '').includes(query) ||
            (t.release?.toLowerCase() || '').includes(query) ||
            (t.realized_by?.toLowerCase() || '').includes(query)
        );
    }).sort((a, b) => {
        const dateA = new Date(a.rawDate || 0).getTime();
        const dateB = new Date(b.rawDate || 0).getTime();
        return sortOrder === 'newest' ? dateB - dateA : dateA - dateB;
    });

    const handleEditTest = (test: TestItem) => {
        setEditingTest(test); // Opens the modal
    };

    const handleDeleteTest = async (test: TestItem) => {
        if (window.confirm("Voulez-vous vraiment supprimer cette exécution ?")) {
            try {
                await executionService.deleteExecution(test.id);
                setExecutions(prev => prev.filter(t => t.id !== test.id));
                toast.success("Exécution supprimée avec succès");
            } catch (error) {
                console.error("Failed to delete execution", error);
                toast.error("Erreur lors de la suppression");
            }
        }
    };

    const handleUpdateExecution = async (testId: string, updates: any) => {
        try {
            await executionService.updateExecution(testId, updates);
            toast.success("Exécution mise à jour");
            setEditingTest(null);
            fetchExecutions();
        } catch (error) {
            console.error("Update failed", error);
            toast.error("Erreur lors de la mise à jour");
        }
    };

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-900 transition-colors duration-300">
            <Header />
            <div className="flex">
                <Sidebar />
                <main className="flex-1 lg:ml-64 relative p-8">
                    <div className="max-w-7xl mx-auto space-y-6">
                        {/* Header Section */}
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                            <div>
                                <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Administration des Exécutions</h1>
                                <p className="text-slate-500 dark:text-slate-400 mt-1">Vue d'ensemble et gestion des données d'exécution</p>
                            </div>

                            {/* Controls */}
                            <div className="flex items-center gap-3 bg-white dark:bg-slate-800 p-2 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
                                <span className="text-sm font-medium text-slate-600 dark:text-slate-400 pl-2">Grouper par :</span>
                                <select
                                    value={groupBy}
                                    onChange={(e) => setGroupBy(e.target.value as 'none' | 'campaign' | 'release')}
                                    className="bg-slate-100 dark:bg-slate-700 border-none text-slate-700 dark:text-slate-200 text-sm rounded-lg focus:ring-2 focus:ring-blue-500 py-1.5 px-3"
                                >
                                    <option value="none">Aucun</option>
                                    <option value="campaign">Campagne</option>
                                    <option value="release">Release</option>
                                </select>

                                <div className="h-4 w-px bg-slate-200 dark:bg-slate-700 mx-1" />

                                <select
                                    value={sortOrder}
                                    onChange={(e) => setSortOrder(e.target.value as 'newest' | 'oldest')}
                                    className="bg-slate-100 dark:bg-slate-700 border-none text-slate-700 dark:text-slate-200 text-sm rounded-lg focus:ring-2 focus:ring-blue-500 py-1.5 px-3"
                                >
                                    <option value="newest">Plus récents</option>
                                    <option value="oldest">Plus anciens</option>
                                </select>
                            </div>
                        </div>

                        {/* Search Bar */}
                        <div className="card p-4">
                            <div className="relative">
                                <input
                                    type="text"
                                    placeholder="Rechercher par référence, campagne, release ou testeur..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
                                />
                                <div className="absolute left-3 top-2.5 text-slate-400">
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                    </svg>
                                </div>
                            </div>
                        </div>

                        {/* Main List */}
                        {loading ? (
                            <div className="flex justify-center p-12">
                                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                            </div>
                        ) : (
                            <ExecutionTestList
                                tests={filteredTests}
                                onSelectTest={setSelectedTest}
                                selectedTestId={selectedTest?.id}
                                onEditTest={handleEditTest}
                                onDeleteTest={handleDeleteTest}
                                isTester={false}
                                groupBy={groupBy}
                            />
                        )}

                        {/* Edit Modal */}
                        {editingTest && (
                            <EditExecutionModal
                                test={editingTest}
                                onClose={() => setEditingTest(null)}
                                onSave={(id, data) => handleUpdateExecution(id, data)}
                            />
                        )}
                    </div>
                </main>
            </div>
        </div>
    );
};

export default AdminExecutions;
