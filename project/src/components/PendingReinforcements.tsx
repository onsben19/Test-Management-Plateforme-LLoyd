import React, { useEffect, useState } from 'react';
import { aiService } from '../services/api';
import { toast } from 'react-toastify';
import { ShieldCheck, XCircle, AlertCircle, Calendar } from 'lucide-react';
import Button from './ui/Button';

export const PendingReinforcements = () => {
    const [requests, setRequests] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchRequests = async () => {
        try {
            setLoading(true);
            const res = await aiService.getPendingReinforcements();
            setRequests(res.data);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchRequests();
    }, []);

    const handleAccept = async (campaignId: number, managerEmail: string) => {
        try {
            await aiService.acceptReinforcement(campaignId, managerEmail);
            toast.success("Demande de renfort acceptée !");
            fetchRequests();
        } catch (error) {
            toast.error("Erreur lors de l'acceptation.");
        }
    };

    const handleRefuse = async (campaignId: number, managerEmail: string) => {
        try {
            await aiService.refuseReinforcement(campaignId, managerEmail);
            toast.success("Demande de renfort refusée.");
            fetchRequests();
        } catch (error) {
            toast.error("Erreur lors du refus.");
        }
    };

    if (loading) return null;
    if (requests.length === 0) return null;

    return (
        <div className="bg-slate-50 dark:bg-white/[0.02] border border-blue-500/30 rounded-[2.5rem] p-8 mb-8 relative overflow-hidden group">
            <div className="absolute inset-0 bg-blue-500/5 backdrop-blur-xl -z-10" />
            <div className="flex items-center gap-4 mb-6">
                <div className="w-12 h-12 rounded-xl bg-blue-500/20 flex items-center justify-center text-blue-400">
                    <AlertCircle size={24} />
                </div>
                <div>
                    <h2 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tighter">Demandes de Renfort</h2>
                    <p className="text-sm text-slate-400 font-medium">Vos managers ont besoin de vous sur ces campagnes.</p>
                </div>
            </div>

            <div className="space-y-4">
                {requests.map((req) => (
                    <div key={req.campaign_id} className="bg-slate-100 dark:bg-white/5 border border-slate-300 dark:border-white/10 rounded-2xl p-6 flex flex-col md:flex-row items-center justify-between gap-6 transition-all hover:border-blue-500/30">
                        <div className="flex-1">
                            <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">{req.campaign_title}</h3>
                            <div className="flex items-center gap-2 text-xs font-bold text-slate-500 uppercase tracking-widest">
                                <Calendar size={14} />
                                <span>Demandé le {new Date(req.sent_at).toLocaleDateString()}</span>
                            </div>
                        </div>
                        <div className="flex gap-3">
                            <Button variant="secondary" onClick={() => handleRefuse(req.campaign_id, req.manager_email)} icon={XCircle} className="text-rose-400 hover:text-white hover:bg-rose-500/20">Refuser</Button>
                            <Button variant="primary" onClick={() => handleAccept(req.campaign_id, req.manager_email)} icon={ShieldCheck}>Accepter</Button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};
