import React, { useState, useRef, useEffect } from 'react';
import { MessageSquare, Send, X, Bot, User, BarChart2, ChevronDown, Minimize2, PanelLeft, PanelLeftClose } from 'lucide-react';
import { toast } from 'react-toastify';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line } from 'recharts';

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
    onConversationUpdate?: () => void; // To refresh history list after new message
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
            // New chat state
            setMessages([]);
        }
    }, [conversationId]);

    const fetchMessages = async (id: string) => {
        try {
            setLoading(true);
            const token = localStorage.getItem('access_token');
            const response = await fetch(`http://localhost:8000/api/analytics/conversations/${id}/messages/`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
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
            toast.error("Erreur chiffrement historique");
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
            const response = await fetch('http://localhost:8000/api/analytics/ask/', {
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

            if (!response.ok) {
                throw new Error('Erreur réseau');
            }

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

            // If we created a new conversation (we didn't have an ID), or just to refresh the title
            if (onConversationUpdate) {
                onConversationUpdate();
            }

        } catch (error) {
            console.error("Chat error:", error);
            setMessages(prev => [...prev, {
                id: (Date.now() + 1).toString(),
                sender: 'agent',
                text: "Désolé, je n'ai pas pu traiter votre demande. Veuillez réessayer.",
                type: 'error',
                timestamp: new Date()
            }]);
            toast.error("Erreur de communication avec l'agent");
        } finally {
            setLoading(false);
        }
    };

    const renderVisualization = (msg: Message) => {
        if (!msg.data || msg.data.length === 0) return <p className="text-sm text-slate-500 italic">Aucune donnée trouvée.</p>;

        const keys = Object.keys(msg.data[0]);
        if (keys.length < 2 && msg.type !== 'metric') {
            // Fallback to table if not enough dimensions for chart
            msg.type = 'table';
        }

        switch (msg.type) {
            case 'bar':
                return (
                    <div className="h-64 w-full mt-4">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={msg.data}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey={keys[0]} fontSize={12} tick={{ fill: '#64748b' }} />
                                <YAxis fontSize={12} tick={{ fill: '#64748b' }} />
                                <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '8px', color: '#fff' }} />
                                <Legend />
                                <Bar dataKey={keys[1]} fill="#3b82f6" radius={[4, 4, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                );
            case 'line':
                return (
                    <div className="h-64 w-full mt-4">
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={msg.data}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey={keys[0]} fontSize={12} tick={{ fill: '#64748b' }} />
                                <YAxis fontSize={12} tick={{ fill: '#64748b' }} />
                                <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '8px', color: '#fff' }} />
                                <Legend />
                                <Line type="monotone" dataKey={keys[1]} stroke="#8b5cf6" strokeWidth={2} />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                );
            case 'metric':
                const key = keys[0];
                return (
                    <div className="flex items-center justify-center p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg mt-2">
                        <span className="text-3xl font-bold text-blue-600 dark:text-blue-400">{msg.data[0][key]}</span>
                    </div>
                );
            case 'table':
            default:
                return (
                    <div className="overflow-x-auto mt-4 rounded-lg border border-slate-200 dark:border-slate-700">
                        <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-700 text-sm">
                            <thead className="bg-slate-50 dark:bg-slate-800">
                                <tr>
                                    {keys.map(k => (
                                        <th key={k} className="px-3 py-2 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">{k}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody className="bg-white dark:bg-slate-900 divide-y divide-slate-200 dark:divide-slate-700">
                                {msg.data.map((row: any, i: number) => (
                                    <tr key={i}>
                                        {keys.map(k => (
                                            <td key={k} className="px-3 py-2 text-slate-700 dark:text-slate-300 whitespace-nowrap">{row[k]}</td>
                                        ))}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                );
        }
    };

    // If embedded, we always show the chat interface without the floating button logic
    if (embedded) {
        return (
            <div className="w-full h-full flex flex-col bg-white dark:bg-slate-800 rounded-none shadow-none">
                {/* Header (Simplified for embedded) */}
                <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-4 flex items-center justify-between shrink-0">
                    <div className="flex items-center gap-3">
                        {onToggleSidebar && (
                            <button
                                onClick={onToggleSidebar}
                                className="p-2 text-white/80 hover:text-white hover:bg-white/10 rounded-lg transition-colors mr-1"
                                title={isSidebarOpen ? "Masquer l'historique" : "Afficher l'historique"}
                            >
                                {isSidebarOpen ? <PanelLeftClose className="w-5 h-5" /> : <PanelLeft className="w-5 h-5" />}
                            </button>
                        )}
                        <div className="w-10 h-10 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center">
                            <Bot className="w-6 h-6 text-white" />
                        </div>
                        <div>
                            <h3 className="font-bold text-white text-lg">Conversation</h3>
                            <p className="text-blue-100 text-xs flex items-center gap-1">
                                <span className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse"></span>
                                IA Ready
                            </p>
                        </div>
                    </div>
                </div>

                {/* Messages Body */}
                <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50 dark:bg-slate-900/50 min-h-0">
                    {messages.map((msg) => (
                        <div key={msg.id} className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                            <div className={`max-w-[85%] rounded-2xl p-4 shadow-sm ${msg.sender === 'user'
                                ? 'bg-blue-600 text-white rounded-tr-none'
                                : 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 rounded-tl-none'
                                }`}>
                                <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.text}</p>

                                {msg.sender === 'agent' && msg.type !== 'text' && msg.type !== 'error' && (
                                    <div className="mt-3">
                                        {renderVisualization(msg)}
                                    </div>
                                )}

                                {msg.sender === 'agent' && msg.sql && (
                                    <details className="mt-2">
                                        <summary className="text-xs text-slate-400 cursor-pointer hover:text-slate-600 dark:hover:text-slate-300">Voir la requête SQL</summary>
                                        <pre className="text-[10px] sm:text-xs bg-slate-100 dark:bg-slate-900 p-2 rounded mt-1 overflow-x-auto font-mono text-slate-600 dark:text-slate-400">
                                            {msg.sql}
                                        </pre>
                                    </details>
                                )}

                                <div className={`text-[10px] mt-1 text-right opacity-70 ${msg.sender === 'user' ? 'text-blue-100' : 'text-slate-400'}`}>
                                    {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </div>
                            </div>
                        </div>
                    ))}
                    {loading && (
                        <div className="flex justify-start">
                            <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl rounded-tl-none p-4 shadow-sm">
                                <div className="flex gap-1.5">
                                    <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                                    <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                                    <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                                </div>
                            </div>
                        </div>
                    )}
                    <div ref={messagesEndRef} />
                </div>

                {/* Input Area */}
                <div className="p-4 bg-white dark:bg-slate-800 border-t border-slate-200 dark:border-slate-700">
                    <form onSubmit={handleSendMessage} className="relative flex items-center">
                        <input
                            type="text"
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            placeholder="Posez une question sur vos données..."
                            className="w-full bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white rounded-full pl-5 pr-12 py-3 focus:ring-2 focus:ring-blue-500 focus:outline-none transition-all"
                            disabled={loading}
                        />
                        <button
                            type="submit"
                            disabled={!input.trim() || loading}
                            className="absolute right-2 p-2 bg-blue-600 text-white rounded-full hover:bg-blue-700 disabled:opacity-50 disabled:hover:bg-blue-600 transition-colors"
                        >
                            <Send className="w-4 h-4" />
                        </button>
                    </form>
                </div>
            </div>
        );
    }

    if (!isOpen) {
        return (
            <button
                onClick={() => setIsOpen(true)}
                className="fixed bottom-6 right-6 p-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-full shadow-lg hover:shadow-xl transition-all hover:scale-110 z-50 flex items-center justify-center animate-bounce-slow"
                title="Ouvrir l'assistant Analytics"
            >
                <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full animate-ping"></div>
                <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full"></div>
                <Bot className="w-8 h-8" />
            </button>
        );
    }

    return (
        <div className={`fixed bottom-6 right-6 z-50 flex flex-col transition-all duration-300 ease-in-out ${isMinimized ? 'w-72' : 'w-96 md:w-[32rem]'}`}>
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 overflow-hidden flex flex-col max-h-[80vh]">

                {/* Header */}
                <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-4 flex items-center justify-between shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center">
                            <Bot className="w-6 h-6 text-white" />
                        </div>
                        <div>
                            <h3 className="font-bold text-white text-lg">Agent Analytics</h3>
                            <p className="text-blue-100 text-xs flex items-center gap-1">
                                <span className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse"></span>
                                En ligne • IA Powered
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-1">
                        <button
                            onClick={() => setIsMinimized(!isMinimized)}
                            className="p-1.5 text-blue-100 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
                        >
                            {isMinimized ? <BarChart2 className="w-5 h-5" /> : <Minimize2 className="w-5 h-5" />}
                        </button>
                        <button
                            onClick={() => setIsOpen(false)}
                            className="p-1.5 text-blue-100 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>
                </div>

                {/* Messages Body */}
                {!isMinimized && (
                    <>
                        <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50 dark:bg-slate-900/50 min-h-[300px]">
                            {messages.map((msg) => (
                                <div key={msg.id} className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                                    <div className={`max-w-[85%] rounded-2xl p-4 shadow-sm ${msg.sender === 'user'
                                        ? 'bg-blue-600 text-white rounded-tr-none'
                                        : 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 rounded-tl-none'
                                        }`}>
                                        <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.text}</p>

                                        {msg.sender === 'agent' && msg.type !== 'text' && msg.type !== 'error' && (
                                            <div className="mt-3">
                                                {renderVisualization(msg)}
                                            </div>
                                        )}

                                        {msg.sender === 'agent' && msg.sql && (
                                            <details className="mt-2">
                                                <summary className="text-xs text-slate-400 cursor-pointer hover:text-slate-600 dark:hover:text-slate-300">Voir la requête SQL</summary>
                                                <pre className="text-[10px] sm:text-xs bg-slate-100 dark:bg-slate-900 p-2 rounded mt-1 overflow-x-auto font-mono text-slate-600 dark:text-slate-400">
                                                    {msg.sql}
                                                </pre>
                                            </details>
                                        )}

                                        <div className={`text-[10px] mt-1 text-right opacity-70 ${msg.sender === 'user' ? 'text-blue-100' : 'text-slate-400'}`}>
                                            {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        </div>
                                    </div>
                                </div>
                            ))}
                            {loading && (
                                <div className="flex justify-start">
                                    <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl rounded-tl-none p-4 shadow-sm">
                                        <div className="flex gap-1.5">
                                            <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                                            <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                                            <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                                        </div>
                                    </div>
                                </div>
                            )}
                            <div ref={messagesEndRef} />
                        </div>

                        {/* Input Area */}
                        <div className="p-4 bg-white dark:bg-slate-800 border-t border-slate-200 dark:border-slate-700">
                            <form onSubmit={handleSendMessage} className="relative flex items-center">
                                <input
                                    type="text"
                                    value={input}
                                    onChange={(e) => setInput(e.target.value)}
                                    placeholder="Posez une question sur vos données..."
                                    className="w-full bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white rounded-full pl-5 pr-12 py-3 focus:ring-2 focus:ring-blue-500 focus:outline-none transition-all"
                                    disabled={loading}
                                />
                                <button
                                    type="submit"
                                    disabled={!input.trim() || loading}
                                    className="absolute right-2 p-2 bg-blue-600 text-white rounded-full hover:bg-blue-700 disabled:opacity-50 disabled:hover:bg-blue-600 transition-colors"
                                >
                                    <Send className="w-4 h-4" />
                                </button>
                            </form>
                            <div className="text-center mt-2">
                                <p className="text-[10px] text-slate-400">L'IA peut faire des erreurs. Vérifiez les résultats.</p>
                            </div>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
};

export default AnalyticsChatWidget;
