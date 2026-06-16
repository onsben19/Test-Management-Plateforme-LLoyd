import React, { useEffect, useState, useMemo } from 'react';
import PageLayout from '../../components/PageLayout';
import AdminTable from '../../components/AdminTable';
import { analyticsService } from '../../services/api';
import { toast } from 'react-toastify';
import { Trash2, ExternalLink, WandSparkles, RefreshCw, Zap, Newspaper } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import StatCard from '../../components/StatCard';
import Pagination from '../../components/Pagination';
import ConfirmModal from '../../components/ConfirmModal';

const AdminQANews = () => {
    const { t } = useTranslation();
    const [news, setNews] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [isScraping, setIsScraping] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const pageSize = 12;

    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [newsToDelete, setNewsToDelete] = useState<string | null>(null);

    const fetchNews = async () => {
        try {
            setLoading(true);
            const response = await analyticsService.getQANews();
            setNews(response.data);
        } catch (error) {
            console.error("Failed to fetch QA news", error);
            toast.error("Erreur lors de la récupération des articles.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchNews();
    }, []);

    const filteredNews = useMemo(() => {
        return news.filter(item =>
            (item.title || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
            (item.source || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
            (item.ai_tip || '').toLowerCase().includes(searchQuery.toLowerCase())
        );
    }, [news, searchQuery]);

    const paginatedNews = useMemo(() => {
        const startIndex = (currentPage - 1) * pageSize;
        return filteredNews.slice(startIndex, startIndex + pageSize);
    }, [filteredNews, currentPage, pageSize]);

    const handleScrape = async () => {
        try {
            setIsScraping(true);
            const res = await analyticsService.triggerQAScraping();
            toast.success(`${res.data.new_items} nouveaux articles récupérés avec succès !`);
            fetchNews();
        } catch (error) {
            toast.error("Erreur lors du scraping des articles.");
        } finally {
            setIsScraping(false);
        }
    };

    const confirmDelete = async () => {
        if (!newsToDelete) return;
        try {
            await analyticsService.deleteQANews(newsToDelete);
            toast.success("Article supprimé de la base.");
            fetchNews();
        } catch (error) {
            toast.error("Erreur lors de la suppression.");
        } finally {
            setIsDeleteModalOpen(false);
            setNewsToDelete(null);
        }
    };

    const columns = [
        {
            header: 'ID',
            accessor: (item: any) => <span className="font-mono text-[10px] text-slate-500">{String(item.id).substring(0, 8)}</span>
        },
        {
            header: 'Source',
            accessor: (item: any) => (
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-indigo-500/10 flex items-center justify-center text-indigo-400 border border-indigo-500/20">
                        <Newspaper className="w-4 h-4" />
                    </div>
                    <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest">{item.source}</span>
                </div>
            )
        },
        {
            header: 'Titre de l\'Article',
            accessor: (item: any) => (
                <a href={item.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 group/link">
                    <span className="text-[13px] font-bold text-slate-900 dark:text-white group-hover/link:text-blue-400 transition-colors line-clamp-2 max-w-sm leading-snug">
                        {item.title}
                    </span>
                    <ExternalLink className="w-3.5 h-3.5 text-slate-400 opacity-0 group-hover/link:opacity-100 transition-opacity" />
                </a>
            )
        },
        {
            header: 'Analyse IA',
            accessor: (item: any) => (
                item.ai_tip ? (
                    <div className="text-[11px] text-slate-500 font-medium italic line-clamp-2 max-w-sm">
                        "{item.ai_tip.replace(/💡\s*Tip\s*:?|Tip\s*:?|Conseil\s*:?|💡/gi, '').trim()}"
                    </div>
                ) : <span className="text-slate-600 text-[9px] uppercase tracking-widest opacity-50 font-bold">- Aucune analyse -</span>
            )
        },
        {
            header: 'CRÉÉ PAR',
            accessor: (item: any) => (
                <div className="flex flex-col">
                    <span className="text-slate-700 dark:text-slate-300 text-[11px] font-bold tracking-tight">Système IA</span>
                    <span className="text-[9px] text-slate-600 font-bold uppercase tracking-widest italic opacity-60">Scraper</span>
                </div>
            )
        },
        {
            header: 'DATE DE CRÉATION',
            accessor: (item: any) => (
                <div className="flex flex-col gap-0.5">
                    <span className="text-slate-700 dark:text-slate-300 text-[11px] font-bold tracking-tight">{item.created_at}</span>
                    <span className="text-[9px] text-slate-600 font-bold uppercase tracking-widest italic opacity-60">Enregistré</span>
                </div>
            )
        }
    ];

    return (
        <PageLayout
            title="Gestion Veille QA"
            subtitle="ADMINISTRATION DU CONTENU IA"
            actions={() => (
                <button
                    onClick={handleScrape}
                    disabled={isScraping}
                    className="flex items-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white px-6 py-3 rounded-full font-black text-[10px] tracking-[0.2em] uppercase transition-all shadow-xl shadow-blue-900/20 active:scale-95 disabled:opacity-50"
                >
                    {isScraping ? (
                        <RefreshCw className="w-4 h-4 animate-spin" />
                    ) : (
                        <Zap className="w-4 h-4" />
                    )}
                    {isScraping ? 'Analyse en cours...' : 'Lancer le Moteur IA'}
                </button>
            )}
        >
            <div className="space-y-8">
                {/* Stats Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    <StatCard
                        title="Articles Collectés"
                        value={news.length}
                        icon={Newspaper}
                        variant="blue"
                        description="Dans la base de connaissances"
                        isLoading={loading}
                    />
                    <StatCard
                        title="Analyses IA"
                        value={news.filter(n => n.ai_tip).length}
                        icon={WandSparkles}
                        variant="purple"
                        description="Conseils générés"
                        isLoading={loading}
                    />
                    <StatCard
                        title="Sources Uniques"
                        value={new Set(news.map(n => n.source)).size}
                        icon={ExternalLink}
                        variant="green"
                        description="Sites web monitorés"
                        isLoading={loading}
                    />
                </div>

                <AdminTable
                    columns={columns}
                    data={paginatedNews}
                    isLoading={loading}
                    searchable
                    onSearch={setSearchQuery}
                    actions={(item) => (
                        <div className="flex items-center gap-2 pr-4">
                            <button
                                onClick={() => {
                                    setNewsToDelete(item.id);
                                    setIsDeleteModalOpen(true);
                                }}
                                className="p-2.5 bg-slate-100 dark:bg-white/5 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-xl transition-all"
                                title="Supprimer"
                            >
                                <Trash2 className="w-4 h-4" />
                            </button>
                        </div>
                    )}
                />
                
                <div className="pt-2">
                    <Pagination
                        currentPage={currentPage}
                        totalItems={filteredNews.length}
                        pageSize={pageSize}
                        onPageChange={setCurrentPage}
                        loading={loading}
                    />
                </div>
            </div>

            <ConfirmModal
                isOpen={isDeleteModalOpen}
                title="Supprimer l'article"
                message="Êtes-vous sûr de vouloir supprimer cet article de la base de connaissances ? Il ne sera plus affiché aux utilisateurs."
                onConfirm={confirmDelete}
                onCancel={() => setIsDeleteModalOpen(false)}
                confirmText="Supprimer"
                type="danger"
            />
        </PageLayout>
    );
};

export default AdminQANews;
