import React from 'react';
import { Loader, Search, Filter } from 'lucide-react';

interface Column<T> {
    header: string;
    accessor: keyof T | ((item: T) => React.ReactNode);
    className?: string;
}

interface AdminTableProps<T> {
    title: string;
    columns: Column<T>[];
    data: T[];
    isLoading?: boolean;
    actions?: (item: T) => React.ReactNode;
    onAdd?: () => void;
    addButtonLabel?: string;
    // New props for Search & Filter
    searchable?: boolean;
    onSearch?: (query: string) => void;
    filters?: React.ReactNode;
}

const AdminTable = <T extends { id?: string | number }>({
    title,
    columns,
    data,
    isLoading = false,
    actions,
    onAdd,
    addButtonLabel,
    searchable,
    onSearch,
    filters
}: AdminTableProps<T>) => {
    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight transition-colors">
                        {title}
                    </h2>
                    <p className="text-slate-500 dark:text-slate-400 text-sm transition-colors">
                        Vue d'ensemble et gestion des données
                    </p>
                </div>
                {onAdd && (
                    <button
                        onClick={onAdd}
                        className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors shadow-lg shadow-blue-500/20 dark:shadow-blue-900/20"
                    >
                        {addButtonLabel || 'Ajouter'}
                    </button>
                )}
            </div>

            {/* Search and Filter Bar */}
            {(searchable || filters) && (
                <div className="flex flex-col md:flex-row gap-4">
                    {searchable && (
                        <div className="relative flex-1">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                            <input
                                type="text"
                                placeholder="Rechercher..."
                                className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg pl-10 pr-4 py-2 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none transition-all placeholder:text-slate-400"
                                onChange={(e) => onSearch && onSearch(e.target.value)}
                            />
                        </div>
                    )}
                    {filters && (
                        <div className="flex items-center gap-2">
                            <div className="p-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg transition-colors">
                                <Filter className="w-4 h-4 text-slate-500 dark:text-slate-400 transition-colors" />
                            </div>
                            {filters}
                        </div>
                    )}
                </div>
            )}

            <div className="glass-panel rounded-xl overflow-hidden animate-fade-in shadow-sm dark:shadow-xl">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="border-b border-slate-200 dark:border-slate-700/50 bg-slate-50/80 dark:bg-slate-800/80 transition-colors">
                                {columns.map((col, idx) => (
                                    <th
                                        key={idx}
                                        className={`px-6 py-4 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider transition-colors ${col.className || ''}`}
                                    >
                                        {col.header}
                                    </th>
                                ))}
                                {actions && (
                                    <th className="px-6 py-4 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider text-right transition-colors">
                                        Actions
                                    </th>
                                )}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200 dark:divide-slate-700/30 transition-colors">
                            {isLoading ? (
                                <tr>
                                    <td colSpan={columns.length + (actions ? 1 : 0)} className="px-6 py-12 text-center">
                                        <div className="flex items-center justify-center gap-2 text-slate-400">
                                            <Loader className="w-5 h-5 animate-spin text-blue-500" />
                                            <span>Chargement des données...</span>
                                        </div>
                                    </td>
                                </tr>
                            ) : data.length === 0 ? (
                                <tr>
                                    <td colSpan={columns.length + (actions ? 1 : 0)} className="px-6 py-12 text-center text-slate-500 transition-colors">
                                        Aucune donnée disponible.
                                    </td>
                                </tr>
                            ) : (
                                data.map((item, rowIdx) => (
                                    <tr
                                        key={item.id || rowIdx}
                                        className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors group"
                                    >
                                        {columns.map((col, colIdx) => (
                                            <td key={colIdx} className="px-6 py-4 text-sm text-slate-600 dark:text-slate-300 transition-colors">
                                                {typeof col.accessor === 'function'
                                                    ? col.accessor(item)
                                                    : (item[col.accessor] as React.ReactNode)}
                                            </td>
                                        ))}
                                        {actions && (
                                            <td className="px-6 py-4 text-right">
                                                <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    {actions(item)}
                                                </div>
                                            </td>
                                        )}
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default AdminTable;
