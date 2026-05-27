import re

with open("project/src/components/ValidateCasDeTest.tsx", "r") as f:
    content = f.read()

# Fix tabs: active manual tab should be blue
content = content.replace(
    "`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-colors ${testCaseForm.executionType === 'manual' ? 'bg-[#f97316] text-white' : 'text-[#64748b] hover:text-slate-300'}`",
    "`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-black tracking-wider uppercase transition-colors ${testCaseForm.executionType === 'manual' ? 'bg-[#3b82f6] text-white shadow-[0_0_15px_rgba(59,130,246,0.4)]' : 'text-[#64748b] hover:text-slate-300'}`"
)
content = content.replace(
    "`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-colors ${testCaseForm.executionType === 'ai' ? 'bg-[#f97316] text-white' : 'text-[#64748b] hover:text-slate-300'}`",
    "`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-black tracking-wider uppercase transition-colors ${testCaseForm.executionType === 'ai' ? 'bg-[#1e293b] text-slate-300 border border-white/5' : 'text-[#64748b] hover:text-slate-300'}`"
)

# Reference Input Placeholder
content = content.replace(
    'className="w-full bg-[#1e293b] border border-[#334155] text-[#f1f5f9] rounded-lg px-4 py-3 outline-none focus:border-orange-500/50 transition-colors"',
    'placeholder="Ex: TC-001 Connexion" className="w-full bg-[#1e293b] border border-[#334155] text-[#f1f5f9] rounded-lg px-4 py-3 outline-none focus:border-blue-500/50 transition-colors font-bold"'
)

# Fix Preuve d'execution
content = content.replace("Preuve d'exécution (Optionnel)", "Preuve d'exécution / Capture")
content = content.replace("Ajouter une capture", "Cliquez pour ajouter une capture")

# Fix Statut buttons text
content = content.replace(">Succès</span>", ">Succès (Valide)</span>")
content = content.replace(">Échec</span>", ">Échec (Invalid)</span>")

# Fix Statut button colors
content = content.replace(
    "`p-4 rounded-xl border-2 flex items-center justify-center gap-3 transition-all ${testCaseForm.status === 'PASSED' ? 'bg-emerald-500/10 border-emerald-500 text-emerald-400' : 'bg-[#1e293b] border-[#334155] text-slate-500 hover:border-slate-600'}`",
    "`p-5 rounded-2xl border-2 flex items-center justify-center gap-3 transition-all ${testCaseForm.status === 'PASSED' ? 'bg-emerald-500/10 border-emerald-500 text-emerald-400 shadow-lg shadow-emerald-500/10' : 'bg-[#1e293b]/50 border-transparent text-slate-500 hover:bg-[#1e293b]'}`"
)
content = content.replace(
    "`p-4 rounded-xl border-2 flex items-center justify-center gap-3 transition-all ${testCaseForm.status === 'FAILED' ? 'bg-rose-500/10 border-rose-500 text-rose-400' : 'bg-[#1e293b] border-[#334155] text-slate-500 hover:border-slate-600'}`",
    "`p-5 rounded-2xl border-2 flex items-center justify-center gap-3 transition-all ${testCaseForm.status === 'FAILED' ? 'bg-rose-900/40 border-rose-500 text-rose-400 shadow-lg shadow-rose-500/10' : 'bg-[#1e293b]/50 border-transparent text-slate-500 hover:bg-[#1e293b]'}`"
)

# Fix Declaration d'anomalie title
content = content.replace(">Déclaration d'anomalie</h3>", ">Déclaration d'anomalie</h3>")

with open("project/src/components/ValidateCasDeTest.tsx", "w") as f:
    f.write(content)
