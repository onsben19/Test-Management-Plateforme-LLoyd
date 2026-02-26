import React, { useState, useRef, useEffect } from 'react';
import {
    MessageSquare, Send, X, Bot, User, BarChart2, Minimize2,
    PanelLeft, PanelLeftClose, Sparkles, Database, Info, RefreshCw, Maximize2, Download, FileText, Paperclip
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'react-toastify';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
    ResponsiveContainer, LineChart, Line, AreaChart, Area
} from 'recharts';

interface Message {
    id: string;
    sender: 'user' | 'agent';
    text: string;
    type?: 'text' | 'bar' | 'line' | 'table' | 'metric' | 'error';
    data?: any;
    sql?: string;
    timestamp: Date;
}

interface AnalyticsChatWidgetProps {
    embedded?: boolean;
    conversationId?: string | null;
    onConversationUpdate?: () => void;
    onToggleSidebar?: () => void;
    isSidebarOpen?: boolean;
}

const AnalyticsChatWidget: React.FC<AnalyticsChatWidgetProps> = ({
    embedded = false,
    conversationId,
    onConversationUpdate,
    onToggleSidebar,
    isSidebarOpen = true
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const [isMinimized, setIsMinimized] = useState(false);
    const [messages, setMessages] = useState<Message[]>([
        {
            id: 'welcome',
            sender: 'agent',
            text: "Bonjour ! Je suis votre assistant Analytics. Posez-moi des questions sur vos données (ex: 'Combien de cas de test par projet ?' ou 'Montre-moi les anomalies critiques').",
            type: 'text',
            timestamp: new Date()
        }
    ]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        if (conversationId) {
            fetchMessages(conversationId);
        } else {
            setMessages([]);
        }
    }, [conversationId]);

    const fetchMessages = async (id: string) => {
        try {
            setLoading(true);
            const token = localStorage.getItem('access_token');
            const response = await fetch(`/api/analytics/conversations/${id}/messages/`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (response.ok) {
                const data = await response.json();
                setMessages(data.map((msg: any) => ({
                    id: msg.id,
                    sender: msg.sender,
                    text: msg.text,
                    type: msg.type,
                    sql: msg.sql,
                    data: msg.data,
                    timestamp: new Date(msg.created_at)
                })));
            }
        } catch (error) {
            console.error("Error fetching messages:", error);
            toast.error("Erreur historique");
        } finally {
            setLoading(false);
            scrollToBottom();
        }
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages, isOpen]);

    const handleSendMessage = async (e?: React.FormEvent) => {
        e?.preventDefault();
        if (!input.trim()) return;

        const userMessage: Message = {
            id: Date.now().toString(),
            sender: 'user',
            text: input,
            type: 'text',
            timestamp: new Date()
        };

        setMessages(prev => [...prev, userMessage]);
        setInput('');
        setLoading(true);

        try {
            const token = localStorage.getItem('access_token');
            const response = await fetch('/api/analytics/ask/', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    query: userMessage.text,
                    conversation_id: conversationId
                })
            });

            if (!response.ok) throw new Error('Erreur réseau');

            const data = await response.json();
            const agentMessage: Message = {
                id: (Date.now() + 1).toString(),
                sender: 'agent',
                text: data.answer || "Voici les résultats :",
                type: data.type || 'text',
                data: data.data,
                sql: data.sql,
                timestamp: new Date()
            };

            setMessages(prev => [...prev, agentMessage]);
            if (onConversationUpdate) onConversationUpdate();
        } catch (error) {
            console.error("Chat error:", error);
            setMessages(prev => [...prev, {
                id: (Date.now() + 1).toString(),
                sender: 'agent',
                text: "Désolé, je n'ai pas pu traiter votre demande.",
                type: 'error',
                timestamp: new Date()
            }]);
            toast.error("Erreur agent");
        } finally {
            setLoading(false);
        }
    };

    const renderVisualization = (msg: Message) => {
        if (!msg.data || msg.data.length === 0) return (
            <div className="flex flex-col items-center justify-center p-8 text-slate-400 bg-slate-50/50 dark:bg-slate-900/50 rounded-xl border border-dashed border-slate-200 dark:border-slate-700">
                <Database className="w-8 h-8 mb-2 opacity-20" />
                <p className="text-sm italic">Aucune donnée trouvée.</p>
            </div>
        );

        const keys = Object.keys(msg.data[0]);
        switch (msg.type) {
            case 'bar':
                return (
                    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="h-72 w-full mt-4 p-4 bg-white dark:bg-slate-900 shadow-inner rounded-xl border border-slate-100 dark:border-slate-800">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={msg.data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                <defs>
                                    <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.8} />
                                        <stop offset="100%" stopColor="#2563eb" stopOpacity={1} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" opacity={0.5} />
                                <XAxis dataKey={keys[0]} fontSize={10} tickLine={false} axisLine={false} tick={{ fill: '#94a3b8' }} />
                                <YAxis fontSize={10} tickLine={false} axisLine={false} tick={{ fill: '#94a3b8' }} />
                                <Tooltip cursor={{ fill: 'rgba(59, 130, 246, 0.05)' }} contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '12px', color: '#fff', fontSize: '11px' }} />
                                <Bar dataKey={keys[1]} fill="url(#barGradient)" radius={[6, 6, 0, 0]} barSize={32} />
                            </BarChart>
                        </ResponsiveContainer>
                    </motion.div>
                );
            case 'line':
                return (
                    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="h-72 w-full mt-4 p-4 bg-white dark:bg-slate-900 shadow-inner rounded-xl border border-slate-100 dark:border-slate-800">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={msg.data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                <defs>
                                    <linearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="0%" stopColor="#8b5cf6" stopOpacity={0.3} />
                                        <stop offset="100%" stopColor="#8b5cf6" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" opacity={0.5} />
                                <XAxis dataKey={keys[0]} fontSize={10} tickLine={false} axisLine={false} tick={{ fill: '#94a3b8' }} />
                                <YAxis fontSize={10} tickLine={false} axisLine={false} tick={{ fill: '#94a3b8' }} />
                                <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '12px', color: '#fff', fontSize: '11px' }} />
                                <Area type="monotone" dataKey={keys[1]} stroke="#8b5cf6" strokeWidth={3} fill="url(#areaGradient)" dot={{ r: 4, fill: '#8b5cf6' }} />
                            </AreaChart>
                        </ResponsiveContainer>
                    </motion.div>
                );
            case 'metric':
                return (
                    <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="flex flex-col items-center justify-center p-6 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl mt-4 shadow-lg text-white text-center">
                        <div className="text-[10px] font-bold uppercase tracking-[0.2em] mb-1 opacity-80">RÉSULTAT ANALYSE</div>
                        <span className="text-5xl font-black">{msg.data[0][keys[0]]}</span>
                        <div className="mt-2 text-xs font-medium bg-white/20 px-3 py-1 rounded-full backdrop-blur-sm">{keys[0].replace(/_/g, ' ')}</div>
                    </motion.div>
                );
            case 'table':
            default:
                return (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="overflow-hidden mt-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-800 text-[11px]">
                                <thead className="bg-slate-50 dark:bg-slate-900/50 text-left font-bold text-slate-500 dark:text-slate-400">
                                    <tr>
                                        {keys.map(k => (
                                            <th key={k} className="px-4 py-3 uppercase tracking-wider">{k.replace(/_/g, ' ')}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody className="bg-white dark:bg-slate-800/20 divide-y divide-slate-100 dark:divide-slate-800">
                                    {msg.data.map((row: any, i: number) => (
                                        <tr key={i} className="hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors">
                                            {keys.map(k => (
                                                <td key={k} className="px-4 py-2.5 text-slate-700 dark:text-slate-300 font-medium">{row[k]}</td>
                                            ))}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </motion.div>
                );
        }
    };

    const renderMessageList = () => (
        <div className="flex-1 overflow-y-auto p-4 space-y-6 bg-slate-50 dark:bg-slate-900/50 custom-scrollbar">
            <AnimatePresence initial={false}>
                {messages.map((msg) => (
                    <motion.div key={msg.id} initial={{ opacity: 0, x: msg.sender === 'user' ? 20 : -20, scale: 0.95 }} animate={{ opacity: 1, x: 0, scale: 1 }} className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-[85%] flex flex-col ${msg.sender === 'user' ? 'items-end' : 'items-start'}`}>
                            <div className={`rounded-2xl p-4 shadow-md ${msg.sender === 'user' ? 'bg-blue-600 text-white rounded-tr-none' : 'bg-white dark:bg-slate-800 border border-slate-200/60 dark:border-slate-700 text-slate-800 dark:text-slate-100 rounded-tl-none'}`}>
                                <div className="flex items-center gap-2 mb-1.5 opacity-60">
                                    {msg.sender === 'agent' ? <Bot className="w-3.5 h-3.5" /> : <User className="w-3.5 h-3.5" />}
                                    <span className="text-[10px] font-bold uppercase tracking-wider">{msg.sender === 'agent' ? 'Assistant IA' : 'Moi'}</span>
                                </div>
                                <p className="text-sm leading-relaxed whitespace-pre-wrap font-medium">{msg.text}</p>
                                {msg.sender === 'agent' && msg.type !== 'text' && msg.type !== 'error' && (
                                    <div className="mt-2 text-slate-800 dark:text-white">{renderVisualization(msg)}</div>
                                )}
                                {msg.sender === 'agent' && msg.sql && (
                                    <details className="mt-4 border-t border-slate-100 dark:border-slate-700/50 pt-3 text-[10px]">
                                        <summary className="font-bold text-slate-400 cursor-pointer hover:text-blue-500 uppercase flex items-center gap-1.5">
                                            <Database className="w-3" /> SQL
                                        </summary>
                                        <pre className="mt-2 rounded-lg bg-slate-900 p-3 font-mono text-blue-400 overflow-x-auto">{msg.sql}</pre>
                                    </details>
                                )}
                            </div>
                            <span className="text-[10px] mt-1.5 px-2 font-bold text-slate-400/80">{msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        </div>
                    </motion.div>
                ))}
            </AnimatePresence>
            {loading && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex justify-start">
                    <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl rounded-tl-none px-5 py-4 shadow-sm">
                        <div className="flex gap-1.5 align-center">
                            <motion.div animate={{ scale: [1, 1.2, 1] }} transition={{ repeat: Infinity, duration: 1 }} className="w-1.5 h-1.5 bg-blue-500 rounded-full" />
                            <motion.div animate={{ scale: [1, 1.2, 1] }} transition={{ repeat: Infinity, duration: 1, delay: 0.2 }} className="w-1.5 h-1.5 bg-blue-500 rounded-full" />
                            <motion.div animate={{ scale: [1, 1.2, 1] }} transition={{ repeat: Infinity, duration: 1, delay: 0.4 }} className="w-1.5 h-1.5 bg-blue-500 rounded-full" />
                        </div>
                    </div>
                </motion.div>
            )}
            <div ref={messagesEndRef} />
        </div>
    );

    const renderInputArea = () => (
        <div className="p-6 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 z-10">
            <form onSubmit={handleSendMessage} className="relative flex items-center group">
                <div className="absolute left-4 text-slate-400 group-focus-within:text-blue-500 transition-colors">
                    <MessageSquare className="w-5 h-5" />
                </div>
                <input
                    type="text" value={input} onChange={(e) => setInput(e.target.value)}
                    placeholder="Posez une question..."
                    className="w-full bg-slate-100 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white rounded-2xl pl-12 pr-14 py-4 focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 focus:outline-none transition-all placeholder:text-slate-400 font-medium"
                    disabled={loading}
                />
                <button type="submit" disabled={!input.trim() || loading} className="absolute right-2 p-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-all shadow-lg shadow-blue-500/30 active:scale-95">
                    <Send className="w-5 h-5" />
                </button>
            </form>
            <div className="text-center mt-3 text-[10px] text-slate-400 font-medium">Assistant Analytics propulsé par Llama 3.3 Engine</div>
        </div>
    );

    if (embedded) {
        return (
            <div className="w-full h-full flex flex-col bg-white dark:bg-slate-800 rounded-none shadow-none relative overflow-hidden">
                <div className="absolute inset-0 opacity-[0.03] pointer-events-none" style={{ backgroundImage: 'radial-gradient(#3b82f6 1px, transparent 1px)', backgroundSize: '24px 24px' }}></div>
                <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 p-4 flex items-center justify-between shrink-0 z-10">
                    <div className="flex items-center gap-3">
                        {onToggleSidebar && (
                            <button onClick={onToggleSidebar} className="p-2 text-slate-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-xl transition-all mr-1">
                                {isSidebarOpen ? <PanelLeftClose className="w-5 h-5" /> : <PanelLeft className="w-5 h-5" />}
                            </button>
                        )}
                        <div className="relative">
                            <div className="w-10 h-10 bg-gradient-to-tr from-blue-600 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg transform rotate-3"><Sparkles className="w-5 h-5 text-white" /></div>
                            <div className="absolute -bottom-1 -right-1 w-3.5 h-3.5 bg-emerald-500 border-2 border-white dark:border-slate-900 rounded-full"></div>
                        </div>
                        <div>
                            <h3 className="font-bold text-slate-800 dark:text-white text-base">Assistant Analytics</h3>
                            <div className="flex items-center gap-1.5 text-[10px]"><span className="text-emerald-500 font-bold">IA ACTIVE</span></div>
                        </div>
                    </div>
                </div>
                {renderMessageList()}
                {renderInputArea()}
            </div>
        );
    }

    if (!isOpen) {
        return (
            <motion.button initial={{ scale: 0 }} animate={{ scale: 1 }} whileHover={{ scale: 1.1 }} onClick={() => setIsOpen(true)} className="fixed bottom-6 right-6 p-4 bg-gradient-to-tr from-blue-600 to-indigo-600 text-white rounded-2xl shadow-xl z-50">
                <div className="absolute -top-1 -right-1 w-4 h-4 bg-rose-500 border-2 border-white rounded-full animate-pulse"></div>
                <Bot className="w-8 h-8" />
            </motion.button>
        );
    }

    return (
        <div className={`fixed bottom-6 right-6 z-50 transition-all duration-500 ${isMinimized ? 'w-72 h-16' : 'w-96 md:w-[30rem] h-[600px] max-h-[85vh]'}`}>
            <div className="w-full h-full bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700/50 overflow-hidden flex flex-col relative">
                <div className="absolute inset-0 opacity-[0.02] pointer-events-none" style={{ backgroundImage: 'radial-gradient(#3b82f6 1px, transparent 1px)', backgroundSize: '20px 20px' }}></div>
                <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 p-4 flex items-center justify-between z-10">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gradient-to-tr from-blue-600 to-indigo-600 rounded-xl flex items-center justify-center"><Sparkles className="w-5 h-5 text-white" /></div>
                        <h3 className="font-bold text-slate-800 dark:text-white text-sm">IA Analytics</h3>
                    </div>
                    <div className="flex items-center gap-1">
                        <button onClick={() => setIsMinimized(!isMinimized)} className="p-2 text-slate-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-all">{isMinimized ? <Maximize2 className="w-4 h-4" /> : <Minimize2 className="w-4 h-4" />}</button>
                        <button onClick={() => setIsOpen(false)} className="p-2 text-slate-400 hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded-lg transition-all"><X className="w-4 h-4" /></button>
                    </div>
                </div>
                {!isMinimized && (<>{renderMessageList()}{renderInputArea()}</>)}
            </div>
        </div>
    );
};

export default AnalyticsChatWidget;
