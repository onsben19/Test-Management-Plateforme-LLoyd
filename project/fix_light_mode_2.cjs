const fs = require('fs');
const path = require('path');

function processFile(filePath) {
    let content = fs.readFileSync(filePath, 'utf8');
    let original = content;

    // Dark backgrounds matching bg-[#0...] or bg-[#1...] or bg-[#2...]
    content = content.replace(/(?<!dark:)bg-\[#(0|1|2)[0-9a-fA-F]{5}\](\/[0-9]+)?(?!0)/g, 'bg-slate-50 dark:$&');
    content = content.replace(/(?<!dark:)hover:bg-\[#(0|1|2)[0-9a-fA-F]{5}\](\/[0-9]+)?(?!0)/g, 'hover:bg-slate-100 dark:$&');
    
    // Dark borders matching border-[#...]
    content = content.replace(/(?<!dark:)border-\[#(0|1|2|3)[0-9a-fA-F]{5}\](\/[0-9]+)?(?!0)/g, 'border-slate-200 dark:$&');

    // Opacity backgrounds
    content = content.replace(/(?<!dark:)bg-white\/\[0\.0[0-9]\]/g, 'bg-slate-50 dark:$&');
    content = content.replace(/(?<!dark:)bg-white\/\[0\.1[0-9]\]/g, 'bg-slate-100 dark:$&');
    
    // Opacity borders
    content = content.replace(/(?<!dark:)border-white\/\[0\.0[0-9]\]/g, 'border-slate-200 dark:$&');
    content = content.replace(/(?<!dark:)border-white\/\[0\.1[0-9]\]/g, 'border-slate-300 dark:$&');

    // Fix multiple dark: dark: if applied by mistake previously
    content = content.replace(/dark:dark:/g, 'dark:');
    content = content.replace(/bg-slate-50 dark:bg-slate-50 dark:/g, 'bg-slate-50 dark:');

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
