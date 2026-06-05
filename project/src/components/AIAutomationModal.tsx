import React, { useState, useEffect, useRef } from 'react';
import { X, Sparkles, Play } from 'lucide-react';
import Button from './ui/Button';
import { executionService } from '../services/api';
import type { TestItem } from './ExecutionTestList';
import { motion } from 'framer-motion';

interface AIAutomationModalProps {
    test: TestItem;
    onClose: () => void;
    onUpdate: () => void;
}

const AIAutomationModal: React.FC<AIAutomationModalProps> = ({ test, onClose, onUpdate }) => {
    const [loading, setLoading] = useState(false);
    const [code, setCode] = useState<string>('');
    const [executing, setExecuting] = useState(false);
    const [executionResult, setExecutionResult] = useState<{status: string, logs: string} | null>(null);
    const [manualData, setManualData] = useState<string>('');
    const [liveLogs, setLiveLogs] = useState<string>('');
    
    const logsEndRef = useRef<HTMLPreElement>(null);

    useEffect(() => {
        if (logsEndRef.current) {
            logsEndRef.current.scrollTop = logsEndRef.current.scrollHeight;
        }
    }, [liveLogs]);

    const handleGenerate = async () => {
        if (!manualData.trim()) {
            alert("Veuillez saisir les données de test manuellement.");
            return;
        }
        setLoading(true);
        try {
            const res = await executionService.generateScript(test.id, manualData);
            setCode(res.data.code);
        } catch (error) {
            console.error("Error generating script", error);
            alert("Erreur lors de la génération IA");
        } finally {
            setLoading(false);
        }
    };

    const handleSaveAndExecute = async () => {
        setExecuting(true);
        setLiveLogs('');
        setExecutionResult(null);

        const protocol = window.location.protocol === 'https:' ? 'wss' : 'ws';
        const token = localStorage.getItem('access_token');
        const wsUrl = `${protocol}://${window.location.host}/ws/testcases/${test.id}/logs/${token ? `?token=${token}` : ''}`;
        
        let ws: WebSocket | null = null;
        try {
            ws = new WebSocket(wsUrl);
            ws.onmessage = (e) => {
                const data = JSON.parse(e.data);
                if (data.type === 'log') {
                    setLiveLogs(prev => prev + data.message);
                }
            };
            ws.onerror = (err) => {
                console.error("WS Error:", err);
            };

            // Attendre l'ouverture du WebSocket avant de lancer l'exécution (résout la race condition)
            await new Promise<void>((resolve) => {
                if (!ws) return resolve();
                let resolved = false;
                ws.onopen = () => {
                    if (!resolved) {
                        resolved = true;
                        resolve();
                    }
                };
                setTimeout(() => {
                    if (!resolved) {
                        resolved = true;
                        resolve(); // fallback
                    }
                }, 2000);
            });
        } catch (err) {
            console.error("Failed to connect WebSocket for logs", err);
        }

        try {
            await executionService.saveScript(test.id, code);
            const execRes = await executionService.executeScript(test.id);
            setExecutionResult(execRes.data);
            onUpdate();
        } catch (error) {
            console.error("Error executing script", error);
            alert("Erreur lors de l'exécution");
        } finally {
            setExecuting(false);
            if (ws) {
                ws.close();
            }
        }
    };

    return (
        <div className="fixed inset-0 z-[3000] flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-4">
            <motion.div 
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="bg-slate-50 dark:bg-[#0b0e14] border border-slate-300 dark:border-white/10 w-full max-w-4xl rounded-2xl overflow-hidden flex flex-col shadow-2xl max-h-[90vh]"
            >
                {/* Header */}
                <div className="flex justify-between items-center p-6 border-b border-slate-200 dark:border-white/5">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-amber-500/10 rounded-xl border border-amber-500/20 shadow-[0_0_15px_rgba(245,158,11,0.2)]">
                            <Sparkles className="w-6 h-6 text-amber-400" />
                        </div>
                        <div>
                            <h3 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">Automatisation IA</h3>
                            <p className="text-xs text-slate-400 mt-1 uppercase tracking-widest font-bold">{test.name}</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors bg-slate-100 dark:bg-white/5 p-2 rounded-full hover:bg-slate-200 dark:bg-white/10">
                        <X className="w-5 h-5" />
                    </button>
                </div>
                
                {/* Body */}
                <div className="p-8 flex flex-col gap-6 overflow-y-auto custom-scrollbar">
                    {!code ? (
                        <div className="flex flex-col items-center justify-center py-8 gap-6">
                            <div className="w-20 h-20 bg-amber-500/5 rounded-full flex items-center justify-center border border-amber-500/10 relative">
                                <Sparkles className="w-10 h-10 text-amber-400 absolute animate-pulse" />
                            </div>
                            <div className="text-center max-w-lg">
                                <h4 className="text-slate-900 dark:text-white font-bold text-lg mb-2">Générer le script d'automatisation</h4>
                                <p className="text-slate-400 text-sm leading-relaxed">
                                    Veuillez saisir ou coller les étapes et données de test (depuis votre fichier Excel) ci-dessous. L'Intelligence Artificielle va les analyser et générer un code exécutable Playwright.
                                </p>
                            </div>
                            
                            <div className="w-full max-w-2xl bg-slate-950 rounded-xl p-4 border border-slate-200 dark:border-white/5 focus-within:border-amber-500/30 transition-colors shadow-inner">
                                <textarea
                                    className="w-full bg-transparent text-slate-700 dark:text-slate-300 text-sm outline-none resize-y min-h-[150px] custom-scrollbar placeholder-slate-600"
                                    placeholder="Exemple:&#10;1. Aller sur la page de connexion&#10;2. Entrer l'email 'test@test.com'&#10;3. Vérifier que le bouton est actif..."
                                    value={manualData}
                                    onChange={(e) => setManualData(e.target.value)}
                                />
                            </div>
                            <Button 
                                onClick={handleGenerate} 
                                isLoading={loading}
                                className="bg-amber-500 hover:bg-amber-600 text-white shadow-[0_0_20px_rgba(245,158,11,0.3)] mt-4 px-8 py-4 text-sm uppercase tracking-widest font-bold rounded-xl"
                                leftIcon={<Sparkles className="w-5 h-5"/>}
                            >
                                Générer le code
                            </Button>
                        </div>
                    ) : (
                        <div className="flex flex-col gap-6">
                            <div className="flex items-center justify-between">
                                <p className="text-slate-700 dark:text-slate-300 text-sm font-medium">Vous pouvez modifier le code généré avant de l'exécuter :</p>
                                <span className="px-3 py-1 bg-emerald-500/10 text-emerald-400 text-[10px] uppercase font-black tracking-widest rounded-md border border-emerald-500/20">Playwright (TS)</span>
                            </div>
                            <div className="bg-slate-950 rounded-xl p-6 border border-slate-200 dark:border-white/5 relative group focus-within:border-amber-500/30 transition-colors shadow-inner">
                                <textarea 
                                    className="w-full bg-transparent text-amber-100 font-mono text-[13px] leading-relaxed outline-none resize-y min-h-[350px] custom-scrollbar"
                                    value={code}
                                    onChange={(e) => setCode(e.target.value)}
                                    spellCheck={false}
                                />
                            </div>
                            
                            {executing && (
                                <div className="p-4 rounded-xl border bg-slate-900 border-slate-200 dark:border-white/5 text-slate-700 dark:text-slate-300">
                                    <h4 className="font-bold text-sm mb-2 animate-pulse flex items-center gap-2 text-amber-400">
                                        <div className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
                                        Exécution en cours - Logs en direct...
                                    </h4>
                                    <pre ref={logsEndRef} className="text-xs whitespace-pre-wrap font-mono max-h-60 overflow-y-auto custom-scrollbar opacity-85">{liveLogs || 'Démarrage du conteneur de test...'}</pre>
                                </div>
                            )}

                            {executionResult && (
                                <div className={`p-4 rounded-xl border ${executionResult.status === 'PASSED' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-rose-500/10 border-rose-500/20 text-rose-400'}`}>
                                    <h4 className="font-bold text-sm mb-2">Résultat : {executionResult.status}</h4>
                                    <pre className="text-xs whitespace-pre-wrap font-mono max-h-40 overflow-y-auto custom-scrollbar opacity-80">{executionResult.logs}</pre>
                                </div>
                            )}

                            <div className="flex justify-end gap-4 mt-2">
                                <Button variant="secondary" onClick={onClose} className="px-6 rounded-xl">Fermer</Button>
                                <Button 
                                    onClick={handleSaveAndExecute}
                                    isLoading={executing}
                                    className="bg-blue-600 hover:bg-blue-500 text-white shadow-[0_0_15px_rgba(37,99,235,0.4)] px-8 rounded-xl font-bold uppercase tracking-widest text-[11px]"
                                    leftIcon={<Play className="w-4 h-4"/>}
                                >
                                    Enregistrer & Exécuter
                                </Button>
                            </div>
                        </div>
                    )}
                </div>
            </motion.div>
        </div>
    );
};

export default AIAutomationModal;
