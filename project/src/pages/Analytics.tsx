import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import PageLayout from '../components/PageLayout';
import AnalyticsChatWidget from '../components/AnalyticsChatWidget';
import ChatHistorySidebar from '../components/ChatHistorySidebar';
import { toast } from 'react-toastify';
import { ChevronLeft, ChevronRight, Bookmark, Database, RefreshCw, Trash2, Calendar, Sparkles, AlertCircle, TrendingUp, Clock, Loader } from 'lucide-react';
import ConfirmModal from '../components/ConfirmModal';
import api, { savedVisualizationService } from '../services/api';
import { motion, AnimatePresence } from 'framer-motion';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as ChartTooltip,
    ResponsiveContainer, LabelList, Cell
} from 'recharts';
import Plot from 'react-plotly.js';

const COLUMN_LABELS: Record<string, string> = {
    title: 'Campagne', campaign_title: 'Campagne', name: 'Nom', version: 'Release',
    passed: 'Réussis', failed: 'Échoués', pass_rate: 'Taux de réussite (%)',
    anomaly_count: 'Anomalies', count: 'Nombre', total: 'Total', velocity: 'Vélocité',
};

const humanizeColumn = (key: string) =>
    COLUMN_LABELS[String(key || '').toLowerCase()] ||
    String(key).replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());

const formatCell = (key: string, value: unknown) => {
    if (value === null || value === undefined || value === '') return '—';
    const n = Number(value);
    if (!Number.isNaN(n) && String(value).trim() !== '') {
        if (/rate|taux|percent|%/i.test(key)) return `${Number.isInteger(n) ? n : n.toFixed(1)} %`;
        return Number.isInteger(n) ? String(n) : n.toFixed(1);
    }
    return String(value);
};

interface Conversation {
    id: string;
    title: string;
    created_at: string;
}

