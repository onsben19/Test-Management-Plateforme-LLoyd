import React from 'react';
import { PlayCircle, CheckCircle, XCircle, Clock, User, Camera, Eye, Pencil, Trash2, Layers, Sparkles } from 'lucide-react';
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
    execution_logs?: string;
}


interface ExecutionTestListProps {
    tests?: TestItem[];
    onSelectTest: (test: TestItem) => void;
    selectedTestId?: string;
    onViewCaptures?: (test: TestItem) => void;
    onEditTest?: (test: TestItem) => void;
    onDeleteTest?: (test: TestItem) => void;
    onAutomateTest?: (test: TestItem) => void;
    isTester?: boolean;
    canManage?: boolean;
    canDelete?: boolean;
    groupBy?: 'release' | 'campaign' | 'project' | 'none';
    variant?: 'default' | 'transparent';
}

const ExecutionTestList: React.FC<ExecutionTestListProps> = ({
    tests = [],
    onSelectTest,
    selectedTestId,
    onViewCaptures,
    onEditTest,
    onDeleteTest,
    onAutomateTest,
    isTester = false,
    canManage = true,
    canDelete = true,
    groupBy = 'none',
    variant = 'default'
}) => {
    const [isDeleteModalOpen, setIsDeleteModalOpen] = React.useState(false);
    const [testToDelete, setTestToDelete] = React.useState<TestItem | null>(null);
    const [logModal, setLogModal] = React.useState<{ title: string; content: string } | null>(null);

    // Fallback if no tests provided
    const displayTests = tests.length > 0 ? tests : [];

    // Generic Status Logic
    const getStatusColor = (status: string) => {
        switch (String(status).toLowerCase()) {
            case 'passed': return 'text-blue-400 bg-blue-400/10';
            case 'failed': return 'text-red-400 bg-red-400/10';
            case 'running': return 'text-blue-400 bg-blue-400/10';
            case 'pending': return 'text-amber-400 bg-amber-400/10';
            default: return 'text-slate-400 bg-slate-400/10';
        }
    };

    const getStatusIconColor = (status: string) => {
        switch (String(status).toLowerCase()) {
            case 'passed': return 'bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.5)]';
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
        const excluded = ['id', 'status', 'assigned_to', 'realized_by', 'lastRun', 'duration', 'name', 'module', 'captures', 'release', 'manual', 'rawDate', 'businessProject', 'releaseType'];
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
                    : groupBy === 'project' ? (test.businessProject || 'Global')
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
                className={`cursor-pointer transition-all duration-300 group ${variant === 'transparent' ? 'hover:bg-slate-100 dark:bg-white/5 border-b border-slate-200 dark:border-white/5' : 'hover:bg-slate-50 dark:hover:bg-slate-700/30'} ${selectedTestId === test.id ? (variant === 'transparent' ? 'bg-blue-600/10' : 'bg-blue-600/5') : ''}`}
            >
                <td className="px-8 py-6">
                    <div className="flex items-center gap-4">
                        <div className="flex items-center gap-3">
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
                        <span className="text-[11px] font-black text-slate-900 dark:text-white uppercase tracking-widest">{test.businessProject || 'GLOBAL'}</span>
                        <div className="flex items-center gap-2 text-slate-500">
                            <span className="text-[10px] font-bold uppercase tracking-widest">{test.release || 'V1.0'}</span>
                            {test.releaseType && (
                                <span className={`text-[8px] px-1.5 py-0.5 rounded-md font-black uppercase tracking-widest ${test.releaseType === 'PREPROD' ? 'bg-indigo-500/10 text-indigo-400' : 'bg-emerald-500/10 text-emerald-400'}`}>
                                    {test.releaseType}
                                </span>
                            )}
                        </div>
                    </div>
                </td>

                {/* Dynamic Cells — texte long tronqué avec bouton Voir */}
                {dynamicColumns.map(col => {
                    const raw = (test as any)[col];
                    const value = raw != null ? String(raw) : '-';
                    const isLong = value.length > 80;
                    return (
                        <td key={`${test.id}-${col}`} className="px-8 py-6 text-slate-400 text-xs font-medium max-w-[200px]">
                            {isLong ? (
                                <div className="flex flex-col gap-1">
                                    <span className="truncate block text-slate-400">{value.slice(0, 60)}…</span>
                                    <button
                                        onClick={(e) => { e.stopPropagation(); setLogModal({ title: col.toUpperCase(), content: value }); }}
                                        className="text-blue-400 hover:text-blue-300 text-[10px] font-bold uppercase tracking-widest text-left transition-colors"
                                    >
                                        Lire la suite →
                                    </button>
                                </div>
                            ) : (
                                <span>{value}</span>
                            )}
                        </td>
                    );
                })}

                {/* Realized By - Conditional */}
                {!isTester && (
                    <td className="px-8 py-6">
                        <div className="flex items-center gap-3">
                            <span className="text-xs font-bold text-slate-900 dark:text-white tracking-tight">{test.realized_by || '-'}</span>
                        </div>
                    </td>
                )}
                <td className="px-8 py-6">
                    {(test.captures && test.captures.length > 0) ? (
                        <div className="flex items-center gap-1.5">
                            {test.captures.slice(0, 3).map((url, i) => (
                                <button
                                    key={i}
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setLogModal({ title: `Capture ${i + 1} — ${test.name}`, content: `__IMAGE__${url}` });
                                    }}
                                    className="relative group/cap"
                                    title={`Voir capture ${i + 1}`}
                                >
                                    <img
                                        src={url}
                                        alt={`Capture ${i + 1}`}
                                        className="w-10 h-10 object-cover rounded-lg border border-slate-300 dark:border-white/10 group-hover/cap:border-blue-400/60 group-hover/cap:scale-110 transition-all duration-200"
                                    />
                                    <div className="absolute inset-0 bg-blue-400/0 group-hover/cap:bg-blue-400/10 rounded-lg transition-all" />
                                </button>
                            ))}
                            {test.captures.length > 3 && (
                                <span className="text-[9px] text-slate-500 font-bold">+{test.captures.length - 3}</span>
                            )}
                        </div>
                    ) : (
                        <span className="text-slate-600 font-bold uppercase tracking-widest text-[9px] opacity-40">AUCUNE</span>
                    )}
                </td>
                <td className="px-8 py-6">
                    <span className={`inline-flex items-center gap-3 px-6 py-2 rounded-2xl text-[10px] font-bold uppercase tracking-widest transition-all ${test.status === 'passed'
                        ? 'bg-blue-500/5 text-blue-400 border border-blue-500/10'
                        : test.status === 'failed'
                            ? 'bg-rose-500/5 text-rose-400 border border-rose-500/10'
                            : 'bg-amber-500/5 text-amber-400 border border-amber-500/10'
                        }`}>
                        <div className={`w-1.5 h-1.5 rounded-full ${getStatusIconColor(test.status)}`} />
                        {test.status}
                    </span>
                </td>
                <td className="px-8 py-6 whitespace-nowrap">
                    <div className="flex flex-col gap-0.5">
                        <span className="text-slate-700 dark:text-slate-300 text-[10px] font-bold tracking-tight">{test.lastRun.split(' ')[0]}</span>
                        <span className="text-slate-500 text-[9px] font-bold uppercase tracking-widest opacity-60 italic">{test.lastRun.split(' ')[1]}</span>
                    </div>
                </td>

                {canDelete && (
                    <td className="px-8 py-6 text-right">
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                setTestToDelete(test);
                                setIsDeleteModalOpen(true);
                            }}
                            className="text-slate-400 hover:text-rose-400 transition-all"
                            title="Supprimer"
                        >
                            <Trash2 className="w-4 h-4" />
                        </button>
                    </td>
                )}
            </tr>
        );
    };

    return (
        <div className={`table-container animate-fade-in overflow-x-auto ${variant === 'transparent' ? '' : 'min-h-[400px]'}`}>
            <table className="w-full text-left">
                <thead className="border-b border-slate-200 dark:border-white/5 bg-slate-50 dark:bg-white/[0.01]">
                    <tr>
                        <th className="px-8 py-6 text-[11px] font-bold text-slate-500 uppercase tracking-[0.2em]">TEST & CAMPAGNE</th>
                        <th className="px-8 py-6 text-[11px] font-bold text-slate-500 uppercase tracking-[0.2em]">PROJET & RELEASE</th>

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
                        <th className="px-8 py-6 text-[11px] font-bold text-slate-500 uppercase tracking-[0.2em]">DATE</th>
                        <th className="px-8 py-6 text-[11px] font-bold text-slate-500 uppercase tracking-[0.2em] text-right">
                            {(canManage || canDelete || onAutomateTest) ? 'ACTIONS' : ''}
                        </th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-200/50 dark:divide-slate-700/50 transition-colors">
                    {groupedData ? (
                        Object.entries(groupedData).map(([groupTitle, groupTests]) => (
                            <React.Fragment key={groupTitle}>
                                <tr className="bg-slate-100 dark:bg-slate-800/50">
                                    <td colSpan={6 + dynamicColumns.length + (isTester ? 0 : 1)} className="px-4 py-2 font-bold text-slate-700 dark:text-slate-200 text-sm border-l-4 border-blue-500">
                                        {groupBy === 'campaign' ? 'Campagne : ' : groupBy === 'release' ? 'Release : ' : 'Projet : '}
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

            {/* Modale texte long (logs, scripts) ou image (captures) */}
            {logModal && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm"
                    onClick={() => setLogModal(null)}
                >
                    <div
                        className="relative bg-slate-900 border border-slate-300 dark:border-white/10 rounded-2xl shadow-2xl w-full max-w-3xl mx-4 flex flex-col max-h-[85vh]"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-300 dark:border-white/10 flex-shrink-0">
                            <span className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-widest">{logModal.title}</span>
                            <div className="flex items-center gap-3">
                                {/* Bouton download — uniquement pour le texte (pas les images) */}
                                {!logModal.content.startsWith('__IMAGE__') && (
                                    <a
                                        href={`data:text/plain;charset=utf-8,${encodeURIComponent(logModal.content)}`}
                                        download={
                                            logModal.title.toLowerCase().includes('automation') || logModal.title.toLowerCase().includes('script')
                                                ? `script_${Date.now()}.spec.ts`
                                                : `logs_${Date.now()}.txt`
                                        }
                                        className="text-[10px] font-black uppercase tracking-widest text-blue-400 hover:text-blue-300 transition-colors px-3 py-1.5 bg-blue-500/10 rounded-lg border border-blue-500/20 hover:bg-blue-500/20"
                                    >
                                        ↓ Télécharger
                                    </a>
                                )}
                                <button
                                    onClick={() => setLogModal(null)}
                                    className="text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors text-xl font-bold"
                                >✕</button>
                            </div>
                        </div>
                        {logModal.content.startsWith('__IMAGE__') ? (
                            // Affichage image
                            <div className="overflow-auto flex-1 flex items-center justify-center p-4">
                                <img
                                    src={logModal.content.replace('__IMAGE__', '')}
                                    alt={logModal.title}
                                    className="max-w-full max-h-full object-contain rounded-xl border border-slate-300 dark:border-white/10"
                                />
                            </div>
                        ) : (
                            // Affichage texte/logs/script
                            <pre className="overflow-auto p-6 text-xs text-slate-700 dark:text-slate-300 font-mono leading-relaxed whitespace-pre-wrap break-words flex-1">
                                {logModal.title.toLowerCase().includes('automation') || logModal.title.toLowerCase().includes('script') ? (
                                    <span dangerouslySetInnerHTML={{ __html: 
                                        logModal.content
                                        .replace(/</g, '&lt;').replace(/>/g, '&gt;')
                                        .replace(/\b(import|from|const|let|var|await|async|function|return|if|else|for|while|try|catch)\b/g, '<span class=text-pink-400>$1</span>')
                                        .replace(/\b(test|expect|page|locator|click|fill|goto|toBeVisible|toContainText|first|catch|timeout|Promise|all)\b/g, '<span class=text-blue-400>$1</span>')
                                        .replace(/(['"`])(.*?)\1/g, '<span class=text-emerald-400>$&</span>')
                                        .replace(/([{}()\[\]])/g, '<span class=text-amber-400>$1</span>')
                                        .replace(/(?<!-)\b(\d+)\b/g, '<span class=text-purple-400>$1</span>')
                                    }} />
                                ) : (
                                    logModal.content
                                )}
                            </pre>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default ExecutionTestList;
