import React, { useState, useRef } from 'react';
import { ArrowLeft, ArrowRight, Building, CheckCircle2, Eye, EyeOff, Lock, Mail, Moon, Sparkles, ShieldCheck, Sun, User } from 'lucide-react';
import { signInWithEmail, signInWithOtp, signUpWithEmail, resetPassword } from '@egspl/supabase';
import { Captcha, CaptchaHandle } from '../components/Captcha';

type AuthMode = 'signin' | 'signup' | 'magic' | 'reset';

interface AuthPageProps { initialMode?: AuthMode; }
const countryCodes = ['+91', '+1', '+44', '+971', '+65', '+61'];

const isCaptchaConfigured = Boolean(import.meta.env.VITE_HCAPTCHA_SITE_KEY);

export const AuthPage: React.FC<AuthPageProps> = ({ initialMode = 'signin' }) => {
    const [mode, setMode] = useState<AuthMode>(initialMode);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [name, setName] = useState('');
    const [companyName, setCompanyName] = useState('');
    const [countryCode, setCountryCode] = useState('+91');
    const [phoneNumber, setPhoneNumber] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);
    const [isDark, setIsDark] = useState(true);
    const [captchaToken, setCaptchaToken] = useState<string | null>(null);
    const captchaRef = useRef<CaptchaHandle>(null);

    const resetCaptcha = () => { setCaptchaToken(null); captchaRef.current?.reset(); };
    const changeMode = (nextMode: AuthMode) => { setMode(nextMode); setError(null); setSuccess(null); resetCaptcha(); };

    const handleSubmit = async (event: React.FormEvent) => {
        event.preventDefault();
        setError(null);
        setSuccess(null);
        const normalizedEmail = email.trim();
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) { setError('Please enter a valid email address.'); return; }
        if ((mode === 'signin' || mode === 'signup') && !password) { setError('Please enter your password.'); return; }
        if (mode === 'signup') {
            if (!name.trim()) { setError('Please enter your full name.'); return; }
            if (password.length < 8) { setError('Password must be at least 8 characters long.'); return; }
            if (password !== confirmPassword) { setError('Passwords do not match.'); return; }
        }
        if (isCaptchaConfigured && !captchaToken) { setError('Please complete the security check before continuing.'); return; }
        setIsLoading(true);
        try {
            const result = mode === 'signin'
                ? await signInWithEmail(normalizedEmail, password, captchaToken || undefined)
                : mode === 'signup'
                    ? await signUpWithEmail(normalizedEmail, password, { name: name.trim(), companyName: companyName.trim() || undefined, phoneNumber: phoneNumber.trim() ? `${countryCode} ${phoneNumber.trim()}` : undefined }, captchaToken || undefined)
                    : mode === 'magic' ? await signInWithOtp(normalizedEmail, captchaToken || undefined) : await resetPassword(normalizedEmail, captchaToken || undefined);
            if (!result.success) { setError(result.error || 'The request could not be completed.'); resetCaptcha(); return; }
            const session = 'session' in result ? result.session : null;
            const message = 'message' in result ? result.message : undefined;
            if (mode === 'signin' || (mode === 'signup' && session)) { window.location.href = import.meta.env.VITE_DASHBOARD_URL || 'https://app.egraminservices.com'; return; }
            setSuccess(message || (mode === 'signup' ? 'Account created. Please check your email to confirm your account.' : mode === 'magic' ? 'Magic link sent. Check your email.' : 'Password reset email sent. Check your inbox.'));
            if (mode === 'signup') { setMode('signin'); setPassword(''); setConfirmPassword(''); resetCaptcha(); }
        } catch { setError('An unexpected error occurred. Please try again.'); resetCaptcha(); }
        finally { setIsLoading(false); }
    };

    const pageClass = isDark ? 'bg-slate-950 text-slate-100' : 'bg-slate-50 text-slate-900';
    const panelClass = isDark ? 'bg-slate-900/95 border-slate-800' : 'bg-white border-slate-200';
    const inputClass = isDark ? 'bg-slate-800/80 border-slate-700 text-white placeholder-slate-500' : 'bg-slate-50 border-slate-300 text-slate-900 placeholder-slate-400';

    return <div className={`min-h-screen ${pageClass} transition-colors`}>
        <header className={`flex items-center justify-between border-b px-6 py-4 lg:px-12 ${isDark ? 'border-slate-800 bg-slate-950/80' : 'border-slate-200 bg-white/80'} backdrop-blur-md`}>
            <div className="flex items-center gap-3"><div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-lg shadow-emerald-500/25"><Sparkles className="h-5 w-5" /></div><div><strong className="block text-sm">E-Gramin Services</strong><span className="text-[11px] text-emerald-500">Client Request &amp; Financial Operations</span></div></div>
            <div className="flex items-center gap-2"><button type="button" onClick={() => setIsDark(!isDark)} className="rounded-xl p-2 text-slate-500 hover:bg-slate-800" aria-label="Toggle theme">{isDark ? <Sun className="h-4 w-4 text-amber-400" /> : <Moon className="h-4 w-4 text-emerald-600" />}</button><button type="button" onClick={() => { window.location.href = import.meta.env.VITE_LANDING_URL || 'https://egraminservices.com'; }} className="hidden items-center gap-2 rounded-xl border border-slate-700 px-3 py-2 text-xs font-bold sm:flex"><ArrowLeft className="h-4 w-4 text-emerald-500" /> Go Home</button></div>
        </header>
        <main className="mx-auto grid min-h-[calc(100vh-137px)] max-w-7xl items-center gap-10 px-4 py-10 sm:px-6 lg:grid-cols-2 lg:px-12">
            <section className="hidden space-y-6 lg:block"><div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs font-bold text-emerald-500"><ShieldCheck className="h-4 w-4" /> Enterprise B2B Client Management</div><h1 className="text-5xl font-black leading-tight">Unified Service Desk &amp; <span className="text-emerald-500">Limit/Holding Ops</span></h1><p className={`max-w-xl text-base leading-relaxed ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>Streamline client technical tickets, holding balance deposit confirmations, and withdrawal payouts in one unified governance platform.</p><div className="grid grid-cols-2 gap-3 text-sm"><div className={`rounded-2xl border p-4 ${panelClass}`}><strong className="block">Technical Support Desk</strong><span className="text-xs text-slate-500">Priority queues and internal staff notes.</span></div><div className={`rounded-2xl border p-4 ${panelClass}`}><strong className="block">Holding Balance Updates</strong><span className="text-xs text-slate-500">Proof slip uploads and verification.</span></div></div></section>
            <section className={`mx-auto w-full max-w-lg rounded-3xl border p-6 shadow-xl sm:p-8 ${panelClass}`}><div className="mb-6 flex gap-1 rounded-xl bg-slate-800/60 p-1 text-xs font-bold">{(['signin', 'signup', 'magic'] as const).map((item) => <button key={item} type="button" onClick={() => changeMode(item)} className={`flex-1 rounded-lg py-2 ${mode === item ? 'bg-emerald-600 text-white' : 'text-slate-400'}`}>{item === 'signin' ? 'Sign In' : item === 'signup' ? 'Create Account' : 'Magic Link'}</button>)}</div><h2 className="mb-2 text-2xl font-bold">{mode === 'signin' ? 'Welcome back' : mode === 'signup' ? 'Create your account' : mode === 'magic' ? 'Sign in with a link' : 'Reset your password'}</h2><p className="mb-6 text-sm text-slate-500">Secure access to your E-Gramin operations workspace.</p>{error && <div className="mb-4 rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-sm text-rose-400">{error}</div>}{success && <div className="mb-4 flex gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-sm text-emerald-400"><CheckCircle2 className="h-4 w-4 shrink-0" />{success}</div>}
                <form onSubmit={handleSubmit} className="space-y-4" noValidate>{mode === 'signup' && <><Field icon={<User />} label="Full Name" value={name} onChange={setName} placeholder="Your name" inputClass={inputClass} /><div className="grid gap-4 sm:grid-cols-2"><Field icon={<Building />} label="Company Name" value={companyName} onChange={setCompanyName} placeholder="Company" inputClass={inputClass} required={false} /><div><label className="mb-1 block text-xs font-semibold">Mobile Number</label><div className="flex"><select value={countryCode} onChange={(event) => setCountryCode(event.target.value)} className={`w-20 rounded-l-xl border px-2 text-xs ${inputClass}`}>{countryCodes.map((code) => <option key={code}>{code}</option>)}</select><input value={phoneNumber} onChange={(event) => setPhoneNumber(event.target.value.replace(/\D/g, ''))} className={`min-w-0 flex-1 rounded-r-xl border px-3 py-2 text-sm ${inputClass}`} placeholder="Mobile" /></div></div></div></>}<Field icon={<Mail />} label="Email Address" value={email} onChange={setEmail} placeholder="name@company.com" type="email" inputClass={inputClass} />{(mode === 'signin' || mode === 'signup') && <PasswordField label="Password" value={password} onChange={setPassword} visible={showPassword} onToggle={() => setShowPassword(!showPassword)} inputClass={inputClass} />}{mode === 'signup' && <PasswordField label="Confirm Password" value={confirmPassword} onChange={setConfirmPassword} visible={showConfirmPassword} onToggle={() => setShowConfirmPassword(!showConfirmPassword)} inputClass={inputClass} />}<Captcha ref={captchaRef} onTokenChange={setCaptchaToken} /><button type="submit" disabled={isLoading} className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-3 text-sm font-bold text-white shadow-lg shadow-emerald-600/25 disabled:opacity-60">{isLoading ? 'Processing...' : mode === 'reset' ? 'Send Recovery Email' : mode === 'magic' ? 'Send Magic Link' : mode === 'signup' ? 'Complete Sign Up' : 'Sign In to Dashboard'} {!isLoading && <ArrowRight className="h-4 w-4" />}</button></form><div className="mt-5 flex justify-between text-xs text-slate-500"><button type="button" onClick={() => changeMode(mode === 'signin' ? 'signup' : 'signin')} className="text-emerald-500">{mode === 'signin' ? 'Create an account' : 'Back to sign in'}</button>{mode === 'signin' && <button type="button" onClick={() => changeMode('reset')} className="text-emerald-500">Forgot password?</button>}</div></section>
        </main><footer className="border-t border-slate-800 px-6 py-4 text-center text-xs text-slate-500">Egramin Services Client Management Service Platform.</footer>
    </div>;
};

