import React, { useState, useRef } from 'react';
import PageLayout from '../components/PageLayout';
import { useAuth } from '../context/AuthContext';
import { motion } from 'framer-motion';
import { Phone, Lock, Camera, Mail, Loader2, User, ShieldCheck } from 'lucide-react';
import { toast } from 'react-toastify';
import { userService } from '../services/api';

const sectionVariants = {
    hidden: { opacity: 0, y: 15 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.4 } }
};

const Profile = () => {
    const { user } = useAuth();

    // Avatar preview (local only until save)
    const [avatarFile, setAvatarFile] = useState<File | null>(null);
    const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
    const [phone, setPhone] = useState(user?.phone_number || '');
    const [saving, setSaving] = useState(false);

    // Password reset
    const [resetting, setResetting] = useState(false);

    const fileInputRef = useRef<HTMLInputElement>(null);

    const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        if (!file.type.startsWith('image/')) {
            toast.error('Veuillez sélectionner une image valide');
            return;
        }
        setAvatarFile(file);
        const reader = new FileReader();
        reader.onloadend = () => setAvatarPreview(reader.result as string);
        reader.readAsDataURL(file);
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!avatarFile && phone === (user?.phone_number || '')) {
            toast.info('Aucune modification à sauvegarder');
            return;
        }
        setSaving(true);
        try {
            const formData = new FormData();
            formData.append('phone_number', phone);
            if (avatarFile) formData.append('avatar', avatarFile);

            await userService.updateProfile(formData);
            toast.success('Profil mis à jour avec succès');
            setAvatarFile(null);
        } catch (err: any) {
            toast.error(err?.response?.data?.detail || 'Erreur lors de la mise à jour');
        } finally {
            setSaving(false);
        }
    };

    const handleCancel = () => {
        setPhone(user?.phone_number || '');
        setAvatarFile(null);
        setAvatarPreview(null);
    };

    const handlePasswordReset = async () => {
        const identifier = user?.email || user?.username;
        if (!identifier) {
            toast.error('Impossible de trouver votre identifiant');
            return;
        }
        setResetting(true);
        try {
            await userService.requestPasswordReset(identifier);
            toast.success('Un nouveau mot de passe a été envoyé à votre adresse email');
        } catch {
            toast.error('Erreur lors de l\'envoi. Réessayez plus tard.');
        } finally {
            setResetting(false);
        }
    };

    // avatar_url is the full URL returned by the backend; avatar is the relative path
    const displayAvatar = avatarPreview
        || (user as any)?.avatar_url
        || (user?.avatar
            ? (user.avatar.startsWith('http') ? user.avatar : `/media/${user.avatar.replace(/^\/media\//, '')}`)
            : null);

    const fullName = [user?.first_name, user?.last_name].filter(Boolean).join(' ') || user?.username || '';

    const CustomHeader = (
        <div className="flex items-center gap-3">
            <h1 className="text-[22px] font-medium text-slate-900 dark:text-white tracking-tight">Mon Profil</h1>
            <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20">
                <div className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
                <span className="text-[11px] font-semibold text-blue-400 uppercase tracking-wider">Gestion du compte</span>
            </div>
        </div>
    );

    return (
        <PageLayout title={CustomHeader as any}>
            <div className="max-w-2xl space-y-8 pb-10">

                {/* ── Informations personnelles ───────────────────────────────── */}
                <motion.section variants={sectionVariants} initial="hidden" animate="visible"
                    className="bg-white dark:bg-[#111827] border border-slate-200 dark:border-white/[0.08] rounded-[16px] p-6 shadow-xl"
                >
                    <div className="flex items-center gap-4 mb-5">
                        <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-blue-500/10">
                            <User className="w-5 h-5 text-blue-400" />
                        </div>
                        <div>
                            <h3 className="text-[15px] font-semibold text-slate-900 dark:text-white">Informations personnelles</h3>
                            <p className="text-slate-400 text-[12px] mt-0.5">Photo et numéro de téléphone</p>
                        </div>
                    </div>
                    <div className="h-px bg-white/[0.06] mb-6" />

                    <form onSubmit={handleSave}>
                        {/* Avatar + identité */}
                        <div className="flex items-center gap-5 mb-8">
                            <input type="file" ref={fileInputRef} onChange={handlePhotoChange} accept="image/*" className="hidden" />
                            <div className="relative shrink-0">
                                <div className="w-[72px] h-[72px] rounded-full overflow-hidden border border-blue-500/30 bg-slate-800 flex items-center justify-center text-white font-bold text-2xl">
                                    {displayAvatar
                                        ? <img src={displayAvatar} alt="Avatar" className="w-full h-full object-cover" />
                                        : <span>{fullName.charAt(0).toUpperCase() || 'U'}</span>
                                    }
                                </div>
                                <button type="button" onClick={() => fileInputRef.current?.click()}
                                    className="absolute bottom-0 right-0 p-1.5 bg-slate-50 dark:bg-[#1a2235] rounded-full border border-slate-200 dark:border-white/10 text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors shadow-lg"
                                    title="Changer la photo"
                                >
                                    <Camera className="w-3.5 h-3.5" />
                                </button>
                            </div>
                            <div className="flex flex-col gap-1.5">
                                <span className="text-[14px] font-semibold text-slate-900 dark:text-white">{fullName}</span>
                                <span className="text-[12px] text-slate-400">{user?.email}</span>
                                <button type="button" onClick={() => fileInputRef.current?.click()}
                                    className="text-[11px] text-slate-300 hover:text-slate-900 dark:hover:text-white px-3 py-1.5 rounded-lg border border-slate-200 dark:border-white/10 hover:bg-slate-100 dark:hover:bg-white/5 transition-colors w-fit mt-0.5"
                                >
                                    Changer la photo
                                </button>
                            </div>
                        </div>

                        {/* Champs lecture seule */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-5">
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-bold text-slate-500 dark:text-white/30 uppercase tracking-widest ml-1">Prénom</label>
                                <div className="flex items-center gap-2.5 px-3.5 py-[11px] bg-white/[0.02] border border-white/[0.05] rounded-[10px]">
                                    <span className="text-[13px] text-slate-500 dark:text-white/40">{user?.first_name || '—'}</span>
                                </div>
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-bold text-slate-500 dark:text-white/30 uppercase tracking-widest ml-1">Nom</label>
                                <div className="flex items-center gap-2.5 px-3.5 py-[11px] bg-white/[0.02] border border-white/[0.05] rounded-[10px]">
                                    <span className="text-[13px] text-slate-500 dark:text-white/40">{user?.last_name || '—'}</span>
                                </div>
                            </div>
                            <div className="space-y-1.5 md:col-span-2">
                                <label className="text-[10px] font-bold text-slate-500 dark:text-white/30 uppercase tracking-widest ml-1">Email</label>
                                <div className="flex items-center gap-2.5 px-3.5 py-[11px] bg-white/[0.02] border border-white/[0.05] rounded-[10px]">
                                    <Mail className="w-4 h-4 text-slate-400 dark:text-white/20 shrink-0" />
                                    <span className="text-[13px] text-slate-500 dark:text-white/40">{user?.email || '—'}</span>
                                </div>
                            </div>
                        </div>

                        {/* Téléphone — éditable */}
                        <div className="space-y-1.5 mb-6">
                            <label className="text-[10px] font-bold text-slate-900 dark:text-white/50 uppercase tracking-widest ml-1">Téléphone</label>
                            <div className="relative">
                                <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                                <input
                                    type="tel"
                                    value={phone}
                                    onChange={e => setPhone(e.target.value)}
                                    className="w-full bg-slate-50 dark:bg-[#1a2235] border border-slate-200 dark:border-white/10 rounded-[10px] pl-10 pr-3.5 py-[11px] text-[13px] text-slate-900 dark:text-white outline-none focus:border-blue-500/50 transition-colors placeholder-slate-500"
                                    placeholder="+33 6 12 34 56 78"
                                />
                            </div>
                        </div>

                        <div className="h-px bg-white/[0.06] mb-4" />
                        <div className="flex justify-end gap-3">
                            <button type="button" onClick={handleCancel}
                                className="px-5 py-2 rounded-[10px] text-[13px] font-medium text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5 transition-colors border border-transparent"
                            >
                                Annuler
                            </button>
                            <button type="submit" disabled={saving}
                                className="flex items-center gap-2 px-5 py-2 rounded-[10px] text-[13px] font-semibold text-slate-900 dark:text-white bg-blue-600 hover:bg-blue-500 transition-colors shadow-lg shadow-blue-500/20 disabled:opacity-60"
                            >
                                {saving && <Loader2 size={14} className="animate-spin" />}
                                Sauvegarder
                            </button>
                        </div>
                    </form>
                </motion.section>

                {/* ── Sécurité ───────────────────────────────────────────────── */}
                <motion.section variants={sectionVariants} initial="hidden" animate="visible"
                    className="bg-white dark:bg-[#111827] border border-slate-200 dark:border-white/[0.08] rounded-[16px] p-6 shadow-xl"
                >
                    <div className="flex items-center gap-4 mb-5">
                        <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-rose-500/10">
                            <Lock className="w-5 h-5 text-rose-400" />
                        </div>
                        <div>
                            <h3 className="text-[15px] font-semibold text-slate-900 dark:text-white">Sécurité</h3>
                            <p className="text-slate-400 text-[12px] mt-0.5">Réinitialisation du mot de passe par email</p>
                        </div>
                    </div>
                    <div className="h-px bg-white/[0.06] mb-6" />

                    <div className="flex items-start gap-4 p-4 bg-white/[0.02] border border-slate-200 dark:border-white/[0.06] rounded-xl mb-6">
                        <ShieldCheck size={18} className="text-blue-400 shrink-0 mt-0.5" />
                        <div>
                            <p className="text-[13px] font-medium text-slate-900 dark:text-white/80">Réinitialiser le mot de passe</p>
                            <p className="text-[12px] text-slate-500 dark:text-white/40 mt-1 leading-relaxed">
                                Un nouveau mot de passe généré automatiquement sera envoyé à <span className="text-white/60 font-medium">{user?.email}</span>. Vous pourrez le modifier après connexion.
                            </p>
                        </div>
                    </div>

                    <div className="flex justify-end">
                        <button
                            onClick={handlePasswordReset}
                            disabled={resetting}
                            className="flex items-center gap-2 px-5 py-2.5 rounded-[10px] text-[13px] font-semibold transition-colors disabled:opacity-60 bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/20 hover:border-rose-500/30"
                        >
                            {resetting
                                ? <><Loader2 size={14} className="animate-spin" /> Envoi en cours...</>
                                : <><Mail size={14} /> Envoyer le nouveau mot de passe par email</>
                            }
                        </button>
                    </div>
                </motion.section>

            </div>
        </PageLayout>
    );
};

export default Profile;
