import React, { useState, useEffect } from 'react';
import PageLayout from '../../components/PageLayout';
import EmailList from '../../components/EmailList';
import { emailService } from '../../services/api';
import { toast } from 'react-toastify';
import ConfirmModal from '../../components/ConfirmModal';
import StatCard from '../../components/StatCard';
import { Mail, Paperclip, Trash2, Eye, Send, Inbox, Search, X, ChevronLeft } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useMemo } from 'react';
import Pagination from '../../components/Pagination';
import { motion, AnimatePresence } from 'framer-motion';

const AdminEmails = () => {
    const { t } = useTranslation();
    const [emails, setEmails] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedEmail, setSelectedEmail] = useState<any | null>(null);
    const [currentPage, setCurrentPage] = useState(1);
    const pageSize = 10;
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [emailToDelete, setEmailToDelete] = useState<any | null>(null);

    const fetchEmails = async () => {
        try {
            setLoading(true);
            const response = await emailService.getEmails();
            const data = response.data.results || response.data;
            setEmails(Array.isArray(data) ? data : []);
        } catch (error) {
            console.error("Failed to fetch emails", error);
            toast.error(t('adminEmails.toasts.fetchError'));
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchEmails();
    }, []);

    const filteredEmails = useMemo(() => {
        if (!searchQuery) return emails;
        const query = searchQuery.toLowerCase();
        return emails.filter(email =>
            email.subject?.toLowerCase().includes(query) ||
            email.body?.toLowerCase().includes(query) ||
            (email.sender_name || '').toLowerCase().includes(query) ||
            (email.recipient_name || '').toLowerCase().includes(query)
        );
    }, [emails, searchQuery]);

    const paginatedEmails = useMemo(() => {
        const startIndex = (currentPage - 1) * pageSize;
        return filteredEmails.slice(startIndex, startIndex + pageSize);
    }, [filteredEmails, currentPage, pageSize]);

    const stats = useMemo(() => {
        const total = emails.length;
        const withAttachments = emails.filter(e => e.attachment).length;
        const recent = emails.filter(e => {
            const diff = new Date().getTime() - new Date(e.created_at).getTime();
            return diff < (24 * 60 * 60 * 1000);
        }).length;
        const readRate = total > 0
            ? Math.round((emails.filter(e => e.is_read).length / total) * 100)
            : 0;

        return { total, withAttachments, recent, readRate };
    }, [emails]);

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
            toast.success(t('adminEmails.toasts.deleteSuccess'));
        } catch {
            toast.error(t('adminEmails.toasts.deleteError'));
        } finally {
            setEmailToDelete(null);
            setIsDeleteModalOpen(false);
        }
    };

    return (
        <PageLayout
            title={t('adminEmails.title')}
            subtitle="ADMINISTRATION MESSAGERIE"
        >
            <div className="space-y-8">
                {/* 1. Stats Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <StatCard
                        title={t('adminEmails.stats.volume')}
                        value={stats.total}
                        icon={Inbox}
                        variant="blue"
                        description={t('adminEmails.stats.volumeDesc')}
                    />
                    <StatCard
                        title={t('adminEmails.stats.attachments')}
                        value={stats.withAttachments}
                        icon={Paperclip}
                        variant="purple"
                        description={t('adminEmails.stats.attachmentsDesc')}
                    />
                    <StatCard
                        title={t('adminEmails.stats.recent')}
                        value={stats.recent}
                        icon={Send}
                        variant="green"
                        description={t('adminEmails.stats.recentDesc')}
                        change={stats.recent > 0 ? `+${stats.recent}` : undefined}
                        changeType="positive"
                    />
                    <StatCard
                        title={t('adminEmails.stats.readRate')}
                        value={`${stats.readRate}%`}
                        icon={Eye}
                        variant="yellow"
                        description={t('adminEmails.stats.readRateDesc')}
                        change={stats.readRate >= 80 ? t('adminEmails.stats.optimal') : t('adminEmails.stats.watch')}
                        changeType={stats.readRate >= 80 ? "positive" : "neutral"}
                    />
                </div>

                {/* 2. Messaging UI */}
                <div className="flex flex-col lg:flex-row gap-6 h-[calc(100vh-450px)] min-h-[500px]">

                    {/* List Column */}
                    <div className={`w-full lg:w-[450px] flex-shrink-0 flex flex-col gap-4 ${selectedEmail ? 'hidden lg:flex' : 'flex'}`}>
                        <div className="relative group">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
                            <input
                                type="text"
                                placeholder={t('adminEmails.searchPlaceholder') || "Rechercher un message..."}
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full pl-10 pr-4 py-2.5 bg-white/50 dark:bg-slate-800/40 border border-slate-200/50 dark:border-slate-700/50 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all font-medium"
                            />
                            {searchQuery && (
                                <button onClick={() => setSearchQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                                    <X className="w-3.5 h-3.5" />
                                </button>
                            )}
                        </div>

                        <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
                            <EmailList
                                emails={paginatedEmails}
                                selectedEmailId={selectedEmail?.id}
                                onEmailClick={setSelectedEmail}
                                activeTab="inbox"
                            />
                        </div>

                        <div className="mt-2">
                            <Pagination
                                currentPage={currentPage}
                                totalItems={filteredEmails.length}
                                pageSize={pageSize}
                                onPageChange={setCurrentPage}
                                loading={loading}
                            />
                        </div>
                    </div>

                    {/* Detail Column */}
                    <div className={`flex-1 flex flex-col min-w-0 ${selectedEmail ? 'flex' : 'hidden lg:flex'}`}>
                        <AnimatePresence mode="wait">
                            {selectedEmail ? (
                                <motion.div
                                    key={selectedEmail.id}
                                    initial={{ opacity: 0, x: 20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, scale: 0.95 }}
                                    className="flex flex-col h-full bg-white/60 dark:bg-slate-800/60 backdrop-blur-xl border border-white/20 dark:border-slate-700/50 rounded-3xl shadow-2xl overflow-hidden"
                                >
                                    <div className="p-6 border-b border-slate-200/50 dark:border-slate-700/50 bg-white/20 dark:bg-slate-900/40">
                                        <div className="flex items-start justify-between gap-4">
                                            <div className="flex items-center gap-4 lg:hidden">
                                                <button onClick={() => setSelectedEmail(null)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-full transition-colors">
                                                    <ChevronLeft className="w-5 h-5" />
                                                </button>
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <h2 className="text-xl font-black text-slate-900 dark:text-white tracking-tight mb-2 line-clamp-2">{selectedEmail.subject}</h2>
                                                <div className="flex flex-wrap gap-4 text-xs font-medium text-slate-500">
                                                    <span>{t('adminEmails.details.from')}: <strong className="text-blue-500">{selectedEmail.sender_name}</strong></span>
                                                    <span>{t('adminEmails.details.to')}: <strong className="text-emerald-500">{selectedEmail.recipient_name}</strong></span>
                                                    <span>{new Date(selectedEmail.created_at).toLocaleString()}</span>
                                                </div>
                                            </div>
                                            <button
                                                onClick={() => handleDeleteEmail(selectedEmail)}
                                                className="p-2.5 bg-red-500/10 hover:bg-red-500 text-red-500 hover:text-white rounded-xl transition-all border border-red-500/20 shadow-sm"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </div>

                                    <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
                                        <div className="max-w-3xl mx-auto bg-slate-50/50 dark:bg-slate-900/30 p-6 rounded-2xl border border-slate-100 dark:border-slate-800 italic leading-relaxed text-slate-700 dark:text-slate-300">
                                            {selectedEmail.body}
                                        </div>

                                        {selectedEmail.attachment && (
                                            <div className="mt-8 pt-8 border-t border-slate-100 dark:border-slate-700/50">
                                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">{t('adminEmails.details.attachment')}</p>
                                                <a href={selectedEmail.attachment} target="_blank" rel="noreferrer" className="inline-flex items-center gap-3 p-3 bg-white dark:bg-slate-800 rounded-xl border border-blue-100 dark:border-blue-900/30 text-blue-500 hover:bg-blue-50 transition-all font-bold text-sm shadow-sm">
                                                    <Paperclip className="w-4 h-4" />
                                                    {selectedEmail.attachment.split('/').pop()}
                                                </a>
                                            </div>
                                        )}
                                    </div>
                                </motion.div>
                            ) : (
                                <div className="flex-1 flex items-center justify-center bg-slate-100/30 dark:bg-slate-800/20 rounded-3xl border border-dashed border-slate-300 dark:border-slate-700">
                                    <div className="text-center">
                                        <Mail className="w-16 h-16 text-slate-300 dark:text-slate-600 mx-auto mb-4 opacity-20" />
                                        <p className="text-slate-500 dark:text-slate-400 font-bold">{t('adminEmails.details.empty')}</p>
                                    </div>
                                </div>
                            )}
                        </AnimatePresence>
                    </div>
                </div>
            </div>

            <ConfirmModal
                isOpen={isDeleteModalOpen}
                title={t('adminEmails.modal.deleteTitle')}
                message={t('adminEmails.modal.deleteConfirm', { id: emailToDelete?.id })}
                onConfirm={confirmDeleteEmail}
                onCancel={() => setIsDeleteModalOpen(false)}
                confirmText={t('common.delete')}
                type="danger"
            />
        </PageLayout>
    );
};

export default AdminEmails;
