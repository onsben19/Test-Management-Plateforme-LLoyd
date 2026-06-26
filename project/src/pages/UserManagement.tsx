import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import PageLayout from '../components/PageLayout';
import { Shield, XCircle, Plus, Mail, Edit, Trash2, Key, Copy, Check, Users, UserCheck, UserPlus, UserCog, RefreshCw, Eye, EyeOff } from 'lucide-react';
import api from '../services/api';
import { toast } from 'react-toastify';
import { useAuth } from '../context/AuthContext';
import EditUserModal, { UserUpdatePayload } from '../components/EditUserModal';
import Pagination from '../components/Pagination';
import ConfirmModal from '../components/ConfirmModal';
import StatCard from '../components/StatCard';
import { motion, AnimatePresence } from 'framer-motion';
import Button from '../components/ui/Button';
import AdminTable from '../components/AdminTable';
import { generateSecurePassword } from '../utils/password';

interface UserData {
    id: string;
    name: string;
    email: string;
    role: 'Admin' | 'Manager' | 'Tester' | 'Viewer';
    status: 'active' | 'inactive';
    username: string;
    dateJoined: string;
}

const UserManagement = () => {
    const { t } = useTranslation();
    const { user: currentUser } = useAuth();
    const isAdmin = currentUser?.role?.toUpperCase() === 'ADMIN';

    const [users, setUsers] = useState<UserData[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [roleFilter, setRoleFilter] = useState('ALL');
    const [statusFilter, setStatusFilter] = useState('ALL');
    const [loading, setLoading] = useState(false);

    const [currentPage, setCurrentPage] = useState(1);
    const [totalItems, setTotalItems] = useState(0);
    const pageSize = 12;

    const [isAddUserOpen, setIsAddUserOpen] = useState(false);
    const [newUser, setNewUser] = useState({
        username: '',
        email: '',
        role: 'Tester',
        first_name: '',
        last_name: ''
    });
    const [newUserPassword, setNewUserPassword] = useState('');
    const [showNewPassword, setShowNewPassword] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const [generatedPassword, setGeneratedPassword] = useState<string | null>(null);
    const [copied, setCopied] = useState(false);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [userToDelete, setUserToDelete] = useState<string | null>(null);
    const [editingUser, setEditingUser] = useState<any>(null);

    const mapBackendRole = (role: string): string => {
        const map: { [key: string]: string } = {
            'ADMIN': t('userManagement.roles.admin'),
            'MANAGER': t('userManagement.roles.manager'),
            'TESTER': t('userManagement.roles.tester'),
        };
        return map[role] || t('userManagement.roles.viewer');
    };

    const mapFrontendRoleToBackend = (role: string): string => {
        const r = role.toUpperCase();
        if (r === 'ADMIN') return 'ADMIN';
        if (r === 'MANAGER') return 'MANAGER';
        return 'TESTER';
    };

    const fetchUsers = async (page = 1) => {
        try {
            setLoading(true);
            const response = await api.get('/users/', {
                params: {
                    page,
                    search: searchTerm,
                    role: roleFilter !== 'ALL' ? mapFrontendRoleToBackend(roleFilter) : undefined,
                    is_active: statusFilter === 'active' ? true : (statusFilter === 'inactive' ? false : undefined),
                    ordering: '-date_joined'
                }
            });
            const data = response.data.results || response.data;
            const count = response.data.count || (Array.isArray(response.data) ? response.data.length : 0);

            setTotalItems(count);

            const apiUsers = data.map((u: any) => ({
                id: u.id.toString(),
                name: `${u.first_name || ''} ${u.last_name || ''}`.trim() || u.username,
                email: u.email,
                role: mapBackendRole(u.role),
                status: u.is_active ? 'active' : 'inactive',
                username: u.username,
                dateJoined: u.date_joined || new Date().toISOString()
            }));
            setUsers(apiUsers);
        } catch (error) {
            console.error("Failed to fetch users", error);
            toast.error(t('userManagement.toasts.fetchError'));
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchUsers(1);
        setCurrentPage(1);
    }, [searchTerm, roleFilter, statusFilter]);

    const handlePageChange = (page: number) => {
        setCurrentPage(page);
        fetchUsers(page);
    };

    const resetAddUserForm = () => {
        setNewUser({ username: '', email: '', role: 'Tester', first_name: '', last_name: '' });
        setNewUserPassword(generateSecurePassword());
        setShowNewPassword(true);
    };

    useEffect(() => {
        if (isAddUserOpen) {
            setNewUserPassword(generateSecurePassword());
            setShowNewPassword(true);
        }
    }, [isAddUserOpen]);

    const handleCopyPassword = () => {
        const pwd = generatedPassword || newUserPassword;
        if (pwd) {
            navigator.clipboard.writeText(pwd);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
    };

    const handleRegenerateNewPassword = () => {
        setNewUserPassword(generateSecurePassword());
        setShowNewPassword(true);
    };

    const userStats = useMemo(() => {
        // Since we only have current page, we rely on totalItems for total
        // But for roles, we approximate or wait for real backend stats if available.
        // For now, use the current page's distribution as a sample if total count is large,
        // or just show totalItems and specific labels.
        return {
            total: totalItems,
            admins: users.filter(u => u.role === t('userManagement.roles.admin')).length,
            managers: users.filter(u => u.role === t('userManagement.roles.manager')).length,
            testers: users.filter(u => u.role === t('userManagement.roles.tester')).length,
        };
    }, [users, totalItems]);

    const handleDelete = async (id: string) => {
        setUserToDelete(id);
        setIsDeleteModalOpen(true);
    };

    const confirmDeleteUser = async () => {
        if (!userToDelete) return;
        try {
            await api.delete(`/users/${userToDelete}/`);
            toast.success(t('userManagement.toasts.deleted'));
            setUsers(users.filter(u => u.id !== userToDelete));
        } catch (error) {
            console.error(error);
            toast.error(t('userManagement.toasts.deleteError'));
        } finally {
            setUserToDelete(null);
            setIsDeleteModalOpen(false);
        }
    };

    const handleToggleStatus = async (id: string, currentStatus: string) => {
        try {
            const newStatus = currentStatus === 'active' ? false : true;
            await api.patch(`/users/${id}/`, { is_active: newStatus });
            toast.success(newStatus ? t('userManagement.toasts.activated') : t('userManagement.toasts.deactivated'));
            fetchUsers(currentPage);
        } catch (error) {
            console.error("Failed to toggle status", error);
            toast.error(t('userManagement.toasts.toggleError'));
        }
    };

    const handleAddUser = async (e: React.FormEvent) => {
        e.preventDefault();
        if (isSubmitting) return;
        const pwd = newUserPassword.trim() || generateSecurePassword();
        setIsSubmitting(true);

        try {
            const payload = {
                username: newUser.username || newUser.email.split('@')[0],
                email: newUser.email,
                first_name: newUser.first_name,
                last_name: newUser.last_name,
                role: mapFrontendRoleToBackend(newUser.role),
                password: pwd
            };

            await api.post('/users/', payload);
            toast.success(t('userManagement.toasts.created'));

            setGeneratedPassword(pwd);
            setIsAddUserOpen(false);
            resetAddUserForm();
            fetchUsers(1);
        } catch (error) {
            console.error(error);
            toast.error(t('userManagement.toasts.createError'));
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleUpdateUser = async (id: string, updates: UserUpdatePayload) => {
        try {
            await api.patch(`/users/${id}/`, updates);
            toast.success(t('userManagement.toasts.updated'));
            setEditingUser(null);
            fetchUsers(currentPage);
        } catch (error) {
            console.error(error);
            toast.error(t('userManagement.toasts.updateError'));
            throw error;
        }
    };

    const HeaderActions = isAdmin && (
        <Button
            variant="primary"
            icon={UserPlus}
            onClick={() => { resetAddUserForm(); setIsAddUserOpen(true); }}
        >
            {t('userManagement.addUser')}
        </Button>
    );

    const columns = [
        {
            header: 'ID',
            accessor: (item: any) => <span className="font-mono text-[10px] text-slate-500">{String(item.id).substring(0, 8)}</span>
        },
        {
            header: 'UTILISATEUR',
            accessor: (u: UserData) => (
                <div className="flex items-center gap-5">
                    <div className="w-10 h-10 rounded-xl bg-blue-600/10 flex items-center justify-center text-blue-500 font-bold text-base border border-blue-600/20">
                        {u.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                        <div className="text-sm font-bold text-slate-900 dark:text-white tracking-tight">{u.name}</div>
                        <div className="text-slate-500 text-[10px] flex items-center gap-1.5 mt-0.5 font-medium opacity-70">
                            <Mail className="w-3 h-3 opacity-50" />
                            {u.email}
                        </div>
                    </div>
                </div>
            )
        },
        {
            header: 'RÔLE',
            accessor: (u: UserData) => (
                <div className="inline-flex items-center gap-2 px-3 py-1.5 border border-slate-300 dark:border-slate-200 dark:border-white/10 rounded-xl bg-slate-100 dark:bg-white/5">
                    <Shield className="w-3 h-3 text-blue-500/70" />
                    <span className="text-[9px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-widest">{u.role}</span>
                </div>
            )
        },
        {
            header: 'STATUT',
            accessor: (u: UserData) => (
                <button
                    onClick={(e) => { e.stopPropagation(); handleToggleStatus(u.id, u.status); }}
                    className={`relative inline-flex items-center h-6 rounded-full w-11 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-900 focus:ring-blue-500 ${
                        u.status === 'active' ? 'bg-emerald-500/20 border border-emerald-500/30' : 'bg-slate-700/50 border border-slate-200 dark:border-white/10'
                    }`}
                >
                    <span
                        className={`inline-block w-4 h-4 transform rounded-full bg-white transition-transform ${
                            u.status === 'active' ? 'translate-x-6 bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.5)]' : 'translate-x-1 bg-slate-400'
                        }`}
                    />
                </button>
            )
        },

        {
            header: 'DATE DE CRÉATION',
            accessor: (u: UserData) => (
                <div className="flex flex-col gap-0.5">
                    <span className="text-slate-700 dark:text-slate-300 text-[11px] font-bold tracking-tight">{new Date(u.dateJoined).toLocaleDateString()}</span>
                    <span className="text-[9px] text-slate-600 font-bold uppercase tracking-widest italic opacity-60">Inscrit</span>
                </div>
            )
        }
    ];

    return (
        <PageLayout
            title={t('userManagement.title')}
            subtitle="USER DIRECTORY"
            actions={HeaderActions}
        >
            <div className="space-y-10">
                {/* Stats Summary */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                    <StatCard
                        title={t('userManagement.stats.total')}
                        value={userStats.total}
                        icon={Users}
                        variant="blue"
                        description={t('userManagement.stats.totalDesc')}
                        isLoading={loading}
                    />
                    <StatCard
                        title={t('userManagement.stats.admins')}
                        value={userStats.admins}
                        icon={UserCog}
                        variant="purple"
                        description={t('userManagement.stats.adminsDesc')}
                        isLoading={loading}
                    />
                    <StatCard
                        title={t('userManagement.stats.managers')}
                        value={userStats.managers}
                        icon={UserCheck}
                        variant="yellow"
                        description={t('userManagement.stats.managersDesc')}
                        isLoading={loading}
                    />
                    <StatCard
                        title={t('userManagement.stats.testers')}
                        value={userStats.testers}
                        icon={UserPlus}
                        variant="green"
                        description={t('userManagement.stats.testersDesc')}
                        isLoading={loading}
                    />
                </div>

                {/* Filters & Table Card */}
                <AdminTable
                    columns={columns}
                    data={users}
                    isLoading={loading}
                    searchable
                    onSearch={(val) => setSearchTerm(val)}
                    filters={
                        <>
                            <select
                                className="bg-transparent border-none text-xs font-bold text-slate-700 dark:text-slate-300 focus:ring-0 outline-none cursor-pointer appearance-none"
                                value={roleFilter}
                                onChange={(e) => setRoleFilter(e.target.value)}
                            >
                                <option value="ALL" className="bg-white dark:bg-[#0f172a] text-slate-700 dark:text-slate-300">TOUS LES RÔLES</option>
                                <option value="Admin" className="bg-white dark:bg-[#0f172a] text-slate-700 dark:text-slate-300">ADMIN</option>
                                <option value="Manager" className="bg-white dark:bg-[#0f172a] text-slate-700 dark:text-slate-300">MANAGER</option>
                                <option value="Tester" className="bg-white dark:bg-[#0f172a] text-slate-700 dark:text-slate-300">TESTER</option>
                            </select>
                            <div className="w-px h-4 bg-slate-200 dark:bg-white/10 mx-2" />
                            <select
                                className="bg-transparent border-none text-xs font-bold text-slate-700 dark:text-slate-300 focus:ring-0 outline-none cursor-pointer appearance-none"
                                value={statusFilter}
                                onChange={(e) => setStatusFilter(e.target.value)}
                            >
                                <option value="ALL" className="bg-white dark:bg-[#0f172a] text-slate-700 dark:text-slate-300">TOUS LES STATUTS</option>
                                <option value="active" className="bg-white dark:bg-[#0f172a] text-slate-700 dark:text-slate-300">ACTIF</option>
                                <option value="inactive" className="bg-white dark:bg-[#0f172a] text-slate-700 dark:text-slate-300">INACTIF</option>
                            </select>
                        </>
                    }
                    actions={isAdmin ? (u: UserData) => (
                        <div className="flex items-center gap-2 pr-4">
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    const selectedUser = users.find(usr => usr.id === u.id);
                                    if (selectedUser) {
                                        setEditingUser({
                                            id: selectedUser.id,
                                            username: selectedUser.username,
                                            email: selectedUser.email,
                                            first_name: selectedUser.name.split(' ')[0] || '',
                                            last_name: selectedUser.name.split(' ').slice(1).join(' ') || '',
                                            role: selectedUser.role,
                                        });
                                    }
                                }}
                                className="p-2.5 bg-slate-100 dark:bg-white/5 text-slate-400 hover:text-blue-500 hover:bg-blue-500/10 rounded-xl transition-all"
                                title={t('userManagement.menu.edit')}
                            >
                                <Edit className="w-4 h-4" />
                            </button>
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    handleDelete(u.id);
                                }}
                                className="p-2.5 bg-slate-100 dark:bg-white/5 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-xl transition-all"
                                title={t('userManagement.menu.delete')}
                            >
                                <Trash2 className="w-4 h-4" />
                            </button>
                        </div>
                    ) : undefined}
                />

                <div className="pt-6">
                    <Pagination
                        currentPage={currentPage}
                        totalItems={totalItems}
                        pageSize={pageSize}
                        onPageChange={handlePageChange}
                        loading={loading}
                    />
                </div>
            </div>

            {/* Modals */}
            {typeof document !== 'undefined' && createPortal(
                <AnimatePresence>
                    {isAddUserOpen && (
                        <div className="fixed inset-0 z-[99999] flex items-start justify-center p-4 sm:p-6 pt-20 bg-slate-900/50 dark:bg-slate-900/50 dark:bg-black/70 backdrop-blur-sm overflow-y-auto">
                            <motion.div
                                initial={{ opacity: 0, scale: 0.97, y: 12 }}
                                animate={{ opacity: 1, scale: 1, y: 0 }}
                                exit={{ opacity: 0, scale: 0.97, y: 12 }}
                                className="relative w-full max-w-lg bg-white dark:bg-[#0d1117] border border-slate-200 dark:border-white/[0.08] rounded-[20px] shadow-[0_32px_80px_rgba(0,0,0,0.6)] flex flex-col max-h-[calc(100vh-6rem)] my-auto overflow-hidden"
                            >
                                <div className="px-6 pt-6 pb-5 flex items-center justify-between border-b border-slate-200 dark:border-white/[0.06] shrink-0">
                                    <div>
                                        <div className="flex items-center gap-2 mb-1">
                                            <div className="w-1.5 h-5 rounded-full bg-[#378ADD]" />
                                            <h2 className="text-[17px] font-semibold text-slate-900 dark:text-white">{t('userManagement.modal.addTitle')}</h2>
                                        </div>
                                        <p className="text-[11px] text-slate-500 dark:text-white/30 ml-4">Créer un compte collaborateur</p>
                                    </div>
                                    <button
                                        onClick={() => setIsAddUserOpen(false)}
                                        className="w-8 h-8 flex items-center justify-center rounded-full bg-slate-100 dark:bg-white/[0.05] hover:bg-slate-100 dark:hover:bg-white/10 text-slate-500 dark:text-white/40 hover:text-slate-900 dark:hover:text-white transition-all border border-slate-200 dark:border-white/[0.06]"
                                    >
                                        <XCircle size={15} />
                                    </button>
                                </div>

                                <form onSubmit={handleAddUser} className="flex flex-col flex-1 overflow-hidden">
                                    <div className="p-6 space-y-4 overflow-y-auto flex-1">
                                        <div className="grid grid-cols-2 gap-3">
                                            <div className="space-y-1.5">
                                                <label className="text-[10px] font-bold text-slate-500 dark:text-white/30 uppercase tracking-[0.15em]">{t('userManagement.modal.firstName')}</label>
                                                <input
                                                    type="text"
                                                    required
                                                    className="w-full bg-slate-50 dark:bg-[#1a2235] border border-slate-200 dark:border-white/[0.08] rounded-[10px] px-4 py-2.5 text-[13px] text-slate-900 dark:text-white focus:border-[#378ADD]/50 focus:ring-0 outline-none transition-colors"
                                                    value={newUser.first_name}
                                                    onChange={e => setNewUser({ ...newUser, first_name: e.target.value })}
                                                />
                                            </div>
                                            <div className="space-y-1.5">
                                                <label className="text-[10px] font-bold text-slate-500 dark:text-white/30 uppercase tracking-[0.15em]">{t('userManagement.modal.lastName')}</label>
                                                <input
                                                    type="text"
                                                    required
                                                    className="w-full bg-slate-50 dark:bg-[#1a2235] border border-slate-200 dark:border-white/[0.08] rounded-[10px] px-4 py-2.5 text-[13px] text-slate-900 dark:text-white focus:border-[#378ADD]/50 focus:ring-0 outline-none transition-colors"
                                                    value={newUser.last_name}
                                                    onChange={e => setNewUser({ ...newUser, last_name: e.target.value })}
                                                />
                                            </div>
                                        </div>

                                        <div className="space-y-1.5">
                                            <label className="text-[10px] font-bold text-slate-500 dark:text-white/30 uppercase tracking-[0.15em]">{t('userManagement.modal.professionalEmail')}</label>
                                            <div className="relative">
                                                <Mail size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-white/25" />
                                                <input
                                                    type="email"
                                                    required
                                                    className="w-full bg-slate-50 dark:bg-[#1a2235] border border-slate-200 dark:border-white/[0.08] rounded-[10px] pl-10 pr-4 py-2.5 text-[13px] text-slate-900 dark:text-white placeholder:text-slate-400 dark:text-white/20 focus:border-[#378ADD]/50 focus:ring-0 outline-none transition-colors"
                                                    placeholder="nom.prenom@compagnie.com"
                                                    value={newUser.email}
                                                    onChange={e => setNewUser({ ...newUser, email: e.target.value })}
                                                />
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-2 gap-3">
                                            <div className="space-y-1.5">
                                                <label className="text-[10px] font-bold text-slate-500 dark:text-white/30 uppercase tracking-[0.15em]">{t('userManagement.modal.username')}</label>
                                                <input
                                                    type="text"
                                                    className="w-full bg-slate-50 dark:bg-[#1a2235] border border-slate-200 dark:border-white/[0.08] rounded-[10px] px-4 py-2.5 text-[13px] text-slate-900 dark:text-white placeholder:text-slate-400 dark:text-white/20 focus:border-[#378ADD]/50 focus:ring-0 outline-none transition-colors"
                                                    placeholder="Auto depuis email"
                                                    value={newUser.username}
                                                    onChange={e => setNewUser({ ...newUser, username: e.target.value })}
                                                />
                                            </div>
                                            <div className="space-y-1.5">
                                                <label className="text-[10px] font-bold text-slate-500 dark:text-white/30 uppercase tracking-[0.15em]">{t('userManagement.modal.role')}</label>
                                                <div className="relative">
                                                    <Shield size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-white/25" />
                                                    <select
                                                        className="w-full bg-slate-50 dark:bg-[#1a2235] border border-slate-200 dark:border-white/[0.08] rounded-[10px] pl-10 pr-4 py-2.5 text-[13px] text-slate-900 dark:text-white focus:border-[#378ADD]/50 focus:ring-0 outline-none cursor-pointer appearance-none transition-colors"
                                                        value={newUser.role}
                                                        onChange={e => setNewUser({ ...newUser, role: e.target.value })}
                                                    >
                                                        <option value="Tester" className="bg-white dark:bg-[#0d1117]">{t('userManagement.roles.tester')}</option>
                                                        <option value="Manager" className="bg-white dark:bg-[#0d1117]">{t('userManagement.roles.manager')}</option>
                                                        <option value="Admin" className="bg-white dark:bg-[#0d1117]">{t('userManagement.roles.admin')}</option>
                                                    </select>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="rounded-[12px] border border-[#1D9E75]/20 bg-[#1D9E75]/5 p-4 space-y-3">
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-2">
                                                    <Key size={14} className="text-[#5DCAA5]" />
                                                    <span className="text-[10px] font-bold text-[#5DCAA5] uppercase tracking-[0.15em]">Mot de passe temporaire</span>
                                                </div>
                                                <button
                                                    type="button"
                                                    onClick={handleRegenerateNewPassword}
                                                    className="flex items-center gap-1.5 text-[10px] font-bold text-[#85B7EB] uppercase tracking-wider hover:text-slate-900 dark:hover:text-white transition-colors"
                                                >
                                                    <RefreshCw size={12} />
                                                    Régénérer
                                                </button>
                                            </div>
                                            <div className="flex gap-2">
                                                <div className="relative flex-1">
                                                    <input
                                                        type={showNewPassword ? 'text' : 'password'}
                                                        value={newUserPassword}
                                                        onChange={e => setNewUserPassword(e.target.value)}
                                                        className="w-full bg-white dark:bg-[#0d1117] border border-slate-200 dark:border-white/[0.08] rounded-[10px] px-4 py-2.5 pr-10 text-[13px] text-slate-900 dark:text-white font-mono focus:border-[#378ADD]/50 focus:ring-0 outline-none transition-colors"
                                                    />
                                                    <button
                                                        type="button"
                                                        onClick={() => setShowNewPassword(v => !v)}
                                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 dark:text-white/30 hover:text-slate-900 dark:hover:text-white/60"
                                                    >
                                                        {showNewPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                                                    </button>
                                                </div>
                                                <button
                                                    type="button"
                                                    onClick={() => { navigator.clipboard.writeText(newUserPassword); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
                                                    className="px-3 py-2 rounded-[10px] bg-slate-100 dark:bg-white/[0.05] border border-slate-200 dark:border-white/[0.08] text-slate-500 dark:text-white/50 hover:text-slate-900 dark:hover:text-white transition-colors"
                                                >
                                                    {copied ? <Check size={14} className="text-[#5DCAA5]" /> : <Copy size={14} />}
                                                </button>
                                            </div>
                                            <p className="text-[10px] text-slate-500 dark:text-white/30 leading-relaxed">
                                                Généré automatiquement. Copiez-le avant création — il sera aussi envoyé par email.
                                            </p>
                                        </div>
                                    </div>

                                    <div className="px-6 py-4 border-t border-slate-200 dark:border-white/[0.06] flex items-center gap-3 shrink-0">
                                        <button
                                            type="button"
                                            onClick={() => setIsAddUserOpen(false)}
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
                                            <Plus size={14} />
                                            {isSubmitting ? 'Création…' : t('userManagement.modal.create')}
                                        </button>
                                    </div>
                                </form>
                            </motion.div>
                        </div>
                    )}

                    {generatedPassword && (
                        <div className="fixed inset-0 z-[100000] flex items-center justify-center p-4 bg-slate-900/60 dark:bg-slate-900/60 dark:bg-black/80 backdrop-blur-sm">
                            <motion.div
                                initial={{ opacity: 0, scale: 0.97, y: 12 }}
                                animate={{ opacity: 1, scale: 1, y: 0 }}
                                exit={{ opacity: 0, scale: 0.97, y: 12 }}
                                className="relative w-full max-w-md bg-white dark:bg-[#0d1117] border border-slate-200 dark:border-white/[0.08] rounded-[20px] shadow-[0_32px_80px_rgba(0,0,0,0.6)] overflow-hidden"
                            >
                                <div className="p-8 text-center space-y-6">
                                    <div className="w-16 h-16 bg-[#1D9E75]/15 rounded-full flex items-center justify-center mx-auto border border-[#1D9E75]/25">
                                        <Key className="w-8 h-8 text-[#5DCAA5]" />
                                    </div>
                                    <div>
                                        <h2 className="text-[17px] font-semibold text-slate-900 dark:text-white mb-1">{t('userManagement.modal.accessGenerated')}</h2>
                                        <p className="text-[11px] text-white/35 leading-relaxed">{t('userManagement.modal.accessDesc')}</p>
                                    </div>
                                    <div className="bg-slate-50 dark:bg-[#1a2235] border border-slate-200 dark:border-white/[0.08] rounded-[12px] p-5 space-y-3">
                                        <code className="text-xl font-black text-[#85B7EB] tracking-[0.15em] font-mono break-all">{generatedPassword}</code>
                                        <button
                                            type="button"
                                            onClick={handleCopyPassword}
                                            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-[10px] bg-[#378ADD]/15 border border-[#378ADD]/25 text-[#85B7EB] text-[12px] font-semibold hover:bg-[#378ADD]/25 transition-colors"
                                        >
                                            {copied ? <Check size={14} /> : <Copy size={14} />}
                                            {copied ? 'Copié !' : 'Copier le mot de passe'}
                                        </button>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => setGeneratedPassword(null)}
                                        className="w-full py-2.5 bg-[#378ADD] hover:bg-[#2e75bc] text-white rounded-[10px] text-[13px] font-semibold transition-all"
                                    >
                                        {t('userManagement.modal.finish')}
                                    </button>
                                </div>
                            </motion.div>
                        </div>
                    )}
                </AnimatePresence>,
                document.body
            )}

            {editingUser && (
                <EditUserModal
                    user={editingUser}
                    onClose={() => setEditingUser(null)}
                    onSave={handleUpdateUser}
                />
            )}

            <ConfirmModal
                isOpen={isDeleteModalOpen}
                title={t('userManagement.modal.deleteTitle')}
                message={t('userManagement.modal.deleteMessage')}
                onConfirm={confirmDeleteUser}
                onCancel={() => setIsDeleteModalOpen(false)}
                confirmText={t('userManagement.modal.deleteConfirm')}
                type="danger"
            />
        </PageLayout>
    );
};

export default UserManagement;
