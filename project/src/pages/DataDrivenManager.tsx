import React, { useState, useMemo, useEffect } from 'react';
import { toast } from 'react-toastify';
import Header from '../components/Header';
import Sidebar from '../components/Sidebar';
import { useLocation } from 'react-router-dom';
import { Upload, FileSpreadsheet, Calendar, Eye, Trash2, Edit, Search, Filter, Layers, Users, X, CheckCircle } from 'lucide-react';

import { campaignService, userService } from '../services/api';

interface ImportedFile {
    id: string;
    name: string;
    description: string;
    date: string;
    size: string;
    rowCount: number;
    data: any[];
    excel_file?: string;
    assigned_testers_names?: string[];
    assigned_testers?: number[]; // IDs for editing
    project_id?: string; // To track release ownership
    start_date?: string;
    estimated_end_date?: string;
}

interface User {
    id: number;
    username: string;
    email: string;
    role: string;
}

const DataDrivenManager = () => {
    const location = useLocation();
    const activeReleaseName = location.state?.releaseName;
    const activeReleaseId = location.state?.releaseId;

    const [importedFiles, setImportedFiles] = useState<ImportedFile[]>([]);
    const [loading, setLoading] = useState(true);

    // Filter States
    const [searchQuery, setSearchQuery] = useState('');
    const [testerFilter, setTesterFilter] = useState('');

    // Delete Modal State
    const [deleteModal, setDeleteModal] = useState<{ isOpen: boolean; fileId: string | null }>({
        isOpen: false,
        fileId: null
    });

    // Create/Edit Campaign Modal State
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingCampaign, setEditingCampaign] = useState<ImportedFile | null>(null);
    const [testers, setTesters] = useState<User[]>([]);

    // Form State
    const [campaignForm, setCampaignForm] = useState({
        title: '',
        description: '',
        nb_test_cases: 0,
        file: null as File | null,
        assigned_testers: [] as number[],
        start_date: '',
        estimated_end_date: ''
    });

    // Fetch Campaigns & Testers
    useEffect(() => {
        if (activeReleaseId) {
            fetchCampaigns();
            fetchTesters();
        } else {
            setLoading(false);
        }
    }, [activeReleaseId]);

    const fetchCampaigns = async () => {
        if (!activeReleaseId) return;
        try {
            setLoading(true);
            const response = await campaignService.getCampaigns({ project: activeReleaseId });
            const mappedCampaigns = response.data.map((camp: any) => ({
                id: camp.id.toString(),
                name: camp.title,
                description: camp.description || '',
                date: new Date(camp.created_at).toLocaleDateString('fr-FR'),
                size: 'N/A',
                rowCount: camp.nb_test_cases || 0,
                data: [],
                excel_file: camp.excel_file,
                assigned_testers_names: camp.assigned_testers_names || [],
                assigned_testers: camp.assigned_testers || [],
                project_id: camp.project,
                start_date: camp.start_date,
                estimated_end_date: camp.estimated_end_date
            }));
            setImportedFiles(mappedCampaigns);
        } catch (error) {
            console.error("Failed to fetch campaigns", error);
            toast.error("Erreur de chargement des campagnes");
        } finally {
            setLoading(false);
        }
    };

    const fetchTesters = async () => {
        try {
            const response = await userService.getUsers({ role: 'TESTER' });
            setTesters(response.data);
        } catch (error) {
            console.error("Failed to fetch testers", error);
        }
    };

    // Filter Logic
    const filteredFiles = useMemo(() => {
        return importedFiles.filter(f => {
            const matchesSearch = f.name.toLowerCase().includes(searchQuery.toLowerCase());
            const matchesTester = testerFilter ? f.assigned_testers_names?.some(t => t.toLowerCase().includes(testerFilter.toLowerCase())) : true;
            return matchesSearch && matchesTester;
        });
    }, [importedFiles, searchQuery, testerFilter]);

    // Modal Handlers
    const openCreateModal = () => {
        setEditingCampaign(null);
        setCampaignForm({
            title: '',
            description: '',
            nb_test_cases: 0,
            file: null,
            assigned_testers: [],
            start_date: '',
            estimated_end_date: ''
        });
        setIsModalOpen(true);
    };

    const openEditModal = (campaign: ImportedFile, e: React.MouseEvent) => {
        e.stopPropagation();
        setEditingCampaign(campaign);
        setCampaignForm({
            title: campaign.name,
            description: campaign.description,
            nb_test_cases: campaign.rowCount,
            file: null, // Don't require file upload on edit
            assigned_testers: campaign.assigned_testers || [],
            start_date: campaign.start_date || '',
            estimated_end_date: campaign.estimated_end_date || ''
        });
        setIsModalOpen(true);
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setCampaignForm({ ...campaignForm, file, title: campaignForm.title || file.name });
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!activeReleaseId) return;

        // Validation for Create
        if (!editingCampaign && !campaignForm.file) {
            toast.error("Veuillez sélectionner un fichier.");
            return;
        }

        const formData = new FormData();
        formData.append('title', campaignForm.title);
        formData.append('description', campaignForm.description);
        formData.append('project', activeReleaseId);
        formData.append('nb_test_cases', campaignForm.nb_test_cases.toString());
        if (campaignForm.start_date) formData.append('start_date', campaignForm.start_date);
        if (campaignForm.estimated_end_date) formData.append('estimated_end_date', campaignForm.estimated_end_date);

        if (campaignForm.file) {
            formData.append('excel_file', campaignForm.file);
        }

        campaignForm.assigned_testers.forEach(id => {
            formData.append('assigned_testers', id.toString());
        });

        try {
            if (editingCampaign) {
                await campaignService.updateCampaign(editingCampaign.id, formData);
                toast.success("Campagne modifiée avec succès");
            } else {
                await campaignService.createCampaign(formData);
                toast.success("Campagne créée avec succès");
            }
            setIsModalOpen(false);
            fetchCampaigns();
        } catch (error) {
            console.error('Save error:', error);
            toast.error("Erreur lors de l'enregistrement de la campagne.");
        }
    };

    const handleDeleteFile = (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        setDeleteModal({ isOpen: true, fileId: id });
    };

    const confirmDelete = async () => {
        if (!deleteModal.fileId) return;
        try {
            await campaignService.deleteCampaign(deleteModal.fileId);
            toast.success("Campagne supprimée");
            fetchCampaigns();
        } catch (error) {
            toast.error("Erreur suppression");
        } finally {
            setDeleteModal({ isOpen: false, fileId: null });
        }
    };

    const handleOpenPreview = (file: ImportedFile) => {
        if (file.excel_file) {
            window.open(file.excel_file, '_blank');
        } else {
            toast.warning("Fichier introuvable");
        }
    };

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-900 transition-colors duration-300">
            <Header />
            <div className="flex">
                <Sidebar />
                <main className="flex-1 lg:ml-64 relative p-8">
                    <div className="max-w-7xl mx-auto">

                        {/* Header & Filters */}
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
                            <div>
                                <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-2 tracking-tight transition-colors">
                                    <span className="text-gradient">Campagnes de Tests</span>
                                </h1>
                                <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400">
                                    <Layers className="w-4 h-4" />
                                    <span>Release: <span className="font-semibold text-slate-900 dark:text-white">{activeReleaseName || 'Non spécifiée'}</span></span>
                                </div>
                            </div>

                            <div className="flex items-center gap-3">
                                <button
                                    onClick={openCreateModal}
                                    className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-all shadow-lg shadow-blue-500/20 dark:shadow-blue-900/20 hover:scale-105"
                                >
                                    <Upload className="w-4 h-4" />
                                    Nouvelle Campagne
                                </button>
                            </div>
                        </div>

                        {/* Search and Filters Bar */}
                        <div className="bg-white dark:bg-slate-800 rounded-xl p-4 mb-8 border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col md:flex-row gap-4 items-center">
                            <div className="relative flex-1 w-full">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                <input
                                    type="text"
                                    placeholder="Rechercher une campagne..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg pl-10 pr-4 py-2 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors placeholder:text-slate-400"
                                />
                            </div>
                            <div className="relative w-full md:w-64">
                                <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                <input
                                    type="text"
                                    placeholder="Filtrer par testeur..."
                                    value={testerFilter}
                                    onChange={(e) => setTesterFilter(e.target.value)}
                                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg pl-10 pr-4 py-2 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors placeholder:text-slate-400"
                                />
                            </div>
                        </div>

                        {/* Campaign Grid */}
                        {loading ? (
                            <div className="text-center py-20 text-slate-500 dark:text-slate-400">Chargement...</div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {filteredFiles.map((file, index) => (
                                    <div
                                        key={file.id}
                                        style={{ animationDelay: `${index * 100}ms` }}
                                        className="group bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-5 relative overflow-hidden animate-slide-up hover:shadow-lg dark:hover:shadow-xl transition-all hover:border-blue-500/30 dark:hover:border-blue-500/30"
                                    >
                                        <div className="absolute top-0 right-0 p-4 opacity-0 group-hover:opacity-100 transition-opacity flex gap-2">
                                            <button
                                                onClick={(e) => openEditModal(file, e)}
                                                className="p-2 text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-500/10 rounded-lg transition-colors"
                                                title="Modifier"
                                            >
                                                <Edit className="w-4 h-4" />
                                            </button>
                                            <button
                                                onClick={(e) => handleDeleteFile(file.id, e)}
                                                className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg transition-colors"
                                                title="Supprimer"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>

                                        <div className="flex items-start gap-4 mb-4">
                                            <div className="w-12 h-12 rounded-lg bg-emerald-50 dark:bg-emerald-500/10 flex items-center justify-center border border-emerald-200 dark:border-emerald-500/20 shrink-0">
                                                <FileSpreadsheet className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
                                            </div>
                                            <div className="flex-1 min-w-0 pr-16">
                                                <h3 className="text-lg font-bold text-slate-900 dark:text-white truncate mb-1 transition-colors">{file.name}</h3>
                                                <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400">
                                                    <span className="flex items-center gap-1 bg-slate-100 dark:bg-slate-700/50 px-2 py-0.5 rounded-full">
                                                        <Calendar className="w-3 h-3" />
                                                        {file.date}
                                                    </span>
                                                    {file.start_date && file.estimated_end_date && (
                                                        <span className="flex items-center gap-1 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 px-2 py-0.5 rounded-full text-[10px]">
                                                            {new Date(file.start_date).toLocaleDateString()} - {new Date(file.estimated_end_date).toLocaleDateString()}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>

                                        {file.description && (
                                            <p className="text-slate-600 dark:text-slate-400 text-sm mb-4 line-clamp-2 h-10 leading-relaxed transition-colors">
                                                {file.description}
                                            </p>
                                        )}

                                        <div className="border-t border-slate-100 dark:border-slate-700/50 pt-4 mt-auto">
                                            <div className="flex items-center justify-between mb-4">
                                                <div className="flex -space-x-2">
                                                    {file.assigned_testers_names && file.assigned_testers_names.length > 0 ? (
                                                        <>
                                                            {file.assigned_testers_names.slice(0, 3).map((name, i) => (
                                                                <div key={i} className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-600 border-2 border-white dark:border-slate-800 flex items-center justify-center text-xs font-bold text-blue-800 dark:text-white" title={name}>
                                                                    {name.charAt(0).toUpperCase()}
                                                                </div>
                                                            ))}
                                                            {file.assigned_testers_names.length > 3 && (
                                                                <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-700 border-2 border-white dark:border-slate-800 flex items-center justify-center text-xs font-bold text-slate-600 dark:text-slate-300">
                                                                    +{file.assigned_testers_names.length - 3}
                                                                </div>
                                                            )}
                                                        </>
                                                    ) : (
                                                        <span className="text-xs text-slate-400 italic">Aucun testeur</span>
                                                    )}
                                                </div>
                                                <div className="text-right">
                                                    <span className="text-lg font-bold text-slate-900 dark:text-white">{file.rowCount}</span>
                                                    <span className="text-xs text-slate-500 dark:text-slate-400 ml-1">Cas</span>
                                                </div>
                                            </div>

                                            <button
                                                onClick={() => handleOpenPreview(file)}
                                                className="w-full py-2 rounded-lg bg-slate-50 dark:bg-slate-700/30 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 text-sm font-medium transition-colors flex items-center justify-center gap-2 group-hover:bg-blue-50 dark:group-hover:bg-blue-900/10 group-hover:text-blue-600 dark:group-hover:text-blue-400 border border-slate-200 dark:border-slate-700 group-hover:border-blue-200 dark:group-hover:border-blue-800/50"
                                            >
                                                <Eye className="w-4 h-4" />
                                                Voir le Cahier de Tests
                                            </button>
                                        </div>
                                    </div>
                                ))}
                                {filteredFiles.length === 0 && (
                                    <div className="col-span-full py-12 text-center text-slate-400 bg-slate-50 dark:bg-slate-800/30 rounded-xl border border-dashed border-slate-300 dark:border-slate-700">
                                        <p>Aucune campagne trouvée pour cette recherche.</p>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </main>

                {/* Create/Edit Campaign Modal */}
                {isModalOpen && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 dark:bg-slate-900/80 backdrop-blur-sm p-4 animate-in fade-in transition-colors">
                        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl w-full max-w-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 transition-colors">
                            <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center bg-slate-50 dark:bg-slate-800/50">
                                <h2 className="text-xl font-bold text-slate-900 dark:text-white transition-colors">
                                    {editingCampaign ? 'Modifier la Campagne' : 'Ajouter une Campagne'}
                                </h2>
                                <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors">
                                    <X className="w-6 h-6" />
                                </button>
                            </div>

                            <form onSubmit={handleSubmit} className="p-6 space-y-6">
                                {/* Title & Cases Row */}
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                    <div className="md:col-span-2">
                                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2 transition-colors">Titre du Cahier de Test</label>
                                        <input
                                            type="text"
                                            value={campaignForm.title}
                                            onChange={(e) => setCampaignForm({ ...campaignForm, title: e.target.value })}
                                            className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-4 py-2.5 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                                            placeholder="Ex: Campagne Release 1.2"
                                            required
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2 transition-colors">Nb. Cas de Test</label>
                                        <input
                                            type="number"
                                            value={campaignForm.nb_test_cases}
                                            onChange={(e) => setCampaignForm({ ...campaignForm, nb_test_cases: parseInt(e.target.value) || 0 })}
                                            className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-4 py-2.5 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                                            min="0"
                                        />
                                    </div>
                                </div>

                                {/* Date Fields */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2 transition-colors">Date de Début</label>
                                        <input
                                            type="date"
                                            value={campaignForm.start_date}
                                            onChange={(e) => setCampaignForm({ ...campaignForm, start_date: e.target.value })}
                                            className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-4 py-2.5 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2 transition-colors">Date de Fin Estimée</label>
                                        <input
                                            type="date"
                                            value={campaignForm.estimated_end_date}
                                            onChange={(e) => setCampaignForm({ ...campaignForm, estimated_end_date: e.target.value })}
                                            className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-4 py-2.5 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                                        />
                                    </div>
                                </div>

                                {/* Description */}
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2 transition-colors">Description</label>
                                    <textarea
                                        value={campaignForm.description}
                                        onChange={(e) => setCampaignForm({ ...campaignForm, description: e.target.value })}
                                        className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-4 py-3 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none min-h-[100px] resize-none transition-all"
                                        placeholder="Description optionnelle..."
                                    />
                                </div>

                                {/* File Upload (Optional on Edit) */}
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2 transition-colors">
                                        Fichier Excel (.xlsx) {editingCampaign && <span className="text-xs text-slate-500 font-normal">(Laisser vide pour conserver l'actuel)</span>}
                                    </label>
                                    <div className={`border-2 border-dashed rounded-lg p-8 flex flex-col items-center justify-center text-slate-500 dark:text-slate-400 hover:border-blue-500 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-all cursor-pointer relative ${campaignForm.file ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/10' : 'border-slate-300 dark:border-slate-700'}`}>
                                        <input
                                            type="file"
                                            onChange={handleFileChange}
                                            accept=".xlsx, .xls"
                                            className="absolute inset-0 opacity-0 cursor-pointer"
                                            required={!editingCampaign}
                                        />
                                        <Upload className={`w-8 h-8 mb-3 ${campaignForm.file ? 'text-blue-500' : 'text-slate-400'}`} />
                                        {campaignForm.file ? (
                                            <span className="text-blue-600 dark:text-blue-400 font-medium">{campaignForm.file.name}</span>
                                        ) : (
                                            <span>{editingCampaign ? "Cliquez pour remplacer le fichier" : "Cliquez pour importer un fichier"}</span>
                                        )}
                                    </div>
                                </div>

                                {/* Tester Selection */}
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2 transition-colors">Assigner des Testeurs</label>
                                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3 bg-slate-50 dark:bg-slate-900 p-4 rounded-lg border border-slate-200 dark:border-slate-700 max-h-48 overflow-y-auto transition-all custom-scrollbar">
                                        {testers.map(tester => (
                                            <label key={tester.id} className={`flex items-center gap-2 p-2 rounded cursor-pointer transition-colors ${campaignForm.assigned_testers.includes(tester.id) ? 'bg-blue-100 dark:bg-blue-900/30' : 'hover:bg-slate-200 dark:hover:bg-slate-800'}`}>
                                                <input
                                                    type="checkbox"
                                                    checked={campaignForm.assigned_testers.includes(tester.id)}
                                                    onChange={(e) => {
                                                        const id = tester.id;
                                                        if (e.target.checked) {
                                                            setCampaignForm({ ...campaignForm, assigned_testers: [...campaignForm.assigned_testers, id] });
                                                        } else {
                                                            setCampaignForm({ ...campaignForm, assigned_testers: campaignForm.assigned_testers.filter(tid => tid !== id) });
                                                        }
                                                    }}
                                                    className="rounded border-slate-300 dark:border-slate-600 text-blue-600 focus:ring-blue-500 bg-white dark:bg-slate-800"
                                                />
                                                <div className="flex items-center gap-2">
                                                    <div className="w-6 h-6 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-xs font-medium text-slate-600 dark:text-slate-300">
                                                        {tester.username.charAt(0).toUpperCase()}
                                                    </div>
                                                    <span className="text-sm text-slate-700 dark:text-slate-300 truncate">{tester.username}</span>
                                                </div>
                                            </label>
                                        ))}
                                        {testers.length === 0 && (
                                            <p className="text-xs text-slate-500 col-span-3 text-center py-4">Aucun testeur trouvé.</p>
                                        )}
                                    </div>
                                </div>

                                <div className="flex justify-end gap-3 pt-6 border-t border-slate-200 dark:border-slate-700">
                                    <button
                                        type="button"
                                        onClick={() => setIsModalOpen(false)}
                                        className="px-6 py-2.5 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors font-medium"
                                    >
                                        Annuler
                                    </button>
                                    <button
                                        type="submit"
                                        className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-all shadow-lg shadow-blue-500/20 dark:shadow-blue-900/20 hover:scale-105 active:scale-95 flex items-center gap-2"
                                    >
                                        <CheckCircle className="w-4 h-4" />
                                        {editingCampaign ? 'Enregistrer les modifications' : 'Créer la Campagne'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}


                {/* Delete Modal */}
                {deleteModal.isOpen && (
                    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-900/60 dark:bg-slate-900/80 backdrop-blur-sm animate-in fade-in transition-colors">
                        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-6 max-w-sm w-full shadow-2xl animate-in zoom-in-95 duration-200 transition-colors">
                            <div className="flex flex-col items-center text-center">
                                <div className="w-12 h-12 rounded-full bg-red-100 dark:bg-red-500/10 flex items-center justify-center mb-4 transition-colors">
                                    <Trash2 className="w-6 h-6 text-red-600 dark:text-red-500 transition-colors" />
                                </div>
                                <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2 transition-colors">Supprimer la campagne ?</h3>
                                <p className="text-slate-500 dark:text-slate-400 text-sm mb-6 transition-colors">Cette action est irréversible et supprimera tous les cas de tests associés.</p>
                                <div className="flex gap-3 w-full">
                                    <button
                                        onClick={() => setDeleteModal({ isOpen: false, fileId: null })}
                                        className="flex-1 px-4 py-2 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors font-medium"
                                    >
                                        Annuler
                                    </button>
                                    <button
                                        onClick={confirmDelete}
                                        className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-colors shadow-lg shadow-red-500/20"
                                    >
                                        Confirmer
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default DataDrivenManager;
