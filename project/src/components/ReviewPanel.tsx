import React, { useState, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { X, Send, Sparkles, Paperclip, FileText, Download, MessageSquare, User, Pencil, Check, X as Close, Trash2, XCircle, CheckCircle, Clock } from 'lucide-react';
import { toast } from 'react-toastify';
import { motion, AnimatePresence } from 'framer-motion';
import { type TestItem } from './ExecutionTestList';
import { commentService, aiService } from '../services/api';
import { useAuth } from '../context/AuthContext';
import ConfirmModal from './ConfirmModal';

interface ReviewPanelProps {
    test: TestItem | null;
    onClose: () => void;
    onUpdate?: (updates: any) => void;
    embed?: boolean;
    readOnly?: boolean;
}

const ReviewPanel: React.FC<ReviewPanelProps> = ({ test, onClose, onUpdate, embed = false, readOnly = false }) => {
    const { t } = useTranslation();
    const { user } = useAuth();
    const [chatMessage, setChatMessage] = useState('');
    const [comments, setComments] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [editingCommentId, setEditingCommentId] = useState<number | null>(null);
    const [editMessage, setEditMessage] = useState('');
    const [activeCommentId, setActiveCommentId] = useState<number | null>(null);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [commentToDelete, setCommentToDelete] = useState<number | null>(null);
    const scrollRef = useRef<HTMLDivElement>(null);

    React.useEffect(() => {
        if (test?.id) {
            fetchComments();
        }
    }, [test?.id]);

    React.useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [comments]);

    const fetchComments = async () => {
        if (!test?.id) return;
        try {
            setLoading(true);
            const response = await commentService.getComments({ test_case: test.id });
            const data = response.data.results || response.data;
            setComments(data);
        } catch (error) {
            console.error("Failed to fetch comments", error);
        } finally {
            setLoading(false);
        }
    };

    const handleSendMessage = async () => {
        if ((!chatMessage.trim() && !selectedFile) || !test?.id) return;

        try {
            const formData = new FormData();
            formData.append('test_case', test.id.toString());
            formData.append('message', chatMessage);
            if (selectedFile) {
                formData.append('attachment', selectedFile);
            }

            const optimisticComment = {
                id: Date.now(),
                message: chatMessage,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
                author_name: user?.username || t('execution.panel.me'),
                author: user?.id,
                attachment: selectedFile ? URL.createObjectURL(selectedFile) : null,
                attachment_name: selectedFile ? selectedFile.name : null,
                isOptimistic: true
            };

            setComments(prev => [...prev, optimisticComment]);
            setChatMessage('');
            setSelectedFile(null);
            if (fileInputRef.current) fileInputRef.current.value = '';

            await commentService.createComment(formData);
            fetchComments();
        } catch (error) {
            console.error("Failed to post comment", error);
            toast.error(t('execution.toasts.commentPostError'));
        }
    };

    const handleSaveEdit = async (commentId: number) => {
        if (!editMessage.trim()) return;
        try {
            await commentService.updateComment(commentId.toString(), { message: editMessage });
            setComments(prev => prev.map(c => c.id === commentId ? { ...c, message: editMessage, updated_at: new Date().toISOString() } : c));
            setEditingCommentId(null);
            setEditMessage('');
        } catch (error) {
            toast.error(t('execution.toasts.commentUpdateError'));
        }
    };

    const confirmDeleteComment = async () => {
        if (!commentToDelete) return;
        try {
            await commentService.deleteComment(commentToDelete.toString());
            setComments(prev => prev.filter(c => c.id !== commentToDelete));
            toast.success(t('execution.toasts.commentDeleteSuccess'));
        } catch (error) {
            toast.error(t('execution.toasts.deleteError'));
        } finally {
            setCommentToDelete(null);
            setIsDeleteModalOpen(false);
        }
    };

    const handleAIReformulate = async () => {
        if (!chatMessage) return;
        try {
            setLoading(true);
            const response = await aiService.reformulate(chatMessage);
            setChatMessage(response.data.reformulated_message);
        } catch (error) {
            toast.error("Échec de la reformulation");
        } finally {
            setLoading(false);
        }
    };

    const handleDownload = (url: string, filename?: string) => {
        let link = url.includes('/media/') ? url.substring(url.indexOf('/media/')) : url;
        const a = document.createElement('a');
        a.href = link;
        a.download = filename || 'download';
        a.target = '_blank';
        a.click();
    };

    if (!test) return null;

    // Group comments by date
    const groupCommentsByDate = (comments: any[]) => {
        const groups: { [key: string]: any[] } = {};
        comments.forEach(c => {
            const date = new Date(c.created_at).toLocaleDateString();
            if (!groups[date]) groups[date] = [];
            groups[date].push(c);
        });
        return groups;
    };

    const isToday = (dateStr: string) => {
        const d = new Date(dateStr);
        const today = new Date();
        return d.getDate() === today.getDate() &&
            d.getMonth() === today.getMonth() &&
            d.getFullYear() === today.getFullYear();
    };

    const containerClasses = "h-full w-full bg-[#0b0e14] flex flex-col";
    const groupedComments = groupCommentsByDate(comments);

    return (
        <div className={containerClasses}>
            {/* Header */}
            <div className="p-8 pb-6 border-b border-white/5 flex items-center justify-between bg-gradient-to-b from-white/[0.03] to-transparent backdrop-blur-3xl">
                <div className="flex items-center gap-6 overflow-hidden">
                    <div className="w-16 h-16 bg-[#1a1f2e] rounded-2xl flex items-center justify-center border border-white/10 flex-shrink-0 shadow-2xl relative group/header-icon">
                        <MessageSquare className="w-7 h-7 text-blue-400 group-hover:scale-110 transition-transform" />
                        <div className="absolute -top-1 -right-1 w-3 h-3 bg-blue-500 rounded-full border-2 border-[#0b0e14]" />
                    </div>
                    <div className="overflow-hidden">
                        <h2 className="text-3xl font-black text-white truncate tracking-tighter leading-none mb-2" title={test.name}>
                            {test.name || t('execution.list.untitled')}
                        </h2>
                        <div className="flex items-center gap-3">
                            <span className="text-[10px] font-black text-slate-500 bg-white/5 px-3 py-1 rounded-lg border border-white/5 uppercase tracking-[0.2em]">#{test.id}</span>
                            <span className={`flex items-center gap-2 text-[10px] font-black px-3 py-1 rounded-lg uppercase tracking-[0.2em] border shadow-lg ${test.status === 'passed' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20 shadow-emerald-500/5' :
                                test.status === 'failed' ? 'bg-rose-500/20 text-rose-400 border-rose-500/20 shadow-rose-500/5' :
                                    'bg-slate-500/10 text-slate-400 border-slate-500/20'
                                }`}>
                                {test.status === 'failed' && <XCircle className="w-3 h-3" />}
                                {test.status === 'passed' && <CheckCircle className="w-3 h-3" />}
                                {t(`status.${test.status || 'pending'}`)}
                            </span>
                        </div>
                    </div>
                </div>
                <button
                    onClick={onClose}
                    className="p-4 bg-white/5 hover:bg-white/10 rounded-2xl text-slate-500 hover:text-white transition-all active:scale-90 border border-white/5 group"
                >
                    <X className="w-6 h-6 group-hover:rotate-90 transition-transform duration-300" />
                </button>
            </div>

            {/* Chat Area */}
            <div
                ref={scrollRef}
                className="flex-1 overflow-y-auto px-8 py-6 space-y-10 bg-transparent custom-scrollbar flex flex-col"
            >
                <AnimatePresence initial={false}>
                    {comments.length === 0 ? (
                        <div className="flex-1 flex flex-col items-center justify-center text-slate-600">
                            <div className="w-24 h-24 bg-white/[0.02] rounded-full flex items-center justify-center mb-6 border border-white/5 animate-pulse">
                                <MessageSquare className="w-12 h-12 opacity-20" />
                            </div>
                            <p className="text-[10px] font-black uppercase tracking-[0.3em] opacity-40">{t('execution.panel.emptyComments')}</p>
                        </div>
                    ) : (
                        Object.keys(groupedComments).map((date) => (
                            <div key={date} className="space-y-8">
                                <div className="flex items-center gap-4">
                                    <div className="h-px flex-1 bg-gradient-to-r from-transparent to-white/5" />
                                    <span className="text-[10px] font-black text-slate-600 uppercase tracking-[0.2em]">
                                        {isToday(date) ? "Aujourd'hui" : date} • {new Date(groupedComments[date][0].created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </span>
                                    <div className="h-px flex-1 bg-gradient-to-l from-transparent to-white/5" />
                                </div>

                                {groupedComments[date].map((comment: any, index: number) => {
                                    const isMe = comment.author_name === user?.username || comment.isOptimistic;
                                    // Detect if it's a simulated "System Event" (e.g. status change)
                                    const isSystem = comment.message.startsWith('[SYSTEM]');
                                    const systemMsg = isSystem ? comment.message.replace('[SYSTEM]', '') : null;

                                    if (isSystem) {
                                        return (
                                            <div key={comment.id} className="flex justify-center">
                                                <div className="px-6 py-2 bg-white/5 border border-white/5 rounded-full flex items-center gap-3 shadow-xl">
                                                    <Clock className="w-3 h-3 text-slate-500" />
                                                    <span className="text-[10px] font-bold text-slate-400">
                                                        {systemMsg}
                                                    </span>
                                                </div>
                                            </div>
                                        );
                                    }

                                    return (
                                        <motion.div
                                            key={comment.id || index}
                                            initial={{ opacity: 0, scale: 0.98, y: 10 }}
                                            animate={{ opacity: 1, scale: 1, y: 0 }}
                                            className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}
                                        >
                                            <div className={`max-w-[85%] flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                                                {!isMe && (
                                                    <p className="text-[11px] text-slate-500 font-black uppercase tracking-widest mb-2 ml-4">{comment.author_name}</p>
                                                )}

                                                <div className={`group relative p-6 rounded-[2rem] shadow-2xl transition-all border ${isMe
                                                    ? 'bg-[#2563eb] text-white rounded-tr-none border-blue-400/30'
                                                    : comment.message.toLowerCase().includes('escalader')
                                                        ? 'bg-rose-500/10 text-rose-300 border-rose-500/20 rounded-tl-none'
                                                        : 'bg-[#1a1f2e] text-slate-200 rounded-tl-none border-white/5 backdrop-blur-xl'
                                                    }`}>

                                                    {editingCommentId === comment.id ? (
                                                        <div className="space-y-3 min-w-[240px]">
                                                            <textarea
                                                                value={editMessage}
                                                                onChange={(e) => setEditMessage(e.target.value)}
                                                                className="w-full bg-black/40 border border-white/10 rounded-2xl p-4 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 resize-none font-medium"
                                                                rows={3}
                                                                autoFocus
                                                            />
                                                            <div className="flex justify-end gap-2">
                                                                <button onClick={() => setEditingCommentId(null)} className="px-4 py-2 hover:bg-white/10 rounded-xl text-[10px] font-black uppercase tracking-widest transition-colors">Annuler</button>
                                                                <button onClick={() => handleSaveEdit(comment.id)} className="px-4 py-2 bg-white/20 hover:bg-white/30 rounded-xl text-[10px] font-black uppercase tracking-widest transition-colors">Sauvegarder</button>
                                                            </div>
                                                        </div>
                                                    ) : (
                                                        <div
                                                            className="relative cursor-pointer"
                                                            onClick={() => isMe && !comment.isOptimistic && setActiveCommentId(activeCommentId === comment.id ? null : comment.id)}
                                                        >
                                                            <p className="text-[15px] font-bold leading-relaxed whitespace-pre-wrap">{comment.message}</p>

                                                            {isMe && !comment.isOptimistic && activeCommentId === comment.id && (
                                                                <motion.div
                                                                    initial={{ opacity: 0, y: 10 }}
                                                                    animate={{ opacity: 1, y: 0 }}
                                                                    className="absolute bottom-full mb-4 right-0 flex gap-1 p-1.5 bg-[#1a1f2e] rounded-2xl border border-white/10 shadow-3xl z-30"
                                                                >
                                                                    <button onClick={() => { setEditingCommentId(comment.id); setEditMessage(comment.message); }} className="p-2.5 text-slate-400 hover:text-white hover:bg-white/5 rounded-xl transition-colors"><Pencil className="w-4 h-4" /></button>
                                                                    <button onClick={() => { setCommentToDelete(comment.id); setIsDeleteModalOpen(true); }} className="p-2.5 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-xl transition-colors"><Trash2 className="w-4 h-4" /></button>
                                                                </motion.div>
                                                            )}
                                                        </div>
                                                    )}

                                                    {comment.attachment && (
                                                        <div className="mt-5 p-4 bg-black/40 rounded-2xl flex items-center gap-4 border border-white/5 group/file hover:bg-black/60 transition-all shadow-inner">
                                                            <div className="w-12 h-12 bg-blue-500/20 rounded-xl flex items-center justify-center border border-blue-500/20">
                                                                <FileText className="w-6 h-6 text-blue-400" />
                                                            </div>
                                                            <div className="flex-1 overflow-hidden">
                                                                <p className="text-xs font-black text-white truncate mb-0.5">{comment.attachment_name || "Fichier joint"}</p>
                                                                <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">{comment.attachment_name?.split('.').pop()?.toUpperCase() || 'DATA'} • {Math.round(Math.random() * 500)} Ko</p>
                                                            </div>
                                                            <button
                                                                onClick={() => handleDownload(comment.attachment, comment.attachment_name)}
                                                                className="p-3 bg-white/5 hover:bg-blue-600 rounded-xl text-blue-400 hover:text-white transition-all border border-white/5"
                                                            >
                                                                <Download className="w-4 h-4" />
                                                            </button>
                                                        </div>
                                                    )}
                                                </div>
                                                <div className={`flex items-center gap-3 mt-3 px-2 ${isMe ? 'justify-end' : 'justify-start'}`}>
                                                    <span className="text-[9px] font-black text-slate-600 uppercase tracking-[0.15em]">
                                                        {new Date(comment.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                    </span>
                                                    {isMe && (
                                                        <span className="text-[9px] font-black text-blue-500/80 uppercase tracking-widest flex items-center gap-1.5">
                                                            <div className="w-1 h-1 bg-current rounded-full" />
                                                            Lu
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        </motion.div>
                                    );
                                })}
                            </div>
                        ))
                    )}
                </AnimatePresence>
            </div>

            {/* Input Area */}
            {!readOnly && (
                <div className="p-8 bg-gradient-to-t from-white/[0.03] to-transparent border-t border-white/5 backdrop-blur-3xl">
                    <AnimatePresence>
                        {selectedFile && (
                            <motion.div
                                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.95 }}
                                className="mb-6 p-4 bg-blue-500/10 rounded-2xl flex items-center justify-between border border-blue-500/20 shadow-lg shadow-blue-500/5"
                            >
                                <div className="flex items-center gap-4 overflow-hidden px-1">
                                    <div className="w-10 h-10 bg-blue-500/20 rounded-xl flex items-center justify-center">
                                        <FileText className="w-5 h-5 text-blue-400" />
                                    </div>
                                    <div className="overflow-hidden">
                                        <p className="text-[10px] text-white truncate font-black uppercase tracking-widest">{selectedFile.name}</p>
                                        <p className="text-[8px] text-slate-500 font-bold uppercase tracking-widest">Prêt pour l'envoi</p>
                                    </div>
                                </div>
                                <button onClick={() => setSelectedFile(null)} className="p-2.5 hover:bg-rose-500/20 rounded-xl text-slate-500 hover:text-rose-400 transition-colors border border-transparent hover:border-rose-500/20"><X className="w-4 h-4" /></button>
                            </motion.div>
                        )}
                    </AnimatePresence>
                    <div className="relative flex items-center gap-4">
                        <input type="file" ref={fileInputRef} onChange={(e) => e.target.files && setSelectedFile(e.target.files[0])} className="hidden" />
                        <button
                            onClick={() => fileInputRef.current?.click()}
                            className="w-14 h-14 bg-white/5 text-slate-500 hover:text-white hover:bg-white/10 rounded-2xl transition-all border border-white/5 flex items-center justify-center flex-shrink-0 active:scale-90"
                        >
                            <Paperclip className="w-6 h-6" />
                        </button>
                        <div className="relative flex-1 group">
                            <textarea
                                value={chatMessage}
                                onChange={(e) => setChatMessage(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter' && !e.shiftKey) {
                                        e.preventDefault();
                                        handleSendMessage();
                                    }
                                }}
                                rows={1}
                                className="w-full bg-[#1a1f2e] border border-white/5 rounded-2xl pl-6 pr-32 py-5 text-sm font-bold text-white focus:outline-none focus:ring-2 focus:ring-blue-500/30 placeholder-slate-600 transition-all resize-none min-h-[64px] max-h-[150px] shadow-inner"
                                placeholder="Votre commentaire..."
                            />
                            <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2">
                                <button
                                    onClick={handleAIReformulate}
                                    title="Reformuler avec l'IA"
                                    className="w-10 h-10 bg-purple-500/10 text-purple-400 hover:text-purple-300 hover:bg-purple-500/20 rounded-xl transition-all border border-purple-500/20 flex items-center justify-center"
                                >
                                    <Sparkles className="w-5 h-5" />
                                </button>
                                <button
                                    onClick={handleSendMessage}
                                    disabled={!chatMessage.trim() && !selectedFile}
                                    className="w-10 h-10 bg-[#2563eb] text-white rounded-xl hover:bg-blue-500 transition-all disabled:opacity-20 disabled:grayscale shadow-lg shadow-blue-500/20 active:scale-95 flex items-center justify-center"
                                >
                                    <Send className="w-5 h-5" />
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            <ConfirmModal
                isOpen={isDeleteModalOpen}
                title={t('execution.modal.commentDeleteTitle')}
                message={t('execution.modal.commentDeleteMessage')}
                onConfirm={confirmDeleteComment}
                onCancel={() => setIsDeleteModalOpen(false)}
                confirmText={t('common.delete')}
                type="danger"
            />
        </div>
    );
};

export default ReviewPanel;
