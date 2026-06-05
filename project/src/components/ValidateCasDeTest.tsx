import React, { useState, useEffect, useRef } from 'react';
import { X, Sparkles, User, ListChecks, Code2, Copy, Check, Edit2, Play, Calendar, AlertTriangle, FileIcon, CheckCircle, XCircle, Layers, RefreshCw, Loader, Wand2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { aiService } from '../services/api';

interface ValidateCasDeTestProps {
  isOpen: boolean;
  onClose: () => void;
  campaign: any;
  testCaseForm: any;
  setTestCaseForm: any;
  handleGenerateScript: () => void;
  handleSubmit: (e: any) => void;
  executingCode: boolean;
  generatingCode: boolean;
  executionResult: any;
  setExecutionResult: any;
  liveLogs?: string;
}

const ValidateCasDeTest: React.FC<ValidateCasDeTestProps> = ({
  isOpen,
  onClose,
  campaign,
  testCaseForm,
  setTestCaseForm,
  handleGenerateScript,
  handleSubmit,
  executingCode,
  generatingCode,
  executionResult,
  setExecutionResult,
  liveLogs = ''
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [copied, setCopied] = useState(false);
  const [isReformulating, setIsReformulating] = useState(false);
  const navigate = useNavigate();

  const logsEndRef = useRef<HTMLPreElement>(null);

  useEffect(() => {
    if (logsEndRef.current) {
      logsEndRef.current.scrollTop = logsEndRef.current.scrollHeight;
    }
  }, [liveLogs]);

  if (!isOpen) return null;

  const handleCopy = () => {
    if (!testCaseForm.code) return;
    navigator.clipboard.writeText(testCaseForm.code);
    setCopied(true);
    setTimeout(() => setCopied(false), 1000);
  };

  const renderHighlightedCode = () => {
    if (!testCaseForm.code) return null;
    return testCaseForm.code.split('\n').map((line: string, i: number) => {
      if (line.trim().startsWith('//')) {
        return <div key={i} className="text-slate-500 dark:text-[#475569]">{line}</div>;
      }
      let highlightedLine = line
        .replace(/\b(const|let|var|await|async)\b/g, '<span class="text-[#7dd3fc]">$1</span>')
        .replace(/\b(expect|page|getByRole|toContainText|not|toHaveURL|toBeVisible)\b/g, '<span class="text-[#86efac]">$1</span>')
        .replace(/'([^']*)'/g, '<span class="text-[#fca5a5]">\'$1\'</span>')
        .replace(/\/([^\/]*)\//g, '<span class="text-[#fca5a5]">/$1/</span>');
      return <div key={i} dangerouslySetInnerHTML={{ __html: highlightedLine || ' ' }} />;
    });
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-[100] p-4">
      <div className="bg-white dark:bg-[#0f172a] max-w-2xl w-full rounded-2xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="p-6 pb-4 relative shrink-0">
          <button 
            onClick={onClose}
            className="absolute top-6 right-6 p-2 bg-slate-50 dark:bg-[#1e293b] text-slate-900 dark:text-white rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
          
          <h2 className="text-xl font-bold text-slate-900 dark:text-white uppercase tracking-wider mb-3">Valider un cas de test</h2>
          
          <div className="flex items-center flex-wrap gap-3 text-xs text-slate-500 dark:text-[#64748b]">
            <span className="flex items-center gap-1.5"><span className="w-4 h-4 text-slate-500">🛡️</span> {campaign?.project_name || 'Projet global'}</span>
            <span className="w-[1px] h-3 bg-slate-700"></span>
            <span className="flex items-center gap-1.5"><Calendar className="w-4 h-4" /> {campaign?.title || 'Campagne'}</span>
            <span className="w-[1px] h-3 bg-slate-700"></span>
            <span className="flex items-center gap-1.5"><User className="w-4 h-4" /> Manager: {campaign?.manager_name || 'Non défini'}</span>
          </div>
        </div>

        {/* execution result */}
        {executionResult ? (
            <div className="p-6 overflow-y-auto custom-scrollbar space-y-6">
                <div className={`p-6 rounded-xl border-2 flex items-center gap-4 ${executionResult.status === 'PASSED' ? 'bg-emerald-500/10 border-emerald-500 text-emerald-400' : 'bg-rose-500/10 border-rose-500 text-rose-400'}`}>
                    {executionResult.status === 'PASSED' ? <CheckCircle className="w-8 h-8" /> : <AlertTriangle className="w-8 h-8" />}
                    <div>
                        <h3 className="font-black tracking-widest uppercase">{executionResult.status === 'PASSED' ? 'Exécution Réussie' : 'Exécution Échouée'}</h3>
                        <p className="text-sm opacity-80">{executionResult.status === 'PASSED' ? 'Le test a été validé avec succès.' : 'Une anomalie a été déclarée automatiquement avec ces logs.'}</p>
                    </div>
                </div>

                <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Logs d'exécution</label>
                    <pre className="w-full bg-slate-50 dark:bg-[#1e293b] border border-slate-200 dark:border-[#334155] rounded-xl px-6 py-4 text-slate-800 dark:text-slate-300 font-mono text-[11px] overflow-y-auto max-h-64 whitespace-pre-wrap">
                        {executionResult.logs}
                    </pre>
                </div>

                <div className="flex gap-4 w-full">
                    <button
                        onClick={() => {
                            setExecutionResult(null);
                            onClose();
                        }}
                        className="flex-1 py-4 text-slate-900 dark:text-white bg-slate-100 dark:bg-white/10 hover:bg-slate-300 dark:bg-white/20 rounded-xl font-black tracking-[0.2em] uppercase transition-all"
                    >
                        Fermer
                    </button>
                    {executionResult.status === 'FAILED' && executionResult.anomaly_id && (
                        <button
                           onClick={() => {
                               navigate('/anomalies', { state: { openAnomalyId: executionResult.anomaly_id } });
                               onClose();
                           }}
                           className="flex-1 py-4 text-white bg-rose-500 hover:bg-rose-600 rounded-xl font-black tracking-[0.2em] uppercase transition-all shadow-lg shadow-rose-500/20"
                        >
                            Voir l'anomalie
                        </button>
                    )}
                </div>
            </div>
        ) : executingCode ? (
            <div className="p-6 overflow-y-auto custom-scrollbar space-y-6">
                <div className="p-6 rounded-xl border bg-slate-950 border-slate-200 dark:border-white/5 text-slate-700 dark:text-slate-300">
                    <h3 className="font-bold text-sm mb-4 animate-pulse flex items-center gap-2 text-amber-400">
                        <div className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
                        Exécution Playwright en cours...
                    </h3>
                    <pre ref={logsEndRef} className="w-full bg-slate-50 dark:bg-[#1e293b] border border-slate-200 dark:border-[#334155] rounded-xl px-6 py-4 text-slate-800 dark:text-slate-300 font-mono text-[11px] overflow-y-auto max-h-64 whitespace-pre-wrap">
                        {liveLogs || 'Démarrage du conteneur de test...'}
                    </pre>
                </div>
            </div>
        ) : (
            <form onSubmit={handleSubmit} className="flex flex-col overflow-hidden">
                <div className="p-6 pt-2 overflow-y-auto custom-scrollbar space-y-6">
                    
                    {/* Tabs */}
                    <div className="bg-slate-50 dark:bg-[#1e293b] p-1 rounded-xl flex gap-1">
                        <button
                        type="button"
                        onClick={() => setTestCaseForm((p: any) => ({ ...p, executionType: 'ai' }))}
                        className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-black tracking-wider uppercase transition-colors ${testCaseForm.executionType === 'ai' ? 'bg-slate-50 dark:bg-[#1e293b] text-slate-900 dark:text-slate-300 border border-slate-200 dark:border-white/5' : 'text-slate-500 dark:text-[#64748b] hover:text-slate-700 dark:text-slate-300'}`}
                        >
                        <Sparkles className="w-4 h-4" /> Validation automatisée (IA)
                        </button>
                        <button
                        type="button"
                        onClick={() => setTestCaseForm((p: any) => ({ ...p, executionType: 'manual' }))}
                        className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-black tracking-wider uppercase transition-colors ${testCaseForm.executionType === 'manual' ? 'bg-[#3b82f6] text-white shadow-[0_0_15px_rgba(59,130,246,0.4)]' : 'text-slate-500 dark:text-[#64748b] hover:text-slate-700 dark:text-slate-300'}`}
                        >
                        <User className="w-4 h-4" /> Validation manuelle
                        </button>
                    </div>

                    {/* Reference Input */}
                    <div className="space-y-2">
                        <label className="text-[10px] uppercase tracking-widest text-slate-500 font-bold block">Nom du cas de test / Référence</label>
                        <input 
                        required
                        type="text" 
                        value={testCaseForm.test_case_ref}
                        onChange={(e) => setTestCaseForm({ ...testCaseForm, test_case_ref: e.target.value })}
                        placeholder="Ex: TC-001 Connexion" className="w-full bg-slate-50 dark:bg-[#1e293b] border border-slate-200 dark:border-[#334155] text-slate-900 dark:text-[#f1f5f9] rounded-lg px-4 py-3 outline-none focus:border-blue-500/50 transition-colors font-bold"
                        />
                    </div>

                    {testCaseForm.executionType === 'manual' ? (
                        <div className="space-y-6 animate-fade-in">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Preuve d'exécution / Capture</label>
                                <div className="flex items-center gap-3">
                                    <label className={`flex-1 cursor-pointer border-2 border-dashed rounded-xl p-4 text-center transition-all ${testCaseForm.anomaly_file ? 'border-[#f97316] bg-[#f97316]/10' : 'border-slate-200 dark:border-[#334155] hover:bg-slate-50 dark:bg-[#1e293b]'}`}>
                                        <input
                                            type="file"
                                            accept="image/*, .pdf, .docx"
                                            onChange={(e) => {
                                                if (e.target.files && e.target.files[0]) {
                                                    setTestCaseForm({ ...testCaseForm, anomaly_file: e.target.files[0] });
                                                }
                                            }}
                                            className="hidden"
                                        />
                                        <span className="text-[10px] font-black text-slate-600 dark:text-[#94a3b8] uppercase tracking-widest truncate block">
                                            {testCaseForm.anomaly_file ? testCaseForm.anomaly_file.name : "Cliquez pour ajouter une capture"}
                                        </span>
                                    </label>
                                    {testCaseForm.anomaly_file && (
                                        <button
                                            type="button"
                                            onClick={() => setTestCaseForm({ ...testCaseForm, anomaly_file: null })}
                                            className="p-4 bg-rose-500/10 border border-rose-500/20 text-rose-500 rounded-xl transition-all"
                                        >
                                            <XCircle className="w-5 h-5" />
                                        </button>
                                    )}
                                </div>
                            </div>

                            <div className="space-y-3">
                                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Statut de l'exécution</label>
                                <div className="grid grid-cols-2 gap-4">
                                    <button
                                        type="button"
                                        onClick={() => setTestCaseForm({ ...testCaseForm, status: 'PASSED' })}
                                        className={`p-5 rounded-2xl border-2 flex items-center justify-center gap-3 transition-all ${testCaseForm.status === 'PASSED' ? 'bg-emerald-500/10 border-emerald-500 text-emerald-400 shadow-lg shadow-emerald-500/10' : 'bg-slate-50 dark:bg-[#1e293b]/50 border-transparent text-slate-500 hover:bg-slate-50 dark:bg-[#1e293b]'}`}
                                    >
                                        <CheckCircle className="w-5 h-5" />
                                        <span className="text-xs font-black tracking-widest uppercase">Succès (Valide)</span>
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setTestCaseForm({ ...testCaseForm, status: 'FAILED' })}
                                        className={`p-5 rounded-2xl border-2 flex items-center justify-center gap-3 transition-all ${testCaseForm.status === 'FAILED' ? 'bg-rose-900/40 border-rose-500 text-rose-400 shadow-lg shadow-rose-500/10' : 'bg-slate-50 dark:bg-[#1e293b]/50 border-transparent text-slate-500 hover:bg-slate-50 dark:bg-[#1e293b]'}`}
                                    >
                                        <AlertTriangle className="w-5 h-5" />
                                        <span className="text-xs font-black tracking-widest uppercase">Échec (Invalid)</span>
                                    </button>
                                </div>
                            </div>

                            {testCaseForm.status === 'FAILED' && (
                                <div className="bg-slate-50 dark:bg-[#1e293b]/30 border border-rose-500/50 rounded-2xl p-6 space-y-6 animate-fade-in">
                                    <div className="flex items-center gap-3 text-rose-500">
                                        <AlertTriangle className="w-5 h-5" />
                                        <h3 className="text-xs font-black tracking-widest uppercase">Déclaration d'anomalie</h3>
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Titre de l'anomalie</label>
                                        <input
                                            type="text"
                                            required
                                            value={testCaseForm.anomaly_title}
                                            onChange={e => setTestCaseForm({ ...testCaseForm, anomaly_title: e.target.value })}
                                            className="w-full bg-slate-50 dark:bg-[#1e293b] text-slate-900 dark:text-white rounded-lg px-4 py-3 outline-none focus:border-rose-500/50 transition-colors"
                                        />
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Impact</label>
                                            <select
                                                value={testCaseForm.anomaly_impact}
                                                onChange={e => setTestCaseForm({ ...testCaseForm, anomaly_impact: e.target.value })}
                                                className="w-full bg-slate-50 dark:bg-[#1e293b] text-slate-900 dark:text-white rounded-lg px-4 py-3 outline-none focus:border-rose-500/50 transition-colors appearance-none"
                                            >
                                                <option value="BLOQUANTES">BLOQUANTES</option>
                                                <option value="CRITIQUE">CRITIQUE</option>
                                                <option value="MAJEUR">MAJEUR</option>
                                                <option value="MINEURS">MINEURS</option>
                                                <option value="SIMPLE">SIMPLE</option>
                                                <option value="FONCTIONNALITE">FONCTIONNALITÉ</option>
                                            </select>
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Priorité</label>
                                            <select
                                                value={testCaseForm.anomaly_priority}
                                                onChange={e => setTestCaseForm({ ...testCaseForm, anomaly_priority: e.target.value })}
                                                className="w-full bg-slate-50 dark:bg-[#1e293b] text-slate-900 dark:text-white rounded-lg px-4 py-3 outline-none focus:border-rose-500/50 transition-colors appearance-none"
                                            >
                                                <option value="IMMEDIATE">IMMÉDIATE</option>
                                                <option value="URGENTE">URGENTE</option>
                                                <option value="ELEVEE">ÉLEVÉE</option>
                                                <option value="NORMALE">NORMALE</option>
                                                <option value="BASSE">BASSE</option>
                                            </select>
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Visibilité</label>
                                            <select
                                                value={testCaseForm.anomaly_visibility}
                                                onChange={e => setTestCaseForm({ ...testCaseForm, anomaly_visibility: e.target.value })}
                                                className="w-full bg-slate-50 dark:bg-[#1e293b] text-slate-900 dark:text-white rounded-lg px-4 py-3 outline-none focus:border-rose-500/50 transition-colors appearance-none"
                                            >
                                                <option value="PUBLIQUE">PUBLIQUE</option>
                                                <option value="PRIVEE">PRIVÉE</option>
                                            </select>
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Description</label>
                                        <textarea
                                            required
                                            value={testCaseForm.anomaly_description}
                                            onChange={e => setTestCaseForm({ ...testCaseForm, anomaly_description: e.target.value })}
                                            className="w-full bg-slate-50 dark:bg-[#1e293b] text-slate-900 dark:text-white rounded-lg px-4 py-3 outline-none focus:border-rose-500/50 transition-colors min-h-[100px]"
                                        />
                                    </div>
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="space-y-6 animate-fade-in">
                            <div className="space-y-2">
                                <label className="text-[10px] uppercase tracking-widest text-[#fb923c] font-bold flex items-center gap-2">
                                    <ListChecks className="w-4 h-4" /> Données du test (Étapes et valeurs)
                                </label>
                                <div className="relative group">
                                    <textarea 
                                        required
                                        value={testCaseForm.manualData}
                                        onChange={(e) => setTestCaseForm({ ...testCaseForm, manualData: e.target.value })}
                                        placeholder="Saisissez les étapes issues d'Excel. Ex: 1. Ouvrir login, 2. Email admin@admin.com..."
                                        className="w-full bg-slate-50 dark:bg-[#1e293b] border border-slate-200 dark:border-[#334155] text-slate-900 dark:text-[#f1f5f9] rounded-2xl pl-4 pr-6 pb-16 pt-4 outline-none focus:border-blue-500/50 transition-colors min-h-[140px] text-sm resize-none custom-scrollbar"
                                        data-gramm="false"
                                        spellCheck="false"
                                    />
                                    <div className="absolute right-4 bottom-4">
                                        <button
                                            type="button"
                                            onClick={async () => {
                                                if (!testCaseForm.manualData || isReformulating) return;
                                                setIsReformulating(true);
                                                try {
                                                    const res = await aiService.reformulate(testCaseForm.manualData, false, true);
                                                    if (res.data?.reformulated_message) {
                                                        setTestCaseForm({ ...testCaseForm, manualData: res.data.reformulated_message });
                                                    }
                                                } catch (e) {
                                                    console.error(e);
                                                } finally {
                                                    setIsReformulating(false);
                                                }
                                            }}
                                            disabled={!testCaseForm.manualData || isReformulating}
                                            className="flex items-center gap-2 p-3 rounded-2xl text-slate-400 hover:text-blue-400 bg-slate-100 dark:bg-white/5 hover:bg-blue-500/10 border border-slate-200 dark:border-[#334155] hover:border-blue-500/20 shadow-sm transition-all disabled:opacity-30 disabled:cursor-not-allowed group/btn backdrop-blur-md"
                                            title="Reformuler avec l'IA"
                                        >
                                            {isReformulating ? <Loader className="w-4 h-4 animate-spin text-blue-400" /> : <Wand2 className="w-4 h-4 group-hover/btn:scale-110 transition-transform" />}
                                            <span className="text-[10px] font-black uppercase tracking-widest hidden sm:block">Améliorer</span>
                                        </button>
                                    </div>
                                </div>
                            </div>

                            {!testCaseForm.code ? (
                                <button
                                    type="button"
                                    onClick={handleGenerateScript}
                                    disabled={generatingCode}
                                    className="w-full py-4 border border-[#fb923c]/50 text-[#fb923c] rounded-xl font-bold uppercase transition-all flex items-center justify-center gap-3 disabled:opacity-50 hover:bg-[#fb923c]/10"
                                >
                                    {generatingCode ? (
                                        <div className="w-5 h-5 border-2 border-[#fb923c] border-t-transparent rounded-full animate-spin" />
                                    ) : (
                                        <Sparkles className="w-5 h-5" />
                                    )}
                                    {generatingCode ? "Génération IA en cours..." : "Générer le script d'automatisation"}
                                </button>
                            ) : (
                                <div className="space-y-3">
                                    <div className="flex items-center gap-2 text-[#fb923c]">
                                        <Code2 className="w-4 h-4" />
                                        <h3 className="text-xs font-bold uppercase tracking-wider">Code Playwright (Modifiable)</h3>
                                    </div>
                                    
                                    <div className="bg-slate-50 dark:bg-[#1e293b] border border-slate-200 dark:border-[#334155] rounded-lg overflow-hidden flex flex-col">
                                        <div className="bg-slate-100 dark:bg-[#162032] border-b border-slate-200 dark:border-[#334155] px-4 py-3 flex items-center justify-between">
                                            <div className="flex items-center gap-2 text-[#fb923c] text-sm font-medium">
                                                <Code2 className="w-4 h-4" /> playwright.spec.ts
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <button 
                                                    type="button"
                                                    onClick={handleGenerateScript}
                                                    disabled={generatingCode}
                                                    className="flex items-center gap-1.5 px-3 py-1.5 bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-[#334155] text-emerald-500 hover:text-emerald-400 rounded text-xs font-medium transition-colors disabled:opacity-50"
                                                    title="Régénérer avec l'IA"
                                                >
                                                    {generatingCode ? <div className="w-3.5 h-3.5 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
                                                    Régénérer
                                                </button>
                                                <button 
                                                    type="button"
                                                    onClick={handleCopy}
                                                    className="flex items-center gap-1.5 px-3 py-1.5 bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-[#334155] text-slate-600 dark:text-[#94a3b8] hover:text-slate-900 dark:hover:text-white rounded text-xs font-medium transition-colors"
                                                >
                                                    {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                                                    {copied ? 'Copié !' : 'Copier'}
                                                </button>
                                                <button 
                                                    type="button"
                                                    onClick={() => setIsEditing(!isEditing)}
                                                    className={`flex items-center gap-1.5 px-3 py-1.5 bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-[#334155] rounded text-xs font-medium transition-colors ${isEditing ? 'text-slate-900 dark:text-white border-orange-500/50' : 'text-slate-600 dark:text-[#94a3b8] hover:text-slate-900 dark:hover:text-white'}`}
                                                >
                                                    <Edit2 className="w-3.5 h-3.5" />
                                                    Éditer
                                                </button>
                                            </div>
                                        </div>
                                        
                                        <div className="p-4 relative min-h-[160px] bg-white dark:bg-[#0f172a]/50">
                                            {isEditing ? (
                                                <textarea
                                                    value={testCaseForm.code}
                                                    onChange={(e) => setTestCaseForm({ ...testCaseForm, code: e.target.value })}
                                                    className="w-full h-full min-h-[160px] bg-transparent text-slate-600 dark:text-[#94a3b8] font-mono text-xs resize-none outline-none leading-relaxed"
                                                    spellCheck={false}
                                                />
                                            ) : (
                                                <div className="w-full font-mono text-xs leading-relaxed whitespace-pre-wrap text-slate-700 dark:text-slate-300">
                                                    {renderHighlightedCode()}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                    <div className="text-xs text-slate-600 dark:text-[#94a3b8] bg-slate-50 dark:bg-[#1a56db]/10 p-4 rounded-xl border border-slate-200 dark:border-[#1a56db]/20 flex items-start gap-3">
                                        <AlertTriangle className="w-4 h-4 text-[#1a56db] shrink-0 mt-0.5" />
                                        <p>
                                            Une fois le code exécuté, le statut sera déterminé <strong>automatiquement</strong> (Succès/Échec). En cas d'échec, une anomalie sera déclarée et détaillée par l'IA d'après les logs.
                                        </p>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                <div className="p-6 border-t border-slate-200 dark:border-[#334155] shrink-0">
                    <button 
                        type="submit"
                        disabled={executingCode}
                        className={`w-full py-4 rounded-[2rem] uppercase tracking-[0.2em] font-black flex items-center justify-center gap-3 transition-all shadow-xl active:scale-95 ${testCaseForm.executionType === 'ai' ? 'bg-[#fb923c] text-white hover:bg-[#f97316] shadow-[0_0_20px_rgba(251,146,60,0.3)]' : 'bg-[#3b82f6] text-white hover:bg-blue-600 shadow-[0_0_20px_rgba(59,130,246,0.3)]'} disabled:opacity-50`}
                    >
                        {executingCode ? (
                            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        ) : testCaseForm.executionType === 'ai' ? (
                            <Play className="w-5 h-5 fill-white" />
                        ) : (
                            <CheckCircle className="w-5 h-5" />
                        )}
                        {executingCode ? "Exécution en cours..." : (testCaseForm.executionType === 'ai' ? "Exécuter & Enregistrer" : "Enregistrer")}
                    </button>
                </div>
            </form>
        )}
      </div>
    </div>
  );
};

export default ValidateCasDeTest;
