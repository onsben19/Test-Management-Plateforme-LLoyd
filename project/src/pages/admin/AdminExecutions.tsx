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
import { PlayCircle, CheckCircle2, XCircle, Clock, Edit, Trash2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import AdminTable from '../../components/AdminTable';
import Pagination from '../../components/Pagination';

const AdminExecutions = () => {
    const { t } = useTranslation();
    const location = useLocation();
    const queryParams = new URLSearchParams(location.search);
    const initialSearch = queryParams.get('search') || '';

    const [executions, setExecutions] = useState<TestItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState(initialSearch);
    const [groupBy, setGroupBy] = useState<'none' | 'campaign' | 'release' | 'project'>('none');
    const [sortOrder, setSortOrder] = useState<'newest' | 'oldest'>('newest');
    const [editingTest, setEditingTest] = useState<TestItem | null>(null);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [testToDelete, setTestToDelete] = useState<TestItem | null>(null);
    const [currentPage, setCurrentPage] = useState(1);
    const pageSize = 12;

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
                businessProject: t_item.business_project_name || 'Global',
                releaseType: t_item.release_type
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
        const query = searchQuery.toLowerCase();
        return executions
            .filter((t) => {
                const name = t.name?.toLowerCase() || '';
                const module = t.module?.toLowerCase() || '';
                const release = t.release?.toLowerCase() || '';
                const realizedBy = t.realized_by?.toLowerCase() || '';
                return (
                    name.includes(query) ||
                    module.includes(query) ||
                    release.includes(query) ||
                    realizedBy.includes(query)
                );
            })
            .sort((a, b) => {
                const dateA = new Date(a.rawDate || 0).getTime();
                const dateB = new Date(b.rawDate || 0).getTime();
                return sortOrder === 'newest' ? dateB - dateA : dateA - dateB;
            });
    }, [executions, searchQuery, sortOrder]);

    const paginatedTests = useMemo(() => {
        const startIndex = (currentPage - 1) * pageSize;
        return filteredTests.slice(startIndex, startIndex + pageSize);
    }, [filteredTests, currentPage, pageSize]);

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
                        variant="blue"
                        description={t('adminExecutions.stats.totalDesc')}
                        isLoading={loading}
                    />
                    <StatCard
                        title={t('adminExecutions.stats.passed')}
                        value={stats.passed}
                        variant="green"
                        description={t('adminExecutions.stats.passedDesc')}
                        changeType="positive"
                        isLoading={loading}
                    />
                    <StatCard
                        title={t('adminExecutions.stats.failed')}
                        value={stats.failed}
                        variant="red"
                        description={t('adminExecutions.stats.failedDesc')}
                        change={stats.failed > 0 ? `+${stats.failed}` : undefined}
                        changeType="negative"
                        isLoading={loading}
                    />
                    <StatCard
                        title={t('adminExecutions.stats.pending')}
                        value={stats.pending}
                        variant="yellow"
                        description={t('adminExecutions.stats.pendingDesc')}
                        isLoading={loading}
                    />
                </div>

                {/* Toolbar */}
                <div className="px-8 py-4 shrink-0">
                    <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-[2.5rem] p-6 flex flex-col xl:flex-row items-center gap-6 shadow-2xl">
                        <div className="relative flex-1 w-full group">
                            <input
                                type="text"
                                placeholder={t('adminExecutions.search')}
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full bg-white/5 border border-white/10 rounded-[1.5rem] px-8 py-4 text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all font-bold placeholder-slate-500"
                            />
                        </div>
                        <div className="flex flex-wrap items-center gap-4 w-full xl:w-auto">
                            <div className="flex items-center gap-3 bg-white/5 p-1.5 rounded-[1.5rem] border border-white/5 flex-1 xl:flex-none">
                                <select
                                    value={groupBy}
                                    onChange={(e) => setGroupBy(e.target.value as 'none' | 'campaign' | 'release' | 'project')}
                                    className="bg-transparent text-white text-[10px] font-bold uppercase tracking-widest px-4 py-2 h-10 outline-none w-full cursor-pointer appearance-none"
                                >
                                    <option value="none" className="bg-slate-900">{t('adminExecutions.controls.none')}</option>
                                    <option value="project" className="bg-slate-900">{t('adminExecutions.controls.project') || 'Par Projet'}</option>
                                    <option value="campaign" className="bg-slate-900">{t('adminExecutions.controls.campaign')}</option>
                                    <option value="release" className="bg-slate-900">{t('adminExecutions.controls.release')}</option>
                                </select>
                            </div>

                            <div className="flex items-center gap-3 bg-white/5 p-1.5 rounded-[1.5rem] border border-white/5 flex-1 xl:flex-none">
                                <select
                                    value={sortOrder}
                                    onChange={(e) => setSortOrder(e.target.value as 'newest' | 'oldest')}
                                    className="bg-transparent text-white text-[10px] font-bold uppercase tracking-widest px-4 py-2 h-10 outline-none w-full cursor-pointer appearance-none"
                                >
                                    <option value="newest" className="bg-slate-900">RÉCENTS</option>
                                    <option value="oldest" className="bg-slate-900">ANCIENS</option>
                                </select>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Content */}
                <div className="flex-1 p-8 pt-2">
                    <AdminTable
                        columns={[
                            {
                                header: 'TEST & CAMPAGNE',
                                accessor: (item: TestItem) => (
                                    <div className="flex flex-col gap-1">
                                        <span className="text-base font-bold text-white tracking-tight">{item.name}</span>
                                        <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest opacity-60">{item.module}</span>
                                    </div>
                                )
                            },
                            {
                                header: 'PROJET & RELEASE',
                                accessor: (item: TestItem) => (
                                    <div className="flex flex-col gap-1.5">
                                        <span className="text-[11px] font-black text-white uppercase tracking-widest">{item.businessProject || 'GLOBAL'}</span>
                                        <div className="flex items-center gap-2 text-slate-500">
                                            <span className="text-[10px] font-bold uppercase tracking-widest">{item.release}</span>
                                            {item.releaseType && (
                                                <span className={`text-[8px] px-1.5 py-0.5 rounded-md font-black uppercase tracking-widest ${item.releaseType === 'PREPROD' ? 'bg-indigo-500/10 text-indigo-400' : 'bg-emerald-500/10 text-emerald-400'}`}>
                                                    {item.releaseType}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                )
                            },
                            {
                                header: 'RÉALISÉ PAR',
                                accessor: (item: TestItem) => <span className="text-xs font-bold text-white tracking-tight">{item.realized_by}</span>
                            },
                            {
                                header: 'CAPTURES',
                                accessor: (item: TestItem) => (item.captures && item.captures.length > 0) ? (
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            window.open(item.captures![0], '_blank');
                                        }}
                                        className="text-blue-400 text-[10px] font-black uppercase tracking-widest hover:text-blue-300"
                                    >
                                        VOIR
                                    </button>
                                ) : (
                                    <span className="text-slate-600 font-bold uppercase tracking-widest text-[9px] opacity-40">AUCUNE</span>
                                )
                            },
                            {
                                header: 'STATUT',
                                accessor: (item: TestItem) => (
                                    <span className={`inline-flex items-center gap-3 px-4 py-1.5 rounded-2xl text-[10px] font-bold uppercase tracking-widest border ${item.status === 'passed' ? 'bg-blue-500/5 text-blue-400 border-blue-500/10' : item.status === 'failed' ? 'bg-rose-500/5 text-rose-400 border-rose-500/10' : 'bg-amber-500/5 text-amber-400 border-amber-500/10'}`}>
                                        <div className={`w-1.5 h-1.5 rounded-full ${item.status === 'passed' ? 'bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.5)]' : item.status === 'failed' ? 'bg-rose-500' : 'bg-amber-500'}`} />
                                        {item.status}
                                    </span>
                                )
                            },
                            {
                                header: 'DATE',
                                accessor: (item: TestItem) => (
                                    <div className="flex flex-col">
                                        <span className="text-slate-300 text-[10px] font-bold tracking-tight">{item.lastRun.split(' ')[0]}</span>
                                        <span className="text-slate-500 text-[9px] font-bold uppercase tracking-widest opacity-60 italic">{item.lastRun.split(' ')[1]}</span>
                                    </div>
                                )
                            }
                        ]}
                        data={paginatedTests}
                        isLoading={loading}
                        onRowClick={() => { }}
                        actions={(item: TestItem) => (
                            <div className="flex items-center justify-end gap-6 pr-4">
                                <button onClick={() => handleEditTest(item)} className="text-slate-400 hover:text-blue-400 transition-colors">
                                    <Edit className="w-4 h-4" />
                                </button>
                                <button onClick={() => handleDeleteTest(item)} className="text-slate-400 hover:text-rose-400 transition-colors">
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            </div>
                        )}
                    />

                    <div className="mt-8 flex justify-center">
                        <Pagination
                            currentPage={currentPage}
                            totalCount={filteredTests.length}
                            pageSize={pageSize}
                            onPageChange={setCurrentPage}
                        />
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
