import React, { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import PageLayout from '../components/PageLayout';
import { User, Shield, CheckCircle, XCircle, MoreVertical, Plus, Search, Mail, Edit, Trash2, Lock, Unlock, Key, Copy, Check, Users, UserCheck, UserPlus, UserCog, Filter } from 'lucide-react';
import api from '../services/api';
import { toast } from 'react-toastify';
import { useAuth } from '../context/AuthContext';
import EditUserModal from '../components/EditUserModal';
import Pagination from '../components/Pagination';
import ConfirmModal from '../components/ConfirmModal';
import StatCard from '../components/StatCard';
import { motion, AnimatePresence } from 'framer-motion';
import Button from '../components/ui/Button';
import AdminTable from '../components/AdminTable';

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
        role: 'TESTER',
        first_name: '',
        last_name: ''
    });

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

    const generatePassword = () => {
        const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*";
        let password = "";
        for (let i = 0; i < 12; i++) {
            password += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return password;
    };

    const handleCopyPassword = () => {
        if (generatedPassword) {
            navigator.clipboard.writeText(generatedPassword);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
    };

    useEffect(() => {
        const handleClickOutside = () => setOpenMenuId(null);
        document.addEventListener('click', handleClickOutside);
        return () => document.removeEventListener('click', handleClickOutside);
    }, []);

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
        const pwd = generatePassword();

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
            setNewUser({ username: '', email: '', role: 'TESTER', first_name: '', last_name: '' });
            fetchUsers(1);
        } catch (error) {
            console.error(error);
            toast.error(t('userManagement.toasts.createError'));
        }
    };

    const handleUpdateUser = async (id: string, updates: FormData) => {
        try {
            // Check if we want to reset password here too
            // updates.append('password', generatePassword()); 
            await api.patch(`/users/${id}/`, updates);
            toast.success(t('userManagement.toasts.updated'));
            setEditingUser(null);
            fetchUsers(currentPage);
        } catch (error) {
            console.error(error);
            toast.error(t('userManagement.toasts.updateError'));
        }
    };

    const HeaderActions = isAdmin && (
        <Button
            variant="primary"
            icon={UserPlus}
            onClick={() => setIsAddUserOpen(true)}
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
                <div className="inline-flex items-center gap-2 px-3 py-1.5 border border-slate-300 dark:border-white/10 rounded-xl bg-slate-100 dark:bg-white/5">
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
                        u.status === 'active' ? 'bg-emerald-500/20 border border-emerald-500/30' : 'bg-slate-700/50 border border-white/10'
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
                                            ...selectedUser,
                                            first_name: selectedUser.name.split(' ')[0],
                                            last_name: selectedUser.name.split(' ').slice(1).join(' ')
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
            <AnimatePresence>
                {isAddUserOpen && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 backdrop-blur-xl bg-black/60">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.9, y: 20 }}
                            className="relative w-full max-w-xl bg-white dark:bg-[#0f172a] border border-slate-300 dark:border-white/10 rounded-[3rem] overflow-hidden shadow-2xl"
                        >
                            <div className="p-8 border-b border-slate-200 dark:border-white/5 flex justify-between items-center bg-gradient-to-r from-blue-600/10 to-transparent">
                                <div>
                                    <h2 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">{t('userManagement.modal.addTitle')}</h2>
                                    <p className="text-[10px] font-semibold text-slate-500 mt-1 uppercase tracking-widest">Enregistrer un nouveau collaborateur</p>
                                </div>
                                <button
                                    onClick={() => setIsAddUserOpen(false)}
                                    className="p-3 bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:bg-white/10 rounded-full text-slate-400 hover:text-slate-900 dark:hover:text-white transition-all border border-slate-200 dark:border-white/5"
                                >
                                    <XCircle className="w-6 h-6" />
                                </button>
                            </div>

                            <form onSubmit={handleAddUser} className="p-8 space-y-6">
                                <div className="grid grid-cols-2 gap-6">
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">{t('userManagement.modal.firstName')}</label>
                                        <input
                                            type="text"
                                            required
                                            className="w-full bg-slate-100 dark:bg-white/5 border border-slate-300 dark:border-white/10 rounded-2xl px-6 py-4 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500/50 outline-none transition-all font-bold"
                                            value={newUser.first_name}
                                            onChange={e => setNewUser({ ...newUser, first_name: e.target.value })}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">{t('userManagement.modal.lastName')}</label>
                                        <input
                                            type="text"
                                            required
                                            className="w-full bg-slate-100 dark:bg-white/5 border border-slate-300 dark:border-white/10 rounded-2xl px-6 py-4 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500/50 outline-none transition-all font-bold"
                                            value={newUser.last_name}
                                            onChange={e => setNewUser({ ...newUser, last_name: e.target.value })}
                                        />
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">{t('userManagement.modal.professionalEmail')}</label>
                                    <div className="relative group">
                                        <Mail className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500 group-focus-within:text-blue-500 transition-colors" />
                                        <input
                                            type="email"
                                            required
                                            className="w-full bg-slate-100 dark:bg-white/5 border border-slate-300 dark:border-white/10 rounded-2xl pl-16 pr-6 py-4 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500/50 outline-none transition-all font-bold"
                                            placeholder="nom.prenom@compagnie.com"
                                            value={newUser.email}
                                            onChange={e => setNewUser({ ...newUser, email: e.target.value })}
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-6">
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">{t('userManagement.modal.username')}</label>
                                        <input
                                            type="text"
                                            className="w-full bg-slate-100 dark:bg-white/5 border border-slate-300 dark:border-white/10 rounded-2xl px-6 py-4 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500/50 outline-none transition-all font-bold"
                                            value={newUser.username}
                                            onChange={e => setNewUser({ ...newUser, username: e.target.value })}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">{t('userManagement.modal.role')}</label>
                                        <div className="relative bg-slate-100 dark:bg-white/5 border border-slate-300 dark:border-white/10 rounded-2xl overflow-hidden group">
                                            <Shield className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500 group-focus-within:text-blue-500 transition-colors" />
                                            <select
                                                className="w-full bg-transparent pl-16 pr-6 py-4 text-slate-900 dark:text-white font-bold outline-none cursor-pointer appearance-none"
                                                value={newUser.role}
                                                onChange={e => setNewUser({ ...newUser, role: e.target.value })}
                                            >
                                                <option value="Tester" className="bg-slate-900">{t('userManagement.roles.tester')}</option>
                                                <option value="Manager" className="bg-slate-900">{t('userManagement.roles.manager')}</option>
                                                <option value="Admin" className="bg-slate-900">{t('userManagement.roles.admin')}</option>
                                            </select>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex items-center justify-end gap-5 pt-6 border-t border-slate-200 dark:border-white/5">
                                    <Button
                                        variant="ghost"
                                        onClick={() => setIsAddUserOpen(false)}
                                    >
                                        {t('userManagement.modal.cancel')}
                                    </Button>
                                    <Button
                                        type="submit"
                                        variant="primary"
                                        icon={UserCheck}
                                    >
                                        {t('userManagement.modal.create')}
                                    </Button>
                                </div>
                            </form>
                        </motion.div>
                    </div>
                )}

                {generatedPassword && (
                    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 sm:p-6 backdrop-blur-2xl bg-black/80">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.8 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="bg-white dark:bg-[#0f172a] border border-slate-300 dark:border-white/10 rounded-[3rem] w-full max-w-md shadow-3xl overflow-hidden"
                        >
                            <div className="p-10 text-center space-y-8">
                                <div className="w-20 h-20 bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto border border-emerald-500/30">
                                    <Key className="w-10 h-10 text-emerald-400" />
                                </div>
                                <div>
                                    <h2 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight mb-2">{t('userManagement.modal.accessGenerated')}</h2>
                                    <p className="text-slate-500 font-bold text-xs uppercase tracking-widest leading-relaxed">{t('userManagement.modal.accessDesc')}</p>
                                </div>
                                <div className="bg-slate-100 dark:bg-white/5 border border-slate-300 dark:border-white/10 rounded-2xl p-6 flex flex-col items-center gap-4 relative group">
                                    <code className="text-3xl font-black text-blue-400 tracking-[0.2em] font-mono">{generatedPassword}</code>
                                    <Button
                                        variant="secondary"
                                        size="sm"
                                        icon={copied ? Check : Copy}
                                        onClick={handleCopyPassword}
                                    >
                                        {copied ? "Copied" : "Copy Password"}
                                    </Button>
                                </div>
                                <Button
                                    variant="primary"
                                    onClick={() => setGeneratedPassword(null)}
                                    className="w-full !rounded-[2rem] py-5"
                                >
                                    {t('userManagement.modal.finish')}
                                </Button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

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
