import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bot, X, Send, Sparkles, MessageCircle, Minimize2, Maximize2, Zap } from 'lucide-react';
import { aiService } from '../services/api';
import { useTranslation } from 'react-i18next';
import { useLocation } from 'react-router-dom';

const GlobalAIChat = () => {
    const { t } = useTranslation();
    const location = useLocation();
    const [isOpen, setIsOpen] = useState(false);
    const [isMinimized, setIsMinimized] = useState(false);
    const [messages, setMessages] = useState<{role: 'user' | 'assistant', content: string}[]>([
        { role: 'assistant', content: "Bonjour ! Je suis votre assistant expert InsureTM. Comment puis-je vous aider aujourd'hui ?" }
    ]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    // Ne pas afficher sur la page de login ou unauthorized
    if (['/login', '/unauthorized'].includes(location.pathname)) {
        return null;
    }

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        if (isOpen && !isMinimized) scrollToBottom();
    }, [messages, isOpen, isMinimized]);

    const handleSend = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!input.trim() || loading) return;

        const userMsg = { role: 'user' as const, content: input };
        setMessages(prev => [...prev, userMsg]);
        setInput('');
        setLoading(true);

        try {
            const response = await aiService.ollamaChat(input, `Page actuelle: ${window.location.pathname}`);
            const assistantMsg = { role: 'assistant' as const, content: response.data.answer };
            setMessages(prev => [...prev, assistantMsg]);
        } catch (error) {
            console.error("AI Error:", error);
            setMessages(prev => [...prev, { role: 'assistant', content: "Désolé, je rencontre une difficulté technique avec Ollama." }]);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed bottom-8 right-8 z-[9999] flex flex-col items-end">
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.8, y: 20 }}
                        animate={{ 
                            opacity: 1, 
                            scale: 1, 
                            y: 0,
                            height: isMinimized ? '80px' : '600px',
                            width: isMinimized ? '300px' : '400px'
                        }}
                        exit={{ opacity: 0, scale: 0.8, y: 20 }}
                        className="bg-slate-900/95 backdrop-blur-2xl border border-white/10 rounded-[2rem] shadow-2xl overflow-hidden mb-6 flex flex-col"
                    >
                        {/* Header */}
                        <div className="p-5 bg-white/[0.03] border-b border-white/5 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-gradient-to-br from-indigo-600 to-purple-700 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-500/20">
                                    <span className="text-white font-black text-lg">AI</span>
                                </div>
                                <div>
                                    <h3 className="text-sm font-black text-white uppercase tracking-widest leading-none mb-1">Votre Agent AI</h3>
                                    <div className="flex items-center gap-1.5">
                                        <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
                                        <span className="text-[9px] font-bold text-blue-500 uppercase tracking-widest">Connecté</span>
                                    </div>
                                </div>
                            </div>
                            <div className="flex items-center gap-1">
                                <button 
                                    onClick={() => setIsMinimized(!isMinimized)}
                                    className="p-2 text-slate-500 hover:text-white transition-colors"
                                >
                                    {isMinimized ? <Maximize2 size={16} /> : <Minimize2 size={16} />}
                                </button>
                                <button 
                                    onClick={() => setIsOpen(false)}
                                    className="p-2 text-slate-500 hover:text-rose-500 transition-colors"
                                >
                                    <X size={18} />
                                </button>
                            </div>
                        </div>

                        {!isMinimized && (
                            <>
                                {/* Messages */}
                                <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
                                    {messages.map((msg, i) => (
                                        <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                            <div className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                                                msg.role === 'user' 
                                                ? 'bg-blue-600 text-white rounded-tr-sm shadow-lg shadow-blue-500/10' 
                                                : 'bg-white/5 border border-white/10 text-slate-200 rounded-tl-sm'
                                            }`}>
                                                {msg.role === 'assistant' && (
                                                    <div className="flex items-center gap-1.5 mb-2 pb-1 border-b border-white/5">
                                                        <span className="text-[8px] font-black uppercase tracking-widest text-slate-500">Réponse de l'IA</span>
                                                    </div>
                                                )}
                                                {msg.content}
                                            </div>
                                        </div>
                                    ))}
                                    {loading && (
                                        <div className="flex justify-start">
                                            <div className="bg-white/5 border border-white/10 rounded-2xl rounded-tl-sm px-4 py-3 flex items-center gap-1.5">
                                                {[0, 0.2, 0.4].map((d, i) => (
                                                    <motion.div 
                                                        key={i}
                                                        animate={{ opacity: [0.3, 1, 0.3] }}
                                                        transition={{ repeat: Infinity, duration: 1, delay: d }}
                                                        className="w-1.5 h-1.5 bg-blue-500 rounded-full"
                                                    />
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                    <div ref={messagesEndRef} />
                                </div>

                                {/* Input */}
                                <form onSubmit={handleSend} className="p-4 bg-white/[0.02] border-t border-white/5">
                                    <div className="relative flex items-center">
                                        <input 
                                            type="text"
                                            value={input}
                                            onChange={(e) => setInput(e.target.value)}
                                            placeholder="Posez votre question..."
                                            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 pr-12 text-sm text-white placeholder-slate-600 outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/50 transition-all"
                                        />
                                        <button 
                                            type="submit"
                                            disabled={!input.trim() || loading}
                                            className="absolute right-2 p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-500 disabled:opacity-50 disabled:grayscale transition-all shadow-lg shadow-blue-500/20"
                                        >
                                            <Send size={16} />
                                        </button>
                                    </div>
                                </form>
                            </>
                        )}
                    </motion.div>
                )}
            </AnimatePresence>

            <motion.button
                whileHover={{ scale: 1.05, y: -2 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setIsOpen(!isOpen)}
                className={`group relative w-12 h-12 rounded-full flex items-center justify-center transition-all duration-500 overflow-hidden backdrop-blur-xl border ${
                    isOpen 
                    ? 'bg-slate-900 border-white/10 shadow-lg' 
                    : 'bg-[#0f1729]/90 border-white/10 hover:border-blue-500/30 shadow-2xl hover:shadow-[0_0_30px_rgba(59,130,246,0.2)]'
                }`}
            >
                {/* Subtle ambient glow on hover */}
                {!isOpen && (
                    <div className="absolute inset-0 bg-blue-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none blur-md" />
                )}
                
                {isOpen ? (
                    <X className="text-white relative z-10" size={18} strokeWidth={1.5} />
                ) : (
                    <Bot className="text-slate-400 group-hover:text-blue-400 transition-colors relative z-10" size={20} strokeWidth={1.5} />
                )}
            </motion.button>
        </div>
    );
};

export default GlobalAIChat;
