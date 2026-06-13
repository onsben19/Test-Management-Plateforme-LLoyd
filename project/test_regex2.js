const content = `const x = 100;\nif (x > 50) {\n  console.log("Hello 123");\n}`;

const html = content
    .replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/\b(import|from|const|let|var|await|async|function|return|if|else|for|while|try|catch)\b/g, '<span style=color:#f472b6>$1</span>')
    .replace(/\b(test|expect|page|locator|click|fill|goto|toBeVisible|toContainText|first|catch|timeout|Promise|all)\b/g, '<span style=color:#60a5fa>$1</span>')
    .replace(/(['"`])(.*?)\1/g, '<span style=color:#34d399">$&</span>') // wait, I still had quotes here!
    .replace(/([{}()\[\]])/g, '<span style=color:#fbbf24>$1</span>')
    .replace(/(?<!-)\b(\d+)\b/g, '<span style=color:#c084fc>$1</span>');

console.log(html);
