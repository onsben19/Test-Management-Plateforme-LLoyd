import React, { useState, useEffect } from 'react';
import PageLayout from '../components/PageLayout';
import EmailList from '../components/EmailList';
import ComposeEmailModal from '../components/ComposeEmailModal';
import { emailService } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { Mail, Inbox, Send, Paperclip, FileText, Reply, Forward, Trash2, Search, X, ChevronLeft, Download } from 'lucide-react';
import { toast } from 'react-toastify';
import ConfirmModal from '../components/ConfirmModal';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import Button from '../components/ui/Button';

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
        <Button
            onClick={() => { setComposeInitialData(undefined); setComposeModalOpen(true); }}
            icon={Mail}
        >
            {t('email.new')}
        </Button>
    );

    return (
                <PageLayout 
            title={<span className="text-[20px] font-medium text-[#e8eaf6]">Messagerie</span>} 
            subtitle="Messaging Center" 
            actions={
                <button onClick={() => setComposeModalOpen(true)} className="bg-[#185FA5] text-[#B5D4F4] border-[0.5px] border-[#378ADD] rounded-[10px] px-[16px] py-[9px] text-[12px] flex items-center gap-2 font-medium hover:bg-[#1a68b5] transition-colors">
                    <Mail size={16} /> Nouveau message
                </button>
            }
            noPadding
        >
            <div className="grid gap-[10px] h-[560px]" style={{ gridTemplateColumns: '180px 280px 1fr' }}>
                {/* Colonne 1 — Sidebar */}
                <div className="bg-[#111827] rounded-[12px] border-[0.5px] border-white/[0.08] p-[12px] flex flex-col gap-[4px]">
                    <button onClick={() => { setActiveTab('inbox'); setSelectedEmail(null); }} className={`flex items-center gap-2 p-[10px] rounded-[10px] text-[12px] font-medium w-full text-left transition-all ${activeTab === 'inbox' ? 'bg-[#378ADD]/15 border-[0.5px] border-[#378ADD]/25 text-[#85B7EB]' : 'bg-transparent text-white/40 border-[0.5px] border-transparent hover:bg-white/5'}`}>
                        <Inbox size={16} /> Boîte de réception
                        {activeTab === 'inbox' && filteredEmails.length > 0 && (
                            <span className="bg-[#185FA5] text-white text-[10px] px-[7px] py-[2px] rounded-[20px] ml-auto">{filteredEmails.length}</span>
                        )}
                    </button>
                    <button onClick={() => { setActiveTab('sent'); setSelectedEmail(null); }} className={`flex items-center gap-2 p-[10px] rounded-[10px] text-[12px] font-medium w-full text-left transition-all ${activeTab === 'sent' ? 'bg-[#378ADD]/15 border-[0.5px] border-[#378ADD]/25 text-[#85B7EB]' : 'bg-transparent text-white/40 border-[0.5px] border-transparent hover:bg-white/5'}`}>
                        <Send size={16} /> Envoyés
                        {activeTab === 'sent' && filteredEmails.length > 0 && (
                            <span className="bg-[#185FA5] text-white text-[10px] px-[7px] py-[2px] rounded-[20px] ml-auto">{filteredEmails.length}</span>
                        )}
                    </button>
                </div>

                {/* Colonne 2 — Liste des messages */}
                <div className="bg-[#111827] rounded-[12px] border-[0.5px] border-white/[0.08] p-[10px] flex flex-col gap-[4px] overflow-hidden">
                    <div className="bg-[#1a2235] rounded-[10px] p-[9px] px-[12px] border-[0.5px] border-white/[0.07] flex items-center gap-2 mb-2 shrink-0">
                        <Search size={14} className="text-white/40" />
                        <input
                            type="text"
                            placeholder="Rechercher..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="flex-1 bg-transparent border-none text-[12px] text-white focus:outline-none placeholder:text-white/40 w-full"
                        />
                    </div>
                    <div className="flex-1 overflow-y-auto custom-scrollbar flex flex-col gap-[4px]">
                        {filteredEmails.map((email) => {
                            const isActive = selectedEmail?.id === email.id;
                            const displayName = activeTab === 'inbox' ? email.sender_name : email.recipient_name;
                            const displayDate = new Date(email.created_at).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });

                            return (
                                <button
                                    key={email.id}
                                    onClick={() => handleEmailClick(email)}
                                    className={`p-[10px] rounded-[10px] border-[0.5px] flex items-start gap-3 transition-all text-left ${isActive ? 'bg-[#378ADD]/10 border-[#378ADD]/20' : 'bg-transparent border-white/[0.05] hover:bg-white/[0.02]'}`}
                                >
                                    <div className="w-[30px] h-[30px] shrink-0 bg-[#185FA5] text-[#B5D4F4] text-[12px] font-bold rounded-full flex items-center justify-center">
                                        {(displayName?.charAt(0) || 'M').toUpperCase()}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center justify-between mb-0.5">
                                            <span className="text-[12px] font-medium text-white truncate">{displayName || "Inconnu"}</span>
                                            <span className="text-[10px] text-white/40 shrink-0 ml-2">{displayDate}</span>
                                        </div>
                                        <div className="text-[11px] text-white/55 truncate mb-[1px]">
                                            {email.subject?.replace(/\*/g, '') || "Sujet..."}
                                        </div>
                                        <div className="text-[11px] text-white/30 truncate flex items-center justify-between">
                                            <span className="truncate">{email.body ? email.body.substring(0, 30) + '...' : "Aucun aperçu disponible"}</span>
                                            {email.attachment && <Paperclip size={12} className="text-white/40 shrink-0 ml-2" />}
                                        </div>
                                    </div>
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* Colonne 3 — Panneau de lecture */}
                <div className="bg-[#111827] rounded-[12px] border-[0.5px] border-white/[0.08] flex flex-col overflow-hidden">
                    {selectedEmail ? (
                        <>
                            {/* Header du message */}
                            <div className="px-[18px] py-[16px] border-b-[0.5px] border-white/[0.07] shrink-0">
                                <h2 className="text-[15px] font-medium text-white mb-2" style={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                                    {(selectedEmail.subject || "Sans sujet").replace(/\*/g, '')}
                                </h2>
                                <div className="flex items-center">
                                    <div className="w-[22px] h-[22px] bg-[#185FA5] rounded-full flex items-center justify-center text-[10px] font-bold text-[#B5D4F4] mr-2">
                                        {(selectedEmail.sender_name?.charAt(0) || "M").toUpperCase()}
                                    </div>
                                    <span className="text-[12px] text-white/40 mr-2">De : {selectedEmail.sender_name || "manager"}</span>
                                    <span className="w-1 h-1 bg-white/20 rounded-full mr-2"></span>
                                    <span className="text-[11px] text-white/40">
                                        {selectedEmail.created_at ? new Date(selectedEmail.created_at).toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit' }) : ""}
                                    </span>
                                    <div className="ml-auto flex items-center gap-1">
                                        <button onClick={() => handleForward(selectedEmail)} className="w-[28px] h-[28px] rounded-[8px] hover:bg-white/5 flex items-center justify-center text-white/40 hover:text-white transition-colors" title="Transférer">
                                            <Forward size={14} />
                                        </button>
                                        <button onClick={() => handleDeleteEmail(selectedEmail)} className="w-[28px] h-[28px] rounded-[8px] hover:bg-rose-500/10 flex items-center justify-center text-white/40 hover:text-rose-400 transition-colors" title="Supprimer">
                                            <Trash2 size={14} />
                                        </button>
                                    </div>
                                </div>
                            </div>

                            {/* Scrollable area for body and attachment */}
                            <div className="flex-1 overflow-y-auto custom-scrollbar">
                                {/* Corps du message */}
                                <div className="bg-[#1a2235] rounded-[10px] px-[16px] py-[14px] m-[14px] mx-[18px]">
                                    <p className="text-[13px] text-white/60 leading-[1.7] whitespace-pre-wrap">
                                        {selectedEmail.body || "..."}
                                    </p>
                                </div>

                                {/* Pièce jointe */}
                                {selectedEmail.attachment && (
                                    <div className="px-[18px] pb-[14px]">
                                        <div className="flex items-center gap-1 mb-[8px]">
                                            <Paperclip size={10} className="text-white/40" />
                                            <span className="text-[10px] font-medium text-white/40 uppercase tracking-widest">PIÈCE JOINTE</span>
                                        </div>
                                        <div className="bg-[#1a2235] border-[0.5px] border-white/[0.08] rounded-[10px] px-[13px] py-[11px] flex items-center gap-[12px]">
                                            <div className="w-[36px] h-[36px] rounded-[9px] bg-[#1D9E75]/15 flex items-center justify-center shrink-0">
                                                <FileText size={16} className="text-[#5DCAA5]" />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="text-[12px] text-white truncate font-medium">{selectedEmail.attachment.split('/').pop() || "Document joint"}</div>
                                                <div className="text-[11px] text-white/40">Cliquer pour télécharger</div>
                                            </div>
                                            <button onClick={() => window.open(selectedEmail.attachment, '_blank')} className="text-white/25 hover:text-white/50 p-2 shrink-0">
                                                <Download size={16} />
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Zone de réponse */}
                            <div className="p-[12px] px-[18px] border-t-[0.5px] border-white/[0.07] mt-auto shrink-0 bg-[#111827]">
                                <textarea
                                    placeholder="Écrire une réponse..."
                                    className="w-full bg-[#1a2235] border-[0.5px] border-white/10 rounded-[10px] px-[14px] py-[11px] text-[13px] text-white placeholder:text-white/25 focus:outline-none focus:border-white/20 resize-none min-h-[48px] mb-[12px]"
                                    rows={1}
                                    onFocus={() => handleReply(selectedEmail)}
                                />
                                <div className="flex items-center justify-between">
                                    <button className="w-[32px] h-[32px] rounded-[8px] hover:bg-white/5 flex items-center justify-center text-white/40 hover:text-white/80 transition-colors">
                                        <Paperclip size={16} />
                                    </button>
                                    <button onClick={() => handleReply(selectedEmail)} className="bg-[#185FA5] text-[#B5D4F4] border-[0.5px] border-[#378ADD] rounded-[8px] px-[16px] py-[8px] text-[12px] font-medium flex items-center gap-2 hover:bg-[#1a68b5] transition-colors">
                                        Répondre <Reply size={14} />
                                    </button>
                                </div>
                            </div>
                        </>
                    ) : (
                        <div className="flex-1 flex flex-col items-center justify-center text-white/40 text-[13px] space-y-4">
                            <div className="w-16 h-16 rounded-full bg-white/[0.02] border border-white/[0.05] flex items-center justify-center">
                                <Inbox size={24} className="text-white/20" />
                            </div>
                            Sélectionnez un message pour le lire
                        </div>
                    )}
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
