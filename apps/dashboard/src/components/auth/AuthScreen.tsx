import React, { useState } from 'react';
import { useAuth, AuthModalMode } from '../../context/AuthContext';
import { useApp } from '../../context/AppContext';
import { isValidEmail, isValidPhoneNumber, formatFullPhoneNumber, COUNTRY_CODES } from '../../lib/validators';
import {
  Sparkles,
  Lock,
  Mail,
  User,
  Building,
  Phone,
  ArrowRight,
  ArrowLeft,
  Eye,
  EyeOff,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  ExternalLink,
  ShieldCheck,
  WalletCards,
  Headphones,
  Moon,
  Sun,
  Globe
} from 'lucide-react';
import { motion } from 'motion/react';
import { LottieIcon } from '../common/LottieIcon';
import { fadeUp, scaleIn, staggerContainer, staggerItem } from '../../lib/animations';

export const AuthScreen: React.FC = () => {
  const {
    signInWithPassword,
    signUpWithPassword,
    signInWithOtp,
    resetPasswordForEmail,
  } = useAuth();
  const { goToHome, setCurrentView, isDarkMode, toggleTheme, toast } = useApp();

  const [mode, setMode] = useState<AuthModalMode>('signin');

  // Form inputs
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [name, setName] = useState('');
  // Security: role is not user-selectable — all self-signups are always 'client'.
  // Role promotion is a privileged admin action only.
  const [companyName, setCompanyName] = useState('');
  const [countryCode, setCountryCode] = useState('+91');
  const [phoneNumber, setPhoneNumber] = useState('');

  // UI state
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const clearFormInputs = () => {
    setName('');
    setEmail('');
    setPassword('');
    setConfirmPassword('');
    setCompanyName('');
    setPhoneNumber('');
    setCountryCode('+91');
    setShowPassword(false);
    setShowConfirmPassword(false);
  };

  const handleModeSwitch = (newMode: AuthModalMode) => {
    setErrorMsg(null);
    setSuccessMsg(null);
    setMode(newMode);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);
    setIsLoading(true);

    try {
      const trimmedEmail = email.trim();

      // Common Email Format Validation across all auth modes
      if (!trimmedEmail) {
        setErrorMsg('Please enter your email address.');
        setIsLoading(false);
        return;
      }

      if (!isValidEmail(trimmedEmail)) {
        setErrorMsg('Please enter a valid email address (e.g. name@company.com).');
        setIsLoading(false);
        return;
      }

      if (mode === 'signin') {
        if (!password) {
          setErrorMsg('Please enter your password.');
          setIsLoading(false);
          return;
        }

        const res = await signInWithPassword(trimmedEmail, password);
        if (res.success) {
          setCurrentView('app');
        } else {
          setErrorMsg(res.error || 'Authentication failed. Please verify your credentials or select a 1-click demo persona.');
        }
      } else if (mode === 'signup') {
        if (!name.trim()) {
          setErrorMsg('Please enter your full name.');
          setIsLoading(false);
          return;
        }

        if (!password) {
          setErrorMsg('Please enter a password.');
          setIsLoading(false);
          return;
        }

        if (password.length < 8) {
          setErrorMsg('Password must be at least 8 characters long.');
          setIsLoading(false);
          return;
        }

        if (!confirmPassword) {
          setErrorMsg('Please confirm your password.');
          setIsLoading(false);
          return;
        }

        if (password !== confirmPassword) {
          setErrorMsg('Passwords do not match. Please verify your confirm password.');
          setIsLoading(false);
          return;
        }

        if (phoneNumber.trim() && !isValidPhoneNumber(phoneNumber.trim())) {
          setErrorMsg('Please enter a valid mobile number (7-15 digits).');
          setIsLoading(false);
          return;
        }

        const fullPhone = phoneNumber.trim()
          ? formatFullPhoneNumber(countryCode, phoneNumber.trim())
          : undefined;

        const res = await signUpWithPassword(trimmedEmail, password, {
          name: name.trim(),
          // role omitted — server always assigns 'client' for new signups
          companyName: companyName.trim() || undefined,
          phoneNumber: fullPhone,
        });

        if (!res.success) {
          setErrorMsg(res.error || 'Registration failed.');
        } else {
          // Clear all input boxes on successful sign up
          clearFormInputs();
          // Switch tab directly to Login screen
          setMode('signin');
          const completionMsg = res.message || 'Account registered successfully! Please sign in with your email and password.';
          setSuccessMsg(completionMsg);
          toast(completionMsg, 'success');
        }
      } else if (mode === 'magic') {
        const res = await signInWithOtp(trimmedEmail);
        if (!res.success) {
          setErrorMsg(res.error || 'Failed to send magic link.');
        } else {
          setSuccessMsg(res.message || 'Magic link dispatched to your email address!');
          toast('Magic sign-in link sent!', 'success');
        }
      } else if (mode === 'reset') {
        const res = await resetPasswordForEmail(trimmedEmail);
        if (!res.success) {
          setErrorMsg(res.error || 'Password reset request failed.');
        } else {
          setSuccessMsg(res.message || 'Password recovery instructions sent to your email!');
          toast('Password reset email sent!', 'info');
        }
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col justify-between font-sans relative overflow-x-hidden selection:bg-emerald-500 selection:text-white transition-colors duration-200">
      {/* Background glow accents */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-emerald-500/10 dark:bg-emerald-600/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-10 right-10 w-96 h-96 bg-teal-500/10 dark:bg-teal-600/15 rounded-full blur-3xl pointer-events-none" />

      {/* Top Header Navigation */}
      <header className="px-6 lg:px-12 py-4 sm:py-5 flex items-center justify-between border-b border-slate-200/80 dark:border-slate-800/80 bg-white/80 dark:bg-slate-950/80 backdrop-blur-md relative z-10 transition-colors">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-grad-brand flex items-center justify-center text-white shadow-lg shadow-emerald-500/25">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <span className="font-extrabold text-base tracking-tight text-slate-900 dark:text-white block">
                E-Gramin Services
              </span>
              <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold">
                Client Request & Financial Operations
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5 sm:gap-3">
          {/* Generic service status */}
          <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-slate-500 dark:text-slate-400">Service:</span>
            <span className="font-semibold text-emerald-600 dark:text-emerald-400">Online</span>
          </div>

          <button
            type="button"
            id="auth-theme-toggle-btn"
            onClick={toggleTheme}
            className="p-2 rounded-xl text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            title={isDarkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            aria-label="Toggle theme"
          >
            {isDarkMode ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-emerald-600" />}
          </button>

          <button
            id="auth-back-to-home-btn"
            onClick={goToHome}
            className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white hover:bg-slate-100 dark:bg-slate-900 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800 text-xs font-bold text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition-all shadow-xs group"
          >
            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform text-emerald-600 dark:text-emerald-400" />
            <span>Go Home</span>
          </button>
        </div>
      </header>

      {/* Main Dual-Column Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-12 py-8 lg:py-12 grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center relative z-10">
        {/* Left Column: Platform Branding & Value Props */}
        <div className="lg:col-span-6 space-y-6">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-500/30">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
            <span>Enterprise B2B Client Management</span>
          </div>

          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight text-slate-900 dark:text-white leading-tight">
            Unified Service Desk & <span className="text-transparent bg-clip-text bg-grad-brand">Limit/Holding Ops</span>
          </h1>

          <p className="text-sm sm:text-base text-slate-600 dark:text-slate-300 leading-relaxed max-w-xl">
            Streamline client technical tickets, holding balance deposit confirmations, and withdrawal payouts in one unified governance platform.
          </p>

          {/* Feature Highlights Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-2">
            <div className="p-4 rounded-2xl bg-white dark:bg-slate-900/90 border border-slate-200/80 dark:border-slate-800/80 shadow-xs hover:border-emerald-300 dark:hover:border-slate-700 transition-all">
              <div className="w-8 h-8 rounded-lg bg-emerald-100 dark:bg-emerald-600/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mb-2">
                <Headphones className="w-4 h-4" />
              </div>
              <h4 className="text-xs font-bold text-slate-900 dark:text-white">Technical Support Desk</h4>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">Multi-environment bug logs, priority queues, and internal staff notes.</p>
            </div>

            <div className="p-4 rounded-2xl bg-white dark:bg-slate-900/90 border border-slate-200/80 dark:border-slate-800/80 shadow-xs hover:border-emerald-300 dark:hover:border-slate-700 transition-all">
              <div className="w-8 h-8 rounded-lg bg-emerald-100 dark:bg-emerald-600/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mb-2">
                <WalletCards className="w-4 h-4" />
              </div>
              <h4 className="text-xs font-bold text-slate-900 dark:text-white">Holding Balance Updates</h4>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">Wire/SEPA proof slip uploads and operator transaction verification.</p>
            </div>
          </div>
        </div>

        {/* Right Column: Authentication Card */}
        <div className="lg:col-span-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="w-full max-w-lg mx-auto bg-white dark:bg-slate-900/95 backdrop-blur-xl border border-slate-200 dark:border-slate-800 rounded-3xl shadow-xl dark:shadow-2xl p-6 sm:p-8 space-y-6 transition-colors"
          >
            {/* Tab Selector */}
            <div className="flex items-center p-1 bg-slate-100 dark:bg-slate-950/80 rounded-xl border border-slate-200 dark:border-slate-800 text-xs font-bold">
              <button
                type="button"
                id="tab-signin-btn"
                onClick={() => handleModeSwitch('signin')}
                className={`flex-1 py-2 rounded-lg transition-all ${
                  mode === 'signin'
                    ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/30'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
              >
                Sign In
              </button>
              <button
                type="button"
                id="tab-signup-btn"
                onClick={() => handleModeSwitch('signup')}
                className={`flex-1 py-2 rounded-lg transition-all ${
                  mode === 'signup'
                    ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/30'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
              >
                Create Account
              </button>
              <button
                type="button"
                id="tab-magic-btn"
                onClick={() => handleModeSwitch('magic')}
                className={`flex-1 py-2 rounded-lg transition-all ${
                  mode === 'magic'
                    ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/30'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
              >
                Magic Link
              </button>
            </div>

            {/* Error / Success Feedback */}
            {errorMsg && (
              <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs flex items-start gap-2.5">
                <AlertCircle className="w-4 h-4 text-rose-500 dark:text-rose-400 shrink-0 mt-0.5" />
                <span>{errorMsg}</span>
              </div>
            )}

            {successMsg && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ type: 'spring', stiffness: 300, damping: 22 }}
                className="p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 text-xs flex items-start gap-2.5"
              >
                <LottieIcon name="success" size={24} loop={false} />
                <div className="space-y-1">
                  <div>{successMsg}</div>
                  <a
                    href="https://gray-bay-08280e010-1.centralus.7.azurestaticapps.net/"
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 font-bold text-emerald-600 dark:text-emerald-400 hover:underline"
                  >
                    <span>View Mail</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              </motion.div>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-4" noValidate>
              {/* Sign Up Specific Fields */}
              {mode === 'signup' && (
                <>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                      Full Name *
                    </label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 dark:text-slate-500" />
                      <input
                        type="text"
                        required
                        id="signup-name-input"
                        placeholder="Elena Vance"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="w-full pl-9 pr-4 py-2 text-xs sm:text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                        Company Name
                      </label>
                      <div className="relative">
                        <Building className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 dark:text-slate-500" />
                        <input
                          type="text"
                          id="signup-company-input"
                          placeholder="Apex Holdings"
                          value={companyName}
                          onChange={(e) => setCompanyName(e.target.value)}
                          className="w-full pl-9 pr-4 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                        />
                      </div>
                    </div>

                    {/* Mobile Number with Country Code Dropdown */}
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                        Mobile Number
                      </label>
                      <div className="flex rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 focus-within:ring-2 focus-within:ring-emerald-500 focus-within:border-transparent overflow-hidden">
                        <select
                          id="signup-country-code-select"
                          value={countryCode}
                          onChange={(e) => setCountryCode(e.target.value)}
                          className="pl-2 pr-1 py-2 text-xs bg-slate-100 dark:bg-slate-900 text-slate-800 dark:text-slate-200 border-r border-slate-300 dark:border-slate-700 focus:outline-none cursor-pointer font-medium"
                          title="Select Country Dial Code"
                        >
                          {COUNTRY_CODES.map((c) => (
                            <option key={c.code} value={c.code} className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">
                              {c.flag} {c.code}
                            </option>
                          ))}
                        </select>
                        <input
                          type="tel"
                          id="signup-phone-input"
                          placeholder="98765 43210"
                          value={phoneNumber}
                          onChange={(e) => setPhoneNumber(e.target.value.replace(/[^0-9\s-]/g, ''))}
                          className="w-full px-3 py-2 text-xs bg-transparent text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="p-2.5 rounded-xl bg-amber-50 dark:bg-yellow-950/40 border border-amber-200 dark:border-yellow-800/60 text-[11px] text-amber-800 dark:text-yellow-300 flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-amber-600 dark:text-yellow-400 shrink-0" />
                    <span>New accounts are activated upon administrator approval.</span>
                  </div>
                </>
              )}

              {/* Email Input (All modes) */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Email Address *
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 dark:text-slate-500" />
                  <input
                    type="email"
                    required
                    id="auth-email-input"
                    placeholder="name@company.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-9 pr-4 py-2 text-xs sm:text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              {/* Password (Sign In & Sign Up) */}
              {(mode === 'signin' || mode === 'signup') && (
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                      Password *
                    </label>
                    {mode === 'signin' && (
                      <button
                        type="button"
                        id="auth-forgot-password-btn"
                        onClick={() => handleModeSwitch('reset')}
                        className="text-xs text-emerald-600 dark:text-emerald-400 hover:underline font-medium"
                      >
                        Forgot password?
                      </button>
                    )}
                  </div>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 dark:text-slate-500" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      id="auth-password-input"
                      placeholder="••••••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full pl-9 pr-10 py-2 text-xs sm:text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                      title={showPassword ? 'Hide password' : 'Show password'}
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              )}

              {/* Confirm Password (Sign Up Only) */}
              {mode === 'signup' && (
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    Confirm Password *
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 dark:text-slate-500" />
                    <input
                      type={showConfirmPassword ? 'text' : 'password'}
                      required
                      id="signup-confirm-password-input"
                      placeholder="••••••••••••"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className={`w-full pl-9 pr-10 py-2 text-xs sm:text-sm rounded-xl border bg-slate-50 dark:bg-slate-800/80 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 ${
                        confirmPassword && password !== confirmPassword
                          ? 'border-rose-500 focus:ring-rose-500'
                          : confirmPassword && password === confirmPassword
                          ? 'border-emerald-500 focus:ring-emerald-500'
                          : 'border-slate-300 dark:border-slate-700 focus:ring-indigo-500'
                      }`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                      title={showConfirmPassword ? 'Hide confirm password' : 'Show confirm password'}
                    >
                      {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  {confirmPassword && password !== confirmPassword && (
                    <p className="text-[11px] text-rose-600 dark:text-rose-400 mt-1">Passwords do not match</p>
                  )}
                  {confirmPassword && password === confirmPassword && (
                    <p className="text-[11px] text-emerald-600 dark:text-emerald-400 mt-1 flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" /> Passwords match
                    </p>
                  )}
                </div>
              )}

              {/* Submit Button */}
              <button
                type="submit"
                id="auth-submit-btn"
                disabled={isLoading}
                className="w-full py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 active:scale-98 text-white text-xs sm:text-sm font-bold shadow-lg shadow-emerald-600/30 flex items-center justify-center gap-2 transition-all mt-2 disabled:opacity-60"
              >
                {isLoading ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <ArrowRight className="w-4 h-4" />
                )}
                <span>
                  {mode === 'signin' && (isLoading ? 'Signing In...' : 'Sign In to Dashboard')}
                  {mode === 'signup' && (isLoading ? 'Creating Account...' : 'Complete Sign Up')}
                  {mode === 'magic' && (isLoading ? 'Sending Link...' : 'Send Magic Link')}
                  {mode === 'reset' && (isLoading ? 'Sending Email...' : 'Send Recovery Email')}
                </span>
              </button>
            </form>
          </motion.div>
        </div>
      </main>

      {/* Footer */}
      <footer className="px-6 py-4 border-t border-slate-200/80 dark:border-slate-800 text-center text-xs text-slate-500 dark:text-slate-400 bg-white/50 dark:bg-slate-950/50 relative z-10 transition-colors">
        <span>Egramin Services Client Management Service Platform.</span>
      </footer>
    </div>
  );
};
