import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import PageLayout from '../components/PageLayout';
import AnalyticsChatWidget from '../components/AnalyticsChatWidget';
import ChatHistorySidebar from '../components/ChatHistorySidebar';
import { toast } from 'react-toastify';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import ConfirmModal from '../components/ConfirmModal';
import api from '../services/api';

interface Conversation {
    id: string;
    title: string;
    created_at: string;
}

const Analytics = () => {
    const { t } = useTranslation();
    const [conversations, setConversations] = useState<Conversation[]>([]);
    const [currentConversationId, setCurrentConversationId] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [isHistorySidebarOpen, setIsHistorySidebarOpen] = useState(true);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [conversationToDelete, setConversationToDelete] = useState<string | null>(null);

    const fetchConversations = useCallback(async () => {
        try {
            setIsLoading(true);
            const response = await api.get('/analytics/conversations/');
            const data = response.data.results || response.data;
            const sorted = (Array.isArray(data) ? data : [])
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

    const handleConversationStarted = (id: string) => {
        if (id) {
            setCurrentConversationId(id);
            fetchConversations();
        }
    };

    const handleDeleteConversation = async (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        setConversationToDelete(id);
        setIsDeleteModalOpen(true);
    };

    const confirmDeleteConversation = async () => {
        if (!conversationToDelete) return;
        try {
            await api.delete(`/analytics/conversations/${conversationToDelete}/`);
            setConversations(prev => prev.filter(c => c.id !== conversationToDelete));
            if (currentConversationId === conversationToDelete) setCurrentConversationId(null);
            toast.success(t('analytics.toasts.deleted'));
        } catch {
            toast.error(t('analytics.toasts.deleteError'));
        } finally {
            setConversationToDelete(null);
            setIsDeleteModalOpen(false);
        }
    };

    return (
        <PageLayout
            title={t('analytics.title')}
            subtitle="AI ANALYTICS"
            fullHeight={true}
            noPadding={true}
        >
            <div className="flex flex-1 h-full relative overflow-hidden glass-panel rounded-t-[2.5rem]">
                {/* History sidebar with edge-tab toggle */}
                <div className="relative flex shrink-0">
                    {/* Sliding panel */}
                    <div className={`${isHistorySidebarOpen ? 'w-80' : 'w-0'
                        } transition-all duration-500 ease-in-out overflow-hidden glass-sidebar`}>
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
                        onClick={() => setIsHistorySidebarOpen(v => !v)}
                        className="absolute right-0 translate-x-1/2 top-1/2 -translate-y-1/2 z-20 flex items-center justify-center w-6 h-12 bg-blue-600 hover:bg-blue-500 border border-blue-400/30 rounded-full shadow-xl shadow-blue-900/40 transition-all group scale-75 lg:scale-100"
                        title={isHistorySidebarOpen ? t('common.close') : t('common.open')}
                    >
                        {isHistorySidebarOpen
                            ? <ChevronLeft className="w-4 h-4 text-white" />
                            : <ChevronRight className="w-4 h-4 text-white" />
                        }
                    </button>
                </div>

                {/* Chat area */}
                <div className="flex-1 h-full overflow-hidden flex flex-col relative z-10">
                    <AnalyticsChatWidget
                        embedded={true}
                        conversationId={currentConversationId}
                        onConversationUpdate={fetchConversations}
                        onConversationStarted={handleConversationStarted}
                        onToggleSidebar={() => setIsHistorySidebarOpen(v => !v)}
                        isSidebarOpen={isHistorySidebarOpen}
                    />
                </div>
            </div>

            <ConfirmModal
                isOpen={isDeleteModalOpen}
                title={t('analytics.modal.deleteTitle')}
                message={t('analytics.modal.deleteMessage')}
                onConfirm={confirmDeleteConversation}
                onCancel={() => setIsDeleteModalOpen(false)}
                confirmText={t('analytics.history.delete')}
                type="danger"
            />
        </PageLayout>
    );
};

export default Analytics;
