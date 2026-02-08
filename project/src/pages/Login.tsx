import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, EyeOff, Shield, ArrowRight } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { toast } from 'react-toastify';
import StarBorder from '../components/bits/StarBorder';
import SplashCursor from '../components/bits/SplashCursor'


const Login = () => {
  const [showPassword, setShowPassword] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const { login } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      await login(username, password);
      toast.success("Connexion réussie !");
      navigate('/');
    } catch (error) {
      console.error(error);
      toast.error("Échec de la connexion. Vérifiez vos identifiants.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950 relative overflow-hidden transition-colors duration-500">
      {/* Background Effects */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0 pointer-events-none">
        <div className="absolute -top-24 -left-24 w-96 h-96 bg-blue-500/10 dark:bg-blue-600/20 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-indigo-500/5 dark:bg-slate-900/50 rounded-full blur-3xl"></div>
        <div className="absolute bottom-0 right-0 w-[500px] h-[500px] bg-blue-500/10 dark:bg-blue-900/10 rounded-full blur-3xl"></div>
      </div>

      <div className="w-full max-w-md p-8 relative z-10">
        <div className="glass-panel shadow-2xl dark:shadow-none rounded-2xl p-8 space-y-8 animate-in fade-in zoom-in duration-500 bg-white/80 dark:bg-slate-900/60 backdrop-blur-xl border border-white/20 dark:border-slate-700/50">
          {/* Logo / Header */}
          <div className="text-center space-y-2">
            <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-blue-600/30">
              <Shield className="w-7 h-7 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight transition-colors">
              <span className="text-gradient">InsureTM</span>
            </h1>
            <p className="text-slate-500 dark:text-slate-400 text-sm transition-colors">Connectez-vous à votre espace de travail</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-500 dark:text-slate-300 uppercase tracking-wider mb-1.5 ml-1 transition-colors">
                  Nom d'utilisateur
                </label>
                <input
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-950/50 border border-slate-200 dark:border-slate-700 rounded-lg px-4 py-3 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  placeholder="nom.utilisateur"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-500 dark:text-slate-300 uppercase tracking-wider mb-1.5 ml-1 transition-colors">
                  Mot de passe
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-950/50 border border-slate-200 dark:border-slate-700 rounded-lg px-4 py-3 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all pr-12"
                    placeholder="••••••••"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300 transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                <div className="flex justify-end mt-2">
                  <a href="#" className="text-xs text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 transition-colors">
                    Mot de passe oublié ?
                  </a>
                </div>
              </div>
            </div>

            <StarBorder
              as="button"
              className="w-full text-white font-medium shadow-lg shadow-blue-500/30 dark:shadow-blue-900/40 hover:shadow-blue-500/50 transition-all flex items-center justify-center gap-2 group disabled:opacity-70 disabled:cursor-not-allowed"
              color="magenta"
              speed="5s"
              type="submit"
              disabled={isLoading}
              innerClassName="relative z-1 bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600 dark:hover:from-blue-500 dark:hover:to-blue-400 border border-blue-500/50 text-white text-center text-[16px] py-3 px-6 rounded-[20px] transition-all"
            >
              {isLoading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  Se connecter
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </StarBorder>
          </form>


        </div>

        <p className="text-center text-slate-500 dark:text-slate-500 text-xs mt-8 transition-colors">
          &copy; 2026 InsureTM Inc. Tous droits réservés.
        </p>
      </div>
      <SplashCursor />
    </div>
  );
};

export default Login;