const Analytics = () => {
    const { t } = useTranslation();
    const [conversations, setConversations] = useState<Conversation[]>([]);
    const [currentConversationId, setCurrentConversationId] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [isHistorySidebarOpen, setIsHistorySidebarOpen] = useState(true);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [conversationToDelete, setConversationToDelete] = useState<string | null>(null);

    // Custom Dashboard States & Actions
    const [activeTab, setActiveTab] = useState<'chat' | 'dashboard'>('chat');
    const [savedVisualizations, setSavedVisualizations] = useState<any[]>([]);
    const [loadingSaved, setLoadingSaved] = useState(false);
    const [refreshingId, setRefreshingId] = useState<string | number | null>(null);
    const [deletingId, setDeletingId] = useState<string | number | null>(null);
    const [visibleSqlMap, setVisibleSqlMap] = useState<Record<string, boolean>>({});

    const fetchSavedVisualizations = useCallback(async () => {
        try {
            setLoadingSaved(true);
            const response = await savedVisualizationService.getSaved();
            const data = response.data.results || response.data;
            setSavedVisualizations(Array.isArray(data) ? data : []);
        } catch (error) {
            console.error("Failed to fetch saved visualizations", error);
            toast.error("Impossible de récupérer le tableau de bord.");
        } finally {
            setLoadingSaved(false);
        }
    }, []);

    useEffect(() => {
        if (activeTab === 'dashboard') {
            fetchSavedVisualizations();
        }
    }, [activeTab, fetchSavedVisualizations]);

    const handleRefreshSaved = async (id: string | number) => {
        setRefreshingId(id);
        try {
            const res = await savedVisualizationService.refresh(id);
            const updated = res.data;
            setSavedVisualizations(prev => prev.map(v => v.id === id ? updated : v));
            if (updated.warning) {
                toast.warning(updated.warning);
            } else {
                toast.success("Données actualisées !");
            }
        } catch (error: any) {
            console.error("Failed to refresh visualization", error);
            const errMsg = error?.response?.data?.error || "Erreur lors de l'actualisation.";
            toast.error(errMsg);
        } finally {
            setRefreshingId(null);
        }
    };

    const handleDeleteSaved = async (id: string | number) => {
        setDeletingId(id);
        try {
            await savedVisualizationService.delete(id);
            setSavedVisualizations(prev => prev.filter(v => v.id !== id));
            toast.success("Visualisation retirée du tableau de bord.");
        } catch (error) {
            console.error("Failed to delete visualization", error);
            toast.error("Erreur lors de la suppression.");
        } finally {
            setDeletingId(null);
        }
    };

    const fetchConversations = useCallback(async () => {
        try {
            setIsLoading(true);
            const response = await api.get('/analytics/conversations/');
            const data = response.data.results || response.data;
            const sorted = (Array.isArray(data) ? data : [])
                .sort((a: Conversation, b: Conversation) =>
                    new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
                );
            setConversations(sorted);
        } catch {
            // Silently fail
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => { fetchConversations(); }, [fetchConversations]);

    const handleNewChat = () => {
        setCurrentConversationId(null);
        setActiveTab('chat');
    };
    const handleSelectConversation = (id: string) => {
        setCurrentConversationId(id);
        setActiveTab('chat');
    };

    const handleConversationStarted = (id: string) => {
        if (id) {
            setCurrentConversationId(id);
            fetchConversations();
        }
    };

    const handleDeleteConversation = async (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        setConversationToDelete(id);
        setIsDeleteModalOpen(true);
    };

    const confirmDeleteConversation = async () => {
        if (!conversationToDelete) return;
        try {
            await api.delete(`/analytics/conversations/${conversationToDelete}/`);
            setConversations(prev => prev.filter(c => c.id !== conversationToDelete));
            if (currentConversationId === conversationToDelete) setCurrentConversationId(null);
            toast.success(t('analytics.toasts.deleted'));
        } catch {
            toast.error(t('analytics.toasts.deleteError'));
        } finally {
            setConversationToDelete(null);
            setIsDeleteModalOpen(false);
        }
    };

    const renderVisualization = (vis: any) => {
        if (!vis.data) return null;

        const renderTabularChart = (rows: any[], chartType?: string) => {
            if (!Array.isArray(rows) || rows.length === 0) {
                return (
                    <div className="flex flex-col items-center justify-center py-12 text-slate-500 italic">
                        <AlertCircle className="w-8 h-8 mb-2 opacity-50 text-slate-500" />
                        Aucune donnée à afficher
                    </div>
                );
            }

            const keys = Object.keys(rows[0]);
            const labelKey = keys.find(k => /title|name|campagne|version/i.test(k)) || keys.find(k => Number.isNaN(Number(rows[0][k]))) || keys[0];
            const numericKeys = keys.filter(k =>
                k !== labelKey && !/_?id$/i.test(k) &&
                rows.some((row: any) => row[k] !== null && row[k] !== '' && !Number.isNaN(Number(row[k])))
            );
            const valueKey = numericKeys[0];
            const normalized = rows.map((row: any) => {
                const next = { ...row };
                numericKeys.forEach(k => { if (!Number.isNaN(Number(next[k]))) next[k] = Number(next[k]); });
                return next;
            });

            if (chartType === 'metric') {
                return (
                    <div className="flex flex-col items-center justify-center p-6 bg-gradient-to-br from-blue-600/10 to-violet-600/10 border border-blue-500/10 rounded-2xl text-center shadow-lg w-full">
                        <span className="text-5xl font-black text-blue-500 dark:text-blue-400">{formatCell(keys[0], normalized[0][keys[0]])}</span>
                        <div className="mt-2 text-[10px] uppercase tracking-widest font-black text-slate-400">{humanizeColumn(keys[0])}</div>
                    </div>
                );
            }

            const table = (
                <div className="rounded-2xl border border-slate-200 dark:border-white/10 overflow-hidden w-full">
                    <div className="overflow-x-auto max-h-72 custom-scrollbar">
                        <table className="min-w-full text-[11px]">
                            <thead className="bg-slate-50 dark:bg-slate-900 sticky top-0 font-bold text-slate-500 uppercase tracking-wider">
                                <tr>
                                    <th className="px-3 py-2 text-left w-8">#</th>
                                    {keys.map(k => <th key={k} className="px-3 py-2 text-left whitespace-nowrap">{humanizeColumn(k)}</th>)}
                                </tr>
                            </thead>
                            <tbody className="bg-white/50 dark:bg-slate-950/30 divide-y divide-slate-100 dark:divide-slate-800/50">
                                {normalized.map((row, i) => (
                                    <tr key={i} className="hover:bg-blue-50 dark:hover:bg-white/[0.04] text-slate-700 dark:text-slate-300">
                                        <td className="px-3 py-2 text-slate-400 font-semibold">{i + 1}</td>
                                        {keys.map(k => (
                                            <td key={k} className={`px-3 py-2 ${k === labelKey ? 'font-semibold text-slate-900 dark:text-white max-w-[240px]' : 'whitespace-nowrap'}`}>
                                                {formatCell(k, row[k])}
                                            </td>
                                        ))}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            );

            if (valueKey && numericKeys.length === 1 && (chartType === 'bar' || !chartType)) {
                const chartRows = normalized.slice(0, 12).map((row: any, i: number) => ({
                    rank: String(i + 1),
                    fullLabel: String(row[labelKey] ?? `Élément ${i + 1}`),
                    value: Number(row[valueKey]) || 0,
                }));
                const maxVal = Math.max(...chartRows.map(r => r.value), 0);
                const color = (v: number) => (maxVal <= 0 ? '#3b82f6' : v / maxVal >= 0.7 ? '#10b981' : v / maxVal >= 0.4 ? '#f59e0b' : '#f43f5e');

                return (
                    <div className="w-full space-y-3">
                        <div className="h-[240px] w-full bg-slate-950/20 rounded-2xl p-3 border border-slate-200/50 dark:border-white/5">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={chartRows} margin={{ top: 20, right: 8, left: 0, bottom: 4 }}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(148,163,184,0.08)" />
                                    <XAxis dataKey="rank" fontSize={11} tickLine={false} axisLine={false} tick={{ fill: '#94a3b8', fontWeight: 700 }} />
                                    <YAxis fontSize={10} tickLine={false} axisLine={false} tick={{ fill: '#94a3b8' }} width={32} />
                                    <ChartTooltip
                                        formatter={(val: any) => [formatCell(valueKey, val), humanizeColumn(valueKey)]}
                                        labelFormatter={(_, payload) => payload?.[0]?.payload?.fullLabel || ''}
                                        contentStyle={{ backgroundColor: '#0f172a', borderRadius: 12, fontSize: 10, border: '1px solid rgba(148,163,184,0.25)', color: '#f8fafc', maxWidth: 280, whiteSpace: 'normal' }}
                                        cursor={{ fill: 'rgba(59, 130, 246, 0.1)' }}
                                    />
                                    <Bar dataKey="value" radius={[4, 4, 0, 0]} maxBarSize={36}>
                                        {chartRows.map((e, i) => <Cell key={i} fill={color(e.value)} />)}
                                        <LabelList dataKey="value" position="top" fill="#94a3b8" fontSize={9} fontWeight={700} />
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-1 text-[10px] text-slate-500 dark:text-slate-300">
                            {chartRows.map(r => (
                                <div key={r.rank} className="flex gap-1.5 px-2 py-1 rounded bg-white/5">
                                    <span className="font-black text-blue-400">{r.rank}.</span>
                                    <span>{r.fullLabel}</span>
                                </div>
                            ))}
                        </div>
                        {table}
                    </div>
                );
            }

            return table;
        };

        if (vis.type === 'plotly') {
            let props = vis.data;
            if (typeof props === 'string') { try { props = JSON.parse(props); } catch { return null; } }

            const isPlotlyTraceArray = Array.isArray(props) && props.length > 0
                && props.every((item: any) => item && typeof item === 'object' && 'type' in item);
            const isRawSqlRows = Array.isArray(props) && props.length > 0
                && typeof props[0] === 'object'
                && !isPlotlyTraceArray
                && !('data' in props)
                && !('layout' in props);

            if (isRawSqlRows) {
                return renderTabularChart(props, 'bar');
            }

            const plotData = isPlotlyTraceArray
                ? props
                : (Array.isArray(props) ? props : (props.data || []));
            if (!plotData.length) {
                return renderTabularChart([], vis.type);
            }

            const plotLayout = isPlotlyTraceArray ? {} : (props.layout || {});

            return (
                <div className="w-full flex flex-col items-center">
                    <Plot
                        data={plotData}
                        layout={{
                            autosize: true,
                            ...(plotLayout || {}),
                            paper_bgcolor: 'transparent',
                            plot_bgcolor: 'transparent',
                            font: { color: 'var(--foreground)', family: 'Outfit, Inter, sans-serif', size: 10 },
                            showlegend: true,
                            legend: { orientation: 'h', y: -0.15, x: 0.5, xanchor: 'center' },
                            title: undefined,
                            margin: {
                                t: 10,
                                b: 80,
                                l: 30,
                                r: 30,
                                ...(plotLayout?.margin || {})
                            },
                            height: 300,
                        }}
                        style={{ width: '100%', minHeight: '300px' }}
                        useResizeHandler
                        config={{
                            responsive: true,
                            displayModeBar: false,
                        }}
                    />
                </div>
            );
        }

        return renderTabularChart(vis.data, vis.type);
    };

    const renderDashboard = () => {
        if (loadingSaved && savedVisualizations.length === 0) {
            return (
                <div className="flex-1 flex flex-col items-center justify-center gap-4 py-32">
                    <Loader className="w-12 h-12 text-blue-500 animate-spin" />
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-widest animate-pulse">Chargement de votre Dashboard...</span>
                </div>
            );
        }

        if (savedVisualizations.length === 0) {
            return (
                <div className="flex-1 flex flex-col items-center justify-center p-12 text-center max-w-md mx-auto my-16">
                    <div className="w-16 h-16 bg-blue-600/10 rounded-2xl flex items-center justify-center mb-6 text-blue-500 border border-blue-500/10 shadow-inner">
                        <Bookmark className="w-8 h-8 animate-pulse text-blue-500" />
                    </div>
                    <h3 className="text-lg font-bold text-slate-950 dark:text-white uppercase tracking-wider mb-2">Votre Tableau de Bord est vide</h3>
                    <p className="text-xs font-medium text-slate-500 leading-relaxed italic">
                        Explorez vos données dans le Chat IA, générez des visualisations et épinglez-les ici pour composer votre tableau de bord personnalisé.
                    </p>
                </div>
            );
        }

        return (
            <div className="flex-1 overflow-y-auto p-8 custom-scrollbar bg-slate-50 dark:bg-slate-900/50">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {savedVisualizations.map((vis) => {
                        const isSqlVisible = !!visibleSqlMap[vis.id];
                        return (
                            <motion.div
                                key={vis.id}
                                initial={{ opacity: 0, y: 15 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="group relative overflow-hidden bg-white dark:bg-white/[0.03] backdrop-blur-xl border border-slate-200 dark:border-white/10 rounded-[2rem] p-6 hover:bg-slate-50 dark:hover:bg-white/[0.06] transition-all duration-300 flex flex-col h-full shadow-2xl shadow-slate-200/50 dark:shadow-black/20"
                            >
                                {/* Card Header */}
                                <div className="flex justify-between items-start mb-4">
                                    <div className="space-y-1">
                                        <h4 className="text-sm font-bold text-slate-900 dark:text-white group-hover:text-blue-500 transition-colors uppercase tracking-tight">{vis.title}</h4>
                                        <p className="text-[10px] text-slate-500 font-medium italic">"{vis.query}"</p>
                                    </div>
                                    <div className="flex items-center gap-2 shrink-0">
                                        <button
                                            onClick={() => setVisibleSqlMap(prev => ({ ...prev, [vis.id]: !isSqlVisible }))}
                                            className={`p-2 rounded-xl transition-all border ${isSqlVisible ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/25' : 'bg-slate-100 dark:bg-white/5 border-slate-200 dark:border-white/5 text-slate-400 hover:text-slate-900 dark:hover:text-white'}`}
                                            title="Consulter SQL"
                                        >
                                            <Database className="w-3.5 h-3.5" />
                                        </button>
                                        <button
                                            onClick={() => handleRefreshSaved(vis.id)}
                                            className="p-2 bg-slate-100 dark:bg-white/5 text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-white/10 rounded-xl transition-all border border-slate-200 dark:border-white/5"
                                            title="Actualiser les données"
                                            disabled={refreshingId === vis.id}
                                        >
                                            {refreshingId === vis.id ? (
                                                <Loader className="w-3.5 h-3.5 animate-spin text-blue-500" />
                                            ) : (
                                                <RefreshCw className="w-3.5 h-3.5" />
                                            )}
                                        </button>
                                        <button
                                            onClick={() => handleDeleteSaved(vis.id)}
                                            className="p-2 bg-slate-100 dark:bg-white/5 text-slate-400 hover:text-rose-500 hover:bg-rose-500/10 rounded-xl transition-all border border-slate-200 dark:border-white/5"
                                            title="Retirer"
                                            disabled={deletingId === vis.id}
                                        >
                                            {deletingId === vis.id ? (
                                                <Loader className="w-3.5 h-3.5 animate-spin text-rose-500" />
                                            ) : (
                                                <Trash2 className="w-3.5 h-3.5" />
                                            )}
                                        </button>
                                    </div>
                                </div>

                                {/* SQL Code Block toggler */}
                                {isSqlVisible && vis.sql && (
                                    <div className="mb-4 bg-slate-200/90 dark:bg-slate-200/90 dark:bg-slate-950/90 rounded-xl p-3 font-mono text-[9px] text-emerald-400/80 overflow-x-auto border border-slate-800 shadow-inner">
                                        <code className="whitespace-pre">{vis.sql}</code>
                                    </div>
                                )}

                                {/* Card Content */}
                                <div className="flex-1 flex items-center justify-center min-h-[300px]">
                                    {renderVisualization(vis)}
                                </div>

                                {/* Footer info */}
                                <div className="mt-4 pt-4 border-t border-slate-200 dark:border-white/5 flex justify-between items-center text-[8px] font-black text-slate-500 uppercase tracking-widest">
                                    <span>Type: {vis.type}</span>
                                    <span>Sauvegardé le {new Date(vis.created_at).toLocaleDateString()}</span>
                                </div>
                            </motion.div>
                        );
                    })}
                </div>
            </div>
        );
    };

    return (
        <PageLayout
            fullHeight={true}
            noPadding={true}
        >
            <div className="flex flex-col h-full min-h-0 bg-transparent">
                {/* Header de page */}
                <div className="shrink-0 px-4 lg:px-6 py-2 flex items-center gap-3">
                    <h1 className="text-lg font-semibold text-slate-800 dark:text-[#e8eaf6]">Assistant Analytics</h1>
                    <div className="flex items-center gap-1.5 px-3 py-1 rounded-full border border-violet-200 dark:border-[rgba(127,119,221,0.25)] bg-violet-50 dark:bg-[rgba(127,119,221,0.15)] text-violet-600 dark:text-[#AFA9EC] text-[11px] font-medium">
                        <span className="w-1.5 h-1.5 rounded-full bg-violet-500 dark:bg-[#AFA9EC] animate-pulse"></span>
                        AI Analytics
                    </div>
                </div>

                {/* Layout 2 colonnes — hauteur adaptative au viewport */}
                <div className="flex-1 min-h-0 px-4 lg:px-6 pb-4 overflow-hidden flex justify-center">
                    <div className="grid grid-cols-[minmax(200px,240px)_1fr] gap-[10px] w-full max-w-[1400px] h-full min-h-0">
                        {/* Colonne 1 — Sidebar historique */}
                        <div className="bg-white dark:bg-white/[0.03] backdrop-blur-xl rounded-[12px] border border-slate-200 dark:border-white/[0.08] flex flex-col overflow-hidden min-h-0 h-full shadow-lg dark:shadow-2xl">
                            <ChatHistorySidebar
                                conversations={conversations}
                                currentConversationId={currentConversationId}
                                onSelectConversation={handleSelectConversation}
                                onNewChat={handleNewChat}
                                onDeleteConversation={handleDeleteConversation}
                                isLoading={isLoading}
                            />
                        </div>

                        {/* Colonne 2 — Panneau principal */}
                        <div className="bg-white dark:bg-white/[0.03] backdrop-blur-xl rounded-[12px] border border-slate-200 dark:border-white/[0.08] flex flex-col overflow-hidden min-h-0 h-full shadow-lg dark:shadow-2xl">
                            {/* Onglets */}
                            <div className="shrink-0 px-[14px] pt-[12px] flex border-b border-slate-200 dark:border-white/[0.07] relative">
                                <button
                                    onClick={() => setActiveTab('chat')}
                                    className={`px-4 py-2 text-[12px] font-[500] rounded-t-[8px] transition-all border ${activeTab === 'chat' ? 'bg-slate-100 dark:bg-white/[0.04] text-slate-900 dark:text-slate-800 dark:text-[#e8eaf6] border-slate-200 dark:border-white/[0.08] border-b-transparent relative top-[1px]' : 'text-slate-500 dark:text-white/40 bg-transparent border-transparent hover:text-slate-700 dark:hover:text-white/70'}`}
                                >
                                    Discussions IA
                                </button>
                                <button
                                    onClick={() => setActiveTab('dashboard')}
                                    className={`px-4 py-2 text-[12px] font-[500] rounded-t-[8px] transition-all border ${activeTab === 'dashboard' ? 'bg-slate-100 dark:bg-white/[0.04] text-slate-900 dark:text-slate-800 dark:text-[#e8eaf6] border-slate-200 dark:border-white/[0.08] border-b-transparent relative top-[1px]' : 'text-slate-500 dark:text-white/40 bg-transparent border-transparent hover:text-slate-700 dark:hover:text-white/70'}`}
                                >
                                    Mon tableau de bord
                                </button>
                            </div>

                            <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
                            {activeTab === 'chat' ? (
                                <AnalyticsChatWidget
                                    embedded={true}
                                    conversationId={currentConversationId}
                                    onConversationUpdate={fetchConversations}
                                    onConversationStarted={handleConversationStarted}
                                    onToggleSidebar={() => {}}
                                    isSidebarOpen={true}
                                />
                            ) : (
                                <div className="flex-1 min-h-0 overflow-hidden flex flex-col">
                                    {renderDashboard()}
                                </div>
                            )}
                            </div>
                        </div>
                    </div>
                </div>

                <ConfirmModal
                    isOpen={isDeleteModalOpen}
                    title={t('analytics.modal.deleteTitle')}
                    message={t('analytics.modal.deleteMessage')}
                    onConfirm={confirmDeleteConversation}
                    onCancel={() => setIsDeleteModalOpen(false)}
                    confirmText={t('analytics.history.delete')}
                    type="danger"
                />
            </div>
        </PageLayout>
    );
};

export default Analytics;
