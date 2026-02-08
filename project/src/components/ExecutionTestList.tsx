import React from 'react';
import { PlayCircle, CheckCircle, XCircle, Clock, User, Camera, Eye, Pencil, Trash2 } from 'lucide-react';

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
    groupBy?: 'release' | 'campaign' | 'none';
}

const ExecutionTestList: React.FC<ExecutionTestListProps> = ({ tests = [], onSelectTest, selectedTestId, onViewCaptures, onEditTest, onDeleteTest, isTester = false, groupBy = 'none' }) => {
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

    const getStatusIcon = (status: string) => {
        switch (String(status).toLowerCase()) {
            case 'passed': return <CheckCircle className="w-4 h-4" />;
            case 'failed': return <XCircle className="w-4 h-4" />;
            case 'running': return <PlayCircle className="w-4 h-4 animate-spin-slow" />;
            default: return <Clock className="w-4 h-4" />;
        }
    };

    // Dynamic Columns Detection
    const dynamicColumns = React.useMemo(() => {
        if (displayTests.length === 0) return [];
        const first = displayTests[0];
        const keys = Object.keys(first);
        const excluded = ['id', 'status', 'assigned_to', 'realized_by', 'lastRun', 'duration', 'name', 'module', 'captures', 'release', 'manual'];
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
                className={`cursor-pointer transition-colors hover:bg-slate-50 dark:hover:bg-slate-700/30 ${selectedTestId === test.id ? 'bg-blue-600/10 hover:bg-blue-600/20' : ''}`}
            >
                <td className="p-4">
                    <div className="flex items-center gap-3">
                        <button
                            className="p-1.5 rounded-full bg-blue-100 dark:bg-blue-600/10 text-blue-600 dark:text-blue-400 hover:bg-blue-600 hover:text-white dark:hover:bg-blue-600 dark:hover:text-white transition-all group-hover:scale-110"
                            title="Démarrer l'exécution"
                            onClick={(e) => {
                                e.stopPropagation();
                                onSelectTest(test);
                            }}
                        >
                            <PlayCircle className="w-4 h-4" />
                        </button>
                        <div>
                            <span className={`font-medium block ${selectedTestId === test.id ? 'text-blue-600 dark:text-blue-400' : 'text-slate-900 dark:text-slate-200'} transition-colors`}>
                                {test.name || (test as any).Titre || (test as any).NOM || (test as any).Nom || (test as any)['Nom du test'] || 'Test sans nom'}
                            </span>
                        </div>
                    </div>
                </td>

                <td className="p-4 text-slate-600 dark:text-slate-400 text-sm transition-colors">
                    {test.module || '-'}
                </td>
                <td className="p-4 text-slate-600 dark:text-slate-400 text-sm transition-colors">
                    {test.release || '-'}
                </td>

                {/* Dynamic Cells */}
                {dynamicColumns.map(col => (
                    <td key={`${test.id}-${col}`} className="p-4 text-slate-600 dark:text-slate-400 text-sm transition-colors">
                        {String((test as any)[col] || '-')}
                    </td>
                ))}

                {/* Realized By - Conditional */}
                {!isTester && (
                    <td className="p-4">
                        <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300 text-sm transition-colors">
                            {test.realized_by && test.realized_by !== 'Non assigné' ? (
                                <>
                                    <div className="w-6 h-6 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center transition-colors">
                                        <User className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                                    </div>
                                    {test.realized_by}
                                </>
                            ) : (
                                <span className="text-slate-400 italic text-xs">-</span>
                            )}
                        </div>
                    </td>
                )}
                <td className="p-4">
                    {(test.captures && test.captures.length > 0) ? (
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                const fileUrl = test.captures![0];
                                if (fileUrl) {
                                    window.open(fileUrl, '_blank');
                                }
                            }}
                            className="flex items-center justify-center w-8 h-8 text-blue-600 dark:text-blue-400 bg-blue-100 dark:bg-blue-500/10 hover:bg-blue-200 dark:hover:bg-blue-500/20 border border-blue-200 dark:border-blue-500/30 rounded-full transition-colors group/eye"
                            title="Voir le fichier"
                        >
                            <Eye className="w-4 h-4" />
                        </button>
                    ) : (
                        <span className="text-slate-500 dark:text-slate-600 text-xs transition-colors">-</span>
                    )}
                </td>
                <td className="p-4">
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${getStatusColor((test as any).status)}`}>
                        {getStatusIcon((test as any).status)}
                        <span className="capitalize">{(test as any).status || 'pending'}</span>
                    </span>
                </td>
                <td className="p-4 text-slate-600 dark:text-slate-400 text-sm transition-colors">{(test as any).lastRun || 'Jamais'}</td>

                {/* Actions Column */}
                <td className="p-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                onEditTest?.(test);
                            }}
                            className="p-1.5 text-slate-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-500/10 rounded-lg transition-colors"
                            title="Modifier"
                        >
                            <Pencil className="w-4 h-4" />
                        </button>
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                if (window.confirm('Voulez-vous vraiment supprimer cette exécution ?')) {
                                    onDeleteTest?.(test);
                                }
                            }}
                            className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg transition-colors"
                            title="Supprimer"
                        >
                            <Trash2 className="w-4 h-4" />
                        </button>
                    </div>
                </td>
            </tr>
        );
    };

    return (
        <div className="glass-panel rounded-xl overflow-hidden animate-fade-in">
            <div className="overflow-x-auto">
                <table className="w-full text-left">
                    <thead>
                        <tr className="border-b border-slate-200/50 dark:border-slate-700/50 bg-slate-50/80 dark:bg-slate-800/80 transition-colors">
                            <th className="p-4 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider transition-colors">Test</th>

                            {/* Hide Campaign/Release columns if grouped by them? Optional. Let's keep them for now. */}
                            <th className="p-4 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider transition-colors">Campagne</th>
                            <th className="p-4 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider transition-colors">Release</th>

                            {/* Dynamic Headers */}
                            {dynamicColumns.map(col => (
                                <th key={col} className="p-4 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider transition-colors">
                                    {col}
                                </th>
                            ))}

                            {!isTester && (
                                <th className="p-4 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider transition-colors">Réalisé par</th>
                            )}
                            <th className="p-4 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider transition-colors">Captures</th>
                            <th className="p-4 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider transition-colors">Statut</th>
                            <th className="p-4 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider transition-colors">Dernière Exécution</th>
                            <th className="p-4 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider transition-colors text-right">Actions</th>
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
            </div>
        </div>
    );
};

export default ExecutionTestList;
