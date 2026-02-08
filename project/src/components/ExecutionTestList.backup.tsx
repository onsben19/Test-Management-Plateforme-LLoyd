import React from 'react';
import { PlayCircle, CheckCircle, XCircle, Clock, User } from 'lucide-react';

export interface TestItem {
    id: string;
    name: string;
    module: string;
    assignee: string;
    status: 'passed' | 'failed' | 'running' | 'pending';
    duration: string;
    lastRun: string;
}

interface ExecutionTestListProps {
    onSelectTest: (test: TestItem) => void;
    selectedTestId?: string;
}

const mockTests: TestItem[] = [
    {
        id: '1',
        name: 'TC-001: Connexion utilisateur standard',
        module: 'Authentification',
        assignee: 'Thomas Anderson',
        status: 'passed',
        duration: '1.2s',
        lastRun: 'Il y a 2 min'
    },
    {
        id: '2',
        name: 'TC-004: Création de devis Auto',
        module: 'Devis',
        assignee: 'Sarah Connor',
        status: 'failed',
        duration: '4.5s',
        lastRun: 'Il y a 15 min'
    },
    {
        id: '3',
        name: 'TC-012: Validation paiement CB',
        module: 'Paiement',
        assignee: 'Ellen Ripley',
        status: 'running',
        duration: '-',
        lastRun: 'En cours...'
    },
    {
        id: '4',
        name: 'TC-002: Réinitialisation mot de passe',
        module: 'Authentification',
        assignee: 'Thomas Anderson',
        status: 'passed',
        duration: '2.1s',
        lastRun: 'Il y a 1h'
    },
    {
        id: '5',
        name: 'TC-008: Ajout conducteur secondaire',
        module: 'Souscription',
        assignee: 'Sarah Connor',
        status: 'pending',
        duration: '-',
        lastRun: 'Jamais'
    }
];

const ExecutionTestList: React.FC<ExecutionTestListProps> = ({ onSelectTest, selectedTestId }) => {
    const getStatusColor = (status: TestItem['status']) => {
        switch (status) {
            case 'passed': return 'text-green-400 bg-green-400/10';
            case 'failed': return 'text-red-400 bg-red-400/10';
            case 'running': return 'text-blue-400 bg-blue-400/10';
            default: return 'text-slate-400 bg-slate-400/10';
        }
    };

    const getStatusIcon = (status: TestItem['status']) => {
        switch (status) {
            case 'passed': return <CheckCircle className="w-4 h-4" />;
            case 'failed': return <XCircle className="w-4 h-4" />;
            case 'running': return <PlayCircle className="w-4 h-4 animate-spin-slow" />;
            default: return <Clock className="w-4 h-4" />;
        }
    };

    return (
        <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
                <table className="w-full text-left">
                    <thead>
                        <tr className="border-b border-slate-700/50 bg-slate-800/80">
                            <th className="p-4 text-xs font-semibold text-slate-400 uppercase tracking-wider">Test</th>
                            <th className="p-4 text-xs font-semibold text-slate-400 uppercase tracking-wider">Module</th>
                            <th className="p-4 text-xs font-semibold text-slate-400 uppercase tracking-wider">Assigné à</th>
                            <th className="p-4 text-xs font-semibold text-slate-400 uppercase tracking-wider">Statut</th>
                            <th className="p-4 text-xs font-semibold text-slate-400 uppercase tracking-wider">Durée</th>
                            <th className="p-4 text-xs font-semibold text-slate-400 uppercase tracking-wider">Dernière Exécution</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-700/50">
                        {mockTests.map((test) => (
                            <tr
                                key={test.id}
                                onClick={() => onSelectTest(test)}
                                className={`cursor-pointer transition-colors hover:bg-slate-700/30 ${selectedTestId === test.id ? 'bg-blue-600/10 hover:bg-blue-600/20' : ''
                                    }`}
                            >
                                <td className="p-4">
                                    <div className="flex items-center gap-3">
                                        <button
                                            className="p-1.5 rounded-full bg-blue-600/10 text-blue-400 hover:bg-blue-600 hover:text-white transition-all group-hover:scale-110"
                                            title="Démarrer l'exécution"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                onSelectTest(test); // Open details/execution panel
                                            }}
                                        >
                                            <PlayCircle className="w-4 h-4" />
                                        </button>
                                        <span className={`font-medium ${selectedTestId === test.id ? 'text-blue-400' : 'text-slate-200'}`}>
                                            {test.name}
                                        </span>
                                    </div>
                                </td>
                                <td className="p-4 text-slate-400 text-sm">{test.module}</td>
                                <td className="p-4">
                                    <div className="flex flex-col gap-1">
                                        <div className="flex items-center gap-2 text-slate-300 text-sm">
                                            <div className="w-6 h-6 rounded-full bg-slate-700 flex items-center justify-center">
                                                <User className="w-3 h-3" />
                                            </div>
                                            {test.assignee}
                                        </div>
                                        {/* Performance/Load Indicator */}
                                        <div className="w-24 h-1 bg-slate-700 rounded-full overflow-hidden ml-8">
                                            <div
                                                className="h-full bg-green-500 rounded-full"
                                                style={{ width: `${Math.random() * 60 + 20}%` }}
                                            />
                                        </div>
                                    </div>
                                </td>
                                <td className="p-4">
                                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${getStatusColor(test.status)}`}>
                                        {getStatusIcon(test.status)}
                                        <span className="capitalize">{test.status}</span>
                                    </span>
                                </td>
                                <td className="p-4 text-slate-400 text-sm font-mono">{test.duration}</td>
                                <td className="p-4 text-slate-400 text-sm">{test.lastRun}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default ExecutionTestList;
