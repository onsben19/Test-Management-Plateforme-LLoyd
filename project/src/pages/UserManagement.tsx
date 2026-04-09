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

interface UserData {
    id: string;
    name: string;
    email: string;
    role: 'Admin' | 'Manager' | 'Tester' | 'Viewer';
    status: 'active' | 'inactive';
    username: string;
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

    const [openMenuId, setOpenMenuId] = useState<string | null>(null);
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
                username: u.username
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
        <button
            onClick={() => setIsAddUserOpen(true)}
            className="group flex items-center gap-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white px-8 py-4 rounded-[2rem] transition-all shadow-xl shadow-blue-900/10 active:scale-95 font-bold text-[11px] tracking-wide uppercase"
        >
            <UserPlus className="w-4 h-4 group-hover:scale-110 transition-transform" />
            {t('userManagement.addUser')}
        </button>
    );

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
                <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-[3rem] overflow-hidden shadow-2xl shadow-black/20">
                    {/* Filters Bar - Refined to match screenshot */}
                    <div className="p-10 border-b border-white/5 flex flex-col xl:flex-row items-center gap-6">
                        <div className="relative flex-1 group w-full">
                            <Search className="absolute left-8 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500 group-focus-within:text-blue-500 transition-colors" />
                            <input
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                placeholder="Rechercher un utilisateur..."
                                className="w-full bg-white/5 border border-white/10 rounded-[2rem] pl-20 pr-10 py-5 text-base text-white focus:outline-none focus:ring-2 focus:ring-blue-500/30 transition-all font-medium placeholder-slate-500"
                            />
                        </div>

                        <div className="flex flex-wrap items-center gap-4 w-full xl:w-auto">
                            <div className="relative bg-white/5 rounded-[1.5rem] border border-white/5 overflow-hidden min-w-[200px] hover:bg-white/10 transition-all">
                                <select
                                    className="w-full bg-transparent text-white text-[10px] font-bold uppercase tracking-[0.2em] pl-8 pr-12 py-5 outline-none cursor-pointer appearance-none relative z-10"
                                    value={roleFilter}
                                    onChange={(e) => setRoleFilter(e.target.value)}
                                >
                                    <option value="ALL" className="bg-slate-900">TOUS LES RÔLES</option>
                                    <option value="Admin" className="bg-slate-900">ADMIN</option>
                                    <option value="Manager" className="bg-slate-900">MANAGER</option>
                                    <option value="Tester" className="bg-slate-900">TESTER</option>
                                </select>
                                <Filter className="absolute right-6 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" />
                            </div>

                            <div className="relative bg-white/5 rounded-[1.5rem] border border-white/5 overflow-hidden min-w-[200px] hover:bg-white/10 transition-all">
                                <select
                                    className="w-full bg-transparent text-white text-[10px] font-bold uppercase tracking-[0.2em] pl-8 pr-12 py-5 outline-none cursor-pointer appearance-none relative z-10"
                                    value={statusFilter}
                                    onChange={(e) => setStatusFilter(e.target.value)}
                                >
                                    <option value="ALL" className="bg-slate-900">TOUS LES STATUTS</option>
                                    <option value="active" className="bg-slate-900">ACTIF</option>
                                    <option value="inactive" className="bg-slate-900">INACTIF</option>
                                </select>
                                <Filter className="absolute right-6 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" />
                            </div>
                        </div>
                    </div>

                    <div className="overflow-x-auto h-full">
                        <table className="w-full text-left border-collapse min-w-[800px]">
                            <thead>
                                <tr className="border-b border-white/5 bg-white/[0.01]">
                                    <th className="px-10 py-8 text-[11px] font-bold text-slate-500 uppercase tracking-[0.2em]">UTILISATEUR</th>
                                    <th className="px-10 py-8 text-[11px] font-bold text-slate-500 uppercase tracking-[0.2em]">RÔLE</th>
                                    <th className="px-10 py-8 text-[11px] font-bold text-slate-500 uppercase tracking-[0.2em]">STATUT</th>
                                    {isAdmin && <th className="px-10 py-8 text-[11px] font-bold text-slate-500 uppercase tracking-[0.2em] text-right">ACTIONS</th>}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5">
                                {loading && users.length === 0 ? (
                                    [1, 2, 3].map(i => (
                                        <tr key={i} className="animate-pulse">
                                            <td colSpan={4} className="px-10 py-10">
                                                <div className="h-12 bg-white/5 rounded-2xl w-full" />
                                            </td>
                                        </tr>
                                    ))
                                ) : users.length === 0 ? (
                                    <tr>
                                        <td colSpan={4} className="px-10 py-32 text-center">
                                            <div className="max-w-xs mx-auto opacity-30">
                                                <Users className="w-16 h-16 mx-auto mb-4 text-slate-500" />
                                                <p className="font-black uppercase tracking-widest text-[10px]">{t('userManagement.filters.noResults') || "No users found"}</p>
                                            </div>
                                        </td>
                                    </tr>
                                ) : users.map((u) => (
                                    <tr key={u.id} className="group hover:bg-white/5 transition-all duration-300">
                                        <td className="px-10 py-6">
                                            <div className="flex items-center gap-5">
                                                <div className="w-12 h-12 rounded-2xl bg-blue-600/20 flex items-center justify-center text-blue-400 font-bold text-lg border border-blue-600/20 group-hover:scale-105 transition-all duration-500">
                                                    {u.name.charAt(0).toUpperCase()}
                                                </div>
                                                <div>
                                                    <div className="text-base font-bold text-white group-hover:text-blue-400 transition-colors tracking-tight">{u.name}</div>
                                                    <div className="text-slate-500 text-[11px] flex items-center gap-2 mt-0.5 font-medium opacity-70">
                                                        <Mail className="w-3.5 h-3.5 opacity-50" />
                                                        {u.email}
                                                    </div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-10 py-8">
                                            <div className="inline-flex items-center gap-3 px-6 py-2 border border-white/10 rounded-2xl bg-white/5 group-hover:bg-blue-600/5 group-hover:border-blue-500/30 transition-all">
                                                <Shield className="w-3.5 h-3.5 text-blue-500/70" />
                                                <span className="text-[10px] font-bold text-slate-300 uppercase tracking-widest">{u.role}</span>
                                            </div>
                                        </td>
                                        <td className="px-10 py-8">
                                            <span className={`inline-flex items-center gap-3 px-6 py-2 rounded-2xl text-[10px] font-bold uppercase tracking-widest transition-all ${u.status === 'active'
                                                ? 'bg-emerald-500/5 text-emerald-400 border border-emerald-500/10'
                                                : 'bg-rose-500/5 text-rose-400 border border-rose-500/10'
                                                }`}>
                                                <div className={`w-1.5 h-1.5 rounded-full ${u.status === 'active' ? 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.5)]' : 'bg-rose-500'}`} />
                                                {u.status === 'active' ? 'ACTIF' : 'INACTIF'}
                                            </span>
                                        </td>
                                        {isAdmin && (
                                            <td className="px-10 py-6 text-right relative">
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setOpenMenuId(openMenuId === u.id ? null : u.id);
                                                    }}
                                                    className={`p-3 rounded-2xl transition-all ${openMenuId === u.id ? 'bg-blue-600 text-white shadow-lg' : 'bg-white/5 text-slate-500 hover:text-white hover:bg-white/10 border border-white/5'}`}
                                                >
                                                    <MoreVertical className="w-5 h-5" />
                                                </button>

                                                <AnimatePresence>
                                                    {openMenuId === u.id && (
                                                        <motion.div
                                                            initial={{ opacity: 0, scale: 0.95, x: 20 }}
                                                            animate={{ opacity: 1, scale: 1, x: 0 }}
                                                            exit={{ opacity: 0, scale: 0.95, x: 20 }}
                                                            className="absolute right-24 top-6 w-56 bg-[#0f172a] border border-white/10 rounded-[2rem] shadow-2xl z-50 overflow-hidden"
                                                        >
                                                            <div className="p-3 space-y-1">
                                                                <button
                                                                    className="w-full flex items-center gap-3 px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-white hover:bg-white/5 rounded-2xl transition-all"
                                                                    onClick={() => {
                                                                        const selectedUser = users.find(usr => usr.id === u.id);
                                                                        if (selectedUser) {
                                                                            setEditingUser({
                                                                                ...selectedUser,
                                                                                first_name: selectedUser.name.split(' ')[0],
                                                                                last_name: selectedUser.name.split(' ').slice(1).join(' ')
                                                                            });
                                                                        }
                                                                        setOpenMenuId(null);
                                                                    }}
                                                                >
                                                                    <Edit className="w-4 h-4 text-blue-500/70" />
                                                                    {t('userManagement.menu.edit')}
                                                                </button>
                                                                <button
                                                                    onClick={() => {
                                                                        handleToggleStatus(u.id, u.status);
                                                                        setOpenMenuId(null);
                                                                    }}
                                                                    className="w-full flex items-center gap-3 px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-white hover:bg-white/5 rounded-2xl transition-all"
                                                                >
                                                                    {u.status === 'active' ? <Lock className="w-4 h-4 text-amber-500/70" /> : <Unlock className="w-4 h-4 text-emerald-500/70" />}
                                                                    {u.status === 'active' ? t('userManagement.menu.deactivate') : t('userManagement.menu.activate')}
                                                                </button>
                                                                <div className="h-px bg-white/5 mx-4 my-2" />
                                                                <button
                                                                    onClick={() => {
                                                                        handleDelete(u.id);
                                                                        setOpenMenuId(null);
                                                                    }}
                                                                    className="w-full flex items-center gap-3 px-6 py-4 text-[10px] font-black uppercase tracking-widest text-rose-500 hover:bg-rose-500/10 rounded-2xl transition-all"
                                                                >
                                                                    <Trash2 className="w-4 h-4" />
                                                                    {t('userManagement.menu.delete')}
                                                                </button>
                                                            </div>
                                                        </motion.div>
                                                    )}
                                                </AnimatePresence>
                                            </td>
                                        )}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

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
                            className="relative w-full max-w-xl bg-[#0f172a] border border-white/10 rounded-[3rem] overflow-hidden shadow-2xl"
                        >
                            <div className="p-8 border-b border-white/5 flex justify-between items-center bg-gradient-to-r from-blue-600/10 to-transparent">
                                <div>
                                    <h2 className="text-2xl font-bold text-white tracking-tight">{t('userManagement.modal.addTitle')}</h2>
                                    <p className="text-[10px] font-semibold text-slate-500 mt-1 uppercase tracking-widest">Enregistrer un nouveau collaborateur</p>
                                </div>
                                <button
                                    onClick={() => setIsAddUserOpen(false)}
                                    className="p-3 bg-white/5 hover:bg-white/10 rounded-full text-slate-400 hover:text-white transition-all border border-white/5"
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
                                            className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-white focus:ring-2 focus:ring-blue-500/50 outline-none transition-all font-bold"
                                            value={newUser.first_name}
                                            onChange={e => setNewUser({ ...newUser, first_name: e.target.value })}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">{t('userManagement.modal.lastName')}</label>
                                        <input
                                            type="text"
                                            required
                                            className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-white focus:ring-2 focus:ring-blue-500/50 outline-none transition-all font-bold"
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
                                            className="w-full bg-white/5 border border-white/10 rounded-2xl pl-16 pr-6 py-4 text-white focus:ring-2 focus:ring-blue-500/50 outline-none transition-all font-bold"
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
                                            className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-white focus:ring-2 focus:ring-blue-500/50 outline-none transition-all font-bold"
                                            value={newUser.username}
                                            onChange={e => setNewUser({ ...newUser, username: e.target.value })}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">{t('userManagement.modal.role')}</label>
                                        <div className="relative bg-white/5 border border-white/10 rounded-2xl overflow-hidden group">
                                            <Shield className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500 group-focus-within:text-blue-500 transition-colors" />
                                            <select
                                                className="w-full bg-transparent pl-16 pr-6 py-4 text-white font-bold outline-none cursor-pointer appearance-none"
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

                                <div className="flex items-center justify-end gap-5 pt-6 border-t border-white/5">
                                    <button
                                        type="button"
                                        onClick={() => setIsAddUserOpen(false)}
                                        className="px-8 py-4 text-[10px] font-black uppercase tracking-widest text-slate-500 hover:text-white transition-all"
                                    >
                                        {t('userManagement.modal.cancel')}
                                    </button>
                                    <button
                                        type="submit"
                                        className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hove:to-indigo-500 text-white px-10 py-4 rounded-3xl font-black text-[10px] tracking-widest uppercase transition-all shadow-xl shadow-blue-900/40 active:scale-95 flex items-center gap-3"
                                    >
                                        <UserCheck className="w-5 h-5" />
                                        {t('userManagement.modal.create')}
                                    </button>
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
                            className="bg-[#0f172a] border border-white/10 rounded-[3rem] w-full max-w-md shadow-3xl overflow-hidden"
                        >
                            <div className="p-10 text-center space-y-8">
                                <div className="w-20 h-20 bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto border border-emerald-500/30">
                                    <Key className="w-10 h-10 text-emerald-400" />
                                </div>
                                <div>
                                    <h2 className="text-2xl font-bold text-white tracking-tight mb-2">{t('userManagement.modal.accessGenerated')}</h2>
                                    <p className="text-slate-500 font-bold text-xs uppercase tracking-widest leading-relaxed">{t('userManagement.modal.accessDesc')}</p>
                                </div>
                                <div className="bg-white/5 border border-white/10 rounded-2xl p-6 flex flex-col items-center gap-4 relative group">
                                    <code className="text-3xl font-black text-blue-400 tracking-[0.2em] font-mono">{generatedPassword}</code>
                                    <button
                                        onClick={handleCopyPassword}
                                        className="flex items-center gap-3 px-6 py-2 bg-blue-500/10 hover:bg-blue-500/20 text-[10px] font-black uppercase tracking-widest text-blue-400 rounded-full border border-blue-500/20 transition-all"
                                    >
                                        {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                                        {copied ? "Copied" : "Copy Password"}
                                    </button>
                                </div>
                                <button
                                    onClick={() => setGeneratedPassword(null)}
                                    className="w-full bg-white text-black hover:bg-slate-200 font-black py-5 rounded-[2rem] text-xs tracking-[0.3em] uppercase transition-all shadow-xl shadow-white/5"
                                >
                                    {t('userManagement.modal.finish')}
                                </button>
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
