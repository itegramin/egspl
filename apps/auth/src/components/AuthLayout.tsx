import React from 'react';
import { Sparkles, Lock, ShieldCheck, WalletCards, Headphones } from 'lucide-react';
import { motion } from 'motion/react';

interface AuthLayoutProps {
  children: React.ReactNode;
  title: string;
  subtitle: string;
}

export const AuthLayout: React.FC<AuthLayoutProps> = ({ children, title, subtitle }) => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0f172a] via-[#1e293b] to-[#0f172a] flex">
      {/* Left side - Branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-emerald-600/20 via-teal-600/10 to-cyan-600/20 p-12 flex-col justify-between relative overflow-hidden">
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-12 h-12 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl flex items-center justify-center">
              <Sparkles className="w-7 h-7 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">eGramin</h1>
              <p className="text-emerald-300/70 text-sm">Services</p>
            </div>
          </div>
          <h2 className="text-4xl font-bold text-white mb-4">
            Welcome to<br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-cyan-400">
              eGramin Services
            </span>
          </h2>
          <p className="text-slate-300/80 text-lg">
            Empowering rural and urban economies through digital commerce.
          </p>
        </div>
        <div className="relative z-10 grid grid-cols-2 gap-4">
          {[
            { icon: ShieldCheck, label: 'Bank-Grade Security' },
            { icon: Lock, label: 'Encrypted Data' },
            { icon: WalletCards, label: 'Digital Payments' },
            { icon: Headphones, label: '24/7 Support' },
          ].map(({ icon: Icon, label }) => (
            <div key={label} className="flex items-center gap-2 text-slate-300/70">
              <Icon className="w-4 h-4 text-emerald-400" />
              <span className="text-sm">{label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Right side - Auth Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md"
        >
          <div className="lg:hidden flex items-center gap-3 mb-8">
            <div className="w-10 h-10 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl flex items-center justify-center">
              <Sparkles className="w-6 h-6 text-white" />
            </div>
            <h1 className="text-xl font-bold text-white">eGramin</h1>
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">{title}</h2>
          <p className="text-slate-400 mb-8">{subtitle}</p>
          {children}
        </motion.div>
      </div>
    </div>
  );
};
