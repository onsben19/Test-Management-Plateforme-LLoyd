import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ChevronDown, Search, Users, CheckCircle2, XCircle, Clock } from 'lucide-react';
import { userService } from '../../../services/api';
import api from '../../../services/api';

interface Tester {
    id: number;
    username: string;
    first_name: string;
    last_name: string;
    email: string;
    phone_number?: string;
    avatar?: string;
    is_active: boolean;
}

interface TesterStats {
    total: number;
    passed: number;
    failed: number;
    pending: number;
    passRate: number;
    // hierarchy: businessProject → release (project) → campaigns[]
    hierarchy: Record<string, Record<string, string[]>>;
}

const getAvatarUrl = (avatar?: string) => {
    if (!avatar) return null;
    if (avatar.startsWith('http') || avatar.startsWith('data:')) return avatar;
    return `/media/${avatar.replace(/^\/media\//, '')}`;
};

const Initials = ({ name, size = 'md' }: { name: string; size?: 'sm' | 'md' | 'lg' }) => {
    const parts = name.trim().split(' ');
    const initials = parts.length >= 2
        ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
        : name.slice(0, 2).toUpperCase();
    const sizeClass = size === 'sm' ? 'w-9 h-9 text-[11px]' : size === 'lg' ? 'w-14 h-14 text-lg' : 'w-11 h-11 text-sm';
    const colors = ['bg-blue-100 text-blue-700 dark:bg-blue-600/20 dark:text-blue-300', 'bg-emerald-100 text-emerald-700 dark:bg-emerald-600/20 dark:text-emerald-300', 'bg-amber-100 text-amber-700 dark:bg-amber-600/20 dark:text-amber-300', 'bg-rose-100 text-rose-700 dark:bg-rose-600/20 dark:text-rose-300', 'bg-indigo-100 text-indigo-700 dark:bg-indigo-600/20 dark:text-indigo-300', 'bg-cyan-100 text-cyan-700 dark:bg-cyan-600/20 dark:text-cyan-300'];
    const color = colors[name.charCodeAt(0) % colors.length];
    return (
        <div className={`${sizeClass} ${color} rounded-full flex items-center justify-center font-black shrink-0`}>
            {initials}
        </div>
    );
};

