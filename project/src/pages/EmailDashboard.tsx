import React, { useState, useEffect } from 'react';
import PageLayout from '../components/PageLayout';
import EmailList from '../components/EmailList';
import ComposeEmailModal from '../components/ComposeEmailModal';
import { emailService } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { Mail, Inbox, Send, Paperclip, FileText, Reply, Forward, Trash2, Search, X, ChevronLeft } from 'lucide-react';
import { toast } from 'react-toastify';
import ConfirmModal from '../components/ConfirmModal';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';

const EmailDashboard = () => {
    const { t } = useTranslation();
    const { user } = useAuth();
    const [emails, setEmails] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [activeTab, setActiveTab] = useState<'inbox' | 'sent'>('inbox');
    const [composeModalOpen, setComposeModalOpen] = useState(false);
    const [selectedEmail, setSelectedEmail] = useState<any | null>(null);
    const [composeInitialData, setComposeInitialData] = useState<any>(undefined);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [emailToDelete, setEmailToDelete] = useState<any | null>(null);

    const fetchEmails = async () => {
        try {
            setLoading(true);
            const response = await emailService.getEmails();
            const data = response.data.results || response.data;
            setEmails(data);
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

        if (!searchQuery) return true;
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
            body: `\n\n--- ${t('email.details.originalMessage')} ---\n${t('email.details.from')} ${email.sender_name}\n${email.body}`,
        });
        setComposeModalOpen(true);
    };

    const handleForward = (email: any) => {
        setComposeInitialData({
            mode: 'forward',
            subject: email.subject.startsWith('Fwd:') ? email.subject : `Fwd: ${email.subject}`,
            body: `\n\n--- ${t('email.details.forwardedMessage')} ---\n${t('email.details.from')} ${email.sender_name}\n${t('email.details.date')} ${new Date(email.created_at).toLocaleString(t('common.dateLocale'))}\n${t('email.details.subject')} ${email.subject}\n\n${email.body}`,
        });
        setComposeModalOpen(true);
    };

    const handleDeleteEmail = (email: any) => {
        setEmailToDelete(email);
        setIsDeleteModalOpen(true);
    };

    const confirmDeleteEmail = async () => {
        if (!emailToDelete) return;
        try {
            await emailService.deleteEmail(emailToDelete.id);
            setEmails(prev => prev.filter(e => e.id !== emailToDelete.id));
            if (selectedEmail?.id === emailToDelete.id) setSelectedEmail(null);
            toast.success(t('email.toasts.deleted'));
        } catch {
            toast.error(t('email.toasts.deleteError'));
        } finally {
            setEmailToDelete(null);
            setIsDeleteModalOpen(false);
        }
    };

    const HeaderActions = (
        <button
            onClick={() => { setComposeInitialData(undefined); setComposeModalOpen(true); }}
            className="flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-lg shadow-blue-600/20 transition-all hover:scale-105 active:scale-95 font-bold text-sm"
        >
            <Mail className="w-4 h-4" />
            {t('email.new')}
        </button>
    );

    return (
        <PageLayout
            title={t('email.title')}
            subtitle="MESSAGING CENTER"
            actions={HeaderActions}
        >
            <div className="flex flex-col lg:flex-row gap-6 h-[calc(100vh-280px)] min-h-[600px]">

                {/* 1. Folders Column (Left Sidebar) */}
                <div className="w-full lg:w-64 flex-shrink-0 flex lg:flex-col gap-2">
                    <button
                        onClick={() => { setActiveTab('inbox'); setSelectedEmail(null); }}
                        className={`flex-1 lg:flex-none flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-bold text-sm ${activeTab === 'inbox'
                            ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/20 ring-1 ring-blue-500/50'
                            : 'bg-white/50 dark:bg-slate-800/40 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800/60 border border-slate-200/50 dark:border-slate-700/50'
                            }`}
                    >
                        <Inbox className="w-4 h-4" />
                        <span>{t('email.tabs.inbox')}</span>
                        {activeTab === 'inbox' && (
                            <span className="ml-auto bg-white/20 px-2 py-0.5 rounded-full text-[10px]">
                                {filteredEmails.length}
                            </span>
                        )}
                    </button>
                    <button
                        onClick={() => { setActiveTab('sent'); setSelectedEmail(null); }}
                        className={`flex-1 lg:flex-none flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-bold text-sm ${activeTab === 'sent'
                            ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/20 ring-1 ring-blue-500/50'
                            : 'bg-white/50 dark:bg-slate-800/40 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800/60 border border-slate-200/50 dark:border-slate-700/50'
                            }`}
                    >
                        <Send className="w-4 h-4" />
                        <span>{t('email.tabs.sent')}</span>
                        {activeTab === 'sent' && (
                            <span className="ml-auto bg-white/20 px-2 py-0.5 rounded-full text-[10px]">
                                {filteredEmails.length}
                            </span>
                        )}
                    </button>
                </div>

                {/* 2. Message List Column */}
                <div className={`w-full lg:w-[400px] flex-shrink-0 flex flex-col gap-4 ${selectedEmail ? 'hidden lg:flex' : 'flex'}`}>
                    <div className="relative group">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
                        <input
                            type="text"
                            placeholder={t('email.searchPlaceholder') || "Rechercher..."}
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-10 pr-4 py-2.5 bg-white/50 dark:bg-slate-800/40 border border-slate-200/50 dark:border-slate-700/50 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all"
                        />
                        {searchQuery && (
                            <button
                                onClick={() => setSearchQuery('')}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                            >
                                <X className="w-3.5 h-3.5" />
                            </button>
                        )}
                    </div>

                    <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
                        <EmailList
                            emails={filteredEmails}
                            selectedEmailId={selectedEmail?.id}
                            onEmailClick={handleEmailClick}
                            activeTab={activeTab}
                        />
                    </div>
                </div>

                {/* 3. Message Detail Column */}
                <div className={`flex-1 flex flex-col min-w-0 ${selectedEmail ? 'flex' : 'hidden lg:flex'}`}>
                    <AnimatePresence mode="wait">
                        {selectedEmail ? (
                            <motion.div
                                key={selectedEmail.id}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, scale: 0.95 }}
                                className="flex flex-col h-full bg-white/60 dark:bg-slate-800/60 backdrop-blur-xl border border-white/20 dark:border-slate-700/50 rounded-3xl shadow-2xl overflow-hidden"
                            >
                                {/* Detail Header */}
                                <div className="p-6 border-b border-slate-200/50 dark:border-slate-700/50 bg-white/20 dark:bg-slate-900/40">
                                    <div className="flex items-start justify-between gap-4 mb-6">
                                        <div className="flex items-center gap-4 lg:hidden">
                                            <button
                                                onClick={() => setSelectedEmail(null)}
                                                className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-full transition-colors"
                                            >
                                                <ChevronLeft className="w-5 h-5" />
                                            </button>
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <h2 className="text-xl font-black text-slate-900 dark:text-white tracking-tight mb-2 line-clamp-2">
                                                {selectedEmail.subject}
                                            </h2>
                                            <div className="flex items-center gap-2 text-xs">
                                                <div className="flex -space-x-2">
                                                    <div className="w-6 h-6 rounded-full bg-blue-500 border-2 border-white dark:border-slate-800 flex items-center justify-center text-[8px] font-bold text-white">
                                                        {selectedEmail.sender_name?.[0]?.toUpperCase()}
                                                    </div>
                                                </div>
                                                <span className="text-slate-500 dark:text-slate-400 font-medium">
                                                    {t('email.details.from')}
                                                    <strong className="text-slate-900 dark:text-slate-200 ml-1">{selectedEmail.sender_name}</strong>
                                                </span>
                                                <span className="text-slate-300 dark:text-slate-700">•</span>
                                                <span className="text-slate-400">
                                                    {new Date(selectedEmail.created_at).toLocaleString()}
                                                </span>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-2">
                                            {activeTab === 'inbox' && (
                                                <>
                                                    <button
                                                        onClick={() => handleReply(selectedEmail)}
                                                        className="p-2.5 hover:bg-blue-500 hover:text-white text-slate-500 dark:text-slate-400 rounded-xl transition-all border border-slate-200 dark:border-slate-700 hover:border-blue-500 shadow-sm"
                                                        title={t('email.details.reply')}
                                                    >
                                                        <Reply className="w-4 h-4" />
                                                    </button>
                                                    <button
                                                        onClick={() => handleForward(selectedEmail)}
                                                        className="p-2.5 hover:bg-emerald-500 hover:text-white text-slate-500 dark:text-slate-400 rounded-xl transition-all border border-slate-200 dark:border-slate-700 hover:border-emerald-500 shadow-sm"
                                                        title={t('email.details.forward')}
                                                    >
                                                        <Forward className="w-4 h-4" />
                                                    </button>
                                                </>
                                            )}
                                            <button
                                                onClick={() => handleDeleteEmail(selectedEmail)}
                                                className="p-2.5 hover:bg-red-500 hover:text-white text-slate-500 dark:text-slate-400 rounded-xl transition-all border border-slate-200 dark:border-slate-700 hover:border-red-500 shadow-sm"
                                                title={t('email.table.delete')}
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </div>
                                </div>

                                {/* Detail Content */}
                                <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
                                    <div className="max-w-3xl mx-auto">
                                        <div className="text-slate-700 dark:text-slate-300 whitespace-pre-wrap leading-relaxed text-sm md:text-base">
                                            {selectedEmail.body}
                                        </div>

                                        {selectedEmail.attachment && (
                                            <div className="mt-12 pt-8 border-t border-slate-100 dark:border-slate-700/50">
                                                <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                                                    <Paperclip className="w-3.5 h-3.5 text-blue-500" />
                                                    {t('email.details.attachment')}
                                                </h4>
                                                <a
                                                    href={selectedEmail.attachment}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="inline-flex items-center gap-4 p-4 bg-slate-50 dark:bg-slate-900/50 rounded-2xl border border-slate-200 dark:border-slate-700 hover:border-blue-400 dark:hover:border-blue-500 group transition-all"
                                                >
                                                    <div className="p-3 bg-white dark:bg-slate-800 rounded-xl shadow-sm text-blue-500 group-hover:scale-110 transition-transform">
                                                        <FileText className="w-6 h-6" />
                                                    </div>
                                                    <div>
                                                        <p className="text-sm font-bold text-slate-900 dark:text-white group-hover:text-blue-500 transition-colors">
                                                            {selectedEmail.attachment.split('/').pop()}
                                                        </p>
                                                        <p className="text-[10px] text-slate-500 font-medium uppercase tracking-tighter">
                                                            {t('email.details.download')}
                                                        </p>
                                                    </div>
                                                </a>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </motion.div>
                        ) : (
                            <div className="flex-1 flex items-center justify-center bg-slate-100/30 dark:bg-slate-800/20 rounded-3xl border border-dashed border-slate-300 dark:border-slate-700">
                                <div className="text-center">
                                    <div className="w-20 h-20 bg-blue-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
                                        <Inbox className="w-10 h-10 text-blue-500 opacity-20" />
                                    </div>
                                    <h3 className="text-lg font-bold text-slate-400 dark:text-slate-500 mb-2">
                                        {t('email.details.empty') || "Sélectionnez un message"}
                                    </h3>
                                    <p className="text-sm text-slate-400/60">
                                        {t('email.details.emptyDesc') || "Choisissez un message dans la liste pour l'afficher ici"}
                                    </p>
                                </div>
                            </div>
                        )}
                    </AnimatePresence>
                </div>
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

            <ConfirmModal
                isOpen={isDeleteModalOpen}
                title={t('email.modal.deleteTitle')}
                message={t('email.modal.deleteConfirm')}
                onConfirm={confirmDeleteEmail}
                onCancel={() => setIsDeleteModalOpen(false)}
                confirmText={t('common.delete')}
                type="danger"
            />
        </PageLayout>
    );
};

export default EmailDashboard;
