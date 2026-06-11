import React, { useState, useEffect, useMemo } from 'react';
import { BrainCircuit, ArrowRight, Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';
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
    }, [stats, loading, i18n.language, customBrief]);

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

    const dynamicAnchor = useMemo(() => {
        if (loading || (stats.totalUsers === 0 && stats.activeProjects === 0)) {
            return anchorId;
        }
        if (stats.successRate < 70 && stats.successRate > 0) {
            return 'execution-trend';
        }
        if (stats.openAnomalies > 10) {
            return 'anomaly-distribution';
        }
        return anchorId;
    }, [stats, loading, anchorId]);

    const scrollToAnomalies = () => {
        if (onViewAnalysis) {
            onViewAnalysis();
            return;
        }
        const element = document.getElementById(dynamicAnchor);
        if (element) {
            element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="relative mb-8"
        >
            {/* Clean, elegant card background */}
            <div className="absolute inset-0 bg-white dark:bg-[#111625] border border-slate-100 dark:border-white/[0.05] rounded-2xl shadow-sm" />
            
            <div className="relative p-5 flex flex-col md:flex-row items-center gap-5">
                {/* Minimal Icon Container */}
                <div className="flex-shrink-0">
                    <div className="w-10 h-10 rounded-lg bg-blue-500/5 dark:bg-blue-500/10 flex items-center justify-center border border-blue-500/10">
                        {loading ? (
                            <Loader2 className="w-4 h-4 text-blue-500 animate-spin" />
                        ) : (
                            <BrainCircuit className="w-4 h-4 text-blue-500" />
                        )}
                    </div>
                </div>

                {/* Content */}
                <div className="flex-1 text-center md:text-left">
                    <div className="flex items-center justify-center md:justify-start gap-2 mb-1">
                        <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                            {t('adminDashboard.aiExpertOpinion')}
                        </span>
                        {isTyping && (
                            <span className="flex gap-0.5 ml-1">
                                <span className="w-0.5 h-0.5 bg-slate-400 rounded-full animate-pulse" />
                                <span className="w-0.5 h-0.5 bg-slate-400 rounded-full animate-pulse [animation-delay:0.2s]" />
                                <span className="w-0.5 h-0.5 bg-slate-400 rounded-full animate-pulse [animation-delay:0.4s]" />
                            </span>
                        )}
                    </div>
                    <div className="min-h-[2rem] flex flex-col justify-center">
                        <p className="text-sm font-medium text-slate-700 dark:text-slate-200 leading-relaxed">
                            {displayText}
                            {isTyping && <span className="inline-block w-1 h-3.5 ml-1 bg-slate-400 dark:bg-slate-500 animate-pulse align-middle" />}
                        </p>
                    </div>
                </div>

                {/* Action Button */}
                <div className="flex-shrink-0">
                    <button
                        onClick={scrollToAnomalies}
                        className="flex items-center gap-1.5 text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 font-bold text-sm transition-colors group"
                    >
                        <span>{t('adminDashboard.viewDetails')}</span>
                        <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" />
                    </button>
                </div>
            </div>
        </motion.div>
    );
};

export default AIBriefCard;