interface FieldProps { icon: React.ReactNode; label: string; value: string; onChange: (value: string) => void; placeholder: string; inputClass: string; type?: string; required?: boolean; }
const Field: React.FC<FieldProps> = ({ icon, label, value, onChange, placeholder, inputClass, type = 'text', required = true }) => <div><label className="mb-1 block text-xs font-semibold">{label}</label><div className="relative"><span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">{React.cloneElement(icon as React.ReactElement<{ className?: string }>, { className: 'h-4 w-4' })}</span><input required={required} type={type} value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} className={`w-full rounded-xl border py-2 pl-9 pr-3 text-sm outline-none focus:ring-2 focus:ring-emerald-500 ${inputClass}`} /></div></div>;

interface PasswordFieldProps { label: string; value: string; onChange: (value: string) => void; visible: boolean; onToggle: () => void; inputClass: string; }
const PasswordField: React.FC<PasswordFieldProps> = ({ label, value, onChange, visible, onToggle, inputClass }) => <div><label className="mb-1 block text-xs font-semibold">{label}</label><div className="relative"><Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" /><input required type={visible ? 'text' : 'password'} value={value} onChange={(event) => onChange(event.target.value)} className={`w-full rounded-xl border px-9 py-2 text-sm outline-none focus:ring-2 focus:ring-emerald-500 ${inputClass}`} /><button type="button" onClick={onToggle} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500" aria-label={visible ? 'Hide password' : 'Show password'}>{visible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}</button></div></div>;