import React, { useState, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { X, Send, Sparkles, Paperclip, FileText, Download, MessageSquare, User, Pencil, Check, X as Close, Trash2 } from 'lucide-react';
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

    React.useEffect(() => {
        if (test?.id) {
            fetchComments();
        }
    }, [test?.id]);

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

    const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
        if (event.target.files && event.target.files[0]) {
            setSelectedFile(event.target.files[0]);
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

            const tempId = Date.now();
            const optimisticComment = {
                id: tempId,
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
            alert(t('execution.toasts.commentPostError'));
        }
    };

    const handleStartEdit = (comment: any) => {
        setEditingCommentId(comment.id);
        setEditMessage(comment.message);
    };

    const handleCancelEdit = () => {
        setEditingCommentId(null);
        setEditMessage('');
    };

    const handleSaveEdit = async (commentId: number) => {
        if (!editMessage.trim()) return;
        try {
            await commentService.updateComment(commentId.toString(), { message: editMessage });
            setComments(prev => prev.map(c => c.id === commentId ? { ...c, message: editMessage, updated_at: new Date().toISOString() } : c));
            setEditingCommentId(null);
            setEditMessage('');
            fetchComments(); // Refresh to get the real updated_at from server
        } catch (error) {
            console.error("Failed to update comment", error);
            toast.error(t('execution.toasts.commentUpdateError'));
        }
    };

    const handleDeleteComment = async (commentId: number) => {
        setCommentToDelete(commentId);
        setIsDeleteModalOpen(true);
    };

    const confirmDeleteComment = async () => {
        if (!commentToDelete) return;
        try {
            await commentService.deleteComment(commentToDelete.toString());
            setComments(prev => prev.filter(c => c.id !== commentToDelete));
            toast.success(t('execution.toasts.commentDeleteSuccess'));
        } catch (error) {
            console.error("Failed to delete comment", error);
            toast.error(t('execution.toasts.deleteError'));
        } finally {
            setCommentToDelete(null);
        }
    };

    const handleAIReformulate = async () => {
        if (!chatMessage) return;
        try {
            setLoading(true);
            const response = await aiService.reformulate(chatMessage);
            setChatMessage(response.data.reformulated_message);
        } catch (error) {
            console.error("Failed to reformulate message", error);
        } finally {
            setLoading(false);
        }
    };

    const handleDownload = (url: string, filename?: string) => {
        let link = url;
        if (url.includes('/media/')) {
            const mediaPart = url.substring(url.indexOf('/media/'));
            link = mediaPart;
        }

        const a = document.createElement('a');
        a.href = link;
        a.download = filename || link.split('/').pop() || 'download';
        a.target = '_blank';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
    };

    if (!test) return null;

    const containerClasses = embed
        ? "h-full w-full bg-slate-900 flex flex-col"
        : "fixed inset-y-0 right-0 w-96 bg-slate-900 border-l border-slate-700/50 shadow-2xl z-50 flex flex-col";

    return (
        <div className={containerClasses}>
            {/* Header */}
            <div className="p-5 border-b border-slate-700/50 flex items-center justify-between bg-slate-800/50 backdrop-blur-md">
                <div className="flex items-center gap-3 overflow-hidden">
                    <div className="w-10 h-10 bg-blue-600/20 rounded-xl flex items-center justify-center border border-blue-500/30 flex-shrink-0">
                        <FileText className="w-5 h-5 text-blue-400" />
                    </div>
                    <div className="overflow-hidden">
                        <h2 className="text-sm font-bold text-white truncate" title={test.name || (test as any).Titre}>
                            {test.name || (test as any).Titre || (test as any).NOM || t('execution.list.untitled')}
                        </h2>
                        <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-[10px] font-mono text-slate-500 bg-slate-900 px-1.5 py-0.5 rounded">{t('execution.panel.id')}: {test.id}</span>
                            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider ${test.status === 'passed' ? 'bg-emerald-500/20 text-emerald-400' :
                                test.status === 'failed' ? 'bg-rose-500/20 text-rose-400' :
                                    'bg-slate-700 text-slate-400'
                                }`}>
                                {t(`status.${test.status || 'pending'}`)}
                            </span>
                        </div>
                    </div>
                </div>
                <button
                    onClick={onClose}
                    className="p-2 hover:bg-white/10 rounded-xl text-slate-400 hover:text-white transition-all active:scale-95"
                    title={t('common.close')}
                >
                    <X className="w-5 h-5" />
                </button>
            </div>

            {/* Content (Chat Area) */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-900/20 custom-scrollbar">
                <AnimatePresence initial={false}>
                    {comments.length === 0 ? (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="h-full flex flex-col items-center justify-center text-slate-600 italic py-20"
                        >
                            <MessageSquare className="w-12 h-12 mb-4 opacity-5" />
                            <p className="text-sm font-medium">{t('execution.panel.emptyComments')}</p>
                        </motion.div>
                    ) : (
                        <div className="space-y-6">
                            {comments.map((comment: any, index: number) => {
                                const isMe = comment.author_name === user?.username || comment.isOptimistic;
                                return (
                                    <motion.div
                                        key={comment.id || index}
                                        initial={{ opacity: 0, y: 10, scale: 0.95 }}
                                        animate={{ opacity: 1, y: 0, scale: 1 }}
                                        className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}
                                    >
                                        <div className={`max-w-[85%] flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                                            <div className={`group relative p-3.5 rounded-2xl shadow-md transition-all ${isMe ? 'bg-blue-600 text-white rounded-tr-none shadow-blue-500/10'
                                                : 'bg-slate-800 text-slate-200 rounded-tl-none border border-slate-700 shadow-lg shadow-black/20'
                                                }`}>
                                                {!isMe && (
                                                    <div className="flex items-center gap-2 mb-1.5 border-b border-white/5 pb-1">
                                                        <User className="w-3 h-3 text-blue-400" />
                                                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">{comment.author_name || t('analytics.chat.pdfUserLabel')}</p>
                                                    </div>
                                                )}

                                                {editingCommentId === comment.id ? (
                                                    <div className="space-y-2 min-w-[200px]">
                                                        <textarea
                                                            value={editMessage}
                                                            onChange={(e) => setEditMessage(e.target.value)}
                                                            className="w-full bg-black/20 border border-white/10 rounded-lg p-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-white/30 resize-none"
                                                            rows={3}
                                                            autoFocus
                                                        />
                                                        <div className="flex justify-end gap-2">
                                                            <button onClick={(e) => { e.stopPropagation(); handleCancelEdit(); }} className="p-1 hover:bg-white/10 rounded text-white/70"><Close className="w-4 h-4" /></button>
                                                            <button onClick={(e) => { e.stopPropagation(); handleSaveEdit(comment.id); }} className="p-1 bg-white/20 hover:bg-white/30 rounded text-white"><Check className="w-4 h-4" /></button>
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <div
                                                        className="relative cursor-pointer"
                                                        onClick={() => isMe ? setActiveCommentId(activeCommentId === comment.id ? null : comment.id) : null}
                                                    >
                                                        <p className="text-sm font-medium leading-relaxed whitespace-pre-wrap">{comment.message}</p>

                                                        <AnimatePresence>
                                                            {isMe && !comment.isOptimistic && activeCommentId === comment.id && (
                                                                <motion.div
                                                                    initial={{ opacity: 0, scale: 0.8, y: -10 }}
                                                                    animate={{ opacity: 1, scale: 1, y: 0 }}
                                                                    exit={{ opacity: 0, scale: 0.8, y: -10 }}
                                                                    className="absolute top-full mt-2 right-0 flex gap-1 p-1 bg-slate-800 rounded-xl border border-slate-700 shadow-2xl z-30"
                                                                >
                                                                    <button
                                                                        onClick={(e) => { e.stopPropagation(); handleStartEdit(comment); }}
                                                                        className="p-2 text-slate-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
                                                                        title={t('common.edit')}
                                                                    >
                                                                        <Pencil className="w-4 h-4" />
                                                                    </button>
                                                                    <div className="w-[1px] h-4 bg-slate-700 my-auto" />
                                                                    <button
                                                                        onClick={(e) => { e.stopPropagation(); handleDeleteComment(comment.id); }}
                                                                        className="p-2 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors"
                                                                        title={t('common.delete')}
                                                                    >
                                                                        <Trash2 className="w-4 h-4" />
                                                                    </button>
                                                                </motion.div>
                                                            )}
                                                        </AnimatePresence>
                                                    </div>
                                                )}

                                                {comment.attachment && (
                                                    <div className="mt-3 p-2 bg-black/30 rounded-xl flex items-center gap-2 border border-white/5 group/file">
                                                        <FileText className="w-4 h-4 text-blue-400" />
                                                        <button
                                                            onClick={() => handleDownload(comment.attachment, comment.attachment_name)}
                                                            className="text-[10px] text-blue-300 hover:text-blue-100 hover:underline truncate block max-w-[150px] text-left transition-colors"
                                                        >
                                                            {comment.attachment_name || comment.attachment.split('/').pop()}
                                                        </button>
                                                        <button
                                                            onClick={() => handleDownload(comment.attachment, comment.attachment_name)}
                                                            className="p-1 hover:bg-white/10 rounded-md text-white/30 hover:text-white transition-all ml-auto active:scale-90"
                                                            title={t('execution.panel.download')}
                                                        >
                                                            <Download className="w-3.5 h-3.5" />
                                                        </button>
                                                    </div>
                                                )}
                                            </div>
                                            <div className="flex items-center gap-2 mt-1.5 px-2">
                                                {comment.updated_at && new Date(comment.updated_at).getTime() - new Date(comment.created_at).getTime() > 1000 && (
                                                    <span className="text-[9px] font-bold text-blue-400 uppercase tracking-tighter flex items-center gap-1">
                                                        <Pencil className="w-2 h-2" />
                                                        {t('execution.panel.modifiedAt', { time: new Date(comment.updated_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) })}
                                                    </span>
                                                )}
                                                <span className="text-[9px] font-bold text-slate-500 uppercase tracking-tighter">
                                                    {new Date(comment.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                </span>
                                            </div>
                                        </div>
                                    </motion.div>
                                );
                            })}
                        </div>
                    )}
                </AnimatePresence>
            </div>

            {/* Input Area */}
            {!readOnly && (
                <div className="p-5 bg-slate-800/30 border-t border-slate-700/50">
                    {selectedFile && (
                        <div className="mb-3 p-2 bg-slate-800 rounded-xl flex items-center justify-between border border-blue-500/30">
                            <div className="flex items-center gap-2 overflow-hidden px-1">
                                <FileText className="w-4 h-4 text-blue-400" />
                                <span className="text-[10px] text-slate-300 truncate font-bold uppercase">{selectedFile.name}</span>
                            </div>
                            <button onClick={() => setSelectedFile(null)} className="p-1 hover:bg-rose-500/20 rounded-lg text-slate-400 hover:text-rose-400 transition-colors"><X className="w-3 h-3" /></button>
                        </div>
                    )}
                    <div className="relative flex items-center gap-2">
                        <input type="file" ref={fileInputRef} onChange={handleFileSelect} className="hidden" id="file-upload" />
                        <button onClick={() => fileInputRef.current?.click()} className="p-2.5 text-slate-400 hover:text-white hover:bg-slate-700 rounded-xl transition-all" title={t('execution.panel.attach')}><Paperclip className="w-5 h-5" /></button>
                        <div className="relative flex-1">
                            <input
                                type="text" value={chatMessage} onChange={(e) => setChatMessage(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                                className="w-full bg-slate-900/50 border border-slate-700 rounded-xl pl-4 pr-20 py-3 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 placeholder-slate-600 transition-all font-medium"
                                placeholder={t('execution.panel.placeholder')}
                            />
                            <div className="absolute right-1.5 top-1.5 flex items-center gap-1">
                                <button onClick={handleAIReformulate} className="p-1.5 text-purple-400 hover:text-purple-300 hover:bg-purple-500/10 rounded-lg transition-colors" title={t('execution.panel.reformulate')}><Sparkles className="w-4 h-4" /></button>
                                <button onClick={handleSendMessage} disabled={!chatMessage.trim() && !selectedFile} className="p-1.5 text-blue-400 hover:text-blue-300 hover:bg-blue-500/10 rounded-lg transition-colors disabled:opacity-30"><Send className="w-4 h-4" /></button>
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
