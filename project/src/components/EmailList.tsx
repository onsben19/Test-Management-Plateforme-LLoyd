import React from 'react';
import { Mail, Paperclip, Clock, CheckCircle2, Circle } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface Email {
    id: number;
    sender_name: string;
    recipient_name: string;
    subject: string;
    body: string;
    created_at: string;
    is_read: boolean;
    attachment?: string;
}

interface EmailListProps {
    emails: Email[];
    selectedEmailId?: number;
    onEmailClick: (email: Email) => void;
    activeTab: 'inbox' | 'sent';
}

const EmailList: React.FC<EmailListProps> = ({ emails, selectedEmailId, onEmailClick, activeTab }) => {
    const { t } = useTranslation();

    const getInitials = (name: string) => {
        return name
            .split(' ')
            .map(n => n[0])
            .join('')
            .toUpperCase()
            .substring(0, 2);
    };

    if (emails.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center h-64 text-slate-400 dark:text-slate-500">
                <Mail className="w-12 h-12 mb-4 opacity-20" />
                <p className="text-sm font-medium">{t('email.noMessages') || 'Aucun message trouvé'}</p>
            </div>
        );
    }

    return (
        <div className="flex flex-col space-y-1">
            {emails.map((email) => {
                const isSelected = selectedEmailId === email.id;
                const correspondent = activeTab === 'inbox' ? email.sender_name : email.recipient_name;
                const initials = getInitials(correspondent || 'User');
                const date = new Date(email.created_at);
                const isToday = new Date().toDateString() === date.toDateString();
                const timeStr = isToday
                    ? date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                    : date.toLocaleDateString([], { month: 'short', day: 'numeric' });

                return (
                    <button
                        key={email.id}
                        onClick={() => onEmailClick(email)}
                        className={`w-full text-left p-4 rounded-xl transition-all duration-200 group relative border shadow-sm ${isSelected
                                ? 'bg-blue-50/50 dark:bg-blue-500/10 border-blue-200 dark:border-blue-500/30'
                                : 'bg-white/50 dark:bg-slate-800/40 border-transparent hover:bg-slate-50 dark:hover:bg-slate-800/60 hover:border-slate-200 dark:hover:border-slate-700'
                            }`}
                    >
                        <div className="flex items-start gap-3">
                            {/* Avatar */}
                            <div className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center text-xs font-bold transition-transform group-hover:scale-105 ${isSelected
                                    ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/20'
                                    : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                                }`}>
                                {initials}
                            </div>

                            {/* Content */}
                            <div className="flex-1 min-w-0">
                                <div className="flex justify-between items-baseline mb-1">
                                    <h4 className={`text-sm truncate pr-2 ${!email.is_read && activeTab === 'inbox'
                                            ? 'font-bold text-slate-900 dark:text-white'
                                            : 'font-medium text-slate-700 dark:text-slate-300'
                                        }`}>
                                        {correspondent}
                                    </h4>
                                    <span className="text-[10px] whitespace-nowrap text-slate-400 dark:text-slate-500 font-medium">
                                        {timeStr}
                                    </span>
                                </div>
                                <p className={`text-xs truncate mb-1 ${!email.is_read && activeTab === 'inbox'
                                        ? 'text-slate-800 dark:text-slate-200 font-medium'
                                        : 'text-slate-500 dark:text-slate-400'
                                    }`}>
                                    {email.subject}
                                </p>
                                <p className="text-[11px] text-slate-400 dark:text-slate-500 truncate line-clamp-1">
                                    {email.body.substring(0, 60).replace(/\n/g, ' ')}...
                                </p>
                            </div>
                        </div>

                        {/* Status Indicators */}
                        <div className="absolute right-3 bottom-3 flex items-center gap-1.5 ink-0">
                            {email.attachment && (
                                <Paperclip className="w-3 h-3 text-slate-400" />
                            )}
                            {!email.is_read && activeTab === 'inbox' && (
                                <div className="w-2 h-2 rounded-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.5)] animate-pulse" />
                            )}
                        </div>

                        {/* Selection Glow */}
                        {isSelected && (
                            <div className="absolute inset-0 border-2 border-blue-500/20 dark:border-blue-500/30 rounded-xl pointer-events-none" />
                        )}
                    </button>
                );
            })}
        </div>
    );
};

export default EmailList;
