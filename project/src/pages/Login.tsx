import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, EyeOff, Shield, ArrowRight } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useTranslation } from 'react-i18next';
import { toast } from 'react-toastify';
import Button from '../components/ui/Button';
import LanguageSwitcher from '../components/LanguageSwitcher';


const Login = () => {
  const [showPassword, setShowPassword] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [is2FAMode, setIs2FAMode] = useState(false);
  const [isForgotPasswordMode, setIsForgotPasswordMode] = useState(false);
  const [resetIdentifier, setResetIdentifier] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [verifiedUsername, setVerifiedUsername] = useState('');
  const navigate = useNavigate();
  const { login, verify2FA, forgotPassword } = useAuth();
  const { theme } = useTheme();
  const { t } = useTranslation();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const result = await login(username, password);
      if (result?.requires_2fa) {
        setIs2FAMode(true);
        setVerifiedUsername(result.username || username);
        toast.info(t('login.otpSubtitle'));
      } else {
        toast.success(t('login.success'));
        navigate('/');
      }
    } catch (error) {
      console.error(error);
      toast.error(t('login.failure'));
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      await forgotPassword(resetIdentifier);
      toast.success(t('login.forgotPasswordSuccess'));
      setIsForgotPasswordMode(false);
    } catch (error) {
      console.error(error);
      toast.error(t('login.forgotPasswordError'));
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerify2FA = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      await verify2FA(verifiedUsername, otpCode);
      toast.success(t('login.otpSuccess'));
      navigate('/');
    } catch (error) {
      console.error(error);
      toast.error(t('login.otpError'));
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

      <div className="absolute top-8 right-8 z-50">
        <LanguageSwitcher />
      </div>

      <div className="w-full max-w-md p-8 relative z-10">
        <div className="glass-panel shadow-2xl dark:shadow-none rounded-2xl p-8 space-y-8 animate-in fade-in zoom-in duration-500 bg-white/80 dark:bg-slate-900/60 backdrop-blur-xl border border-white/20 dark:border-slate-700/50">
          {/* Logo / Header */}
          <div className="text-center space-y-2">
            <div className="w-48 h-20 bg-white/5 dark:bg-white/5 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-sm border border-slate-200/20 dark:border-white/10 p-4 transition-all duration-500 hover:scale-105">
              <img
                src={theme === 'dark' ? '/logo-lloyd-dark.webp' : '/logo-lloyd-light.webp'}
                alt="Lloyd Logo"
                onError={(e) => { (e.target as HTMLImageElement).src = '/logo-lloyd.webp'; }}
                className="w-full h-full object-contain dark:brightness-0 dark:invert transition-all duration-300"
              />
            </div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight transition-colors">
              <span className="text-gradient">{t('login.title')}</span>
            </h1>
            {!is2FAMode && (
              <p className="text-slate-500 dark:text-slate-400 text-sm transition-colors">
                {t('login.subtitle')}
              </p>
            )}
          </div>

          {is2FAMode ? (
            <form onSubmit={handleVerify2FA} className="space-y-6">
              <div className="text-center space-y-2">
                <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-200">
                  {t('login.otpTitle')}
                </h2>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  {t('login.otpSubtitle')}
                </p>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-slate-500 dark:text-slate-300 uppercase tracking-wider mb-1.5 ml-1 transition-colors">
                    {t('login.otpLabel')}
                  </label>
                  <input
                    type="text"
                    required
                    maxLength={6}
                    value={otpCode}
                    onChange={(e) => setOtpCode(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-950/50 border border-slate-200 dark:border-slate-700 rounded-lg px-4 py-3 text-center text-2xl tracking-[0.5em] font-mono text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                    placeholder={t('login.otpPlaceholder')}
                  />
                </div>
              </div>

              <div className="space-y-3">
                <Button
                  variant="primary"
                  type="submit"
                  isLoading={isLoading}
                  disabled={otpCode.length < 6}
                  icon={Shield}
                  className="w-full"
                >
                  {t('login.otpSubmit')}
                </Button>

                <Button
                  variant="ghost"
                  onClick={() => setIs2FAMode(false)}
                  className="w-full"
                >
                  {t('login.otpBack')}
                </Button>
              </div>
            </form>
          ) : isForgotPasswordMode ? (
            <form onSubmit={handleForgotPassword} className="space-y-6">
              <div className="text-center space-y-2">
                <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-200">
                  {t('login.forgotPasswordTitle')}
                </h2>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  {t('login.forgotPasswordSubtitle')}
                </p>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-slate-500 dark:text-slate-300 uppercase tracking-wider mb-1.5 ml-1 transition-colors">
                    {t('login.forgotPasswordLabel')}
                  </label>
                  <input
                    type="text"
                    required
                    value={resetIdentifier}
                    onChange={(e) => setResetIdentifier(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-950/50 border border-slate-200 dark:border-slate-700 rounded-lg px-4 py-3 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                    placeholder={t('login.forgotPasswordPlaceholder')}
                  />
                </div>
              </div>

              <div className="space-y-3">
                <Button
                  variant="primary"
                  type="submit"
                  isLoading={isLoading}
                  disabled={!resetIdentifier}
                  icon={ArrowRight}
                  className="w-full"
                >
                  {t('login.forgotPasswordSubmit')}
                </Button>

                <Button
                  variant="ghost"
                  onClick={() => setIsForgotPasswordMode(false)}
                  className="w-full"
                >
                  {t('login.forgotPasswordBack')}
                </Button>
              </div>
            </form>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-slate-500 dark:text-slate-300 uppercase tracking-wider mb-1.5 ml-1 transition-colors">
                    {t('login.username')}
                  </label>
                  <input
                    type="text"
                    required
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-950/50 border border-slate-200 dark:border-slate-700 rounded-lg px-4 py-3 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                    placeholder={t('login.placeholderUsername')}
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-500 dark:text-slate-300 uppercase tracking-wider mb-1.5 ml-1 transition-colors">
                    {t('login.password')}
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full bg-slate-50 dark:bg-slate-950/50 border border-slate-200 dark:border-slate-700 rounded-lg px-4 py-3 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all pr-12"
                      placeholder={t('login.placeholderPassword')}
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
                    <button
                      type="button"
                      onClick={() => setIsForgotPasswordMode(true)}
                      className="text-xs text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 transition-colors"
                    >
                      {t('login.forgotPassword')}
                    </button>
                  </div>
                </div>
              </div>

              <Button
                variant="primary"
                type="submit"
                isLoading={isLoading}
                icon={ArrowRight}
                className="w-full"
              >
                {t('login.submit')}
              </Button>
            </form>
          )}


        </div>

        <p className="text-center text-slate-500 dark:text-slate-500 text-xs mt-8 transition-colors">
          &copy; 2026 InsureTM Inc. Tous droits réservés.
        </p>
      </div>
    </div>
  );
};

export default Login;