import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useApp } from '../../context/AppContext';
import { RoleBadge } from '../common/Badge';
import {
  X,
  User,
  Building,
  Phone,
  Wallet,
  Globe,
  Camera,
  Check,
  Save,
  RefreshCw,
  Sparkles,
  ShieldCheck,
  Store,
  Eye,
  EyeOff,
  Lock,
  MapPin,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

const AVATAR_PRESETS = [
  'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150',
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150',
  'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150',
  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
  'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150',
  'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=150',
  'https://api.dicebear.com/7.x/avataaars/svg?seed=Felix',
  'https://api.dicebear.com/7.x/avataaars/svg?seed=Aneka',
  'https://api.dicebear.com/7.x/avataaars/svg?seed=Precious',
];

export const EditProfileModal: React.FC = () => {
  const { user, isProfileModalOpen, closeProfileModal, updateUserProfile } = useAuth();
  const { toast, cspCategories } = useApp();

  const [name, setName] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [accountNo, setAccountNo] = useState('');
  const [bankName, setBankName] = useState('');
  const [bankCode, setBankCode] = useState('');
  const [currency, setCurrency] = useState('INR');
  const [kioskId, setKioskId] = useState('');
  const [category, setCategory] = useState<'rural' | 'urban' | string>('rural');
  const [showAccountNo, setShowAccountNo] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState('');
  const [isCustomAvatar, setIsCustomAvatar] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const isStaff = user.role === 'admin' || user.role === 'operator';

  useEffect(() => {
    if (user && isProfileModalOpen) {
      setName(user.name || '');
      setCompanyName(user.companyName || '');
      setPhoneNumber(user.phoneNumber || '');
      setAccountNo(user.account || '');
      setBankName(user.bank || '');
      setBankCode(user.ifsc || '');
      setCurrency(user.currency || 'INR');
      setKioskId(user.kioskId || '');
      setCategory(user.category || 'rural');
      setAvatarUrl(user.avatarUrl || '');
      setIsCustomAvatar(!AVATAR_PRESETS.includes(user.avatarUrl));
    }
  }, [user, isProfileModalOpen]);

  if (!isProfileModalOpen || !user) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast('Name cannot be empty', 'error');
      return;
    }

    setIsSaving(true);
    try {
      const res = await updateUserProfile({
        name: name.trim(),
        companyName: companyName.trim() || undefined,
        phoneNumber: phoneNumber.trim() || undefined,
        account: accountNo.trim() || undefined,
        bank: bankName.trim() || undefined,
        ifsc: bankCode.trim() || undefined,
        kioskId: kioskId.trim() || undefined,
        category: category.trim() || 'rural',
        currency,
        avatarUrl: avatarUrl.trim() || user.avatarUrl,
      });

      if (res.success) {
        toast('Profile updated successfully!', 'success');
        closeProfileModal();
      } else {
        toast(res.error || 'Failed to update profile', 'error');
      }
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={closeProfileModal}
          className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm"
        />

        {/* Modal Container */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          transition={{ duration: 0.2 }}
          className="relative z-10 mt-80 w-full max-w-xl bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200/80 dark:border-slate-800 overflow-hidden my-8"
        >
          {/* Header */}
          <div className="bg-gradient-to-r from-slate-900 via-emerald-950/80 to-slate-900 text-white p-6 relative border-b border-emerald-900/40">
            <button
              onClick={closeProfileModal}
              className="absolute top-5 right-5 p-2 rounded-xl text-slate-400 hover:text-rose-400 hover:bg-white/10 active:scale-95 transition-all border border-transparent hover:border-rose-400/30"
              aria-label="Close modal"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-2.5 mb-1.5">
              <div className="w-8 h-8 rounded-lg bg-emerald-600 flex items-center justify-center text-white shadow-md shadow-emerald-500/30">
                <User className="w-4 h-4" />
              </div>
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-400">
                User Profile Settings
              </span>
            </div>

            <h2 className="text-xl font-black text-white">Edit Your Profile</h2>
            <p className="text-xs text-slate-300 mt-0.5">
              Update your personal credentials, contact info, and profile avatar.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="p-6 space-y-5">
            {/* Avatar Selector */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2">
                Profile Avatar
              </label>

              <div className="flex items-center gap-4 mb-3">
                <div className="relative">
                  <img
                    src={avatarUrl || user.avatarUrl}
                    alt="Preview"
                    className="w-16 h-16 rounded-2xl object-cover border-2 border-indigo-500 shadow-md shadow-indigo-500/10"
                  />
                  <div className="absolute -bottom-1 -right-1 p-1 rounded-full bg-indigo-600 text-white text-[10px]">
                    <Camera className="w-3 h-3" />
                  </div>
                </div>

                <div className="flex-1">
                  <div className="text-xs font-bold text-slate-900 dark:text-white">
                    Select Avatar Preset
                  </div>
                  <div className="text-[11px] text-slate-400 mt-0.5">
                    Click a preset below or enter a custom image URL.
                  </div>
                </div>
              </div>

              {/* Preset Row */}
              <div className="flex items-center gap-2 overflow-x-auto py-1">
                {AVATAR_PRESETS.map((preset, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      setAvatarUrl(preset);
                      setIsCustomAvatar(false);
                    }}
                    className={`relative shrink-0 w-10 h-10 rounded-xl overflow-hidden border-2 transition-all ${avatarUrl === preset
                      ? 'border-indigo-600 scale-105 shadow-sm'
                      : 'border-slate-200 dark:border-slate-700 opacity-70 hover:opacity-100'
                      }`}
                  >
                    <img src={preset} alt={`preset-${idx}`} className="w-full h-full object-cover" />
                    {avatarUrl === preset && (
                      <div className="absolute inset-0 bg-indigo-600/30 flex items-center justify-center">
                        <Check className="w-4 h-4 text-white font-bold" />
                      </div>
                    )}
                  </button>
                ))}
              </div>

              {/* Custom Image URL Toggle */}
              <div className="mt-2.5">
                <input
                  type="url"
                  placeholder="Or paste custom image URL (https://...)"
                  value={avatarUrl}
                  onChange={(e) => {
                    setAvatarUrl(e.target.value);
                    setIsCustomAvatar(true);
                  }}
                  className="w-full px-3 py-1.5 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:outline-none placeholder-slate-400"
                />
              </div>
            </div>

            {/* Read-only details / Badges */}
            <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60 flex items-center justify-between text-xs">
              <div>
                <span className="text-slate-400 block text-[11px]">Email Address</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200">{user.email}</span>
              </div>
              <div className="text-right">
                <span className="text-slate-400 block text-[11px]">Account Role</span>
                <RoleBadge role={user.role} />
              </div>
            </div>

            {/* Inputs Grid */}
            <div className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Full Name *
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Enter your full name"
                    className="w-full pl-9 pr-4 py-2 text-xs sm:text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Company Name
                  </label>
                  <div className="relative">
                    <Building className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                      type="text"
                      value={companyName}
                      onChange={(e) => setCompanyName(e.target.value)}
                      placeholder="e.g. Apex Holdings"
                      className="w-full pl-9 pr-4 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Phone Number
                  </label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                      type="tel"
                      value={phoneNumber}
                      onChange={(e) => setPhoneNumber(e.target.value)}
                      placeholder="+1 (555) 000-0000"
                      className="w-full pl-9 pr-4 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                    />
                  </div>
                </div>
              </div>
              {!isStaff && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1 border-t border-slate-100 dark:border-slate-800/80">
                  <div className="sm:col-span-2">
                    <div className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5 mb-1">
                      <Building className="w-3.5 h-3.5 text-indigo-500" />
                      <span>Banking & Settlement Details</span>
                    </div>
                    <p className="text-[11px] text-slate-400">
                      Your banking information used for holding deposits, withdrawals, and account verification.
                    </p>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Bank Name
                    </label>
                    <div className="relative">
                      <Building className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <input
                        type="text"
                        value={bankName}
                        onChange={(e) => setBankName(e.target.value)}
                        placeholder="e.g. State Bank of India"
                        className="w-full pl-9 pr-4 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      IFSC Code
                    </label>
                    <div className="relative">
                      <Wallet className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <input
                        type="text"
                        value={bankCode}
                        onChange={(e) => setBankCode(e.target.value.toUpperCase())}
                        placeholder="e.g. SBIN0001234"
                        className="w-full pl-9 pr-4 py-2 text-xs font-mono uppercase rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                      />
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                        Account Number
                      </label>
                      <span className="inline-flex items-center gap-1 text-[10px] font-medium text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-1.5 py-0.5 rounded border border-emerald-200 dark:border-emerald-800">
                        <Lock className="w-2.5 h-2.5" />
                        Masked & Secure
                      </span>
                    </div>
                    <div className="relative">
                      <Wallet className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <input
                        type={showAccountNo ? 'text' : 'password'}
                        value={accountNo}
                        onChange={(e) => setAccountNo(e.target.value)}
                        placeholder="e.g. 123456789012"
                        className="w-full pl-9 pr-10 py-2 text-xs font-mono rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => setShowAccountNo(!showAccountNo)}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded transition-colors"
                        title={showAccountNo ? 'Mask account number' : 'Show account number'}
                      >
                        {showAccountNo ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Kiosk ID
                    </label>
                    <div className="relative">
                      <Store className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <input
                        type="text"
                        value={kioskId}
                        onChange={(e) => setKioskId(e.target.value)}
                        placeholder="e.g. KIOSK-091"
                        className="w-full pl-9 pr-4 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                      />
                    </div>
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      CSP Area Category *
                    </label>
                    <div className="relative">
                      <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-indigo-500" />
                      <select
                        value={category}
                        onChange={(e) => setCategory(e.target.value)}
                        className="w-full pl-9 pr-4 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:outline-none cursor-pointer font-medium"
                      >
                        {cspCategories && cspCategories.length > 0 ? (
                          cspCategories.map((c) => (
                            <option key={c.id || c.code} value={c.code}>
                              {c.name} — {c.cspSharePercent}% Base CSP Commission Share
                            </option>
                          ))
                        ) : (
                          <>
                            <option value="rural">Rural — 75% Base CSP Commission Share</option>
                            <option value="urban">Urban — 70% Base CSP Commission Share</option>
                          </>
                        )}
                      </select>
                    </div>
                    <p className="text-[11px] text-slate-400 mt-1">
                      Commission split share is differentiated by kiosk operating location (Rural CSPs receive 75% base share; Urban CSPs receive 70%).
                    </p>
                  </div>
                </div>
              )}

            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-slate-200 dark:border-slate-800">
              <button
                type="button"
                onClick={closeProfileModal}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSaving}
                className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 active:scale-98 text-white text-xs font-bold shadow-md shadow-indigo-600/20 flex items-center gap-2 transition-all"
              >
                {isSaving ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Save className="w-3.5 h-3.5" />
                )}
                <span>{isSaving ? 'Saving Changes...' : 'Save Profile Changes'}</span>
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
