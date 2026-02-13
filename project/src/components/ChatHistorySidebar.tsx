import React from 'react';
import { MessageSquare, Plus, Trash2, MessageCircle } from 'lucide-react';

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

const ChatHistorySidebar: React.FC<ChatHistorySidebarProps> = ({
    conversations,
    currentConversationId,
    onSelectConversation,
    onNewChat,
    onDeleteConversation,
    isLoading
}) => {
    return (
        <div className="w-64 bg-slate-900 flex flex-col border-r border-slate-800 h-full shrink-0">
            {/* New Chat Button */}
            <div className="p-4">
                <button
                    onClick={onNewChat}
                    className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg px-4 py-3 transition-colors font-medium text-sm"
                >
                    <Plus className="w-4 h-4" />
                    Nouvelle conversation
                </button>
            </div>

            {/* Local History Header */}
            <div className="px-4 py-2 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Historique
            </div>

            {/* Conversations List */}
            <div className="flex-1 overflow-y-auto px-2 space-y-1 custom-scrollbar">
                {isLoading ? (
                    <div className="p-4 text-center text-slate-500 text-sm">Chargement...</div>
                ) : conversations.length === 0 ? (
                    <div className="p-4 text-center text-slate-500 text-sm flex flex-col items-center gap-2">
                        <MessageSquare className="w-8 h-8 opacity-20" />
                        <p>Aucune conversation</p>
                    </div>
                ) : (
                    conversations.map((conv) => (
                        <button
                            key={conv.id}
                            onClick={() => onSelectConversation(conv.id)}
                            className={`w-full text-left px-3 py-3 rounded-lg flex items-center gap-3 transition-colors group relative ${currentConversationId === conv.id
                                ? 'bg-slate-800 text-white'
                                : 'text-slate-400 hover:bg-slate-800/50 hover:text-slate-200'
                                }`}
                        >
                            <MessageCircle className="w-4 h-4 shrink-0" />
                            <span className="text-sm truncate pr-6">{conv.title || 'Nouvelle conversation'}</span>

                            {/* Delete Button (visible on hover or active) */}
                            <div
                                onClick={(e) => onDeleteConversation(conv.id, e)}
                                className={`absolute right-2 p-1.5 rounded-md hover:bg-slate-700 text-slate-500 hover:text-red-400 transition-colors ${currentConversationId === conv.id ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
                                    }`}
                                title="Supprimer"
                            >
                                <Trash2 className="w-3.5 h-3.5" />
                            </div>
                        </button>
                    ))
                )}
            </div>



        </div>

    );
};

export default ChatHistorySidebar;
