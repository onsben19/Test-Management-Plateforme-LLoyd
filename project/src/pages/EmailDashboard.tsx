import React, { useState, useEffect } from 'react';
import Header from '../components/Header';
import Sidebar from '../components/Sidebar';
import AdminTable from '../components/AdminTable';
import ComposeEmailModal from '../components/ComposeEmailModal';
import { emailService } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useSidebar } from '../context/SidebarContext';
import { Mail, Inbox, Send, Paperclip, FileText, Reply, Forward, Trash2 } from 'lucide-react';
import { toast } from 'react-toastify';

const EmailDashboard = () => {
    const { user } = useAuth();
    const { isOpen } = useSidebar();
    const [emails, setEmails] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [activeTab, setActiveTab] = useState<'inbox' | 'sent'>('inbox');
    const [composeModalOpen, setComposeModalOpen] = useState(false);
    const [selectedEmail, setSelectedEmail] = useState<any | null>(null);
    const [composeInitialData, setComposeInitialData] = useState<any>(undefined);

    const fetchEmails = async () => {
        try {
            setLoading(true);
            const response = await emailService.getEmails();
            setEmails(response.data);
        } catch (error) {
            console.error("Failed to fetch emails", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchEmails();
    }, []);

    const filteredEmails = emails.filter(email => {
        const isInbox = activeTab === 'inbox' ? email.recipient === user?.id : email.sender === user?.id;
        if (!isInbox) return false;
        const query = searchQuery.toLowerCase();
        return (
            email.subject.toLowerCase().includes(query) ||
            email.body.toLowerCase().includes(query) ||
            (email.sender_name || '').toLowerCase().includes(query) ||
            (email.recipient_name || '').toLowerCase().includes(query)
        );
    });

    const handleEmailClick = async (email: any) => {
        setSelectedEmail(email);
        if (activeTab === 'inbox' && !email.is_read) {
            try {
                await emailService.markAsRead(email.id);
                setEmails(prev => prev.map(e => e.id === email.id ? { ...e, is_read: true } : e));
            } catch (error) {
                console.error("Failed to mark as read", error);
            }
        }
    };

    const handleReply = (email: any) => {
        setComposeInitialData({
            mode: 'reply',
            recipientId: String(email.sender),
            subject: email.subject.startsWith('Re:') ? email.subject : `Re: ${email.subject}`,
            body: `\n\n--- Message original ---\nDe : ${email.sender_name}\n${email.body}`,
        });
        setComposeModalOpen(true);
    };

    const handleForward = (email: any) => {
        setComposeInitialData({
            mode: 'forward',
            subject: email.subject.startsWith('Fwd:') ? email.subject : `Fwd: ${email.subject}`,
            body: `\n\n--- Message transféré ---\nDe : ${email.sender_name}\nDate : ${new Date(email.created_at).toLocaleString('fr-FR')}\nObjet : ${email.subject}\n\n${email.body}`,
        });
        setComposeModalOpen(true);
    };

    const handleDeleteEmail = async (email: any) => {
        if (!window.confirm(`Supprimer le message "${email.subject}" ?`)) return;
        try {
            await emailService.deleteEmail(email.id);
            setEmails(prev => prev.filter(e => e.id !== email.id));
            if (selectedEmail?.id === email.id) setSelectedEmail(null);
            toast.success("Message supprimé");
        } catch {
            toast.error("Erreur lors de la suppression");
        }
    };

    const columns = [
        {
            header: activeTab === 'inbox' ? 'De' : 'À',
            accessor: (item: any) => (
                <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${!item.is_read && activeTab === 'inbox' ? 'bg-blue-500' : 'bg-transparent'}`}></div>
                    <span className={`font-medium ${!item.is_read && activeTab === 'inbox' ? 'text-slate-900 dark:text-white font-semibold' : 'text-slate-600 dark:text-slate-400'}`}>
                        {activeTab === 'inbox' ? item.sender_name : item.recipient_name}
                    </span>
                </div>
            )
        },
        {
            header: 'Sujet',
            accessor: (item: any) => (
                <div className="flex items-center gap-2">
                    <span className={`${!item.is_read && activeTab === 'inbox' ? 'text-slate-900 dark:text-white font-medium' : 'text-slate-600 dark:text-slate-400'}`}>
                        {item.subject}
                    </span>
                    {item.attachment && <Paperclip className="w-3 h-3 text-slate-400" />}
                </div>
            )
        },
        {
            header: 'Date',
            accessor: (item: any) => new Date(item.created_at).toLocaleString('fr-FR')
        }
    ];

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-900 transition-colors flex flex-col">
            <Header />
            <div className="flex flex-1 relative">
                <Sidebar />
                <main className={`flex-1 p-8 flex flex-col h-[calc(100vh-64px)] overflow-hidden transition-all duration-300 ${isOpen ? 'lg:ml-64' : 'lg:ml-16'}`}>
                    <div className="max-w-7xl mx-auto w-full flex-1 flex flex-col">
                        <div className="flex justify-between items-center mb-6">
                            <div>
                                <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">Messagerie</h1>
                                <p className="text-slate-500 dark:text-slate-400">Gérez vos communications internes</p>
                            </div>
                            <button
                                onClick={() => { setComposeInitialData(undefined); setComposeModalOpen(true); }}
                                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg flex items-center gap-2 transition-colors shadow-lg shadow-blue-500/20"
                            >
                                <Mail className="w-4 h-4" />
                                Nouveau Message
                            </button>
                        </div>

                        {/* Tabs */}
                        <div className="flex space-x-1 bg-slate-200 dark:bg-slate-800 p-1 rounded-lg w-fit mb-6">
                            <button
                                onClick={() => { setActiveTab('inbox'); setSelectedEmail(null); }}
                                className={`px-4 py-2 rounded-md text-sm font-medium transition-all flex items-center gap-2 ${activeTab === 'inbox'
                                    ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm'
                                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
                                    }`}
                            >
                                <Inbox className="w-4 h-4" />
                                Boîte de réception
                            </button>
                            <button
                                onClick={() => { setActiveTab('sent'); setSelectedEmail(null); }}
                                className={`px-4 py-2 rounded-md text-sm font-medium transition-all flex items-center gap-2 ${activeTab === 'sent'
                                    ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm'
                                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
                                    }`}
                            >
                                <Send className="w-4 h-4" />
                                Envoyés
                            </button>
                        </div>

                        <div className="flex gap-6 flex-1 overflow-hidden">
                            {/* Email List */}
                            <div className={`${selectedEmail ? 'hidden md:block w-1/3' : 'w-full'} overflow-y-auto`}>
                                <AdminTable
                                    title={activeTab === 'inbox' ? 'Reçus' : 'Envoyés'}
                                    columns={columns}
                                    data={filteredEmails}
                                    isLoading={loading}
                                    searchable
                                    onSearch={setSearchQuery}
                                    actions={(item) => (
                                        <div className="flex items-center gap-2">
                                            <button
                                                onClick={() => handleEmailClick(item)}
                                                className="px-3 py-1 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-300 rounded text-xs transition-colors"
                                            >
                                                Ouvrir
                                            </button>
                                            {activeTab === 'sent' && (
                                                <button
                                                    onClick={() => handleDeleteEmail(item)}
                                                    className="p-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-500 hover:text-red-400 rounded transition-colors"
                                                    title="Supprimer"
                                                >
                                                    <Trash2 className="w-3.5 h-3.5" />
                                                </button>
                                            )}
                                        </div>
                                    )}
                                />
                            </div>

                            {/* Email Details */}
                            {selectedEmail && (
                                <div className="flex-1 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6 overflow-y-auto animate-in fade-in slide-in-from-right-4">
                                    <div className="flex justify-between items-start mb-6 border-b border-slate-200 dark:border-slate-700 pb-4">
                                        <div className="flex-1 min-w-0 mr-4">
                                            <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-2">{selectedEmail.subject}</h2>
                                            <div className="text-sm text-slate-500 dark:text-slate-400">
                                                <span className="text-slate-400 dark:text-slate-500">De:</span>{' '}
                                                <span className="text-slate-800 dark:text-white font-medium">{selectedEmail.sender_name}</span>
                                                <span className="mx-2">•</span>
                                                <span className="text-slate-400 dark:text-slate-500">À:</span>{' '}
                                                <span className="text-slate-800 dark:text-white font-medium">{selectedEmail.recipient_name}</span>
                                                <span className="mx-2">•</span>
                                                <span>{new Date(selectedEmail.created_at).toLocaleString('fr-FR')}</span>
                                            </div>
                                        </div>
                                        {/* Reply / Forward Actions */}
                                        <div className="flex items-center gap-2 flex-shrink-0">
                                            {activeTab === 'inbox' && (
                                                <>
                                                    <button
                                                        onClick={() => handleReply(selectedEmail)}
                                                        className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 dark:bg-slate-700 hover:bg-blue-600 hover:text-white text-slate-700 dark:text-slate-300 rounded-lg text-sm transition-colors"
                                                    >
                                                        <Reply className="w-4 h-4" />
                                                        Répondre
                                                    </button>
                                                    <button
                                                        onClick={() => handleForward(selectedEmail)}
                                                        className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 dark:bg-slate-700 hover:bg-emerald-600 hover:text-white text-slate-700 dark:text-slate-300 rounded-lg text-sm transition-colors"
                                                    >
                                                        <Forward className="w-4 h-4" />
                                                        Transférer
                                                    </button>
                                                </>
                                            )}
                                            <button
                                                onClick={() => setSelectedEmail(null)}
                                                className="md:hidden text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white text-sm"
                                            >
                                                Fermer
                                            </button>
                                        </div>
                                    </div>

                                    <div className="text-slate-700 dark:text-slate-300 whitespace-pre-wrap leading-relaxed mb-6">
                                        {selectedEmail.body}
                                    </div>

                                    {selectedEmail.attachment && (
                                        <div className="mt-8 pt-6 border-t border-slate-200 dark:border-slate-700">
                                            <h4 className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-3 flex items-center gap-2">
                                                <Paperclip className="w-4 h-4" />
                                                Pièce jointe
                                            </h4>
                                            <a
                                                href={selectedEmail.attachment}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="inline-flex items-center gap-3 p-3 bg-slate-100 dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700 hover:border-blue-400 transition-colors group"
                                            >
                                                <div className="p-2 bg-white dark:bg-slate-800 rounded text-blue-500 group-hover:text-blue-400">
                                                    <FileText className="w-6 h-6" />
                                                </div>
                                                <div className="text-left">
                                                    <p className="text-sm font-medium text-slate-800 dark:text-white group-hover:text-blue-500 transition-colors">
                                                        {selectedEmail.attachment.split('/').pop()}
                                                    </p>
                                                    <p className="text-xs text-slate-500">Cliquer pour télécharger</p>
                                                </div>
                                            </a>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                </main>
            </div>

            {composeModalOpen && (
                <ComposeEmailModal
                    onClose={() => {
                        setComposeModalOpen(false);
                        setComposeInitialData(undefined);
                    }}
                    onSuccess={fetchEmails}
                    initialData={composeInitialData}
                />
            )}
        </div>
    );
};

export default EmailDashboard;
