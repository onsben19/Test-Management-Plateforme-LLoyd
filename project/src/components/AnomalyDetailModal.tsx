import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { X, ShieldAlert, Clock, User, Tag, FileText, AlertOctagon, AlertCircle, ExternalLink, Calendar, Info, Terminal, ChevronDown, ChevronUp, Download, Image as ImageIcon, Video } from 'lucide-react';
import { Link } from 'react-router-dom';

const highlightCode = (raw: string): string => {
    if (!raw) return '';
    return raw
        .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
        // strings
        .replace(/(['"`])(.*?)\1/g, '<span style="color:#86efac">$&</span>')
        // keywords
        .replace(/\b(import|from|export|const|let|var|await|async|function|return|if|else|for|while|try|catch|new|of|in|true|false|null|undefined)\b/g, '<span style="color:#f472b6">$1</span>')
        // playwright / test methods
        .replace(/\b(test|expect|page|describe|beforeAll|afterAll|beforeEach|afterEach|locator|click|fill|goto|type|press|check|uncheck|selectOption|waitForSelector|waitForLoadState|toBeVisible|toContainText|toHaveText|toHaveValue|toHaveURL|first|last|nth|evaluate|dispatchEvent)\b/g, '<span style="color:#60a5fa">$1</span>')
        // numbers
        .replace(/(?<![a-zA-Z#])\b(\d+)\b/g, '<span style="color:#c084fc">$1</span>')
        // comments
        .replace(/(\/\/[^\n]*)/g, '<span style="color:#64748b;font-style:italic">$1</span>')
        // brackets
        .replace(/([{}()[\]])/g, '<span style="color:#fbbf24">$1</span>');
};

interface AnomalyDetailModalProps {
    anomaly: any;
    onClose: () => void;
}

const AnomalyDetailModal: React.FC<AnomalyDetailModalProps> = ({ anomaly, onClose }) => {
    const [showFullLogs, setShowFullLogs] = useState(false);
    const [lightbox, setLightbox] = useState<'image' | 'video' | null>(null);

    const parseDescription = (desc: string | undefined) => {
        if (!desc) return { message: null, logs: null };

        // Split off execution logs section
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

        // Clean the message: remove attachment lines and test-results paths
        const cleanedLines = message.split('\n').filter(line => {
            const t = line.trim();
            // Remove blank separator lines of dashes
            if (/^[-─]+$/.test(t)) return false;
            // Remove "attachment #N" lines
            if (/attachment\s*#\d+/i.test(t)) return false;
            // Remove file path lines (test-results/...)
            if (/test-results\//i.test(t)) return false;
            // Remove "Error Context:" lines
            if (/^Error Context:/i.test(t)) return false;
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
            className="fixed inset-0 z-[60] flex items-center justify-center p-4"
            style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(12px)' }}
            onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
        >
            <motion.div
                initial={{ opacity: 0, y: 24, scale: 0.97 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 16, scale: 0.97 }}
                transition={{ duration: 0.22, ease: 'easeOut' }}
                style={{
                    background: '#111827',
                    border: '0.5px solid rgba(255,255,255,0.09)',
                    borderRadius: '16px',
                    width: '100%',
                    maxWidth: '680px',
                    maxHeight: '90vh',
                    display: 'flex',
                    flexDirection: 'column',
                    overflow: 'hidden',
                    boxShadow: '0 32px 80px rgba(0,0,0,0.6)',
                }}
            >
                {/* ── Bande colorée impact ── */}
                <div style={{ height: '3px', background: cfg.color, opacity: 0.8 }} />

                {/* ── Header ── */}
                <div style={{ padding: '20px 24px 16px', borderBottom: '0.5px solid rgba(255,255,255,0.06)' }}>
                    <div className="flex items-start justify-between gap-4">
                        <div className="space-y-3 flex-1 min-w-0">
                            {/* Badges */}
                            <div className="flex items-center gap-2 flex-wrap">
                                <div
                                    className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest"
                                    style={{ background: cfg.bg, color: cfg.color, border: `0.5px solid ${cfg.border}` }}
                                >
                                    <ImpactIcon className="w-3 h-3" />
                                    {anomaly.impact}
                                </div>
                                <div
                                    className="px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest"
                                    style={{ background: 'rgba(55,138,221,0.12)', color: '#85B7EB', border: '0.5px solid rgba(55,138,221,0.25)' }}
                                >
                                    {anomaly.priority}
                                </div>
                                <div
                                    className="px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest"
                                    style={{ background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.4)', border: '0.5px solid rgba(255,255,255,0.08)' }}
                                >
                                    {anomaly.visibility}
                                </div>
                            </div>
                            {/* Titre */}
                            <h2 className="text-lg font-black text-white leading-snug break-words">
                                {cleanTitle.length > 120 ? cleanTitle.slice(0, 120) + '…' : cleanTitle}
                            </h2>
                        </div>
                        <button
                            onClick={onClose}
                            style={{ background: 'rgba(255,255,255,0.05)', border: '0.5px solid rgba(255,255,255,0.08)', borderRadius: '8px', padding: '6px', flexShrink: 0 }}
                            className="text-white/40 hover:text-white transition-colors"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    </div>
                </div>

                {/* ── Contenu scrollable ── */}
                <div className="flex-1 overflow-y-auto" style={{ padding: '20px 24px' }}>
                    <div className="space-y-5">

                        {/* Méta Date + Rapporteur */}
                        <div className="grid grid-cols-2 gap-3">
                            <div
                                className="flex items-center gap-3 rounded-xl p-3"
                                style={{ background: 'rgba(255,255,255,0.03)', border: '0.5px solid rgba(255,255,255,0.06)' }}
                            >
                                <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'rgba(55,138,221,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                    <Calendar className="w-4 h-4 text-[#85B7EB]" />
                                </div>
                                <div>
                                    <p style={{ fontSize: '9px', fontWeight: 700, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Date signalée</p>
                                    <p style={{ fontSize: '12px', fontWeight: 700, color: 'white' }}>{new Date(anomaly.created_at).toLocaleString('fr-FR')}</p>
                                </div>
                            </div>
                            <div
                                className="flex items-center gap-3 rounded-xl p-3"
                                style={{ background: 'rgba(255,255,255,0.03)', border: '0.5px solid rgba(255,255,255,0.06)' }}
                            >
                                <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'rgba(168,85,247,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                    <User className="w-4 h-4 text-purple-400" />
                                </div>
                                <div>
                                    <p style={{ fontSize: '9px', fontWeight: 700, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Rapporteur</p>
                                    <p style={{ fontSize: '12px', fontWeight: 700, color: 'white' }}>{anomaly.author_name || anomaly.author_username || 'Auditeur Système'}</p>
                                </div>
                            </div>
                        </div>

                        {/* Description */}
                        <div className="space-y-2">
                            <div className="flex items-center gap-1.5">
                                <FileText className="w-3.5 h-3.5 text-white/30" />
                                <span style={{ fontSize: '9px', fontWeight: 700, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Détails de l'anomalie</span>
                            </div>
                            <div
                                style={{ background: 'rgba(255,255,255,0.03)', border: '0.5px solid rgba(255,255,255,0.06)', borderRadius: '10px', padding: '14px 16px', fontSize: '13px', color: 'rgba(255,255,255,0.75)', lineHeight: '1.65' }}
                            >
                                {descMessage || <span style={{ fontStyle: 'italic', color: 'rgba(255,255,255,0.25)' }}>Aucune description détaillée.</span>}
                            </div>
                        </div>

                        {/* Logs Playwright */}
                        {descLogs && (
                            <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-1.5">
                                        <Terminal className="w-3.5 h-3.5 text-emerald-400/60" />
                                        <span style={{ fontSize: '9px', fontWeight: 700, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Logs d'exécution</span>
                                    </div>
                                    <button
                                        onClick={() => setShowFullLogs(!showFullLogs)}
                                        style={{ fontSize: '10px', fontWeight: 700, color: '#85B7EB', display: 'flex', alignItems: 'center', gap: '4px' }}
                                        className="hover:text-white transition-colors"
                                    >
                                        {showFullLogs ? <><ChevronUp className="w-3 h-3" /> Réduire</> : <><ChevronDown className="w-3 h-3" /> Voir les logs</>}
                                    </button>
                                </div>
                                <pre
                                    style={{
                                        background: '#0d1117',
                                        border: '0.5px solid rgba(255,255,255,0.07)',
                                        borderRadius: '10px',
                                        padding: '12px 14px',
                                        fontSize: '10px',
                                        color: '#86efac',
                                        fontFamily: 'monospace',
                                        lineHeight: '1.6',
                                        whiteSpace: 'pre-wrap',
                                        wordBreak: 'break-all',
                                        maxHeight: showFullLogs ? '360px' : '72px',
                                        overflow: 'auto',
                                        transition: 'max-height 0.3s ease',
                                    }}
                                >
                                    {descLogs}
                                </pre>
                            </div>
                        )}

                        {/* Preuves — image + vidéo */}
                        {(anomaly.proofImage || anomaly.proofVideo) && (
                            <div className="space-y-2">
                                <div className="flex items-center gap-1.5">
                                    <ShieldAlert className="w-3.5 h-3.5 text-white/30" />
                                    <span style={{ fontSize: '9px', fontWeight: 700, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Preuves</span>
                                </div>
                                <div className="flex gap-3 flex-wrap">
                                    {anomaly.proofImage && (
                                        <button
                                            onClick={() => setLightbox('image')}
                                            className="relative group/img flex-1 min-w-[120px]"
                                            style={{ borderRadius: '10px', overflow: 'hidden', border: '0.5px solid rgba(255,255,255,0.07)', cursor: 'pointer' }}
                                            title="Voir en plein écran"
                                        >
                                            <img src={anomaly.proofImage} alt="Capture" className="w-full object-cover" style={{ maxHeight: '160px', display: 'block' }} />
                                            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover/img:opacity-100 transition-opacity flex flex-col items-center justify-center gap-1.5">
                                                <div style={{ background: 'rgba(255,255,255,0.12)', border: '0.5px solid rgba(255,255,255,0.2)', borderRadius: '8px', padding: '6px 12px', display: 'flex', alignItems: 'center', gap: '5px', color: 'white', fontSize: '10px', fontWeight: 700 }}>
                                                    <ImageIcon className="w-3 h-3" />
                                                    Plein écran
                                                </div>
                                            </div>
                                            <div style={{ position: 'absolute', bottom: 6, left: 8, fontSize: '8px', fontWeight: 700, color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Capture d'écran</div>
                                        </button>
                                    )}
                                    {anomaly.proofVideo && (
                                        <button
                                            onClick={() => setLightbox('video')}
                                            className="relative group/vid flex-1 min-w-[120px] flex items-center justify-center"
                                            style={{ borderRadius: '10px', overflow: 'hidden', border: '0.5px solid rgba(55,138,221,0.25)', background: 'rgba(55,138,221,0.06)', minHeight: '120px', cursor: 'pointer' }}
                                            title="Lire la vidéo"
                                        >
                                            <div className="flex flex-col items-center gap-2">
                                                <div style={{ width: 44, height: 44, borderRadius: '50%', background: 'rgba(55,138,221,0.2)', border: '0.5px solid rgba(55,138,221,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center' }} className="group-hover/vid:scale-110 transition-transform">
                                                    <svg className="w-5 h-5 text-[#85B7EB]" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                                </div>
                                                <span style={{ fontSize: '9px', fontWeight: 700, color: '#85B7EB', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Replay vidéo</span>
                                            </div>
                                        </button>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* Script Playwright */}
                        {anomaly.playwright_script && (
                            <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-1.5">
                                        <FileText className="w-3.5 h-3.5 text-amber-400/70" />
                                        <span style={{ fontSize: '9px', fontWeight: 700, color: 'rgba(251,191,36,0.6)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Script Playwright</span>
                                    </div>
                                    <a
                                        href={`data:text/typescript;charset=utf-8,${encodeURIComponent(anomaly.playwright_script)}`}
                                        download={`test_${anomaly.id}.spec.ts`}
                                        style={{ fontSize: '10px', fontWeight: 700, color: '#85B7EB', display: 'flex', alignItems: 'center', gap: '4px' }}
                                        className="hover:text-white transition-colors"
                                    >
                                        <Download className="w-3 h-3" />
                                        Télécharger
                                    </a>
                                </div>
                                <pre
                                    style={{
                                        background: '#0d1117',
                                        border: '0.5px solid rgba(251,191,36,0.15)',
                                        borderRadius: '10px',
                                        padding: '12px 14px',
                                        fontSize: '10px',
                                        color: 'rgba(255,255,255,0.6)',
                                        fontFamily: 'monospace',
                                        lineHeight: '1.6',
                                        whiteSpace: 'pre-wrap',
                                        wordBreak: 'break-all',
                                        maxHeight: '200px',
                                        overflow: 'auto',
                                    }}
                                    dangerouslySetInnerHTML={{ __html: highlightCode(anomaly.playwright_script) }}
                                />
                            </div>
                        )}

                        {/* Localisation */}
                        <div className="grid grid-cols-2 gap-3">
                            <div
                                style={{ background: 'rgba(255,255,255,0.03)', border: '0.5px solid rgba(255,255,255,0.06)', borderRadius: '10px', padding: '12px 14px' }}
                            >
                                <p style={{ fontSize: '9px', fontWeight: 700, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '6px' }}>Release</p>
                                <span
                                    style={{ fontSize: '11px', fontWeight: 700, background: 'rgba(55,138,221,0.12)', color: '#85B7EB', border: '0.5px solid rgba(55,138,221,0.25)', borderRadius: '6px', padding: '2px 8px', display: 'inline-block' }}
                                >
                                    {anomaly.release || '—'}
                                </span>
                            </div>
                            <div
                                style={{ background: 'rgba(255,255,255,0.03)', border: '0.5px solid rgba(255,255,255,0.06)', borderRadius: '10px', padding: '12px 14px' }}
                            >
                                <p style={{ fontSize: '9px', fontWeight: 700, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '6px' }}>Campagne</p>
                                <p style={{ fontSize: '11px', fontWeight: 700, color: 'rgba(255,255,255,0.75)' }}>{anomaly.campaign || '—'}</p>
                            </div>
                        </div>

                        {/* Test lié */}
                        {anomaly.relatedTest && (
                            <Link
                                to={`/execution?test=${encodeURIComponent(anomaly.relatedTest)}`}
                                style={{ background: 'rgba(55,138,221,0.08)', border: '0.5px solid rgba(55,138,221,0.2)', borderRadius: '10px', padding: '12px 14px', display: 'flex', alignItems: 'center', gap: '10px', textDecoration: 'none' }}
                                className="hover:brightness-110 transition-all group/link"
                            >
                                <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'rgba(55,138,221,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                    <ShieldAlert className="w-4 h-4 text-[#85B7EB]" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p style={{ fontSize: '9px', fontWeight: 700, color: '#85B7EB', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Test lié</p>
                                    <p style={{ fontSize: '12px', fontWeight: 600, color: 'white' }} className="truncate">{anomaly.relatedTest}</p>
                                </div>
                                <ExternalLink className="w-3.5 h-3.5 text-[#85B7EB]/50 group-hover/link:translate-x-0.5 transition-transform" />
                            </Link>
                        )}
                    </div>
                </div>

                {/* ── Footer ── */}
                <div style={{ padding: '12px 24px', borderTop: '0.5px solid rgba(255,255,255,0.06)', display: 'flex', justifyContent: 'flex-end' }}>
                    <button
                        onClick={onClose}
                        style={{ background: 'rgba(255,255,255,0.05)', border: '0.5px solid rgba(255,255,255,0.09)', borderRadius: '8px', padding: '8px 20px', color: 'rgba(255,255,255,0.5)', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', cursor: 'pointer' }}
                        className="hover:text-white hover:bg-white/10 transition-colors"
                    >
                        Fermer
                    </button>
                </div>
            </motion.div>

            {/* ── Lightbox preuves ── */}
            {lightbox && (
                <div
                    className="fixed inset-0 z-[200] flex flex-col bg-black/95 backdrop-blur-xl"
                    onClick={() => setLightbox(null)}
                >
                    {/* Header */}
                    <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 flex-shrink-0" onClick={e => e.stopPropagation()}>
                        <div>
                            <p style={{ fontSize: '9px', fontWeight: 700, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 2 }}>
                                {lightbox === 'image' ? "Capture d'écran" : 'Replay vidéo'}
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
                                style={{ fontSize: '10px', fontWeight: 700, color: lightbox === 'image' ? '#60a5fa' : '#c084fc', display: 'flex', alignItems: 'center', gap: '5px', padding: '6px 12px', borderRadius: '8px', background: lightbox === 'image' ? 'rgba(96,165,250,0.1)' : 'rgba(192,132,252,0.1)', border: `0.5px solid ${lightbox === 'image' ? 'rgba(96,165,250,0.2)' : 'rgba(192,132,252,0.2)'}`, textTransform: 'uppercase', letterSpacing: '0.08em', textDecoration: 'none' }}
                            >
                                <Download className="w-3 h-3" />
                                Télécharger
                            </a>
                            <button
                                onClick={() => setLightbox(null)}
                                style={{ width: 36, height: 36, borderRadius: '50%', background: 'rgba(255,255,255,0.1)', border: '0.5px solid rgba(255,255,255,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
                                className="text-white/60 hover:text-white transition-colors"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                    {/* Content */}
                    <div className="flex-1 flex items-center justify-center p-6" onClick={e => e.stopPropagation()}>
                        {lightbox === 'image' && anomaly.proofImage && (
                            <img
                                src={anomaly.proofImage}
                                alt="Capture d'écran"
                                className="max-w-full max-h-full object-contain rounded-xl"
                                style={{ border: '0.5px solid rgba(255,255,255,0.07)' }}
                            />
                        )}
                        {lightbox === 'video' && anomaly.proofVideo && (
                            <video
                                src={anomaly.proofVideo}
                                controls
                                autoPlay
                                className="max-w-full max-h-full rounded-xl"
                                style={{ border: '0.5px solid rgba(168,85,247,0.2)' }}
                            />
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default AnomalyDetailModal;
