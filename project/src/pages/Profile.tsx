import React, { useState, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import PageLayout from '../components/PageLayout';
import { useAuth } from '../context/AuthContext';
import { motion } from 'framer-motion';
import { User, Mail, Phone, Lock, Camera, Eye, EyeOff } from 'lucide-react';
import { toast } from 'react-toastify';

const Profile = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  
  const [formData, setFormData] = useState({
    firstName: user?.first_name || '',
    lastName: user?.last_name || '',
    email: user?.email || '',
    phone: user?.phone_number || '',
    avatar: user?.avatar || ''
  });

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        toast.error('Veuillez sélectionner une image valide');
        return;
      }
      
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData({ ...formData, avatar: reader.result as string });
      };
      reader.readAsDataURL(file);
    }
  };

  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const handleProfileSave = (e: React.FormEvent) => {
    e.preventDefault();
    toast.success('Profil mis à jour avec succès');
  };

  const handlePasswordSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toast.error('Les mots de passe ne correspondent pas');
      return;
    }
    toast.success('Mot de passe mis à jour avec succès');
    setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
  };

  const getPasswordStrength = (password: string) => {
    if (!password) return { label: '', color: 'bg-transparent', textColor: '' };
    if (password.length < 6) return { label: 'Faible', color: 'bg-red-500', textColor: 'text-red-500' };
    if (password.length < 10) return { label: 'Moyen', color: 'bg-amber-500', textColor: 'text-amber-500' };
    return { label: 'Fort', color: 'bg-emerald-500', textColor: 'text-emerald-500' };
  };

  const strength = getPasswordStrength(passwordData.newPassword);

  const sectionVariants = {
    hidden: { opacity: 0, y: 15 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.4 } }
  };

  const CustomHeader = (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-3">
        <h1 className="text-[22px] font-medium text-white tracking-tight">Mon Profil</h1>
        <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20">
          <div className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
          <span className="text-[11px] font-semibold text-blue-400 uppercase tracking-wider">Gestion du compte</span>
        </div>
      </div>
    </div>
  );

  return (
    <PageLayout
      title={CustomHeader as any} // Override PageLayout default title styling by passing a component
    >
      <div className="max-w-4xl space-y-8 pb-10">
        
        {/* Informations Personnelles */}
        <motion.section
          variants={sectionVariants}
          initial="hidden"
          animate="visible"
          className="bg-[#111827] border border-white/[0.08] rounded-[16px] p-6 shadow-xl"
        >
          {/* Header */}
          <div className="flex items-center gap-4 mb-5">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: 'rgba(55,138,221,0.15)' }}>
              <User className="w-5 h-5 text-[#378add]" />
            </div>
            <div>
              <h3 className="text-[16px] font-medium text-white tracking-tight">Informations personnelles</h3>
              <p className="text-slate-400 text-[12px] mt-0.5">Gérez vos données privées et publiques</p>
            </div>
          </div>
          <div className="h-px bg-white/[0.06] mb-6" />

          {/* Avatar Section */}
          <div className="flex items-center gap-5 mb-8">
            <input 
              type="file" 
              ref={fileInputRef} 
              onChange={handlePhotoChange} 
              accept="image/*" 
              className="hidden" 
            />
            <div className="relative">
              <div className="w-[72px] h-[72px] rounded-full flex items-center justify-center text-white font-bold text-2xl overflow-hidden border border-blue-500/30 shadow-inner bg-slate-800">
                {formData.avatar ? (
                  <img src={formData.avatar} alt="Avatar" className="w-full h-full object-cover" />
                ) : (
                  user?.username?.charAt(0).toUpperCase() || 'U'
                )}
              </div>
              <button 
                onClick={() => fileInputRef.current?.click()}
                className="absolute bottom-0 right-0 p-1.5 bg-[#1a2235] rounded-full border border-white/10 text-slate-400 hover:text-white transition-colors cursor-pointer shadow-lg z-10"
                title="Changer la photo"
              >
                <Camera className="w-3.5 h-3.5" />
              </button>
            </div>
            <div className="flex flex-col gap-2 items-start">
              <div className="flex flex-col">
                <span className="text-[14px] font-medium text-white">{formData.firstName} {formData.lastName || user?.username}</span>
                <span className="text-[12px] text-slate-400">{formData.email}</span>
              </div>
              <button 
                onClick={() => fileInputRef.current?.click()}
                className="text-[12px] text-slate-300 hover:text-white px-3 py-1.5 rounded-lg border border-white/10 hover:bg-white/5 transition-colors"
              >
                Changer la photo
              </button>
            </div>
          </div>

          {/* Form Fields */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-6">
            <div className="space-y-1.5">
              <label className="text-[11px] font-medium text-white/35 uppercase tracking-widest ml-1">Prénom</label>
              <div className="relative">
                <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <input
                  value={formData.firstName}
                  onChange={(e) => setFormData({...formData, firstName: e.target.value})}
                  className="w-full bg-[#1a2235] border border-white/10 rounded-[10px] pl-10 pr-3.5 py-[11px] text-[13px] text-white outline-none focus:border-blue-500/50 transition-colors placeholder-slate-500"
                  placeholder="Votre prénom"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="text-[11px] font-medium text-white/35 uppercase tracking-widest ml-1">Nom</label>
              <div className="relative">
                <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <input
                  value={formData.lastName}
                  onChange={(e) => setFormData({...formData, lastName: e.target.value})}
                  className="w-full bg-[#1a2235] border border-white/10 rounded-[10px] pl-10 pr-3.5 py-[11px] text-[13px] text-white outline-none focus:border-blue-500/50 transition-colors placeholder-slate-500"
                  placeholder="Votre nom"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="text-[11px] font-medium text-white/35 uppercase tracking-widest ml-1">Email</label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <input
                  disabled
                  value={formData.email}
                  className="w-full bg-[#1a2235] border border-white/10 rounded-[10px] pl-10 pr-3.5 py-[11px] text-[13px] text-slate-400 outline-none cursor-not-allowed"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="text-[11px] font-medium text-white/35 uppercase tracking-widest ml-1">Téléphone</label>
              <div className="relative">
                <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <input
                  value={formData.phone}
                  onChange={(e) => setFormData({...formData, phone: e.target.value})}
                  className="w-full bg-[#1a2235] border border-white/10 rounded-[10px] pl-10 pr-3.5 py-[11px] text-[13px] text-white outline-none focus:border-blue-500/50 transition-colors placeholder-slate-500"
                  placeholder="+33 6 12 34 56 78"
                />
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="h-px bg-white/[0.06] mb-5 mt-2" />
          <div className="flex justify-end gap-3">
            <button className="px-5 py-2 rounded-[10px] text-[13px] font-medium text-slate-300 hover:text-white hover:bg-white/5 transition-colors border border-transparent">
              Annuler
            </button>
            <button onClick={handleProfileSave} className="px-5 py-2 rounded-[10px] text-[13px] font-medium text-white bg-blue-600 hover:bg-blue-500 transition-colors shadow-lg shadow-blue-500/20">
              Sauvegarder
            </button>
          </div>
        </motion.section>

        {/* Sécurité */}
        <motion.section
          variants={sectionVariants}
          initial="hidden"
          animate="visible"
          className="bg-[#111827] border border-white/[0.08] rounded-[16px] p-6 shadow-xl"
        >
          {/* Header */}
          <div className="flex items-center gap-4 mb-5">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: 'rgba(226,75,74,0.15)' }}>
              <Lock className="w-5 h-5 text-[#e24b4a]" />
            </div>
            <div>
              <h3 className="text-[16px] font-medium text-white tracking-tight">Sécurité</h3>
              <p className="text-slate-400 text-[12px] mt-0.5">Modifiez votre mot de passe pour sécuriser votre compte</p>
            </div>
          </div>
          <div className="h-px bg-white/[0.06] mb-6" />

          {/* Form Fields */}
          <div className="space-y-5 mb-6">
            <div className="space-y-1.5">
              <label className="text-[11px] font-medium text-white/35 uppercase tracking-widest ml-1">Mot de passe actuel</label>
              <div className="relative">
                <input
                  type={showCurrentPassword ? "text" : "password"}
                  value={passwordData.currentPassword}
                  onChange={(e) => setPasswordData({...passwordData, currentPassword: e.target.value})}
                  className="w-full bg-[#1a2235] border border-white/10 rounded-[10px] px-3.5 py-[11px] text-[13px] text-white outline-none focus:border-blue-500/50 transition-colors placeholder-slate-500"
                  placeholder="••••••••"
                />
                <button type="button" onClick={() => setShowCurrentPassword(!showCurrentPassword)} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white transition-colors">
                  {showCurrentPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="space-y-1.5">
                <label className="text-[11px] font-medium text-white/35 uppercase tracking-widest ml-1">Nouveau mot de passe</label>
                <div className="relative">
                  <input
                    type={showNewPassword ? "text" : "password"}
                    value={passwordData.newPassword}
                    onChange={(e) => setPasswordData({...passwordData, newPassword: e.target.value})}
                    className="w-full bg-[#1a2235] border border-white/10 rounded-[10px] px-3.5 py-[11px] text-[13px] text-white outline-none focus:border-blue-500/50 transition-colors placeholder-slate-500"
                    placeholder="••••••••"
                  />
                  <button type="button" onClick={() => setShowNewPassword(!showNewPassword)} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white transition-colors">
                    {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {passwordData.newPassword && (
                  <div className="flex items-center gap-2 mt-2 px-1">
                    <div className="flex-1 h-[3px] bg-white/10 rounded-full overflow-hidden">
                      <div className={`h-full ${strength.color} transition-all duration-300`} style={{ width: passwordData.newPassword.length < 6 ? '33%' : passwordData.newPassword.length < 10 ? '66%' : '100%' }} />
                    </div>
                    <span className={`text-[10px] font-medium ${strength.textColor}`}>{strength.label}</span>
                  </div>
                )}
              </div>
              
              <div className="space-y-1.5">
                <label className="text-[11px] font-medium text-white/35 uppercase tracking-widest ml-1">Confirmer le mot de passe</label>
                <div className="relative">
                  <input
                    type={showConfirmPassword ? "text" : "password"}
                    value={passwordData.confirmPassword}
                    onChange={(e) => setPasswordData({...passwordData, confirmPassword: e.target.value})}
                    className="w-full bg-[#1a2235] border border-white/10 rounded-[10px] px-3.5 py-[11px] text-[13px] text-white outline-none focus:border-blue-500/50 transition-colors placeholder-slate-500"
                    placeholder="••••••••"
                  />
                  <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white transition-colors">
                    {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="h-px bg-white/[0.06] mb-5 mt-2" />
          <div className="flex justify-end gap-3">
            <button className="px-5 py-2 rounded-[10px] text-[13px] font-medium text-slate-300 hover:text-white hover:bg-white/5 transition-colors border border-transparent">
              Annuler
            </button>
            <button onClick={handlePasswordSave} className="px-5 py-2 rounded-[10px] text-[13px] font-medium transition-colors" style={{ backgroundColor: 'rgba(226,75,74,0.12)', color: '#F09595' }}>
              Mettre à jour
            </button>
          </div>
        </motion.section>

      </div>
    </PageLayout>
  );
};

export default Profile;
