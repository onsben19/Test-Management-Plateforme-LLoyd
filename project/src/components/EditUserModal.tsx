import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { X, Save, User as UserIcon } from 'lucide-react';
import Button from './ui/Button';

export interface UserItem {
    id: string;
    username: string;
    email: string;
    first_name: string;
    last_name: string;
    role: string;
}

interface EditUserModalProps {
    user: UserItem;
    onClose: () => void;
    onSave: (id: string, updates: FormData) => Promise<void>;
}

const EditUserModal: React.FC<EditUserModalProps> = ({ user, onClose, onSave }) => {
    const { t } = useTranslation();
    const [firstName, setFirstName] = useState(user.first_name);
    const [lastName, setLastName] = useState(user.last_name);
    const [email, setEmail] = useState(user.email);
    const [role, setRole] = useState(user.role);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        try {
            const formData = new FormData();
            formData.append('first_name', firstName);
            formData.append('last_name', lastName);
            formData.append('email', email);

            // Map frontend role to backend value if needed, assuming simple mapping for now
            // Admin, Manager, Tester
            let backendRole = 'TESTER';
            if (role === 'Admin') backendRole = 'ADMIN';
            else if (role === 'Manager') backendRole = 'MANAGER';

            formData.append('role', backendRole);

            await onSave(user.id, formData);
            onClose();
        } catch (error) {
            console.error(t('userManagement.toasts.updateError'), error);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-fade-in">
            <div className="bg-white dark:bg-slate-900 rounded-xl shadow-2xl w-full max-w-lg border border-slate-200 dark:border-slate-700 overflow-hidden flex flex-col max-h-[90vh]">
                <div className="p-6 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/50">
                    <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                        <UserIcon className="w-5 h-5 text-blue-500" />
                        {t('userManagement.menu.edit')}
                    </h2>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-full text-slate-500 dark:text-slate-400 transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-6 overflow-y-auto">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                                {t('userManagement.modal.firstName')}
                            </label>
                            <input
                                type="text"
                                value={firstName}
                                onChange={(e) => setFirstName(e.target.value)}
                                className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-4 py-2 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
                                required
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                                {t('userManagement.modal.lastName')}
                            </label>
                            <input
                                type="text"
                                value={lastName}
                                onChange={(e) => setLastName(e.target.value)}
                                className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-4 py-2 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
                                required
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                            {t('userManagement.modal.professionalEmail')}
                        </label>
                        <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-4 py-2 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
                            required
                        />
                    </div>

                    <div className="space-y-2">
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                            {t('userManagement.modal.role')}
                        </label>
                        <select
                            value={role}
                            onChange={(e) => setRole(e.target.value)}
                            className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-4 py-2 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
                        >
                            <option value="Tester">{t('userManagement.roles.tester')}</option>
                            <option value="Manager">{t('userManagement.roles.manager')}</option>
                            <option value="Admin">{t('userManagement.roles.admin')}</option>
                        </select>
                    </div>
                </form>

                <div className="p-6 border-t border-slate-200 dark:border-slate-700 flex justify-end gap-3 bg-slate-50/50 dark:bg-slate-800/50">
                    <Button
                        variant="ghost"
                        onClick={onClose}
                    >
                        {t('userManagement.modal.cancel')}
                    </Button>
                    <Button
                        onClick={handleSubmit}
                        isLoading={isSubmitting}
                        icon={Save}
                    >
                        {isSubmitting ? t('common.saving') || 'Enregistrement...' : t('common.save') || 'Enregistrer'}
                    </Button>
                </div>
            </div>
        </div>
    );
};

export default EditUserModal;
