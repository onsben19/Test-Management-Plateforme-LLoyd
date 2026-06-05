import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { RefreshCw } from 'lucide-react';
import { analyticsService } from '../services/api';

const QANewsHub: React.FC = () => {
    const { t } = useTranslation();
    const [news, setNews] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchNews = async () => {
        setLoading(true);
        try {
            const res = await analyticsService.getQANews();
            setNews(res.data);
        } catch (error) {
            console.error('Erreur news:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchNews();
    }, []);

    return (
        <div className="relative overflow-hidden bg-slate-50 dark:bg-[#0A0F1C] border border-slate-200 dark:border-white/5 rounded-3xl p-10 shadow-[0_0_50px_-12px_rgba(0,0,0,0.5)]">
            {/* Background Ambient Glows */}
            <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none rounded-3xl">
                <div className="absolute -top-[10%] -left-[10%] w-[40%] h-[40%] bg-blue-900/10 rounded-full blur-[100px]" />
                <div className="absolute top-[20%] right-[10%] w-[30%] h-[30%] bg-indigo-900/10 rounded-full blur-[100px]" />
            </div>

            <div className="relative flex items-center justify-between mb-12 border-b border-slate-200 dark:border-white/5 pb-8">
                <div>
                    <h2 className="text-3xl font-light text-slate-100 tracking-wide">
                        Veille & Innovations <span className="font-semibold text-blue-400">IA</span>
                    </h2>
                    <p className="text-sm text-slate-400 font-medium mt-3 max-w-2xl leading-relaxed">
                        {t("Notre IA scrute en temps réel les meilleures sources mondiales de l'assurance qualité pour vous proposer des articles pertinents et des conseils d'experts actionnables.")}
                    </p>
                </div>
                <button 
                    onClick={fetchNews}
                    className="group p-4 rounded-full bg-slate-50 dark:bg-white/[0.02] hover:bg-slate-50 dark:bg-white/[0.05] transition-all duration-500 text-slate-400 hover:text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-white/5 active:scale-90"
                    disabled={loading}
                    title={t("Actualiser")}
                >
                    <RefreshCw size={20} className={`${loading ? 'animate-spin' : 'group-hover:rotate-180'} transition-transform duration-700`} />
                </button>
            </div>

            <div className="relative grid grid-cols-1 md:grid-cols-2 gap-6">
                {news.map((item, index) => (
                    <motion.div
                        key={item.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.1, duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
                        onClick={() => window.open(item.url, '_blank')}
                        className="group bg-slate-50 dark:bg-white/[0.01] border border-slate-200 dark:border-white/5 rounded-2xl p-8 hover:bg-slate-50 dark:bg-white/[0.03] hover:border-blue-500/30 transition-all duration-500 flex flex-col h-full cursor-pointer relative overflow-hidden"
                    >
                        {/* Hover Gradient Overlay */}
                        <div className="absolute inset-0 bg-gradient-to-br from-blue-500/[0.02] to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

                        <div className="relative flex justify-between items-start mb-6">
                            <span className="text-[11px] font-semibold text-blue-400/80 uppercase tracking-widest">
                                {item.source}
                            </span>
                        </div>

                        <h3 className="relative text-lg font-medium text-slate-800 dark:text-slate-200 mb-6 leading-relaxed group-hover:text-blue-300 transition-colors">
                            {item.title}
                        </h3>

                        {item.ai_tip && (
                            <div className="relative mt-auto border-l-2 border-indigo-500/40 pl-5 py-2">
                                <span className="block text-[10px] font-bold text-indigo-400/70 uppercase tracking-[0.2em] mb-2">
                                    {t("Analyse IA")}
                                </span>
                                <p className="text-sm text-slate-400 leading-relaxed italic">
                                    "{item.ai_tip.replace(/💡\s*Tip\s*:?|Tip\s*:?|Conseil\s*:?|💡/gi, '').trim()}"
                                </p>
                            </div>
                        )}
                        
                        <div className="relative mt-8 pt-6 border-t border-slate-200 dark:border-white/5 flex items-center justify-between text-[11px] font-medium text-slate-500">
                            <span>{item.created_at}</span>
                            <span className="uppercase tracking-widest text-blue-400/50 group-hover:text-blue-400 transition-colors duration-300">
                                {t("Consulter")}
                            </span>
                        </div>
                    </motion.div>
                ))}

                {news.length === 0 && !loading && (
                    <div className="col-span-full py-20 text-center">
                        <p className="text-sm font-medium text-slate-500 uppercase tracking-widest">
                            {t("Aucune donnée disponible pour le moment")}
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default QANewsHub;
