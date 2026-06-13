const fs = require('fs');
const filePath = 'src/pages/Anomalies.tsx';
let content = fs.readFileSync(filePath, 'utf8');

// 1. Fix the syntax highlighting inline logic
content = content.replace(
    `.replace(/\\b(import|from|const|let|var|await|async|function|return|if|else|for|while|try|catch)\\b/g, '<span class=text-pink-400>$1</span>')
                                  .replace(/\\b(test|expect|page|locator|click|fill|goto|toBeVisible|toContainText|first|catch|timeout|Promise|all)\\b/g, '<span class=text-blue-400>$1</span>')
                                  .replace(/(['"\`])(.*?)\\1/g, '<span class=text-emerald-400>$&</span>')
                                  .replace(/([{}()\\[\\]])/g, '<span class=text-amber-400>$1</span>')
                                  .replace(/(?<!-)\\b(\\d+)\\b/g, '<span class=text-purple-400>$1</span>')`,
    `.replace(/\\b(import|from|const|let|var|await|async|function|return|if|else|for|while|try|catch)\\b/g, '<span style="color:#f472b6">$1</span>')
                                  .replace(/\\b(test|expect|page|locator|click|fill|goto|toBeVisible|toContainText|first|catch|timeout|Promise|all)\\b/g, '<span style="color:#60a5fa">$1</span>')
                                  .replace(/(?<!=)(['"\`])(.*?)\\1/g, '<span style="color:#34d399">$&</span>')
                                  .replace(/([{}()\\[\\]])/g, '<span style="color:#fbbf24">$1</span>')
                                  .replace(/(?<!-)\\b(\\d+)\\b/g, '<span style="color:#c084fc">$1</span>')`
);

// 2 & 3. Replace the buttons
const oldButtonsBlock = `                              {an.execution_logs && (
                                  <button
                                      onClick={(e) => {
                                          e.stopPropagation();
                                          setLogModal({ title: \`Logs d'exécution — \${an.title}\`, content: an.execution_logs! });
                                      }}
                                      className="px-3 py-1.5 bg-slate-100 dark:bg-white/5 text-slate-500 dark:text-slate-400 hover:text-blue-500 dark:hover:text-blue-400 hover:bg-blue-500/10 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all border border-slate-200 dark:border-white/10"
                                  >
                                      Logs
                                  </button>
                              )}
                              {an.playwright_script && (
                                  <button
                                      onClick={(e) => {
                                          e.stopPropagation();
                                          setLogModal({ title: \`Code Source — \${an.title}\`, content: an.playwright_script! });
                                      }}
                                      className="px-3 py-1.5 bg-slate-100 dark:bg-white/5 text-slate-500 dark:text-slate-400 hover:text-indigo-500 dark:hover:text-indigo-400 hover:bg-indigo-500/10 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all border border-slate-200 dark:border-white/10"
                                  >
                                      Code
                                  </button>
                              )}
                              {!an.execution_logs && !an.playwright_script && (
                                  <span className="text-slate-600 font-bold uppercase tracking-widest text-[9px] opacity-40">-</span>
                              )}`;

const newButtonsBlock = `                              <button
                                  onClick={(e) => {
                                      e.stopPropagation();
                                      setLogModal({ title: \`Logs d'exécution — \${an.title}\`, content: an.execution_logs || "Aucun log d'exécution disponible." });
                                  }}
                                  className="px-3 py-1.5 bg-slate-100 dark:bg-white/5 text-slate-500 dark:text-slate-400 hover:text-blue-500 dark:hover:text-blue-400 hover:bg-blue-500/10 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all border border-slate-200 dark:border-white/10"
                              >
                                  Logs
                              </button>
                              <button
                                  onClick={(e) => {
                                      e.stopPropagation();
                                      setLogModal({ title: \`Code Source — \${an.title}\`, content: an.playwright_script || "Aucun code source disponible." });
                                  }}
                                  className="px-3 py-1.5 bg-slate-100 dark:bg-white/5 text-slate-500 dark:text-slate-400 hover:text-indigo-500 dark:hover:text-indigo-400 hover:bg-indigo-500/10 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all border border-slate-200 dark:border-white/10"
                              >
                                  Code
                              </button>`;

content = content.replace(oldButtonsBlock, newButtonsBlock);

// Remove Info button
const oldInfoButton = `                            <Button
                              variant="secondary"
                              size="icon"
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedAnomaly(an);
                              }}
                              icon={Info}
                              title="Voir détails"
                              className="rounded-xl"
                            />`;
content = content.replace(oldInfoButton, "");

fs.writeFileSync(filePath, content, 'utf8');
console.log('Successfully updated Anomalies.tsx');
