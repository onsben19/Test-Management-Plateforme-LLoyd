import React from 'react';
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';

interface PaginationProps {
    currentPage: number;
    totalItems: number;
    pageSize: number;
    onPageChange: (page: number) => void;
    loading?: boolean;
}

const Pagination: React.FC<PaginationProps> = ({
    currentPage,
    totalItems,
    pageSize,
    onPageChange,
    loading = false
}) => {
    const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));

    if (totalItems === 0) return null;

    const canPrevious = currentPage > 1;
    const canNext = currentPage < totalPages;

    const renderPageButtons = () => {
        const buttons: React.ReactNode[] = [];
        const maxVisible = 5;
        let start = Math.max(1, currentPage - Math.floor(maxVisible / 2));
        let end = Math.min(totalPages, start + maxVisible - 1);

        if (end - start + 1 < maxVisible) {
            start = Math.max(1, end - maxVisible + 1);
        }

        for (let i = start; i <= end; i++) {
            buttons.push(
                <button
                    key={i}
                    onClick={() => onPageChange(i)}
                    disabled={loading}
                    className={`min-w-[32px] h-8 flex items-center justify-center rounded-md border transition-all text-xs font-bold
                        ${currentPage === i
                            ? 'bg-blue-600 border-blue-600 text-white shadow-lg shadow-blue-500/20'
                            : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-blue-500 hover:text-blue-600 dark:hover:text-blue-400'
                        } disabled:opacity-50`}
                >
                    {i}
                </button>
            );
        }
        return buttons;
    };

    return (
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 py-6 px-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="text-[11px] text-slate-500 dark:text-slate-400 font-bold tracking-wider uppercase bg-slate-100 dark:bg-slate-800/50 px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700/50 whitespace-nowrap">
                Affichage de <span className="text-slate-900 dark:text-white">{(currentPage - 1) * pageSize + 1}</span> à <span className="text-slate-900 dark:text-white">{Math.min(currentPage * pageSize, totalItems)}</span> sur <span className="text-slate-900 dark:text-white">{totalItems}</span> résultats
            </div>

            <div className="flex items-center gap-2">
                <div className="flex items-center bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-1 shadow-sm transition-all hover:shadow-md">
                    <button
                        onClick={() => onPageChange(1)}
                        disabled={!canPrevious || loading}
                        className="p-1.5 text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 disabled:opacity-0 transition-all rounded-md"
                        title="Première page"
                    >
                        <ChevronsLeft className="w-4 h-4" />
                    </button>
                    <button
                        onClick={() => onPageChange(currentPage - 1)}
                        disabled={!canPrevious || loading}
                        className="p-1.5 text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 disabled:opacity-0 transition-all rounded-md"
                        title="Précédent"
                    >
                        <ChevronLeft className="w-4 h-4" />
                    </button>

                    <div className="flex items-center gap-1 mx-1">
                        {renderPageButtons()}
                    </div>

                    <button
                        onClick={() => onPageChange(currentPage + 1)}
                        disabled={!canNext || loading}
                        className="p-1.5 text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 disabled:opacity-0 transition-all rounded-md"
                        title="Suivant"
                    >
                        <ChevronRight className="w-4 h-4" />
                    </button>
                    <button
                        onClick={() => onPageChange(totalPages)}
                        disabled={!canNext || loading}
                        className="p-1.5 text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 disabled:opacity-0 transition-all rounded-md"
                        title="Dernière page"
                    >
                        <ChevronsRight className="w-4 h-4" />
                    </button>
                </div>
            </div>
        </div>
    );
};

export default Pagination;
