import React, { useState, useEffect } from 'react';
import { X, Paperclip, Send, Loader } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { userService, emailService } from '../services/api';
import { toast } from 'react-toastify';

interface ComposeEmailModalProps {
    onClose: () => void;
    onSuccess: () => void;
}

const ComposeEmailModal: React.FC<ComposeEmailModalProps> = ({ onClose, onSuccess }) => {
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

    useEffect(() => {
        fetchUsers();
    }, []);

    const fetchUsers = async () => {
        try {
            setLoading(true);
            const response = await userService.getUsers();
            // Filter out current user
            const otherUsers = response.data.filter((u: any) => u.id !== user?.id);
            setUsers(otherUsers);
        } catch (error) {
            console.error("Failed to fetch users", error);
        } finally {
            setLoading(false);
        }
    };

    const toggleRecipient = (userId: string) => {
        setRecipientIds(prev =>
            prev.includes(userId)
                ? prev.filter(id => id !== userId)
                : [...prev, userId]
        );
    };

    const filteredUsers = users.filter(u =>
        u.username.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (recipientIds.length === 0 || !subject || !body) {
            toast.error("Veuillez remplir tous les champs obligatoires");
            return;
        }

        try {
            setSending(true);
            const formData = new FormData();
            recipientIds.forEach(id => {
                formData.append('recipients', id);
            });
            formData.append('subject', subject);
            formData.append('body', body);
            if (attachment) {
                formData.append('attachment', attachment);
            }

            await emailService.sendEmail(formData);
            toast.success("Emails envoyés avec succès");
            onSuccess();
            onClose();
        } catch (error) {
            console.error("Failed to send email", error);
            toast.error("Erreur lors de l'envoi de l'email");
        } finally {
            setSending(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/80 backdrop-blur-sm animate-in fade-in">
            <div className="bg-slate-800 border border-slate-700 rounded-xl p-6 max-w-2xl w-full shadow-2xl animate-in zoom-in-95 duration-200">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-xl font-bold text-white flex items-center gap-2">
                        <Send className="w-5 h-5 text-blue-500" />
                        Nouveau Message
                    </h2>
                    <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">
                        <X className="w-6 h-6" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="relative">
                        <label className="block text-sm font-medium text-slate-300 mb-2">Destinataires</label>

                        {/* Selected Recipients Chips */}
                        <div className="mb-2 flex flex-wrap gap-2">
                            {recipientIds.map(id => {
                                const user = users.find(u => u.id === id);
                                return (
                                    <div key={id} className="bg-blue-600 text-white text-sm px-2 py-1 rounded-full flex items-center gap-1 animate-in zoom-in-50">
                                        <span>{user?.username}</span>
                                        <button
                                            type="button"
                                            onClick={() => toggleRecipient(id)}
                                            className="hover:text-blue-200"
                                        >
                                            <X className="w-3 h-3" />
                                        </button>
                                    </div>
                                );
                            })}
                        </div>

                        {/* Search and Dropdown Trigger */}
                        <div
                            className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 text-white focus-within:ring-2 focus-within:ring-blue-500 cursor-text min-h-[42px] flex items-center"
                            onClick={() => setIsDropdownOpen(true)}
                        >
                            <input
                                type="text"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                placeholder={recipientIds.length === 0 ? "Rechercher un utilisateur..." : "Ajouter d'autres..."}
                                className="bg-transparent border-none outline-none flex-1 placeholder:text-slate-500 text-sm"
                                onFocus={() => setIsDropdownOpen(true)}
                            />
                        </div>

                        {/* Dropdown List */}
                        {isDropdownOpen && (
                            <>
                                <div
                                    className="fixed inset-0 z-10"
                                    onClick={() => setIsDropdownOpen(false)}
                                ></div>
                                <div className="absolute z-20 w-full mt-1 bg-slate-800 border border-slate-700 rounded-lg shadow-xl max-h-60 overflow-y-auto">
                                    {filteredUsers.length === 0 ? (
                                        <div className="p-3 text-slate-500 text-sm italic">Aucun utilisateur trouvé</div>
                                    ) : (
                                        filteredUsers.map(u => (
                                            <div
                                                key={u.id}
                                                onClick={() => toggleRecipient(u.id)}
                                                className="p-3 hover:bg-slate-700 cursor-pointer flex items-center justify-between transition-colors"
                                            >
                                                <div className="flex items-center gap-3">
                                                    <div className="w-8 h-8 rounded-full bg-slate-600 flex items-center justify-center text-xs font-bold text-white">
                                                        {u.username.charAt(0).toUpperCase()}
                                                    </div>
                                                    <div>
                                                        <p className="text-sm font-medium text-white">{u.username}</p>
                                                        <p className="text-xs text-slate-400">{u.role}</p>
                                                    </div>
                                                </div>
                                                {recipientIds.includes(u.id) && (
                                                    <div className="h-5 w-5 bg-blue-500 rounded-full flex items-center justify-center">
                                                        <X className="w-3 h-3 text-white transform rotate-45" />
                                                        {/* Using X rotated 45deg as checkmark or just standard Check icon if I import it */}
                                                    </div>
                                                )}
                                            </div>
                                        ))
                                    )}
                                </div>
                            </>
                        )}
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-300 mb-1">Objets</label>
                        <input
                            type="text"
                            value={subject}
                            onChange={(e) => setSubject(e.target.value)}
                            className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                            required
                            placeholder="Sujet du message"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-300 mb-1">Message</label>
                        <textarea
                            value={body}
                            onChange={(e) => setBody(e.target.value)}
                            className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 h-40 resize-none"
                            required
                            placeholder="Votre message..."
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-300 mb-1">Pièce jointe (optionnel)</label>
                        <div className="flex items-center gap-4">
                            <label className="cursor-pointer flex items-center gap-2 px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg text-slate-200 transition-colors">
                                <Paperclip className="w-4 h-4" />
                                <span>{attachment ? attachment.name : "Choisir un fichier"}</span>
                                <input
                                    type="file"
                                    className="hidden"
                                    onChange={(e) => e.target.files && setAttachment(e.target.files[0])}
                                />
                            </label>
                            {attachment && (
                                <button
                                    type="button"
                                    onClick={() => setAttachment(null)}
                                    className="text-red-400 hover:text-red-300 text-sm"
                                >
                                    Supprimer
                                </button>
                            )}
                        </div>
                    </div>

                    <div className="flex justify-end gap-3 mt-6">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 text-slate-300 hover:text-white hover:bg-slate-700 rounded-lg transition-colors"
                        >
                            Annuler
                        </button>
                        <button
                            type="submit"
                            disabled={sending}
                            className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {sending ? (
                                <>
                                    <Loader className="w-4 h-4 animate-spin" />
                                    Envoi...
                                </>
                            ) : (
                                <>
                                    <Send className="w-4 h-4" />
                                    Envoyer
                                </>
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default ComposeEmailModal;
