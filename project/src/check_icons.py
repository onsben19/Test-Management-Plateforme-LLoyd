
import os
import re

def check_lucide_imports(directory):
    for root, dirs, files in os.walk(directory):
        for file in files:
            if file.endswith(('.tsx', '.ts', '.jsx', '.js')):
                path = os.path.join(root, file)
                with open(path, 'r', encoding='utf-8') as f:
                    content = f.read()
                
                # Find all lucide-react imports
                imports = re.findall(r'import\s+\{([^}]+)\}\s+from\s+[\'"]lucide-react[\'"]', content)
                if not imports:
                    continue
                
                imported_icons = set()
                for imp in imports:
                    # Handle aliases like "FileText as FileIcon"
                    icons = [i.strip().split(' as ')[0] for i in imp.split(',')]
                    imported_icons.update([i for i in icons if i])
                
                # Find all potential icon usages: <IconName or icon={IconName}
                usages = re.findall(r'<([A-Z][a-zA-Z0-9]+)|icon=\{([A-Z][a-zA-Z0-9]+)\}', content)
                used_icons = set()
                for usage in usages:
                    used_icons.update([u for u in usage if u])
                
                # Check for icons that are used but not imported (and not common React components or locally defined)
                missing = []
                for icon in used_icons:
                    if icon not in imported_icons:
                        # Simple check to see if it's defined in the file
                        if f'const {icon}' not in content and f'function {icon}' not in content and f'class {icon}' not in content and f'interface {icon}' not in content and f'type {icon}' not in content:
                            missing.append(icon)
                
                if missing:
                    print(f"File: {path}")
                    print(f"  Missing icons: {missing}")

check_lucide_imports('/Users/user/Desktop/projet fe/project/src')
