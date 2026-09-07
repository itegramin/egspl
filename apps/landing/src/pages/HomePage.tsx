import React from 'react';
import { ShieldCheck, WalletCards, Building2, Headphones, TrendingUp, ArrowRight, Sparkles, CheckCircle2 } from 'lucide-react';

const AUTH_BASE = import.meta.env.VITE_AUTH_URL || 'https://auth.egraminservices.com';

const FEATURES = [
  { icon: WalletCards, title: 'Digital Payments', desc: 'Seamless digital transaction handling with full security.' },
  { icon: Building2, title: 'Banking Services', desc: 'CSP banking services bringing banking to rural communities.' },
  { icon: ShieldCheck, title: 'Secure & Compliant', desc: 'Bank-grade encryption and full regulatory compliance.' },
  { icon: TrendingUp, title: 'Business Growth', desc: 'Tools that help you grow your business and client base.' },
  { icon: Headphones, title: '24/7 Support', desc: 'Dedicated support team always available to help you.' },
  { icon: Sparkles, title: 'Modern Dashboard', desc: 'Intuitive role-based dashboard for every operation.' },
];

const STEPS = [
  { n: '01', title: 'Create Account', desc: 'Sign up in minutes with your details.' },
  { n: '02', title: 'Get Approved', desc: 'Our team verifies and approves your account.' },
  { n: '03', title: 'Start Operating', desc: 'Access your dashboard and run operations.' },
];

export const HomePage: React.FC = () => {
  return (
    <main>
      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-emerald-600/20 via-teal-600/10 to-cyan-600/20" />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 lg:py-32 relative">
          <div className="max-w-3xl">
            <span className="inline-flex items-center gap-2 rounded-full bg-emerald-500/10 border border-emerald-500/30 px-4 py-1.5 text-sm text-emerald-300 mb-6">
              <CheckCircle2 className="w-4 h-4" />
              Trusted digital services platform
            </span>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold mb-6 leading-tight">
              Empowering Rural & Urban Economies Through{' '}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-cyan-400">
                Digital Commerce
              </span>
            </h1>
            <p className="text-lg text-slate-300/90 mb-8 max-w-2xl">
              eGramin Services brings banking, insurance, and digital services to everyone.
              Manage operations, track commissions, and grow your business from one platform.
            </p>
            <div className="flex flex-wrap gap-4">
              <a
                href={`${AUTH_BASE}/signup`}
                className="inline-flex items-center gap-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-medium rounded-lg px-6 py-3 transition-all"
              >
                Get Started Free
                <ArrowRight className="w-4 h-4" />
              </a>
              <a
                href={`${AUTH_BASE}/login`}
                className="inline-flex items-center gap-2 border border-white/20 hover:bg-white/5 text-white font-medium rounded-lg px-6 py-3 transition-all"
              >
                Sign In
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold mb-3">Everything You Need</h2>
          <p className="text-slate-400 max-w-2xl mx-auto">
            A complete platform for banking, insurance, and digital services operations.
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {FEATURES.map(({ icon: Icon, title, desc }) => (
            <div key={title} className="rounded-2xl border border-white/10 bg-white/5 p-6 hover:border-emerald-500/30 hover:bg-white/[0.07] transition-all">
              <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-emerald-500/20 to-teal-600/20 flex items-center justify-center mb-4">
                <Icon className="w-5 h-5 text-emerald-400" />
              </div>
              <h3 className="font-semibold mb-2">{title}</h3>
              <p className="text-sm text-slate-400">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold mb-3">How It Works</h2>
          <p className="text-slate-400">Get started in three simple steps.</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {STEPS.map(({ n, title, desc }) => (
            <div key={n} className="relative">
              <span className="text-5xl font-bold text-white/10">{n}</span>
              <h3 className="text-lg font-semibold mt-2 mb-1">{title}</h3>
              <p className="text-sm text-slate-400">{desc}</p>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
};
