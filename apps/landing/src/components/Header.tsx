import React from 'react';
import { Link } from 'react-router-dom';
import { Sparkles } from 'lucide-react';

const AUTH_BASE = import.meta.env.VITE_AUTH_URL || 'https://auth.egraminservices.com';

export const Header: React.FC = () => {
  return (
    <header className="sticky top-0 z-50 backdrop-blur-xl bg-[#0f172a]/80 border-b border-white/10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2">
          <div className="w-9 h-9 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-lg flex items-center justify-center">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <span className="text-lg font-bold">eGramin<span className="text-emerald-400">Services</span></span>
        </Link>

        <nav className="hidden md:flex items-center gap-8">
          <Link to="/" className="text-sm text-slate-300 hover:text-white transition-colors">Home</Link>
          <Link to="/pricing" className="text-sm text-slate-300 hover:text-white transition-colors">Pricing</Link>
          <Link to="/contact" className="text-sm text-slate-300 hover:text-white transition-colors">Contact</Link>
        </nav>

        <div className="flex items-center gap-3">
          <a
            href={`${AUTH_BASE}/login`}
            className="text-sm text-slate-300 hover:text-white transition-colors px-4 py-2"
          >
            Sign In
          </a>
          <a
            href={`${AUTH_BASE}/signup`}
            className="text-sm font-medium bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-lg px-4 py-2 transition-all"
          >
            Get Started
          </a>
        </div>
      </div>
    </header>
  );
};
