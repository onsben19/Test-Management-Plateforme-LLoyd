import React, { useState, useEffect } from 'react';
import Header from '../../components/Header';
import Sidebar from '../../components/Sidebar';
import AdminTable from '../../components/AdminTable';
import { emailService } from '../../services/api';
import { useSidebar } from '../../context/SidebarContext';
import { Mail, Paperclip, Trash2, Eye } from 'lucide-react';
import { toast } from 'react-toastify';
import ConfirmModal from '../../components/ConfirmModal';

const AdminEmails = () => {
    const { isOpen } = useSidebar();
    const [emails, setEmails] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedEmail, setSelectedEmail] = useState<any | null>(null);
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
            toast.error("Erreur lors de la récupération des messages.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchEmails();
    }, []);

    const filteredEmails = emails.filter(email => {
        const query = searchQuery.toLowerCase();
        return (
            email.subject.toLowerCase().includes(query) ||
            email.body.toLowerCase().includes(query) ||
            (email.sender_name || '').toLowerCase().includes(query) ||
            (email.recipient_name || '').toLowerCase().includes(query)
        );
    });

    const handleDeleteEmail = async (email: any) => {
        setEmailToDelete(email);
        setIsDeleteModalOpen(true);
    };

    const confirmDeleteEmail = async () => {
        if (!emailToDelete) return;
        try {
            await emailService.deleteEmail(emailToDelete.id);
            setEmails(prev => prev.filter(e => e.id !== emailToDelete.id));
            if (selectedEmail?.id === emailToDelete.id) setSelectedEmail(null);
            toast.success("Message supprimé par l'administrateur");
        } catch {
            toast.error("Erreur lors de la suppression");
        } finally {
            setEmailToDelete(null);
        }
    };

    const columns = [
        { header: 'ID', accessor: 'id' },
        { header: 'Expéditeur', accessor: 'sender_name' },
        { header: 'Destinataire', accessor: 'recipient_name' },
        {
            header: 'Sujet',
            accessor: (item: any) => (
                <div className="flex items-center gap-2">
                    <span className="font-medium text-slate-900 dark:text-white">{item.subject}</span>
                    {item.attachment && <Paperclip className="w-3 h-3 text-slate-400" />}
                </div>
            )
        },
        {
            header: 'Date',
            accessor: (item: any) => new Date(item.created_at).toLocaleString('fr-FR')
        }
    ];

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-900 transition-colors flex flex-col">
            <Header />
            <div className="flex flex-1 relative">
                <Sidebar />
                <main className={`flex-1 p-8 transition-all duration-300 ${isOpen ? 'lg:ml-64' : 'lg:ml-16'}`}>
                    <div className="max-w-7xl mx-auto">
                        <div className="flex justify-between items-center mb-8">
                            <div>
                                <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">Administration des Messageries</h1>
                                <p className="text-slate-500 dark:text-slate-400">Supervision globale de toutes les communications internes</p>
                            </div>
                            <div className="flex items-center gap-2 bg-blue-500/10 text-blue-600 px-4 py-2 rounded-lg border border-blue-200 text-sm font-medium">
                                <Mail className="w-4 h-4" />
                                {emails.length} Emails Total
                            </div>
                        </div>

                        <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
                            <div className="xl:col-span-2">
                                <AdminTable
                                    title="Tous les Emails"
                                    columns={columns}
                                    data={filteredEmails}
                                    isLoading={loading}
                                    searchable
                                    onSearch={setSearchQuery}
                                    actions={(item) => (
                                        <div className="flex items-center gap-2">
                                            <button
                                                onClick={() => setSelectedEmail(item)}
                                                className="p-2 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-full text-slate-500 transition-colors"
                                                title="Voir le contenu"
                                            >
                                                <Eye className="w-4 h-4" />
                                            </button>
                                            <button
                                                onClick={() => handleDeleteEmail(item)}
                                                className="p-2 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-full text-slate-500 hover:text-red-600 transition-colors"
                                                title="Supprimer"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    )}
                                />
                            </div>

                            <div className="xl:col-span-1">
                                {selectedEmail ? (
                                    <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6 sticky top-24 shadow-sm">
                                        <div className="flex justify-between items-start mb-6">
                                            <h3 className="font-bold text-slate-900 dark:text-white">Détails du Message</h3>
                                            <button onClick={() => setSelectedEmail(null)} className="text-slate-400 hover:text-slate-600 text-xs uppercase font-bold tracking-wider">Fermer</button>
                                        </div>
                                        <div className="space-y-4">
                                            <div>
                                                <p className="text-xs text-slate-400 uppercase font-bold tracking-widest mb-1">Objet</p>
                                                <p className="text-sm text-slate-900 dark:text-white font-medium">{selectedEmail.subject}</p>
                                            </div>
                                            <div className="grid grid-cols-2 gap-4">
                                                <div>
                                                    <p className="text-xs text-slate-400 uppercase font-bold tracking-widest mb-1">De</p>
                                                    <p className="text-sm text-slate-900 dark:text-white">{selectedEmail.sender_name}</p>
                                                </div>
                                                <div>
                                                    <p className="text-xs text-slate-400 uppercase font-bold tracking-widest mb-1">À</p>
                                                    <p className="text-sm text-slate-900 dark:text-white">{selectedEmail.recipient_name}</p>
                                                </div>
                                            </div>
                                            <div>
                                                <p className="text-xs text-slate-400 uppercase font-bold tracking-widest mb-1">Contenu</p>
                                                <div className="text-sm text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-900/50 p-4 rounded-lg whitespace-pre-wrap border border-slate-100 dark:border-slate-700/50 italic leading-relaxed">
                                                    {selectedEmail.body}
                                                </div>
                                            </div>
                                            {selectedEmail.attachment && (
                                                <div>
                                                    <p className="text-xs text-slate-400 uppercase font-bold tracking-widest mb-1">Pièce Jointe</p>
                                                    <a href={selectedEmail.attachment} target="_blank" rel="noreferrer" className="text-sm text-blue-500 hover:underline flex items-center gap-1">
                                                        <Paperclip className="w-3 h-3" />
                                                        {selectedEmail.attachment.split('/').pop()}
                                                    </a>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                ) : (
                                    <div className="bg-slate-100 dark:bg-slate-800/30 rounded-xl border border-dashed border-slate-300 dark:border-slate-700 p-12 text-center sticky top-24">
                                        <Mail className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-4 opacity-50" />
                                        <p className="text-slate-500 dark:text-slate-400 text-sm">Sélectionnez un email pour en consulter le contenu complet de manière sécurisée.</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </main>
            </div>

            <ConfirmModal
                isOpen={isDeleteModalOpen}
                title="Supprimer le message"
                message={`Êtes-vous sûr de vouloir supprimer définitivement ce message (ID: ${emailToDelete?.id}) ? Cette action est irréversible.`}
                onConfirm={confirmDeleteEmail}
                onCancel={() => setIsDeleteModalOpen(false)}
                confirmText="Supprimer"
                type="danger"
            />
        </div>
    );
};

export default AdminEmails;
