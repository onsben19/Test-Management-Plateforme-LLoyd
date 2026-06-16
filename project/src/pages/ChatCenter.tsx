import React, { useState, useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import PageLayout from '../components/PageLayout';
import { useAuth } from '../context/AuthContext';
import {
    MessageSquare, Send, Paperclip, Search,
    MoreVertical, User, Sparkles, Clock,
    Filter, Archive, CheckCheck, Hash,
    AtSign, Image, FileText, ChevronLeft, Plus, X,
    Pencil, Trash2, Forward, Users, Check, MoreHorizontal
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
    const [showMenu, setShowMenu] = useState(false);

    // Actions State
    const [editingMsgId, setEditingMsgId] = useState<string | null>(null);
    const [editValue, setEditValue] = useState('');
    const [showForwardModal, setShowForwardModal] = useState(false);
    const [msgToForward, setMsgToForward] = useState<any>(null);
    const [activeMessageMenu, setActiveMessageMenu] = useState<string | null>(null);
    const [activeConvMenu, setActiveConvMenu] = useState<string | null>(null);

    // Group Search State
    const [showNewChatModal, setShowNewChatModal] = useState<'direct' | 'group' | null>(null);
    const [allUsers, setAllUsers] = useState<any[]>([]);
    const [userSearchTerm, setUserSearchTerm] = useState('');
    const [selectedParticipants, setSelectedParticipants] = useState<number[]>([]);
    const [groupName, setGroupName] = useState('');
    const [selectedFile, setSelectedFile] = useState<File | null>(null);

    const [showArchived, setShowArchived] = useState(false);
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

    const handleArchiveConversation = async (conv?: any) => {
        const target = conv || selectedConv;
        if (!target) return;
        try {
            const isArchiving = !target.isArchived;
            setConversations(prev => prev.map(c => c.id === target.id ? { ...c, isArchived: isArchiving } : c));
            if (selectedConv?.id === target.id) setSelectedConv(null);
            setShowMenu(false);
            toast.success(isArchiving ? "Conversation archivée" : "Conversation désarchivée");
        } catch (err) {
            toast.error("Opération échouée");
        }
    };

    const handleDeleteConversation = async (conv?: any) => {
        const target = conv || selectedConv;
        if (!target) return;
        try {
            setConversations(prev => prev.filter(c => c.id !== target.id));
            if (selectedConv?.id === target.id) setSelectedConv(null);
            setShowMenu(false);
            toast.success("Conversation supprimée");
        } catch (err) {
            toast.error("Suppression échouée");
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
        // Filter by archive status
        if (showArchived && !c.isArchived) return false;
        if (!showArchived && c.isArchived) return false;

        const title = c.type === 'DIRECT'
            ? c.participants_details.find((p: any) => p.id !== currentUser?.id)?.username || "Chat Privé"
            : c.name || "Groupe";
        return title.toLowerCase().includes(searchQuery.toLowerCase());
    });

    
    const formatShortDate = (date: Date) => {
        if (!(date instanceof Date) || isNaN(date.getTime())) return '...';
        let formatted = formatDistanceToNow(date, { locale: fr });
        return formatted
            .replace(/environ\s+/gi, '')
            .replace(/\s+jours?/g, 'j')
            .replace(/\s+heures?/g, 'h')
            .replace(/\s+minutes?/g, 'm')
            .replace(/\s+mois/g, ' mois');
    };

    const filteredUsers = allUsers.filter(u =>
        u.username.toLowerCase().includes(userSearchTerm.toLowerCase()) ||
        (u.first_name + " " + u.last_name).toLowerCase().includes(userSearchTerm.toLowerCase())
    );

    return (
        <PageLayout noPadding>
            <div className="p-6 lg:p-8 pt-4 lg:pt-6 flex flex-col gap-5 h-[calc(100vh-64px)]">
                <div className="flex flex-col gap-1">
                    <h1 className="text-[20px] font-medium text-[#e8eaf6]">Chat Center</h1>
                    <div className="flex items-center gap-2 bg-[#378add26] border-[0.5px] border-[#378add40] px-3 py-1 rounded-full w-max">
                        <div className="w-2 h-2 bg-[#85B7EB] rounded-full animate-pulse" />
                        <span className="text-[11px] font-bold text-[#85B7EB]">Collaboration Live</span>
                    </div>
                </div>
                <div className="flex gap-[10px] flex-1 min-h-[400px] max-h-[700px] max-w-full overflow-hidden text-white" style={{ display: 'grid', gridTemplateColumns: '300px 1fr' }}>
                
                {/* Colonne 1 — Sidebar conversations (300px) */}
                <div className="flex flex-col bg-[#111827] rounded-xl border-[0.5px] border-white/10 overflow-hidden">
                    <div className="p-[12px_12px_8px] border-b-[0.5px] border-white/10 flex items-center justify-between">
                        {showArchived ? (
                            <div className="flex items-center gap-2">
                                <button onClick={() => setShowArchived(false)} className="w-[24px] h-[24px] flex items-center justify-center rounded-full bg-white/5 hover:bg-white/10 text-white/60 hover:text-white transition-colors" title="Retour aux conversations">
                                    <ChevronLeft size={14} />
                                </button>
                                <span className="text-[10px] uppercase font-bold text-[#85B7EB]">ARCHIVES</span>
                            </div>
                        ) : (
                            <span className="text-[10px] uppercase font-bold text-slate-500">CONVERSATIONS</span>
                        )}
                        <div className="flex items-center gap-1">
                            {!showArchived && (
                                <button onClick={() => setShowArchived(true)} className="w-[28px] h-[28px] rounded-lg bg-white/5 border-[0.5px] border-white/10 flex items-center justify-center text-white/40 hover:text-white transition-colors" title="Archivées">
                                    <Archive size={14} />
                                </button>
                            )}
                            <button onClick={() => setShowNewChatModal('group')} className="w-[28px] h-[28px] rounded-lg bg-white/5 border-[0.5px] border-white/10 flex items-center justify-center text-white/40 hover:text-white transition-colors" title="Nouveau Groupe"><Users size={14} /></button>
                            <button onClick={() => setShowNewChatModal('direct')} className="w-[28px] h-[28px] rounded-lg bg-white/5 border-[0.5px] border-white/10 flex items-center justify-center text-white/40 hover:text-white transition-colors" title="Message Direct"><Plus size={14} /></button>
                        </div>
                    </div>
                    <div className="p-3 border-b-[0.5px] border-white/10">
                        <div className="flex items-center gap-2 bg-[#1a2235] border-[0.5px] border-white/10 rounded-[10px] p-[8px_12px]">
                            <Search size={14} className="text-white/25" />
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder="Rechercher..."
                                className="bg-transparent border-none outline-none text-xs text-white placeholder-white/25 flex-1"
                            />
                        </div>
                    </div>
                    <div className="p-2 gap-[3px] overflow-y-auto flex-1 flex flex-col custom-scrollbar-thin">
                        {filteredConversations.map((conv) => {
                            const otherUser = conv.type === 'DIRECT' ? conv.participants_details.find((p: any) => p.id !== currentUser?.id) : null;
                            const title = conv.type === 'DIRECT' ? otherUser?.username : conv.name;
                            const isActive = selectedConv?.id === conv.id;

                            return (
                                <div key={conv.id} className="relative group">
                                    <button
                                        onClick={() => setSelectedConv(conv)}
                                        className={`w-full text-left p-[10px] rounded-[10px] border-[0.5px] flex items-center gap-3 transition-all ${isActive ? 'bg-[#378add1a] border-[#378add33]' : 'bg-transparent border-white/5 hover:bg-white/5'}`}
                                    >
                                        <div className={`relative w-[36px] h-[36px] rounded-full flex items-center justify-center text-sm font-bold shrink-0 ${isActive ? 'bg-[#185FA5] text-white' : 'bg-[#1a2235] text-white/70'}`}>
                                            {conv.type === 'DIRECT' ? <User size={16} /> : <Users size={16} />}
                                            <div className="absolute -bottom-0.5 -right-0.5 w-[9px] h-[9px] bg-[#1D9E75] rounded-full border-[1.5px] border-[#111827]" />
                                        </div>
                                        <div className="flex-1 min-w-0 pr-6">
                                            <div className="flex items-center justify-between">
                                                <span className="text-[13px] font-medium text-white truncate max-w-[120px]">{title}</span>
                                                <span className="text-[10px] text-slate-500 shrink-0">{formatShortDate(conv.timestamp)}</span>
                                            </div>
                                            <p className="text-[11px] text-white/35 truncate mt-0.5">{conv.last_message?.text || "Commencer à discuter..."}</p>
                                        </div>
                                    </button>

                                    <button
                                        onClick={(e) => { e.stopPropagation(); setActiveConvMenu(activeConvMenu === conv.id ? null : conv.id); }}
                                        className={`absolute right-2 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-[#111827] border-[0.5px] border-white/10 flex items-center justify-center text-white/50 hover:text-white transition-all shadow-md ${activeConvMenu === conv.id ? 'opacity-100 scale-100 z-10' : 'opacity-0 scale-95 group-hover:opacity-100 group-hover:scale-100'}`}
                                    >
                                        <MoreHorizontal size={14} />
                                    </button>

                                    {activeConvMenu === conv.id && (
                                        <>
                                            <div className="fixed inset-0 z-20 cursor-default" onClick={(e) => { e.stopPropagation(); setActiveConvMenu(null); }}></div>
                                            <div className="absolute right-8 top-1/2 -translate-y-1/2 w-40 bg-[#1a2235] rounded-xl shadow-[0_8px_30px_rgb(0,0,0,0.5)] border-[0.5px] border-white/10 z-30 p-1.5 animate-in fade-in zoom-in-95 duration-150">
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); handleArchiveConversation(conv); setActiveConvMenu(null); }}
                                                    className="w-full text-left px-3 py-2 text-[12px] font-medium text-white/80 hover:text-white hover:bg-white/10 rounded-[8px] flex items-center gap-3 transition-colors"
                                                >
                                                    <Archive size={14} /> {conv.isArchived ? "Désarchiver" : "Archiver"}
                                                </button>
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); handleDeleteConversation(conv); setActiveConvMenu(null); }}
                                                    className="w-full text-left px-3 py-2 text-[12px] font-medium text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 rounded-[8px] flex items-center gap-3 mt-0.5 transition-colors"
                                                >
                                                    <Trash2 size={14} /> Supprimer
                                                </button>
                                            </div>
                                        </>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Colonne 2 — Panneau de chat */}
                <div className="flex flex-col bg-[#111827] rounded-xl border-[0.5px] border-white/10 overflow-hidden">
                    {selectedConv ? (
                        <>
                            <div className="p-[14px_16px] border-b-[0.5px] border-white/10 flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="relative w-[40px] h-[40px] rounded-full bg-[#185FA5] flex items-center justify-center text-white">
                                        {selectedConv.type === 'DIRECT' ? <User size={20} /> : <Users size={20} />}
                                        <div className="absolute bottom-0 right-0 w-[10px] h-[10px] bg-[#1D9E75] rounded-full border-[2px] border-[#111827]" />
                                    </div>
                                    <div>
                                        <h2 className="text-[15px] font-medium text-white capitalize leading-tight">
                                            {(selectedConv.type === 'DIRECT' ? selectedConv.participants_details.find((p: any) => p.id !== currentUser?.id)?.username : selectedConv.name)?.toLowerCase()}
                                        </h2>
                                        <div className="flex items-center gap-1.5 mt-0.5">
                                            <div className="w-[7px] h-[7px] bg-[#5DCAA5] rounded-full" />
                                            <span className="text-[#5DCAA5] text-[11px] tracking-[0.04em]">Agent disponible</span>
                                        </div>
                                    </div>
                                </div>
                                <div className="relative">
                                    <button onClick={() => setShowMenu(!showMenu)} className="w-[30px] h-[30px] flex items-center justify-center text-white/50 hover:text-white rounded-lg hover:bg-white/10 transition-colors">
                                        <MoreVertical size={16} />
                                    </button>
                                    {showMenu && (
                                        <>
                                            <div className="fixed inset-0 z-10" onClick={() => setShowMenu(false)}></div>
                                            <div className="absolute right-0 mt-2 w-48 bg-[#1a2235] rounded-xl shadow-xl border-[0.5px] border-white/10 z-20 p-2">
                                                <button
                                                    onClick={handleArchiveConversation}
                                                    className="w-full text-left px-4 py-2 text-[13px] text-white hover:bg-white/10 rounded-lg flex items-center gap-2"
                                                >
                                                    <Archive size={14} /> {selectedConv?.isArchived ? "Désarchiver" : "Archiver"}
                                                </button>
                                                <button
                                                    onClick={handleDeleteConversation}
                                                    className="w-full text-left px-4 py-2 text-[13px] text-rose-400 hover:bg-rose-500/10 rounded-lg flex items-center gap-2 mt-1"
                                                >
                                                    <Trash2 size={14} /> Supprimer
                                                </button>
                                            </div>
                                        </>
                                    )}
                                </div>
                            </div>

                            <div ref={scrollRef} className="flex-1 overflow-y-auto p-[16px] gap-[12px] flex flex-col custom-scrollbar-thin">
                                {groupMessagesByDate(messages).map((group, gIdx) => (
                                    <div key={gIdx} className="flex flex-col gap-[12px]">
                                        <div className="flex justify-center my-2">
                                            <div className="bg-[#1a2235] border-[0.5px] border-white/10 rounded-[20px] p-[4px_12px] text-[10px] uppercase text-slate-500 font-medium tracking-wide">
                                                {group.date}
                                            </div>
                                        </div>

                                        {group.messages.map((msg: any) => {
                                            const isMe = msg.author === currentUser?.id || msg.isOptimistic;
                                            const isForwarded = msg.text?.includes('Transféré');

                                            return (
                                                <div key={msg.id} className={`flex flex-col group relative ${isMe ? 'items-end' : 'items-start'}`}>
                                                    {isForwarded && (
                                                        <div className="flex items-center gap-1.5 bg-[#378add1a] border-[0.5px] border-[#378add33] px-2 py-0.5 rounded-full mb-1">
                                                            <Forward size={10} className="text-[#85B7EB]" />
                                                            <span className="text-[10px] text-[#85B7EB]">Transféré</span>
                                                        </div>
                                                    )}
                                                    
                                                    <div 
                                                        onClick={() => setActiveMessageMenu(activeMessageMenu === msg.id ? null : msg.id)}
                                                        className={`relative p-[10px_14px] rounded-[14px] text-sm max-w-[65%] cursor-pointer transition-transform active:scale-[0.98] ${isMe ? 'bg-[#1D4E8F] text-[#C8DEFF] rounded-br-[4px]' : 'bg-[#1a2235] text-[#e8eaf6] border-[0.5px] border-white/10 rounded-bl-[4px]'}`}
                                                    >
                                                        {activeMessageMenu === msg.id && (
                                                            <>
                                                                <div className="fixed inset-0 z-20 cursor-default" onClick={(e) => { e.stopPropagation(); setActiveMessageMenu(null); }}></div>
                                                                <div className={`absolute top-full mt-1 ${isMe ? 'right-0' : 'left-0'} flex flex-col min-w-[130px] bg-[#1a2235] border-[0.5px] border-white/10 p-1 rounded-[10px] shadow-2xl z-30 animate-in fade-in zoom-in-95 duration-100`}>
                                                                    <button onClick={(e) => { e.stopPropagation(); setMsgToForward(msg); setShowForwardModal(true); setActiveMessageMenu(null); }} className="w-full text-left px-2.5 py-1.5 text-[11px] font-medium text-white/70 hover:text-white hover:bg-white/10 rounded-md transition-colors flex items-center gap-2">
                                                                        <Forward size={12} /> Transférer
                                                                    </button>
                                                                    {isMe && (
                                                                        <>
                                                                            <button onClick={(e) => { e.stopPropagation(); setEditingMsgId(msg.id); setEditValue(msg.text); setActiveMessageMenu(null); }} className="w-full text-left px-2.5 py-1.5 text-[11px] font-medium text-[#85B7EB] hover:bg-[#378add1a] rounded-md transition-colors flex items-center gap-2 mt-0.5">
                                                                                <Pencil size={12} /> Modifier
                                                                            </button>
                                                                            <button onClick={(e) => { e.stopPropagation(); handleDeleteMessage(msg.id); setActiveMessageMenu(null); }} className="w-full text-left px-2.5 py-1.5 text-[11px] font-medium text-rose-400 hover:bg-rose-500/10 rounded-md transition-colors flex items-center gap-2 mt-0.5">
                                                                                <Trash2 size={12} /> Supprimer
                                                                            </button>
                                                                        </>
                                                                    )}
                                                                </div>
                                                            </>
                                                        )}
                                                        {msg.attachment && (
                                                            <div className={`mb-3 p-3 rounded-xl flex items-center gap-3 border ${isMe ? 'bg-black/20 border-white/10' : 'bg-white/5 border-white/10'}`}>
                                                                <div className={`p-2 rounded-lg ${isMe ? 'bg-white/20' : 'bg-[#185FA5]/30 text-[#85B7EB]'}`}>
                                                                    {msg.attachment.match(/\.(jpg|jpeg|png|gif|webp)$/i) ? <Image size={16} /> : <FileText size={16} />}
                                                                </div>
                                                                <div className="flex-1 min-w-0">
                                                                    <p className="text-[11px] font-bold truncate text-white">Fichier Joint</p>
                                                                    <button onClick={() => window.open(msg.attachment, '_blank')} className="text-[10px] underline opacity-70 hover:opacity-100 text-white">
                                                                        Ouvrir
                                                                    </button>
                                                                </div>
                                                            </div>
                                                        )}
                                                        {editingMsgId === msg.id ? (
                                                            <div className="flex flex-col gap-2 min-w-[200px]">
                                                                <input
                                                                    type="text"
                                                                    value={editValue}
                                                                    onChange={(e) => setEditValue(e.target.value)}
                                                                    onKeyDown={(e) => { if (e.key === 'Enter') handleEditMessage(msg.id); else if (e.key === 'Escape') setEditingMsgId(null); }}
                                                                    autoFocus
                                                                    className="bg-black/20 border-[0.5px] border-white/20 rounded-lg p-2 text-sm text-white focus:outline-none focus:border-white/50 w-full"
                                                                />
                                                                <div className="flex justify-end gap-1 mt-1">
                                                                    <button onClick={() => setEditingMsgId(null)} className="px-2 py-1 text-[10px] bg-white/10 hover:bg-white/20 rounded text-white">Annuler</button>
                                                                    <button onClick={() => handleEditMessage(msg.id)} className="px-2 py-1 text-[10px] bg-[#378add] hover:bg-[#378add]/80 text-white rounded">Enregistrer</button>
                                                                </div>
                                                            </div>
                                                        ) : (
                                                            msg.text && renderMessageContent(msg.text.replace(/\[Transféré de .*?\]/g, '').trim())
                                                        )}
                                                    </div>
                                                    <div className="flex items-center gap-1 mt-1 text-[10px] text-white/25">
                                                        {msg.is_edited && <span className="mr-1 italic text-white/40">Modifié</span>}
                                                        <span>{new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                                        {isMe && <CheckCheck size={10} />}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                ))}
                            </div>

                            <div className="relative">
                                {selectedFile && (
                                    <div className="absolute bottom-full left-4 mb-2 p-3 bg-[#1a2235] border-[0.5px] border-white/10 rounded-xl flex items-center justify-between z-10 shadow-xl min-w-[250px]">
                                        <div className="flex items-center gap-3 overflow-hidden">
                                            <div className="p-2 bg-[#378add1a] rounded-lg text-[#85B7EB]">
                                                {selectedFile.type.startsWith('image/') ? <Image size={16} /> : <FileText size={16} />}
                                            </div>
                                            <div className="flex flex-col">
                                                <span className="text-[11px] font-bold text-white truncate max-w-[200px]">{selectedFile.name}</span>
                                                <span className="text-[9px] text-white/50 uppercase mt-0.5">Fichier prêt</span>
                                            </div>
                                        </div>
                                        <button onClick={() => setSelectedFile(null)} className="p-1.5 hover:bg-rose-500/20 rounded-lg text-white/50 hover:text-rose-400 ml-4 transition-all">
                                            <X size={14} />
                                        </button>
                                    </div>
                                )}
                                <div className="p-[12px_14px] border-t-[0.5px] border-white/10 flex items-center gap-3 relative bg-[#111827]">
                                    <button onClick={() => fileInputRef.current?.click()} className="w-[32px] h-[32px] flex items-center justify-center text-white/50 hover:text-white rounded-lg hover:bg-white/10 transition-colors shrink-0">
                                        <Paperclip size={18} />
                                    </button>
                                    <input type="file" ref={fileInputRef} className="hidden" onChange={(e) => { const file = e.target.files?.[0]; if (file) setSelectedFile(file); e.target.value = ''; }} />
                                    
                                    <input
                                        type="text"
                                        value={chatMessage}
                                        onChange={(e) => setChatMessage(e.target.value)}
                                        onKeyDown={(e) => { if (e.key === 'Enter') handleSendMessage(); }}
                                        placeholder="Tapez votre message ici... (@ pour mentionner)"
                                        className="flex-1 bg-[#1a2235] border-[0.5px] border-white/10 rounded-[10px] p-[10px_14px] text-[13px] text-white placeholder-slate-500 focus:outline-none focus:border-white/20"
                                    />
                                    
                                    <button onClick={handleAIReformulate} disabled={!chatMessage} className="w-[32px] h-[32px] bg-[#7F77DD1F] border-[0.5px] border-[#7F77DD33] flex items-center justify-center text-[#AFA9EC] rounded-lg shrink-0 disabled:opacity-50">
                                        <Sparkles size={16} />
                                    </button>
                                    <button onClick={handleSendMessage} disabled={!chatMessage.trim() && !selectedFile} className="w-[32px] h-[32px] bg-[#185FA5] border-[0.5px] border-[#378ADD] flex items-center justify-center text-[#B5D4F4] rounded-lg shrink-0 disabled:opacity-50">
                                        <Send size={14} />
                                    </button>
                                </div>
                            </div>
                        </>
                    ) : (
                        <div className="flex-1 flex flex-col items-center justify-center">
                            <MessageSquare size={40} className="text-white/20 mb-4" />
                            <h3 className="text-white/50 text-sm font-medium">Sélectionnez une conversation pour commencer</h3>
                        </div>
                    )}
                </div>

                <AnimatePresence>
                    {showNewChatModal && (
                        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/80">
                           <div className="bg-[#111827] border-[0.5px] border-white/10 rounded-2xl w-full max-w-lg p-6">
                                <div className="flex justify-between items-center mb-6">
                                    <h3 className="text-white font-medium">{showNewChatModal === 'direct' ? 'Message Direct' : 'Nouveau Groupe'}</h3>
                                    <button onClick={() => setShowNewChatModal(null)} className="text-white/50"><X size={20} /></button>
                                </div>
                                <div className="space-y-2 max-h-60 overflow-y-auto">
                                    {filteredUsers.map((u: any) => (
                                        <button key={u.id} onClick={() => { if (showNewChatModal === 'direct') handleCreateDirect(u.id); else setSelectedParticipants(prev => [...prev, u.id]); }} className="w-full text-left p-3 hover:bg-white/5 rounded-xl text-white/80">{u.username}</button>
                                    ))}
                                </div>
                           </div>
                        </div>
                    )}
                    {showForwardModal && msgToForward && (
                        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/80">
                           <div className="bg-[#111827] border-[0.5px] border-white/10 rounded-2xl w-full max-w-lg p-6">
                                <div className="flex justify-between items-center mb-6">
                                    <h3 className="text-white font-medium">Transférer le message</h3>
                                    <button onClick={() => { setShowForwardModal(false); setMsgToForward(null); }} className="text-white/50"><X size={20} /></button>
                                </div>
                                <div className="p-3 bg-white/5 rounded-xl border-[0.5px] border-white/10 mb-4 text-sm text-white/80 line-clamp-3">
                                    {msgToForward.text}
                                </div>
                                <h4 className="text-xs uppercase text-white/40 font-bold mb-2">Sélectionner une conversation</h4>
                                <div className="space-y-2 max-h-60 overflow-y-auto custom-scrollbar-thin pr-2">
                                    {conversations.map((c: any) => (
                                        <button key={c.id} onClick={() => handleForwardMessage(c.id)} className="w-full text-left p-3 hover:bg-white/5 rounded-xl text-white/80 flex items-center gap-3 border-[0.5px] border-transparent hover:border-white/10 transition-colors">
                                            <div className="w-8 h-8 rounded-full bg-[#1a2235] flex items-center justify-center">
                                                {c.type === 'DIRECT' ? <User size={14} /> : <Users size={14} />}
                                            </div>
                                            <span className="truncate flex-1 text-sm">{c.type === 'DIRECT' ? c.participants_details.find((p: any) => p.id !== currentUser?.id)?.username : c.name}</span>
                                        </button>
                                    ))}
                                </div>
                           </div>
                        </div>
                    )}
                </AnimatePresence>
            </div>
            
            <style dangerouslySetInnerHTML={{__html: `
                .custom-scrollbar-thin::-webkit-scrollbar {
                    width: 3px;
                }
                .custom-scrollbar-thin::-webkit-scrollbar-track {
                    background: transparent;
                }
                .custom-scrollbar-thin::-webkit-scrollbar-thumb {
                    background: rgba(255,255,255,0.1);
                    border-radius: 10px;
                }
                .custom-scrollbar-thin::-webkit-scrollbar-thumb:hover {
                    background: rgba(255,255,255,0.2);
                }
            `}} />
            </div>
        </PageLayout>
    );

};

export default ChatCenter;
