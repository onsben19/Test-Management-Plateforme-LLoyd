import React, { useEffect, useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import PageLayout from '../../components/PageLayout';
import ExecutionTestList, { type TestItem } from '../../components/ExecutionTestList';
import { executionService } from '../../services/api';
import { toast } from 'react-toastify';
import EditExecutionModal from '../../components/EditExecutionModal';
import { useLocation } from 'react-router-dom';
import ConfirmModal from '../../components/ConfirmModal';
import StatCard from '../../components/StatCard';
import { PlayCircle, CheckCircle2, XCircle, Clock, Search, Filter, SortAsc, LayoutGrid, Layers, Calendar, ChevronRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const AdminExecutions = () => {
    const { t } = useTranslation();
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
            const mappedTests: TestItem[] = data.map((t_item: any, index: number) => ({
                id: (t_item.id || index).toString(),
                name: t_item.test_case_ref || `Test ${t_item.id}`,
                module: t_item.campaign_title || t('adminExecutions.moduleFallback', { id: t_item.campaign }),
                assigned_to: t_item.assigned_tester_name || t('adminExecutions.unassigned'),
                realized_by: t_item.tester_name || t('adminExecutions.unassigned'),
                status: (t_item.status || 'pending').toLowerCase(),
                duration: t('adminExecutions.na'),
                lastRun: new Date(t_item.execution_date || Date.now()).toLocaleString(t('common.dateLocale')),
                rawDate: t_item.execution_date,
                captures: t_item.proof_file ? [t_item.proof_file] : [],
                release: t_item.project_name || t('adminExecutions.releaseFallback'),
            }));
            setExecutions(mappedTests);
        } catch (error) {
            console.error("Failed to fetch executions", error);
            toast.error(t('adminExecutions.toasts.fetchError'));
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchExecutions();
    }, []);

    const filteredTests = useMemo(() => {
        return executions.filter(t => {
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
    }, [executions, searchQuery, sortOrder]);

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
            setExecutions(prev => prev.filter(t_item => t_item.id !== testToDelete.id));
            toast.success(t('adminExecutions.toasts.deleteSuccess'));
        } catch {
            toast.error(t('adminExecutions.toasts.deleteError'));
        } finally {
            setIsDeleteModalOpen(false);
            setTestToDelete(null);
        }
    };

    const handleUpdateExecution = async (testId: string, updates: any) => {
        try {
            await executionService.updateExecution(testId, updates);
            toast.success(t('adminExecutions.toasts.updateSuccess'));
            setEditingTest(null);
            fetchExecutions();
        } catch {
            toast.error(t('adminExecutions.toasts.updateError'));
        }
    };

    return (
        <PageLayout
            title={t('adminExecutions.title')}
            subtitle="EXECUTION AUDIT"
            noPadding
            fullHeight
        >
            <div className="flex flex-col h-full">
                {/* Stats Section */}
                <div className="p-8 pb-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 shrink-0">
                    <StatCard
                        title={t('adminExecutions.stats.total')}
                        value={stats.total}
                        icon={PlayCircle}
                        variant="blue"
                        description={t('adminExecutions.stats.totalDesc')}
                        isLoading={loading}
                    />
                    <StatCard
                        title={t('adminExecutions.stats.passed')}
                        value={stats.passed}
                        icon={CheckCircle2}
                        variant="green"
                        description={t('adminExecutions.stats.passedDesc')}
                        changeType="positive"
                        isLoading={loading}
                    />
                    <StatCard
                        title={t('adminExecutions.stats.failed')}
                        value={stats.failed}
                        icon={XCircle}
                        variant="red"
                        description={t('adminExecutions.stats.failedDesc')}
                        change={stats.failed > 0 ? `+${stats.failed}` : undefined}
                        changeType="negative"
                        isLoading={loading}
                    />
                    <StatCard
                        title={t('adminExecutions.stats.pending')}
                        value={stats.pending}
                        icon={Clock}
                        variant="yellow"
                        description={t('adminExecutions.stats.pendingDesc')}
                        isLoading={loading}
                    />
                </div>

                {/* Toolbar */}
                <div className="px-8 py-4 shrink-0">
                    <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-[2.5rem] p-6 flex flex-col xl:flex-row items-center gap-6 shadow-2xl">
                        <div className="relative flex-1 w-full group">
                            <Search className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500 group-focus-within:text-blue-500 transition-colors" />
                            <input
                                type="text"
                                placeholder={t('adminExecutions.search')}
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full bg-white/5 border border-white/10 rounded-[1.5rem] pl-16 pr-8 py-4 text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all font-bold placeholder-slate-500"
                            />
                        </div>
                        <div className="flex flex-wrap items-center gap-4 w-full xl:w-auto">
                            <div className="flex items-center gap-3 bg-white/5 p-1.5 rounded-[1.5rem] border border-white/5 flex-1 xl:flex-none">
                                <div className="p-2 bg-indigo-500/10 rounded-full border border-indigo-500/20">
                                    <LayoutGrid className="w-4 h-4 text-indigo-500" />
                                </div>
                                <select
                                    value={groupBy}
                                    onChange={(e) => setGroupBy(e.target.value as 'none' | 'campaign' | 'release')}
                                    className="bg-transparent text-white text-[10px] font-bold uppercase tracking-widest px-4 py-2 h-10 outline-none w-full cursor-pointer appearance-none"
                                >
                                    <option value="none" className="bg-slate-900">{t('adminExecutions.controls.none')}</option>
                                    <option value="campaign" className="bg-slate-900">{t('adminExecutions.controls.campaign')}</option>
                                    <option value="release" className="bg-slate-900">{t('adminExecutions.controls.release')}</option>
                                </select>
                            </div>

                            <div className="flex items-center gap-3 bg-white/5 p-1.5 rounded-[1.5rem] border border-white/5 flex-1 xl:flex-none">
                                <div className="p-2 bg-blue-500/10 rounded-full border border-blue-500/20">
                                    <SortAsc className="w-4 h-4 text-blue-500" />
                                </div>
                                <select
                                    value={sortOrder}
                                    onChange={(e) => setSortOrder(e.target.value as 'newest' | 'oldest')}
                                    className="bg-transparent text-white text-[10px] font-bold uppercase tracking-widest px-4 py-2 h-10 outline-none w-full cursor-pointer appearance-none"
                                >
                                    <option value="newest" className="bg-slate-900">{t('adminExecutions.controls.newest')}</option>
                                    <option value="oldest" className="bg-slate-900">{t('adminExecutions.controls.oldest')}</option>
                                </select>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-hidden p-8 pt-2">
                    <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-[3rem] h-full overflow-hidden flex flex-col shadow-2xl">
                        <div className="flex-1 overflow-y-auto custom-scrollbar">
                            {loading && executions.length === 0 ? (
                                <div className="flex flex-col items-center justify-center h-full gap-4 opacity-50">
                                    <div className="w-12 h-12 border-4 border-blue-500/30 border-t-blue-500 rounded-full animate-spin" />
                                    <span className="font-bold text-[10px] tracking-widest uppercase">Initializing terminal...</span>
                                </div>
                            ) : filteredTests.length === 0 ? (
                                <div className="flex flex-col items-center justify-center h-full gap-4 opacity-30">
                                    <PlayCircle className="w-16 h-16 text-slate-500" />
                                    <span className="font-bold text-[10px] tracking-widest uppercase">{t('common.noResults')}</span>
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
                                    variant="transparent"
                                />
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Modals */}
            <AnimatePresence>
                {editingTest && (
                    <EditExecutionModal
                        test={editingTest}
                        onClose={() => setEditingTest(null)}
                        onSave={(id, data) => handleUpdateExecution(id, data)}
                    />
                )}
            </AnimatePresence>

            <ConfirmModal
                isOpen={isDeleteModalOpen}
                title={t('adminExecutions.modal.deleteTitle')}
                message={t('adminExecutions.modal.deleteConfirm')}
                onConfirm={confirmDeleteTest}
                onCancel={() => setIsDeleteModalOpen(false)}
                confirmText={t('adminExecutions.modal.delete')}
                type="danger"
            />
        </PageLayout>
    );
};

export default AdminExecutions;
