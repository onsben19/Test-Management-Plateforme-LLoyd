import React, { useRef, useState } from 'react';
import { motion, useMotionTemplate, useMotionValue } from 'framer-motion';
import { Settings, Maximize2, MoreHorizontal } from 'lucide-react';

interface DashboardWidgetProps {
    id?: string;
    title: string;
    subtitle?: string;
    children: React.ReactNode;
    icon?: React.ElementType;
    isLoading?: boolean;
    className?: string;
    onSettingsClick?: () => void;
}

const DashboardWidget: React.FC<DashboardWidgetProps> = ({
    id,
    title,
    subtitle,
    children,
    icon: Icon,
    isLoading,
    className = '',
    onSettingsClick
}) => {
    const mouseX = useMotionValue(0);
    const mouseY = useMotionValue(0);

    function handleMouseMove({ currentTarget, clientX, clientY }: React.MouseEvent) {
        const { left, top } = currentTarget.getBoundingClientRect();
        mouseX.set(clientX - left);
        mouseY.set(clientY - top);
    }

    return (
        <motion.div
            id={id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
            onMouseMove={handleMouseMove}
            className={`group relative bg-white/40 dark:bg-[#0f1423]/40 backdrop-blur-2xl rounded-[2.5rem] border border-slate-200/50 dark:border-white/5 shadow-xl hover:shadow-2xl dark:shadow-none transition-all duration-500 overflow-hidden ${className}`}
        >
            {/* SaaS Spotlight Effect */}
            <motion.div
                className="pointer-events-none absolute -inset-px rounded-[2.5rem] opacity-0 transition duration-300 group-hover:opacity-100"
                style={{
                    background: useMotionTemplate`
                        radial-gradient(
                            650px circle at ${mouseX}px ${mouseY}px,
                            rgba(59, 130, 246, 0.15),
                            transparent 80%
                        )
                    `,
                }}
            />

            {/* Background Decor */}
            <div className="absolute top-0 right-0 -mr-16 -mt-16 w-32 h-32 bg-blue-500/5 blur-[80px] rounded-full pointer-events-none" />

            {/* Header */}
            <div className="px-8 py-7 flex items-center justify-between border-b border-slate-100/50 dark:border-white/5 bg-white/10 dark:bg-white/2">
                <div className="flex items-center gap-4">
                    {Icon && (
                        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-500/10 to-purple-500/10 flex items-center justify-center text-blue-600 dark:text-blue-400 shadow-inner">
                            <Icon className="w-6 h-6" />
                        </div>
                    )}
                    <div>
                        <div className="flex items-center gap-2 mb-1.5">
                            <span className="w-2 h-2 rounded-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.5)] animate-pulse" />
                            <h3 className="text-lg font-black text-slate-900 dark:text-white tracking-tight leading-none">
                                {title}
                            </h3>
                        </div>
                        {subtitle && (
                            <p className="text-[10px] font-black text-slate-500 dark:text-slate-500 uppercase tracking-[0.2em] opacity-80">
                                {subtitle}
                            </p>
                        )}
                    </div>
                </div>

                <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 translate-x-2 group-hover:translate-x-0 transition-all duration-300">
                    <button
                        onClick={onSettingsClick}
                        className="p-2.5 text-slate-400 hover:text-blue-600 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-white/5 rounded-2xl transition-all"
                    >
                        <Settings className="w-5 h-5" />
                    </button>
                    <button className="p-2.5 text-slate-400 hover:text-blue-600 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-white/5 rounded-2xl transition-all">
                        <MoreHorizontal className="w-5 h-5" />
                    </button>
                </div>
            </div>

            {/* Content */}
            <div className="p-8 relative z-10">
                {isLoading ? (
                    <div className="flex flex-col items-center justify-center py-16 space-y-4">
                        <div className="relative w-10 h-10">
                            <div className="absolute inset-0 border-2 border-blue-500/20 rounded-full" />
                            <div className="absolute inset-0 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                        </div>
                        <span className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.3em] animate-pulse">Analyzing...</span>
                    </div>
                ) : (
                    <div className="animate-in fade-in zoom-in-95 duration-1000">
                        {children}
                    </div>
                )}
            </div>

            {/* Glowing Border Accent */}
            <div className="absolute inset-0 rounded-[2.5rem] border border-blue-500/0 group-hover:border-blue-500/10 pointer-events-none transition-colors duration-500" />
        </motion.div>
    );
};

export default DashboardWidget;
