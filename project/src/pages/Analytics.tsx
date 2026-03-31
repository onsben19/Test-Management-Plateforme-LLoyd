import React, { useState, useEffect, useCallback } from 'react';
import Header from '../components/Header';
import Sidebar from '../components/Sidebar';
import AnalyticsChatWidget from '../components/AnalyticsChatWidget';
import ChatHistorySidebar from '../components/ChatHistorySidebar';
import { toast } from 'react-toastify';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import api from '../services/api';
import { useSidebar } from '../context/SidebarContext';

interface Conversation {
    id: string;
    title: string;
    created_at: string;
}

const Analytics = () => {
    const { isOpen } = useSidebar();
    const [conversations, setConversations] = useState<Conversation[]>([]);
    const [currentConversationId, setCurrentConversationId] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [isSidebarOpen, setIsSidebarOpen] = useState(true);

    const fetchConversations = useCallback(async () => {
        try {
            setIsLoading(true);
            const response = await api.get('/analytics/conversations/');
            const sorted = (Array.isArray(response.data) ? response.data : [])
                .sort((a: Conversation, b: Conversation) =>
                    new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
                );
            setConversations(sorted);
        } catch {
            // Silently fail
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => { fetchConversations(); }, [fetchConversations]);

    const handleNewChat = () => setCurrentConversationId(null);
    const handleSelectConversation = (id: string) => setCurrentConversationId(id);

    // Called by widget when a new conversation is created (first message sent)
    const handleConversationStarted = (id: string) => {
        if (id) {
            setCurrentConversationId(id);
            fetchConversations();
        }
    };

    const handleDeleteConversation = async (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        if (!window.confirm('Supprimer cette conversation ?')) return;
        try {
            await api.delete(`/analytics/conversations/${id}/`);
            setConversations(prev => prev.filter(c => c.id !== id));
            if (currentConversationId === id) setCurrentConversationId(null);
            toast.success('Conversation supprimée');
        } catch {
            toast.error('Erreur lors de la suppression');
        }
    };

    return (
        <div className="min-h-screen bg-slate-900 flex flex-col overflow-hidden">
            <Header />
            <div className="flex flex-1 h-[calc(100vh-4rem)] relative overflow-hidden">
                <Sidebar />
                <main className={`flex-1 flex overflow-hidden transition-all duration-300 ${isOpen ? 'lg:ml-64' : 'lg:ml-16'}`}>
                    {/* History sidebar with edge-tab toggle */}
                    <div className="relative flex shrink-0">
                        {/* Sliding panel */}
                        <div className={`${isSidebarOpen ? 'w-64' : 'w-0'
                            } transition-all duration-300 ease-in-out overflow-hidden`}>
                            <ChatHistorySidebar
                                conversations={conversations}
                                currentConversationId={currentConversationId}
                                onSelectConversation={handleSelectConversation}
                                onNewChat={handleNewChat}
                                onDeleteConversation={handleDeleteConversation}
                                isLoading={isLoading}
                            />
                        </div>

                        {/* Edge tab — always visible */}
                        <button
                            onClick={() => setIsSidebarOpen(v => !v)}
                            className="absolute right-0 translate-x-full top-1/2 -translate-y-1/2 z-20 flex items-center justify-center w-5 h-12 bg-slate-800 hover:bg-slate-700 border border-l-0 border-slate-700 rounded-r-lg shadow-lg transition-all group"
                            title={isSidebarOpen ? 'Fermer le panneau' : 'Ouvrir le panneau'}
                        >
                            {isSidebarOpen
                                ? <ChevronLeft className="w-3.5 h-3.5 text-slate-400 group-hover:text-white transition-colors" />
                                : <ChevronRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-white transition-colors" />
                            }
                        </button>
                    </div>

                    {/* Chat area */}
                    <div className="flex-1 overflow-hidden">
                        <AnalyticsChatWidget
                            embedded={true}
                            conversationId={currentConversationId}
                            onConversationUpdate={fetchConversations}
                            onConversationStarted={handleConversationStarted}
                            onToggleSidebar={() => setIsSidebarOpen(v => !v)}
                            isSidebarOpen={isSidebarOpen}
                        />
                    </div>
                </main>
            </div>
        </div>
    );
};

export default Analytics;
