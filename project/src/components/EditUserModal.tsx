import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { Save, XCircle, Mail, Shield, Key, RefreshCw, Copy, Check, Eye, EyeOff, Send } from 'lucide-react';
import { toast } from 'react-toastify';
import { userService } from '../services/api';
import { generateSecurePassword } from '../utils/password';

export interface UserItem {
    id: string;
    username: string;
    email: string;
    first_name: string;
    last_name: string;
    role: string;
}

export interface UserUpdatePayload {
    first_name: string;
    last_name: string;
    email: string;
    role: string;
    password?: string;
}

interface EditUserModalProps {
    user: UserItem;
    onClose: () => void;
    onSave: (id: string, updates: UserUpdatePayload) => Promise<void>;
}

const mapRoleToBackend = (role: string): string => {
    const r = role.toUpperCase();
    if (r === 'ADMIN' || role === 'Admin') return 'ADMIN';
    if (r === 'MANAGER' || role === 'Manager') return 'MANAGER';
    return 'TESTER';
};

const EditUserModal: React.FC<EditUserModalProps> = ({ user, onClose, onSave }) => {
    const { t } = useTranslation();
    const [firstName, setFirstName] = useState(user.first_name);
    const [lastName, setLastName] = useState(user.last_name);
    const [email, setEmail] = useState(user.email);
    const [role, setRole] = useState(
        ['Admin', 'Manager', 'Tester'].includes(user.role) ? user.role : 'Tester'
    );
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [copied, setCopied] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isSendingReset, setIsSendingReset] = useState(false);

    const handleGeneratePassword = () => {
        setPassword(generateSecurePassword());
        setShowPassword(true);
    };

    const handleCopyPassword = () => {
        if (!password) return;
        navigator.clipboard.writeText(password);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const handleSendResetEmail = async () => {
        if (!email) return;
        setIsSendingReset(true);
        try {
            await userService.requestPasswordReset(email);
            toast.success('Un nouveau mot de passe a été envoyé par email');
        } catch {
            toast.error('Erreur lors de l\'envoi du mot de passe');
        } finally {
            setIsSendingReset(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (isSubmitting) return;
        setIsSubmitting(true);
        try {
            const payload: UserUpdatePayload = {
                first_name: firstName,
                last_name: lastName,
                email,
                role: mapRoleToBackend(role),
            };
            if (password.trim()) {
                payload.password = password.trim();
            }
            await onSave(user.id, payload);
            onClose();
        } catch (error) {
            console.error(t('userManagement.toasts.updateError'), error);
        } finally {
            setIsSubmitting(false);
        }
    };

    if (typeof document === 'undefined') return null;

    return createPortal(
        <div className="fixed inset-0 z-[99999] flex items-start justify-center p-4 sm:p-6 pt-20 bg-slate-900/50 dark:bg-slate-900/50 dark:bg-black/70 backdrop-blur-sm overflow-y-auto">
            <div className="relative w-full max-w-lg bg-white dark:bg-[#0d1117] border border-slate-200 dark:border-white/[0.08] rounded-[20px] shadow-[0_32px_80px_rgba(0,0,0,0.6)] flex flex-col max-h-[calc(100vh-6rem)] my-auto overflow-hidden">
                <div className="px-6 pt-6 pb-5 flex items-center justify-between border-b border-slate-200 dark:border-white/[0.06] shrink-0">
                    <div>
                        <div className="flex items-center gap-2 mb-1">
                            <div className="w-1.5 h-5 rounded-full bg-[#EF9F27]" />
                            <h2 className="text-[17px] font-semibold text-slate-900 dark:text-white">Modifier l'utilisateur</h2>
                        </div>
                        <p className="text-[11px] text-slate-500 dark:text-white/30 ml-4">Édition · {user.username}</p>
                    </div>
                    <button
                        onClick={onClose}
                        className="w-8 h-8 flex items-center justify-center rounded-full bg-slate-100 dark:bg-white/[0.05] hover:bg-slate-100 dark:hover:bg-white/10 text-slate-500 dark:text-white/40 hover:text-slate-900 dark:hover:text-white transition-all border border-slate-200 dark:border-white/[0.06]"
                    >
                        <XCircle size={15} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
                    <div className="p-6 space-y-4 overflow-y-auto flex-1">
                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-bold text-slate-500 dark:text-white/30 uppercase tracking-[0.15em]">
                                    {t('userManagement.modal.firstName')}
                                </label>
                                <input
                                    type="text"
                                    value={firstName}
                                    onChange={(e) => setFirstName(e.target.value)}
                                    className="w-full bg-slate-50 dark:bg-[#1a2235] border border-slate-200 dark:border-white/[0.08] rounded-[10px] px-4 py-2.5 text-[13px] text-slate-900 dark:text-white focus:border-[#378ADD]/50 focus:ring-0 outline-none transition-colors"
                                    required
                                />
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-bold text-slate-500 dark:text-white/30 uppercase tracking-[0.15em]">
                                    {t('userManagement.modal.lastName')}
                                </label>
                                <input
                                    type="text"
                                    value={lastName}
                                    onChange={(e) => setLastName(e.target.value)}
                                    className="w-full bg-slate-50 dark:bg-[#1a2235] border border-slate-200 dark:border-white/[0.08] rounded-[10px] px-4 py-2.5 text-[13px] text-slate-900 dark:text-white focus:border-[#378ADD]/50 focus:ring-0 outline-none transition-colors"
                                    required
                                />
                            </div>
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-[10px] font-bold text-slate-500 dark:text-white/30 uppercase tracking-[0.15em]">
                                {t('userManagement.modal.professionalEmail')}
                            </label>
                            <div className="relative">
                                <Mail size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-white/25" />
                                <input
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="w-full bg-slate-50 dark:bg-[#1a2235] border border-slate-200 dark:border-white/[0.08] rounded-[10px] pl-10 pr-4 py-2.5 text-[13px] text-slate-900 dark:text-white focus:border-[#378ADD]/50 focus:ring-0 outline-none transition-colors"
                                    required
                                />
                            </div>
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-[10px] font-bold text-slate-500 dark:text-white/30 uppercase tracking-[0.15em]">
                                {t('userManagement.modal.role')}
                            </label>
                            <div className="relative">
                                <Shield size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-white/25" />
                                <select
                                    value={role}
                                    onChange={(e) => setRole(e.target.value)}
                                    className="w-full bg-slate-50 dark:bg-[#1a2235] border border-slate-200 dark:border-white/[0.08] rounded-[10px] pl-10 pr-4 py-2.5 text-[13px] text-slate-900 dark:text-white focus:border-[#378ADD]/50 focus:ring-0 outline-none cursor-pointer appearance-none transition-colors"
                                >
                                    <option value="Tester" className="bg-white dark:bg-[#0d1117]">{t('userManagement.roles.tester')}</option>
                                    <option value="Manager" className="bg-white dark:bg-[#0d1117]">{t('userManagement.roles.manager')}</option>
                                    <option value="Admin" className="bg-white dark:bg-[#0d1117]">{t('userManagement.roles.admin')}</option>
                                </select>
                            </div>
                        </div>

                        <div className="rounded-[12px] border border-slate-200 dark:border-white/[0.06] bg-slate-50 dark:bg-[#1a2235]/50 p-4 space-y-3">
                            <div className="flex items-center gap-2">
                                <Key size={14} className="text-[#85B7EB]" />
                                <span className="text-[10px] font-bold text-slate-500 dark:text-white/40 uppercase tracking-[0.15em]">Mot de passe</span>
                            </div>

                            <div className="flex gap-2">
                                <div className="relative flex-1">
                                    <input
                                        type={showPassword ? 'text' : 'password'}
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        placeholder="Laisser vide pour conserver l'actuel"
                                        className="w-full bg-white dark:bg-[#0d1117] border border-slate-200 dark:border-white/[0.08] rounded-[10px] px-4 py-2.5 pr-10 text-[13px] text-slate-900 dark:text-white font-mono placeholder:text-slate-400 dark:text-white/20 focus:border-[#378ADD]/50 focus:ring-0 outline-none transition-colors"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(v => !v)}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 dark:text-white/30 hover:text-slate-900 dark:hover:text-white/60"
                                    >
                                        {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                                    </button>
                                </div>
                                <button
                                    type="button"
                                    onClick={handleGeneratePassword}
                                    className="px-3 py-2 rounded-[10px] bg-[#378ADD]/15 border border-[#378ADD]/25 text-[#85B7EB] hover:bg-[#378ADD]/25 transition-colors"
                                    title="Générer un mot de passe"
                                >
                                    <RefreshCw size={14} />
                                </button>
                                {password && (
                                    <button
                                        type="button"
                                        onClick={handleCopyPassword}
                                        className="px-3 py-2 rounded-[10px] bg-slate-100 dark:bg-white/[0.05] border border-slate-200 dark:border-white/[0.08] text-slate-500 dark:text-white/50 hover:text-slate-900 dark:hover:text-white transition-colors"
                                        title="Copier"
                                    >
                                        {copied ? <Check size={14} className="text-[#5DCAA5]" /> : <Copy size={14} />}
                                    </button>
                                )}
                            </div>

                            <button
                                type="button"
                                onClick={handleSendResetEmail}
                                disabled={isSendingReset || !email}
                                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-[10px] border border-[#EF9F27]/25 bg-[#EF9F27]/10 text-[#FCD34D] text-[12px] font-medium hover:bg-[#EF9F27]/15 transition-colors disabled:opacity-40"
                            >
                                <Send size={13} />
                                {isSendingReset ? 'Envoi…' : 'Envoyer un nouveau mot de passe par email'}
                            </button>
                            <p className="text-[10px] text-slate-400 dark:text-white/25 leading-relaxed">
                                Générez un mot de passe manuellement ou envoyez un reset automatique à l'adresse email de l'utilisateur.
                            </p>
                        </div>
                    </div>

                    <div className="px-6 py-4 border-t border-slate-200 dark:border-white/[0.06] flex items-center gap-3 shrink-0">
                        <button
                            type="button"
                            onClick={onClose}
                            disabled={isSubmitting}
                            className="px-5 py-2.5 text-[12px] font-medium text-slate-500 dark:text-white/40 hover:text-slate-900 dark:hover:text-white transition-colors rounded-[8px] hover:bg-slate-100 dark:bg-white/[0.05] disabled:opacity-40"
                        >
                            {t('userManagement.modal.cancel')}
                        </button>
                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className="flex-1 py-2.5 bg-[#378ADD] hover:bg-[#2e75bc] disabled:opacity-40 text-white rounded-[10px] text-[13px] font-semibold transition-all flex items-center justify-center gap-2 active:scale-[0.98]"
                        >
                            <Save size={14} />
                            {isSubmitting ? 'Enregistrement…' : 'Enregistrer'}
                        </button>
                    </div>
                </form>
            </div>
        </div>,
        document.body
    );
};

export default EditUserModal;
