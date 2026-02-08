import React, { useEffect, useState } from 'react';
import Header from '../../components/Header';
import Sidebar from '../../components/Sidebar';
import AdminTable from '../../components/AdminTable';
import EditAnomalyModal from '../../components/EditAnomalyModal';
import { anomalyService } from '../../services/api';
import { toast } from 'react-toastify';
import { AlertTriangle, Trash2, Pencil } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';

const AdminAnomalies = () => {
    const [anomalies, setAnomalies] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [criticalityFilter, setCriticalityFilter] = useState('ALL');
    const [sortOrder, setSortOrder] = useState<'recent' | 'oldest'>('recent');
    const [deleteModal, setDeleteModal] = useState({ isOpen: false, anomalyId: null });
    const [editingAnomaly, setEditingAnomaly] = useState<any>(null);

    const fetchAnomalies = async () => {
        try {
            const response = await anomalyService.getAnomalies();
            // Sort by date descending (Newest first)
            const sortedData = response.data.sort((a: any, b: any) =>
                new Date(b.cree_le).getTime() - new Date(a.cree_le).getTime()
            );
            setAnomalies(sortedData);
        } catch (error) {
            console.error("Failed to fetch anomalies", error);
            toast.error("Erreur lors du chargement des anomalies");
        } finally {
            setLoading(false);
        }
    };

    const handleUpdate = async (id: string | null, updates: FormData) => {
        if (!id) return;
        try {
            await anomalyService.updateAnomaly(id, updates);
            toast.success("Anomalie mise à jour");
            setEditingAnomaly(null);
            fetchAnomalies();
        } catch (error) {
            console.error("Update failed", error);
            toast.error("Erreur lors de la mise à jour");
        }
    };

    useEffect(() => {
        fetchAnomalies();
    }, []);

    const location = useLocation();
    const queryParams = new URLSearchParams(location.search);
    const highlightId = queryParams.get('highlight');

    const filteredAnomalies = anomalies.filter(anomaly => {
        if (highlightId && anomaly.id.toString() === highlightId) return true;

        const matchesSearch = (anomaly.titre || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
            (anomaly.description || '').toLowerCase().includes(searchQuery.toLowerCase());
        const matchesCriticality = criticalityFilter === 'ALL' || anomaly.criticite === criticalityFilter;
        return matchesSearch && matchesCriticality;
    }).sort((a, b) => {
        const dateA = new Date(a.cree_le).getTime();
        const dateB = new Date(b.cree_le).getTime();
        return sortOrder === 'recent' ? dateB - dateA : dateA - dateB;
    });

    const handleDeleteClick = (id: any) => {
        setDeleteModal({ isOpen: true, anomalyId: id });
    };

    const confirmDelete = async () => {
        if (!deleteModal.anomalyId) return;

        try {
            await anomalyService.deleteAnomaly(deleteModal.anomalyId);
            toast.success("Anomalie supprimée");
            fetchAnomalies();
            setDeleteModal({ isOpen: false, anomalyId: null });
        } catch (error) {
            console.error(error);
            toast.error("Erreur lors de la suppression");
        }
    };

    const getCriticalityBadge = (level: string) => {
        switch (level) {
            case 'CRITIQUE': return <span className="px-2 py-1 rounded text-xs font-medium bg-red-500/10 text-red-500 border border-red-500/20">Critique</span>;
            case 'MOYENNE': return <span className="px-2 py-1 rounded text-xs font-medium bg-orange-500/10 text-orange-400 border border-orange-500/20">Moyenne</span>;
            default: return <span className="px-2 py-1 rounded text-xs font-medium bg-blue-500/10 text-blue-400 border border-blue-500/20">Faible</span>;
        }
    };
    const columns = [
        {
            header: 'Anomalie',
            accessor: (item: any) => (
                <div className="max-w-sm">
                    <div className="flex items-center gap-2 mb-1">
                        <div className="w-6 h-6 rounded bg-red-500/10 flex items-center justify-center text-red-500 shrink-0">
                            <AlertTriangle className="w-3 h-3" />
                        </div>
                        <span className="font-medium text-white line-clamp-1" title={item.titre}>{item.titre}</span>
                    </div>
                    <p className="text-xs text-slate-400 line-clamp-2" title={item.description}>{item.description}</p>
                </div>
            )
        },
        {
            header: 'Gravité',
            accessor: (item: any) => getCriticalityBadge(item.criticite)
        },
        {
            header: 'Statut',
            accessor: (item: any) => <span className="text-slate-300">Ouverte</span> // Matching Tester view default
        },
        {
            header: 'Test lié',
            accessor: (item: any) => (
                item.test_case_ref ? (
                    <Link
                        to={`/admin/executions?search=${encodeURIComponent(item.test_case_ref)}`}
                        className="text-blue-400 hover:underline cursor-pointer"
                    >
                        {item.test_case_ref}
                    </Link>
                ) : <span className="text-slate-500">-</span>
            )
        },
        {
            header: 'Release',
            accessor: (item: any) => item.project_name || '-'
        },
        {
            header: 'Campagne',
            accessor: (item: any) => item.campaign_title || '-'
        },
        {
            header: 'Créé par',
            accessor: (item: any) => item.cree_par_nom || 'Inconnu'
        },
        {
            header: 'Date',
            accessor: (item: any) => new Date(item.cree_le).toLocaleDateString('fr-FR')
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
                            title="Administration des Anomalies"
                            columns={columns}
                            data={anomalies}
                            isLoading={loading}
                            searchable
                            onSearch={setSearchQuery}
                            filters={
                                <div className="flex items-center gap-2">
                                    <select
                                        className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                                        value={criticalityFilter}
                                        onChange={(e) => setCriticalityFilter(e.target.value)}
                                    >
                                        <option value="ALL">Toutes criticités</option>
                                        <option value="FAIBLE">Faible</option>
                                        <option value="MOYENNE">Moyenne</option>
                                        <option value="CRITIQUE">Critique</option>
                                    </select>
                                    <select
                                        className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                                        value={sortOrder}
                                        onChange={(e) => setSortOrder(e.target.value as 'recent' | 'oldest')}
                                    >
                                        <option value="recent">Plus récent</option>
                                        <option value="oldest">Plus ancien</option>
                                    </select>
                                </div>
                            }
                            actions={(item) => (
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => {
                                            // Map backend format to component expectation
                                            const mapSeverity = (s: string) => {
                                                if (s === 'CRITIQUE') return 'Critique';
                                                if (s === 'URGENT' || s === 'HAUTE') return 'Haute'; // Adjust based on actual backend values
                                                if (s === 'MOYENNE') return 'Moyenne';
                                                return 'Faible';
                                            };
                                            setEditingAnomaly({
                                                ...item,
                                                id: item.id.toString(), // Ensure string
                                                title: item.titre,
                                                severity: mapSeverity(item.criticite),
                                                // status mapping might be needed if strictly typed in modal. 
                                                // Defaulting to 'Ouverte' if not matching or passing raw if Modal handles it loosely.
                                                status: 'Ouverte', // For now, backend might not send status in 'anomalies' list or different format
                                                relatedTest: item.test_case_ref
                                            });
                                        }}
                                        className="p-2 text-slate-400 hover:text-blue-400 hover:bg-blue-500/10 rounded-lg transition-colors"
                                        title="Modifier"
                                    >
                                        <Pencil className="w-4 h-4" />
                                    </button>
                                    <button
                                        onClick={() => handleDeleteClick(item.id)}
                                        className="p-2 text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                                        title="Supprimer"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            )}
                        />
                    </div>
                </main>
            </div >

            {/* Edit Modal */}
            {
                editingAnomaly && (
                    <EditAnomalyModal
                        anomaly={editingAnomaly}
                        onClose={() => setEditingAnomaly(null)}
                        onSave={handleUpdate}
                    />
                )
            }

            {/* Delete Confirmation Modal */}
            {
                deleteModal.isOpen && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/80 backdrop-blur-sm animate-in fade-in">
                        <div className="bg-slate-800 border border-slate-700 rounded-xl p-6 max-w-sm w-full shadow-2xl animate-in zoom-in-95 duration-200">
                            <div className="flex flex-col items-center text-center">
                                <div className="w-12 h-12 rounded-full bg-red-500/10 flex items-center justify-center mb-4">
                                    <Trash2 className="w-6 h-6 text-red-500" />
                                </div>
                                <h3 className="text-lg font-bold text-white mb-2">Supprimer l'anomalie</h3>
                                <p className="text-slate-400 mb-6">
                                    Êtes-vous sûr de vouloir supprimer cette anomalie ?
                                </p>
                                <div className="flex gap-3 w-full">
                                    <button
                                        onClick={() => setDeleteModal({ isOpen: false, anomalyId: null })}
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
                )
            }
        </div >
    );
};

export default AdminAnomalies;
