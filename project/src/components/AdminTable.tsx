import React from 'react';
import { Loader, Search, Filter } from 'lucide-react';

interface Column<T> {
    header: string;
    accessor: keyof T | ((item: T) => React.ReactNode);
    className?: string;
}

interface AdminTableProps<T> {
    title?: string;
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
    onRowClick?: (item: T) => void;
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
    filters,
    onRowClick
}: AdminTableProps<T>) => {
    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
                {title && (
                    <div className="space-y-1">
                        <h2 className="text-2xl font-bold text-white tracking-tight">
                            {title}
                        </h2>
                        <p className="text-slate-500 text-sm">
                            {addButtonLabel ? `Gestion et audit des ${title.toLowerCase()}` : "Vue d'ensemble et gestion des données"}
                        </p>
                    </div>
                )}
                {onAdd && (
                    <button
                        onClick={onAdd}
                        className="group flex items-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white px-8 py-3.5 rounded-2xl transition-all shadow-xl shadow-blue-900/30 active:scale-95 font-bold text-xs tracking-tight"
                    >
                        {addButtonLabel || 'Ajouter'}
                    </button>
                )}
            </div>

            {/* Search and Filter Bar - Glassmorphism */}
            {(searchable || filters) && (
                <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-[2.5rem] p-6 flex flex-col md:flex-row items-center gap-6 shadow-2xl">
                    {searchable && (
                        <div className="relative flex-1 w-full group">
                            <Search className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500 group-focus-within:text-blue-500 transition-colors" />
                            <input
                                type="text"
                                placeholder="Rechercher..."
                                className="w-full bg-white/5 border border-white/10 rounded-[1.5rem] pl-16 pr-8 py-4 text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all font-medium placeholder-slate-500"
                                onChange={(e) => onSearch && onSearch(e.target.value)}
                            />
                        </div>
                    )}
                    {filters && (
                        <div className="flex items-center gap-4 w-full md:w-auto">
                            <div className="flex items-center gap-3 bg-white/5 p-2 rounded-[1.5rem] border border-white/5 pr-4">
                                <div className="p-2 bg-blue-500/10 rounded-full border border-blue-500/20">
                                    <Filter className="w-4 h-4 text-blue-500" />
                                </div>
                                {filters}
                            </div>
                        </div>
                    )}
                </div>
            )}

            <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-[3rem] overflow-hidden shadow-2xl transition-all hover:shadow-blue-900/10">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="border-b border-white/5 bg-white/[0.01]">
                            {columns.map((col, idx) => (
                                <th
                                    key={idx}
                                    className={`px-8 py-5 text-[10px] font-bold text-slate-500 uppercase tracking-widest ${col.className || ''}`}
                                >
                                    {col.header}
                                </th>
                            ))}
                            {actions && (
                                <th className="px-8 py-5 text-[10px] font-bold text-slate-500 uppercase tracking-widest text-right">
                                    Actions
                                </th>
                            )}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                        {isLoading ? (
                            Array.from({ length: 5 }).map((_, i) => (
                                <tr key={i} className="animate-pulse">
                                    {columns.map((_, idx) => (
                                        <td key={idx} className="px-6 py-4">
                                            <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded-full w-full" />
                                        </td>
                                    ))}
                                    {actions && (
                                        <td className="px-6 py-4">
                                            <div className="h-8 bg-slate-200 dark:bg-slate-700 rounded-lg w-20 ml-auto" />
                                        </td>
                                    )}
                                </tr>
                            ))
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
                                    onClick={() => onRowClick && onRowClick(item)}
                                    className={`hover:bg-white/[0.04] transition-all duration-300 group border-b border-white/5 last:border-0 ${onRowClick ? 'cursor-pointer' : ''}`}
                                >
                                    {columns.map((col, colIdx) => (
                                        <td key={colIdx} className="px-8 py-5 text-sm text-slate-300 group-hover:text-white transition-colors">
                                            {typeof col.accessor === 'function'
                                                ? col.accessor(item)
                                                : (item[col.accessor] as React.ReactNode)}
                                        </td>
                                    ))}
                                    {actions && (
                                        <td className="px-8 py-5 text-right">
                                            <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-all duration-300 translate-x-4 group-hover:translate-x-0">
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
    );
};

export default AdminTable;
