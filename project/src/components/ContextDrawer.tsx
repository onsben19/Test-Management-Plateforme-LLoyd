import React, { useState } from 'react';
import { X, Send, Bot, User } from 'lucide-react';

interface ContextDrawerProps {
    isOpen: boolean;
    onClose: () => void;
    rowTitle: string;
}

const ContextDrawer: React.FC<ContextDrawerProps> = ({ isOpen, onClose, rowTitle }) => {
    const [messages, setMessages] = useState([
        { type: 'ai', text: 'Je suis prêt à analyser ce test. voici quelques suggestions :' }
    ]);

    // Reset or add suggestion when title changes (simulated effect)
    React.useEffect(() => {
        if (isOpen) {
            setMessages([
                { type: 'ai', text: `Analyse du test : "${rowTitle}"` },
                { type: 'ai', text: '💡 Suggestion IA : Ce test semble similaire au TC-1048. Voulez-vous fusionner les cas ?' }
            ]);
        }
    }, [isOpen, rowTitle]);
    const [input, setInput] = useState('');

    const handleSend = () => {
        if (!input.trim()) return;
        setMessages(prev => [...prev, { type: 'user', text: input }]);
        setInput('');
        setTimeout(() => {
            setMessages(prev => [...prev, { type: 'ai', text: 'Bien reçu. Je mets à jour le contexte...' }]);
        }, 800);
    };

    return (
        <div
            className={`fixed inset-y-0 right-0 w-96 bg-slate-900/95 backdrop-blur-md border-l border-slate-700 shadow-2xl z-50 transform transition-transform duration-300 ease-in-out ${isOpen ? 'translate-x-0' : 'translate-x-full'
                }`}
        >
            <div className="flex flex-col h-full">
                <div className="p-4 border-b border-slate-700 bg-slate-800/50 flex justify-between items-center">
                    <div>
                        <h3 className="text-white font-medium">Discussion Contextuelle</h3>
                        <p className="text-xs text-slate-400 truncate w-64">{rowTitle}</p>
                    </div>
                    <button onClick={onClose} className="p-2 text-slate-400 hover:text-white transition-colors">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                    {messages.map((msg, i) => (
                        <div key={i} className={`flex gap-3 ${msg.type === 'user' ? 'justify-end' : ''}`}>
                            {msg.type === 'ai' && (
                                <div className="w-8 h-8 rounded-full bg-blue-600/20 flex items-center justify-center flex-shrink-0">
                                    <Bot className="w-4 h-4 text-blue-400" />
                                </div>
                            )}
                            <div
                                className={`max-w-[80%] p-3 rounded-lg text-sm ${msg.type === 'user'
                                    ? 'bg-blue-600 text-white rounded-br-none'
                                    : 'bg-slate-800 text-slate-200 rounded-bl-none'
                                    }`}
                            >
                                {msg.text}
                            </div>
                            {msg.type === 'user' && (
                                <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center flex-shrink-0">
                                    <User className="w-4 h-4 text-slate-300" />
                                </div>
                            )}
                        </div>
                    ))}
                </div>

                <div className="p-4 border-t border-slate-700 bg-slate-800/50">
                    <div className="relative">
                        <input
                            type="text"
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                            placeholder="Écrivez un message..."
                            className="w-full bg-slate-900 border border-slate-700 rounded-lg pl-4 pr-10 py-2.5 text-sm text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all placeholder-slate-500"
                        />
                        <button
                            onClick={handleSend}
                            className="absolute right-2 top-2 p-1 text-blue-400 hover:text-blue-300 transition-colors"
                        >
                            <Send className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ContextDrawer;
