import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import Header from '../components/Header';
import Sidebar from '../components/Sidebar';
import ExecutionTestList, { type TestItem } from '../components/ExecutionTestList';
import TeamPerformance from '../components/TeamPerformance';
import ReviewPanel from '../components/ReviewPanel';
import EditExecutionModal from '../components/EditExecutionModal';
import { useNavigate, useLocation } from 'react-router-dom';
import { executionService, projectService, campaignService } from '../services/api';
import { List, BarChart2 } from 'lucide-react';

const ExecutionTracking = () => {
    const { user } = useAuth();
    console.log('Current User:', user);
    console.log('Role:', user?.role);
    const isTester = user?.role?.toLowerCase() === 'tester';
    console.log('Is Tester:', isTester);



    const [activeTab, setActiveTab] = useState<'list' | 'performance'>('list');
    const [selectedTest, setSelectedTest] = useState<TestItem | null>(null);
    const [editingTest, setEditingTest] = useState<TestItem | null>(null);
    const [tests, setTests] = useState<TestItem[]>([]);
    const [viewingCaptures, setViewingCaptures] = useState<TestItem | null>(null);

    // Filters & Search
    const [searchQuery, setSearchQuery] = useState('');
    const [sortOrder, setSortOrder] = useState<'newest' | 'oldest'>('newest');
    const [groupBy, setGroupBy] = useState<'none' | 'campaign' | 'release'>('none');

    // Filter Options
    const [projects, setProjects] = useState<any[]>([]);
    const [campaigns, setCampaigns] = useState<any[]>([]);

    const filteredTests = tests.filter(t => {
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

    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();

    React.useEffect(() => {
        fetchExecutions();
        fetchFilters();
    }, []);

    const fetchFilters = async () => {
        try {
            const [projRes, campRes] = await Promise.all([
                projectService.getProjects(),
                campaignService.getCampaigns()
            ]);
            setProjects(projRes.data);
            setCampaigns(campRes.data);
        } catch (e) { console.error("Failed to fetch filters", e); }
    };

    const location = useLocation();

    // ... (existing state)

    React.useEffect(() => {
        fetchExecutions();
        fetchFilters();
    }, []);

    // Effect to handle deep linking after tests are loaded
    React.useEffect(() => {
        if (tests.length > 0) {
            const params = new URLSearchParams(location.search);
            const testId = params.get('testId');
            if (testId) {
                const foundTest = tests.find(t => t.id === testId);
                if (foundTest) {
                    setSelectedTest(foundTest);
                    // Optional: clear param to avoid reopening on refresh? 
                    // navigate(location.pathname, { replace: true });
                }
            }
        }
    }, [tests, location.search]);

    const fetchExecutions = async () => {
        try {
            setLoading(true);
            const response = await executionService.getExecutions();
            // Map backend to TestItem
            const mappedTests: TestItem[] = response.data.map((t: any, index: number) => {
                return {
                    id: (t.id || index).toString(),
                    name: t.test_case_ref || `Test ${t.id}`,
                    module: t.campaign_title || `Campagne #${t.campaign}`,
                    assigned_to: t.assigned_tester_name || 'Non assigné',
                    realized_by: t.tester_name || 'Non assigné',
                    status: t.status.toLowerCase(),
                    duration: 'N/A',
                    lastRun: new Date(t.execution_date || Date.now()).toLocaleString('fr-FR'),
                    rawDate: t.execution_date,
                    captures: t.proof_file ? [t.proof_file] : [],
                    release: t.project_name || 'Release A',
                    ...t.data_json
                }
            });
            setTests(mappedTests);
        } catch (error) {
            console.error("Failed to load executions", error);
        } finally {
            setLoading(false);
        }
    };

    const handleTestUpdate = async (testId: string, updates: Partial<TestItem> | FormData) => {
        try {
            // NOTE: Optimistic update is harder with FormData, simplifying to refetch after success for editing.
            // For ReviewPanel partial updates, we can stick to optimistic if safe.

            await executionService.updateExecution(testId, updates);

            // Refetch to get updated 'realized_by' (tester name) and status/file
            fetchExecutions();

        } catch (error) {
            console.error("Failed to update test", error);
            // Revert on error? For now just log.
        }
    };

    const handleSelectTest = (test: TestItem) => {
        // If status is failed, navigate to anomalies? Or open details?
        // User request: "click sur anomalie dans le tableau... ramene a la page anomalie"
        // Let's keep selection for side panel, but add specific behavior for clicking
        setSelectedTest(test);

        // Check if there is a linked anomaly to satisfy user request "clique sur anomalie... ramene a la page"
        // We might need to fetch anomalies for this test or just navigate with filter
        if (test.status === 'failed') {
            // Navigate to anomalies filtered by this test
            // We use the test name/ref to filter
            // navigate(`/anomalies?test=${encodeURIComponent(test.name)}`);
        }
    };

    const handleDeleteTest = async (test: TestItem) => {
        try {
            await executionService.deleteExecution(test.id);
            // Optimistic update
            setTests(prev => prev.filter(t => t.id !== test.id));
        } catch (error) {
            console.error("Failed to delete test", error);
            alert("Erreur lors de la suppression. Veuillez réessayer.");
        }
    };

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-900 transition-colors duration-300 flex flex-col">
            <Header />
            <div className="flex flex-1 relative">
                <Sidebar />
                <main className="flex-1 lg:ml-64 flex overflow-hidden h-[calc(100vh-64px)]">
                    {/* Left List Panel */}
                    <div className="flex-1 overflow-y-auto p-6 space-y-6">
                        {/* Page Header */}
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-2">
                            <div>
                                <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-2 tracking-tight transition-colors">
                                    <span className="text-gradient">Suivi d'Exécution</span>
                                </h1>
                                <p className="text-slate-500 dark:text-slate-400 transition-colors">Pilotez les campagnes de tests et suivez la performance de l'équipe</p>
                            </div>
                        </div>

                        {/* Search/Filter Bar */}
                        <div className="flex flex-col md:flex-row gap-4 mb-6">
                            {/* Global Search */}
                            <div className="relative flex-1">
                                <List className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                <input
                                    type="text"
                                    placeholder="Rechercher par nom, release, campagne ou testeur..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg pl-10 pr-4 py-2 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors placeholder:text-slate-400"
                                />
                            </div>

                            {/* Date Sort */}
                            <div className="flex items-center gap-2">
                                <select
                                    value={sortOrder}
                                    onChange={(e) => setSortOrder(e.target.value as 'newest' | 'oldest')}
                                    className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-4 py-2 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
                                >
                                    <option value="newest">Plus récent</option>
                                    <option value="oldest">Plus ancien</option>
                                </select>
                                <select
                                    value={groupBy}
                                    onChange={(e) => setGroupBy(e.target.value as 'none' | 'campaign' | 'release')}
                                    className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-4 py-2 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
                                >
                                    <option value="none">Aucun groupement</option>
                                    <option value="campaign">Par Campagne</option>
                                    <option value="release">Par Release</option>
                                </select>
                            </div>
                        </div>

                        {/* Content Area */}
                        <div className="min-h-[600px]">
                            <ExecutionTestList
                                tests={filteredTests}
                                onSelectTest={handleSelectTest}
                                selectedTestId={selectedTest?.id}
                                onViewCaptures={setViewingCaptures}
                                onEditTest={setEditingTest}
                                onDeleteTest={handleDeleteTest}
                                isTester={isTester}
                                groupBy={groupBy}
                            />
                        </div>
                    </div>

                    {/* Right Details Panel (Split View) */}
                    {selectedTest && (
                        <div className="w-[450px] border-l border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 h-full overflow-hidden flex-shrink-0 animate-in slide-in-from-right duration-300">
                            <ReviewPanel
                                test={selectedTest}
                                onClose={() => setSelectedTest(null)}
                                onUpdate={(updates) => handleTestUpdate(selectedTest.id, updates)}
                                embed={true}
                            />
                        </div>
                    )}
                </main>

                {/* Edit Modal (Form) */}
                {editingTest && (
                    <EditExecutionModal
                        test={editingTest}
                        onClose={() => setEditingTest(null)}
                        onSave={handleTestUpdate}
                    />
                )}

                {/* Image Viewer Lightbox */}
                {viewingCaptures && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/90 backdrop-blur-sm transition-colors" onClick={() => setViewingCaptures(null)}>
                        <div className="relative max-w-5xl max-h-screen w-full p-4 flex flex-col items-center" onClick={e => e.stopPropagation()}>
                            <button
                                className="absolute top-4 right-4 text-white/50 hover:text-white transition-colors"
                                onClick={() => setViewingCaptures(null)}
                            >
                                <div className="bg-white/10 p-2 rounded-full hover:bg-white/20">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                                </div>
                            </button>

                            <div className="flex overflow-x-auto gap-4 p-4 w-full justify-center snap-x">
                                {(viewingCaptures.captures || []).map((cap, idx) => (
                                    <div key={idx} className="snap-center shrink-0 max-w-[80vw] max-h-[80vh] flex flex-col items-center">
                                        {cap.startsWith('data:') ? (
                                            <img src={cap} alt={`Capture ${idx}`} className="rounded-lg shadow-2xl max-h-[80vh] object-contain" />
                                        ) : (
                                            <div className="w-96 h-64 bg-white dark:bg-slate-800 flex items-center justify-center rounded-lg border border-slate-200 dark:border-slate-700 transition-colors">
                                                <span className="text-slate-500 dark:text-slate-400 transition-colors">{cap}</span>
                                            </div>
                                        )}
                                        <p className="mt-2 text-slate-500 dark:text-slate-400 text-sm transition-colors">Capture {idx + 1} / {(viewingCaptures.captures || []).length}</p>
                                    </div>
                                ))}
                            </div>
                            <div className="text-center mt-4">
                                <h3 className="text-white font-medium text-lg">{viewingCaptures.name}</h3>
                                <p className="text-slate-400 text-sm">{viewingCaptures.id}</p>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default ExecutionTracking;
