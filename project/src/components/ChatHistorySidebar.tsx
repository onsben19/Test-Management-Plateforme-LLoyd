import React from 'react';
import { useTranslation } from 'react-i18next';
import { Plus, Trash2, MessageCircle, Clock, Sparkles, History } from 'lucide-react';

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

const groupByDate = (conversations: Conversation[], t: any) => {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekStart = new Date(todayStart);
    weekStart.setDate(weekStart.getDate() - 7);

    const groups: { label: string; items: Conversation[] }[] = [
        { label: t('analytics.history.today'), items: [] },
        { label: t('analytics.history.thisWeek'), items: [] },
        { label: t('analytics.history.older'), items: [] },
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
    const { t } = useTranslation();
    const groups = groupByDate(conversations, t);

    return (
        <div className="w-80 bg-slate-950 flex flex-col h-full shrink-0">
            {/* Header */}
            <div className="p-8 border-b border-white/5 bg-slate-900/40">
                <div className="flex items-center gap-3 mb-8">
                    <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center border border-blue-500/20">
                        <History className="w-5 h-5 text-blue-400" />
                    </div>
                    <div className="flex flex-col">
                        <h2 className="font-bold text-white tracking-tight text-lg leading-none">{t('analytics.history.title')}</h2>
                        <span className="text-[10px] text-slate-500 font-medium tracking-wide mt-1 uppercase">VOTRE HISTORIQUE</span>
                    </div>
                </div>
                <button
                    onClick={onNewChat}
                    className="w-full flex items-center justify-center gap-3 px-6 py-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-[1.25rem] transition-all shadow-xl shadow-blue-900/30 active:scale-[0.98] font-bold text-sm"
                >
                    <Plus className="w-5 h-5" />
                    {t('analytics.history.newChat')}
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
                            {t('analytics.history.empty')}
                        </p>
                    </div>
                ) : (
                    groups.map(group => (
                        <div key={group.label} className="mb-4">
                            <div className="px-4 py-1.5 text-[10px] font-bold text-slate-600 uppercase tracking-widest flex items-center gap-1.5">
                                <Clock className="w-3 h-3" />
                                {group.label}
                            </div>
                            <div className="space-y-1.5 px-4">
                                {group.items.map((conv) => (
                                    <button
                                        key={conv.id}
                                        onClick={() => onSelectConversation(conv.id)}
                                        className={`w-full text-left px-4 py-4 rounded-2xl flex items-start gap-4 transition-all group relative border ${currentConversationId === conv.id
                                            ? 'bg-blue-600/10 text-white border-blue-500/30'
                                            : 'text-slate-400 hover:bg-white/[0.04] hover:text-slate-200 border-transparent'
                                            }`}
                                    >
                                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-transform group-hover:scale-110 ${currentConversationId === conv.id ? 'bg-blue-600/20 text-blue-400' : 'bg-slate-800 text-slate-500'}`}>
                                            <MessageCircle className="w-5 h-5" />
                                        </div>
                                        <div className="flex-1 min-w-0 py-0.5">
                                            <span className="text-[14px] font-bold text-slate-200 group-hover:text-white truncate block leading-tight">
                                                {conv.title || t('analytics.history.untitled')}
                                            </span>
                                            <span className="text-[10px] text-slate-500 mt-1 block font-medium">
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
