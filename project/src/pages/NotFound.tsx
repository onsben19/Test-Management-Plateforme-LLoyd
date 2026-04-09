import React from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { Ghost, Home, Search, AlertCircle } from 'lucide-react';
import PageLayout from '../components/PageLayout';
import { motion } from 'framer-motion';

const NotFound: React.FC = () => {
  const { t } = useTranslation();

  return (
    <PageLayout>
      <div className="flex flex-col items-center justify-center min-h-[70vh] text-center px-4 relative">
        {/* Background 404 Glow */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 select-none pointer-events-none opacity-[0.03]">
          <span className="text-[20rem] font-black text-white leading-none">404</span>
        </div>

        <motion.div
          initial={{ opacity: 0, scale: 0.8, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.8, cubicBezier: [0.16, 1, 0.3, 1] }}
          className="relative"
        >
          <div className="absolute inset-0 bg-blue-500/20 blur-[100px] rounded-full" />
          <div className="relative w-32 h-32 rounded-[2.5rem] bg-white/5 border border-white/10 flex items-center justify-center text-blue-400 mb-10 mx-auto shadow-2xl backdrop-blur-xl group">
            <Ghost className="w-16 h-16 animate-bounce" />
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="max-w-xl relative z-10"
        >
          <div className="inline-flex items-center gap-3 px-4 py-1.5 bg-blue-500/10 border border-blue-500/20 rounded-full mb-6">
            <AlertCircle className="w-4 h-4 text-blue-500" />
            <span className="text-[10px] font-black text-blue-400 uppercase tracking-widest leading-none mt-0.5">Page non trouvée</span>
          </div>

          <h1 className="text-5xl font-black text-white tracking-widest uppercase mb-6 leading-tight italic">
            {t('errors.404.title')}
          </h1>

          <p className="text-slate-500 font-bold uppercase tracking-widest text-[11px] mb-12 max-w-sm mx-auto opacity-80 leading-relaxed">
            {t('errors.404.message')}
          </p>

          <Link
            to="/"
            className="bg-white text-black px-12 py-5 rounded-3xl font-black text-[10px] tracking-widest uppercase hover:bg-slate-200 transition-all shadow-xl shadow-white/5 active:scale-95 flex items-center gap-3 mx-auto w-fit border border-white/10"
          >
            <Home className="w-4 h-4" />
            {t('errors.404.back')}
          </Link>
        </motion.div>

        {/* System Audit Style Decoration */}
        <div className="mt-20 flex gap-4 opacity-10 grayscale select-none pointer-events-none">
          <div className="w-16 h-1 bg-white" />
          <div className="w-32 h-1 bg-white" />
          <div className="w-8 h-1 bg-white" />
        </div>
      </div>
    </PageLayout>
  );
};

export default NotFound;