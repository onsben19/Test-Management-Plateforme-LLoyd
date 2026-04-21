import React from 'react';
import { PlayCircle, CheckCircle, XCircle, Clock, User, Camera, Eye, Pencil, Trash2, Layers } from 'lucide-react';
import ConfirmModal from './ConfirmModal';

export interface TestItem {
    id: string;
    name: string;
    module: string;
    assigned_to: string; // Was assignee
    realized_by: string; // New
    status: 'passed' | 'failed' | 'running' | 'pending';
    duration: string;
    lastRun: string;
    captures?: string[];
    release?: string;
    businessProject?: string;
    releaseType?: string;
    rawDate?: string;
}


interface ExecutionTestListProps {
    tests?: TestItem[];
    onSelectTest: (test: TestItem) => void;
    selectedTestId?: string;
    onViewCaptures?: (test: TestItem) => void;
    onEditTest?: (test: TestItem) => void;
    onDeleteTest?: (test: TestItem) => void;
    isTester?: boolean;
    canManage?: boolean;
    canDelete?: boolean;
    groupBy?: 'release' | 'campaign' | 'none';
    variant?: 'default' | 'transparent';
}

const ExecutionTestList: React.FC<ExecutionTestListProps> = ({
    tests = [],
    onSelectTest,
    selectedTestId,
    onViewCaptures,
    onEditTest,
    onDeleteTest,
    isTester = false,
    canManage = true,
    canDelete = true,
    groupBy = 'none',
    variant = 'default'
}) => {
    const [isDeleteModalOpen, setIsDeleteModalOpen] = React.useState(false);
    const [testToDelete, setTestToDelete] = React.useState<TestItem | null>(null);

    // Fallback if no tests provided
    const displayTests = tests.length > 0 ? tests : [];

    // Generic Status Logic
    const getStatusColor = (status: string) => {
        switch (String(status).toLowerCase()) {
            case 'passed': return 'text-green-400 bg-green-400/10';
            case 'failed': return 'text-red-400 bg-red-400/10';
            case 'running': return 'text-blue-400 bg-blue-400/10';
            case 'pending': return 'text-amber-400 bg-amber-400/10';
            default: return 'text-slate-400 bg-slate-400/10';
        }
    };

    const getStatusIconColor = (status: string) => {
        switch (String(status).toLowerCase()) {
            case 'passed': return 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.5)]';
            case 'failed': return 'bg-rose-500';
            case 'running': return 'bg-blue-400 shadow-[0_0_8px_rgba(96,165,250,0.5)]';
            default: return 'bg-slate-500';
        }
    };

    // Dynamic Columns Detection
    const dynamicColumns = React.useMemo(() => {
        if (displayTests.length === 0) return [];
        const first = displayTests[0];
        const keys = Object.keys(first);
        const excluded = ['id', 'status', 'assigned_to', 'realized_by', 'lastRun', 'duration', 'name', 'module', 'captures', 'release', 'manual', 'rawDate'];
        return keys.filter(k =>
            !excluded.includes(k) &&
            !k.toLowerCase().includes('titre') &&
            !k.toLowerCase().includes('nom') &&
            k.toLowerCase() !== 'captures'
        );
    }, [displayTests]);

    // Grouping Logic
    const groupedData = React.useMemo(() => {
        if (!groupBy || groupBy === 'none') return null;

        const groups: Record<string, TestItem[]> = {};
        displayTests.forEach(test => {
            const key = groupBy === 'campaign' ? (test.module || 'Sans Campagne')
                : groupBy === 'release' ? (test.release || 'Sans Release')
                    : 'Autres';
            if (!groups[key]) groups[key] = [];
            groups[key].push(test);
        });
        return groups;
    }, [displayTests, groupBy]);

    // Flatten for rendering if grouped, but we need to inject headers.
    // Actually, easier to return Fragment if we weren't inside a <table>.
    // Inside <tbody>, we can simply map groups.

    const renderRow = (test: TestItem, index: number) => {
        return (
            <tr
                key={test.id || index}
                onClick={() => onSelectTest(test)}
                className={`cursor-pointer transition-all duration-300 group ${variant === 'transparent' ? 'hover:bg-white/5 border-b border-white/5' : 'hover:bg-slate-50 dark:hover:bg-slate-700/30'} ${selectedTestId === test.id ? (variant === 'transparent' ? 'bg-blue-600/10' : 'bg-blue-600/5') : ''}`}
            >
                <td className="px-8 py-6">
                    <div className="flex items-center gap-4">
                        <div className="flex items-center gap-3">
                            {canManage && (
                                <button
                                    className="p-2 rounded-xl bg-blue-600/10 text-blue-400 hover:bg-blue-600 hover:text-white transition-all transform active:scale-95 group-hover:scale-110 shadow-lg shadow-blue-600/20"
                                    title="Démarrer l'exécution"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onSelectTest(test);
                                    }}
                                >
                                    <PlayCircle className="w-4 h-4" />
                                </button>
                            )}
                            <div className="flex flex-col gap-1">
                                <span className={`text-base font-bold tracking-tight truncate max-w-[300px] transition-colors ${selectedTestId === test.id ? 'text-blue-400' : 'text-white group-hover:text-blue-400'}`}>
                                    {test.name || 'Test sans nom'}
                                </span>
                                <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest opacity-60 truncate max-w-[300px]">
                                    {test.module}
                                </span>
                            </div>
                        </div>
                    </div>
                </td>
                <td className="px-8 py-6">
                    <div className="flex flex-col gap-1.5">
                        <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-white/5 rounded-xl border border-white/10 group-hover:border-blue-500/30 transition-all w-fit">
                            <Layers className="w-3 h-3 text-blue-500/70" />
                            <span className="text-[10px] font-bold text-slate-300 uppercase tracking-widest">{test.release || 'V1.0'}</span>
                        </div>
                        <div className="flex items-center gap-2 px-2">
                            <span className="text-[8px] font-black text-slate-600 uppercase tracking-widest">{test.businessProject || 'Global'}</span>
                            {test.releaseType && (
                                <span className={`text-[8px] px-1.5 py-0.5 rounded-md font-black uppercase tracking-widest ${test.releaseType === 'PREPROD' ? 'bg-indigo-500/10 text-indigo-400' : 'bg-emerald-500/10 text-emerald-400'}`}>
                                    {test.releaseType}
                                </span>
                            )}
                        </div>
                    </div>
                </td>

                {/* Dynamic Cells */}
                {dynamicColumns.map(col => (
                    <td key={`${test.id}-${col}`} className="px-8 py-6 text-slate-400 text-xs font-medium transition-colors">
                        {String((test as any)[col] || '-')}
                    </td>
                ))}

                {/* Realized By - Conditional */}
                {!isTester && (
                    <td className="px-8 py-6">
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-slate-400 shrink-0">
                                <User className="w-3.5 h-3.5" />
                            </div>
                            <span className="text-xs font-bold text-white tracking-tight">{test.realized_by || '-'}</span>
                        </div>
                    </td>
                )}
                <td className="px-8 py-6">
                    {(test.captures && test.captures.length > 0) ? (
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                const fileUrl = test.captures![0];
                                if (fileUrl) {
                                    window.open(fileUrl, '_blank');
                                }
                            }}
                            className="p-3 bg-white/5 hover:bg-blue-500/10 text-slate-500 hover:text-blue-400 rounded-xl transition-all border border-white/5"
                        >
                            <Eye className="w-4 h-4" />
                        </button>
                    ) : (
                        <span className="text-slate-600 font-bold uppercase tracking-widest text-[9px] opacity-40">AUCUNE</span>
                    )}
                </td>
                <td className="px-8 py-6">
                    <span className={`inline-flex items-center gap-3 px-6 py-2 rounded-2xl text-[10px] font-bold uppercase tracking-widest transition-all ${test.status === 'passed'
                        ? 'bg-emerald-500/5 text-emerald-400 border border-emerald-500/10'
                        : test.status === 'failed'
                            ? 'bg-rose-500/5 text-rose-400 border border-rose-500/10'
                            : 'bg-amber-500/5 text-amber-400 border border-amber-500/10'
                        }`}>
                        <div className={`w-1.5 h-1.5 rounded-full ${getStatusIconColor(test.status)}`} />
                        {test.status}
                    </span>
                </td>
                <td className="px-8 py-6 text-slate-500 font-bold uppercase tracking-widest text-[10px] opacity-70">{test.lastRun}</td>

                {(canManage || canDelete) && (
                    <td className="px-8 py-6 text-right">
                        <div className="flex items-center justify-end gap-2">
                            {canManage && (
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onEditTest?.(test);
                                    }}
                                    className="p-2.5 bg-white/5 text-slate-400 hover:text-blue-400 hover:bg-blue-500/10 rounded-xl border border-white/10 transition-all"
                                    title="Modifier"
                                >
                                    <Pencil className="w-4 h-4" />
                                </button>
                            )}
                            {canDelete && (
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setTestToDelete(test);
                                        setIsDeleteModalOpen(true);
                                    }}
                                    className="p-2.5 bg-white/5 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-xl border border-white/10 transition-all"
                                    title="Supprimer"
                                >
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            )}
                        </div>
                    </td>
                )}
            </tr>
        );
    };

    return (
        <div className={`table-container animate-fade-in overflow-x-auto ${variant === 'transparent' ? '' : 'min-h-[400px]'}`}>
            <table className="w-full text-left">
                <thead className="border-b border-white/5 bg-white/[0.01]">
                    <tr>
                        <th className="px-8 py-6 text-[11px] font-bold text-slate-500 uppercase tracking-[0.2em]">TEST & CAMPAGNE</th>
                        <th className="px-8 py-6 text-[11px] font-bold text-slate-500 uppercase tracking-[0.2em]">RELEASE</th>

                        {/* Dynamic Headers */}
                        {dynamicColumns.map(col => (
                            <th key={col} className="px-8 py-6 text-[11px] font-bold text-slate-500 uppercase tracking-[0.2em]">
                                {col.toUpperCase()}
                            </th>
                        ))}

                        {!isTester && (
                            <th className="px-8 py-6 text-[11px] font-bold text-slate-500 uppercase tracking-[0.2em]">RÉALISÉ PAR</th>
                        )}
                        <th className="px-8 py-6 text-[11px] font-bold text-slate-500 uppercase tracking-[0.2em]">CAPTURES</th>
                        <th className="px-8 py-6 text-[11px] font-bold text-slate-500 uppercase tracking-[0.2em]">STATUT</th>
                        <th className="px-8 py-6 text-[11px] font-bold text-slate-500 uppercase tracking-[0.2em] text-right">
                            {(canManage || canDelete) ? 'ACTIONS' : ''}
                        </th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-200/50 dark:divide-slate-700/50 transition-colors">
                    {groupedData ? (
                        Object.entries(groupedData).map(([groupTitle, groupTests]) => (
                            <React.Fragment key={groupTitle}>
                                <tr className="bg-slate-100 dark:bg-slate-800/50">
                                    <td colSpan={6 + dynamicColumns.length + (isTester ? 0 : 1)} className="px-4 py-2 font-bold text-slate-700 dark:text-slate-200 text-sm border-l-4 border-blue-500">
                                        {groupBy === 'campaign' ? 'Campagne : ' : 'Release : '}
                                        {groupTitle}
                                        <span className="ml-2 text-xs font-normal text-slate-500">({groupTests.length} tests)</span>
                                    </td>
                                </tr>
                                {groupTests.map((test, index) => renderRow(test, index))}
                            </React.Fragment>
                        ))
                    ) : (
                        displayTests.length > 0 ? (
                            displayTests.map((test, index) => renderRow(test, index))
                        ) : (
                            <tr>
                                <td colSpan={6 + dynamicColumns.length + (isTester ? 0 : 1)} className="p-8 text-center text-slate-500 transition-colors">
                                    Aucun test à exécuter. Lancez une campagne depuis le Manager.
                                </td>
                            </tr>
                        )
                    )}
                </tbody>
            </table>

            <ConfirmModal
                isOpen={isDeleteModalOpen}
                title="Supprimer l'exécution"
                message="Voulez-vous vraiment supprimer cette exécution de test ? Cette action est irréversible."
                onConfirm={() => testToDelete && onDeleteTest?.(testToDelete)}
                onCancel={() => setIsDeleteModalOpen(false)}
                confirmText="Supprimer"
                type="danger"
            />
        </div>
    );
};

export default ExecutionTestList;
