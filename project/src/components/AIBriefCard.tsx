import React, { useState, useEffect, useMemo } from 'react';
import { Sparkles, BrainCircuit, ArrowRight, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';

interface AIBriefCardProps {
    stats: {
        totalUsers: number;
        activeProjects: number;
        openAnomalies: number;
        successRate: number;
    };
    loading?: boolean;
    onViewAnalysis?: () => void;
    anchorId?: string;
    customBrief?: string;
}

const AIBriefCard: React.FC<AIBriefCardProps> = ({
    stats,
    loading = false,
    onViewAnalysis,
    anchorId = 'anomaly-distribution',
    customBrief
}) => {
    const { t, i18n } = useTranslation();
    const [displayText, setDisplayText] = useState('');
    const [isTyping, setIsTyping] = useState(true);

    const fullText = useMemo(() => {
        if (customBrief) return customBrief;
        const isFR = i18n.language.startsWith('fr');

        if (loading || (stats.totalUsers === 0 && stats.activeProjects === 0)) {
            return isFR
                ? "Analyse des données en cours... Veuillez patienter pendant que l'expert IA audite vos indicateurs de performance."
                : "Analyzing data... Please wait while the AI expert audits your performance indicators.";
        }

        if (stats.successRate < 70 && stats.successRate > 0) {
            return isFR
                ? `Alerte : Le taux de succès global est de ${stats.successRate}%. Une investigation sur les régressions récentes est fortement recommandée.`
                : `Alert: Global success rate is at ${stats.successRate}%. An investigation into recent regressions is strongly recommended.`;
        }

        if (stats.openAnomalies > 10) {
            return isFR
                ? `Attention : ${stats.openAnomalies} anomalies critiques détectées. La priorité doit être mise sur la résolution avant la prochaine release.`
                : `Warning: ${stats.openAnomalies} critical anomalies detected. Priority should be given to resolution before the next release.`;
        }

        return isFR
            ? `Performance optimale confirmée. Avec ${stats.activeProjects} projets en cours et un taux de succès de ${stats.successRate}%, vos objectifs QA sont atteints.`
            : `Optimal performance confirmed. With ${stats.activeProjects} ongoing projects and a ${stats.successRate}% success rate, your QA goals are met.`;
    }, [stats, loading, i18n.language]);

    useEffect(() => {
        let i = 0;
        setDisplayText('');
        setIsTyping(true);

        // Speed up typing for longer messages
        const speed = fullText.length > 100 ? 15 : 30;

        const interval = setInterval(() => {
            setDisplayText(fullText.slice(0, i));
            i++;
            if (i > fullText.length) {
                clearInterval(interval);
                setIsTyping(false);
            }
        }, speed);

        return () => clearInterval(interval);
    }, [fullText]);

    const scrollToAnomalies = () => {
        if (onViewAnalysis) {
            onViewAnalysis(); // We'll keep it simple for now as the parent already has the ID in state, but usually passing it is better.
            return;
        }
        const element = document.getElementById(anchorId);
        if (element) {
            element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="relative overflow-hidden group mb-10"
        >
            {/* Background Layers */}
            <div className="absolute inset-0 bg-white/40 dark:bg-[#0f1423]/80 backdrop-blur-xl border border-white/20 dark:border-white/10 rounded-[2.5rem]" />
            <div className="absolute -inset-1 bg-gradient-to-r from-blue-600/20 to-purple-600/20 rounded-[2.5rem] blur-xl opacity-0 group-hover:opacity-100 transition duration-1000" />

            <div className="relative p-8 flex flex-col md:flex-row items-center gap-8">
                <div className="flex-shrink-0 relative">
                    <div className="w-20 h-20 rounded-[2rem] bg-gradient-to-br from-blue-500 to-indigo-600 p-[1px] shadow-lg shadow-blue-500/20">
                        <div className="w-full h-full rounded-[2rem] bg-white dark:bg-slate-900 flex items-center justify-center">
                            {loading ? (
                                <Loader2 className="w-10 h-10 text-blue-500 animate-spin" />
                            ) : (
                                <BrainCircuit className="w-10 h-10 text-blue-500 animate-pulse" />
                            )}
                        </div>
                    </div>
                    {!loading && <div className="absolute -top-1 -right-1 w-4 h-4 bg-emerald-500 rounded-full border-4 border-white dark:border-slate-950 animate-pulse" />}
                </div>

                <div className="flex-1 text-center md:text-left">
                    <div className="flex items-center justify-center md:justify-start gap-2 mb-3">
                        <Sparkles className="w-4 h-4 text-amber-500" />
                        <span className="text-[10px] font-black text-blue-600 dark:text-blue-400 uppercase tracking-[0.3em]">
                            {t('adminDashboard.aiExpertOpinion')}
                        </span>
                        {isTyping && (
                            <span className="flex gap-1 ml-2">
                                <span className="w-1 h-1 bg-blue-500 rounded-full animate-bounce [animation-delay:-0.3s]" />
                                <span className="w-1 h-1 bg-blue-500 rounded-full animate-bounce [animation-delay:-0.15s]" />
                                <span className="w-1 h-1 bg-blue-500 rounded-full animate-bounce" />
                            </span>
                        )}
                    </div>
                    <div className="min-h-[4rem] flex flex-col justify-center">
                        <p className="text-xl font-bold text-slate-900 dark:text-slate-100 leading-tight tracking-tight">
                            {displayText}
                            {isTyping && <span className="inline-block w-2.5 h-6 ml-1.5 bg-blue-500 animate-pulse align-middle" />}
                        </p>
                    </div>
                </div>

                <div className="flex-shrink-0">
                    <button
                        onClick={scrollToAnomalies}
                        className="flex items-center gap-3 px-8 py-4 rounded-2xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-black text-sm transition-all hover:scale-105 active:scale-95 shadow-xl shadow-blue-500/10 group/btn"
                    >
                        <span>{t('adminDashboard.viewDetails')}</span>
                        <ArrowRight className="w-4 h-4 group-hover/btn:translate-x-1 transition-transform" />
                    </button>
                </div>
            </div>

            {/* Decorative Stars */}
            <div className="absolute top-0 right-0 p-6 opacity-0 group-hover:opacity-10 transition-opacity pointer-events-none">
                <Sparkles className="w-32 h-32 text-blue-400" />
            </div>
        </motion.div>
    );
};

export default AIBriefCard;
