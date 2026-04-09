import React, { useState, useEffect } from 'react';
import { X, Paperclip, Send, Loader, Wand2, UserPlus, Trash2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { userService, emailService, aiService } from '../services/api';
import { toast } from 'react-toastify';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';

interface ComposeEmailModalProps {
    onClose: () => void;
    onSuccess: () => void;
    initialData?: {
        mode?: 'reply' | 'forward' | 'compose';
        recipientId?: string;
        subject?: string;
        body?: string;
    };
}

const ComposeEmailModal: React.FC<ComposeEmailModalProps> = ({ onClose, onSuccess, initialData }) => {
    const { t } = useTranslation();
    const { user } = useAuth();
    const [users, setUsers] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [sending, setSending] = useState(false);

    const [recipientIds, setRecipientIds] = useState<string[]>([]);
    const [subject, setSubject] = useState('');
    const [body, setBody] = useState('');
    const [attachment, setAttachment] = useState<File | null>(null);
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [reformulating, setReformulating] = useState(false);
    const [subjectReformulating, setSubjectReformulating] = useState(false);

    useEffect(() => {
        fetchUsers();
    }, []);

    useEffect(() => {
        if (!initialData) return;
        if (initialData.recipientId) setRecipientIds([initialData.recipientId]);
        if (initialData.subject) setSubject(initialData.subject);
        if (initialData.body) setBody(initialData.body);
    }, [initialData]);

    const fetchUsers = async () => {
        try {
            setLoading(true);
            const response = await userService.getUsers();
            const data = response.data.results || response.data;
            const otherUsers = data.filter((u: any) => u.id !== user?.id);
            setUsers(otherUsers);
        } catch (error) {
            console.error("Failed to fetch users", error);
        } finally {
            setLoading(false);
        }
    };

    const toggleRecipient = (userId: string) => {
        setRecipientIds(prev =>
            prev.includes(String(userId))
                ? prev.filter(id => id !== String(userId))
                : [...prev, String(userId)]
        );
    };

    const filteredUsers = users.filter(u =>
        u.username.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const handleReformulate = async () => {
        if (!body.trim()) { toast.warning(t('email.toasts.aiWarningBody')); return; }
        try {
            setReformulating(true);
            const response = await aiService.reformulate(body, false);
            const reformulated = response.data?.reformulated_message || response.data?.message;
            if (reformulated) { setBody(reformulated); toast.success(t('email.toasts.reformulated')); }
            else toast.error(t('email.toasts.noReformulation'));
        } catch { toast.error(t('email.toasts.reformulateError')); }
        finally { setReformulating(false); }
    };

    const handleSubjectReformulate = async () => {
        if (!subject.trim()) { toast.warning(t('email.toasts.aiWarningSubject')); return; }
        try {
            setSubjectReformulating(true);
            const response = await aiService.reformulate(subject, true);
            const reformulated = response.data?.reformulated_message || response.data?.message;
            if (reformulated) { setSubject(reformulated); toast.success(t('email.toasts.subjectReformulated')); }
            else toast.error(t('email.toasts.noReformulation'));
        } catch { toast.error(t('email.toasts.subjectReformulateError')); }
        finally { setSubjectReformulating(false); }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (recipientIds.length === 0 || !subject || !body) {
            toast.error(t('email.toasts.requiredFields'));
            return;
        }
        try {
            setSending(true);
            const formData = new FormData();
            recipientIds.forEach(id => formData.append('recipients', id));
            formData.append('subject', subject);
            formData.append('body', body);
            if (attachment) formData.append('attachment', attachment);
            await emailService.sendEmail(formData);
            toast.success(t('email.toasts.sent'));
            onSuccess();
            onClose();
        } catch {
            toast.error(t('email.toasts.sendError'));
        } finally {
            setSending(false);
        }
    };

    const modalTitle = initialData?.mode === 'reply' ? t('email.compose.reply') : initialData?.mode === 'forward' ? t('email.compose.forward') : t('email.compose.title');

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 bg-slate-900/60 dark:bg-black/80 backdrop-blur-md"
                onClick={onClose}
            />

            <motion.div
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 20 }}
                className="relative bg-white/80 dark:bg-[#0d1225]/90 backdrop-blur-2xl border border-white/20 dark:border-slate-700/50 rounded-[2.5rem] shadow-[0_20px_50px_rgba(0,0,0,0.3)] max-w-2xl w-full overflow-hidden"
            >
                {/* Header */}
                <div className="p-8 border-b border-slate-200/50 dark:border-slate-700/50 bg-white/20 dark:bg-slate-900/40 flex justify-between items-center">
                    <div>
                        <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-3">
                            <div className="p-2 bg-blue-500 rounded-xl shadow-lg shadow-blue-500/20">
                                <Send className="w-5 h-5 text-white" />
                            </div>
                            {modalTitle}
                        </h2>
                        <p className="text-xs text-slate-500 dark:text-slate-400 font-bold uppercase tracking-widest mt-1 opacity-60">
                            {t('email.compose.subtitle') || 'NOUVEAU MESSAGE DIRECT'}
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-slate-100 dark:hover:bg-white/5 rounded-full transition-all group"
                    >
                        <X className="w-6 h-6 text-slate-400 group-hover:text-slate-900 dark:group-hover:text-white" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-8 space-y-6">
                    {/* Recipients */}
                    <div className="relative">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">{t('email.compose.recipients')}</label>

                        <div className="flex flex-wrap gap-2 mb-3">
                            <AnimatePresence>
                                {recipientIds.map(id => {
                                    const u = users.find(u => String(u.id) === id);
                                    return (
                                        <motion.div
                                            key={id}
                                            initial={{ opacity: 0, scale: 0.8 }}
                                            animate={{ opacity: 1, scale: 1 }}
                                            exit={{ opacity: 0, scale: 0.8 }}
                                            className="bg-blue-500/10 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400 text-xs font-bold px-3 py-1.5 rounded-full border border-blue-500/20 flex items-center gap-2 group"
                                        >
                                            <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
                                            {u?.username}
                                            <button type="button" onClick={() => toggleRecipient(id)} className="hover:text-red-500 transition-colors">
                                                <X className="w-3 h-3" />
                                            </button>
                                        </motion.div>
                                    );
                                })}
                            </AnimatePresence>
                        </div>

                        <div className="relative group">
                            <UserPlus className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
                            <input
                                type="text"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                onFocus={() => setIsDropdownOpen(true)}
                                placeholder={recipientIds.length === 0 ? t('email.compose.recipientsPlaceholder') : t('email.compose.recipientsAdd')}
                                className="w-full pl-11 pr-4 py-3.5 bg-slate-50/50 dark:bg-slate-900/50 border border-slate-200/50 dark:border-slate-700/50 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all font-medium"
                            />
                        </div>

                        <AnimatePresence>
                            {isDropdownOpen && (
                                <>
                                    <div className="fixed inset-0 z-10" onClick={() => setIsDropdownOpen(false)}></div>
                                    <motion.div
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, y: 10 }}
                                        className="absolute z-20 w-full mt-2 bg-white/90 dark:bg-slate-800/90 backdrop-blur-xl border border-slate-200/50 dark:border-slate-700/50 rounded-2xl shadow-2xl max-h-60 overflow-y-auto custom-scrollbar"
                                    >
                                        {filteredUsers.length === 0 ? (
                                            <div className="p-4 text-slate-500 text-sm italic text-center">{t('email.compose.noUser')}</div>
                                        ) : (
                                            filteredUsers.map(u => (
                                                <div
                                                    key={u.id}
                                                    onClick={() => { toggleRecipient(u.id); setIsDropdownOpen(false); }}
                                                    className="p-4 hover:bg-blue-500/10 cursor-pointer flex items-center justify-between transition-colors group border-b border-slate-100/50 dark:border-slate-700/30 last:border-0"
                                                >
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center text-xs font-black text-slate-600 dark:text-slate-300 group-hover:bg-blue-500 group-hover:text-white transition-all">
                                                            {u.username.charAt(0).toUpperCase()}
                                                        </div>
                                                        <div>
                                                            <p className="text-sm font-bold text-slate-900 dark:text-slate-100">{u.username}</p>
                                                            <p className="text-[10px] text-slate-400 uppercase font-black tracking-tighter">{u.role}</p>
                                                        </div>
                                                    </div>
                                                    {recipientIds.includes(String(u.id)) && (
                                                        <div className="w-2 h-2 bg-blue-500 rounded-full shadow-[0_0_8px_rgba(59,130,246,0.6)]" />
                                                    )}
                                                </div>
                                            ))
                                        )}
                                    </motion.div>
                                </>
                            )}
                        </AnimatePresence>
                    </div>

                    {/* Subject */}
                    <div>
                        <div className="flex justify-between items-center mb-2">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{t('email.compose.subject')}</label>
                            <button
                                type="button"
                                onClick={handleSubjectReformulate}
                                disabled={subjectReformulating || !subject.trim()}
                                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest bg-violet-500/10 border border-violet-500/20 text-violet-600 dark:text-violet-400 hover:bg-violet-500 hover:text-white transition-all disabled:opacity-30 disabled:cursor-not-allowed group shadow-sm"
                            >
                                {subjectReformulating ? <Loader className="w-3 h-3 animate-spin" /> : <Wand2 className="w-3 h-3 group-hover:scale-110" />}
                                {t('email.compose.ai.reformulateSubject')}
                            </button>
                        </div>
                        <input
                            type="text"
                            value={subject}
                            onChange={(e) => setSubject(e.target.value)}
                            className="w-full bg-slate-50/50 dark:bg-slate-900/50 border border-slate-200/50 dark:border-slate-700/50 rounded-2xl px-4 py-3.5 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all font-medium text-sm"
                            required
                            placeholder={t('email.compose.subjectPlaceholder')}
                        />
                    </div>

                    {/* Body */}
                    <div>
                        <div className="flex justify-between items-center mb-2">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Message</label>
                            <button
                                type="button"
                                onClick={handleReformulate}
                                disabled={reformulating || !body.trim()}
                                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest bg-violet-500/10 border border-violet-500/20 text-violet-600 dark:text-violet-400 hover:bg-violet-500 hover:text-white transition-all disabled:opacity-30 disabled:cursor-not-allowed group shadow-sm"
                            >
                                {reformulating ? <Loader className="w-3 h-3 animate-spin" /> : <Wand2 className="w-3 h-3 group-hover:scale-110" />}
                                {t('email.compose.ai.reformulateBody')}
                            </button>
                        </div>
                        <textarea
                            value={body}
                            onChange={(e) => setBody(e.target.value)}
                            className="w-full bg-slate-50/50 dark:bg-slate-900/50 border border-slate-200/50 dark:border-slate-700/50 rounded-3xl px-6 py-4 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 h-48 resize-none text-sm leading-relaxed custom-scrollbar font-medium"
                            required
                            placeholder={t('email.compose.messagePlaceholder')}
                        />
                    </div>

                    {/* Footer / Background elements */}
                    <div className="flex flex-col sm:flex-row justify-between items-center gap-6 pt-4 border-t border-slate-100 dark:border-slate-800">
                        <div className="flex items-center gap-4 w-full sm:w-auto">
                            <label className="cursor-pointer flex items-center gap-3 px-5 py-2.5 bg-slate-100 dark:bg-slate-800/80 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-2xl text-slate-700 dark:text-slate-300 transition-all border border-transparent hover:border-slate-300 dark:hover:border-slate-600 group shadow-sm">
                                <Paperclip className="w-4 h-4 text-blue-500 group-hover:rotate-12 transition-transform" />
                                <span className="text-xs font-bold truncate max-w-[150px]">{attachment ? attachment.name : t('email.compose.chooseFile')}</span>
                                <input type="file" className="hidden" onChange={(e) => e.target.files && setAttachment(e.target.files[0])} />
                            </label>
                            {attachment && (
                                <button type="button" onClick={() => setAttachment(null)} className="p-2 text-red-500 hover:bg-red-500/10 rounded-full transition-colors group">
                                    <Trash2 className="w-4 h-4 group-hover:scale-110" />
                                </button>
                            )}
                        </div>

                        <div className="flex items-center gap-4 w-full sm:w-auto">
                            <button
                                type="button"
                                onClick={onClose}
                                className="flex-1 sm:flex-none px-6 py-3 text-slate-500 dark:text-slate-400 font-bold text-sm hover:text-slate-900 dark:hover:text-white transition-colors"
                            >
                                {t('email.compose.cancel')}
                            </button>
                            <button
                                type="submit"
                                disabled={sending}
                                className="flex-1 sm:flex-none flex items-center justify-center gap-3 px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-black italic tracking-tighter text-sm shadow-xl shadow-blue-600/20 transition-all hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed group"
                            >
                                {sending ? <Loader className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />}
                                {t('email.compose.send')}
                            </button>
                        </div>
                    </div>
                </form>
            </motion.div>
        </div>
    );
};

export default ComposeEmailModal;
