import React from 'react';
import { motion } from 'framer-motion';
import { LucideIcon } from 'lucide-react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg' | 'icon';
  icon?: LucideIcon;
  isLoading?: boolean;
}

const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  icon: Icon,
  isLoading,
  className = '',
  disabled,
  ...props
}) => {
  const variants = {
    primary: 'bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-500/25 border-t border-white/20',
    secondary: 'bg-white/10 hover:bg-white/20 text-white backdrop-blur-md border border-white/10 shadow-xl',
    outline: 'bg-transparent border-2 border-blue-600/50 text-blue-500 hover:bg-blue-600 hover:text-white',
    ghost: 'bg-transparent hover:bg-white/5 text-slate-400 hover:text-white',
    danger: 'bg-rose-500/10 hover:bg-rose-500 text-rose-500 hover:text-white border border-rose-500/20 shadow-lg shadow-rose-500/10'
  };

  const sizes = {
    sm: 'px-4 py-2 text-[10px]',
    md: 'px-6 py-3 text-[11px]',
    lg: 'px-8 py-4 text-xs',
    icon: 'p-3'
  };

  return (
    <motion.button
      whileHover={{ scale: 1.02, y: -1 }}
      whileTap={{ scale: 0.98 }}
      disabled={disabled || isLoading}
      className={`
        relative flex items-center justify-center gap-2.5 
        font-black uppercase tracking-[0.15em] rounded-2xl 
        transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed
        ${variants[variant]} 
        ${sizes[size]} 
        ${className}
      `}
      {...props}
    >
      {isLoading ? (
        <div className="w-4 h-4 border-2 border-current/20 border-t-current rounded-full animate-spin" />
      ) : (
        <>
          {Icon && <Icon size={size === 'sm' ? 14 : 16} className={variant === 'primary' ? 'filter drop-shadow-md' : ''} />}
          {children}
        </>
      )}
      
      {/* Subtle Shine Effect */}
      <div className="absolute inset-0 rounded-2xl bg-gradient-to-tr from-white/0 via-white/5 to-white/0 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
    </motion.button>
  );
};

export default Button;
