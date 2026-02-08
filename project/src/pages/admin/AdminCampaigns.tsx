import React, { useEffect, useState } from 'react';
import Header from '../../components/Header';
import Sidebar from '../../components/Sidebar';
import AdminTable from '../../components/AdminTable';
import { campaignService } from '../../services/api';
import { toast } from 'react-toastify';
import { Trash2, BookOpen } from 'lucide-react';

const AdminCampaigns = () => {
    const [campaigns, setCampaigns] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [sortOrder, setSortOrder] = useState<'newest' | 'oldest'>('newest');
    const [deleteModal, setDeleteModal] = useState({ isOpen: false, campaignId: null });

    const fetchCampaigns = async () => {
        try {
            const response = await campaignService.getCampaigns();
            setCampaigns(response.data);
        } catch (error) {
            console.error("Failed to fetch campaigns", error);
            toast.error("Erreur lors du chargement des campagnes");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchCampaigns();
    }, []);

    const filteredCampaigns = campaigns.filter(campaign =>
        campaign.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (campaign.description && campaign.description.toLowerCase().includes(searchQuery.toLowerCase()))
    ).sort((a, b) => {
        const dateA = new Date(a.created_at || 0).getTime();
        const dateB = new Date(b.created_at || 0).getTime();
        return sortOrder === 'newest' ? dateB - dateA : dateA - dateB;
    });

    const handleDeleteClick = (id: any) => {
        setDeleteModal({ isOpen: true, campaignId: id });
    };

    const confirmDelete = async () => {
        if (!deleteModal.campaignId) return;

        try {
            await campaignService.deleteCampaign(deleteModal.campaignId);
            toast.success("Campagne supprimée");
            fetchCampaigns();
            setDeleteModal({ isOpen: false, campaignId: null });
        } catch (error) {
            toast.error("Erreur lors de la suppression");
        }
    };

    const columns = [
        {
            header: 'Titre',
            accessor: (item: any) => (
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded bg-purple-500/10 flex items-center justify-center text-purple-400">
                        <BookOpen className="w-4 h-4" />
                    </div>
                    <span className="font-medium text-white">{item.title}</span>
                </div>
            )
        },
        {
            header: 'Description',
            accessor: (item: any) => (
                <span className="truncate max-w-xs block text-slate-400" title={item.description}>
                    {item.description || '-'}
                </span>
            )
        },
        {
            header: 'Projet',
            accessor: (item: any) => item.project_name || 'N/A'
        },
        {
            header: 'Date de création',
            accessor: (item: any) => new Date(item.created_at).toLocaleDateString('fr-FR')
        }
    ];

    return (
        <div className="min-h-screen bg-slate-900">
            <Header />
            <div className="flex">
                <Sidebar />
                <main className="flex-1 lg:ml-64 relative p-8">
                    <div className="max-w-7xl mx-auto">
                        <AdminTable
                            title="Administration des Campagnes"
                            columns={columns}
                            data={filteredCampaigns}
                            isLoading={loading}
                            searchable
                            onSearch={setSearchQuery}
                            filters={
                                <select
                                    className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                                    value={sortOrder}
                                    onChange={(e) => setSortOrder(e.target.value as 'newest' | 'oldest')}
                                >
                                    <option value="newest">Plus récents</option>
                                    <option value="oldest">Plus anciens</option>
                                </select>
                            }
                            actions={(item) => (
                                <button
                                    onClick={() => handleDeleteClick(item.id)}
                                    className="p-2 text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                                    title="Supprimer"
                                >
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            )}
                        />
                    </div>
                </main>
            </div>

            {/* Delete Confirmation Modal */}
            {deleteModal.isOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/80 backdrop-blur-sm animate-in fade-in">
                    <div className="bg-slate-800 border border-slate-700 rounded-xl p-6 max-w-sm w-full shadow-2xl animate-in zoom-in-95 duration-200">
                        <div className="flex flex-col items-center text-center">
                            <div className="w-12 h-12 rounded-full bg-red-500/10 flex items-center justify-center mb-4">
                                <Trash2 className="w-6 h-6 text-red-500" />
                            </div>
                            <h3 className="text-lg font-bold text-white mb-2">Supprimer la campagne</h3>
                            <p className="text-slate-400 mb-6">
                                Êtes-vous sûr de vouloir supprimer cette campagne ?
                            </p>
                            <div className="flex gap-3 w-full">
                                <button
                                    onClick={() => setDeleteModal({ isOpen: false, campaignId: null })}
                                    className="flex-1 px-4 py-2 text-slate-300 hover:text-white hover:bg-slate-700 rounded-lg transition-colors"
                                >
                                    Annuler
                                </button>
                                <button
                                    onClick={confirmDelete}
                                    className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-colors"
                                >
                                    Supprimer
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdminCampaigns;
