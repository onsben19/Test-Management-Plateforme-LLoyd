import React, { useEffect, useState, useMemo } from 'react';
import Header from '../../components/Header';
import Sidebar from '../../components/Sidebar';
import { useSidebar } from '../../context/SidebarContext';
import ExecutionTestList, { type TestItem } from '../../components/ExecutionTestList';
import { executionService } from '../../services/api';
import { toast } from 'react-toastify';
import EditExecutionModal from '../../components/EditExecutionModal';
import { useLocation } from 'react-router-dom';
import ConfirmModal from '../../components/ConfirmModal';
import StatCard from '../../components/StatCard';
import { PlayCircle, CheckCircle2, XCircle, Clock } from 'lucide-react';

const AdminExecutions = () => {
    const { isOpen } = useSidebar();
    const location = useLocation();
    const queryParams = new URLSearchParams(location.search);
    const initialSearch = queryParams.get('search') || '';

    const [executions, setExecutions] = useState<TestItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState(initialSearch);
    const [groupBy, setGroupBy] = useState<'none' | 'campaign' | 'release'>('none');
    const [sortOrder, setSortOrder] = useState<'newest' | 'oldest'>('newest');
    const [editingTest, setEditingTest] = useState<TestItem | null>(null);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [testToDelete, setTestToDelete] = useState<TestItem | null>(null);

    const fetchExecutions = async () => {
        try {
            setLoading(true);
            const response = await executionService.getExecutions();
            const data = response.data.results || response.data;
            const mappedTests: TestItem[] = data.map((t: any, index: number) => ({
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

    const stats = useMemo(() => {
        const total = executions.length;
        const passed = executions.filter(e => e.status === 'passed').length;
        const failed = executions.filter(e => e.status === 'failed').length;
        const pending = executions.filter(e => e.status === 'pending').length;

        return { total, passed, failed, pending };
    }, [executions]);

    const handleEditTest = (test: TestItem) => setEditingTest(test);

    const handleDeleteTest = async (test: TestItem) => {
        setTestToDelete(test);
        setIsDeleteModalOpen(true);
    };

    const confirmDeleteTest = async () => {
        if (!testToDelete) return;
        try {
            await executionService.deleteExecution(testToDelete.id);
            setExecutions(prev => prev.filter(t => t.id !== testToDelete.id));
            toast.success("Exécution supprimée avec succès");
        } catch {
            toast.error("Erreur lors de la suppression");
        } finally {
            setTestToDelete(null);
        }
    };

    const handleUpdateExecution = async (testId: string, updates: any) => {
        try {
            await executionService.updateExecution(testId, updates);
            toast.success("Exécution mise à jour");
            setEditingTest(null);
            fetchExecutions();
        } catch {
            toast.error("Erreur lors de la mise à jour");
        }
    };

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-900 transition-colors duration-300 flex flex-col">
            <Header />
            <div className="flex flex-1 relative overflow-hidden">
                <Sidebar />
                <main className={`flex-1 flex flex-col h-[calc(100vh-64px)] overflow-hidden transition-all duration-300 ${isOpen ? 'lg:ml-64' : 'lg:ml-16'}`}>

                    {/* Summary Stats Grid */}
                    <div className="px-6 py-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 bg-slate-50 dark:bg-slate-900 overflow-x-auto shrink-0 border-b border-slate-200 dark:border-slate-800">
                        <StatCard
                            title="Total Tests"
                            value={stats.total}
                            icon={PlayCircle}
                            variant="blue"
                            description="Toutes exécutions confondues"
                            isLoading={loading}
                        />
                        <StatCard
                            title="Succès"
                            value={stats.passed}
                            icon={CheckCircle2}
                            variant="green"
                            description="Tests validés sans erreur"
                            changeType="positive"
                            isLoading={loading}
                        />
                        <StatCard
                            title="Échecs / Bugs"
                            value={stats.failed}
                            icon={XCircle}
                            variant="red"
                            description="Anomalies à investiguer"
                            change={stats.failed > 0 ? `+${stats.failed}` : undefined}
                            changeType="negative"
                            isLoading={loading}
                        />
                        <StatCard
                            title="En Attente"
                            value={stats.pending}
                            icon={Clock}
                            variant="yellow"
                            description="Tests non encore réalisés"
                            isLoading={loading}
                        />
                    </div>

                    {/* Top Controls */}
                    <div className="p-6 pb-4 border-b border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 flex-shrink-0">
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
                            <div>
                                <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Suivi d'Exécution</h1>
                                <p className="text-slate-500 dark:text-slate-400 mt-1">Vue d'ensemble et gestion des données d'exécution</p>
                            </div>

                            <div className="flex items-center gap-3 bg-slate-100 dark:bg-slate-800 p-2 rounded-xl border border-slate-200 dark:border-slate-700">
                                <span className="text-sm font-medium text-slate-600 dark:text-slate-400 pl-2">Trier :</span>
                                <select
                                    value={sortOrder}
                                    onChange={(e) => setSortOrder(e.target.value as 'newest' | 'oldest')}
                                    className="bg-white dark:bg-slate-700 border-none text-slate-700 dark:text-slate-200 text-sm rounded-lg focus:ring-2 focus:ring-blue-500 py-1.5 px-3"
                                >
                                    <option value="newest">Plus récents</option>
                                    <option value="oldest">Plus anciens</option>
                                </select>

                                <div className="h-4 w-px bg-slate-200 dark:bg-slate-700 mx-1" />

                                <span className="text-sm font-medium text-slate-600 dark:text-slate-400">Grouper :</span>
                                <select
                                    value={groupBy}
                                    onChange={(e) => setGroupBy(e.target.value as 'none' | 'campaign' | 'release')}
                                    className="bg-white dark:bg-slate-700 border-none text-slate-700 dark:text-slate-200 text-sm rounded-lg focus:ring-2 focus:ring-blue-500 py-1.5 px-3"
                                >
                                    <option value="none">Aucun</option>
                                    <option value="campaign">Campagne</option>
                                    <option value="release">Release</option>
                                </select>
                            </div>
                        </div>

                        {/* Search Bar */}
                        <div className="relative">
                            <input
                                type="text"
                                placeholder="Rechercher par référence, campagne, release ou testeur..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 dark:text-white placeholder-slate-400 transition-colors"
                            />
                            <div className="absolute left-3 top-3 text-slate-400">
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                </svg>
                            </div>
                        </div>
                    </div>

                    {/* Content: Full-width Table */}
                    <div className="flex-1 overflow-y-auto p-6">
                        {loading ? (
                            <div className="flex justify-center p-12">
                                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                            </div>
                        ) : (
                            <ExecutionTestList
                                tests={filteredTests}
                                onSelectTest={() => { }}
                                selectedTestId={undefined}
                                onEditTest={handleEditTest}
                                onDeleteTest={handleDeleteTest}
                                isTester={false}
                                canManage={true}
                                canDelete={true}
                                groupBy={groupBy}
                            />
                        )}
                    </div>

                    {/* Edit Modal */}
                    {editingTest && (
                        <EditExecutionModal
                            test={editingTest}
                            onClose={() => setEditingTest(null)}
                            onSave={(id, data) => handleUpdateExecution(id, data)}
                        />
                    )}
                </main>
            </div>

            <ConfirmModal
                isOpen={isDeleteModalOpen}
                title="Supprimer l'exécution"
                message="Êtes-vous sûr de vouloir supprimer cette exécution ? Cette action est irréversible."
                onConfirm={confirmDeleteTest}
                onCancel={() => setIsDeleteModalOpen(false)}
                confirmText="Supprimer"
                type="danger"
            />
        </div>
    );
};

export default AdminExecutions;
