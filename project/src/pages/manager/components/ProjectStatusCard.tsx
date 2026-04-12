import React from 'react';
import { motion } from 'framer-motion';
import { ChevronRight, CheckCircle2, XCircle, Clock } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface ProjectStatusCardProps {
    project: any;
    onClick?: () => void;
}

const ProjectStatusCard: React.FC<ProjectStatusCardProps> = ({ project, onClick }) => {
    const { t } = useTranslation();

    // Fallback values if data is missing
    const status = project.status || 'Active';
    const progress = project.progress !== undefined ? project.progress : 65; // Example fallback
    const passed = project.passed || 0;
    const failed = project.failed || 0;
    const total = project.total || 0;
    const successRate = total > 0 ? Math.round((passed / total) * 100) : 0;

    return (
        <motion.div
            whileHover={{ y: -4, scale: 1.01 }}
            onClick={onClick}
            className="group relative p-6 bg-white dark:bg-white/5 border border-slate-200 dark:border-white/5 rounded-[2rem] hover:shadow-2xl hover:shadow-blue-500/10 transition-all cursor-pointer overflow-hidden"
        >
            <div className="absolute top-0 right-0 p-4 opacity-0 group-hover:opacity-100 transition-opacity">
                <div className="w-8 h-8 rounded-full bg-blue-500/10 flex items-center justify-center text-blue-600">
                    <ChevronRight className="w-5 h-5" />
                </div>
            </div>

            <div className="flex items-start justify-between mb-6">
                <div className="space-y-1">
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                        {project.title || project.name}
                    </h3>
                    <p className="text-xs text-slate-500 font-medium uppercase tracking-wider">
                        {project.release_name || t('common.noRelease')}
                    </p>
                </div>
                <div className={`px-3 py-1 rounded-full text-[10px] font-black tracking-tighter uppercase ${status === 'Active' ? 'bg-green-500/10 text-green-500' : 'bg-slate-500/10 text-slate-500'
                    }`}>
                    {status}
                </div>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="p-3 bg-slate-50 dark:bg-white/5 rounded-2xl border border-slate-100 dark:border-white/5">
                    <div className="flex items-center gap-2 mb-1">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                        <span className="text-[10px] font-bold text-slate-500 uppercase">{t('adminExecutions.stats.passed')}</span>
                    </div>
                    <div className="text-xl font-black text-slate-900 dark:text-white">{passed}</div>
                </div>
                <div className="p-3 bg-slate-50 dark:bg-white/5 rounded-2xl border border-slate-100 dark:border-white/5">
                    <div className="flex items-center gap-2 mb-1">
                        <XCircle className="w-3.5 h-3.5 text-rose-500" />
                        <span className="text-[10px] font-bold text-slate-500 uppercase">{t('adminExecutions.stats.failed')}</span>
                    </div>
                    <div className="text-xl font-black text-slate-900 dark:text-white">{failed}</div>
                </div>
            </div>

            <div className="space-y-3">
                <div className="flex justify-between items-end">
                    <div className="text-xs font-bold text-slate-500 uppercase">{t('dataDriven.timelineGuard.readinessScore')}</div>
                    <div className="text-sm font-black text-slate-900 dark:text-white">{successRate}%</div>
                </div>
                <div className="h-2 w-full bg-slate-100 dark:bg-white/10 rounded-full overflow-hidden">
                    <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${successRate}%` }}
                        className={`h-full rounded-full ${successRate > 80 ? 'bg-emerald-500' :
                                successRate > 50 ? 'bg-blue-500' :
                                    'bg-amber-500'
                            }`}
                    />
                </div>
            </div>
        </motion.div>
    );
};

export default ProjectStatusCard;
