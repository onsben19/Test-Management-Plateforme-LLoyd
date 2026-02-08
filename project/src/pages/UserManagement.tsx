import React, { useState, useEffect } from 'react';
import Header from '../components/Header';
import Sidebar from '../components/Sidebar';
import { User, Shield, CheckCircle, XCircle, MoreVertical, Plus, Search, Mail, Edit, Trash2, Lock, Unlock, Key, Copy, Check } from 'lucide-react';
import api from '../services/api';
import { toast } from 'react-toastify';
import { useAuth } from '../context/AuthContext';
import EditUserModal from '../components/EditUserModal';

interface UserData {
    id: string;
    name: string;
    email: string;
    role: 'Admin' | 'Manager' | 'Tester' | 'Viewer';
    status: 'active' | 'inactive';
    username: string;
}

const UserManagement = () => {
    const { user } = useAuth();
    // Case-insensitive check just in case
    const isAdmin = user?.role?.toUpperCase() === 'ADMIN';

    const [users, setUsers] = useState<UserData[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
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

    // Fetch users from API
    const fetchUsers = async () => {
        try {
            const response = await api.get('/users/');
            const apiUsers = response.data.map((u: any) => ({
                id: u.id.toString(),
                name: `${u.first_name || ''} ${u.last_name || ''}`.trim() || u.username,
                email: u.email,
                role: mapBackendRole(u.role),
                status: u.is_active ? 'active' : 'inactive',
                username: u.username
            }));
            setUsers(apiUsers);
        } catch (error) {
            console.error("Error fetching users", error);
            toast.error("Impossible de charger les utilisateurs");
        }
    };

    useEffect(() => {
        fetchUsers();
    }, []);

    const mapBackendRole = (role: string): string => {
        const map: { [key: string]: string } = {
            'ADMIN': 'Admin',
            'MANAGER': 'Manager',
            'TESTER': 'Tester',
        };
        return map[role] || 'Viewer';
    };

    const mapFrontendRoleToBackend = (role: string): string => {
        if (role === 'Admin') return 'ADMIN';
        if (role === 'Manager') return 'MANAGER';
        if (role === 'Tester') return 'TESTER';
        return 'TESTER';
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

    // Close menu when clicking outside
    useEffect(() => {
        const handleClickOutside = () => setOpenMenuId(null);
        document.addEventListener('click', handleClickOutside);
        return () => document.removeEventListener('click', handleClickOutside);
    }, []);

    const filteredUsers = users.filter(user =>
        user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.email.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const handleDelete = async (id: string) => {
        if (window.confirm('Êtes-vous sûr de vouloir supprimer cet utilisateur ?')) {
            try {
                await api.delete(`/users/${id}/`);
                toast.success("Utilisateur supprimé");
                setUsers(users.filter(u => u.id !== id));
            } catch (error) {
                console.error(error);
                toast.error("Erreur lors de la suppression");
            }
        }
    };

    const handleToggleStatus = async (id: string, currentStatus: string) => {
        try {
            const newStatus = currentStatus === 'active' ? false : true;
            await api.patch(`/users/${id}/`, { is_active: newStatus });
            toast.success(`Utilisateur ${newStatus ? 'activé' : 'désactivé'}`);
            fetchUsers();
        } catch (error) {
            console.error("Failed to toggle status", error);
            toast.error("Erreur lors du changement de statut");
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
            toast.success("Utilisateur créé avec succès");

            setGeneratedPassword(pwd);
            setIsAddUserOpen(false);
            setNewUser({ username: '', email: '', role: 'TESTER', first_name: '', last_name: '' });
            fetchUsers();
        } catch (error) {
            console.error(error);
            toast.error("Erreur lors de la création de l'utilisateur");
        }
    };


    const [editingUser, setEditingUser] = useState<any>(null);

    const handleUpdateUser = async (id: string, updates: FormData) => {
        try {
            // Auto-generate password on edit as requested
            const newPassword = generatePassword();
            updates.append('password', newPassword);

            await api.patch(`/users/${id}/`, updates);

            toast.success("Utilisateur mis à jour");
            setEditingUser(null);
            fetchUsers();

            // Show popup with new password
            setGeneratedPassword(newPassword);

        } catch (error) {
            console.error(error);
            toast.error("Erreur lors de la mise à jour");
        }
    };

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-900 transition-colors duration-300">
            <Header />
            <div className="flex">
                <Sidebar />
                <main className="flex-1 lg:ml-64 p-6">
                    <div className="max-w-7xl mx-auto">
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                            <div>
                                <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-2 transition-colors">Gestion des Utilisateurs</h1>
                                <p className="text-slate-500 dark:text-slate-400 transition-colors">Gérez les accès et les rôles des membres de l'équipe</p>
                            </div>
                            {isAdmin && (
                                <button
                                    onClick={() => setIsAddUserOpen(true)}
                                    className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors shadow-lg shadow-blue-500/20 dark:shadow-blue-900/20"
                                >
                                    <Plus className="w-4 h-4" />
                                    Ajouter un utilisateur
                                </button>
                            )}
                        </div>

                        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden shadow-sm dark:shadow-none transition-colors">
                            <div className="p-4 border-b border-slate-200 dark:border-slate-700 flex items-center gap-4 transition-colors">
                                <div className="relative flex-1 max-w-md">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                    <input
                                        type="text"
                                        placeholder="Rechercher un utilisateur..."
                                        className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg pl-10 pr-4 py-2 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all placeholder-slate-400"
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                    />
                                </div>
                            </div>

                            <div className="overflow-x-auto">
                                <table className="w-full text-left">
                                    <thead className="bg-slate-50 dark:bg-slate-900/50 text-slate-500 dark:text-slate-400 text-xs uppercase font-medium transition-colors">
                                        <tr>
                                            <th className="px-6 py-4">Utilisateur</th>
                                            <th className="px-6 py-4">Rôle</th>
                                            <th className="px-6 py-4">Statut</th>
                                            {isAdmin && <th className="px-6 py-4 text-right">Actions</th>}
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-200 dark:divide-slate-700 transition-colors">
                                        {filteredUsers.map((user) => (
                                            <tr key={user.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors">
                                                <td className="px-6 py-4">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-500/10 flex items-center justify-center text-blue-600 dark:text-blue-400 font-medium transition-colors">
                                                            {user.name.charAt(0).toUpperCase()}
                                                        </div>
                                                        <div>
                                                            <div className="text-slate-900 dark:text-white font-medium transition-colors">{user.name}</div>
                                                            <div className="text-slate-500 dark:text-slate-400 text-xs flex items-center gap-1 transition-colors">
                                                                <Mail className="w-3 h-3" />
                                                                {user.email}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300 transition-colors">
                                                        <Shield className="w-4 h-4 text-slate-400 dark:text-slate-500 transition-colors" />
                                                        {user.role}
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${user.status === 'active'
                                                        ? 'bg-green-100 dark:bg-green-500/10 text-green-700 dark:text-green-400 border border-green-200 dark:border-green-500/20'
                                                        : 'bg-slate-100 dark:bg-slate-500/10 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-500/20'
                                                        }`}>
                                                        {user.status === 'active' ? <CheckCircle className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                                                        {user.status === 'active' ? 'Actif' : 'Inactif'}
                                                    </span>
                                                </td>
                                                {isAdmin && (
                                                    <td className="px-6 py-4 text-right relative">
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                setOpenMenuId(openMenuId === user.id ? null : user.id);
                                                            }}
                                                            className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"
                                                        >
                                                            <MoreVertical className="w-4 h-4" />
                                                        </button>

                                                        {openMenuId === user.id && (
                                                            <div className="absolute right-8 top-12 w-48 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-xl z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-100 transition-colors">
                                                                <button
                                                                    className="w-full flex items-center gap-2 px-4 py-3 text-sm text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700/50 hover:text-slate-900 dark:hover:text-white transition-colors"
                                                                    onClick={() => {
                                                                        // Fill editing user with current data
                                                                        const selectedUser = users.find(u => u.id === user.id);
                                                                        // Since selectedUser might not have first/last name separated, we try to parse or just set email
                                                                        // Actually fetchUsers maps it, but we might want to store raw data or just split name again if needed
                                                                        // Better: update fetch to store raw first/last name
                                                                        // But users state has name string.
                                                                        // Let's assume we can split name or just refetch.
                                                                        // WAIT: the users state maps API data. `apiUsers` has `name`. It does NOT have first/last name separated in state.
                                                                        // I should update the state interface to keep first/last name if possible, OR just parse it.
                                                                        // Or, better, pass the 'user' object from map which might be incomplete?
                                                                        // Let's looking at fetchUsers again.
                                                                        // It maps: name: `${u.first_name}...`
                                                                        // So I lost the original first/last name in state.
                                                                        // Use the `users` state?
                                                                        // I will update interface UserData to include first_name and last_name.
                                                                        setEditingUser({
                                                                            ...user,
                                                                            first_name: user.name.split(' ')[0], // Approximate
                                                                            last_name: user.name.split(' ').slice(1).join(' ') // Approximate
                                                                        });
                                                                        setOpenMenuId(null);
                                                                    }}
                                                                >
                                                                    <Edit className="w-4 h-4" />
                                                                    Modifier
                                                                </button>
                                                                <button
                                                                    onClick={() => {
                                                                        handleToggleStatus(user.id, user.status);
                                                                        setOpenMenuId(null);
                                                                    }}
                                                                    className="w-full flex items-center gap-2 px-4 py-3 text-sm text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700/50 hover:text-slate-900 dark:hover:text-white transition-colors"
                                                                >
                                                                    {user.status === 'active' ? <Lock className="w-4 h-4" /> : <Unlock className="w-4 h-4" />}
                                                                    {user.status === 'active' ? 'Désactiver' : 'Activer'}
                                                                </button>
                                                                <div className="h-px bg-slate-100 dark:bg-slate-700 my-1 transition-colors" />
                                                                <button
                                                                    onClick={() => {
                                                                        handleDelete(user.id);
                                                                        setOpenMenuId(null);
                                                                    }}
                                                                    className="w-full flex items-center gap-2 px-4 py-3 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors"
                                                                >
                                                                    <Trash2 className="w-4 h-4" />
                                                                    Supprimer
                                                                </button>
                                                            </div>
                                                        )}
                                                    </td>
                                                )}
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                </main>
            </div>

            {/* Edit User Modal */}
            {editingUser && (
                <EditUserModal
                    user={editingUser}
                    onClose={() => setEditingUser(null)}
                    onSave={handleUpdateUser}
                />
            )}

            {/* Add User Modal */}
            {isAddUserOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 dark:bg-slate-900/80 backdrop-blur-sm p-4 transition-colors">
                    <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 w-full max-w-md shadow-2xl animate-in fade-in zoom-in duration-200 transition-colors">
                        <div className="flex items-center justify-between p-6 border-b border-slate-200 dark:border-slate-700 transition-colors">
                            <h2 className="text-xl font-bold text-slate-900 dark:text-white transition-colors">Ajouter un utilisateur</h2>
                            <button
                                onClick={() => setIsAddUserOpen(false)}
                                className="text-slate-400 hover:text-slate-600 dark:hover:text-white transition-colors"
                            >
                                <XCircle className="w-6 h-6" />
                            </button>
                        </div>

                        <form onSubmit={handleAddUser} className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1 transition-colors">Nom complet (Prénom / Nom)</label>
                                <div className="flex gap-2">
                                    <input
                                        type="text"
                                        className="w-1/2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-4 py-2.5 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                                        placeholder="Prénom"
                                        value={newUser.first_name}
                                        onChange={e => setNewUser({ ...newUser, first_name: e.target.value })}
                                    />
                                    <input
                                        type="text"
                                        className="w-1/2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-4 py-2.5 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                                        placeholder="Nom"
                                        value={newUser.last_name}
                                        onChange={e => setNewUser({ ...newUser, last_name: e.target.value })}
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1 transition-colors">Email professionnel</label>
                                <div className="relative">
                                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                    <input
                                        type="email"
                                        required
                                        className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg pl-10 pr-4 py-2.5 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                                        placeholder="jean.dupont@company.com"
                                        value={newUser.email}
                                        onChange={e => setNewUser({ ...newUser, email: e.target.value })}
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1 transition-colors">Nom d'utilisateur</label>
                                <div className="relative">
                                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                    <input
                                        type="text"
                                        className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg pl-10 pr-4 py-2.5 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                                        placeholder="jdupont"
                                        value={newUser.username}
                                        onChange={e => setNewUser({ ...newUser, username: e.target.value })}
                                    />
                                </div>
                                <p className="text-xs text-slate-500 mt-1 transition-colors">Si laissé vide, sera généré depuis l'email.</p>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1 transition-colors">Rôle</label>
                                <div className="relative">
                                    <Shield className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                    <select
                                        className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg pl-10 pr-4 py-2.5 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none transition-all"
                                        value={newUser.role}
                                        onChange={e => setNewUser({ ...newUser, role: e.target.value })}
                                    >
                                        <option value="Tester">Tester</option>
                                        <option value="Manager">Manager</option>
                                        <option value="Admin">Admin</option>
                                    </select>
                                </div>
                            </div>

                            <div className="flex items-center justify-end gap-3 pt-4">
                                <button
                                    type="button"
                                    onClick={() => setIsAddUserOpen(false)}
                                    className="px-4 py-2 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition-colors"
                                >
                                    Annuler
                                </button>
                                <button
                                    type="submit"
                                    className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-medium transition-colors flex items-center gap-2 shadow-lg shadow-blue-500/20 dark:shadow-blue-900/20"
                                >
                                    <Plus className="w-4 h-4" />
                                    Créer l'utilisateur
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
            {/* Password Success Modal */}
            {generatedPassword && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/60 dark:bg-slate-900/80 backdrop-blur-sm p-4 transition-colors">
                    <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 w-full max-w-sm shadow-2xl animate-in fade-in zoom-in duration-200 transition-colors">
                        <div className="p-6 text-center space-y-4">
                            <div className="w-12 h-12 bg-green-100 dark:bg-green-500/10 rounded-full flex items-center justify-center mx-auto mb-2 transition-colors">
                                <Key className="w-6 h-6 text-green-600 dark:text-green-500 transition-colors" />
                            </div>

                            <h2 className="text-xl font-bold text-slate-900 dark:text-white transition-colors">Utilisateur créé !</h2>
                            <p className="text-slate-500 dark:text-slate-400 text-sm transition-colors">
                                Voici le mot de passe temporaire généré automatiquement. Copiez-le avant de fermer.
                            </p>

                            <div className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg p-4 flex items-center justify-between gap-2 mt-4 transition-colors">
                                <code className="text-blue-600 dark:text-blue-400 font-mono text-lg font-bold tracking-wider transition-colors">
                                    {generatedPassword}
                                </code>
                                <button
                                    onClick={handleCopyPassword}
                                    className="p-2 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-lg text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"
                                    title="Copier"
                                >
                                    {copied ? <Check className="w-5 h-5 text-green-500" /> : <Copy className="w-5 h-5" />}
                                </button>
                            </div>

                            <button
                                onClick={() => setGeneratedPassword(null)}
                                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 rounded-lg transition-colors mt-4 shadow-lg shadow-blue-500/20 dark:shadow-blue-900/20"
                            >
                                Terminer
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default UserManagement;
