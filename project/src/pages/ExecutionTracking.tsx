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
    aiService,
    analyticsService
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
    Zap,
    ArrowRight,
    Medal,
    Crown,
    Award
} from 'lucide-react';
import CatchupPlanIA from '../components/CatchupPlanIA';
import AIAutomationModal from '../components/AIAutomationModal';
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
    const canDelete = isAdmin || isManager;

    const [activeTab, setActiveTab] = useState<'list' | 'performance'>('list');
    const [selectedTest, setSelectedTest] = useState<TestItem | null>(null);
    const [editingTest, setEditingTest] = useState<TestItem | null>(null);
    const [testToAutomate, setTestToAutomate] = useState<TestItem | null>(null);
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
    const [testerFilter, setTesterFilter] = useState('');
    const [sortOrder, setSortOrder] = useState<'newest' | 'oldest'>('newest');
    const [groupBy, setGroupBy] = useState<'none' | 'campaign' | 'release' | 'project'>('none');
    const [statusFilter, setStatusFilter] = useState<'all' | 'passed' | 'failed' | 'pending'>('all');

    const [projects, setProjects] = useState<any[]>([]);
    const [campaigns, setCampaigns] = useState<any[]>([]);
    const [topTester, setTopTester] = useState<any>(null);

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
            const matchesSearch = (
                (t.name?.toLowerCase() || '').includes(query) ||
                (t.module?.toLowerCase() || '').includes(query) ||
                (t.release?.toLowerCase() || '').includes(query) ||
                (t.realized_by?.toLowerCase() || '').includes(query)
            );
            const matchesTester = !testerFilter || (t.realized_by?.toLowerCase() || '').includes(testerFilter.toLowerCase());
            const matchesStatus = statusFilter === 'all' || t.status === statusFilter;
            return matchesSearch && matchesStatus && matchesTester;
        }).sort((a, b) => {
            const dateA = new Date(a.rawDate || 0).getTime();
            const dateB = new Date(b.rawDate || 0).getTime();
            return sortOrder === 'newest' ? dateB - dateA : dateA - dateB;
        });
    }, [tests, searchQuery, testerFilter, sortOrder, statusFilter]);

    useEffect(() => {
        fetchExecutions(1);
        fetchFilters();
        if (!isTester) {
            fetchTopTester();
        }
        setCurrentPage(1);
    }, [searchQuery, sortOrder]);

    const fetchTopTester = async () => {
        try {
            const res = await analyticsService.getHistoricalTesters('all');
            const testers = res.data;
            if (testers && testers.length > 0) {
                const sorted = [...testers].sort((a, b) => b.latest_pass_rate - a.latest_pass_rate);
                setTopTester(sorted[0]);
            }
        } catch (err) {
            console.error("Failed to fetch top tester", err);
        }
    };

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
                const rawName = t.test_case_ref || `Test ${t.id}`;
                setSelectedTest({
                    id: t.id.toString(),
                    name: rawName.length > 45 ? rawName.substring(0, 45) + '...' : rawName,
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

            const mappedTests: TestItem[] = data.map((t: any, index: number) => {
                const rawName = t.test_case_ref || `Test ${t.id}`;
                const displayName = rawName.length > 45 ? rawName.substring(0, 45) + '...' : rawName;
                return {
                    id: (t.id || index).toString(),
                    name: displayName,
                    module: t.campaign_title || `Campagne #${t.campaign}`,
                    assigned_to: t.assigned_tester_name || 'Non assigné',
                    realized_by: t.tester_name || 'Non assigné',
                    status: t.status.toLowerCase(),
                    duration: 'N/A',
                    lastRun: new Date(t.execution_date || Date.now()).toLocaleString('fr-FR'),
                rawDate: t.execution_date,
                captures: t.proof_file ? [t.proof_file] : [],
                release: t.project_name || 'Release A',
                businessProject: t.business_project_name || 'Global',
                releaseType: t.release_type,
                execution_logs: t.data_json?.execution_logs,
                automation_code: t.automation_code
            };
        });
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
            title={t('execution.title')}
            subtitle={t('execution.subtitle')}
        >
            <div className="flex flex-col lg:flex-row gap-8 min-h-[calc(100vh-280px)] relative">
                {/* Left List Panel */}
                <div className="flex-1 space-y-8 w-full">
                    {/* ... (stats and list remain same) */}
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
                        <StatCard
                            title={t('execution.stats.total')}
                            value={stats.total}
                            icon={PlayCircle}
                            variant="blue"
                            description={t('execution.stats.totalDesc')}
                            isLoading={loading}
                        />
                        <StatCard
                            title="TESTS RÉUSSIS"
                            value={stats.passed}
                            icon={CheckCircle}
                            variant="blue"
                            description="Nombre de tests validés"
                            isLoading={loading}
                        />
                        <StatCard
                            title={t('execution.stats.failed')}
                            value={stats.failed}
                            icon={XCircle}
                            variant="red"
                            description={t('execution.stats.failedDesc')}
                            isLoading={loading}
                        />
                        {!isTester && (
                            <StatCard
                                title={t('execution.stats.topTester') || "Top Testeur"}
                                value={topTester ? topTester.tester.name : "Chargement..."}
                                icon={Award}
                                variant="purple"
                                description={topTester ? `Score: ${topTester.latest_pass_rate}%` : "Performance IA"}
                                isLoading={loading || !topTester}
                            />
                        )}
                    </div>

                    {/* Search/Filter Bar */}
                    <div className="flex flex-col md:flex-row gap-4 items-stretch md:items-center flex-wrap">
                        <div className="flex-1 bg-slate-50 dark:bg-white/[0.02] border border-slate-200 dark:border-white/[0.05] rounded-xl p-3 flex items-center gap-3 min-w-[200px]">
                            <Search className="w-4 h-4 text-slate-400 ml-2" />
                            <input
                                type="text"
                                placeholder={t('execution.filters.search') || "Rechercher une exécution..."}
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="flex-1 bg-transparent border-none text-sm text-foreground focus:ring-0 outline-none placeholder-slate-400"
                            />
                        </div>

                        {!isTester && (
                            <div className="flex-1 bg-slate-50 dark:bg-white/[0.02] border border-slate-200 dark:border-white/[0.05] rounded-xl p-3 flex items-center gap-3 min-w-[200px]">
                                <Filter className="w-4 h-4 text-slate-400 ml-2" />
                                <input
                                    type="text"
                                    placeholder="Filtrer par testeur..."
                                    value={testerFilter}
                                    onChange={(e) => setTesterFilter(e.target.value)}
                                    className="flex-1 bg-transparent border-none text-sm text-slate-900 dark:text-white focus:ring-0 outline-none placeholder-slate-400"
                                />
                            </div>
                        )}

                        {/* Filtres Statut */}
                        <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-white/[0.02] border border-slate-200 dark:border-white/[0.05] rounded-xl p-1.5">
                            {([
                                { value: 'all',    label: 'Tous',     color: 'text-slate-400 hover:text-white',       active: 'bg-slate-600 text-white' },
                                { value: 'passed', label: '✓ Succès', color: 'text-blue-400/70 hover:text-blue-300', active: 'bg-blue-500/20 text-blue-300 border border-blue-500/30' },
                                { value: 'failed', label: '✗ Échec',  color: 'text-rose-400/70 hover:text-rose-300', active: 'bg-rose-500/20 text-rose-300 border border-rose-500/30' },
                            ] as const).map(({ value, label, color, active }) => (
                                <button
                                    key={value}
                                    onClick={() => setStatusFilter(value)}
                                    className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${
                                        statusFilter === value ? active : color
                                    }`}
                                >
                                    {label}
                                </button>
                            ))}
                        </div>

                        <div className="bg-slate-50 dark:bg-white/[0.02] border border-slate-200 dark:border-white/[0.05] rounded-xl p-1 flex gap-1">
                            <div className="relative flex items-center">
                                <select
                                    className="bg-transparent text-slate-900 dark:text-white text-[10px] font-black uppercase tracking-[0.2em] pl-4 pr-10 py-2 outline-none cursor-pointer appearance-none relative z-10"
                                    value={groupBy}
                                    onChange={(e) => setGroupBy(e.target.value as 'none' | 'campaign' | 'release' | 'project')}
                                >
                                    <option value="none" className="bg-slate-950">{t('execution.filters.groupNone') || "SANS GROUPEMENT"}</option>
                                    <option value="project" className="bg-slate-950">{t('execution.filters.groupProject') || "PAR PROJET"}</option>
                                    <option value="campaign" className="bg-slate-950">{t('execution.filters.groupCampaign') || "PAR CAMPAGNE"}</option>
                                    <option value="release" className="bg-slate-950">{t('execution.filters.groupRelease') || "PAR RELEASE"}</option>
                                </select>
                                <LayoutGrid className="absolute right-3 w-3.5 h-3.5 text-slate-500 pointer-events-none" />
                            </div>
                            <div className="relative flex items-center">
                                <select
                                    className="bg-transparent text-slate-900 dark:text-white text-[10px] font-black uppercase tracking-[0.2em] pl-4 pr-10 py-2 outline-none cursor-pointer appearance-none relative z-10"
                                    value={sortOrder}
                                    onChange={(e) => setSortOrder(e.target.value as 'newest' | 'oldest')}
                                >
                                    <option value="newest" className="bg-slate-950">{t('execution.filters.sortNewest') || "PLUS RÉCENT"}</option>
                                    <option value="oldest" className="bg-slate-950">{t('execution.filters.sortOldest') || "PLUS ANCIEN"}</option>
                                </select>
                                <SortAsc className="absolute right-3 w-3.5 h-3.5 text-slate-500 pointer-events-none" />
                            </div>
                        </div>
                    </div>

                    <div className="bg-slate-50 dark:bg-white/[0.02] border border-slate-200 dark:border-white/[0.05] rounded-xl overflow-hidden shadow-sm">
                        <div className="w-full overflow-x-auto">
                            <ExecutionTestList
                                tests={filteredTests}
                                onSelectTest={handleSelectTest}
                                selectedTestId={selectedTest?.id}
                                onViewCaptures={setViewingCaptures}
                                onEditTest={setEditingTest}
                                onDeleteTest={handleDeleteTest}
                                onAutomateTest={setTestToAutomate}
                                isTester={isTester}
                                canManage={canManage}
                                canDelete={canDelete}
                                groupBy={groupBy}
                            />
                        </div>
                        <div className="border-t border-slate-200 dark:border-white/5 bg-slate-900/20">
                            <Pagination
                                currentPage={currentPage}
                                totalItems={totalItems}
                                pageSize={pageSize}
                                onPageChange={handlePageChange}
                                loading={loading}
                            />
                        </div>
                    </div>
                </div>
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
                            className="absolute top-8 right-8 text-slate-900 dark:text-white/50 hover:text-slate-900 dark:hover:text-white transition-all transform hover:rotate-90 hover:scale-110"
                            onClick={() => setViewingCaptures(null)}
                        >
                            <div className="bg-slate-100 dark:bg-white/5 p-3 rounded-full hover:bg-slate-200 dark:bg-white/10 border border-slate-300 dark:border-white/10 shadow-2xl backdrop-blur-md">
                                <X className="w-8 h-8" />
                            </div>
                        </button>
                        <div className="flex overflow-x-auto gap-8 p-8 w-full justify-center snap-x custom-scrollbar">
                            {(viewingCaptures.captures || []).map((cap, idx) => (
                                <div key={idx} className="snap-center shrink-0 max-w-[85vw] max-h-[75vh] flex flex-col items-center group">
                                    <div className="relative border-2 border-slate-300 dark:border-white/10 rounded-[2.5rem] overflow-hidden shadow-2xl">
                                        {cap.startsWith('data:') ? (
                                            <img src={cap} alt={`Preuve ${idx + 1}`} className="max-h-[70vh] object-contain transition-transform duration-500 group-hover:scale-[1.02]" />
                                        ) : (
                                            <div className="w-96 h-64 bg-slate-100 dark:bg-white/5 flex items-center justify-center rounded-[2.5rem]">
                                                <span className="text-slate-500 font-bold uppercase tracking-widest text-xs opacity-50">{cap}</span>
                                            </div>
                                        )}
                                        <div className="absolute top-6 left-6 bg-black/40 backdrop-blur-md px-4 py-2 rounded-full border border-slate-300 dark:border-white/10">
                                            <p className="text-slate-900 dark:text-white/70 font-bold uppercase tracking-[0.2em] text-[8px]">PREUVE {idx + 1} / {(viewingCaptures?.captures || []).length}</p>
                                        </div>
                                    </div>
                                    <div className="mt-6 flex flex-col items-center gap-1">
                                        <h4 className="text-slate-900 dark:text-white font-black text-lg tracking-tight">{viewingCaptures.name}</h4>
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
                            className="absolute -top-12 right-0 text-slate-900 dark:text-white/50 hover:text-slate-900 dark:hover:text-white transition-colors"
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

            {/* AI Automation Modal */}
            {typeof document !== 'undefined' && testToAutomate && createPortal(
                <AIAutomationModal
                    test={testToAutomate}
                    onClose={() => setTestToAutomate(null)}
                    onUpdate={() => fetchExecutions(currentPage)}
                />,
                document.body
            )}
        </PageLayout>
    );
};

export default ExecutionTracking;
