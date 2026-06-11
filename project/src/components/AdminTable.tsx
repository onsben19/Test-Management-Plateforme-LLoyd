import React from 'react';

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
                        <h2 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
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
                <div className="bg-slate-100 dark:bg-white/5 backdrop-blur-xl border border-slate-300 dark:border-white/10 rounded-[2.5rem] p-6 flex flex-col md:flex-row items-center gap-6 shadow-2xl">
                    {searchable && (
                        <div className="relative flex-1 w-full group">
                            <input
                                type="text"
                                placeholder="Rechercher..."
                                className="w-full bg-slate-100 dark:bg-white/5 border border-slate-300 dark:border-white/10 rounded-[1.5rem] px-8 py-4 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all font-medium placeholder-slate-500"
                                onChange={(e) => onSearch && onSearch(e.target.value)}
                            />
                        </div>
                    )}
                    {filters && (
                        <div className="flex items-center gap-4 w-full md:w-auto">
                            <div className="flex items-center gap-3 bg-slate-100 dark:bg-white/5 p-2 rounded-[1.5rem] border border-slate-200 dark:border-white/5">
                                {filters}
                            </div>
                        </div>
                    )}
                </div>
            )}

            <div className="">
                <table className="w-full text-left border-separate border-spacing-y-3">
                    <thead>
                        <tr className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                            {columns.map((col, idx) => (
                                <th
                                    key={idx}
                                    className={`px-8 py-2 ${col.className || ''}`}
                                >
                                    {col.header}
                                </th>
                            ))}
                            {actions && (
                                <th className="px-8 py-2 text-right">
                                    Actions
                                </th>
                            )}
                        </tr>
                    </thead>
                    <tbody>
                        {isLoading ? (
                            Array.from({ length: 5 }).map((_, i) => (
                                <tr key={i} className="animate-pulse">
                                    {columns.map((_, idx) => (
                                        <td key={idx} className="px-8 py-5 bg-slate-50 dark:bg-[#0b0e14]/40 first:rounded-l-2xl last:rounded-r-2xl border-t border-b first:border-l last:border-r border-slate-200 dark:border-white/[0.02]">
                                            <div className="h-4 bg-slate-700/50 rounded-full w-full" />
                                        </td>
                                    ))}
                                    {actions && (
                                        <td className="px-8 py-5 bg-slate-50 dark:bg-[#0b0e14]/40 first:rounded-l-2xl last:rounded-r-2xl border-t border-b first:border-l last:border-r border-slate-200 dark:border-white/[0.02]">
                                            <div className="h-8 bg-slate-700/50 rounded-lg w-20 ml-auto" />
                                        </td>
                                    )}
                                </tr>
                            ))
                        ) : data.length === 0 ? (
                            <tr>
                                <td colSpan={columns.length + (actions ? 1 : 0)} className="px-8 py-12 text-center text-slate-500 bg-slate-50 dark:bg-[#0b0e14]/40 rounded-2xl border border-slate-200 dark:border-white/[0.02]">
                                    Aucune donnée disponible.
                                </td>
                            </tr>
                        ) : (
                            data.map((item, rowIdx) => (
                                <tr
                                    key={item.id || rowIdx}
                                    onClick={() => onRowClick && onRowClick(item)}
                                    className={`group transition-all duration-300 ${onRowClick ? 'cursor-pointer' : ''}`}
                                >
                                    {columns.map((col, colIdx) => (
                                        <td
                                            key={colIdx}
                                            className="px-8 py-5 text-sm text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-[#0b0e14]/60 group-hover:bg-slate-100 dark:group-hover:bg-white/5 transition-colors first:rounded-l-2xl last:rounded-r-2xl border-t border-b first:border-l last:border-r border-slate-200 dark:border-white/[0.03] group-hover:border-slate-300 dark:group-hover:border-white/10"
                                        >
                                            {typeof col.accessor === 'function'
                                                ? col.accessor(item)
                                                : (item[col.accessor] as React.ReactNode)}
                                        </td>
                                    ))}
                                    {actions && (
                                        <td className="px-8 py-5 text-right bg-slate-50 dark:bg-[#0b0e14]/60 group-hover:bg-slate-100 dark:group-hover:bg-white/5 transition-colors first:rounded-l-2xl last:rounded-r-2xl border-t border-b first:border-l last:border-r border-slate-200 dark:border-white/[0.03] group-hover:border-slate-300 dark:group-hover:border-white/10">
                                            <div className="flex justify-end gap-2">
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
