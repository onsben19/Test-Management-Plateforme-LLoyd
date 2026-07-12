#!/usr/bin/env python3
"""Add light-mode Tailwind variants for hardcoded dark-only classes."""
import re
from pathlib import Path

SRC = Path(__file__).resolve().parent.parent / "src"
APP = Path(__file__).resolve().parent.parent / "App.tsx"

BG_REPLACEMENTS = [
    ("#111827", "white"),
    ("#0d1117", "white"),
    ("#0f172a", "white"),
    ("#0b0e14", "slate-50"),
    ("#1a2235", "slate-50"),
    ("#1f2937", "slate-100"),
    ("#131b26", "slate-50"),
    ("#131d33", "slate-50"),
]


TEXT_REPLACEMENTS = [
    ("text-white/55", "text-slate-600 dark:text-white/55"),
    ("text-white/30", "text-slate-500 dark:text-white/30"),
    ("text-white/40", "text-slate-500 dark:text-white/40"),
    ("text-white/45", "text-slate-500 dark:text-white/45"),
    ("text-white/25", "text-slate-400 dark:text-white/25"),
    ("text-white/20", "text-slate-400 dark:text-white/20"),
    ("text-white/70", "text-slate-600 dark:text-white/70"),
    ("text-white/50", "text-slate-500 dark:text-white/50"),
    ("text-white/65", "text-slate-600 dark:text-white/65"),
    ("placeholder:text-white/20", "placeholder:text-slate-400 dark:placeholder:text-white/20"),
    ("placeholder-white/30", "placeholder-slate-400 dark:placeholder-white/30"),
    ("text-[13px] text-white", "text-[13px] text-slate-900 dark:text-white"),
    ("text-[12px] text-white", "text-[12px] text-slate-900 dark:text-white"),
    ("text-sm text-white", "text-sm text-slate-900 dark:text-white"),
    ("font-medium text-white", "font-medium text-slate-900 dark:text-white"),
    ("font-semibold text-white", "font-semibold text-slate-900 dark:text-white"),
    ("font-bold text-white", "font-bold text-slate-900 dark:text-white"),
    ("font-black text-white", "font-black text-slate-900 dark:text-white"),
    ("font-[500] text-white", "font-[500] text-slate-900 dark:text-white"),
    ("font-[600] text-white", "font-[600] text-slate-900 dark:text-white"),
    ("font-[700] text-white", "font-[700] text-slate-900 dark:text-white"),
    ("hover:text-white", "hover:text-slate-900 dark:hover:text-white"),
]

BORDER_REPLACEMENTS = [
    ("border border-white/[0.07]", "border border-slate-200 dark:border-white/[0.07]"),
    ("border border-white/[0.08]", "border border-slate-200 dark:border-white/[0.08]"),
    ("border-white/[0.06]", "border-slate-200 dark:border-white/[0.06]"),
    ("border-white/[0.1]", "border-slate-200 dark:border-white/[0.1]"),
    ("border-white/10", "border-slate-200 dark:border-white/10"),
    ("border-white/5", "border-slate-200 dark:border-white/5"),
    ("border-white/20", "border-slate-300 dark:border-white/20"),
    ("border-t border-white/[0.06]", "border-t border-slate-200 dark:border-white/[0.06]"),
    ("border-b border-white/[0.06]", "border-b border-slate-200 dark:border-white/[0.06]"),
    ("border-l border-white/[0.05]", "border-l border-slate-200 dark:border-white/[0.05]"),
    ("border-t-[0.5px] border-white/10", "border-t-[0.5px] border-slate-200 dark:border-white/10"),
    ("border-[0.5px] border-white/10", "border-[0.5px] border-slate-200 dark:border-white/10"),
    ("border-[0.5px] border-white/5", "border-[0.5px] border-slate-200 dark:border-white/5"),
    ("border-[0.5px] border-white/[0.08]", "border-[0.5px] border-slate-200 dark:border-white/[0.08]"),
    ("border-[0.5px] border-white/[0.07]", "border-[0.5px] border-slate-200 dark:border-white/[0.07]"),
    ("border-[0.5px] border-[rgba(255,255,255,0.08)]", "border-[0.5px] border-slate-200 dark:border-[rgba(255,255,255,0.08)]"),
    ("border-[0.5px] border-[rgba(255,255,255,0.1)]", "border-[0.5px] border-slate-200 dark:border-[rgba(255,255,255,0.1)]"),
    ("border-[0.5px] border-[rgba(255,255,255,0.07)]", "border-[0.5px] border-slate-200 dark:border-[rgba(255,255,255,0.07)]"),
]

