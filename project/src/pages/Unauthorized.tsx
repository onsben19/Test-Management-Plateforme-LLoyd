import React from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { ShieldAlert, Home, ArrowLeft } from 'lucide-react';
import PageLayout from '../components/PageLayout';
import { motion } from 'framer-motion';

const Unauthorized = () => {
    const { t } = useTranslation();
    return (
        <PageLayout>
            <div className="flex flex-col items-center justify-center min-h-[70vh] text-center px-4">
                <motion.div
                    initial={{ opacity: 0, scale: 0.8, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    transition={{ duration: 0.6, ease: "easeOut" }}
                    className="relative"
                >
                    <div className="absolute inset-0 bg-rose-500/20 blur-3xl rounded-full" />
                    <div className="relative w-24 h-24 rounded-[2rem] bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-500 mb-8 mx-auto shadow-2xl">
                        <ShieldAlert className="w-12 h-12" />
                    </div>
                </motion.div>

                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: 0.2 }}
                    className="max-w-lg"
                >
                    <h1 className="text-4xl font-black text-white tracking-widest uppercase mb-4 leading-tight">
                        {t('errors.403.title') || "ACCÈS INTERDIT"}
                    </h1>
                    <p className="text-slate-400 font-bold uppercase tracking-widest text-[10px] mb-12 max-w-sm mx-auto opacity-70">
                        {t('errors.403.message') || "VOUS N'AVEZ PAS LES PERMISSIONS NÉCESSAIRES POUR ACCÉDER À CETTE RESSOURCE."}
                    </p>

                    <div className="flex flex-col sm:flex-row items-center justify-center gap-6">
                        <Link
                            to="/"
                            className="bg-white text-black px-10 py-4 rounded-3xl font-black text-[10px] tracking-widest uppercase hover:bg-slate-200 transition-all shadow-xl active:scale-95 flex items-center gap-2"
                        >
                            <Home className="w-4 h-4" />
                            {t('errors.403.back') || "RETOUR À L'ACCUEIL"}
                        </Link>
                    </div>
                </motion.div>
            </div>
        </PageLayout>
    );
};

export default Unauthorized;
