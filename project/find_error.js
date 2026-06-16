const fs = require('fs');
const code = fs.readFileSync('src/pages/ChatCenter.tsx', 'utf8');

let stack = [];
for (let i = 0; i < code.length; i++) {
    const char = code[i];
    if (char === '(' || char === '{' || char === '[') {
        stack.push({ char, index: i });
    } else if (char === ')' || char === '}' || char === ']') {
        const last = stack[stack.length - 1];
        if (
            (char === ')' && last?.char === '(') ||
            (char === '}' && last?.char === '{') ||
            (char === ']' && last?.char === '[')
        ) {
            stack.pop();
        } else {
            console.log('Mismatch at char', char, 'index', i, 'last was', last);
        }
    }
}
console.log('Unclosed:', stack.filter(s => s.index > 5000));
