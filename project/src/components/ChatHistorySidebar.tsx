import React from 'react';
import { Plus, Trash2, MessageCircle, Clock, Sparkles } from 'lucide-react';

interface Conversation {
    id: string;
    title: string;
    created_at: string;
}

interface ChatHistorySidebarProps {
    conversations: Conversation[];
    currentConversationId: string | null;
    onSelectConversation: (id: string) => void;
    onNewChat: () => void;
    onDeleteConversation: (id: string, e: React.MouseEvent) => void;
    isLoading: boolean;
}

const groupByDate = (conversations: Conversation[]) => {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekStart = new Date(todayStart);
    weekStart.setDate(weekStart.getDate() - 7);

    const groups: { label: string; items: Conversation[] }[] = [
        { label: "Aujourd'hui", items: [] },
        { label: 'Cette semaine', items: [] },
        { label: 'Plus anciens', items: [] },
    ];

    conversations.forEach(conv => {
        const d = new Date(conv.created_at);
        if (d >= todayStart) groups[0].items.push(conv);
        else if (d >= weekStart) groups[1].items.push(conv);
        else groups[2].items.push(conv);
    });

    return groups.filter(g => g.items.length > 0);
};

const ChatHistorySidebar: React.FC<ChatHistorySidebarProps> = ({
    conversations,
    currentConversationId,
    onSelectConversation,
    onNewChat,
    onDeleteConversation,
    isLoading
}) => {
    const groups = groupByDate(conversations);

    return (
        <div className="w-64 bg-slate-950 flex flex-col h-full shrink-0 border-r border-slate-800/60">
            {/* Header */}
            <div className="p-4 border-b border-slate-800/60">
                <div className="flex items-center gap-2 mb-4">
                    <div className="w-7 h-7 bg-gradient-to-br from-blue-500 to-violet-600 rounded-lg flex items-center justify-center shadow-lg">
                        <Sparkles className="w-3.5 h-3.5 text-white" />
                    </div>
                    <span className="text-sm font-bold text-white tracking-tight">Analytics IA</span>
                </div>
                <button
                    onClick={onNewChat}
                    className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 active:scale-95 text-white rounded-xl px-4 py-2.5 transition-all font-semibold text-sm shadow-lg shadow-blue-900/30"
                >
                    <Plus className="w-4 h-4" />
                    Nouvelle discussion
                </button>
            </div>

            {/* History */}
            <div className="flex-1 overflow-y-auto py-3 custom-scrollbar">
                {isLoading ? (
                    <div className="flex flex-col gap-2 px-3">
                        {[1, 2, 3].map(i => (
                            <div key={i} className="h-14 bg-slate-800/40 rounded-xl animate-pulse" />
                        ))}
                    </div>
                ) : conversations.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full gap-3 px-4 py-8 text-center">
                        <div className="w-12 h-12 bg-slate-800 rounded-2xl flex items-center justify-center">
                            <MessageCircle className="w-6 h-6 text-slate-600" />
                        </div>
                        <p className="text-slate-500 text-xs leading-relaxed">
                            Commencez une discussion pour voir votre historique ici
                        </p>
                    </div>
                ) : (
                    groups.map(group => (
                        <div key={group.label} className="mb-4">
                            <div className="px-4 py-1.5 text-[10px] font-bold text-slate-600 uppercase tracking-widest flex items-center gap-1.5">
                                <Clock className="w-3 h-3" />
                                {group.label}
                            </div>
                            <div className="space-y-0.5 px-2">
                                {group.items.map((conv) => (
                                    <button
                                        key={conv.id}
                                        onClick={() => onSelectConversation(conv.id)}
                                        className={`w-full text-left px-3 py-2.5 rounded-xl flex items-start gap-2.5 transition-all group relative ${currentConversationId === conv.id
                                                ? 'bg-blue-600/20 text-white border border-blue-500/30'
                                                : 'text-slate-400 hover:bg-slate-800/50 hover:text-slate-200 border border-transparent'
                                            }`}
                                    >
                                        <MessageCircle className={`w-3.5 h-3.5 mt-0.5 shrink-0 ${currentConversationId === conv.id ? 'text-blue-400' : 'text-slate-600'}`} />
                                        <div className="flex-1 min-w-0">
                                            <span className="text-xs font-medium truncate block">
                                                {conv.title || 'Nouvelle conversation'}
                                            </span>
                                            <span className="text-[10px] text-slate-600 mt-0.5 block">
                                                {new Date(conv.created_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                                            </span>
                                        </div>
                                        {/* Delete */}
                                        <div
                                            onClick={(e) => onDeleteConversation(conv.id, e)}
                                            className="opacity-0 group-hover:opacity-100 p-1 rounded-lg hover:bg-red-500/20 text-slate-600 hover:text-red-400 transition-all shrink-0"
                                            title="Supprimer"
                                        >
                                            <Trash2 className="w-3 h-3" />
                                        </div>
                                    </button>
                                ))}
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
};

export default ChatHistorySidebar;
