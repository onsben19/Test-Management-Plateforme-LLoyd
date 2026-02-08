import React, { useState } from 'react';
import { MessageSquare, AlertTriangle, CheckCircle, ArrowUpDown } from 'lucide-react';

interface DataRow {
    id: string;
    [key: string]: any;
}

interface DataGridProps {
    data: DataRow[];
    columns: string[];
    onRowUpdate: (id: string, field: string, value: string) => void;
    onOpenChat: (row: DataRow) => void;
    highlightedRows?: string[];
}

const DataGrid: React.FC<DataGridProps> = ({ data, columns, onRowUpdate, onOpenChat, highlightedRows = [] }) => {
    const [editingCell, setEditingCell] = useState<{ id: string, field: string } | null>(null);

    const isComplete = (row: DataRow) => {
        return columns.every(col => row[col] && (typeof row[col] === 'string' ? row[col].trim() !== '' : true));
    };

    const getSeverityColor = (value: string) => {
        const v = String(value).toLowerCase();
        if (v.includes('critique') || v.includes('critical')) return 'bg-red-500/20 text-red-400 border-red-500/50';
        if (v.includes('majeur') || v.includes('major')) return 'bg-orange-500/20 text-orange-400 border-orange-500/50';
        return 'bg-blue-500/20 text-blue-400 border-blue-500/50';
    };

    return (
        <div className="bg-slate-900 border border-slate-700/50 rounded-lg overflow-hidden flex flex-col h-full w-full shadow-lg">
            <div className="flex-1 overflow-auto scrollbar-thumb-slate-700 scrollbar-track-slate-800 scrollbar-thumb-rounded-full hover:scrollbar-thumb-slate-600 transition-colors">
                <table className="min-w-max w-full text-left border-collapse">
                    <thead className="bg-slate-800/80 sticky top-0 z-10 backdrop-blur-sm">
                        <tr>
                            <th className="p-3 w-16 border-b border-r border-slate-700 font-semibold text-slate-400 text-xs text-center sticky left-0 bg-slate-800 z-20">
                                IA
                            </th>
                            {columns.map(col => (
                                <th
                                    key={col}
                                    className="p-3 min-w-[200px] border-b border-r border-slate-700 font-semibold text-slate-400 text-xs uppercase tracking-wider group cursor-pointer hover:bg-slate-700/50 transition-colors"
                                >
                                    <div className="flex items-center justify-between">
                                        {col}
                                        <ArrowUpDown className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                                    </div>
                                </th>
                            ))}
                            <th className="p-3 w-16 border-b border-slate-700 font-semibold text-slate-400 text-xs text-center bg-slate-800 sticky right-0 z-20">
                                Actions
                            </th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800">
                        {data.map((row, rowIndex) => (
                            <tr
                                key={row.id}
                                className={`transition-colors group ${highlightedRows.includes(row.id)
                                    ? 'bg-yellow-500/10 hover:bg-yellow-500/20'
                                    : 'hover:bg-slate-800/30'
                                    }`}
                            >
                                {/* AI Analysis Column */}
                                <td className="p-3 border-r border-slate-800 text-center sticky left-0 bg-slate-900 group-hover:bg-[#131d33] transition-colors">
                                    {isComplete(row) ? (
                                        <div className="flex justify-center">
                                            <CheckCircle className="w-4 h-4 text-green-500/50" />
                                        </div>
                                    ) : (
                                        <div className="flex justify-center" title="Données manquantes">
                                            <AlertTriangle className="w-4 h-4 text-orange-500 animate-pulse" />
                                        </div>
                                    )}
                                </td>

                                {/* Dynamic Content Columns */}
                                {columns.map(col => {
                                    const isSeverity = col.toLowerCase().includes('sévérité') || col.toLowerCase().includes('severity');
                                    const isLastModified = col.toLowerCase().includes('dernière modification') || col.toLowerCase().includes('last modified');
                                    const isEditing = editingCell?.id === row.id && editingCell?.field === col;
                                    const cellValue = row[col];

                                    return (
                                        <td
                                            key={`${row.id}-${col}`}
                                            className="p-1 border-r border-slate-800 relative min-w-[200px]"
                                        >
                                            {isLastModified && typeof cellValue === 'object' ? (
                                                <div className="flex items-center gap-3 p-2">
                                                    <img
                                                        src={cellValue.avatar}
                                                        alt={cellValue.name}
                                                        className="w-8 h-8 rounded-full border border-slate-600 object-cover flex-shrink-0"
                                                    />
                                                    <span className="text-sm text-slate-300 whitespace-nowrap">{cellValue.name}</span>
                                                </div>
                                            ) : isEditing ? (
                                                <textarea
                                                    autoFocus
                                                    className="w-full h-full min-h-[40px] bg-slate-800 text-white text-sm p-2 focus:outline-none focus:ring-2 focus:ring-blue-500 rounded resize-none"
                                                    value={String(cellValue)}
                                                    onChange={(e) => onRowUpdate(row.id, col, e.target.value)}
                                                    onBlur={() => setEditingCell(null)}
                                                />
                                            ) : (
                                                <div
                                                    className="w-full h-full min-h-[40px] p-2 cursor-text flex items-center"
                                                    onClick={() => !isLastModified && setEditingCell({ id: row.id, field: col })}
                                                >
                                                    {isSeverity ? (
                                                        <span onClick={(e) => { e.stopPropagation(); }} className={`px-2 py-0.5 rounded text-xs border ${getSeverityColor(cellValue)}`}>
                                                            <select
                                                                className="bg-transparent border-none focus:outline-none appearance-none cursor-pointer"
                                                                value={String(cellValue)}
                                                                onChange={(e) => onRowUpdate(row.id, col, e.target.value)}
                                                            >
                                                                <option className="bg-slate-800" value="Critique">Critique</option>
                                                                <option className="bg-slate-800" value="Majeur">Majeur</option>
                                                                <option className="bg-slate-800" value="Mineur">Mineur</option>
                                                            </select>
                                                        </span>
                                                    ) : (
                                                        <span className="text-sm text-slate-300 line-clamp-2">{String(cellValue)}</span>
                                                    )}
                                                </div>
                                            )}
                                        </td>
                                    );
                                })}

                                {/* Actions Column */}
                                <td className="p-3 text-center sticky right-0 bg-slate-900 group-hover:bg-[#131d33] transition-colors shadow-[-10px_0_20px_-5px_rgba(0,0,0,0.3)]">
                                    <button
                                        onClick={() => onOpenChat(row)}
                                        className="p-1.5 rounded-lg bg-blue-600/10 text-blue-400 hover:bg-blue-600 hover:text-white transition-all shadow-sm"
                                        title="Discussion contextuelle"
                                    >
                                        <MessageSquare className="w-4 h-4" />
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default DataGrid;
