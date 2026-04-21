import React from 'react';
import { useTranslation } from 'react-i18next';
import { X, MessageSquare, CheckCircle, XCircle, Clock, ArrowRight, User, Hash, Calendar, Layers } from 'lucide-react';
import { motion } from 'framer-motion';
import { type TestItem } from './ExecutionTestList';
import { useNavigate } from 'react-router-dom';

interface ReviewPanelProps {
    test: TestItem | null;
    onClose: () => void;
    onUpdate?: (updates: any) => void;
    embed?: boolean;
    readOnly?: boolean;
}

const ReviewPanel: React.FC<ReviewPanelProps> = ({ test, onClose, onUpdate, embed = false, readOnly = false }) => {
    const { t } = useTranslation();
    const navigate = useNavigate();

    if (!test) return null;

    return (
        <div className="h-full w-full bg-[#0b0e14] flex flex-col">
            {/* Header */}
            <div className="p-8 pb-6 border-b border-white/5 flex items-center justify-between bg-gradient-to-b from-white/[0.03] to-transparent backdrop-blur-3xl">
                <div className="flex items-center gap-6 overflow-hidden">
                    <div className="w-16 h-16 bg-[#1a1f2e] rounded-2xl flex items-center justify-center border border-white/10 flex-shrink-0 shadow-2xl relative">
                        <Hash className="w-7 h-7 text-blue-400" />
                        <div className="absolute -top-1 -right-1 w-3 h-3 bg-blue-500 rounded-full border-2 border-[#0b0e14]" />
                    </div>
                    <div className="overflow-hidden">
                        <h2 className="text-2xl font-black text-white truncate tracking-tighter leading-none mb-2" title={test.name}>
                            {test.name || t('execution.list.untitled')}
                        </h2>
                        <div className="flex items-center gap-3">
                            <span className="text-[10px] font-black text-slate-500 bg-white/5 px-3 py-1 rounded-lg border border-white/5 uppercase tracking-[0.2em]">#{test.id}</span>
                            <span className={`flex items-center gap-2 text-[10px] font-black px-3 py-1 rounded-lg uppercase tracking-[0.2em] border shadow-lg ${test.status === 'passed' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20 shadow-emerald-500/5' :
                                test.status === 'failed' ? 'bg-rose-500/20 text-rose-400 border-rose-500/20 shadow-rose-500/5' :
                                    'bg-slate-500/10 text-slate-400 border-slate-500/20'
                                }`}>
                                {test.status === 'failed' && <XCircle className="w-3 h-3" />}
                                {test.status === 'passed' && <CheckCircle className="w-3 h-3" />}
                                {t(`status.${test.status || 'pending'}`)}
                            </span>
                        </div>
                    </div>
                </div>
                <button
                    onClick={onClose}
                    className="p-4 bg-white/5 hover:bg-white/10 rounded-2xl text-slate-500 hover:text-white transition-all active:scale-90 border border-white/5 group"
                >
                    <X className="w-6 h-6 group-hover:rotate-90 transition-transform duration-300" />
                </button>
            </div>

            {/* Content Body - Minimalist & Informative */}
            <div className="flex-1 overflow-y-auto p-12 space-y-12 custom-scrollbar">
                <section className="space-y-6">
                    <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em]">Informations Générales</h3>
                    <div className="grid grid-cols-1 gap-4">
                        <div className="bg-white/[0.02] border border-white/5 rounded-3xl p-6 flex items-center gap-6">
                            <div className="w-12 h-12 bg-blue-600/10 rounded-2xl flex items-center justify-center text-blue-400 border border-blue-500/10">
                                <User size={20} />
                            </div>
                            <div className="flex-1">
                                <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">Réalisé par</p>
                                <p className="text-sm font-bold text-white">{test.realized_by || 'Non assigné'}</p>
                            </div>
                        </div>

                        <div className="bg-white/[0.02] border border-white/5 rounded-3xl p-6 flex items-center gap-6">
                            <div className="w-12 h-12 bg-indigo-600/10 rounded-2xl flex items-center justify-center text-indigo-400 border border-indigo-500/10">
                                <Calendar size={20} />
                            </div>
                            <div className="flex-1">
                                <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">Dernière Run</p>
                                <p className="text-sm font-bold text-white">{test.lastRun}</p>
                            </div>
                        </div>

                        <div className="bg-white/[0.02] border border-white/5 rounded-3xl p-6 flex items-center gap-6">
                            <div className="w-12 h-12 bg-emerald-600/10 rounded-2xl flex items-center justify-center text-emerald-400 border border-emerald-500/10">
                                <Layers size={20} />
                            </div>
                            <div className="flex-1">
                                <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">Contexte Release</p>
                                <div className="flex items-center gap-2">
                                    <p className="text-sm font-bold text-white">{test.businessProject} &gt; {test.release}</p>
                                    {test.releaseType && (
                                        <span className={`text-[8px] px-2 py-0.5 rounded-md font-black uppercase tracking-widest ${test.releaseType === 'PREPROD' ? 'bg-indigo-500/20 text-indigo-400' : 'bg-emerald-500/20 text-emerald-400'}`}>
                                            {test.releaseType}
                                        </span>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                <section className="space-y-6">
                    <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em]">Communication</h3>
                    <div className="bg-gradient-to-br from-blue-600/20 to-indigo-600/10 border border-blue-500/20 rounded-[2.5rem] p-10 text-center space-y-8 shadow-2xl shadow-blue-900/10">
                        <div className="w-20 h-20 bg-blue-600 rounded-3xl flex items-center justify-center mx-auto shadow-2xl shadow-blue-500/40">
                            <MessageSquare size={32} className="text-white" />
                        </div>
                        <div className="space-y-3">
                            <h4 className="text-xl font-black text-white tracking-tight uppercase">Messagerie Centralisée</h4>
                            <p className="text-xs font-bold text-slate-400 leading-relaxed mx-auto max-w-[280px]">
                                Les discussions contextuelles ont été déplacées vers le nouveau **Chat Center** pour une meilleure supervision.
                            </p>
                        </div>
                        <button
                            onClick={() => navigate(`/chat?testCaseId=${test.id}`)}
                            className="w-full py-4 bg-white text-blue-600 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] hover:bg-blue-50 transition-all flex items-center justify-center gap-3 active:scale-95 shadow-xl"
                        >
                            Accéder à la discussion
                            <ArrowRight size={14} />
                        </button>
                    </div>
                </section>
            </div>
        </div>
    );
};

export default ReviewPanel;
