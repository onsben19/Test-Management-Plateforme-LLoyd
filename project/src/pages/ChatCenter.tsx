import React, { useState, useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import PageLayout from '../components/PageLayout';
import { useAuth } from '../context/AuthContext';
import {
    MessageSquare, Send, Paperclip, Search,
    MoreVertical, User, Sparkles, Clock,
    Filter, Archive, CheckCheck, Hash,
    AtSign, Image, FileText, ChevronLeft, Plus, X,
    Pencil, Trash2, Forward, Users, Check
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { chatService, aiService, userService } from '../services/api';
import { toast } from 'react-toastify';
import { useTranslation } from 'react-i18next';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';
import Button from '../components/ui/Button';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Conversation {
    id: string;
    name?: string;
    type: 'DIRECT' | 'GROUP' | 'TEST_CASE';
    participants: number[];
    participants_details: any[];
    last_message?: any;
    test_case?: string | number;
    timestamp: Date;
    unreadCount: number;
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

const ChatCenter = () => {
    const { t } = useTranslation();
    const location = useLocation();
    const queryParams = new URLSearchParams(location.search);
    const targetUserId = queryParams.get('userId');
    const targetTestCaseId = queryParams.get('testCaseId');

    const { user: currentUser } = useAuth();
    const [conversations, setConversations] = useState<Conversation[]>([]);
    const [selectedConv, setSelectedConv] = useState<Conversation | null>(null);
    const [messages, setMessages] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [chatMessage, setChatMessage] = useState('');
    const [searchQuery, setSearchQuery] = useState('');
    const [isAILoading, setIsAILoading] = useState(false);

    // Actions State
    const [editingMsgId, setEditingMsgId] = useState<string | null>(null);
    const [editValue, setEditValue] = useState('');
    const [showForwardModal, setShowForwardModal] = useState(false);
    const [msgToForward, setMsgToForward] = useState<any>(null);

    // Group Search State
    const [showNewChatModal, setShowNewChatModal] = useState<'direct' | 'group' | null>(null);
    const [allUsers, setAllUsers] = useState<any[]>([]);
    const [userSearchTerm, setUserSearchTerm] = useState('');
    const [selectedParticipants, setSelectedParticipants] = useState<number[]>([]);
    const [groupName, setGroupName] = useState('');
    const [selectedFile, setSelectedFile] = useState<File | null>(null);

    const scrollRef = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Mentions State
    const [mentionSearch, setMentionSearch] = useState('');
    const [showMentionPopover, setShowMentionPopover] = useState(false);
    const [mentionIndex, setMentionIndex] = useState(-1);

    // Presence State
    const [onlineUsersCount, setOnlineUsersCount] = useState(0);

    const groupMessagesByDate = (msgs: any[]) => {
        const groups: { date: string, messages: any[] }[] = [];
        msgs.forEach(msg => {
            const date = new Date(msg.created_at).toLocaleDateString('fr-FR', {
                day: 'numeric',
                month: 'long',
                year: 'numeric'
            });
            const lastGroup = groups[groups.length - 1];
            if (lastGroup && lastGroup.date === date) {
                lastGroup.messages.push(msg);
            } else {
                groups.push({ date, messages: [msg] });
            }
        });
        return groups;
    };

    const renderMessageContent = (text: string) => {
        const mentionRegex = /(@\w+)/g;
        const parts = text.split(mentionRegex);
        return parts.map((part, i) => {
            const match = part.match(/@(\w+)/);
            if (match) {
                return <span key={i} className="text-blue-600 dark:text-blue-200 font-black bg-blue-100 dark:bg-blue-400/20 px-1.5 py-0.5 rounded-md mx-0.5 whitespace-nowrap">{match[0]}</span>;
            }
            return part;
        });
    };

    // Fetch conversations
    const fetchConversations = async () => {
        try {
            setLoading(true);
            const response = await chatService.getConversations();
            const data = response.data.results || response.data;

            const mapped = data.map((c: any) => ({
                ...c,
                timestamp: c.updated_at ? new Date(c.updated_at) : new Date(),
                unreadCount: 0
            }));

            setConversations(mapped.sort((a: any, b: any) => b.timestamp.getTime() - a.timestamp.getTime()));
        } catch (err) {
            console.error("Failed to load conversations", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchConversations();
    }, [currentUser]);

    // Handle auto-select via query params
    useEffect(() => {
        if (!loading) {
            if (targetUserId) {
                const found = conversations.find(c =>
                    c.type === 'DIRECT' && c.participants.includes(parseInt(targetUserId))
                );
                if (found) {
                    setSelectedConv(found);
                } else {
                    // Start new direct
                    userService.getUsers().then(res => {
                        const user = (res.data.results || res.data).find((u: any) => u.id.toString() === targetUserId);
                        if (user) handleCreateDirect(user.id);
                    });
                }
            } else if (targetTestCaseId) {
                const found = conversations.find(c => c.test_case?.toString() === targetTestCaseId);
                if (found) {
                    setSelectedConv(found);
                } else {
                    // Create TC conversation
                    chatService.createConversation({
                        type: 'TEST_CASE',
                        test_case: targetTestCaseId,
                        name: `Test Case #${targetTestCaseId}`
                    }).then(res => {
                        setConversations(prev => [res.data, ...prev]);
                        setSelectedConv(res.data);
                    });
                }
            }
        }
    }, [targetUserId, targetTestCaseId, loading, conversations.length]);

    // WebSocket Integration
    useEffect(() => {
        const protocol = window.location.protocol === 'https:' ? 'wss' : 'ws';
        const token = localStorage.getItem('access_token');
        const wsUrl = `${protocol}://${window.location.host}/ws/chat/global/?token=${token}`;
        let ws: WebSocket;

        try {
            ws = new WebSocket(wsUrl);

            ws.onmessage = (e) => {
                const data = JSON.parse(e.data);
                if (data.type === 'presence_update') {
                    setOnlineUsersCount(prev => data.status === 'online' ? prev + 1 : Math.max(0, prev - 1));
                }
                if (data.type === 'chat_mention' && data.target_user_id === currentUser?.id) {
                    toast.info(`@${data.author_name} vous a mentionné !`, {
                        position: "top-right",
                        autoClose: 5000,
                        hideProgressBar: false,
                        closeOnClick: true,
                        pauseOnHover: true,
                        draggable: true,
                    });
                }
                if (data.type === 'chat_message' && data.conversation_id === selectedConv?.id) {
                    // Check if message already exists (optimistic or previous fetch)
                    setMessages(prev => {
                        if (prev.find(m => m.id === data.payload.id || m.id === `opt-${data.payload.id}`)) {
                            return prev;
                        }
                        return [...prev, data.payload];
                    });
                }
            };

            ws.onopen = () => {
                console.log('Chat WebSocket Connected');
            };

        } catch (err) {
            console.error("WS Connection failed", err);
        }

        return () => {
            if (ws) ws.close();
        };
    }, [currentUser?.id, selectedConv?.id]);

    // Fetch messages for selected conversation
    useEffect(() => {
        if (selectedConv) {
            const fetchMessages = async () => {
                try {
                    const response = await chatService.getMessages({ conversation: selectedConv.id });
                    setMessages(response.data.results || response.data);
                } catch (err) {
                    console.error("Failed to fetch messages", err);
                }
            };
            fetchMessages();
        }
    }, [selectedConv]);

    // Fetch users for search
    useEffect(() => {
        if (showNewChatModal) {
            userService.getUsers().then(res => {
                setAllUsers((res.data.results || res.data).filter((u: any) => u.id !== currentUser?.id));
            });
        }
    }, [showNewChatModal]);

    // Scroll to bottom
    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages]);

    const handleSendMessage = async () => {
        if ((!chatMessage.trim() && !selectedFile) || !selectedConv) return;

        const optimisticMessage = {
            id: 'opt-' + Date.now(),
            text: chatMessage,
            created_at: new Date().toISOString(),
            author_name: currentUser?.username || "Moi",
            author: currentUser?.id,
            isOptimistic: true,
            hasFile: !!selectedFile,
            fileName: selectedFile?.name
        };

        setMessages(prev => [...prev, optimisticMessage]);
        const currentText = chatMessage;
        const currentFile = selectedFile;

        setChatMessage('');
        setSelectedFile(null);

        try {
            const formData = new FormData();
            formData.append('conversation', selectedConv.id);
            if (currentText) formData.append('text', currentText);
            if (currentFile) formData.append('attachment', currentFile);

            await chatService.sendMessage(formData);

            // Refresh
            const response = await chatService.getMessages({ conversation: selectedConv.id });
            setMessages(response.data.results || response.data);
        } catch (err) {
            toast.error("Échec de l'envoi");
        }
    };

    const handleEditMessage = async (msgId: string) => {
        if (!editValue.trim()) return;
        try {
            await chatService.updateMessage(msgId, { text: editValue, is_edited: true });
            setMessages(prev => prev.map(m => m.id === msgId ? { ...m, text: editValue, is_edited: true } : m));
            setEditingMsgId(null);
        } catch (err) {
            toast.error("Modification échouée");
        }
    };

    const handleDeleteMessage = async (msgId: string) => {
        try {
            await chatService.deleteMessage(msgId);
            setMessages(prev => prev.filter(m => m.id !== msgId));
        } catch (err) {
            toast.error("Suppression échouée");
        }
    };

    const handleForwardMessage = async (targetConvId: string) => {
        if (!msgToForward) return;
        try {
            await chatService.forwardMessage(msgToForward.id, targetConvId);
            toast.success("Message transféré");
            setShowForwardModal(false);
            setMsgToForward(null);
        } catch (err) {
            toast.error("Transfert échoué");
        }
    };

    const handleCreateDirect = async (userId: number) => {
        try {
            const res = await chatService.createConversation({ type: 'DIRECT', participants: [userId] });
            setConversations(prev => [res.data, ...prev]);
            setSelectedConv(res.data);
            setShowNewChatModal(null);
        } catch (err) {
            toast.error("Erreur création chat");
        }
    };

    const handleCreateGroup = async () => {
        if (!groupName || selectedParticipants.length === 0) return;
        try {
            const res = await chatService.createConversation({
                type: 'GROUP',
                name: groupName,
                participants: selectedParticipants
            });
            setConversations(prev => [res.data, ...prev]);
            setSelectedConv(res.data);
            setShowNewChatModal(null);
            setSelectedParticipants([]);
            setGroupName('');
        } catch (err) {
            toast.error("Erreur création groupe");
        }
    };

    const handleAIReformulate = async () => {
        if (!chatMessage) return;
        try {
            setIsAILoading(true);
            const response = await aiService.reformulate(chatMessage);
            setChatMessage(response.data.reformulated_message);
        } catch (err) {
            toast.error("IA non disponible");
        } finally {
            setIsAILoading(false);
        }
    };

    const filteredConversations = conversations.filter(c => {
        const title = c.type === 'DIRECT'
            ? c.participants_details.find((p: any) => p.id !== currentUser?.id)?.username || "Chat Privé"
            : c.name || "Groupe";
        return title.toLowerCase().includes(searchQuery.toLowerCase());
    });

    const filteredUsers = allUsers.filter(u =>
        u.username.toLowerCase().includes(userSearchTerm.toLowerCase()) ||
        (u.first_name + " " + u.last_name).toLowerCase().includes(userSearchTerm.toLowerCase())
    );

    return (
        <PageLayout title="Chat Center" subtitle="COLLABORATION LIVE" noPadding>
            <div className="flex glass-panel rounded-[2.5rem] overflow-hidden h-[calc(100vh-280px)] min-h-[600px] relative">

                {/* 1. Sidebar */}
                <div className={`w-full lg:w-96 flex flex-col glass-sidebar relative z-20 ${selectedConv ? 'hidden lg:flex' : 'flex'}`}>
                    <div className="p-8 space-y-6">
                        <div className="flex items-center justify-between">
                            <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em]">Conversations</h3>
                            <div className="flex gap-2">
                                <Button variant="secondary" size="icon" onClick={() => setShowNewChatModal('group')} title="Nouveau groupe" icon={Users} />
                                <Button variant="secondary" size="icon" onClick={() => setShowNewChatModal('direct')} title="Message direct" icon={Plus} />
                            </div>
                        </div>
                        <div className="relative group">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-blue-500" />
                            <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Rechercher..." className="glass-input w-full pl-12" />
                        </div>
                    </div>

                    <div className="flex-1 overflow-y-auto px-4 pb-8 space-y-3 custom-scrollbar">
                        {filteredConversations.map((conv) => {
                            const otherUser = conv.type === 'DIRECT' ? conv.participants_details.find((p: any) => p.id !== currentUser?.id) : null;
                            const title = conv.type === 'DIRECT' ? otherUser?.username : conv.name;
                            const subtitle = conv.type === 'DIRECT' ? "Message Direct" : conv.type === 'TEST_CASE' ? "Discussion de Test" : `${conv.participants.length} membres`;
                            const isActive = selectedConv?.id === conv.id;

                            return (
                                <motion.button
                                    key={conv.id}
                                    layout
                                    onClick={() => setSelectedConv(conv)}
                                    className={`w-full p-5 rounded-[2rem] flex items-center gap-5 transition-all relative group/item border ${isActive ? 'bg-blue-600/10 border-blue-500/50 shadow-lg shadow-blue-500/5' : 'hover:bg-white/[0.03] border-transparent hover:border-white/10 text-slate-500 dark:text-slate-400'}`}
                                >
                                    <div className={`shrink-0 w-14 h-14 rounded-2xl flex items-center justify-center transition-all ${isActive ? 'bg-blue-600 text-white' : 'bg-white/5 border border-white/5 group-hover/item:border-white/20'}`}>
                                        {conv.type === 'DIRECT' ? <User size={20} /> : conv.type === 'GROUP' ? <Users size={20} /> : <Hash size={20} />}
                                    </div>
                                    <div className="flex-1 text-left min-w-0">
                                        <div className="flex justify-between items-center mb-1">
                                            <h4 className={`text-[13px] font-black tracking-tight truncate ${isActive ? 'text-white' : 'text-slate-900 dark:text-slate-200'}`}>{title}</h4>
                                            <span className="text-[9px] font-black uppercase opacity-40 tracking-wider">
                                                {conv.timestamp instanceof Date && !isNaN(conv.timestamp.getTime())
                                                    ? formatDistanceToNow(conv.timestamp, { locale: fr })
                                                    : '...'}
                                            </span>
                                        </div>
                                        <p className="text-[11px] font-bold truncate opacity-50 italic">{conv.last_message?.text || "Commencer à discuter..."}</p>
                                    </div>
                                    {isActive && <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-blue-500 rounded-r-full shadow-[0_0_15px_rgba(59,130,246,1)]" />}
                                </motion.button>
                            );
                        })}
                    </div>
                </div>

                {/* 2. Chat Area */}
                <div className={`flex-1 flex flex-col relative z-20 ${!selectedConv ? 'hidden lg:flex' : 'flex'} bg-white/30 dark:bg-transparent`}>
                    {selectedConv ? (
                        <div className="flex flex-col h-full">
                            <div className="px-8 py-6 border-b border-white/5 bg-white/5 dark:bg-white/[0.02] flex items-center justify-between backdrop-blur-md">
                                <div className="flex items-center gap-6">
                                    <button onClick={() => setSelectedConv(null)} className="p-2 lg:hidden hover:bg-white/10 rounded-xl transition-all text-slate-500"><ChevronLeft size={20} /></button>
                                    <div className="relative">
                                        <div className="w-16 h-16 rounded-[1.5rem] bg-gradient-to-br from-blue-500 to-indigo-600 p-0.5 shadow-2xl shadow-blue-500/20">
                                            <div className="w-full h-full bg-[#0b0e14] rounded-[1.4rem] flex items-center justify-center text-xl font-black text-blue-400 border border-white/5">
                                                {selectedConv.type === 'DIRECT' ? <User size={24} /> : <Users size={24} />}
                                            </div>
                                        </div>
                                        <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-[#0b0e14] rounded-full flex items-center justify-center border-2 border-slate-900">
                                            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(34,197,94,0.5)]" />
                                        </div>
                                    </div>
                                    <div>
                                        <h2 className="text-xl font-black text-slate-900 dark:text-white tracking-tight uppercase leading-none mb-1.5">{selectedConv.type === 'DIRECT' ? selectedConv.participants_details.find((p: any) => p.id !== currentUser?.id)?.username : selectedConv.name}</h2>
                                        <div className="flex items-center gap-2">
                                            <span className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">
                                                {selectedConv.type === 'GROUP' ? `${selectedConv.participants.length} membres • ${onlineUsersCount} online` : "Agent Disponible"}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-4">
                                    <div className="hidden md:flex flex-col items-end mr-4">
                                        <p className="text-[9px] font-black text-slate-500 uppercase tracking-[0.2em] mb-1">Status Sécurité</p>
                                        <div className="flex items-center gap-2 px-3 py-1 bg-green-500/10 rounded-full border border-green-500/20">
                                            <div className="w-1 h-1 bg-green-500 rounded-full" />
                                            <p className="text-[9px] font-black text-green-500 uppercase tracking-widest">Chiffré de bout en bout</p>
                                        </div>
                                    </div>
                                    <Button variant="secondary" size="icon" icon={MoreVertical} className="bg-white/5 border-white/10" />
                                </div>
                            </div>

                            <div ref={scrollRef} className="flex-1 overflow-y-auto p-12 space-y-12 custom-scrollbar">
                                {groupMessagesByDate(messages).map((group, gIdx) => (
                                    <div key={gIdx} className="space-y-8">
                                        <div className="flex items-center justify-center gap-4">
                                            <div className="h-px flex-1 bg-gradient-to-r from-transparent via-slate-200 dark:via-white/5 to-transparent" />
                                            <span className="text-[10px] font-black text-slate-500 dark:text-slate-600 uppercase tracking-[0.3em] whitespace-nowrap bg-white/80 dark:bg-white/5 px-4 py-1.5 rounded-full border border-slate-200 dark:border-white/5 backdrop-blur-md">
                                                {group.date === new Date().toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }) ? "Aujourd'hui" : group.date}
                                            </span>
                                            <div className="h-px flex-1 bg-gradient-to-r from-transparent via-slate-200 dark:via-white/5 to-transparent" />
                                        </div>

                                        {group.messages.map((msg) => {
                                            const isMe = msg.author === currentUser?.id || msg.isOptimistic;
                                            const isEditing = editingMsgId === msg.id;
                                            const isMentioned = msg.text?.includes(`@${currentUser?.username}`);

                                            return (
                                                <motion.div key={msg.id} initial={{ opacity: 0, x: isMe ? 20 : -20 }} animate={{ opacity: 1, x: 0 }} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                                                    <div className={`max-w-[75%] group relative flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                                                        {!isMe && (
                                                            <div className="flex items-center gap-2 mb-2 ml-4">
                                                                <div className="w-6 h-6 rounded-lg bg-blue-600/20 flex items-center justify-center text-[10px] font-black text-blue-400 border border-blue-500/20">{msg.author_name?.charAt(0)}</div>
                                                                <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{msg.author_name}</p>
                                                            </div>
                                                        )}

                                                        {isMentioned && !isMe && (
                                                            <div className="mb-2 bg-indigo-600/20 border border-indigo-500/30 px-3 py-1 rounded-full flex items-center gap-2 self-start ml-4">
                                                                <AtSign size={10} className="text-indigo-400" />
                                                                <span className="text-[9px] font-black text-indigo-400 uppercase tracking-widest">Vous avez été mentionné</span>
                                                            </div>
                                                        )}

                                                        <div className={`p-6 rounded-[2.5rem] shadow-xl transition-all relative ${isMe ? 'bg-blue-600 text-white rounded-tr-none' : isMentioned ? 'bg-indigo-600/10 dark:bg-indigo-600/30 text-slate-900 dark:text-slate-200 border border-indigo-500/30 rounded-tl-none' : 'bg-white dark:bg-white/5 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-white/5 rounded-tl-none'}`}>
                                                            {msg.attachment && (
                                                                <div className={`mb-4 p-4 rounded-2xl flex items-center gap-3 border ${isMe ? 'bg-white/10 border-white/20' : 'bg-slate-50 dark:bg-white/5 border-slate-200 dark:border-white/10'}`}>
                                                                    <div className={`p-2 rounded-xl ${isMe ? 'bg-white/20' : 'bg-blue-500/10 text-blue-500'}`}>
                                                                        {msg.attachment.match(/\.(jpg|jpeg|png|gif|webp)$/i) ? <Image size={20} /> : <FileText size={20} />}
                                                                    </div>
                                                                    <div className="flex-1 min-w-0">
                                                                        <p className={`text-xs font-black truncate ${isMe ? 'text-white' : 'text-slate-900 dark:text-white'}`}>Fichier Joint</p>
                                                                        <button
                                                                            onClick={() => window.open(msg.attachment, '_blank')}
                                                                            className={`text-[10px] font-bold underline opacity-70 hover:opacity-100 ${isMe ? 'text-white' : 'text-blue-500'}`}
                                                                        >
                                                                            Ouvrir le fichier
                                                                        </button>
                                                                    </div>
                                                                </div>
                                                            )}

                                                            {isEditing ? (
                                                                <div className="flex flex-col gap-3 min-w-[250px]">
                                                                    <textarea value={editValue} onChange={(e) => setEditValue(e.target.value)} className="bg-slate-100 dark:bg-black/40 border border-slate-300 dark:border-white/10 rounded-2xl p-4 text-sm focus:outline-none resize-none min-h-[100px]" autoFocus />
                                                                    <div className="flex justify-end gap-2">
                                                                        <button onClick={() => setEditingMsgId(null)} className="px-4 py-2 text-[10px] font-black uppercase opacity-50 hover:opacity-100 transition-all text-slate-600 dark:text-white">Annuler</button>
                                                                        <button onClick={() => handleEditMessage(msg.id)} className="px-4 py-2 bg-blue-600 dark:bg-white/20 hover:bg-blue-500 dark:hover:bg-white/30 rounded-xl text-[10px] font-black uppercase transition-all text-white">Enregistrer</button>
                                                                    </div>
                                                                </div>
                                                            ) : (
                                                                <div className="text-[15px] font-bold leading-relaxed">
                                                                    {renderMessageContent(msg.text)}
                                                                </div>
                                                            )}

                                                            {/* Actions au survol */}
                                                            <div className={`absolute top-0 ${isMe ? '-left-12' : '-right-12'} opacity-0 group-hover:opacity-100 transition-all flex flex-col gap-1 p-2`}>
                                                                {isMe && !isEditing && (
                                                                    <>
                                                                        <button onClick={() => { setEditingMsgId(msg.id); setEditValue(msg.text); }} className="p-2 hover:bg-white/10 rounded-full text-slate-500 hover:text-white transition-colors" title="Éditer"><Pencil size={12} /></button>
                                                                        <button onClick={() => handleDeleteMessage(msg.id)} className="p-2 hover:bg-rose-500/10 rounded-full text-slate-500 hover:text-rose-500 transition-colors" title="Supprimer"><Trash2 size={12} /></button>
                                                                    </>
                                                                )}
                                                                <button onClick={() => { setMsgToForward(msg); setShowForwardModal(true); }} className="p-2 hover:bg-white/10 rounded-full text-slate-500 hover:text-white transition-colors" title="Transférer"><Forward size={12} /></button>
                                                            </div>
                                                        </div>

                                                        <div className={`flex items-center gap-2 mt-3 px-6 ${isMe ? 'opacity-40' : 'opacity-20 transition-opacity group-hover:opacity-60'}`}>
                                                            <span className="text-[9px] font-black uppercase tracking-widest">{new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                                            {msg.is_edited && <span className="text-[9px] font-black uppercase tracking-widest">• MODIFIÉ</span>}
                                                            {isMe && <CheckCheck size={10} className="text-blue-200" />}
                                                        </div>
                                                    </div>
                                                </motion.div>
                                            );
                                        })}
                                    </div>
                                ))}
                            </div>

                            <div className="p-8 pt-0 relative">
                                <div className="max-w-5xl mx-auto relative">
                                    <AnimatePresence>
                                        {showMentionPopover && (
                                            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }} className="absolute bottom-full left-0 right-0 mb-6 bg-[#0b0e14] border border-white/10 rounded-[2.5rem] shadow-[0_30px_60px_-15px_rgba(0,0,0,0.5)] overflow-hidden z-50 backdrop-blur-3xl">
                                                <div className="p-5 border-b border-white/5 bg-white/5 flex items-center justify-between">
                                                    <span className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Mentionner un collègue</span>
                                                    <AtSign size={14} className="text-blue-500" />
                                                </div>
                                                <div className="max-h-64 overflow-y-auto p-3 custom-scrollbar space-y-1">
                                                    {selectedConv.participants_details.filter(p => p.username.toLowerCase().includes(mentionSearch.toLowerCase())).map((p) => (
                                                        <button
                                                            key={p.id}
                                                            onClick={() => {
                                                                const before = chatMessage.substring(0, mentionIndex);
                                                                const after = chatMessage.substring(mentionIndex + mentionSearch.length + 1);
                                                                setChatMessage(`${before}@${p.username} ${after}`);
                                                                setShowMentionPopover(false);
                                                                setMentionSearch('');
                                                            }}
                                                            className="w-full p-4 rounded-2xl hover:bg-blue-600 text-white flex items-center gap-4 transition-all group"
                                                        >
                                                            <div className="w-11 h-11 rounded-xl bg-white/5 flex items-center justify-center text-xs font-black border border-white/5 group-hover:bg-white/20 transition-all text-blue-400 group-hover:text-white">
                                                                {p.username.charAt(0)}
                                                            </div>
                                                            <div className="text-left">
                                                                <p className="text-sm font-black tracking-tight">{p.username}</p>
                                                                <p className="text-[10px] font-black opacity-50 uppercase tracking-[0.1em]">{p.first_name || "QA"} {p.last_name || "Engineer"}</p>
                                                            </div>
                                                        </button>
                                                    ))}
                                                </div>
                                            </motion.div>
                                        )}
                                    </AnimatePresence>

                                    <div className="relative group/input">
                                        <div className="absolute inset-0 bg-blue-500/5 blur-3xl opacity-0 group-focus-within/input:opacity-100 transition-opacity" />
                                        <div className="relative bg-[#0b0e14]/80 border border-white/10 rounded-[2.5rem] p-4 flex flex-col gap-3 backdrop-blur-2xl shadow-2xl transition-all focus-within:border-blue-500/40 focus-within:ring-4 focus-within:ring-blue-500/5">
                                            {selectedFile && (
                                                <div className="px-5 py-4 bg-white/5 border border-white/5 rounded-2xl flex items-center justify-between animate-fade-in">
                                                    <div className="flex items-center gap-4 overflow-hidden">
                                                        <div className="p-2.5 bg-blue-500/20 rounded-xl text-blue-400">
                                                            {selectedFile.type.startsWith('image/') ? <Image size={18} /> : <FileText size={18} />}
                                                        </div>
                                                        <div className="flex flex-col">
                                                            <span className="text-xs font-black text-white truncate max-w-[300px]">{selectedFile.name}</span>
                                                            <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Document prêt à l'envoi</span>
                                                        </div>
                                                    </div>
                                                    <button
                                                        onClick={() => setSelectedFile(null)}
                                                        className="p-2 hover:bg-rose-500/20 rounded-full text-slate-500 hover:text-rose-500 transition-all"
                                                    >
                                                        <X size={16} />
                                                    </button>
                                                </div>
                                            )}
                                            <div className="flex items-center gap-4">
                                                <button
                                                    onClick={() => fileInputRef.current?.click()}
                                                    className={`p-4 rounded-2xl transition-all border ${selectedFile ? 'bg-blue-600 border-transparent text-white' : 'bg-white/5 border-white/5 hover:bg-white/10 text-slate-500 hover:text-white'}`}
                                                >
                                                    <Paperclip size={20} />
                                                </button>
                                                <input
                                                    type="file"
                                                    ref={fileInputRef}
                                                    className="hidden"
                                                    onChange={(e) => {
                                                        const file = e.target.files?.[0];
                                                        if (file) setSelectedFile(file);
                                                        e.target.value = '';
                                                    }}
                                                />
                                                <div className="flex-1 relative">
                                                    <textarea
                                                        value={chatMessage}
                                                        onChange={(e) => {
                                                            const val = e.target.value;
                                                            setChatMessage(val);

                                                            const lastAtPos = val.lastIndexOf('@');
                                                            if (lastAtPos !== -1 && (lastAtPos === 0 || val[lastAtPos - 1] === ' ')) {
                                                                const search = val.substring(lastAtPos + 1).split(' ')[0];
                                                                setMentionSearch(search);
                                                                setMentionIndex(lastAtPos);
                                                                setShowMentionPopover(true);
                                                            } else {
                                                                setShowMentionPopover(false);
                                                            }
                                                        }}
                                                        onKeyDown={(e) => {
                                                            if (e.key === 'Enter' && !e.shiftKey) {
                                                                e.preventDefault();
                                                                handleSendMessage();
                                                            }
                                                            if (e.key === 'Escape') setShowMentionPopover(false);
                                                        }}
                                                        placeholder="Tapez votre message ici... (@ pour mentionner)"
                                                        rows={1}
                                                        className="w-full bg-transparent border-none py-4 text-[14px] font-bold text-white focus:outline-none resize-none placeholder:text-slate-700"
                                                    />
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <Button variant="secondary" size="icon" icon={Sparkles} onClick={handleAIReformulate} disabled={!chatMessage || isAILoading} isLoading={isAILoading} className="bg-indigo-500/10 border-indigo-500/20 text-indigo-400 hover:bg-indigo-500 hover:text-white" />
                                                    <Button size="icon" icon={Send} onClick={handleSendMessage} disabled={!chatMessage.trim() && !selectedFile} className="shadow-xl shadow-blue-500/20" />
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                            </div>
                        </div>
                    </div>
                ) : (
                        <div className="flex-1 flex flex-col items-center justify-center space-y-8">
                            <div className="w-32 h-32 rounded-[3rem] bg-slate-100 dark:bg-white/[0.02] border border-slate-200 dark:border-white/5 flex items-center justify-center shadow-inner"><MessageSquare size={48} className="text-slate-300 dark:text-slate-700" /></div>
                            <h3 className="text-xl font-black text-slate-800 dark:text-white uppercase tracking-widest text-center">Collaboration Center</h3>
                            <Button onClick={() => setShowNewChatModal('direct')} size="lg">Nouvelle Discussion</Button>
                        </div>
                    )}
                </div>

                {/* Modals */}
                <AnimatePresence>
                    {showNewChatModal && (
                        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
                            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowNewChatModal(null)} className="absolute inset-0 bg-black/80 backdrop-blur-xl" />
                            <motion.div initial={{ opacity: 0, scale: 0.9, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9, y: 20 }} className="relative w-full max-w-lg bg-white dark:bg-[#0b0e14] border border-slate-200 dark:border-white/10 rounded-[3rem] overflow-hidden">
                                <div className="p-8 border-b border-slate-100 dark:border-white/5 flex items-center justify-between">
                                    <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-widest">{showNewChatModal === 'direct' ? 'Message Direct' : 'Nouveau Groupe'}</h3>
                                    <button onClick={() => setShowNewChatModal(null)} className="p-2 hover:bg-slate-100 dark:hover:bg-white/5 rounded-xl text-slate-500"><X size={20} /></button>
                                </div>
                                <div className="p-8 space-y-6">
                                    {showNewChatModal === 'group' && (
                                        <input type="text" value={groupName} onChange={(e) => setGroupName(e.target.value)} placeholder="Nom du groupe..." className="glass-input w-full" />
                                    )}
                                    <div className="relative group">
                                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                        <input type="text" value={userSearchTerm} onChange={(e) => setUserSearchTerm(e.target.value)} placeholder="Chercher des membres..." className="glass-input w-full pl-12" />
                                    </div>
                                    <div className="max-h-64 overflow-y-auto custom-scrollbar space-y-2">
                                        {filteredUsers.map((u: any) => {
                                            const isSelected = selectedParticipants.includes(u.id);
                                            return (
                                                <button key={u.id} onClick={() => {
                                                    if (showNewChatModal === 'direct') handleCreateDirect(u.id);
                                                    else setSelectedParticipants(prev => isSelected ? prev.filter(id => id !== u.id) : [...prev, u.id]);
                                                }} className={`w-full p-4 rounded-2xl flex items-center gap-4 transition-all border ${isSelected ? 'bg-indigo-600/10 border-indigo-500/30' : 'hover:bg-slate-50 dark:hover:bg-white/5 border-transparent'}`}>
                                                    <div className="w-10 h-10 rounded-xl bg-blue-600/10 flex items-center justify-center text-blue-600 dark:text-blue-400 font-black text-xs">{u.username.charAt(0)}</div>
                                                    <div className="text-left flex-1"><p className="text-sm font-bold text-slate-700 dark:text-slate-200">{u.username}</p></div>
                                                    {isSelected && <Check size={16} className="text-indigo-600 dark:text-indigo-400" />}
                                                </button>
                                            );
                                        })}
                                    </div>
                                    {showNewChatModal === 'group' && (
                                        <button onClick={handleCreateGroup} disabled={!groupName || selectedParticipants.length === 0} className="w-full py-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all disabled:opacity-20 shadow-xl">Créer le groupe</button>
                                    )}
                                </div>
                            </motion.div>
                        </div>
                    )}

                    {showForwardModal && (
                        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
                            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowForwardModal(false)} className="absolute inset-0 bg-black/80 backdrop-blur-xl" />
                            <motion.div initial={{ opacity: 0, scale: 0.9, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9, y: 20 }} className="relative w-full max-w-lg bg-white dark:bg-[#0b0e14] border border-slate-200 dark:border-white/10 rounded-[3rem] overflow-hidden">
                                <div className="p-8 border-b border-slate-100 dark:border-white/5 flex items-center justify-between">
                                    <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-widest">Transférer le message</h3>
                                    <button onClick={() => setShowForwardModal(false)} className="p-2 hover:bg-slate-100 dark:hover:bg-white/5 rounded-xl text-slate-500"><X size={20} /></button>
                                </div>
                                <div className="p-8 space-y-4">
                                    <div className="bg-slate-50 dark:bg-white/5 p-4 rounded-2xl mb-4 italic text-slate-500 text-xs truncate">"{msgToForward?.text}"</div>
                                    <h4 className="text-[10px] font-black text-slate-500 dark:text-slate-600 uppercase tracking-widest">Choisir une destination</h4>
                                    <div className="max-h-64 overflow-y-auto custom-scrollbar space-y-2">
                                        {conversations.map(c => (
                                            <button key={c.id} onClick={() => handleForwardMessage(c.id)} className="w-full p-4 rounded-2xl hover:bg-slate-50 dark:hover:bg-white/5 flex items-center gap-4 transition-all border border-transparent hover:border-slate-200 dark:hover:border-white/5">
                                                <div className="w-8 h-8 rounded-lg bg-blue-600/10 flex items-center justify-center text-blue-600 dark:text-blue-400"><Send size={14} /></div>
                                                <span className="text-sm font-bold text-slate-700 dark:text-slate-200">{c.name || c.type}</span>
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </motion.div>
                        </div>
                    )}
                </AnimatePresence>
            </div>
        </PageLayout>
    );
};

export default ChatCenter;
