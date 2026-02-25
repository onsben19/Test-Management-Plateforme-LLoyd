import React, { useState } from 'react';
import { ExternalLink, BarChart2, RefreshCw } from 'lucide-react';

// Pour ajouter un dashboard : Grafana → Dashboard → Share → Public dashboard → Copy URL
const DASHBOARDS = [
    {
        id: 'test-cases',
        title: 'Tests par Campagne',
        url: 'http://localhost:3000/public-dashboards/1bffec7a997245b2b9d92d9d580c6719',
        color: '#6366f1',
    },
    // Ajoutez vos autres dashboards ici :
    // { id: 'anomalies', title: 'Anomalies', url: 'http://localhost:3000/public-dashboards/...', color: '#ef4444' },
];

const GrafanaDashboard: React.FC = () => {
    const [activeId, setActiveId] = useState(DASHBOARDS[0].id);
    const [refreshKey, setRefreshKey] = useState(0);

    const current = DASHBOARDS.find(d => d.id === activeId)!;

    return (
        <div className="flex-1 bg-slate-900 flex flex-col overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-700 shrink-0">
                <div className="flex items-center gap-3">
                    <div className="p-2 rounded-xl bg-orange-500/20">
                        <BarChart2 className="text-orange-400" size={20} />
                    </div>
                    <div>
                        <h1 className="text-white font-bold text-lg">Dashboards Grafana</h1>
                        <p className="text-slate-400 text-xs">Visualisations en temps réel</p>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <button
                        onClick={() => setRefreshKey(k => k + 1)}
                        className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-slate-300 hover:text-white hover:border-slate-500 transition-all text-sm"
                    >
                        <RefreshCw size={13} />
                        Actualiser
                    </button>
                    <a
                        href={current.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-orange-600/20 border border-orange-600/30 text-orange-400 hover:bg-orange-600/30 transition-all text-sm"
                    >
                        <ExternalLink size={13} />
                        Ouvrir Grafana
                    </a>
                </div>
            </div>

            {/* Dashboard Tabs (shown only when multiple dashboards) */}
            {DASHBOARDS.length > 1 && (
                <div className="flex gap-2 px-6 py-3 border-b border-slate-700/50 shrink-0">
                    {DASHBOARDS.map(d => (
                        <button
                            key={d.id}
                            onClick={() => setActiveId(d.id)}
                            className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${activeId === d.id
                                ? 'text-white'
                                : 'bg-slate-800 text-slate-400 hover:text-white border border-slate-700'
                                }`}
                            style={activeId === d.id ? { background: d.color } : {}}
                        >
                            {d.title}
                        </button>
                    ))}
                </div>
            )}

            {/* Grafana iframe - full height */}
            <div className="flex-1 overflow-hidden">
                <iframe
                    key={`${activeId}-${refreshKey}`}
                    src={current.url}
                    width="100%"
                    height="100%"
                    frameBorder="0"
                    title={current.title}
                    style={{ display: 'block', background: '#161719' }}
                />
            </div>
        </div>
    );
};

export default GrafanaDashboard;
