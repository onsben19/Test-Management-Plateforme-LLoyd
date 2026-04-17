import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import Header from '../components/Header';
import Sidebar from '../components/Sidebar';
import ExecutionTestList, { type TestItem } from '../components/ExecutionTestList';
import TeamPerformance from '../components/TeamPerformance';
import ReviewPanel from '../components/ReviewPanel';
import EditExecutionModal from '../components/EditExecutionModal';
import { useNavigate, useLocation } from 'react-router-dom';
import {
    executionService,
    projectService,
    campaignService,
    aiService
} from '../services/api';
import { useSidebar } from '../context/SidebarContext';
import StatCard from '../components/StatCard';
import PageLayout from '../components/PageLayout';
import {
    PlayCircle,
    CheckCircle,
    XCircle,
    BarChart3,
    Clock,
    List,
    X,
    Search,
    Filter,
    SortAsc,
    LayoutGrid,
    Sparkles,
    Target,
    Zap,
    ArrowRight
} from 'lucide-react';
import CatchupPlanIA from '../components/CatchupPlanIA';
import { motion, AnimatePresence } from 'framer-motion';
import { createPortal } from 'react-dom';
import Pagination from '../components/Pagination';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';

const ExecutionTracking = () => {
    const { t } = useTranslation();
    const { user } = useAuth();
    const location = useLocation();
    const navigate = useNavigate();
    const { isOpen } = useSidebar();

    const isTester = user?.role?.toLowerCase() === 'tester';
    const isAdmin = user?.role?.toLowerCase() === 'admin';
    const isManager = user?.role?.toLowerCase() === 'manager';
    const canManage = isAdmin || isTester || isManager;
    const canDelete = isAdmin;

    const [activeTab, setActiveTab] = useState<'list' | 'performance'>('list');
    const [selectedTest, setSelectedTest] = useState<TestItem | null>(null);
    const [editingTest, setEditingTest] = useState<TestItem | null>(null);
    const [tests, setTests] = useState<TestItem[]>([]);
    const [viewingCaptures, setViewingCaptures] = useState<TestItem | null>(null);
    const [loading, setLoading] = useState(true);
    const [isCatchupPlanOpen, setIsCatchupPlanOpen] = useState(false);
    const [selectedCampaignId, setSelectedCampaignId] = useState<number | null>(null);

    // Pagination State
    const [currentPage, setCurrentPage] = useState(1);
    const [totalItems, setTotalItems] = useState(0);
    const pageSize = 10;

    const [searchQuery, setSearchQuery] = useState('');
    const [sortOrder, setSortOrder] = useState<'newest' | 'oldest'>('newest');
    const [groupBy, setGroupBy] = useState<'none' | 'campaign' | 'release'>('none');

    const [projects, setProjects] = useState<any[]>([]);
    const [campaigns, setCampaigns] = useState<any[]>([]);

    const stats = useMemo(() => {
        const total = totalItems;
        const passed = tests.filter(t => t.status === 'passed').length;
        const failed = tests.filter(t => t.status === 'failed').length;
        const pending = tests.filter(t => t.status === 'pending' || t.status === 'running').length;
        const successRate = total > 0 ? Math.round((passed / total) * 100) : 0;

        return { total, passed, failed, pending, successRate };
    }, [tests, totalItems]);

    const filteredTests = useMemo(() => {
        return tests.filter(t => {
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
    }, [tests, searchQuery, sortOrder]);

    useEffect(() => {
        fetchExecutions(1);
        fetchFilters();
        setCurrentPage(1);
    }, [searchQuery, sortOrder]);

    const handlePageChange = (page: number) => {
        setCurrentPage(page);
        fetchExecutions(page);
    };

    // Deep-link: open ReviewPanel for a specific test from URL params
    useEffect(() => {
        const params = new URLSearchParams(location.search);
        const testId = params.get('testId');
        if (!testId) return;

        const found = tests.find(t => t.id === testId);
        if (found) {
            setSelectedTest(found);
        } else if (!selectedTest || selectedTest.id !== testId) {
            executionService.getExecution(testId).then(res => {
                const t = res.data;
                setSelectedTest({
                    id: t.id.toString(),
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
                });
            }).catch(() => {
                // Silently fail if testId is invalid
            });
        }
    }, [tests, location.search, selectedTest?.id]);

    const fetchFilters = async () => {
        try {
            const [projRes, campRes] = await Promise.all([
                projectService.getProjects(),
                campaignService.getCampaigns()
            ]);
            setProjects(projRes.data.results || projRes.data);
            setCampaigns(campRes.data.results || campRes.data);
            if (campRes.data.results?.[0]?.id) {
                setSelectedCampaignId(campRes.data.results[0].id);
            } else if (campRes.data?.[0]?.id) {
                setSelectedCampaignId(campRes.data[0].id);
            }
        } catch {
            // Filter dropdowns are optional
        }
    };

    const fetchExecutions = async (page = 1) => {
        try {
            setLoading(true);
            const response = await executionService.getExecutions({
                page,
                search: searchQuery,
                ordering: sortOrder === 'newest' ? '-execution_date' : 'execution_date'
            });

            const data = response.data.results || response.data;
            const count = response.data.count || (Array.isArray(response.data) ? response.data.length : 0);

            setTotalItems(count);

            const mappedTests: TestItem[] = data.map((t: any, index: number) => ({
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
            }));
            setTests(mappedTests);
        } catch (error) {
            console.error('Failed to load executions', error);
        } finally {
            setLoading(false);
        }
    };

    const handleTestUpdate = async (testId: string, updates: Partial<TestItem> | FormData) => {
        try {
            await executionService.updateExecution(testId, updates);
            fetchExecutions();
        } catch (error) {
            console.error('Failed to update test', error);
        }
    };

    const handleSelectTest = (test: TestItem) => {
        setSelectedTest(test);
    };

    const handleDeleteTest = async (test: TestItem) => {
        try {
            await executionService.deleteExecution(test.id);
            setTests(prev => prev.filter(t => t.id !== test.id));
        } catch (error) {
            console.error('Failed to delete test', error);
            alert('Erreur lors de la suppression. Veuillez réessayer.');
        }
    };

    return (
        <PageLayout
            title="Liste des cas de tests exécutés"
            subtitle="AUDIT & PERFORMANCE"
        >
            <div className="flex flex-col lg:flex-row gap-8 min-h-[calc(100vh-280px)] relative">
                {/* Left List Panel */}
                <div className="flex-1 space-y-8">
                    {/* ... (stats and list remain same) */}
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
                        <StatCard
                            title="Total Exécutions"
                            value={stats.total}
                            icon={PlayCircle}
                            variant="blue"
                            description="Toutes campagnes"
                            isLoading={loading}
                        />
                        <StatCard
                            title="Taux de Réussite"
                            value={`${stats.successRate}%`}
                            icon={CheckCircle}
                            variant="green"
                            description="Tests validés"
                            isLoading={loading}
                        />
                        <StatCard
                            title="Tests Échoués"
                            value={stats.failed}
                            icon={XCircle}
                            variant="red"
                            description="Anomalies"
                            isLoading={loading}
                        />
                        <StatCard
                            title="En Attente"
                            value={stats.pending}
                            icon={Clock}
                            variant="yellow"
                            description="Restants"
                            isLoading={loading}
                        />
                    </div>

                    {/* Search/Filter Bar */}
                    <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-[3.5rem] overflow-hidden shadow-2xl shadow-blue-900/10">
                        <div className="p-8 border-b border-white/5 flex flex-col xl:flex-row items-center gap-6">
                            <div className="relative flex-1 group w-full">
                                <Search className="absolute left-8 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 group-focus-within:text-blue-500 transition-colors" />
                                <input
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    placeholder="Rechercher une exécution..."
                                    className="w-full bg-white/5 border border-white/10 rounded-full pl-16 pr-8 py-4 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500/30 transition-all font-medium placeholder-slate-500"
                                />
                            </div>

                            <div className="flex flex-wrap items-center gap-3 w-full xl:w-auto">
                                <div className="relative bg-white/5 rounded-2xl border border-white/10 overflow-hidden min-w-[180px] hover:bg-white/10 transition-all">
                                    <select
                                        className="w-full bg-transparent text-white text-[9px] font-bold uppercase tracking-[0.2em] pl-6 pr-10 py-4 outline-none cursor-pointer appearance-none relative z-10"
                                        value={groupBy}
                                        onChange={(e) => setGroupBy(e.target.value as 'none' | 'campaign' | 'release')}
                                    >
                                        <option value="none" className="bg-slate-900">SANS GROUPEMENT</option>
                                        <option value="campaign" className="bg-slate-900">PAR CAMPAGNE</option>
                                        <option value="release" className="bg-slate-900">PAR RELEASE</option>
                                    </select>
                                    <LayoutGrid className="absolute right-5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500 pointer-events-none" />
                                </div>

                                <div className="relative bg-white/5 rounded-2xl border border-white/10 overflow-hidden min-w-[180px] hover:bg-white/10 transition-all">
                                    <select
                                        className="w-full bg-transparent text-white text-[9px] font-bold uppercase tracking-[0.2em] pl-6 pr-10 py-4 outline-none cursor-pointer appearance-none relative z-10"
                                        value={sortOrder}
                                        onChange={(e) => setSortOrder(e.target.value as 'newest' | 'oldest')}
                                    >
                                        <option value="newest" className="bg-slate-900">PLUS RÉCENT</option>
                                        <option value="oldest" className="bg-slate-900">PLUS ANCIEN</option>
                                    </select>
                                    <SortAsc className="absolute right-5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500 pointer-events-none" />
                                </div>
                            </div>
                        </div>

                        <div className="bg-slate-900/40">
                            <ExecutionTestList
                                tests={filteredTests}
                                onSelectTest={handleSelectTest}
                                selectedTestId={selectedTest?.id}
                                onViewCaptures={setViewingCaptures}
                                onEditTest={setEditingTest}
                                onDeleteTest={handleDeleteTest}
                                isTester={isTester}
                                canManage={canManage}
                                canDelete={canDelete}
                                groupBy={groupBy}
                            />
                        </div>
                    </div>

                    <Pagination
                        currentPage={currentPage}
                        totalItems={totalItems}
                        pageSize={pageSize}
                        onPageChange={handlePageChange}
                        loading={loading}
                    />
                </div>

                {typeof document !== 'undefined' && createPortal(
                    <AnimatePresence>
                        {selectedTest && (
                            <>
                                <motion.div
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    exit={{ opacity: 0 }}
                                    onClick={() => setSelectedTest(null)}
                                    className="fixed inset-0 z-[1000] bg-black/60 backdrop-blur-sm"
                                />
                                <motion.div
                                    initial={{ x: '100%' }}
                                    animate={{ x: 0 }}
                                    exit={{ x: '100%' }}
                                    transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                                    className="fixed right-0 top-0 bottom-0 z-[1010] w-full max-w-[500px] bg-[#0b0e14] border-l border-white/5 flex flex-col shadow-2xl"
                                >
                                    <ReviewPanel
                                        test={selectedTest}
                                        onClose={() => setSelectedTest(null)}
                                        onUpdate={(updates) => handleTestUpdate(selectedTest.id, updates)}
                                        embed={true}
                                        readOnly={!canManage}
                                    />
                                </motion.div>
                            </>
                        )}
                    </AnimatePresence>,
                    document.body
                )}
            </div>

            {typeof document !== 'undefined' && editingTest && createPortal(
                <EditExecutionModal
                    test={editingTest}
                    onClose={() => setEditingTest(null)}
                    onSave={handleTestUpdate}
                />,
                document.body
            )}

            {/* Image Viewer Lightbox */}
            {typeof document !== 'undefined' && viewingCaptures && createPortal(
                <div className="fixed inset-0 z-[2000] flex items-center justify-center bg-slate-950/90 backdrop-blur-xl" onClick={() => setViewingCaptures(null)}>
                    <div className="relative max-w-7xl max-h-screen w-full p-8 flex flex-col items-center" onClick={e => e.stopPropagation()}>
                        <button
                            className="absolute top-8 right-8 text-white/50 hover:text-white transition-all transform hover:rotate-90 hover:scale-110"
                            onClick={() => setViewingCaptures(null)}
                        >
                            <div className="bg-white/5 p-3 rounded-full hover:bg-white/10 border border-white/10 shadow-2xl backdrop-blur-md">
                                <X className="w-8 h-8" />
                            </div>
                        </button>
                        <div className="flex overflow-x-auto gap-8 p-8 w-full justify-center snap-x custom-scrollbar">
                            {(viewingCaptures.captures || []).map((cap, idx) => (
                                <div key={idx} className="snap-center shrink-0 max-w-[85vw] max-h-[75vh] flex flex-col items-center group">
                                    <div className="relative border-2 border-white/10 rounded-[2.5rem] overflow-hidden shadow-2xl">
                                        {cap.startsWith('data:') ? (
                                            <img src={cap} alt={`Capture ${idx}`} className="max-h-[70vh] object-contain transition-transform duration-500 group-hover:scale-[1.02]" />
                                        ) : (
                                            <div className="w-96 h-64 bg-white/5 flex items-center justify-center rounded-[2.5rem]">
                                                <span className="text-slate-500 font-bold uppercase tracking-widest text-xs opacity-50">{cap}</span>
                                            </div>
                                        )}
                                        <div className="absolute top-6 left-6 bg-black/40 backdrop-blur-md px-4 py-2 rounded-full border border-white/10">
                                            <p className="text-white/70 font-bold uppercase tracking-[0.2em] text-[8px]">CAPTURE {idx + 1} / {(viewingCaptures?.captures || []).length}</p>
                                        </div>
                                    </div>
                                    <div className="mt-6 flex flex-col items-center gap-1">
                                        <h4 className="text-white font-black text-lg tracking-tight">{viewingCaptures.name}</h4>
                                        <p className="text-blue-400 text-[10px] font-black uppercase tracking-widest">{viewingCaptures.module}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>,
                document.body
            )}
            {/* Catch-up Plan Modal */}
            {typeof document !== 'undefined' && isCatchupPlanOpen && selectedCampaignId && createPortal(
                <div className="fixed inset-0 z-[2000] flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-4 overflow-y-auto">
                    <div className="relative w-full max-w-2xl my-8">
                        <button
                            onClick={() => setIsCatchupPlanOpen(false)}
                            className="absolute -top-12 right-0 text-white/50 hover:text-white transition-colors"
                        >
                            <X className="w-8 h-8" />
                        </button>
                        <CatchupPlanIA
                            campaignId={selectedCampaignId}
                            onClose={() => setIsCatchupPlanOpen(false)}
                        />
                    </div>
                </div>,
                document.body
            )}
        </PageLayout>
    );
};

export default ExecutionTracking;
