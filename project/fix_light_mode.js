const fs = require('fs');
const path = require('path');

function processFile(filePath) {
    let content = fs.readFileSync(filePath, 'utf8');
    let original = content;

    // Backgrounds
    content = content.replace(/(?<!dark:)bg-white\/5(?!0)/g, 'bg-slate-100 dark:bg-white/5');
    content = content.replace(/(?<!dark:)bg-white\/10/g, 'bg-slate-200 dark:bg-white/10');
    content = content.replace(/(?<!dark:)bg-white\/20/g, 'bg-slate-300 dark:bg-white/20');
    content = content.replace(/(?<!dark:)bg-\[#0f172a\]/g, 'bg-white dark:bg-[#0f172a]');
    content = content.replace(/(?<!dark:)bg-\[#1e293b\]/g, 'bg-slate-50 dark:bg-[#1e293b]');
    content = content.replace(/(?<!dark:)bg-\[#162032\]/g, 'bg-slate-100 dark:bg-[#162032]');
    
    // Borders
    content = content.replace(/(?<!dark:)border-white\/5(?!0)/g, 'border-slate-200 dark:border-white/5');
    content = content.replace(/(?<!dark:)border-white\/10/g, 'border-slate-300 dark:border-white/10');
    content = content.replace(/(?<!dark:)border-white\/20/g, 'border-slate-400 dark:border-white/20');
    content = content.replace(/(?<!dark:)border-\[#334155\]/g, 'border-slate-200 dark:border-[#334155]');

    // Texts (Slate)
    content = content.replace(/(?<!dark:)text-slate-200/g, 'text-slate-800 dark:text-slate-200');
    content = content.replace(/(?<!dark:)text-slate-300/g, 'text-slate-700 dark:text-slate-300');
    content = content.replace(/(?<!dark:)text-\[#f1f5f9\]/g, 'text-slate-900 dark:text-[#f1f5f9]');
    content = content.replace(/(?<!dark:)text-\[#e2e8f0\]/g, 'text-slate-800 dark:text-[#e2e8f0]');
    content = content.replace(/(?<!dark:)text-\[#cbd5e1\]/g, 'text-slate-700 dark:text-[#cbd5e1]');
    content = content.replace(/(?<!dark:)text-\[#94a3b8\]/g, 'text-slate-500 dark:text-[#94a3b8]');
    content = content.replace(/(?<!dark:)text-\[#64748b\]/g, 'text-slate-600 dark:text-[#64748b]');

    // Hovers
    content = content.replace(/(?<!dark:)hover:bg-white\/5(?!0)/g, 'hover:bg-slate-100 dark:hover:bg-white/5');
    content = content.replace(/(?<!dark:)hover:bg-white\/10/g, 'hover:bg-slate-200 dark:hover:bg-white/10');
    content = content.replace(/(?<!dark:)hover:bg-\[#1e293b\]/g, 'hover:bg-slate-100 dark:hover:bg-[#1e293b]');

    // text-white is tricky. We'll find all classNames and conditionally replace text-white.
    content = content.replace(/className=(['"\`])(.*?)\1/g, (match, quote, classes) => {
        let classList = classes.split(/\s+/);
        
        // Check if this element has a solid colored background that requires white text
        const hasSolidBg = classList.some(c => 
            c.startsWith('bg-blue-') || 
            c.startsWith('bg-indigo-') || 
            c.startsWith('bg-purple-') || 
            c.startsWith('bg-rose-') || 
            c.startsWith('bg-red-') || 
            c.startsWith('bg-emerald-') || 
            c.startsWith('bg-teal-') || 
            c.startsWith('bg-amber-') || 
            c.startsWith('bg-orange-') || 
            c.startsWith('bg-[#3b82f6]') || 
            c.startsWith('bg-[#fb923c]') ||
            c.startsWith('from-') || // gradients
            c.startsWith('via-')
        );

        if (!hasSolidBg) {
            // It's safe to replace text-white with text-slate-900 dark:text-white
            classList = classList.map(c => {
                if (c === 'text-white') return 'text-slate-900 dark:text-white';
                if (c === 'hover:text-white') return 'hover:text-slate-900 dark:hover:text-white';
                if (c === 'group-hover:text-white') return 'group-hover:text-slate-900 dark:group-hover:text-white';
                return c;
            });
        }
        
        return `className=${quote}${classList.join(' ')}${quote}`;
    });

    if (content !== original) {
        fs.writeFileSync(filePath, content, 'utf8');
        console.log(`Updated: ${filePath}`);
    }
}

function walkDir(dir) {
    const files = fs.readdirSync(dir);
    for (const file of files) {
        const fullPath = path.join(dir, file);
        if (fs.statSync(fullPath).isDirectory()) {
            walkDir(fullPath);
        } else if (fullPath.endsWith('.tsx') || fullPath.endsWith('.ts')) {
            processFile(fullPath);
        }
    }
}

walkDir('./src/pages');
walkDir('./src/components');
console.log('Done!');
