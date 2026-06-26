import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { X, ShieldAlert, User, Tag, FileText, AlertOctagon, AlertCircle, ExternalLink, Calendar, Info, Terminal, ChevronDown, ChevronUp, Download, Image as ImageIcon } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useTheme } from '../context/ThemeContext';

const highlightCode = (raw: string): string => {
    if (!raw) return '';
    return raw
        .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
        .replace(/(['"`])(.*?)\1/g, '<span style="color:#86efac">$&</span>')
        .replace(/\b(import|from|export|const|let|var|await|async|function|return|if|else|for|while|try|catch|new|of|in|true|false|null|undefined)\b/g, '<span style="color:#f472b6">$1</span>')
        .replace(/\b(test|expect|page|describe|beforeAll|afterAll|beforeEach|afterEach|locator|click|fill|goto|type|press|check|uncheck|selectOption|waitForSelector|waitForLoadState|toBeVisible|toContainText|toHaveText|toHaveValue|toHaveURL|first|last|nth|evaluate|dispatchEvent)\b/g, '<span style="color:#60a5fa">$1</span>')
        .replace(/(?<![a-zA-Z#])\b(\d+)\b/g, '<span style="color:#c084fc">$1</span>')
        .replace(/(\/\/[^\n]*)/g, '<span style="color:#64748b;font-style:italic">$1</span>')
        .replace(/([{}()[\]])/g, '<span style="color:#fbbf24">$1</span>');
};

interface AnomalyDetailModalProps {
    anomaly: any;
    onClose: () => void;
}

const AnomalyDetailModal: React.FC<AnomalyDetailModalProps> = ({ anomaly, onClose }) => {
    const { t } = useTranslation();
    const { resolvedTheme } = useTheme();
    const isDark = resolvedTheme === 'dark';
    const [showFullLogs, setShowFullLogs] = useState(false);
    const [lightbox, setLightbox] = useState<'image' | 'video' | null>(null);

    const ui = {
        overlay: isDark ? 'bg-black/75' : 'bg-slate-900/40',
        panel: isDark
            ? 'bg-[#111827] border-white/10 shadow-black/60'
            : 'bg-white border-slate-200 shadow-slate-300/50',
        headerBorder: isDark ? 'border-white/[0.06]' : 'border-slate-200',
        card: isDark ? 'bg-white/[0.03] border-white/[0.06]' : 'bg-slate-50 border-slate-200',
        cardLabel: isDark ? 'text-white/30' : 'text-slate-500',
        cardValue: isDark ? 'text-white' : 'text-slate-900',
        sectionLabel: isDark ? 'text-white/30' : 'text-slate-500',
        bodyText: isDark ? 'text-white/75' : 'text-slate-700',
        mutedText: isDark ? 'text-white/25' : 'text-slate-400',
        descBox: isDark ? 'bg-white/[0.03] border-white/[0.06]' : 'bg-slate-50 border-slate-200',
        iconMuted: isDark ? 'text-white/30' : 'text-slate-400',
        title: isDark ? 'text-white' : 'text-slate-900',
        closeBtn: isDark
            ? 'border-white/10 bg-white/5 text-white/40 hover:text-white'
            : 'border-slate-200 bg-slate-100 text-slate-500 hover:text-slate-900',
        priorityBadge: isDark
            ? 'bg-[rgba(55,138,221,0.12)] text-[#85B7EB] border-[rgba(55,138,221,0.25)]'
            : 'bg-blue-50 text-blue-700 border-blue-200',
        visibilityBadge: isDark
            ? 'bg-white/5 text-white/40 border-white/10'
            : 'bg-slate-100 text-slate-500 border-slate-200',
        linkAccent: isDark ? 'text-[#85B7EB]' : 'text-blue-600',
        linkHover: isDark ? 'hover:text-white' : 'hover:text-blue-800',
        releaseBadge: isDark
            ? 'bg-[rgba(55,138,221,0.12)] text-[#85B7EB] border-[rgba(55,138,221,0.25)]'
            : 'bg-blue-50 text-blue-700 border-blue-200',
        campaignText: isDark ? 'text-white/75' : 'text-slate-800',
        relatedCard: isDark
            ? 'border-[rgba(55,138,221,0.2)] bg-[rgba(55,138,221,0.08)] hover:brightness-110'
            : 'border-blue-200 bg-blue-50 hover:brightness-95',
        relatedIconBg: isDark ? 'bg-[rgba(55,138,221,0.15)]' : 'bg-blue-100',
        videoCard: isDark
            ? 'border-[rgba(55,138,221,0.25)] bg-[rgba(55,138,221,0.06)]'
            : 'border-blue-200 bg-blue-50',
        videoIconBg: isDark
            ? 'bg-[rgba(55,138,221,0.2)] border-[rgba(55,138,221,0.4)]'
            : 'bg-blue-100 border-blue-300',
        footerBtn: isDark
            ? 'border-white/10 bg-white/5 text-white/50 hover:text-white hover:bg-white/10'
            : 'border-slate-200 bg-slate-100 text-slate-600 hover:text-slate-900 hover:bg-slate-200',
        proofBorder: isDark ? 'border-white/10' : 'border-slate-200',
        calendarIconBg: isDark ? 'bg-[rgba(55,138,221,0.12)]' : 'bg-blue-50',
        calendarIcon: isDark ? 'text-[#85B7EB]' : 'text-blue-600',
        userIconBg: isDark ? 'bg-purple-500/10' : 'bg-purple-50',
        userIcon: isDark ? 'text-purple-400' : 'text-purple-600',
        scriptLabel: isDark ? 'text-amber-400/60' : 'text-amber-700',
        scriptIcon: isDark ? 'text-amber-400/70' : 'text-amber-600',
    };

    const parseDescription = (desc: string | undefined) => {
        if (!desc) return { message: null, logs: null };

        const logMarkers = ['--- LOGS', 'Running 1 test', 'Running 0 test', '\n✘', '\n1 failed', '\n1 passed'];
        let message = desc;
        let logs: string | null = null;
        for (const marker of logMarkers) {
            const idx = desc.indexOf(marker);
            if (idx > 0) {
                message = desc.slice(0, idx).trim();
                logs = desc.slice(idx).trim();
                break;
            }
        }

        const cleanedLines = message.split('\n').filter(line => {
            const trimmed = line.trim();
            if (/^[-─]+$/.test(trimmed)) return false;
            if (/attachment\s*#\d+/i.test(trimmed)) return false;
            if (/test-results\//i.test(trimmed)) return false;
            if (/^Error Context:/i.test(trimmed)) return false;
            return true;
        });

        const cleanMessage = cleanedLines.join('\n').trim() || null;
        return { message: cleanMessage, logs };
    };

    const { message: descMessage, logs: descLogs } = parseDescription(anomaly.description);

    if (!anomaly) return null;

    const getImpactConfig = (impact: string) => {
        switch (impact) {
            case 'BLOQUANTES':
            case 'CRITIQUE':
                return { color: '#F87171', bg: 'rgba(239,68,68,0.12)', border: 'rgba(239,68,68,0.25)', icon: AlertOctagon };
            case 'MAJEUR':
                return { color: '#FB923C', bg: 'rgba(249,115,22,0.12)', border: 'rgba(249,115,22,0.25)', icon: AlertCircle };
            case 'MINEURS':
                return { color: '#FBBF24', bg: 'rgba(245,158,11,0.12)', border: 'rgba(245,158,11,0.25)', icon: ShieldAlert };
            case 'FONCTIONNALITE':
                return { color: '#60A5FA', bg: 'rgba(59,130,246,0.12)', border: 'rgba(59,130,246,0.25)', icon: Tag };
            default:
                return { color: '#94A3B8', bg: 'rgba(148,163,184,0.08)', border: 'rgba(148,163,184,0.15)', icon: Info };
        }
    };

    const cfg = getImpactConfig(anomaly.impact);
    const ImpactIcon = cfg.icon;
    const cleanTitle = (anomaly.title || '').replace(/^\[SCRIPT\]\s*/i, '');

    return (
        <div
            className={`fixed inset-0 z-[60] flex items-center justify-center p-4 backdrop-blur-md ${ui.overlay}`}
            onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
        >
            <motion.div
                key={resolvedTheme}
                initial={{ opacity: 0, y: 24, scale: 0.97 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 16, scale: 0.97 }}
                transition={{ duration: 0.22, ease: 'easeOut' }}
                className={`w-full max-w-[680px] max-h-[90vh] flex flex-col overflow-hidden rounded-2xl border shadow-2xl ${ui.panel}`}
            >
                <div style={{ height: '3px', background: cfg.color, opacity: 0.8 }} />

                <div className={`px-6 pt-5 pb-4 border-b ${ui.headerBorder}`}>
                    <div className="flex items-start justify-between gap-4">
                        <div className="space-y-3 flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                                <div
                                    className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest"
                                    style={{ background: cfg.bg, color: cfg.color, border: `0.5px solid ${cfg.border}` }}
                                >
                                    <ImpactIcon className="w-3 h-3" />
                                    {anomaly.impact}
                                </div>
                                <div className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest border ${ui.priorityBadge}`}>
                                    {anomaly.priority}
                                </div>
                                <div className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest border ${ui.visibilityBadge}`}>
                                    {anomaly.visibility}
                                </div>
                            </div>
                            <h2 className={`text-lg font-black leading-snug break-words ${ui.title}`}>
                                {cleanTitle.length > 120 ? cleanTitle.slice(0, 120) + '…' : cleanTitle}
                            </h2>
                        </div>
                        <button
                            onClick={onClose}
                            className={`shrink-0 p-1.5 rounded-lg border transition-colors ${ui.closeBtn}`}
                        >
                            <X className="w-4 h-4" />
                        </button>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto px-6 py-5">
                    <div className="space-y-5">
                        <div className="grid grid-cols-2 gap-3">
                            <div className={`flex items-center gap-3 rounded-xl p-3 border ${ui.card}`}>
                                <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${ui.calendarIconBg}`}>
                                    <Calendar className={`w-4 h-4 ${ui.calendarIcon}`} />
                                </div>
                                <div>
                                    <p className={`text-[9px] font-bold uppercase tracking-widest ${ui.cardLabel}`}>{t('anomalies.detail.reportedDate')}</p>
                                    <p className={`text-xs font-bold ${ui.cardValue}`}>{new Date(anomaly.created_at).toLocaleString(t('common.dateLocale'))}</p>
                                </div>
                            </div>
                            <div className={`flex items-center gap-3 rounded-xl p-3 border ${ui.card}`}>
                                <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${ui.userIconBg}`}>
                                    <User className={`w-4 h-4 ${ui.userIcon}`} />
                                </div>
                                <div>
                                    <p className={`text-[9px] font-bold uppercase tracking-widest ${ui.cardLabel}`}>{t('anomalies.detail.reporter')}</p>
                                    <p className={`text-xs font-bold ${ui.cardValue}`}>{anomaly.author_name || anomaly.author_username || t('anomalies.detail.defaultReporter')}</p>
                                </div>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <div className="flex items-center gap-1.5">
                                <FileText className={`w-3.5 h-3.5 ${ui.iconMuted}`} />
                                <span className={`text-[9px] font-bold uppercase tracking-widest ${ui.sectionLabel}`}>{t('anomalies.detail.details')}</span>
                            </div>
                            <div className={`rounded-xl border px-4 py-3.5 text-[13px] leading-relaxed ${ui.descBox} ${ui.bodyText}`}>
                                {descMessage || <span className={`italic ${ui.mutedText}`}>{t('anomalies.detail.noDescription')}</span>}
                            </div>
                        </div>

                        {descLogs && (
                            <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-1.5">
                                        <Terminal className={`w-3.5 h-3.5 ${isDark ? 'text-emerald-400/60' : 'text-emerald-600'}`} />
                                        <span className={`text-[9px] font-bold uppercase tracking-widest ${ui.sectionLabel}`}>{t('anomalies.detail.executionLogs')}</span>
                                    </div>
                                    <button
                                        onClick={() => setShowFullLogs(!showFullLogs)}
                                        className={`text-[10px] font-bold flex items-center gap-1 transition-colors ${ui.linkAccent} ${ui.linkHover}`}
                                    >
                                        {showFullLogs ? <><ChevronUp className="w-3 h-3" /> {t('anomalies.detail.collapseLogs')}</> : <><ChevronDown className="w-3 h-3" /> {t('anomalies.detail.expandLogs')}</>}
                                    </button>
                                </div>
                                <pre
                                    className={`bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-3 text-[10px] text-emerald-400 font-mono leading-relaxed whitespace-pre-wrap break-all overflow-auto transition-all duration-300 ${showFullLogs ? 'max-h-[360px]' : 'max-h-[72px]'}`}
                                >
                                    {descLogs}
                                </pre>
                            </div>
                        )}

                        {(anomaly.proofImage || anomaly.proofVideo) && (
                            <div className="space-y-2">
                                <div className="flex items-center gap-1.5">
                                    <ShieldAlert className={`w-3.5 h-3.5 ${ui.iconMuted}`} />
                                    <span className={`text-[9px] font-bold uppercase tracking-widest ${ui.sectionLabel}`}>{t('anomalies.detail.proofs')}</span>
                                </div>
                                <div className="flex gap-3 flex-wrap">
                                    {anomaly.proofImage && (
                                        <button
                                            onClick={() => setLightbox('image')}
                                            className={`relative group/img flex-1 min-w-[120px] rounded-xl overflow-hidden border cursor-pointer ${ui.proofBorder}`}
                                            title={t('anomalies.detail.fullscreen')}
                                        >
                                            <img src={anomaly.proofImage} alt="Capture" className="w-full object-cover max-h-40 block" />
                                            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover/img:opacity-100 transition-opacity flex flex-col items-center justify-center gap-1.5">
                                                <div className="bg-white/20 border border-white/30 rounded-lg px-3 py-1.5 flex items-center gap-1.5 text-white text-[10px] font-bold">
                                                    <ImageIcon className="w-3 h-3" />
                                                    {t('anomalies.detail.fullscreen')}
                                                </div>
                                            </div>
                                            <div className="absolute bottom-1.5 left-2 text-[8px] font-bold text-white/70 uppercase tracking-widest">{t('anomalies.detail.screenshot')}</div>
                                        </button>
                                    )}
                                    {anomaly.proofVideo && (
                                        <button
                                            onClick={() => setLightbox('video')}
                                            className={`relative group/vid flex-1 min-w-[120px] flex items-center justify-center rounded-xl overflow-hidden border min-h-[120px] cursor-pointer ${ui.videoCard}`}
                                            title={t('anomalies.detail.videoReplay')}
                                        >
                                            <div className="flex flex-col items-center gap-2">
                                                <div className={`w-11 h-11 rounded-full border flex items-center justify-center group-hover/vid:scale-110 transition-transform ${ui.videoIconBg}`}>
                                                    <svg className={`w-5 h-5 ${ui.linkAccent}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                                </div>
                                                <span className={`text-[9px] font-bold uppercase tracking-widest ${ui.linkAccent}`}>{t('anomalies.detail.videoReplay')}</span>
                                            </div>
                                        </button>
                                    )}
                                </div>
                            </div>
                        )}

                        {anomaly.playwright_script && (
                            <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-1.5">
                                        <FileText className={`w-3.5 h-3.5 ${ui.scriptIcon}`} />
                                        <span className={`text-[9px] font-bold uppercase tracking-widest ${ui.scriptLabel}`}>{t('anomalies.detail.playwrightScript')}</span>
                                    </div>
                                    <a
                                        href={`data:text/typescript;charset=utf-8,${encodeURIComponent(anomaly.playwright_script)}`}
                                        download={`test_${anomaly.id}.spec.ts`}
                                        className={`text-[10px] font-bold flex items-center gap-1 transition-colors ${ui.linkAccent} ${ui.linkHover}`}
                                    >
                                        <Download className="w-3 h-3" />
                                        {t('anomalies.detail.download')}
                                    </a>
                                </div>
                                <pre
                                    className="bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-3 text-[10px] text-slate-300 font-mono leading-relaxed whitespace-pre-wrap break-all max-h-[200px] overflow-auto"
                                    dangerouslySetInnerHTML={{ __html: highlightCode(anomaly.playwright_script) }}
                                />
                            </div>
                        )}

                        <div className="grid grid-cols-2 gap-3">
                            <div className={`rounded-xl p-3 border ${ui.card}`}>
                                <p className={`text-[9px] font-bold uppercase tracking-widest mb-1.5 ${ui.cardLabel}`}>{t('anomalies.detail.release')}</p>
                                <span className={`inline-block text-[11px] font-bold border rounded-md px-2 py-0.5 ${ui.releaseBadge}`}>
                                    {anomaly.release || '—'}
                                </span>
                            </div>
                            <div className={`rounded-xl p-3 border ${ui.card}`}>
                                <p className={`text-[9px] font-bold uppercase tracking-widest mb-1.5 ${ui.cardLabel}`}>{t('anomalies.detail.campaign')}</p>
                                <p className={`text-[11px] font-bold ${ui.campaignText}`}>{anomaly.campaign || '—'}</p>
                            </div>
                        </div>

                        {anomaly.relatedTest && (
                            <Link
                                to={`/execution?test=${encodeURIComponent(anomaly.relatedTest)}`}
                                className={`flex items-center gap-2.5 rounded-xl p-3.5 border transition-all group/link no-underline ${ui.relatedCard}`}
                            >
                                <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${ui.relatedIconBg}`}>
                                    <ShieldAlert className={`w-4 h-4 ${ui.linkAccent}`} />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className={`text-[9px] font-bold uppercase tracking-widest ${ui.linkAccent}`}>{t('anomalies.detail.relatedTest')}</p>
                                    <p className={`text-xs font-semibold truncate ${ui.title}`}>{anomaly.relatedTest}</p>
                                </div>
                                <ExternalLink className={`w-3.5 h-3.5 group-hover/link:translate-x-0.5 transition-transform ${isDark ? 'text-[#85B7EB]/50' : 'text-blue-400'}`} />
                            </Link>
                        )}
                    </div>
                </div>

                <div className={`px-6 py-3 border-t flex justify-end ${ui.headerBorder}`}>
                    <button
                        onClick={onClose}
                        className={`px-5 py-2 rounded-lg border text-[11px] font-bold uppercase tracking-widest transition-colors ${ui.footerBtn}`}
                    >
                        {t('anomalies.detail.close')}
                    </button>
                </div>
            </motion.div>

            {lightbox && (
                <div
                    className="fixed inset-0 z-[200] flex flex-col bg-black/95 backdrop-blur-xl"
                    onClick={() => setLightbox(null)}
                >
                    <div className="flex items-center justify-between px-6 py-4 border-b border-slate-700 shrink-0" onClick={e => e.stopPropagation()}>
                        <div>
                            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">
                                {lightbox === 'image' ? t('anomalies.detail.screenshot') : t('anomalies.detail.videoReplay')}
                            </p>
                            <h3 className="text-base font-bold text-white truncate max-w-lg">{anomaly.title}</h3>
                        </div>
                        <div className="flex items-center gap-3">
                            <a
                                href={lightbox === 'image' ? anomaly.proofImage : anomaly.proofVideo}
                                download
                                target="_blank"
                                rel="noreferrer"
                                onClick={e => e.stopPropagation()}
                                className={`text-[10px] font-bold flex items-center gap-1.5 px-3 py-1.5 rounded-lg uppercase tracking-widest no-underline ${lightbox === 'image' ? 'text-blue-300 bg-blue-500/10 border border-blue-500/20' : 'text-purple-300 bg-purple-500/10 border border-purple-500/20'}`}
                            >
                                <Download className="w-3 h-3" />
                                {t('anomalies.detail.download')}
                            </a>
                            <button
                                onClick={() => setLightbox(null)}
                                className="w-9 h-9 rounded-full bg-white/10 border border-white/15 flex items-center justify-center text-white/60 hover:text-white transition-colors cursor-pointer"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                    <div className="flex-1 flex items-center justify-center p-6" onClick={e => e.stopPropagation()}>
                        {lightbox === 'image' && anomaly.proofImage && (
                            <img
                                src={anomaly.proofImage}
                                alt="Capture d'écran"
                                className="max-w-full max-h-full object-contain rounded-xl border border-white/10"
                            />
                        )}
                        {lightbox === 'video' && anomaly.proofVideo && (
                            <video
                                src={anomaly.proofVideo}
                                controls
                                autoPlay
                                className="max-w-full max-h-full rounded-xl border border-purple-500/20"
                            />
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default AnomalyDetailModal;
