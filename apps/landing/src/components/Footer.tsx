import React from 'react';
import { Link } from 'react-router-dom';

export const Footer: React.FC = () => {
  return (
    <footer className="border-t border-white/10 bg-[#0b1120]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-sm text-slate-400">
            © {new Date().getFullYear()} eGramin Services. All rights reserved.
          </p>
          <nav className="flex items-center gap-6">
            <Link to="/" className="text-sm text-slate-400 hover:text-slate-200 transition-colors">Home</Link>
            <Link to="/pricing" className="text-sm text-slate-400 hover:text-slate-200 transition-colors">Pricing</Link>
            <Link to="/contact" className="text-sm text-slate-400 hover:text-slate-200 transition-colors">Contact</Link>
          </nav>
        </div>
      </div>
    </footer>
  );
};
