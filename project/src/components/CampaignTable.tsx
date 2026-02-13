import React, { useState, useEffect } from 'react';
import { Badge } from '@radix-ui/themes';
import { campaignService } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { Pencil, Trash2 } from 'lucide-react';
import EditCampaignModal from './EditCampaignModal';
import type { CampaignItem } from './EditCampaignModal';

interface Campaign {
  id: string;
  title: string;
  status: 'En cours' | 'Terminé' | 'En attente' | 'Échoué';
  priority: number;
  progress: number;
  created_at: string;
  description?: string;
  nb_test_cases?: number;
  project_name?: string;
  start_date?: string;
  estimated_end_date?: string;
}

const CampaignTable = () => {
  const { user } = useAuth();
  const isAdminOrManager = user?.role === 'admin' || user?.role === 'manager'; // Adjust roles as needed (e.g. 'Manager', 'Admin')

  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingCampaign, setEditingCampaign] = useState<CampaignItem | null>(null);

  useEffect(() => {
    fetchCampaigns();
  }, []);

  const fetchCampaigns = async () => {
    try {
      setLoading(true);
      const response = await campaignService.getCampaigns();
      // Map backend data to UI format if needed
      // Backend returns: id, project, title, created_at, description...
      // Status/Priority/Progress might be mock or computed on backend.
      // If backend doesn't send status/priority, use defaults/mocks for visual.
      const data = response.data.map((c: any) => ({
        id: c.id.toString(),
        title: c.title,
        status: c.is_processed ? 'Terminé' : 'En cours', // Simple logic for now
        priority: 50, // Mock
        progress: 0, // Mock logic or based on tasks
        created_at: c.created_at,
        description: c.description,
        nb_test_cases: c.nb_test_cases,
        project_name: c.project_name,
        start_date: c.start_date,
        estimated_end_date: c.estimated_end_date
      }));
      setCampaigns(data);
    } catch (error) {
      console.error("Failed to fetch campaigns", error);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateCampaign = async (id: string, updates: FormData) => {
    try {
      await campaignService.updateCampaign(id, updates);
      fetchCampaigns();
      setEditingCampaign(null);
    } catch (error) {
      console.error("Failed to update campaign", error);
      alert("Erreur lors de la mise à jour.");
    }
  };

  const handleDeleteCampaign = async (id: string) => {
    if (!window.confirm("Êtes-vous sûr de vouloir supprimer cette campagne ?")) return;
    try {
      await campaignService.deleteCampaign(id);
      setCampaigns(prev => prev.filter(c => c.id !== id));
    } catch (error) {
      console.error("Failed to delete campaign", error);
      alert("Erreur lors de la suppression.");
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'En cours': return 'blue';
      case 'Terminé': return 'green';
      case 'En attente': return 'yellow';
      case 'Échoué': return 'red';
      default: return 'gray';
    }
  };

  return (
    <div className="bg-white dark:bg-slate-800/50 backdrop-blur-sm border border-slate-200 dark:border-slate-700/50 rounded-xl overflow-hidden shadow-sm dark:shadow-none transition-colors">
      <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-700/50 flex justify-between items-center">
        <h3 className="text-lg font-semibold text-slate-900 dark:text-white transition-colors">Campagnes Récentes</h3>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-slate-50 dark:bg-slate-900/50 transition-colors">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider transition-colors">Campagne</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider transition-colors">Projet</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider transition-colors">Statut</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider transition-colors">Date</th>
              {isAdminOrManager && (
                <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider transition-colors">Actions</th>
              )}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 dark:divide-slate-700/50 transition-colors">
            {campaigns.map((campaign) => (
              <tr key={campaign.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm font-medium text-slate-900 dark:text-white transition-colors">{campaign.title}</div>
                  <div className="text-xs text-slate-500">{campaign.nb_test_cases} cas de test</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-slate-700 dark:text-slate-300">{campaign.project_name || '-'}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <Badge color={getStatusColor(campaign.status)} variant="soft">
                    {campaign.status}
                  </Badge>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500 dark:text-slate-400 transition-colors">
                  <div>{new Date(campaign.created_at).toLocaleDateString()}</div>
                  {campaign.start_date && campaign.estimated_end_date && (
                    <div className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                      {new Date(campaign.start_date).toLocaleDateString()} - {new Date(campaign.estimated_end_date).toLocaleDateString()}
                    </div>
                  )}
                </td>
                {isAdminOrManager && (
                  <td className="px-6 py-4 whitespace-nowrap text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => setEditingCampaign({
                          id: campaign.id,
                          title: campaign.title,
                          description: campaign.description,
                          status: campaign.status,
                          start_date: campaign.start_date,
                          estimated_end_date: campaign.estimated_end_date
                        })}
                        className="p-2 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-full text-slate-500 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                        title="Modifier"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteCampaign(campaign.id)}
                        className="p-2 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-full text-slate-500 dark:text-slate-400 hover:text-red-600 dark:hover:text-red-400 transition-colors"
                        title="Supprimer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                )}
              </tr>
            ))}
            {loading && (
              <tr><td colSpan={5} className="text-center py-4">Chargement...</td></tr>
            )}
            {!loading && campaigns.length === 0 && (
              <tr><td colSpan={5} className="text-center py-4">Aucune campagne trouvée.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {editingCampaign && (
        <EditCampaignModal
          campaign={editingCampaign}
          onClose={() => setEditingCampaign(null)}
          onSave={handleUpdateCampaign}
        />
      )}
    </div>
  );
};

export default CampaignTable;