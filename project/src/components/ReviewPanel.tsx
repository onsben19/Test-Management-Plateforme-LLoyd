import React, { useState } from 'react';
import { X, Send, CheckCircle, XCircle, Sparkles } from 'lucide-react';
import { type TestItem } from './ExecutionTestList';

interface ReviewPanelProps {
    test: TestItem | null;
    onClose: () => void;
    onUpdate?: (updates: any) => void;
    embed?: boolean;
}

const ReviewPanel: React.FC<ReviewPanelProps> = ({ test, onClose, onUpdate, embed = false }) => {
    const [chatMessage, setChatMessage] = useState('');

    const handleAIReformulate = () => {
        if (!chatMessage) return;
        // Simulate AI reformulation
        setChatMessage(`[IA] ${chatMessage} (Reformulé pour plus de clarté et de professionnalisme)`);
    };

    if (!test) return null;

    const containerClasses = embed
        ? "h-full w-full bg-slate-900 border-l border-slate-700 flex flex-col"
        : "fixed inset-y-0 right-0 w-96 bg-slate-900 border-l border-slate-700 shadow-2xl z-50 transform transition-transform duration-300 ease-in-out flex flex-col";

    return (
        <div className={containerClasses}>
            {/* Header */}
            <div className="p-6 border-b border-slate-700 flex items-center justify-between bg-slate-800">
                <div className="overflow-hidden mr-2">
                    <h2 className="text-lg font-semibold text-white truncate" title={test.name || (test as any).Titre}>
                        {test.name || (test as any).Titre || (test as any).NOM || 'Test sans nom'}
                    </h2>
                    <p className="text-sm text-slate-400 font-mono">{test.id}</p>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                    <button
                        onClick={() => onUpdate?.({ status: 'passed' })}
                        className={`p-2 rounded-lg transition-colors border ${test.status === 'passed'
                            ? 'bg-green-500 text-white border-green-500'
                            : 'bg-green-500/10 text-green-400 hover:bg-green-500 hover:text-white border-green-500/50'
                            }`}
                        title="Marquer comme Succès"
                    >
                        <CheckCircle className="w-5 h-5" />
                    </button>
                    <button
                        onClick={() => onUpdate?.({ status: 'failed' })}
                        className={`p-2 rounded-lg transition-colors border ${test.status === 'failed'
                            ? 'bg-red-500 text-white border-red-500'
                            : 'bg-red-500/10 text-red-400 hover:bg-red-500 hover:text-white border-red-500/50'
                            }`}
                        title="Marquer comme Échec"
                    >
                        <XCircle className="w-5 h-5" />
                    </button>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-slate-700 rounded-lg text-slate-400 hover:text-white transition-colors ml-2"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>
            </div>

            {/* Content (Chat Only) */}
            <div className="flex-1 overflow-y-auto p-6">
                <div className="flex flex-col h-full">
                    <div className="flex-1 space-y-4 mb-4">
                        <div className="flex justify-start">
                            <div className="bg-slate-800 p-3 rounded-lg rounded-tl-none max-w-[85%]">
                                <p className="text-xs text-slate-500 mb-1">Manager IA</p>
                                <p className="text-sm text-slate-300">
                                    J'ai remarqué que ce test échoue souvent le lundi matin. Pouvez-vous vérifier les timeouts ?
                                </p>
                            </div>
                        </div>
                    </div>
                    <div className="mt-auto">
                        <div className="relative">
                            <input
                                type="text"
                                value={chatMessage}
                                onChange={(e) => setChatMessage(e.target.value)}
                                className="w-full bg-slate-800 border border-slate-700 rounded-lg pl-3 pr-20 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-green-500"
                                placeholder="Écrire un message..."
                            />
                            <div className="absolute right-2 top-1.5 flex items-center gap-1">
                                <button
                                    onClick={handleAIReformulate}
                                    className="p-1 text-purple-400 hover:text-purple-300 transition-colors"
                                    title="Reformuler avec l'IA"
                                >
                                    <Sparkles className="w-4 h-4" />
                                </button>
                                <button className="p-1 text-green-400 hover:text-green-300 transition-colors">
                                    <Send className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ReviewPanel;
