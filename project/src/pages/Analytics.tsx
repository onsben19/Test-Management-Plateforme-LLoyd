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
    ResponsiveContainer
} from 'recharts';
import Plot from 'react-plotly.js';

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
            toast.success("Données actualisées !");
        } catch (error) {
            console.error("Failed to refresh visualization", error);
            toast.error("Erreur lors de l'actualisation.");
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

    const handleNewChat = () => setCurrentConversationId(null);
    const handleSelectConversation = (id: string) => setCurrentConversationId(id);

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
        if (vis.type === 'plotly') {
            let props = vis.data;
            if (typeof props === 'string') { try { props = JSON.parse(props); } catch { return null; } }
            const plotTitle = typeof props.layout?.title === 'object' ? props.layout.title.text : (typeof props.layout?.title === 'string' ? props.layout.title : null);

            return (
                <div className="w-full flex flex-col items-center">
                    <Plot
                        data={props.data || []}
                        layout={{
                            autosize: true,
                            paper_bgcolor: 'transparent',
                            plot_bgcolor: 'transparent',
                            font: { color: 'var(--foreground)', family: 'Outfit, Inter, sans-serif', size: 10 },
                            showlegend: true,
                            legend: { orientation: 'h', y: -0.15, x: 0.5, xanchor: 'center' },
                            ...props.layout,
                            title: undefined,
                            margin: {
                                t: 10,
                                b: 80,
                                l: 30,
                                r: 30,
                                ...props.layout?.margin
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
        if (!Array.isArray(vis.data) || vis.data.length === 0) return (
            <div className="flex flex-col items-center justify-center py-12 text-slate-500 italic">
                <AlertCircle className="w-8 h-8 mb-2 opacity-50 text-slate-500" />
                Aucune donnée à afficher
            </div>
        );
        const keys = Object.keys(vis.data[0]);
        const labelKey = keys[0];
        const valueKey = keys.find(k => k !== labelKey && !isNaN(Number(vis.data[0][k])));
        const normalized = vis.data.map((row: any) => ({ ...row, ...(valueKey ? { [valueKey]: Number(row[valueKey]) } : {}) }));

        if (vis.type === 'metric') {
            return (
                <div className="flex flex-col items-center justify-center p-6 bg-gradient-to-br from-blue-600/10 to-violet-600/10 border border-blue-500/10 rounded-2xl text-center shadow-lg w-full">
                    <span className="text-5xl font-black text-blue-500 dark:text-blue-400">{normalized[0][keys[0]]}</span>
                    <div className="mt-2 text-[10px] uppercase tracking-widest font-black text-slate-400">{keys[0].replace(/_/g, ' ')}</div>
                </div>
            );
        }

        if (valueKey && (vis.type === 'bar' || !vis.type)) {
            return (
                <div className="h-[300px] w-full bg-slate-950/20 rounded-2xl p-4 border border-slate-200/50 dark:border-white/5">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={normalized} margin={{ top: 10, right: 10, left: -10, bottom: 20 }}>
                            <defs>
                                <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8}/>
                                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.2}/>
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(148,163,184,0.08)" />
                            <XAxis dataKey={labelKey} fontSize={10} tickLine={false} axisLine={false} tick={{ fill: 'currentColor' }} className="text-slate-500" angle={-25} textAnchor="end" interval={0} />
                            <YAxis fontSize={10} tickLine={false} axisLine={false} tick={{ fill: 'currentColor' }} className="text-slate-500" width={30} />
                            <ChartTooltip contentStyle={{ backgroundColor: 'var(--card)', borderRadius: '12px', fontSize: '10px', border: '1px solid var(--border)', color: 'var(--foreground)' }} cursor={{ fill: 'rgba(59, 130, 246, 0.05)' }} />
                            <Bar dataKey={valueKey} fill="url(#colorValue)" radius={[4, 4, 0, 0]} maxBarSize={40} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            );
        }

        return (
            <div className="rounded-2xl border border-slate-200 dark:border-slate-800/80 overflow-hidden w-full">
                <div className="overflow-x-auto max-h-60 custom-scrollbar">
                    <table className="min-w-full text-[10px]">
                        <thead className="bg-slate-50 dark:bg-slate-900 sticky top-0 font-bold text-slate-500 uppercase tracking-wider">
                            <tr>{keys.map(k => <th key={k} className="px-3 py-2 text-left">{k.replace(/_/g, ' ')}</th>)}</tr>
                        </thead>
                        <tbody className="bg-white/50 dark:bg-slate-950/30 divide-y divide-slate-100 dark:divide-slate-800/50">
                            {normalized.map((row, i) => <tr key={i} className="hover:bg-blue-50 dark:hover:bg-blue-900/5 text-slate-700 dark:text-slate-300">{keys.map(k => <td key={k} className="px-3 py-2">{row[k]}</td>)}</tr>)}
                        </tbody>
                    </table>
                </div>
            </div>
        );
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
                                className="group relative overflow-hidden bg-white dark:bg-white/[0.03] backdrop-blur-xl border border-slate-200 dark:border-white/10 rounded-[2rem] p-6 hover:bg-slate-50 dark:hover:bg-white/[0.05] transition-all duration-300 flex flex-col h-full shadow-2xl shadow-slate-200/50 dark:shadow-black/20"
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
                                            className={`p-2 rounded-xl transition-all border ${isSqlVisible ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/25' : 'bg-slate-100 dark:bg-white/5 border-slate-200 dark:border-white/5 text-slate-400 hover:text-white'}`}
                                            title="Consulter SQL"
                                        >
                                            <Database className="w-3.5 h-3.5" />
                                        </button>
                                        <button
                                            onClick={() => handleRefreshSaved(vis.id)}
                                            className="p-2 bg-slate-100 dark:bg-white/5 text-slate-400 hover:text-white hover:bg-slate-200 dark:hover:bg-white/10 rounded-xl transition-all border border-slate-200 dark:border-white/5"
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
                                    <div className="mb-4 bg-slate-950/90 rounded-xl p-3 font-mono text-[9px] text-emerald-400/80 overflow-x-auto border border-slate-800 shadow-inner">
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
            title={t('analytics.title')}
            subtitle="AI ANALYTICS"
            fullHeight={true}
            noPadding={true}
        >
            <div className="flex flex-1 h-full relative overflow-hidden glass-panel rounded-t-[2.5rem]">
                {/* History sidebar with edge-tab toggle */}
                {activeTab === 'chat' && (
                    <div className="relative flex shrink-0">
                        {/* Sliding panel */}
                        <div className={`${isHistorySidebarOpen ? 'w-80' : 'w-0'
                            } transition-all duration-500 ease-in-out overflow-hidden glass-sidebar`}>
                            <ChatHistorySidebar
                                conversations={conversations}
                                currentConversationId={currentConversationId}
                                onSelectConversation={handleSelectConversation}
                                onNewChat={handleNewChat}
                                onDeleteConversation={handleDeleteConversation}
                                isLoading={isLoading}
                            />
                        </div>

                        {/* Edge tab — always visible */}
                        <button
                            onClick={() => setIsHistorySidebarOpen(v => !v)}
                            className={`absolute ${isHistorySidebarOpen ? 'right-0 translate-x-1/2' : 'left-2'} top-1/2 -translate-y-1/2 z-20 flex items-center justify-center w-6 h-12 bg-blue-600 hover:bg-blue-500 border border-blue-400/30 rounded-full shadow-xl shadow-blue-900/40 transition-all group scale-75 lg:scale-100`}
                            title={isHistorySidebarOpen ? t('common.close') : t('common.open')}
                        >
                            {isHistorySidebarOpen
                                ? <ChevronLeft className="w-4 h-4 text-slate-900 dark:text-white" />
                                : <ChevronRight className="w-4 h-4 text-slate-900 dark:text-white" />
                            }
                        </button>
                    </div>
                )}

                {/* Chat area */}
                <div className={`flex-1 h-full overflow-hidden flex flex-col relative z-10 ${(isHistorySidebarOpen && activeTab === 'chat') ? '' : 'pl-8'}`}>
                    {/* Tab Switcher Header */}
                    <div className="shrink-0 bg-slate-50/50 dark:bg-slate-950/40 border-b border-slate-200 dark:border-slate-800 px-6 py-4 flex items-center justify-between">
                        <div className="flex bg-slate-200/50 dark:bg-white/5 p-1 rounded-2xl border border-slate-300 dark:border-white/5">
                            <button
                                onClick={() => setActiveTab('chat')}
                                className={`px-5 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${activeTab === 'chat' ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20' : 'text-slate-400 hover:text-slate-500 dark:hover:text-slate-300'}`}
                            >
                                Discussions IA
                            </button>
                            <button
                                onClick={() => setActiveTab('dashboard')}
                                className={`px-5 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${activeTab === 'dashboard' ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20' : 'text-slate-400 hover:text-slate-500 dark:hover:text-slate-300'}`}
                            >
                                Mon Tableau de Bord
                            </button>
                        </div>
                    </div>

                    {activeTab === 'chat' ? (
                        <AnalyticsChatWidget
                            embedded={true}
                            conversationId={currentConversationId}
                            onConversationUpdate={fetchConversations}
                            onConversationStarted={handleConversationStarted}
                            onToggleSidebar={() => setIsHistorySidebarOpen(v => !v)}
                            isSidebarOpen={isHistorySidebarOpen}
                        />
                    ) : (
                        renderDashboard()
                    )}
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
        </PageLayout>
    );
};

export default Analytics;
