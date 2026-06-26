import React, { useEffect, useState } from 'react';
import { RefreshCw, Sparkles, Globe, Calendar, ArrowRight } from 'lucide-react';
import { analyticsService } from '../services/api';

const SourceLogo: React.FC<{ source: string; className?: string }> = ({ source, className = "w-[12px] h-[12px]" }) => {
    const srcLower = source.toLowerCase();
    if (srcLower.includes('ministry')) {
        return <img src="/logos/ministry_of_testing.png" alt="Ministry of Testing" className={`${className} object-contain`} />;
    }
    if (srcLower.includes('testim')) {
        return <img src="/logos/testim.png" alt="Testim.io" className={`${className} object-contain`} />;
    }
    if (srcLower.includes('applitools')) {
        return <img src="/logos/applitools.png" alt="Applitools" className={`${className} object-contain`} />;
    }
    return <Globe className={className} />;
};

const getSourceStyle = (source: string) => {
    const srcLower = source.toLowerCase();
    if (srcLower.includes('ministry')) {
        return { text: 'text-violet-600 dark:text-violet-400', label: 'Ministry of Testing', bg: 'from-violet-100 to-violet-200 dark:from-violet-900/40 dark:to-violet-950/60', glow: 'rgba(139,92,246,0.15)' };
    }
    if (srcLower.includes('testim')) {
        return { text: 'text-cyan-600 dark:text-cyan-400', label: 'Testim.io', bg: 'from-cyan-100 to-cyan-200 dark:from-cyan-900/40 dark:to-cyan-950/60', glow: 'rgba(6,182,212,0.15)' };
    }
    if (srcLower.includes('applitools')) {
        return { text: 'text-teal-600 dark:text-teal-400', label: 'Applitools', bg: 'from-teal-100 to-teal-200 dark:from-teal-900/40 dark:to-teal-950/60', glow: 'rgba(20,184,166,0.15)' };
    }
    return { text: 'text-blue-600 dark:text-[#85B7EB]', label: source, bg: 'from-blue-50 to-blue-100 dark:from-blue-900/30 dark:to-blue-950/50', glow: 'rgba(55,138,221,0.12)' };
};

const FILTERS = [
    "Tous", 
    "Automatisation", 
    "IA & Visual Testing", 
    "Stratégie & Pratiques", 
    "CI/CD & Deployments", 
    "Ministry of Testing", 
    "Testim", 
    "Applitools"
];

