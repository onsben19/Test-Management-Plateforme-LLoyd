import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
    Send, Bot, User, Database, Sparkles,
    PanelLeft, PanelLeftClose, Paperclip, X, Plus, Pencil, Check, Download
} from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'react-toastify';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
    ResponsiveContainer, AreaChart, Area
} from 'recharts';
import Plot from 'react-plotly.js';

interface Message {
    id: string;
    sender: 'user' | 'agent';
    text: string;
    type?: 'text' | 'bar' | 'line' | 'table' | 'metric' | 'error' | 'plotly';
    data?: any;
    sql?: string;
    image?: string;
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

const WELCOME_MSG: Message = {
    id: 'welcome',
    sender: 'agent',
    text: "Bonjour ! Je suis votre assistant Analytics. Posez-moi des questions sur vos données de test, anomalies, releases ou campagnes.",
    type: 'text',
    timestamp: new Date()
};

const SUGGESTIONS = [
    "Combien de cas de test par projet ?",
    "Montre-moi les anomalies critiques",
    "Quel est le taux de réussite des tests ?",
    "Évolution des campagnes ce mois-ci",
];

const AnalyticsChatWidget: React.FC<AnalyticsChatWidgetProps> = ({
    embedded = false,
    conversationId,
    onConversationUpdate,
    onToggleSidebar,
    isSidebarOpen = true,
    onConversationStarted,
}) => {
    const [messages, setMessages] = useState<Message[]>([WELCOME_MSG]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const [selectedImage, setSelectedImage] = useState<File | null>(null);
    const [imagePreview, setImagePreview] = useState<string | null>(null);
    const [activeConvId, setActiveConvId] = useState<string | null>(conversationId ?? null);
    const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
    const [editingText, setEditingText] = useState('');

    const messagesEndRef = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

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

    const fetchMessages = async (id: string) => {
        try {
            setLoading(true);
            const token = localStorage.getItem('access_token');
            const response = await fetch(`/api/analytics/conversations/${id}/messages/`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (response.ok) {
                const responseData = await response.json();
                const data = responseData.results || responseData;
                const mapped: Message[] = data.map((msg: any) => ({
                    id: msg.id,
                    sender: msg.sender,
                    text: msg.text,
                    type: msg.type,
                    sql: msg.sql,
                    data: msg.data,
                    image: msg.image,
                    timestamp: new Date(msg.created_at)
                }));
                setMessages(mapped.length > 0 ? mapped : [WELCOME_MSG]);
            }
        } catch {
            toast.error('Erreur chargement historique');
        } finally {
            setLoading(false);
        }
    };

    const handleSendMessage = async (e?: React.FormEvent, overrideText?: string) => {
        e?.preventDefault();
        const text = overrideText ?? input;
        if (!text.trim() && !selectedImage) return;

        const userMsg: Message = {
            id: Date.now().toString(),
            sender: 'user',
            text,
            type: 'text',
            image: imagePreview || undefined,
            timestamp: new Date()
        };

        setMessages(prev => [...prev.filter(m => m.id !== 'welcome'), userMsg]);
        setInput('');
        setSelectedImage(null);
        setImagePreview(null);
        setLoading(true);

        try {
            const token = localStorage.getItem('access_token');
            const formData = new FormData();
            formData.append('query', text);
            if (activeConvId) formData.append('conversation_id', activeConvId);
            if (selectedImage) formData.append('image', selectedImage);

            const response = await fetch('/api/analytics/ask/', {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` },
                body: formData
            });

            if (!response.ok) throw new Error('Erreur réseau');
            const data = await response.json();

            if (!activeConvId && data.conversation_id) {
                setActiveConvId(data.conversation_id);
                if (onConversationStarted) onConversationStarted(data.conversation_id);
            }

            const agentMsg: Message = {
                id: (Date.now() + 1).toString(),
                sender: 'agent',
                text: data.answer ?? 'Voici les résultats :',
                type: data.type ?? 'text',
                data: data.data,
                sql: data.sql,
                timestamp: new Date()
            };

            setMessages(prev => [...prev, agentMsg]);
            if (onConversationUpdate) onConversationUpdate();
        } catch {
            setMessages(prev => [...prev, {
                id: (Date.now() + 1).toString(),
                sender: 'agent',
                text: "Désolé, je n'ai pas pu traiter votre demande. Veuillez réessayer.",
                type: 'error',
                timestamp: new Date()
            }]);
            toast.error('Erreur agent');
        } finally {
            setLoading(false);
        }
    };

    const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setSelectedImage(file);
            const reader = new FileReader();
            reader.onloadend = () => setImagePreview(reader.result as string);
            reader.readAsDataURL(file);
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

    const isDarkTheme = () => document.documentElement.classList.contains('dark');

    const handleExportPDF = () => {
        if (messages.length <= 1) {
            toast.info("Rien à exporter");
            return;
        }

        const doc = new jsPDF();

        // Simple header (no dark banner)
        doc.setFontSize(18);
        doc.setTextColor(0, 0, 0);
        doc.setFont("helvetica", "bold");
        doc.text("Rapport d'Analyse IA", 20, 20);

        doc.setFontSize(9);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(120);
        doc.text(`Généré le : ${new Date().toLocaleString()}`, 20, 27);

        let y = 45;
        const margin = 20;
        const contentWidth = 210 - (margin * 2);

        messages.filter(m => m.id !== 'welcome').forEach((msg) => {
            if (y > 270) { doc.addPage(); y = 20; }
            doc.setFontSize(9);
            doc.setTextColor(100);
            doc.setFont("helvetica", "bold");
            doc.text(msg.sender === 'user' ? "Utilisateur" : "Assistant IA", margin, y);
            y += 5;

            doc.setFontSize(11);
            doc.setTextColor(0);
            doc.setFont("helvetica", "normal");
            let cleanText = msg.text.replace(/Requête SQL générée :/g, '').replace(/Here is the data I found:/g, '').trim();
            const textLines = doc.splitTextToSize(cleanText, contentWidth);
            doc.text(textLines, margin, y);
            y += (textLines.length * 6) + 5;

            if (msg.data && Array.isArray(msg.data) && msg.data.length > 0) {
                const head = [Object.keys(msg.data[0])];
                const body = msg.data.map(row => Object.values(row));
                autoTable(doc, {
                    startY: y,
                    head: head,
                    body: body as any,
                    margin: { left: margin },
                    styles: { fontSize: 8 },
                    headStyles: { fillColor: [79, 70, 229] },
                    alternateRowStyles: { fillColor: [249, 250, 251] }
                });
                y = (doc as any).lastAutoTable.finalY + 15;
            } else {
                y += 5;
            }
        });

        doc.save(`rapport-analytics-${new Date().getTime()}.pdf`);
        toast.success("Rapport PDF généré");
    };

    const renderVisualization = (msg: Message) => {
        if (!msg.data) return null;
        if (msg.type === 'plotly') {
            let props = msg.data;
            if (typeof props === 'string') { try { props = JSON.parse(props); } catch { return null; } }
            return (
                <div className="mt-3 rounded-2xl overflow-hidden border border-slate-700/50 bg-slate-900/80">
                    <Plot data={props.data || []} layout={{ ...props.layout, autosize: true, paper_bgcolor: 'transparent', plot_bgcolor: 'transparent', font: { color: '#94a3b8', size: 10 }, margin: { t: 40, r: 20, l: 40, b: 60 }, height: 300 }} style={{ width: '100%' }} useResizeHandler config={{ responsive: true, displayModeBar: false }} />
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
                    <div className="mt-2 text-xs bg-white/20 px-3 py-1 rounded-full">{keys[0].replace(/_/g, ' ')}</div>
                </div>
            );
        }

        if (valueKey && (msg.type === 'bar' || !msg.type)) {
            return (
                <div className="mt-3 h-56 w-full p-3 rounded-2xl border border-slate-700/50 bg-slate-900/80">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={normalized} margin={{ top: 5, right: 5, left: -10, bottom: 25 }}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(148,163,184,0.08)" />
                            <XAxis dataKey={labelKey} fontSize={9} tickLine={false} axisLine={false} tick={{ fill: '#64748b' }} angle={-25} textAnchor="end" interval={0} />
                            <YAxis fontSize={9} tickLine={false} axisLine={false} tick={{ fill: '#64748b' }} width={30} />
                            <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderRadius: '12px', fontSize: '11px' }} />
                            <Bar dataKey={valueKey} fill="#3b82f6" radius={[6, 6, 0, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            );
        }

        return (
            <div className="mt-3 rounded-2xl border border-slate-700/50 overflow-hidden">
                <div className="overflow-x-auto max-h-60">
                    <table className="min-w-full text-[11px]">
                        <thead className="bg-slate-800 sticky top-0 font-bold text-slate-400 uppercase tracking-wider">
                            <tr>{keys.map(k => <th key={k} className="px-4 py-2 text-left">{k.replace(/_/g, ' ')}</th>)}</tr>
                        </thead>
                        <tbody className="bg-slate-900/60 divide-y divide-slate-800">
                            {normalized.map((row, i) => <tr key={i} className="hover:bg-blue-900/10 text-slate-300">{keys.map(k => <td key={k} className="px-4 py-2">{row[k]}</td>)}</tr>)}
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
            <motion.div key={msg.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className={`flex gap-3 group ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
                <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 shadow-md ${isUser ? 'bg-gradient-to-br from-blue-500 to-violet-600' : 'bg-gradient-to-br from-slate-700 to-slate-800 border border-slate-600'}`}>
                    {isUser ? <User className="w-4 h-4 text-white" /> : <Bot className="w-4 h-4 text-blue-400" />}
                </div>

                <div className={`flex flex-col max-w-[80%] ${isUser ? 'items-end' : 'items-start'}`}>
                    {isUser && isEditing ? (
                        <div className="flex flex-col gap-2 w-72">
                            <textarea autoFocus value={editingText} onChange={e => setEditingText(e.target.value)} className="w-full bg-slate-700 border border-blue-500 text-white rounded-xl px-3 py-2 text-sm resize-none focus:outline-none" rows={3} />
                            <div className="flex items-center justify-end gap-2">
                                <button onClick={() => setEditingMessageId(null)} className="text-xs text-slate-400 px-3 py-1.5 rounded-lg hover:bg-slate-700">Annuler</button>
                                <button onClick={() => handleEditSubmit(msg.id)} className="flex items-center gap-1.5 text-xs bg-blue-600 text-white px-3 py-1.5 rounded-lg"><Check className="w-3.5 h-3.5" />Renvoyer</button>
                            </div>
                        </div>
                    ) : (
                        <>
                            <div className={`rounded-2xl px-4 py-3 shadow-sm ${isUser ? 'bg-gradient-to-br from-blue-600 to-blue-700 text-white rounded-tr-sm' : msg.type === 'error' ? 'bg-red-900/30 border border-red-700/40 text-red-300 rounded-tl-sm' : 'bg-slate-800 border border-slate-700 text-slate-100 rounded-tl-sm'}`}>
                                {msg.image && <div className="mb-3 rounded-xl overflow-hidden border border-slate-600"><img src={msg.image} alt="Upload" className="w-full max-h-40 object-cover" /></div>}
                                <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.text}</p>
                                {!isUser && msg.type !== 'text' && msg.type !== 'error' && <div className="mt-1">{renderVisualization(msg)}</div>}
                            </div>
                            {isUser && <button onClick={() => { setEditingMessageId(msg.id); setEditingText(msg.text); }} className="mt-1.5 opacity-0 group-hover:opacity-100 flex items-center gap-1 text-[10px] text-slate-500 hover:text-blue-400 px-2 py-1 rounded-lg hover:bg-slate-800"><Pencil className="w-3 h-3" />Modifier</button>}
                        </>
                    )}
                    <span className="text-[10px] mt-1.5 text-slate-600 font-medium px-1">{msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                </div>
            </motion.div>
        );
    };

    const renderInput = () => (
        <div className="shrink-0 p-4 border-t border-slate-800 bg-slate-950/80 backdrop-blur">
            {imagePreview && (
                <div className="mb-3 relative inline-block">
                    <img src={imagePreview} className="w-16 h-16 object-cover rounded-xl border-2 border-blue-500" alt="Preview" />
                    <button onClick={() => { setSelectedImage(null); setImagePreview(null); }} className="absolute -top-2 -right-2 bg-red-500 text-white p-0.5 rounded-full shadow"><X className="w-2.5 h-2.5" /></button>
                </div>
            )}
            <form onSubmit={handleSendMessage} className="flex items-center gap-2">
                <input type="file" ref={fileInputRef} onChange={handleImageSelect} accept="image/*" className="hidden" />
                <button type="button" onClick={() => fileInputRef.current?.click()} className="p-2.5 text-slate-500 hover:text-blue-400 hover:bg-slate-800 rounded-xl transition-all shrink-0"><Paperclip className="w-4 h-4" /></button>
                <input ref={inputRef} type="text" value={input} onChange={e => setInput(e.target.value)} placeholder="Posez une question sur vos données..." className="flex-1 bg-slate-800 border border-slate-700 text-slate-100 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/40 transition-all" disabled={loading} />
                <button type="submit" disabled={(!input.trim() && !selectedImage) || loading} className="p-2.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white rounded-xl shadow-lg active:scale-95 shrink-0"><Send className="w-4 h-4" /></button>
            </form>
        </div>
    );

    const renderMessages = () => (
        <div className="flex-1 min-h-0 overflow-y-auto p-4 space-y-5 custom-scrollbar bg-slate-900">
            {messages.length <= 1 && messages[0]?.id === 'welcome' && (
                <div className="flex flex-col items-center justify-center py-8 gap-4">
                    <div className="w-14 h-14 bg-gradient-to-br from-blue-600 to-violet-600 rounded-2xl flex items-center justify-center shadow-xl">
                        <Sparkles className="w-7 h-7 text-white" />
                    </div>
                    <div className="text-center">
                        <h3 className="font-bold text-slate-200 text-base">Assistant Analytics IA</h3>
                        <p className="text-slate-500 text-sm mt-1">Analysez vos données de test en langage naturel</p>
                    </div>
                    <div className="grid grid-cols-2 gap-2 mt-2 w-full max-w-lg">
                        {SUGGESTIONS.map(s => <button key={s} onClick={() => handleSendMessage(undefined, s)} className="text-left text-xs text-slate-400 hover:text-white hover:bg-slate-700 border border-slate-700 rounded-xl px-3 py-2.5 transition-all">{s}</button>)}
                    </div>
                </div>
            )}
            <AnimatePresence initial={false}>{messages.filter(m => m.id !== 'welcome' || messages.length === 1).map(msg => <div key={msg.id}>{renderMessage(msg)}</div>)}</AnimatePresence>
            {loading && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex gap-3">
                    <div className="w-8 h-8 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center shrink-0"><Bot className="w-4 h-4 text-blue-400" /></div>
                    <div className="bg-slate-800 border border-slate-700 rounded-2xl rounded-tl-sm px-4 py-3 flex items-center gap-1.5">{[0, 0.2, 0.4].map((delay, i) => <motion.div key={i} animate={{ y: [0, -5, 0] }} transition={{ repeat: Infinity, duration: 0.8, delay }} className="w-2 h-2 bg-blue-500 rounded-full" />)}</div>
                </motion.div>
            )}
            <div ref={messagesEndRef} />
        </div>
    );

    if (embedded) {
        return (
            <div className="w-full h-full flex flex-col bg-slate-900 relative overflow-hidden">
                <div className="shrink-0 bg-slate-950/90 border-b border-slate-800 px-4 py-3 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="flex items-center gap-2.5">
                            <div className="relative"><div className="w-9 h-9 bg-gradient-to-br from-blue-600 to-violet-700 rounded-xl flex items-center justify-center shadow-lg"><Sparkles className="w-4 h-4 text-white" /></div><div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-500 border-2 border-slate-950 rounded-full" /></div>
                            <div><h3 className="font-bold text-white text-sm leading-none">Assistant Analytics</h3><span className="text-[10px] text-emerald-400 font-semibold tracking-wider">IA ACTIVE</span></div>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <button onClick={() => { setMessages([WELCOME_MSG]); setActiveConvId(null); if (onConversationStarted) onConversationStarted(''); }} className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-white hover:bg-slate-800 px-3 py-1.5 rounded-xl transition-all border border-transparent hover:border-slate-700"><Plus className="w-3.5 h-3.5" />Nouveau</button>
                    </div>
                </div>
                {renderMessages()}
                {renderInput()}
            </div>
        );
    }
    return null;
};

export default AnalyticsChatWidget;
