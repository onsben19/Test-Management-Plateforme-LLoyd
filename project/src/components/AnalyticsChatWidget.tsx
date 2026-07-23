import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import {
    Send, Bot, User, Database,
    PanelLeft, PanelLeftClose, Paperclip, X, Plus, Pencil, Check, Download,
    CheckCircle, PieChart, Activity, Zap, Loader, WandSparkles, Play, Bookmark, Edit2, TrendingUp, Sparkles
} from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'react-toastify';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
    ResponsiveContainer
} from 'recharts';
import Plot from 'react-plotly.js';
import { aiService, savedVisualizationService } from '../services/api';
import StarBorder from './bits/StarBorder';

interface Message {
    id: string;
    sender: 'user' | 'agent';
    text: string;
    type?: 'text' | 'bar' | 'line' | 'table' | 'metric' | 'error' | 'plotly';
    data?: any;
    sql?: string;
    file?: string;     // URL or base64 preview
    fileName?: string; // Original name
    timestamp: Date;
}

interface AnalyticsChatWidgetProps {
    embedded?: boolean;
    conversationId?: string | null;
    onConversationUpdate?: () => void;
    onToggleSidebar?: () => void;
    isSidebarOpen?: boolean;
    onConversationStarted?: (id: string) => void;
}

const AnalyticsChatWidget: React.FC<AnalyticsChatWidgetProps> = ({
    embedded = false,
    conversationId,
    onConversationUpdate,
    onToggleSidebar,
    isSidebarOpen = true,
    onConversationStarted,
}) => {
    const { t } = useTranslation();
    const WELCOME_MSG: Message = {
        id: 'welcome',
        sender: 'agent',
        text: t('analytics.chat.welcome'),
        type: 'text',
        timestamp: new Date()
    };

    const [messages, setMessages] = useState<Message[]>([WELCOME_MSG]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const [isReformulating, setIsReformulating] = useState(false);
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [filePreview, setFilePreview] = useState<string | null>(null);
    const [activeConvId, setActiveConvId] = useState<string | null>(conversationId ?? null);
    const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
    const [editingText, setEditingText] = useState('');
    
    // SQL Editor & Custom Dashboard States
    const [editingSqlMessageId, setEditingSqlMessageId] = useState<string | null>(null);
    const [editingSqlText, setEditingSqlText] = useState('');
    const [isExecutingSql, setIsExecutingSql] = useState(false);
    const [saveVisModal, setSaveVisModal] = useState<{ isOpen: boolean; msg: Message | null; title: string }>({ isOpen: false, msg: null, title: '' });
    const [isSavingVis, setIsSavingVis] = useState(false);

    const messagesEndRef = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const inputRef = useRef<HTMLTextAreaElement>(null);

    const scrollToBottom = useCallback(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, []);

    useEffect(() => {
        setActiveConvId(conversationId ?? null);
        if (conversationId) {
            fetchMessages(conversationId);
        } else {
            setMessages([WELCOME_MSG]);
        }
    }, [conversationId]);

    useEffect(() => { scrollToBottom(); }, [messages]);

    useEffect(() => {
        if (inputRef.current) {
            inputRef.current.style.height = 'auto';
            inputRef.current.style.height = `${Math.min(inputRef.current.scrollHeight, 200)}px`;
        }
    }, [input]);

    const fetchMessages = async (id: string) => {
        try {
            setLoading(true);
            const response = await aiService.getMessages(id);
            const data = response.data.results || response.data;
            const mapped: Message[] = data.map((msg: any) => ({
                id: msg.id,
                sender: msg.sender,
                text: msg.text,
                type: msg.type,
                sql: msg.sql,
                data: msg.data,
                file: msg.file,
                timestamp: new Date(msg.created_at)
            }));
            setMessages(mapped.length > 0 ? mapped : [WELCOME_MSG]);
        } catch {
            toast.error(t('analytics.toasts.errorHistory'));
        } finally {
            setLoading(false);
        }
    };

    const handleSendMessage = async (e?: React.FormEvent, overrideText?: string) => {
        e?.preventDefault();
        const text = overrideText ?? input;
        if (!text.trim() && !selectedFile) return;

        const userMsg: Message = {
            id: Date.now().toString(),
            sender: 'user',
            text,
            type: 'text',
            file: filePreview || undefined,
            fileName: selectedFile?.name,
            timestamp: new Date()
        };

        setMessages(prev => [...prev.filter(m => m.id !== 'welcome'), userMsg]);
        setInput('');
        setSelectedFile(null);
        setFilePreview(null);
        setLoading(true);

        try {
            const formData = new FormData();
            formData.append('query', text);
            if (activeConvId) formData.append('conversation_id', activeConvId);
            if (selectedFile) formData.append('file', selectedFile);

            const response = await aiService.ask(formData);
            const data = response.data;

            if (!activeConvId && data.conversation_id) {
                setActiveConvId(data.conversation_id);
                if (onConversationStarted) onConversationStarted(data.conversation_id);
            }

            const agentMsg: Message = {
                id: (Date.now() + 1).toString(),
                sender: 'agent',
                text: data.answer ?? t('analytics.chat.defaultAnswer'),
                type: data.type ?? 'text',
                data: data.data,
                sql: data.sql,
                file: data.file,
                timestamp: new Date()
            };

            setMessages(prev => [...prev, agentMsg]);
            if (onConversationUpdate) onConversationUpdate();
        } catch {
            setMessages(prev => [...prev, {
                id: (Date.now() + 1).toString(),
                sender: 'agent',
                text: t('analytics.chat.errorAgent'),
                type: 'error',
                timestamp: new Date()
            }]);
            toast.error(t('analytics.toasts.errorAgent'));
        } finally {
            setLoading(false);
        }
    };

    const handleReformulatePrompt = async () => {
        if (!input.trim() || isReformulating) return;
        setIsReformulating(true);
        try {
            const res = await aiService.reformulate(input, false, true);
            if (res.data?.reformulated_message) {
                setInput(res.data.reformulated_message);
            }
        } catch (e) {
            console.error(e);
            toast.error(t('analytics.toasts.reformulateError') || "Erreur lors de la reformulation");
        } finally {
            setIsReformulating(false);
        }
    };

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setSelectedFile(file);
            if (file.type.startsWith('image/')) {
                const reader = new FileReader();
                reader.onloadend = () => setFilePreview(reader.result as string);
                reader.readAsDataURL(file);
            } else {
                setFilePreview(null); // No preview for non-images
            }
        }
    };

    const handleEditSubmit = async (originalMsgId: string) => {
        const text = editingText.trim();
        if (!text) return;
        setMessages(prev => {
            const idx = prev.findIndex(m => m.id === originalMsgId);
            return idx === -1 ? prev : prev.slice(0, idx);
        });
        setEditingMessageId(null);
        setEditingText('');
        await handleSendMessage(undefined, text);
    };

    const handleExecuteSql = async (messageId: string) => {
        if (!editingSqlText.trim()) return;
        setIsExecutingSql(true);
        try {
            const response = await aiService.executeSql(editingSqlText, messageId);
            const updatedMsg = response.data;
            setMessages(prev => prev.map(m => m.id === messageId ? {
                ...m,
                sql: updatedMsg.sql,
                data: updatedMsg.data,
                type: updatedMsg.type
            } : m));
            setEditingSqlMessageId(null);
            toast.success("Requête SQL exécutée avec succès !");
        } catch (error: any) {
            console.error("SQL execution error", error);
            const errMsg = error.response?.data?.error || "Erreur lors de l'exécution de la requête SQL.";
            toast.error(`Erreur SQL : ${errMsg}`, { autoClose: 7000 });
        } finally {
            setIsExecutingSql(false);
        }
    };

    const handleSaveVisualization = async () => {
        if (!saveVisModal.title.trim() || !saveVisModal.msg) {
            toast.error("Veuillez saisir un titre.");
            return;
        }
        setIsSavingVis(true);
        try {
            const payload = {
                title: saveVisModal.title,
                query: saveVisModal.msg.text,
                sql: saveVisModal.msg.sql || '',
                type: saveVisModal.msg.type || 'table',
                data: saveVisModal.msg.data || []
            };
            await savedVisualizationService.save(payload);
            setSaveVisModal({ isOpen: false, msg: null, title: '' });
            toast.success("Visualisation ajoutée à votre tableau de bord !");
        } catch (error) {
            console.error("Failed to save visualization", error);
            toast.error("Impossible d'enregistrer la visualisation.");
        } finally {
            setIsSavingVis(false);
        }
    };

    const handleExportPDF = () => {
        if (messages.length <= 1) {
            toast.info(t('analytics.toasts.nothingToExport'));
            return;
        }

        const doc = new jsPDF();
        doc.setFontSize(18);
        doc.text(t('analytics.chat.pdfTitle'), 20, 20);
        doc.setFontSize(9);
        doc.text(`${t('analytics.chat.pdfDate')} : ${new Date().toLocaleString()}`, 20, 27);

        let y = 45;
        const margin = 20;
        const contentWidth = 210 - (margin * 2);

        messages.filter(m => m.id !== 'welcome').forEach((msg) => {
            if (y > 270) { doc.addPage(); y = 20; }
            doc.setFontSize(9);
            doc.text(msg.sender === 'user' ? t('analytics.chat.pdfUserLabel') : t('analytics.chat.pdfAiLabel'), margin, y);
            y += 5;
            doc.setFontSize(11);
            const textLines = doc.splitTextToSize(msg.text, contentWidth);
            doc.text(textLines, margin, y);
            y += (textLines.length * 6) + 5;
            if (msg.data && Array.isArray(msg.data) && msg.data.length > 0) {
                const keys = Object.keys(msg.data[0]);
                const labelKey = keys[0];
                const valueKey = keys.find(k => k !== labelKey && !isNaN(Number(msg.data[0][k])));

                // Draw a simple bar chart if type is bar
                if ((msg.type === 'bar' || !msg.type) && valueKey) {
                    const chartHeight = 40;
                    const chartWidth = contentWidth - 20;
                    const barWidth = (chartWidth / msg.data.length) * 0.6;
                    const maxValue = Math.max(...msg.data.map((d: any) => Number(d[valueKey]) || 0));
                    
                    doc.setDrawColor(220, 220, 220);
                    doc.line(margin, y + chartHeight, margin + chartWidth, y + chartHeight); // X axis
                    
                    msg.data.forEach((d: any, i: number) => {
                        const val = Number(d[valueKey]) || 0;
                        const h = maxValue > 0 ? (val / maxValue) * chartHeight : 0;
                        const x = margin + (i * (chartWidth / msg.data.length)) + 5;
                        
                        doc.setFillColor(59, 130, 246); // Blue
                        doc.rect(x, y + chartHeight - h, barWidth, h, 'F');
                    });
                    y += chartHeight + 10;
                }

                const head = [keys];
                const body = msg.data.map(row => Object.values(row));
                autoTable(doc, {
                    startY: y,
                    head: head,
                    body: body as any,
                    margin: { left: margin },
                    styles: { fontSize: 8 }
                });
                y = (doc as any).lastAutoTable.finalY + 15;
            } else {
                y += 5;
            }
        });

        doc.save(`rapport-analytics-${new Date().getTime()}.pdf`);
        toast.success(t('analytics.toasts.exportSuccess'));
    };

    const renderVisualization = (msg: Message) => {
        if (!msg.data) return null;
        if (msg.type === 'plotly') {
            let props = msg.data;
            if (typeof props === 'string') { try { props = JSON.parse(props); } catch { return null; } }
            const plotTitle = typeof props.layout?.title === 'object' ? props.layout.title.text : (typeof props.layout?.title === 'string' ? props.layout.title : null);

            return (
                <div className="mt-4 rounded-[2rem] overflow-hidden border border-slate-200 dark:border-slate-700/50 bg-white/50 dark:bg-slate-950/40 backdrop-blur-md p-8 w-full shadow-2xl flex flex-col items-center">
                    {plotTitle && (
                        <h4 className="text-lg font-bold text-slate-900 dark:text-slate-100 mb-6 text-center leading-tight">
                            {plotTitle}
                        </h4>
                    )}
                    <Plot
                        data={Array.isArray(props) ? props : (props.data || [])}
                        layout={{
                            autosize: true,
                            ...(props.layout || {}),
                            paper_bgcolor: 'transparent',
                            plot_bgcolor: 'transparent',
                            font: { color: 'var(--foreground)', family: 'Outfit, Inter, sans-serif', size: 13 },
                            showlegend: true,
                            legend: { orientation: 'h', y: -0.1, x: 0.5, xanchor: 'center' },
                            title: undefined,
                            margin: {
                                t: 20,
                                b: 80,
                                l: 40,
                                r: 40,
                                ...props.layout?.margin
                            },
                            height: 350,
                        }}
                        style={{ width: '100%', minHeight: '350px' }}
                        useResizeHandler
                        config={{
                            responsive: true,
                            displayModeBar: true,
                            displaylogo: false,
                            scrollZoom: false,
                            modeBarButtonsToRemove: ['toImage', 'select2d', 'lasso2d']
                        }}
                    />
                </div>
            );
        }
        if (!Array.isArray(msg.data) || msg.data.length === 0) return null;
        const keys = Object.keys(msg.data[0]);
        const labelKey = keys[0];
        const valueKey = keys.find(k => k !== labelKey && !isNaN(Number(msg.data[0][k])));
        const normalized = msg.data.map((row: any) => ({ ...row, ...(valueKey ? { [valueKey]: Number(row[valueKey]) } : {}) }));

        if (msg.type === 'metric') {
            return (
                <div className="mt-3 flex flex-col items-center justify-center p-6 bg-gradient-to-br from-blue-600 to-violet-600 rounded-2xl text-white text-center shadow-xl">
                    <span className="text-5xl font-black">{normalized[0][keys[0]]}</span>
                    <div className="mt-2 text-xs bg-slate-300 dark:bg-white/20 px-3 py-1 rounded-full">{keys[0].replace(/_/g, ' ')}</div>
                </div>
            );
        }

        if (valueKey && (msg.type === 'bar' || !msg.type)) {
            const labels = normalized.map((row: any) => String(row[labelKey] ?? ''));
            const maxLabelLen = Math.max(...labels.map((l: string) => l.length), 0);
            const useHorizontal = maxLabelLen > 18 || normalized.length > 6;
            const chartHeight = useHorizontal
                ? Math.min(520, Math.max(280, normalized.length * 44 + 40))
                : 300;
            const truncate = (val: string) => {
                const s = String(val ?? '');
                return s.length > 42 ? `${s.slice(0, 40)}…` : s;
            };
            const yAxisWidth = useHorizontal ? Math.min(220, Math.max(110, maxLabelLen * 6.5)) : 40;

            return (
                <div
                    className="mt-3 w-full p-4 sm:p-6 rounded-2xl border border-slate-200 dark:border-slate-700/50 bg-slate-50 dark:bg-white/[0.02] shadow-inner"
                    style={{ height: chartHeight }}
                >
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                            data={normalized}
                            layout={useHorizontal ? 'vertical' : 'horizontal'}
                            margin={useHorizontal
                                ? { top: 8, right: 24, left: 8, bottom: 8 }
                                : { top: 20, right: 24, left: 8, bottom: 48 }}
                        >
                            <defs>
                                <linearGradient id="colorValue" x1="0" y1="0" x2={useHorizontal ? '1' : '0'} y2={useHorizontal ? '0' : '1'}>
                                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.9}/>
                                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.35}/>
                                </linearGradient>
                            </defs>
                            <CartesianGrid
                                strokeDasharray="3 3"
                                horizontal={!useHorizontal}
                                vertical={useHorizontal}
                                stroke="rgba(148,163,184,0.12)"
                            />
                            {useHorizontal ? (
                                <>
                                    <XAxis
                                        type="number"
                                        fontSize={11}
                                        tickLine={false}
                                        axisLine={false}
                                        tick={{ fill: 'currentColor' }}
                                        className="text-slate-500 dark:text-slate-400"
                                    />
                                    <YAxis
                                        type="category"
                                        dataKey={labelKey}
                                        width={yAxisWidth}
                                        fontSize={10}
                                        tickLine={false}
                                        axisLine={false}
                                        tick={{ fill: 'currentColor' }}
                                        className="text-slate-600 dark:text-slate-300"
                                        tickFormatter={truncate}
                                        interval={0}
                                    />
                                </>
                            ) : (
                                <>
                                    <XAxis
                                        dataKey={labelKey}
                                        fontSize={11}
                                        tickLine={false}
                                        axisLine={false}
                                        tick={{ fill: 'currentColor' }}
                                        className="text-slate-500 dark:text-slate-400"
                                        tickFormatter={truncate}
                                        interval={0}
                                        height={48}
                                    />
                                    <YAxis
                                        fontSize={11}
                                        tickLine={false}
                                        axisLine={false}
                                        tick={{ fill: 'currentColor' }}
                                        className="text-slate-500 dark:text-slate-400"
                                        width={40}
                                    />
                                </>
                            )}
                            <Tooltip
                                contentStyle={{
                                    backgroundColor: '#0f172a',
                                    borderRadius: '12px',
                                    fontSize: '12px',
                                    border: '1px solid rgba(148,163,184,0.25)',
                                    color: '#f8fafc',
                                    boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.35)',
                                    maxWidth: 320,
                                    whiteSpace: 'normal',
                                }}
                                labelStyle={{ color: '#e2e8f0', fontWeight: 600, marginBottom: 4 }}
                                itemStyle={{ color: '#93c5fd' }}
                                cursor={{ fill: 'rgba(59, 130, 246, 0.12)' }}
                            />
                            <Bar
                                dataKey={valueKey}
                                fill="url(#colorValue)"
                                radius={useHorizontal ? [0, 8, 8, 0] : [8, 8, 0, 0]}
                                maxBarSize={useHorizontal ? 28 : 56}
                            />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            );
        }

        return (
            <div className="mt-3 rounded-2xl border border-slate-200 dark:border-slate-700/50 overflow-hidden">
                <div className="overflow-x-auto max-h-60">
                    <table className="min-w-full text-[11px]">
                        <thead className="bg-slate-50 dark:bg-slate-800 sticky top-0 font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                            <tr>{keys.map(k => <th key={k} className="px-4 py-2 text-left">{k.replace(/_/g, ' ')}</th>)}</tr>
                        </thead>
                        <tbody className="bg-white/50 dark:bg-slate-900/60 divide-y divide-slate-100 dark:divide-slate-800">
                            {normalized.map((row, i) => <tr key={i} className="hover:bg-blue-50 dark:hover:bg-blue-900/10 text-slate-700 dark:text-slate-300">{keys.map(k => <td key={k} className="px-4 py-2">{row[k]}</td>)}</tr>)}
                        </tbody>
                    </table>
                </div>
            </div>
        );
    };

    const renderMessage = (msg: Message) => {
        const isUser = msg.sender === 'user';
        const isEditing = editingMessageId === msg.id;

        return (
            <motion.div key={msg.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className={`flex gap-[12px] group ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
                <div className={`w-[28px] h-[28px] rounded-[8px] flex items-center justify-center shrink-0 ${isUser ? 'bg-[#185FA5]' : 'bg-[rgba(127,119,221,0.2)]'}`}>
                    {isUser ? <User className="w-[14px] h-[14px] text-white" /> : <span className="font-[500] text-[#AFA9EC] text-[12px]">IA</span>}
                </div>

                <div className={`flex flex-col ${msg.type === 'plotly' || msg.type === 'bar' ? 'w-full max-w-full' : 'max-w-[85%]'} ${isUser ? 'items-end' : 'items-start'}`}>
                    {isUser && isEditing ? (
                        <div className="flex flex-col gap-2 w-72">
                            <textarea autoFocus value={editingText} onChange={e => setEditingText(e.target.value)} className="w-full bg-slate-50 dark:bg-white/[0.03] backdrop-blur-md border border-[#378ADD] text-white rounded-xl px-3 py-2 text-sm resize-none focus:outline-none" rows={3} />
                            <div className="flex items-center justify-end gap-2">
                                <button onClick={() => setEditingMessageId(null)} className="text-xs text-slate-500 dark:text-white/50 px-3 py-1.5 rounded-lg hover:bg-slate-100 dark:bg-white/[0.05]">{t('analytics.chat.cancel')}</button>
                                <button onClick={() => handleEditSubmit(msg.id)} className="flex items-center gap-1.5 text-xs bg-[#185FA5] text-white px-3 py-1.5 rounded-lg"><Check className="w-3.5 h-3.5" />{t('analytics.chat.resend')}</button>
                            </div>
                        </div>
                    ) : (
                        <>
                            <div className={`relative px-[13px] py-[11px] border ${isUser ? 'bg-[#185FA5] text-slate-800 dark:text-[#e8eaf6] border-[#378ADD] rounded-[10px] rounded-tr-[2px]' : msg.type === 'error' ? 'bg-[rgba(255,0,0,0.1)] border-[rgba(255,0,0,0.2)] text-[#ff6b6b] rounded-[10px] rounded-tl-[2px]' : 'bg-slate-50 dark:bg-white/[0.03] backdrop-blur-md text-slate-800 dark:text-[#e8eaf6] border-slate-200 dark:border-white/[0.07] rounded-[10px] rounded-tl-[2px]'} ${msg.type === 'plotly' || msg.type === 'bar' ? 'w-full' : ''}`}>
                                {!isUser && (
                                    <div className="flex items-center gap-2 mb-2 pb-2 border-b border-slate-200 dark:border-white/[0.07]">
                                        <div className="px-2 py-0.5 bg-[rgba(55,138,221,0.1)] border-[0.5px] border-[rgba(55,138,221,0.2)] rounded-[4px] flex items-center">
                                            <span className="text-[9px] font-medium text-[#85B7EB] uppercase tracking-wider">Source Experte</span>
                                        </div>
                                        <div className="px-2 py-0.5 bg-[rgba(29,158,117,0.1)] border-[0.5px] border-[rgba(29,158,117,0.2)] rounded-[4px] flex items-center">
                                            <span className="text-[9px] font-medium text-[#5DCAA5] uppercase tracking-wider">Données Auditées</span>
                                        </div>
                                    </div>
                                )}
                                {(msg.file || msg.fileName) && (
                                    <div className="mb-3 rounded-xl overflow-hidden border border-slate-200 dark:border-white/10">
                                        {(msg.file?.match(/\.(jpeg|jpg|gif|png|webp|data:image)/i) || (msg.fileName?.match(/\.(jpeg|jpg|gif|png|webp)/i))) ? (
                                            <img src={msg.file} alt="File" className="w-full max-h-40 object-cover" />
                                        ) : (
                                            <div className="p-4 bg-slate-50 dark:bg-white/[0.02] flex items-center gap-3">
                                                <Paperclip className="w-5 h-5 text-[#85B7EB]" />
                                                <div className="flex flex-col">
                                                    <span className="text-xs font-medium text-slate-900 dark:text-white truncate max-w-[200px]">
                                                        {msg.fileName || msg.file?.split('/').pop() || 'Fichier'}
                                                    </span>
                                                    {msg.file && !msg.file.startsWith('data:') && (
                                                        <a href={msg.file} target="_blank" rel="noopener noreferrer" className="text-[10px] text-[#85B7EB] hover:underline">
                                                            Télécharger
                                                        </a>
                                                    )}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}
                                <p className="text-[13px] leading-[1.6] whitespace-pre-wrap">{msg.text}</p>
                                
                                {!isUser && msg.sql && (
                                    <div className="mt-4 pt-3 border-t border-slate-200 dark:border-white/[0.07]">
                                        <div className="flex items-center justify-between mb-2">
                                            <span className="text-[9px] font-medium text-slate-500 dark:text-white/40 uppercase tracking-wider flex items-center gap-1.5">
                                                <Zap className="w-[10px] h-[10px] text-[#D89B48]" />
                                                Raisonnement Cognitif
                                            </span>
                                            <div className="flex items-center gap-2">
                                                <span className="text-[8px] font-medium text-slate-500 dark:text-white/40 bg-slate-100 dark:bg-white/[0.05] px-2 py-0.5 rounded-full border border-slate-200 dark:border-white/10">SQL-Llama-3.3</span>
                                                {editingSqlMessageId !== msg.id && (
                                                    <button
                                                        onClick={() => { setEditingSqlMessageId(msg.id); setEditingSqlText(msg.sql || ''); }}
                                                        className="p-1 hover:bg-slate-100 dark:hover:bg-white/10 rounded-md text-slate-500 dark:text-white/40 hover:text-[#85B7EB] transition-colors"
                                                        title="Modifier la requête SQL"
                                                    >
                                                        <Edit2 className="w-3 h-3" />
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                        {editingSqlMessageId === msg.id ? (
                                            <div className="space-y-2 mt-2">
                                                <textarea
                                                    value={editingSqlText}
                                                    onChange={e => setEditingSqlText(e.target.value)}
                                                    className="w-full bg-slate-50 dark:bg-[#0b0e14] text-[#5DCAA5] font-mono text-[10px] rounded-[8px] p-3 border border-[#378ADD] focus:border-[#85B7EB] outline-none resize-none h-32"
                                                    disabled={isExecutingSql}
                                                />
                                                <div className="flex items-center justify-end gap-2">
                                                    <button
                                                        onClick={() => setEditingSqlMessageId(null)}
                                                        className="px-2.5 py-1 text-[10px] uppercase font-medium tracking-wider text-slate-500 dark:text-white/40 hover:bg-slate-100 dark:bg-white/[0.05] rounded-[6px] border border-slate-200 dark:border-white/10 transition-all"
                                                        disabled={isExecutingSql}
                                                    >
                                                        Annuler
                                                    </button>
                                                    <button
                                                        onClick={() => handleExecuteSql(msg.id)}
                                                        className="px-2.5 py-1 text-[10px] uppercase font-medium tracking-wider bg-[#185FA5] hover:bg-[#155393] text-white rounded-[6px] flex items-center gap-1 transition-all"
                                                        disabled={isExecutingSql}
                                                    >
                                                        {isExecutingSql ? (
                                                            <Loader className="w-3 h-3 animate-spin" />
                                                        ) : (
                                                            <Play className="w-3 h-3" />
                                                        )}
                                                        Exécuter
                                                    </button>
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="bg-slate-50 dark:bg-[#0b0e14] rounded-[8px] p-3 font-mono text-[10px] text-[#85B7EB] overflow-x-auto border border-slate-200 dark:border-white/5">
                                                <code className="whitespace-pre">{msg.sql}</code>
                                            </div>
                                        )}
                                    </div>
                                )}

                                {!isUser && msg.type !== 'text' && msg.type !== 'error' && (
                                    <div className="mt-3 space-y-2">
                                        <div className="flex justify-end">
                                            <button
                                                onClick={() => setSaveVisModal({ isOpen: true, msg: msg, title: '' })}
                                                className="flex items-center gap-1.5 text-[9px] uppercase tracking-wider font-medium text-[#85B7EB] bg-[rgba(55,138,221,0.1)] hover:bg-[rgba(55,138,221,0.15)] px-3 py-1.5 rounded-[8px] border border-[rgba(55,138,221,0.2)] transition-all"
                                            >
                                                <Bookmark className="w-[10px] h-[10px]" />
                                                Épingler au Dashboard
                                            </button>
                                        </div>
                                        {renderVisualization(msg)}
                                    </div>
                                )}
                            </div>
                            {isUser && <button onClick={() => { setEditingMessageId(msg.id); setEditingText(msg.text); }} className="mt-1 opacity-0 group-hover:opacity-100 flex items-center gap-1 text-[10px] text-slate-500 dark:text-white/40 hover:text-[#85B7EB] px-2 py-1 rounded-[6px] hover:bg-slate-100 dark:bg-white/[0.05]"><Pencil className="w-[10px] h-[10px]" />{t('analytics.chat.edit')}</button>}
                        </>
                    )}
                    <span className="text-[10px] mt-1 text-slate-400 dark:text-white/25 px-1">{msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                </div>
            </motion.div>
        );
    };

    const renderInput = () => (
        <div className="shrink-0 p-[12px_14px] border-t border-slate-200 dark:border-white/[0.07]">
            <div className="relative">
                {selectedFile && (
                    <div className="mb-4 relative inline-block group">
                        {filePreview ? (
                            <div className="relative">
                                <img src={filePreview} className="w-20 h-20 object-cover rounded-xl border border-slate-200 dark:border-white/10 shadow-xl" alt="Preview" />
                                <div className="absolute inset-0 bg-slate-100 dark:bg-slate-100 dark:bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity rounded-xl flex items-center justify-center">
                                    <X className="text-white w-6 h-6 cursor-pointer" onClick={() => { setSelectedFile(null); setFilePreview(null); }} />
                                </div>
                            </div>
                        ) : (
                            <div className="w-20 h-20 bg-slate-50 dark:bg-white/[0.03] backdrop-blur-md rounded-xl border border-slate-200 dark:border-white/10 flex flex-col items-center justify-center p-2 relative">
                                <Paperclip className="w-6 h-6 text-[#AFA9EC] mb-1" />
                                <span className="text-[10px] font-medium text-slate-500 dark:text-white/40 truncate w-full text-center px-1">{selectedFile.name}</span>
                                <button onClick={() => { setSelectedFile(null); setFilePreview(null); }} className="absolute -top-2 -right-2 bg-rose-500 text-white p-1 rounded-full shadow-lg hover:bg-rose-400 transition-colors"><X className="w-3 h-3" /></button>
                            </div>
                        )}
                    </div>
                )}
                
                <form onSubmit={handleSendMessage} className="relative flex items-center">
                    <input type="file" ref={fileInputRef} onChange={handleFileSelect} className="hidden" />
                    
                    <button 
                        type="button" 
                        onClick={() => fileInputRef.current?.click()} 
                        className="absolute left-2 w-[30px] h-[30px] flex items-center justify-center rounded-[8px] hover:bg-slate-100 dark:bg-white/[0.05] transition-colors"
                    >
                        <Paperclip className="w-[14px] h-[14px] text-slate-500 dark:text-white/40" />
                    </button>
                    
                    <textarea 
                        ref={inputRef} 
                        value={input} 
                        onChange={(e) => {
                            setInput(e.target.value);
                            e.target.style.height = 'auto';
                            e.target.style.height = e.target.scrollHeight + 'px';
                        }}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter' && !e.shiftKey) {
                                e.preventDefault();
                                if ((input.trim() || selectedFile) && !loading) {
                                    handleSendMessage(e as unknown as React.FormEvent);
                                    if (inputRef.current) inputRef.current.style.height = 'auto';
                                }
                            }
                        }}
                        placeholder="Posez une question sur vos données..." 
                        className="w-full bg-slate-50 dark:bg-white/[0.03] backdrop-blur-md border border-slate-200 dark:border-white/10 rounded-[10px] pl-[40px] pr-[85px] py-[12px] text-[12px] text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-white/40 outline-none resize-none overflow-hidden" 
                        disabled={loading} 
                        rows={1}
                        data-gramm="false"
                        spellCheck="false"
                    />
                    
                    <div className="absolute right-2 flex items-center gap-[6px]">
                        <button
                            type="button"
                            onClick={handleReformulatePrompt}
                            disabled={!input.trim() || isReformulating || loading}
                            className="w-[30px] h-[30px] flex items-center justify-center rounded-[8px] bg-[rgba(127,119,221,0.12)] border-[0.5px] border-[rgba(127,119,221,0.2)] disabled:opacity-30 transition-all"
                        >
                            {isReformulating ? <Loader className="w-3.5 h-3.5 animate-spin text-[#AFA9EC]" /> : <Sparkles className="w-3.5 h-3.5 text-[#AFA9EC]" />}
                        </button>
                        
                        <button 
                            type="submit" 
                            disabled={(!input.trim() && !selectedFile) || loading} 
                            className="w-[30px] h-[30px] flex items-center justify-center rounded-[8px] bg-[#185FA5] border-[0.5px] border-[#378ADD] disabled:opacity-30 transition-all"
                        >
                            <Send className="w-3.5 h-3.5 text-[#B5D4F4]" />
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );

    const renderMessages = () => (
        <div 
            className="flex-1 overflow-y-auto p-[20px] flex flex-col gap-[16px]"
            style={{
                scrollbarWidth: 'thin',
                scrollbarColor: 'rgba(255,255,255,0.1) transparent'
            }}
        >
            {messages.length <= 1 && messages[0]?.id === 'welcome' && (
                <div className="flex flex-col items-center py-6 w-full max-w-2xl mx-auto text-center">
                    <div className="w-[52px] h-[52px] rounded-[14px] bg-[rgba(127,119,221,0.2)] border-[0.5px] border-[rgba(127,119,221,0.3)] flex items-center justify-center mb-[16px]">
                        <span className="font-medium text-[#AFA9EC] text-[20px]">IA</span>
                    </div>
                    <h3 className="font-[500] text-slate-900 dark:text-white text-[16px] mb-1">Assistant Analytics</h3>
                    <p className="text-slate-500 dark:text-white/40 text-[12px] mb-[32px]">Analysez vos données de test en langage naturel</p>
                    
                    <div className="w-full text-left mb-[8px]">
                        <span className="text-[10px] uppercase text-slate-500 dark:text-white/30 tracking-wider font-medium">SUGGESTIONS — LANCER UN AUDIT COGNITIF</span>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-[10px] w-full">
                        {[
                            { key: 'quality', title: 'Analyse qualité des tests', desc: 'Taux de réussite, anomalies et tendances' },
                            { key: 'coverage', title: 'Couverture par module', desc: 'Zones testées vs non couvertes' },
                            { key: 'trends', title: 'Tendance des anomalies', desc: 'Évolution des bugs sur la période' },
                            { key: 'performance', title: 'Performances de l\'équipe', desc: 'Vélocité et charge par testeur' }
                        ].map(s => (
                            <button
                                key={s.key}
                                onClick={() => handleSendMessage(undefined, s.title)}
                                className="relative overflow-hidden flex flex-col justify-center bg-slate-50 dark:bg-[#1a2235] border-[0.5px] border-slate-200 dark:border-slate-200 dark:border-white/[0.07] hover:border-[rgba(127,119,221,0.4)] hover:shadow-[0_0_15px_rgba(127,119,221,0.1)] p-[14px_16px] rounded-[10px] transition-all duration-300 text-left group"
                            >
                                <div className="absolute inset-0 w-[200%] h-full bg-gradient-to-r from-transparent via-[rgba(255,255,255,0.06)] to-transparent -translate-x-[100%] group-hover:translate-x-[50%] transition-transform duration-[1200ms] ease-in-out" />
                                <span className="text-[13px] font-[500] text-slate-900 dark:text-white truncate relative z-10 mb-1">{s.title}</span>
                                <span className="text-[11px] text-[rgba(255,255,255,0.35)] leading-[1.4] line-clamp-2 relative z-10">{s.desc}</span>
                            </button>
                        ))}
                    </div>
                </div>
            )}
            <AnimatePresence initial={false}>{messages.filter(m => m.id !== 'welcome' || messages.length === 1).map(msg => <div key={msg.id} className="w-full">{renderMessage(msg)}</div>)}</AnimatePresence>
            {loading && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex gap-[12px]">
                    <div className="w-[28px] h-[28px] rounded-[8px] bg-[rgba(127,119,221,0.2)] flex items-center justify-center shrink-0">
                        <span className="font-[500] text-[#AFA9EC] text-[12px] animate-pulse">IA</span>
                    </div>
                    <div className="bg-slate-50 dark:bg-[#1a2235] border border-slate-200 dark:border-white/[0.07] rounded-[10px] rounded-tl-[2px] px-[16px] py-[12px] flex flex-col gap-2 min-w-[150px]">
                        <div className="flex items-center gap-1.5">
                            <span className="text-[9px] font-medium text-[#AFA9EC] uppercase tracking-wider">Audit en cours</span>
                            <div className="flex gap-1 ml-1">
                                {[0, 0.2, 0.4].map((delay, i) => (
                                    <motion.div 
                                        key={i} 
                                        animate={{ opacity: [0.3, 1, 0.3] }} 
                                        transition={{ repeat: Infinity, duration: 1, delay }} 
                                        className="w-[4px] h-[4px] bg-[#AFA9EC] rounded-full" 
                                    />
                                ))}
                            </div>
                        </div>
                    </div>
                </motion.div>
            )}
            <div ref={messagesEndRef} />
        </div>
    );

    const renderSaveVisModal = () => (
        <AnimatePresence>
            {saveVisModal.isOpen && (
                <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        className="w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-3xl p-6 shadow-2xl space-y-6"
                    >
                        <div className="flex justify-between items-center">
                            <h3 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-wider">Épingler au Dashboard</h3>
                            <button
                                onClick={() => setSaveVisModal({ isOpen: false, msg: null, title: '' })}
                                className="p-1.5 hover:bg-slate-100 dark:bg-white/5 rounded-full text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <div className="space-y-2">
                            <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">Titre de la visualisation</label>
                            <input
                                type="text"
                                value={saveVisModal.title}
                                onChange={e => setSaveVisModal(prev => ({ ...prev, title: e.target.value }))}
                                placeholder="Ex: Répartition des bugs par gravité"
                                className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-3 text-slate-900 dark:text-white placeholder:text-slate-500 outline-none focus:ring-2 focus:ring-blue-500/50 transition-all text-sm font-medium"
                                disabled={isSavingVis}
                            />
                        </div>
                        <div className="flex items-center justify-end gap-3 pt-2">
                            <button
                                onClick={() => setSaveVisModal({ isOpen: false, msg: null, title: '' })}
                                className="px-4 py-2 text-xs font-bold uppercase tracking-widest text-slate-500 hover:bg-slate-100 dark:bg-white/5 rounded-xl border border-slate-200 dark:border-white/5 transition-all"
                                disabled={isSavingVis}
                            >
                                Annuler
                            </button>
                            <button
                                onClick={handleSaveVisualization}
                                className="px-5 py-2 text-xs font-bold uppercase tracking-widest bg-blue-600 hover:bg-blue-500 text-white rounded-xl flex items-center gap-1.5 shadow-lg shadow-blue-500/20 active:scale-95 transition-all"
                                disabled={isSavingVis}
                            >
                                {isSavingVis ? <Loader className="w-4 h-4 animate-spin" /> : <Bookmark className="w-4 h-4" />}
                                Sauvegarder
                            </button>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );

    if (embedded) {
        return (
            <div className="w-full h-full min-h-0 flex flex-col bg-transparent relative overflow-hidden">
                {/* Header assistant */}
                <div className="shrink-0 p-[10px_14px] border-b border-slate-200 dark:border-white/[0.07] flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-[28px] h-[28px] rounded-[8px] bg-[rgba(127,119,221,0.2)] flex items-center justify-center shrink-0">
                            <span className="font-[500] text-[#AFA9EC] text-[12px]">IA</span>
                        </div>
                        <div className="flex flex-col">
                            <span className="font-[500] text-slate-900 dark:text-white text-[12px] leading-tight">Assistant IA</span>
                            <div className="flex items-center gap-1.5 mt-0.5">
                                <span className="w-[6px] h-[6px] rounded-full bg-[#5DCAA5]" />
                                <span className="text-[10px] text-[#5DCAA5] tracking-[0.04em]">Moteur cognitif actif</span>
                            </div>
                        </div>
                    </div>
                    
                    <button
                        onClick={() => { setMessages([WELCOME_MSG]); setActiveConvId(null); if (onConversationStarted) onConversationStarted(''); }}
                        className="flex items-center gap-1.5 px-[12px] py-[6px] rounded-[8px] bg-slate-100 dark:bg-white/[0.05] border border-slate-200 dark:border-white/10 text-slate-700 dark:text-white hover:bg-slate-200 dark:hover:bg-white/[0.08] transition-colors"
                    >
                        <Plus className="w-[11px] h-[11px]" />
                        <span className="text-[11px] font-medium">Nouveau</span>
                    </button>
                </div>
                
                {renderMessages()}
                {renderInput()}
                {renderSaveVisModal()}
                
                <style>{`
                    .flex-1::-webkit-scrollbar {
                        width: 3px;
                    }
                `}</style>
            </div>
        );
    }

    return (
        <div className="flex-1 flex flex-col min-h-0 bg-white dark:bg-slate-900">
            <div className="shrink-0 bg-slate-50 dark:bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-6 py-4 flex items-center justify-between">
                <div className="flex items-center gap-4">
                    {!embedded && onToggleSidebar && (
                        <button onClick={onToggleSidebar} className="p-2 -ml-2 text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-800 rounded-lg transition-all">{isSidebarOpen ? <PanelLeftClose className="w-5 h-5" /> : <PanelLeft className="w-5 h-5" />}</button>
                    )}
                    <div>
                        <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2"><div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />Assistant IA</h2>
                        <p className="text-xs text-slate-400 dark:text-slate-500 font-medium tracking-wide uppercase">Mode Intelligence Active</p>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <button onClick={handleExportPDF} className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-800 rounded-xl transition-all"><Download className="w-4 h-4" />Exporter PDF</button>
                    <StarBorder
                        onClick={() => { setMessages([WELCOME_MSG]); setActiveConvId(null); if (onConversationStarted) onConversationStarted(''); }}
                        color="#3b82f6"
                        speed="5s"
                        thickness={1}
                        innerClassName="flex items-center gap-2 px-6 py-2.5 text-sm font-bold text-slate-900 dark:text-white rounded-xl transition-all"
                    >
                        <Plus className="w-4 h-4" />Nouveau
                    </StarBorder>
                </div>
            </div>
            {renderMessages()}
            {renderInput()}
            {renderSaveVisModal()}
        </div>
    );
};

export default AnalyticsChatWidget;
