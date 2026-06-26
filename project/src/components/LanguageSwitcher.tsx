import React, { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Languages } from 'lucide-react';
import * as Popover from '@radix-ui/react-popover';

const languages = [
    { code: 'fr', name: 'Français', flag: '🇫🇷' },
    { code: 'en', name: 'English', flag: '🇺🇸' },
];

const normalizeLanguage = (lang?: string) => (lang || 'fr').split('-')[0].toLowerCase();

const LanguageSwitcher: React.FC = () => {
    const { i18n } = useTranslation();
    const [open, setOpen] = useState(false);

    const activeCode = useMemo(
        () => normalizeLanguage(i18n.resolvedLanguage || i18n.language),
        [i18n.resolvedLanguage, i18n.language],
    );

    const currentLanguage = languages.find((lang) => lang.code === activeCode) || languages[0];

    const changeLanguage = (code: string) => {
        i18n.changeLanguage(code);
        document.documentElement.lang = code;
        setOpen(false);
    };

    return (
        <Popover.Root open={open} onOpenChange={setOpen}>
            <Popover.Trigger asChild>
                <button
                    className="flex items-center gap-2 p-2 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-all rounded-xl hover:bg-slate-100 dark:hover:bg-white/10 outline-none group border border-transparent hover:border-slate-200 dark:hover:border-white/10"
                    aria-label={currentLanguage.name}
                >
                    <Languages className="w-5 h-5 group-hover:rotate-12 transition-transform duration-300" />
                    <span className="text-xs font-black uppercase tracking-widest hidden sm:inline-block">
                        {currentLanguage.code}
                    </span>
                </button>
            </Popover.Trigger>

            <Popover.Portal>
                <Popover.Content
                    className="z-[60] min-w-[160px] bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl border border-slate-200 dark:border-white/10 rounded-2xl shadow-2xl p-2 animate-in fade-in zoom-in duration-200"
                    sideOffset={8}
                    align="end"
                >
                    <div className="space-y-1">
                        {languages.map((lang) => (
                            <button
                                key={lang.code}
                                onClick={() => changeLanguage(lang.code)}
                                className={`w-full flex items-center justify-between px-4 py-2.5 rounded-xl transition-all ${activeCode === lang.code
                                    ? 'bg-blue-50 dark:bg-blue-600/10 text-blue-600 dark:text-blue-400 font-bold'
                                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/10'
                                    }`}
                            >
                                <div className="flex items-center gap-3">
                                    <span className="text-base">{lang.flag}</span>
                                    <span className="text-sm font-semibold">{lang.name}</span>
                                </div>
                                {activeCode === lang.code && (
                                    <div className="w-1.5 h-1.5 rounded-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.5)]" />
                                )}
                            </button>
                        ))}
                    </div>
                    <Popover.Arrow className="fill-white dark:fill-slate-900" />
                </Popover.Content>
            </Popover.Portal>
        </Popover.Root>
    );
};

export default LanguageSwitcher;
