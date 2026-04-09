import React from 'react';
import Header from './Header';
import Sidebar from './Sidebar';
import { useSidebar } from '../context/SidebarContext';
import { motion } from 'framer-motion';

interface PageLayoutProps {
    children: React.ReactNode;
    title?: React.ReactNode;
    subtitle?: string;
    actions?: React.ReactNode;
    loading?: boolean;
    noPadding?: boolean;
    fullHeight?: boolean;
}

const PageLayout: React.FC<PageLayoutProps> = ({
    children,
    title,
    subtitle,
    actions,
    loading = false,
    noPadding = false,
    fullHeight = false
}) => {
    const { isOpen } = useSidebar();

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-[#060a16] transition-colors duration-500 relative">
            {/* Premium Background Elements */}
            <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
                <div className="absolute top-0 left-0 right-0 h-[500px] bg-gradient-to-b from-blue-600/5 to-transparent dark:from-blue-500/10 dark:to-transparent" />
                <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:40px_40px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)]" />

                {/* Animated Background Blobs */}
                <div className="absolute top-[10%] left-[10%] w-96 h-96 bg-blue-500/10 blur-[120px] rounded-full animate-pulse" />
                <div className="absolute bottom-[20%] right-[10%] w-[500px] h-[500px] bg-purple-500/5 blur-[150px] rounded-full animate-pulse [animation-delay:2s]" />
                <div className="absolute top-[40%] right-[20%] w-72 h-72 bg-emerald-500/5 blur-[100px] rounded-full animate-pulse [animation-delay:4s]" />
            </div>

            <Header />
            <div className="flex relative">
                <Sidebar />
                <main className={`flex-1 transition-all duration-500 ${isOpen ? 'lg:ml-64' : 'lg:ml-16'} ${fullHeight ? 'h-[calc(100vh-64px)] overflow-hidden' : 'p-4 lg:p-8 overflow-y-auto'}`}>
                    <div className={`${fullHeight ? 'h-full' : ''} max-w-[1600px] mx-auto relative z-10 flex flex-col`}>

                        {/* Page Header section if title provided */}
                        {(title || subtitle || actions) && (
                            <div className={`flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10 ${noPadding ? 'p-8 pb-0' : ''}`}>
                                <motion.div
                                    initial={{ opacity: 0, x: -20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ duration: 0.5 }}
                                >
                                    {title && (
                                        <h1 className="text-3xl font-bold text-slate-900 dark:text-white tracking-tight mb-2">
                                            {title}
                                        </h1>
                                    )}
                                    <div className="flex items-center gap-3">
                                        {subtitle && (
                                            <div className="flex items-center gap-2 px-3 py-1 bg-blue-500/5 dark:bg-blue-500/10 border border-blue-500/10 dark:border-blue-500/20 rounded-full">
                                                <span className="w-1.5 h-1.5 rounded-full bg-blue-500/50 animate-pulse" />
                                                <span className="text-[10px] font-semibold text-blue-600 dark:text-blue-400 uppercase tracking-widest text-nowrap">
                                                    {subtitle}
                                                </span>
                                            </div>
                                        )}
                                    </div>
                                </motion.div>

                                {actions && (
                                    <motion.div
                                        initial={{ opacity: 0, scale: 0.95 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        className="flex items-center gap-3"
                                    >
                                        {actions}
                                    </motion.div>
                                )}
                            </div>
                        )}

                        <div className={`flex-1 ${fullHeight ? 'overflow-hidden' : ''}`}>
                            {children}
                        </div>
                    </div>
                </main>
            </div>
        </div>
    );
};

export default PageLayout;
