import React, { useState, useEffect, useRef } from 'react';
import { X, Sparkles, User, ListChecks, Code2, Copy, Check, Edit2, Play, Calendar, AlertTriangle, FileIcon, CheckCircle, XCircle, Layers, RefreshCw, Loader, WandSparkles, Maximize2, Terminal, ShieldAlert, ExternalLink } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
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
  inline?: boolean;
  onViewAnomaly?: (anomalyId: number) => void;
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
  liveLogs = '',
  inline = false,
  onViewAnomaly,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [isCodeModalOpen, setIsCodeModalOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [isReformulating, setIsReformulating] = useState(false);
  const logsRef = useRef<HTMLDivElement>(null);

  // Auto-scroll logs to bottom when they update
  useEffect(() => {
    if (logsRef.current) {
      logsRef.current.scrollTop = logsRef.current.scrollHeight;
    }
  }, [liveLogs]);

  // Debug: track showExecutionLog changes
  const showExecutionLog = executingCode || executionResult !== null;
  useEffect(() => {
    console.log(`[VCT DEBUG] isOpen=${isOpen}, executingCode=${executingCode}, hasResult=${executionResult !== null}, showExecutionLog=${showExecutionLog}`);
  });

  if (!isOpen) {
    console.log('[VCT DEBUG] returning null — isOpen is false!');
    return null;
  }

  const handleCopy = () => {
    if (!testCaseForm.code) return;
    navigator.clipboard.writeText(testCaseForm.code);
    setCopied(true);
    setTimeout(() => setCopied(false), 1000);
  };

const highlightPlaywrightCode = (rawCode: string) => {
  if (!rawCode) return '';
  
  // Escape HTML to prevent injection / breaking layout
  let escaped = rawCode
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

  // Tokenize comments
  const comments: string[] = [];
  escaped = escaped.replace(/(\/\/.*|\/\*[\s\S]*?\*\/)/g, (match) => {
    comments.push(match);
    return `__COMMENT_PLACEHOLDER_${comments.length - 1}__`;
  });

  // Tokenize string literals (single, double quotes and backticks)
  const strings: string[] = [];
  escaped = escaped.replace(/(["'`])(.*?)\1/g, (match) => {
    strings.push(match);
    return `__STRING_PLACEHOLDER_${strings.length - 1}__`;
  });

  // Highlight keywords safely
  escaped = escaped
    .replace(/\b(import|export|from|const|let|var|function|class|return|await|async|if|else|for|while|try|catch|new|test|describe)\b/g, 
      '<span class="text-[#7dd3fc] font-semibold">$1</span>') // Light blue keywords
    .replace(/\b(expect|page)\b/g, 
      '<span class="text-[#c084fc] font-semibold">$1</span>') // Purple expect/page
    .replace(/\b(goto|click|fill|locator|getByRole|getByText|getByPlaceholder|getByLabel|getByTestId|toBeVisible|toContainText|toHaveURL|toHaveTitle|toHaveCount|isChecked|isDisabled|isEnabled|isVisible|press|type)\b/g, 
      '<span class="text-[#34d399] font-medium">$1</span>'); // Emerald functions

  // Restore strings and comments with proper highlight styling
  escaped = escaped.replace(/__STRING_PLACEHOLDER_(\d+)__/g, (_, index) => {
    const original = strings[parseInt(index, 10)];
    return `<span class="text-[#fca5a5]">${original}</span>`; // Light red strings
  });

  escaped = escaped.replace(/__COMMENT_PLACEHOLDER_(\d+)__/g, (_, index) => {
    const original = comments[parseInt(index, 10)];
    return `<span class="text-slate-500 italic">${original}</span>`; // Slate comments
  });

  return escaped;
};

  const renderHighlightedCode = () => {
    if (!testCaseForm.code) return null;
    return (
      <pre 
        className="w-full font-mono text-xs leading-relaxed whitespace-pre-wrap text-slate-700 dark:text-slate-300 overflow-x-auto"
        dangerouslySetInnerHTML={{ __html: highlightPlaywrightCode(testCaseForm.code) }}
      />
    );
  };

  // ── Execution log view (replaces form while running / after result) ──────
  const executionLogView = (
    <div className="bg-[#0d1117] max-w-2xl w-full rounded-2xl overflow-hidden flex flex-col shadow-2xl max-h-[90vh] border border-white/10">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-white/[0.07] shrink-0">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-blue-500/10 border border-blue-500/20">
            <Terminal className="w-4 h-4 text-blue-400" />
          </div>
          <div>
            <h3 className="text-sm font-black text-white uppercase tracking-widest">Exécution Playwright</h3>
            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mt-0.5">
              {testCaseForm.test_case_ref || 'Cas de test'}
            </p>
          </div>
        </div>
        {/* Status badge */}
        {executingCode && (
          <div className="flex items-center gap-2 px-3 py-1.5 bg-blue-500/10 border border-blue-500/20 rounded-full">
            <div className="w-2 h-2 rounded-full bg-blue-400 animate-pulse" />
            <span className="text-[10px] font-black text-blue-400 uppercase tracking-widest">En cours...</span>
          </div>
        )}
        {!executingCode && executionResult?.status === 'PASSED' && (
          <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-500/10 border border-emerald-500/20 rounded-full">
            <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
            <span className="text-[10px] font-black text-emerald-400 uppercase tracking-widest">Succès</span>
          </div>
        )}
        {!executingCode && executionResult?.status === 'FAILED' && (
          <div className="flex items-center gap-2 px-3 py-1.5 bg-rose-500/10 border border-rose-500/20 rounded-full">
            <ShieldAlert className="w-3.5 h-3.5 text-rose-400" />
            <span className="text-[10px] font-black text-rose-400 uppercase tracking-widest">Échec — Anomalie créée</span>
          </div>
        )}
      </div>

      {/* Terminal logs */}
      <div
        ref={logsRef}
        className="flex-1 overflow-y-auto p-5 font-mono text-[11px] leading-relaxed text-green-300/90 bg-[#0d1117] min-h-[260px] max-h-[420px]"
        style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}
      >
        {executingCode && !liveLogs && (
          <span className="text-slate-500 animate-pulse">▶ Démarrage du runner Playwright...</span>
        )}
        {liveLogs || executionResult?.logs || ''}
        {executingCode && (
          <span className="inline-block w-2 h-3.5 bg-green-400 ml-0.5 animate-pulse" />
        )}
      </div>

      {/* Result summary */}
      {!executingCode && executionResult && (
        <div className={`mx-5 mb-4 mt-2 p-4 rounded-xl border flex items-start gap-3 ${
          executionResult.status === 'PASSED'
            ? 'bg-emerald-500/5 border-emerald-500/20'
            : 'bg-rose-500/5 border-rose-500/20'
        }`}>
          {executionResult.status === 'PASSED' ? (
            <CheckCircle className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
          ) : (
            <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
          )}
          <div>
            <p className={`text-xs font-black uppercase tracking-wider ${executionResult.status === 'PASSED' ? 'text-emerald-400' : 'text-rose-400'}`}>
              {executionResult.status === 'PASSED'
                ? 'Test validé avec succès !'
                : "Le test a échoué — Une anomalie a été déclarée automatiquement par l'IA."}
            </p>
            {executionResult.status === 'FAILED' && (
              <p className="text-[10px] text-slate-400 mt-1">
                L'anomalie a été analysée et documentée. Consultez-la pour voir le diagnostic complet.
              </p>
            )}
          </div>
        </div>
      )}

      {/* Footer buttons */}
      <div className="px-5 py-4 border-t border-white/[0.07] flex items-center justify-end gap-3 shrink-0">
        {executingCode && (
          <div className="flex items-center gap-2 text-slate-400 text-xs font-bold mr-auto">
            <Loader className="w-3.5 h-3.5 animate-spin" />
            Exécution en cours, veuillez patienter...
          </div>
        )}
        <button
          type="button"
          onClick={onClose}
          disabled={executingCode}
          className="px-5 py-2.5 bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 hover:text-white rounded-xl text-xs font-black uppercase tracking-widest transition-all disabled:opacity-30 disabled:cursor-not-allowed"
        >
          Fermer
        </button>
        {!executingCode && executionResult?.status === 'FAILED' && executionResult?.anomaly_id && onViewAnomaly && (
          <button
            type="button"
            onClick={() => onViewAnomaly(executionResult.anomaly_id)}
            className="px-5 py-2.5 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-black uppercase tracking-widest transition-all flex items-center gap-2 shadow-lg shadow-rose-900/40"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            Voir l'anomalie
          </button>
        )}
      </div>
    </div>
  );
  // ─────────────────────────────────────────────────────────────────────────

  const mainContent = (
    <div className={`bg-white dark:bg-[#0f172a] max-w-2xl w-full rounded-2xl overflow-hidden flex flex-col ${inline ? 'border border-slate-200 dark:border-white/10' : 'shadow-2xl max-h-[90vh]'}`}>
        
        {/* Header */}
        <div className="p-6 pb-4 relative shrink-0">
          <button 
            onClick={onClose}
            className="absolute top-6 right-6 p-2 bg-slate-50 dark:bg-[#1e293b] text-slate-900 dark:text-white rounded-full transition-colors flex items-center gap-1 text-xs font-bold"
          >
            {inline ? "← Retour" : <X className="w-5 h-5" />}
          </button>
          
          <h2 className="text-xl font-bold text-slate-900 dark:text-white uppercase tracking-wider mb-3">Valider un cas de test</h2>
          
          <div className="flex items-center flex-wrap gap-3 text-xs text-slate-500 dark:text-[#64748b]">
            <span className="flex items-center gap-1.5">{campaign?.project_name || 'Projet global'}</span>
            <span className="w-[1px] h-3 bg-slate-700"></span>
            <span className="flex items-center gap-1.5"><Calendar className="w-4 h-4" /> {campaign?.title || 'Campagne'}</span>
            <span className="w-[1px] h-3 bg-slate-700"></span>
            <span className="flex items-center gap-1.5"><User className="w-4 h-4" /> Manager: {campaign?.manager || campaign?.manager_name || 'Non défini'}</span>
          </div>
        </div>

        {campaign?.restants === 0 ? (
            <div className="p-8 text-center space-y-4 flex flex-col items-center justify-center">
                <div className="w-16 h-16 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-[#5DCAA5] flex items-center justify-center">
                    <CheckCircle className="w-8 h-8" />
                </div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white uppercase tracking-wider">Validation terminée</h3>
                <p className="text-sm text-slate-500 dark:text-slate-400 max-w-md leading-relaxed">
                    Toutes les étapes et cas de test de cette campagne ont été validés à 100%. Il n'y a plus aucun cas de test à valider.
                </p>
                <button
                    onClick={onClose}
                    className="mt-4 px-6 py-2.5 bg-slate-100 dark:bg-white/10 hover:bg-slate-200 dark:hover:bg-white/15 text-slate-900 dark:text-white rounded-lg text-xs font-semibold uppercase tracking-wider transition-all"
                >
                    Fermer
                </button>
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
                        Validation automatisée (IA)
                        </button>
                        <button
                        type="button"
                        onClick={() => setTestCaseForm((p: any) => ({ ...p, executionType: 'manual' }))}
                        className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-black tracking-wider uppercase transition-colors ${testCaseForm.executionType === 'manual' ? 'bg-[#3b82f6] text-white shadow-[0_0_15px_rgba(59,130,246,0.4)]' : 'text-slate-500 dark:text-[#64748b] hover:text-slate-700 dark:text-slate-300'}`}
                        >
                        Validation manuelle
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
                                <label className="text-[10px] uppercase tracking-widest text-blue-500 font-bold flex items-center gap-2">
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
                                            {isReformulating ? <Loader className="w-4 h-4 animate-spin text-blue-400" /> : <WandSparkles className="w-4 h-4 group-hover/btn:scale-110 transition-transform" />}
                                            <span className="text-[10px] font-black uppercase tracking-widest hidden sm:block">Améliorer</span>
                                        </button>
                                    </div>
                                </div>
                            </div>

                            {!testCaseForm.code ? (
                                <button
                                    type="button"
                                    onClick={handleGenerateScript}
                                    className="w-full py-4 border border-blue-500/50 text-blue-500 rounded-xl font-bold uppercase transition-all flex items-center justify-center gap-3 disabled:opacity-50 hover:bg-blue-500/10"
                                >
                                    {generatingCode && (
                                        <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                                    )}
                                    {generatingCode ? "Génération IA en cours..." : "Générer le script d'automatisation"}
                                </button>
                            ) : (
                                <div className="space-y-3">
                                    <div className="flex items-center gap-2 text-blue-500">
                                        <Code2 className="w-4 h-4" />
                                        <h3 className="text-xs font-bold uppercase tracking-wider">Code Playwright (Modifiable)</h3>
                                    </div>
                                    
                                    <div className="bg-slate-50 dark:bg-[#1e293b] border border-slate-200 dark:border-[#334155] rounded-lg overflow-hidden flex flex-col">
                                        <div className="bg-slate-100 dark:bg-[#162032] border-b border-slate-200 dark:border-[#334155] px-4 py-3 flex items-center justify-between">
                                            <div className="flex items-center gap-2 text-blue-500 text-sm font-medium">
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
                                                    onClick={() => setIsCodeModalOpen(true)}
                                                    className="flex items-center gap-1.5 px-3 py-1.5 bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-[#334155] text-slate-600 dark:text-[#94a3b8] hover:text-slate-900 dark:hover:text-white rounded text-xs font-medium transition-colors"
                                                    title="Agrandir le code"
                                                >
                                                    <Maximize2 className="w-3.5 h-3.5" />
                                                    Agrandir
                                                </button>
                                                <button 
                                                    type="button"
                                                    onClick={() => setIsEditing(!isEditing)}
                                                    className={`flex items-center gap-1.5 px-3 py-1.5 bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-[#334155] rounded text-xs font-medium transition-colors ${isEditing ? 'text-slate-900 dark:text-white border-blue-500/50' : 'text-slate-600 dark:text-[#94a3b8] hover:text-slate-900 dark:hover:text-white'}`}
                                                >
                                                    <Edit2 className="w-3.5 h-3.5" />
                                                    {isEditing ? 'Valider' : 'Éditer'}
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
                        className={`w-full py-4 rounded-[2rem] uppercase tracking-[0.2em] font-black flex items-center justify-center gap-3 transition-all shadow-xl active:scale-95 ${testCaseForm.executionType === 'ai' ? 'bg-blue-600 text-white hover:bg-blue-500 shadow-[0_0_20px_rgba(37,99,235,0.3)]' : 'bg-[#3b82f6] text-white hover:bg-blue-600 shadow-[0_0_20px_rgba(59,130,246,0.3)]'} disabled:opacity-50`}
                    >
                        {executingCode ? (
                            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        ) : testCaseForm.executionType === 'ai' ? (
                            <Play className="w-5 h-5 fill-white" />
                        ) : (
                            <CheckCircle className="w-5 h-5" />
                        )}
                        {executingCode ? "Exécution en cours — voir les logs..." : (testCaseForm.executionType === 'ai' ? "Exécuter & Enregistrer" : "Enregistrer")}
                    </button>
                </div>
            </form>
        )}
    </div>
  );

    return (
    <>
      {inline ? (
        <div className="w-full max-w-2xl mx-auto py-2">
          {showExecutionLog ? executionLogView : mainContent}
        </div>
      ) : (
        <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-[100] p-4">
          {showExecutionLog ? executionLogView : mainContent}
        </div>
      )}

      <AnimatePresence>
        {isCodeModalOpen && (
          <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-[250] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-[#111827] border border-white/10 rounded-2xl max-w-4xl w-full overflow-hidden flex flex-col shadow-2xl max-h-[85vh]"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="p-6 pb-4 border-b border-white/[0.08] flex items-center justify-between relative shrink-0">
                <div className="flex items-center gap-2">
                  <Code2 className="w-5 h-5 text-blue-500" />
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">Agrandir le Code Playwright</h3>
                </div>
                <div className="flex items-center gap-3">
                  <button 
                    type="button" 
                    onClick={() => setIsEditing(!isEditing)}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-500/10 border border-blue-500/20 text-blue-500 hover:bg-blue-500/20 rounded text-xs font-semibold tracking-wider uppercase transition-colors"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                    {isEditing ? 'Valider' : 'Éditer'}
                  </button>
                  <button 
                    type="button"
                    onClick={() => setIsCodeModalOpen(false)}
                    className="p-1 text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors"
                  >
                    <X className="w-6 h-6" />
                  </button>
                </div>
              </div>

              {/* Content */}
              <div className="p-6 overflow-y-auto flex-1 bg-slate-50 dark:bg-[#0f172a]/50">
                {isEditing ? (
                  <textarea
                    value={testCaseForm.code}
                    onChange={(e) => setTestCaseForm({ ...testCaseForm, code: e.target.value })}
                    className="w-full min-h-[400px] h-[50vh] bg-transparent text-slate-600 dark:text-[#94a3b8] font-mono text-xs leading-relaxed resize-none outline-none border border-slate-200 dark:border-[#334155] rounded-lg p-4 custom-scrollbar"
                    spellCheck={false}
                  />
                ) : (
                  <pre 
                    className="text-slate-700 dark:text-slate-300 whitespace-pre-wrap font-mono text-xs leading-relaxed p-4"
                    dangerouslySetInnerHTML={{ __html: highlightPlaywrightCode(testCaseForm.code) }}
                  />
                )}
              </div>

              {/* Footer */}
              <div className="p-4 border-t border-slate-200 dark:border-[#334155] flex justify-end shrink-0 gap-3">
                <button 
                  type="button"
                  onClick={() => setIsCodeModalOpen(false)}
                  className="px-5 py-2 bg-slate-100 dark:bg-white/10 hover:bg-slate-200 dark:hover:bg-white/15 text-slate-900 dark:text-white rounded-lg text-xs font-semibold uppercase tracking-wider transition-colors"
                >
                  Fermer
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
};

export default ValidateCasDeTest;
