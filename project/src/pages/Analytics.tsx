import React, { useState, useEffect } from 'react';
import Header from '../components/Header';
import Sidebar from '../components/Sidebar';
import AnalyticsChatWidget from '../components/AnalyticsChatWidget';
import ChatHistorySidebar from '../components/ChatHistorySidebar';
import GrafanaDashboard from '../components/GrafanaDashboard';
import { toast } from 'react-toastify';
import { Bot, BarChart2 } from 'lucide-react';

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
    const [activeTab, setActiveTab] = useState<'chat' | 'grafana'>('chat');

    useEffect(() => {
        fetchConversations();
    }, []);

    const fetchConversations = async () => {
        try {
            setIsLoading(true);
            const token = localStorage.getItem('access_token');
            const response = await fetch('http://localhost:8000/api/analytics/conversations/', {
                headers: { 'Authorization': `Bearer ${token}` }
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

    const handleNewChat = () => setCurrentConversationId(null);
    const handleSelectConversation = (id: string) => setCurrentConversationId(id);

    const handleDeleteConversation = async (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        if (!window.confirm("Voulez-vous vraiment supprimer cette conversation ?")) return;
        try {
            const token = localStorage.getItem('access_token');
            await fetch(`http://localhost:8000/api/analytics/conversations/${id}/`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            setConversations(prev => prev.filter(c => c.id !== id));
            if (currentConversationId === id) setCurrentConversationId(null);
            toast.success("Conversation supprimée");
        } catch (error) {
            toast.error("Erreur lors de la suppression");
        }
    };

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-900 transition-colors duration-300 overflow-hidden flex flex-col">
            <Header />
            <div className="flex flex-1 h-[calc(100vh-4rem)]">
                <Sidebar />
                <main className="flex-1 lg:ml-64 flex flex-col">

                    {/* Tab Bar */}
                    <div className="flex items-center gap-1 px-4 pt-3 pb-0 border-b border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shrink-0">
                        <button
                            onClick={() => setActiveTab('chat')}
                            className={`flex items-center gap-2 px-4 py-2.5 rounded-t-xl text-sm font-medium border-b-2 transition-all ${activeTab === 'chat'
                                ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/20'
                                : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                                }`}
                        >
                            <Bot size={16} />
                            Agent IA
                        </button>
                        <button
                            onClick={() => setActiveTab('grafana')}
                            className={`flex items-center gap-2 px-4 py-2.5 rounded-t-xl text-sm font-medium border-b-2 transition-all ${activeTab === 'grafana'
                                ? 'border-orange-500 text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-900/20'
                                : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                                }`}
                        >
                            <BarChart2 size={16} />
                            Dashboards Grafana
                        </button>
                    </div>

                    {/* Tab Content */}
                    {activeTab === 'chat' ? (
                        <div className="flex flex-1 overflow-hidden">
                            {/* Chat History Sidebar */}
                            <div className={`${isSidebarOpen ? 'w-64' : 'w-0'} transition-all duration-300 ease-in-out overflow-hidden flex flex-col border-r border-slate-200 dark:border-slate-800 bg-slate-900 h-full`}>
                                <div className="w-64 h-full flex flex-col">
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
                            <div className="flex-1 flex flex-col bg-white dark:bg-slate-800 relative">
                                <AnalyticsChatWidget
                                    embedded={true}
                                    conversationId={currentConversationId}
                                    onConversationUpdate={fetchConversations}
                                    onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
                                    isSidebarOpen={isSidebarOpen}
                                />
                            </div>
                        </div>
                    ) : (
                        <GrafanaDashboard />
                    )}
                </main>
            </div>
        </div>
    );
};

export default Analytics;