const QANewsHub: React.FC = () => {
    const [news, setNews] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeFilter, setActiveFilter] = useState("Tous");
    const [isRefreshing, setIsRefreshing] = useState(false);

    const handleScrapeAndFetch = async () => {
        setLoading(true);
        setIsRefreshing(true);
        try {
            // Trigger a fresh scrape on the backend
            await analyticsService.triggerQAScraping();
            await fetchNews();
        } catch (error) {
            console.error('Erreur scraping:', error);
            // Fallback to just fetching if scraping fails
            await fetchNews();
        }
    };

    const fetchNews = async () => {
        setLoading(true);
        setIsRefreshing(true);
        try {
            const res = await analyticsService.getQANews();
            
            // Enrich backend data with UI heuristics (emoji, tags)
            const enriched = (res.data || []).map((item: any, idx: number) => {
                const text = `${item.title} ${item.ai_tip}`.toLowerCase();
                const tags = [];
                
                if (text.includes('automat') || text.includes('playwright') || text.includes('selenium') || text.includes('cypress') || text.includes('code') || text.includes('script') || text.includes('api')) {
                    tags.push('Automatisation');
                }
                if (text.includes('ia') || text.includes('ai ') || text.includes('llm') || text.includes('gpt') || text.includes('visual') || text.includes('intelligence')) {
                    tags.push('IA & Visual Testing');
                }
                if (text.includes('lean') || text.includes('agile') || text.includes('fast') || text.includes('strat') || text.includes('practice') || text.includes('culture') || text.includes('team') || text.includes('management')) {
                    tags.push('Stratégie & Pratiques');
                }
                if (text.includes('prod') || text.includes('déploy') || text.includes('deploy') || text.includes('ci/') || text.includes('pipeline') || text.includes('flag') || text.includes('feature')) {
                    tags.push('CI/CD & Deployments');
                }

                if (tags.length === 0) tags.push('Général QA');

                const emojis = ['🚀', '📈', '🎭', '🔍', '⚡', '🤖', '🚩', '💡', '🛡️', '📊'];
                const emoji = emojis[idx % emojis.length];

                return {
                    ...item,
                    tags,
                    emoji,
                    featured: idx === 0,
                    date: item.created_at || "Aujourd'hui"
                };
            });

            setNews(enriched);
        } catch (error) {
            console.error('Erreur news:', error);
        } finally {
            setLoading(false);
            setIsRefreshing(false);
        }
    };

    useEffect(() => {
        fetchNews();
    }, []);

    const filteredArticles = news.filter(a => {
        if (activeFilter === "Tous") return true;
        // Check if filter matches source name
        if (a.source.toLowerCase().includes(activeFilter.toLowerCase())) return true;
        // Check if it matches tag
        return a.tags && a.tags.includes(activeFilter);
    });

    return (
        <div className="w-full h-full bg-transparent p-[30px] overflow-y-auto">
            <div className="max-w-[800px] mx-auto flex flex-col">
                
                {/* Header de page */}
                <div className="flex justify-between items-start mb-[20px]">
                    <div className="flex flex-col gap-[12px]">
                        <div>
                            <h2 className="text-[22px] font-[500] text-slate-900 dark:text-white">
                                Actualités <span className="text-[#378ADD]">QA</span>
                            </h2>
                            <p className="text-[12px] text-slate-500 dark:text-white/40 leading-[1.6] max-w-[560px] mt-[6px]">
                                Notre IA scrute en temps réel les meilleures sources mondiales de l'assurance qualité pour vous proposer des articles pertinents et des conseils d'experts actionnables.
                            </p>
                        </div>
                        
                        {/* Ligne de chips */}
                        <div className="flex gap-[8px]">
                            <div className="flex items-center gap-[4px] px-[10px] py-[4px] bg-[rgba(127,119,221,0.15)] border-[0.5px] border-[rgba(127,119,221,0.25)] rounded-[20px]">
                                <span className="text-[10px] font-medium text-[#AFA9EC]">IA active</span>
                            </div>
                            <div className="flex items-center gap-[6px] px-[10px] py-[4px] bg-[rgba(29,158,117,0.15)] rounded-[20px]">
                                <div className="w-[6px] h-[6px] rounded-full bg-[#5DCAA5] animate-pulse" />
                                <span className="text-[10px] font-medium text-[#5DCAA5]">{news.length} articles · En temps réel</span>
                            </div>
                        </div>
                    </div>

                    <button 
                        onClick={handleScrapeAndFetch}
                        disabled={loading}
                        className="px-3.5 py-1.5 rounded-xl bg-slate-100 dark:bg-white/5 border-[0.5px] border-slate-200 dark:border-white/10 text-slate-600 dark:text-white/70 hover:text-slate-900 dark:hover:text-white text-[11px] font-bold transition-all disabled:opacity-50"
                        title="Relancer le scraping IA"
                    >
                        {isRefreshing ? 'Actualisation...' : 'Actualiser'}
                    </button>
                </div>

                {/* Barre de filtres */}
                <div className="flex flex-wrap gap-[8px] mb-[16px]">
                    {FILTERS.map(f => {
                        const isActive = activeFilter === f;
                        const hasLogo = ["Ministry of Testing", "Testim", "Applitools"].includes(f);
                        return (
                            <button
                                key={f}
                                onClick={() => setActiveFilter(f)}
                                className={`flex items-center gap-[6px] px-[12px] py-[5px] rounded-[20px] text-[11px] font-[500] transition-colors border-[0.5px] ${
                                    isActive 
                                        ? 'bg-blue-50 dark:bg-[rgba(55,138,221,0.2)] text-blue-600 dark:text-[#85B7EB] border-blue-200 dark:border-[rgba(55,138,221,0.35)]' 
                                        : 'bg-slate-100 dark:bg-white/[0.04] text-slate-500 dark:text-white/40 border-slate-200 dark:border-white/10 hover:bg-slate-200 dark:hover:bg-white/[0.08]'
                                }`}
                            >
                                {hasLogo && <SourceLogo source={f} className="w-[12px] h-[12px] object-contain rounded-sm" />}
                                <span>{f}</span>
                            </button>
                        );
                    })}
                </div>

                {/* Grille d'articles */}
                <div className="grid grid-cols-2 gap-[12px] pb-[40px]">
                    {filteredArticles.map(article => {
                        const isFeatured = article.featured;
                        const style = getSourceStyle(article.source);
                        
                        return (
                            <div 
                                key={article.id}
                                className={`group bg-white dark:bg-white/[0.03] backdrop-blur-xl rounded-[14px] border-[0.5px] border-slate-200 dark:border-white/[0.08] hover:border-slate-300 dark:hover:border-white/15 transition-colors overflow-hidden shadow-sm dark:shadow-none ${
                                    isFeatured ? 'col-span-2 grid grid-cols-2' : 'flex flex-col'
                                }`}
                            >
                                {/* Zone Image */}
                                <div className={`relative flex items-center justify-center bg-gradient-to-b ${style.bg} ${
                                    isFeatured ? 'h-full min-h-[160px]' : 'h-[130px] w-full'
                                } overflow-hidden`}>
                                    {/* Glow halo */}
                                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                        <div className="w-24 h-24 rounded-full blur-2xl opacity-70" style={{ background: style.glow }} />
                                    </div>
                                    <SourceLogo source={article.source} className={`relative z-10 object-contain drop-shadow-xl ${isFeatured ? 'w-[88px] h-[88px]' : 'w-[72px] h-[72px]'}`} />
                                    <div className="absolute bottom-0 left-0 w-full h-[40%] bg-gradient-to-t from-slate-200/80 dark:from-[#0b0f19] to-transparent" />
                                </div>

                                {/* Body */}
                                <div className="flex flex-col flex-1 p-[14px] gap-[10px]">
                                    <div className="flex items-center gap-[6px]">
                                        <SourceLogo source={article.source} className="w-[14px] h-[14px] object-contain rounded-sm" />
                                        <span className={`text-[10px] uppercase font-[700] tracking-[0.07em] ${style.text}`}>
                                            {style.label}
                                        </span>
                                    </div>
                                    
                                    <div className="flex flex-wrap gap-[6px]">
                                        {article.tags.map(tag => {
                                            let bg = 'bg-[rgba(55,138,221,0.12)]', text = 'text-[#85B7EB]';
                                            if (tag === 'Feature flags') { bg = 'bg-[rgba(29,158,117,0.12)]'; text = 'text-[#5DCAA5]'; }
                                            if (tag === 'Lean testing') { bg = 'bg-[rgba(127,119,221,0.12)]'; text = 'text-[#AFA9EC]'; }
                                            return (
                                                <span key={tag} className={`px-[8px] py-[2px] rounded-[20px] text-[10px] font-[500] ${bg} ${text}`}>
                                                    {tag}
                                                </span>
                                            );
                                        })}
                                    </div>
                                    
                                    <h3 className={`text-slate-900 dark:text-white font-[500] leading-[1.4] ${
                                        isFeatured ? 'text-[16px]' : 'text-[14px]'
                                    }`} style={{ display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                                        {article.title}
                                    </h3>
                                    
                                    <div className="bg-blue-50 dark:bg-[#0d1a2e] border-l-[2px] border-[#378ADD] rounded-r-[8px] p-[8px_10px]">
                                        <div className="flex items-center gap-[4px] mb-[3px]">
                                            <span className="text-[9px] text-[#378ADD] uppercase font-[600]">Analyse IA</span>
                                        </div>
                                        <p className="text-[11px] italic text-slate-600 dark:text-white/45 leading-[1.5]" style={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                                            {article.ai_tip}
                                        </p>
                                    </div>
                                    
                                    {/* Footer */}
                                    <div className="mt-auto pt-[8px] border-t-[0.5px] border-slate-200 dark:border-white/[0.06] flex justify-between items-center">
                                        <div className="flex items-center gap-[6px] text-slate-400 dark:text-white/25">
                                            <span className="text-[11px] font-[500]">{article.date}</span>
                                        </div>
                                        <button 
                                            onClick={() => window.open(article.url, '_blank')}
                                            className="flex items-center gap-[4px] text-[#378ADD] text-[11px] font-[500] hover:text-[#5B9FE0] transition-colors"
                                        >
                                            Consulter
                                        </button>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
};

export default QANewsHub;