OVERLAY_REPLACEMENTS = [
    ("bg-black/70", "bg-slate-900/50 dark:bg-black/70"),
    ("bg-black/80", "bg-slate-900/60 dark:bg-black/80"),
    ("bg-slate-950/80", "bg-slate-200/80 dark:bg-slate-950/80"),
    ("bg-slate-950/90", "bg-slate-200/90 dark:bg-slate-950/90"),
    ("bg-slate-950/60", "bg-slate-200/60 dark:bg-slate-950/60"),
    ("bg-slate-900/40", "bg-slate-200/60 dark:bg-slate-900/40"),
]

SURFACE_REPLACEMENTS = [
    ("bg-white/[0.03]", "bg-white dark:bg-white/[0.03]"),
    ("bg-white/[0.04]", "bg-slate-100 dark:bg-white/[0.04]"),
    ("bg-white/[0.05]", "bg-slate-100 dark:bg-white/[0.05]"),
    ("bg-white/[0.08]", "bg-slate-100 dark:bg-white/[0.08]"),
    ("hover:bg-white/[0.08]", "hover:bg-slate-100 dark:hover:bg-white/[0.08]"),
    ("hover:bg-white/10", "hover:bg-slate-100 dark:hover:bg-white/10"),
    ("hover:bg-white/5", "hover:bg-slate-100 dark:hover:bg-white/5"),
    ("bg-black/20", "bg-slate-100 dark:bg-black/20"),
    ("bg-black/40", "bg-slate-100 dark:bg-black/40"),
    ("bg-slate-900 ", "bg-white dark:bg-slate-900 "),
    ("bg-slate-900\"", "bg-white dark:bg-slate-900\""),
]


def fix_bg(content: str) -> str:
    for color, light in BG_REPLACEMENTS:
        pattern = rf"(?<!dark:)bg-\[{re.escape(color)}\]"
        replacement = f"bg-{light} dark:bg-[{color}]"
        content = re.sub(pattern, replacement, content)
    return content


def apply_replacements(content: str, pairs: list[tuple[str, str]]) -> str:
    for old, new in pairs:
        if "dark:" in new:
            # skip if already has dark variant of target
            dark_part = new.split("dark:")[1] if "dark:" in new else old
            if dark_part in content and old not in content:
                continue
        content = content.replace(old, new)
    return content


def dedupe_dark_prefixes(content: str) -> str:
    """Fix accidental double prefixes from multiple passes."""
    patterns = [
        (r"bg-white dark:bg-white dark:bg-", "bg-white dark:bg-"),
        (r"bg-slate-50 dark:bg-slate-50 dark:bg-", "bg-slate-50 dark:bg-"),
        (r"text-slate-500 dark:text-slate-500 dark:text-white/", "text-slate-500 dark:text-white/"),
        (r"text-slate-900 dark:text-slate-900 dark:text-white", "text-slate-900 dark:text-white"),
        (r"border-slate-200 dark:border-slate-200 dark:border-white/", "border-slate-200 dark:border-white/"),
        (r"border-slate-200 dark:border-slate-300 dark:border-white/", "border-slate-300 dark:border-white/"),
        (r"hover:text-slate-900 dark:hover:text-slate-900 dark:hover:text-white", "hover:text-slate-900 dark:hover:text-white"),
        (r"bg-white dark:bg-white dark:bg-slate-900", "bg-white dark:bg-slate-900"),
        (r"text-slate-400 dark:text-slate-400 dark:text-white/", "text-slate-400 dark:text-white/"),
        (r"placeholder:text-slate-400 dark:placeholder:text-slate-400 dark:placeholder:text-white/", "placeholder:text-slate-400 dark:placeholder:text-white/"),
    ]
    for pat, repl in patterns:
        content = re.sub(pat, repl, content)
    return content


def process_file(path: Path) -> bool:
    original = path.read_text(encoding="utf-8")
    content = original
    content = fix_bg(content)
    content = apply_replacements(content, BORDER_REPLACEMENTS)
    content = apply_replacements(content, TEXT_REPLACEMENTS)
    content = apply_replacements(content, OVERLAY_REPLACEMENTS)
    content = apply_replacements(content, SURFACE_REPLACEMENTS)
    content = dedupe_dark_prefixes(content)
    if content != original:
        path.write_text(content, encoding="utf-8")
        return True
    return False


def main():
    files = list(SRC.rglob("*.tsx")) + list(SRC.rglob("*.ts"))
    if APP.exists():
        files.append(APP)
    changed = []
    for f in sorted(set(files)):
        if process_file(f):
            changed.append(str(f.relative_to(SRC.parent)))
    print(f"Updated {len(changed)} files:")
    for c in changed:
        print(f"  - {c}")


if __name__ == "__main__":
    main()
