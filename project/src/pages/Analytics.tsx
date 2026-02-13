import React, { useState, useEffect } from 'react';
import Header from '../components/Header';
import Sidebar from '../components/Sidebar';
import AnalyticsChatWidget from '../components/AnalyticsChatWidget';
import ChatHistorySidebar from '../components/ChatHistorySidebar';
import { toast } from 'react-toastify';
import { PanelLeft, PanelLeftClose } from 'lucide-react';

interface Conversation {
    id: string;
    title: string;
    created_at: string;
}

const Analytics = () => {
    const [conversations, setConversations] = useState<Conversation[]>([]);
    const [currentConversationId, setCurrentConversationId] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [isSidebarOpen, setIsSidebarOpen] = useState(true);

    useEffect(() => {
        fetchConversations();
    }, []);

    const fetchConversations = async () => {
        try {
            setIsLoading(true);
            const token = localStorage.getItem('access_token');
            const response = await fetch('http://localhost:8000/api/analytics/conversations/', {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            if (response.ok) {
                const data = await response.json();
                setConversations(data);
            }
        } catch (error) {
            console.error("Error fetching conversations:", error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleNewChat = () => {
        setCurrentConversationId(null);
    };

    const handleSelectConversation = (id: string) => {
        setCurrentConversationId(id);
    };

    const handleDeleteConversation = async (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        if (!window.confirm("Voulez-vous vraiment supprimer cette conversation ?")) return;

        try {
            const token = localStorage.getItem('access_token');
            await fetch(`http://localhost:8000/api/analytics/conversations/${id}/`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            setConversations(prev => prev.filter(c => c.id !== id));
            if (currentConversationId === id) {
                setCurrentConversationId(null);
            }
            toast.success("Conversation supprimée");
        } catch (error) {
            console.error("Error deleting conversation:", error);
            toast.error("Erreur lors de la suppression");
        }
    };

    const handleConversationUpdate = () => {
        fetchConversations();
    };

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-900 transition-colors duration-300 overflow-hidden flex flex-col">
            <Header />
            <div className="flex flex-1 h-[calc(100vh-4rem)]">
                <Sidebar />
                <main className="flex-1 lg:ml-64 relative flex">
                    {/* Chat History Sidebar - Collapsible */}
                    <div className={`${isSidebarOpen ? 'w-64' : 'w-0'} transition-all duration-300 ease-in-out overflow-hidden flex flex-col border-r border-slate-200 dark:border-slate-800 bg-slate-900 h-full`}>
                        <div className="w-64 h-full flex flex-col"> {/* Fixed width container to prevent layout checks during transition */}
                            <ChatHistorySidebar
                                conversations={conversations}
                                currentConversationId={currentConversationId}
                                onSelectConversation={handleSelectConversation}
                                onNewChat={handleNewChat}
                                onDeleteConversation={handleDeleteConversation}
                                isLoading={isLoading}
                            />
                        </div>
                    </div>

                    {/* Chat Area */}
                    <div className="flex-1 flex flex-col bg-white dark:bg-slate-800 relative">
                        <AnalyticsChatWidget
                            embedded={true}
                            conversationId={currentConversationId}
                            onConversationUpdate={handleConversationUpdate}
                            onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
                            isSidebarOpen={isSidebarOpen}
                        />
                    </div>
                </main>
            </div>
        </div>
    );
};

export default Analytics;
