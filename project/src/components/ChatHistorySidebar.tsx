import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Plus, Search } from 'lucide-react';

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

const formatTimestamp = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const isToday = date.getDate() === now.getDate() && date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
    
    const yesterday = new Date(now);
    yesterday.setDate(now.getDate() - 1);
    const isYesterday = date.getDate() === yesterday.getDate() && date.getMonth() === yesterday.getMonth() && date.getFullYear() === yesterday.getFullYear();

    const timeString = date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
    
    if (isToday) return `Aujourd'hui · ${timeString}`;
    if (isYesterday) return `Hier · ${timeString}`;
    return `${date.toLocaleDateString('fr-FR')} · ${timeString}`;
};

const groupByDate = (conversations: Conversation[], t: any) => {
    const now = new Date();
    const weekStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    weekStart.setDate(weekStart.getDate() - 7);

    const groups: { label: string; items: Conversation[] }[] = [
        { label: 'CETTE SEMAINE', items: [] },
        { label: 'PLUS ANCIENS', items: [] },
    ];

    conversations.forEach(conv => {
        const d = new Date(conv.created_at);
        if (d >= weekStart) groups[0].items.push(conv);
        else groups[1].items.push(conv);
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
    const [searchQuery, setSearchQuery] = useState('');
    
    const filteredConversations = conversations.filter(c => 
        (c.title || '').toLowerCase().includes(searchQuery.toLowerCase())
    );
    const groups = groupByDate(filteredConversations, t);

    return (
        <div className="flex flex-col h-full bg-transparent w-full">
            {/* Header sidebar */}
            <div className="p-[12px] shrink-0">
                <div className="text-[10px] uppercase text-[#6b7280] font-medium mb-[8px] tracking-wider">
                    ANALYTICS IA — HISTORIQUE
                </div>
                
                <button
                    onClick={onNewChat}
                    className="w-full flex items-center justify-center gap-2 rounded-[10px] transition-all bg-[#185FA5] text-[#B5D4F4] border-[0.5px] border-[#378ADD] hover:bg-[#155393] p-[10px_13px] mb-[12px]"
                >
                    <Plus className="w-4 h-4" />
                    <span className="font-medium text-[13px]">Nouvelle discussion</span>
                </button>

                <div className="relative flex items-center bg-slate-50 dark:bg-[#1a2235] border-[0.5px] border-slate-200 dark:border-slate-200 dark:border-white/[0.07] rounded-[8px] px-[10px] py-[7px]">
                    <Search className="w-3.5 h-3.5 text-slate-400 dark:text-white/25 shrink-0 mr-2" />
                    <input 
                        type="text" 
                        placeholder="Rechercher..." 
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="bg-transparent border-none outline-none w-full text-[11px] text-slate-800 dark:text-[#e8eaf6] placeholder-slate-400 dark:placeholder-white/25"
                    />
                </div>
            </div>

            {/* Historique */}
            <div 
                className="flex-1 overflow-y-auto p-[8px] space-y-4"
                style={{
                    scrollbarWidth: 'thin',
                    scrollbarColor: 'rgba(255,255,255,0.1) transparent'
                }}
            >
                {isLoading ? (
                    <div className="flex flex-col gap-2">
                        {[1, 2, 3].map(i => (
                            <div key={i} className="h-12 bg-white/5 rounded-[8px] animate-pulse" />
                        ))}
                    </div>
                ) : filteredConversations.length === 0 ? (
                    <div className="text-center p-4 text-[11px] text-slate-500 dark:text-white/30">
                        Aucune discussion
                    </div>
                ) : (
                    groups.map(group => (
                        <div key={group.label} className="mb-2">
                            <div className="px-2 mb-1 text-[9px] uppercase tracking-[0.08em] text-slate-400 dark:text-white/20 font-medium">
                                {group.label}
                            </div>
                            <div className="flex flex-col gap-0.5">
                                {group.items.map((conv) => {
                                    const isActive = currentConversationId === conv.id;
                                    return (
                                        <button
                                            key={conv.id}
                                            onClick={() => onSelectConversation(conv.id)}
                                            className={`w-full text-left p-[8px] rounded-[8px] border-[0.5px] transition-colors
                                                ${isActive 
                                                    ? 'bg-[rgba(127,119,221,0.1)] border-[rgba(127,119,221,0.2)]' 
                                                    : 'bg-transparent border-transparent hover:bg-slate-100 dark:hover:bg-white/[0.06]'
                                                }`}
                                        >
                                            <div className="text-[12px] text-slate-700 dark:text-white/65 whitespace-nowrap overflow-hidden text-ellipsis mb-0.5 font-medium">
                                                {conv.title || 'Nouvelle discussion'}
                                            </div>
                                            <div className="text-[10px] text-slate-400 dark:text-white/25">
                                                {formatTimestamp(conv.created_at)}
                                            </div>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    ))
                )}
            </div>
            
            <style>{`
                .flex-1::-webkit-scrollbar {
                    width: 2px;
                }
                .flex-1::-webkit-scrollbar-track {
                    background: transparent;
                }
                .flex-1::-webkit-scrollbar-thumb {
                    background-color: rgba(255,255,255,0.1);
                    border-radius: 10px;
                }
            `}</style>
        </div>
    );
};

export default ChatHistorySidebar;
