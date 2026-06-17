import React, { useState } from 'react';
import { X, Save, Check } from 'lucide-react';

export interface ReleaseItem {
    id: string;
    title: string;
    version: string;
    status: 'ACTIVE' | 'COMPLETED';
    date: string;
}

interface EditReleaseModalProps {
    release: ReleaseItem;
    onClose: () => void;
    onSave: (id: string, updates: FormData) => Promise<void>;
}

const EditReleaseModal: React.FC<EditReleaseModalProps> = ({ release, onClose, onSave }) => {
    const [title, setTitle] = useState(release.title);
    const [version, setVersion] = useState(release.version);
    const [status, setStatus] = useState<ReleaseItem['status']>(release.status);
    const [date, setDate] = useState(release.date);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (isSubmitting) return;
        setIsSubmitting(true);
        try {
            const formData = new FormData();
            formData.append('title', title);
            formData.append('version', version);
            formData.append('status', status);
            formData.append('date', date);
            await onSave(release.id, formData);
            onClose();
        } catch (error) {
            console.error('Failed to update release', error);
        } finally {
            setIsSubmitting(false);
        }
    };

    const STATUS_OPTIONS: { value: ReleaseItem['status']; label: string }[] = [
        { value: 'ACTIVE', label: 'Actif' },
        { value: 'COMPLETED', label: 'Terminé' },
    ];

    return (
        <div className="fixed inset-0 z-[200000] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
            <div className="bg-[#0d1117] border border-white/[0.08] rounded-[20px] w-full max-w-md shadow-[0_32px_80px_rgba(0,0,0,0.6)] overflow-hidden flex flex-col">

                {/* Header */}
                <div className="px-6 pt-6 pb-5 flex items-center justify-between border-b border-white/[0.06]">
                    <div>
                        <div className="flex items-center gap-2 mb-1">
                            <div className="w-1.5 h-5 rounded-full bg-[#EF9F27]" />
                            <h2 className="text-[17px] font-semibold text-white">Modifier la release</h2>
                        </div>
                        <p className="text-[11px] text-white/30 ml-4">{release.title}</p>
                    </div>
                    <button
                        onClick={onClose}
                        className="w-8 h-8 flex items-center justify-center rounded-full bg-white/[0.05] hover:bg-white/10 text-white/40 hover:text-white transition-all border border-white/[0.06]"
                    >
                        <X size={15} />
                    </button>
                </div>

                {/* Body */}
                <form onSubmit={handleSubmit} className="p-6 space-y-4">

                    {/* Nom */}
                    <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-white/30 uppercase tracking-[0.15em]">Nom de la release</label>
                        <input
                            type="text"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            className="w-full bg-[#1a2235] border border-white/[0.08] rounded-[10px] px-4 py-2.5 text-[13px] text-white placeholder:text-white/20 focus:border-[#378ADD]/50 focus:ring-0 outline-none transition-colors"
                            placeholder="Ex : Release Q1 2025"
                            required
                        />
                    </div>

                    {/* Version + Date */}
                    <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-bold text-white/30 uppercase tracking-[0.15em]">Version</label>
                            <input
                                type="text"
                                value={version}
                                onChange={(e) => setVersion(e.target.value)}
                                className="w-full bg-[#1a2235] border border-white/[0.08] rounded-[10px] px-4 py-2.5 text-[13px] text-white placeholder:text-white/20 focus:border-[#378ADD]/50 focus:ring-0 outline-none transition-colors"
                                placeholder="v1.0.0"
                            />
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-bold text-white/30 uppercase tracking-[0.15em]">Date d'échéance</label>
                            <input
                                type="date"
                                value={date}
                                onChange={(e) => setDate(e.target.value)}
                                className="w-full bg-[#1a2235] border border-white/[0.08] rounded-[10px] px-3 py-2.5 text-[13px] text-white focus:border-[#378ADD]/50 focus:ring-0 outline-none transition-colors"
                            />
                        </div>
                    </div>

                    {/* Statut — pill selector */}
                    <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-white/30 uppercase tracking-[0.15em]">Statut</label>
                        <div className="flex gap-2">
                            {STATUS_OPTIONS.map(opt => {
                                const isActive = status === opt.value;
                                const color = opt.value === 'ACTIVE'
                                    ? { bg: 'bg-[#378ADD]/15', border: 'border-[#378ADD]/40', text: 'text-[#85B7EB]' }
                                    : { bg: 'bg-[#1D9E75]/15', border: 'border-[#1D9E75]/40', text: 'text-[#5DCAA5]' };
                                return (
                                    <button
                                        key={opt.value}
                                        type="button"
                                        onClick={() => setStatus(opt.value)}
                                        className={`flex-1 py-2 rounded-[8px] text-[12px] font-semibold border transition-all flex items-center justify-center gap-1.5 ${isActive ? `${color.bg} ${color.border} ${color.text}` : 'bg-[#1a2235] border-white/[0.06] text-white/30 hover:border-white/20'}`}
                                    >
                                        {isActive && <Check size={11} />}
                                        {opt.label}
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                </form>

                {/* Footer */}
                <div className="px-6 py-4 border-t border-white/[0.06] flex items-center gap-3">
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-5 py-2.5 text-[12px] font-medium text-white/40 hover:text-white transition-colors rounded-[8px] hover:bg-white/[0.05]"
                    >
                        Annuler
                    </button>
                    <button
                        onClick={handleSubmit}
                        disabled={isSubmitting || !title}
                        className="flex-1 py-2.5 bg-[#378ADD] hover:bg-[#2e75bc] disabled:opacity-40 text-white rounded-[10px] text-[13px] font-semibold transition-all flex items-center justify-center gap-2 active:scale-[0.98]"
                    >
                        <Save size={14} />
                        {isSubmitting ? 'Enregistrement…' : 'Enregistrer'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default EditReleaseModal;