// ─── Accordion : one project row ─────────────────────────────────────────────
const ProjectAccordion = ({ projectName, campaigns }: { projectName: string; campaigns: string[] }) => {
    const [open, setOpen] = useState(false);
    return (
        <div className="rounded-xl overflow-hidden border border-slate-200 dark:border-white/[0.07]">
            <button
                onClick={() => setOpen(v => !v)}
                className="w-full flex items-center justify-between px-4 py-3 bg-slate-50 dark:bg-white/[0.04] hover:bg-slate-100 dark:hover:bg-white/[0.07] transition-colors text-left"
            >
                <span className="text-[12px] font-bold text-slate-900 dark:text-white/80">{projectName}</span>
                <div className="flex items-center gap-2">
                    <span className="text-[9px] font-black text-slate-500 dark:text-white/30 bg-slate-100 dark:bg-white/[0.06] px-2 py-0.5 rounded-full">{campaigns.length}</span>
                    <ChevronDown size={13} className={`text-slate-500 dark:text-white/30 transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
                </div>
            </button>
            <AnimatePresence>
                {open && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.18 }}
                        className="overflow-hidden"
                    >
                        <div className="px-4 py-2 space-y-1 bg-slate-50 dark:bg-white/[0.02] border-t border-slate-200 dark:border-white/[0.05]">
                            {campaigns.map((camp, i) => (
                                <div key={i} className="flex items-center gap-2.5 py-1.5 px-2 rounded-lg hover:bg-slate-100 dark:bg-white/[0.04] transition-colors">
                                    <span className="w-1 h-1 rounded-full bg-blue-400/50 shrink-0" />
                                    <span className="text-[11px] text-slate-600 dark:text-white/55 leading-tight">{camp}</span>
                                </div>
                            ))}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

// ─── Profile Panel ────────────────────────────────────────────────────────────
const TesterProfilePanel: React.FC<{ tester: Tester; onClose: () => void }> = ({ tester, onClose }) => {
    const [stats, setStats] = useState<TesterStats | null>(null);
    const [loading, setLoading] = useState(true);

    const fullName = [tester.first_name, tester.last_name].filter(Boolean).join(' ') || tester.username;
    const avatarUrl = getAvatarUrl(tester.avatar);

    useEffect(() => {
        const fetchStats = async () => {
            setLoading(true);
            try {
                const res = await api.get('/testcases/', { params: { tester_id: tester.id, page_size: 1000 } });
                const cases = res.data?.results ?? res.data ?? [];
                const passed = cases.filter((c: any) => c.status === 'PASSED').length;
                const failed = cases.filter((c: any) => c.status === 'FAILED').length;
                const pending = cases.filter((c: any) => c.status === 'PENDING').length;
                const executed = passed + failed;

                // Build hierarchy: businessProject → project(release) → campaigns[]
                const hierarchy: Record<string, Record<string, Set<string>>> = {};
                for (const c of cases) {
                    const bp = c.business_project_name || 'Sans projet';
                    const proj = c.project_name || 'Sans release';
                    const camp = c.campaign_title || 'Sans campagne';
                    if (!hierarchy[bp]) hierarchy[bp] = {};
                    if (!hierarchy[bp][proj]) hierarchy[bp][proj] = new Set();
                    hierarchy[bp][proj].add(camp);
                }

                // Convert Sets to arrays
                const cleanHierarchy: Record<string, Record<string, string[]>> = {};
                for (const [bp, projects] of Object.entries(hierarchy)) {
                    cleanHierarchy[bp] = {};
                    for (const [proj, camps] of Object.entries(projects)) {
                        cleanHierarchy[bp][proj] = Array.from(camps);
                    }
                }

                setStats({ total: cases.length, passed, failed, pending, passRate: executed > 0 ? Math.round((passed / executed) * 100) : 0, hierarchy: cleanHierarchy });
            } catch {
                setStats({ total: 0, passed: 0, failed: 0, pending: 0, passRate: 0, hierarchy: {} });
            } finally {
                setLoading(false);
            }
        };
        fetchStats();
    }, [tester.id]);

    const rateColor = !stats ? 'text-slate-400' : stats.passRate >= 80 ? 'text-emerald-400' : stats.passRate >= 50 ? 'text-amber-400' : 'text-rose-400';

    const totalProjects = stats ? Object.values(stats.hierarchy).reduce((acc, releases) => acc + Object.keys(releases).length, 0) : 0;

    return (
        <motion.div
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 30 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className="flex flex-col h-full bg-white dark:bg-[#10141f] border-l border-slate-200 dark:border-white/[0.07] overflow-y-auto custom-scrollbar"
        >
            <div className="h-px bg-gradient-to-r from-transparent via-blue-500/30 to-transparent" />

            {/* Header */}
            <div className="p-6 border-b border-slate-200 dark:border-white/[0.06] flex items-start justify-between gap-4">
                <div className="flex items-center gap-4">
                    {avatarUrl
                        ? <img src={avatarUrl} alt={fullName} className="w-14 h-14 rounded-full object-cover ring-2 ring-slate-200 dark:ring-white/10" />
                        : <Initials name={fullName} size="lg" />
                    }
                    <div>
                        <h3 className="text-[15px] font-black text-slate-900 dark:text-white tracking-tight">{fullName}</h3>
                        <p className="text-[11px] text-slate-500 dark:text-white/40 mt-0.5">{tester.email}</p>
                        {tester.phone_number && (
                            <p className="text-[11px] text-slate-500 dark:text-white/30 mt-0.5">{tester.phone_number}</p>
                        )}
                        <span className={`text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full mt-2 inline-block ${tester.is_active ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'}`}>
                            {tester.is_active ? 'Actif' : 'Inactif'}
                        </span>
                    </div>
                </div>
                <button onClick={onClose} className="p-2 bg-slate-100 dark:bg-white/[0.04] hover:bg-slate-200 dark:hover:bg-white/[0.08] border border-slate-200 dark:border-white/[0.06] rounded-xl transition-all text-slate-400 hover:text-slate-900 dark:hover:text-white shrink-0 mt-0.5">
                    <X size={15} />
                </button>
            </div>

            {/* KPIs */}
            <div className="p-5 border-b border-slate-200 dark:border-white/[0.06]">
                <p className="text-[8px] font-black text-slate-400 dark:text-white/25 uppercase tracking-[0.2em] mb-3">Activité</p>
                {loading ? (
                    <div className="grid grid-cols-2 gap-2">
                        {[...Array(4)].map((_, i) => <div key={i} className="h-14 bg-white dark:bg-white/[0.03] rounded-xl animate-pulse" />)}
                    </div>
                ) : (
                    <div className="grid grid-cols-2 gap-2">
                        <div className="p-3 bg-white dark:bg-white/[0.03] border border-slate-200 dark:border-white/[0.06] rounded-xl">
                            <div className="text-[8px] font-black text-slate-400 dark:text-white/25 uppercase tracking-widest mb-1">Total cas</div>
                            <div className="text-xl font-black text-slate-900 dark:text-white">{stats!.total}</div>
                        </div>
                        <div className="p-3 bg-white dark:bg-white/[0.03] border border-slate-200 dark:border-white/[0.06] rounded-xl">
                            <div className="text-[8px] font-black text-slate-400 dark:text-white/25 uppercase tracking-widest mb-1">Taux réussite</div>
                            <div className={`text-xl font-black ${rateColor}`}>{stats!.passRate}%</div>
                        </div>
                        <div className="p-3 bg-emerald-500/[0.06] border border-emerald-500/10 rounded-xl">
                            <div className="text-[8px] font-black text-slate-400 dark:text-white/25 uppercase tracking-widest mb-1">Réussis</div>
                            <div className="text-xl font-black text-emerald-400">{stats!.passed}</div>
                        </div>
                        <div className="p-3 bg-rose-500/[0.06] border border-rose-500/10 rounded-xl">
                            <div className="text-[8px] font-black text-slate-400 dark:text-white/25 uppercase tracking-widest mb-1">Échoués</div>
                            <div className="text-xl font-black text-rose-400">{stats!.failed}</div>
                        </div>
                    </div>
                )}

                {!loading && stats && stats.total > 0 && (
                    <div className="mt-3">
                        <div className="flex justify-between text-[8px] font-bold text-slate-400 dark:text-white/25 mb-1.5">
                            <span>Progression</span>
                            <span>{stats.passed + stats.failed} / {stats.total} exécutés</span>
                        </div>
                        <div className="h-1.5 rounded-full overflow-hidden bg-slate-200 dark:bg-white/[0.06] flex">
                            <div className="bg-emerald-500 transition-all duration-700" style={{ width: `${(stats.passed / stats.total) * 100}%` }} />
                            <div className="bg-rose-500 transition-all duration-700" style={{ width: `${(stats.failed / stats.total) * 100}%` }} />
                            <div className="bg-amber-400/40 transition-all duration-700" style={{ width: `${(stats.pending / stats.total) * 100}%` }} />
                        </div>
                        <div className="flex gap-3 mt-1.5">
                            {[['bg-emerald-500','Réussi'],['bg-rose-500','Échoué'],['bg-amber-400/60','En attente']].map(([c,l]) => (
                                <span key={l} className="flex items-center gap-1 text-[8px] text-slate-400 dark:text-white/25">
                                    <span className={`w-1.5 h-1.5 rounded-full ${c} inline-block`} />{l}
                                </span>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            {/* Hierarchy: BusinessProject → Release → Campagnes */}
            {!loading && stats && totalProjects > 0 && (
                <div className="p-5">
                    <p className="text-[8px] font-black text-slate-400 dark:text-white/25 uppercase tracking-[0.2em] mb-3">
                        Projets & Releases ({totalProjects})
                    </p>
                    <div className="space-y-4">
                        {Object.entries(stats.hierarchy).map(([bp, releases]) => (
                            <div key={bp}>
                                {/* Business project header */}
                                <p className="text-[9px] font-black text-slate-500 dark:text-white/40 uppercase tracking-wider mb-2 px-1">{bp}</p>
                                <div className="space-y-1.5">
                                    {Object.entries(releases).map(([releaseName, campaigns]) => (
                                        <ProjectAccordion
                                            key={releaseName}
                                            projectName={releaseName}
                                            campaigns={campaigns}
                                        />
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {!loading && stats && stats.total === 0 && (
                <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
                    <Clock size={26} className="text-slate-300 dark:text-white/10 mb-3" />
                    <p className="text-[11px] font-semibold text-slate-400 dark:text-white/25">Aucune activité enregistrée</p>
                </div>
            )}
        </motion.div>
    );
};

// ─── Main Tab ─────────────────────────────────────────────────────────────────
const TesterProfilesTab: React.FC = () => {
    const [testers, setTesters] = useState<Tester[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [selected, setSelected] = useState<Tester | null>(null);

    useEffect(() => {
        const load = async () => {
            setLoading(true);
            try {
                const res = await userService.getUsers({ role: 'TESTER', page_size: 1000 });
                setTesters(res.data?.results ?? res.data ?? []);
            } catch {
                setTesters([]);
            } finally {
                setLoading(false);
            }
        };
        load();
    }, []);

    const filtered = testers.filter(t =>
        `${t.first_name} ${t.last_name} ${t.username} ${t.email}`.toLowerCase().includes(search.toLowerCase())
    );

    return (
        <div className="flex rounded-2xl overflow-hidden border border-slate-200 dark:border-white/[0.07] bg-white dark:bg-[#0d1019]" style={{ minHeight: '580px' }}>

            {/* LEFT — list */}
            <div className={`flex flex-col transition-all duration-300 ${selected ? 'w-[300px] shrink-0' : 'flex-1'}`}>

                <div className="p-4 border-b border-slate-200 dark:border-white/[0.06]">
                    <div className="flex items-center justify-between mb-3">
                        <span className="text-[8px] font-black text-slate-500 dark:text-white/30 uppercase tracking-[0.2em]">Équipe</span>
                        <span className="px-2 py-0.5 bg-blue-500/10 border border-blue-500/20 rounded-full text-[9px] font-black text-blue-400">{testers.length}</span>
                    </div>
                    <div className="flex items-center gap-2 px-3 py-2 bg-slate-100 dark:bg-white/[0.04] border border-slate-200 dark:border-white/[0.06] rounded-xl">
                        <Search size={12} className="text-slate-400 dark:text-white/25 shrink-0" />
                        <input
                            type="text"
                            placeholder="Rechercher..."
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            className="flex-1 bg-transparent text-[12px] text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-white/20 outline-none border-none"
                        />
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto custom-scrollbar p-3 space-y-1.5">
                    {loading ? (
                        [...Array(6)].map((_, i) => <div key={i} className="h-14 bg-white dark:bg-white/[0.03] rounded-xl animate-pulse" />)
                    ) : filtered.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-16 text-center">
                            <Users size={28} className="text-slate-300 dark:text-white/10 mb-3" />
                            <p className="text-[11px] text-slate-400 dark:text-white/25">Aucun testeur</p>
                        </div>
                    ) : (
                        filtered.map((tester, idx) => {
                            const fullName = [tester.first_name, tester.last_name].filter(Boolean).join(' ') || tester.username;
                            const avatarUrl = getAvatarUrl(tester.avatar);
                            const isSelected = selected?.id === tester.id;
                            return (
                                <motion.button
                                    key={tester.id}
                                    initial={{ opacity: 0, y: 5 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: idx * 0.025 }}
                                    onClick={() => setSelected(isSelected ? null : tester)}
                                    className={`w-full flex items-center gap-3 p-3 rounded-xl border transition-all text-left
                                        ${isSelected
                                            ? 'bg-blue-50 dark:bg-blue-500/10 border-blue-200 dark:border-blue-500/25 text-blue-700 dark:text-blue-300'
                                            : 'bg-slate-50 dark:bg-white/[0.02] border-slate-200 dark:border-white/[0.05] hover:bg-slate-100 dark:hover:bg-white/[0.05] hover:border-slate-300 dark:hover:border-white/[0.1] text-slate-700 dark:text-white/70'
                                        }`}
                                >
                                    {avatarUrl
                                        ? <img src={avatarUrl} alt={fullName} className="w-9 h-9 rounded-full object-cover ring-1 ring-slate-200 dark:ring-white/10 shrink-0" />
                                        : <Initials name={fullName} size="sm" />
                                    }
                                    <div className="flex-1 min-w-0">
                                        <p className="text-[12px] font-bold truncate">{fullName}</p>
                                        <p className="text-[10px] text-slate-500 dark:text-white/30 truncate">{tester.email}</p>
                                    </div>
                                    <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${tester.is_active ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-white/20'}`} />
                                </motion.button>
                            );
                        })
                    )}
                </div>
            </div>

            {/* RIGHT — profile */}
            <AnimatePresence>
                {selected && (
                    <div className="flex-1 min-w-0">
                        <TesterProfilePanel tester={selected} onClose={() => setSelected(null)} />
                    </div>
                )}
            </AnimatePresence>

            {/* Placeholder when nothing selected */}
            {!selected && !loading && filtered.length > 0 && (
                <div className="hidden lg:flex flex-1 items-center justify-center p-10 border-l border-slate-200 dark:border-white/[0.05]">
                    <div className="text-center">
                        <div className="w-12 h-12 bg-white dark:bg-white/[0.03] border border-slate-200 dark:border-white/[0.06] rounded-2xl flex items-center justify-center mx-auto mb-3">
                            <Users size={18} className="text-slate-400 dark:text-white/15" />
                        </div>
                        <p className="text-[11px] text-slate-400 dark:text-white/20 font-semibold">Sélectionnez un testeur<br />pour voir son profil</p>
                    </div>
                </div>
            )}
        </div>
    );
};

export default TesterProfilesTab;
