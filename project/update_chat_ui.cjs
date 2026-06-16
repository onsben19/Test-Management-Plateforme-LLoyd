const fs = require('fs');

const filePath = '/Users/user/Desktop/projet fe/project/src/pages/ChatCenter.tsx';
let content = fs.readFileSync(filePath, 'utf8');

const newFormatShortDate = `
    const formatShortDate = (date: Date) => {
        if (!(date instanceof Date) || isNaN(date.getTime())) return '...';
        let formatted = formatDistanceToNow(date, { locale: fr });
        return formatted
            .replace(/environ\\s+/gi, '')
            .replace(/\\s+jours?/g, 'j')
            .replace(/\\s+heures?/g, 'h')
            .replace(/\\s+minutes?/g, 'm')
            .replace(/\\s+mois/g, ' mois');
    };
`;

if (!content.includes('const formatShortDate')) {
    content = content.replace('const filteredUsers =', newFormatShortDate + '\n    const filteredUsers =');
}

const newReturn = `
    return (
        <PageLayout title={
            <div className="flex flex-col gap-1 mb-2">
                <h1 className="text-[20px] font-medium text-[#e8eaf6]">Chat Center</h1>
                <div className="flex items-center gap-2 bg-[#378add26] border-[0.5px] border-[#378add40] px-3 py-1 rounded-full w-max">
                    <div className="w-2 h-2 bg-[#85B7EB] rounded-full animate-pulse" />
                    <span className="text-[11px] font-bold text-[#85B7EB]">Collaboration Live</span>
                </div>
            </div>
        } noPadding>
            <div className="flex gap-[10px] h-[520px] max-w-full overflow-hidden text-white" style={{ display: 'grid', gridTemplateColumns: '300px 1fr' }}>
                
                {/* Colonne 1 — Sidebar conversations (300px) */}
                <div className="flex flex-col bg-[#111827] rounded-xl border-[0.5px] border-white/10 overflow-hidden">
                    <div className="p-[12px_12px_8px] border-b-[0.5px] border-white/10 flex items-center justify-between">
                        <span className="text-[10px] uppercase font-bold text-slate-500">CONVERSATIONS</span>
                        <div className="flex items-center gap-1">
                            <button className="w-[28px] h-[28px] rounded-lg bg-white/5 border-[0.5px] border-white/10 flex items-center justify-center text-white/40 hover:text-white transition-colors" title="Archivées"><Archive size={14} /></button>
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
                                <button
                                    key={conv.id}
                                    onClick={() => setSelectedConv(conv)}
                                    className={\`text-left p-[10px] rounded-[10px] border-[0.5px] flex items-center gap-3 transition-all \${isActive ? 'bg-[#378add1a] border-[#378add33]' : 'bg-transparent border-white/5 hover:bg-white/5'}\`}
                                >
                                    <div className={\`relative w-[36px] h-[36px] rounded-full flex items-center justify-center text-sm font-bold \${isActive ? 'bg-[#185FA5] text-white' : 'bg-[#1a2235] text-white/70'}\`}>
                                        {conv.type === 'DIRECT' ? <User size={16} /> : <Users size={16} />}
                                        {/* Point de présence (uniquement simulé pour démo) */}
                                        <div className="absolute -bottom-0.5 -right-0.5 w-[9px] h-[9px] bg-[#1D9E75] rounded-full border-[1.5px] border-[#111827]" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center justify-between">
                                            <span className="text-[13px] font-medium text-white truncate max-w-[120px]">{title}</span>
                                            <span className="text-[10px] text-slate-500">{formatShortDate(conv.timestamp)}</span>
                                        </div>
                                        <p className="text-[11px] text-white/35 truncate mt-0.5">{conv.last_message?.text || "Commencer à discuter..."}</p>
                                    </div>
                                </button>
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
                                <button className="w-[30px] h-[30px] flex items-center justify-center text-white/50 hover:text-white rounded-lg hover:bg-white/10 transition-colors">
                                    <MoreVertical size={16} />
                                </button>
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
                                            const isForwarded = msg.text?.includes('Transféré'); // Simplified logic

                                            return (
                                                <div key={msg.id} className={\`flex flex-col \${isMe ? 'items-end' : 'items-start'}\`}>
                                                    {isForwarded && (
                                                        <div className="flex items-center gap-1.5 bg-[#378add1a] border-[0.5px] border-[#378add33] px-2 py-0.5 rounded-full mb-1">
                                                            <Forward size={10} className="text-[#85B7EB]" />
                                                            <span className="text-[10px] text-[#85B7EB]">Transféré</span>
                                                        </div>
                                                    )}
                                                    <div className={\`p-[10px_14px] rounded-[14px] text-sm max-w-[65%] \${isMe ? 'bg-[#1D4E8F] text-[#C8DEFF] rounded-br-[4px]' : 'bg-[#1a2235] text-[#e8eaf6] border-[0.5px] border-white/10 rounded-bl-[4px]'}\`}>
                                                        {renderMessageContent(msg.text.replace('\\[Transféré de manager\\]', '').trim())}
                                                    </div>
                                                    <div className="flex items-center gap-1 mt-1 text-[10px] text-white/25">
                                                        <span>{new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                                        {isMe && <CheckCheck size={10} />}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                ))}
                            </div>

                            <div className="p-[12px_14px] border-t-[0.5px] border-white/10 flex items-center gap-3 relative">
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
                        </>
                    ) : (
                        <div className="flex-1 flex flex-col items-center justify-center">
                            <MessageSquare size={40} className="text-white/20 mb-4" />
                            <h3 className="text-white/50 text-sm font-medium">Sélectionnez une conversation pour commencer</h3>
                        </div>
                    )}
                </div>

                {/* Keep existing modals logic but hidden/simplified for pure UI demo if needed. We'll append them hidden or use existing ones */}
                <AnimatePresence>
                    {showNewChatModal && (
                        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/80">
                           <div className="bg-[#111827] border-[0.5px] border-white/10 rounded-2xl w-full max-w-lg p-6">
                                <div className="flex justify-between items-center mb-6">
                                    <h3 className="text-white font-medium">{showNewChatModal === 'direct' ? 'Message Direct' : 'Nouveau Groupe'}</h3>
                                    <button onClick={() => setShowNewChatModal(null)} className="text-white/50"><X size={20} /></button>
                                </div>
                                {/* Simplified User List to not crash */}
                                <div className="space-y-2 max-h-60 overflow-y-auto">
                                    {filteredUsers.map((u: any) => (
                                        <button key={u.id} onClick={() => { if (showNewChatModal === 'direct') handleCreateDirect(u.id); else setSelectedParticipants(prev => [...prev, u.id]); }} className="w-full text-left p-3 hover:bg-white/5 rounded-xl text-white/80">{u.username}</button>
                                    ))}
                                </div>
                           </div>
                        </div>
                    )}
                </AnimatePresence>
            </div>
            
            <style dangerouslySetInnerHTML={{__html: \`
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
            \`}} />
        </PageLayout>
    );
`;

const returnIndex = content.indexOf('return (');
if (returnIndex !== -1) {
    content = content.substring(0, returnIndex) + newReturn + '\n};\n\nexport default ChatCenter;\n';
}

fs.writeFileSync(filePath, content, 'utf8');
console.log('Successfully updated ChatCenter.tsx');
