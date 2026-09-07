import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { LogIn } from 'lucide-react';

import eGraminLogo from '../assets/images/e-gramin-logo.png';

const AUTH_BASE =
  import.meta.env.VITE_AUTH_URL || 'https://auth.egraminservices.com';

const NAV_LINKS = [
  { label: 'Home', to: '/' },
  { label: 'About us', to: '/about' },
  { label: 'Services', to: '/services' },
  { label: 'Gallery', to: '/gallery' },
  { label: 'Contact Us', to: '/contact' },
];

const linkBase = 'text-sm font-medium transition-colors';

export const Header: React.FC = () => {
  const [isNewsModalOpen, setIsNewsModalOpen] = useState(false);

  return (
    <>
      {/* Top bar */}
      <div className="bg-[#1a7b46] text-white text-[13px]">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 flex flex-wrap items-center justify-between py-2 gap-2">
          <span className="font-semibold tracking-wide">Welcome to e-Gramin</span>
          <div className="flex flex-wrap items-center gap-4 font-medium">
            <span className="opacity-95">helpdesk[dot]egramin[at]gmail[dot]com</span>
            <span className="opacity-95">0361-3511441</span>
          </div>
        </div>
      </div>

      {/* Main header */}
      <header className="sticky top-0 z-40 bg-[#1b8c4e] text-white border-b border-white/10">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-3 flex items-center justify-between gap-6">
          <NavLink to="/" className="flex items-center gap-3 shrink-0">
            <img src={eGraminLogo} alt="e-Gramin Logo" className="h-8 w-auto bg-white rounded-sm p-0.5" />
          </NavLink>

          <nav className="hidden md:flex items-center gap-1">
            {NAV_LINKS.map(({ label, to }) => (
              <NavLink
                key={to}
                to={to}
                end={to === '/'}
                className={({ isActive }) =>
                  isActive
                    ? `${linkBase} text-white bg-white/15 rounded-md px-3 py-1.5`
                    : `${linkBase} text-white/90 hover:text-white hover:bg-white/10 rounded-md px-3 py-1.5`
                }
              >
                {label}
              </NavLink>
            ))}
          </nav>

          <a
            id="header-login-btn"
            href={`${AUTH_BASE}/login`}
            className="inline-flex items-center gap-2 bg-[#d96305] hover:bg-[#b85404] text-white font-semibold text-sm rounded-md px-4 py-2 transition-colors shrink-0"
          >
            <LogIn className="w-4 h-4" />
            Login
          </a>
        </div>
      </header>

      {/* Notification marquee */}
      <div className="bg-[#fff7cc] border-y border-[#ffe17a] py-2 overflow-hidden">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 text-center">
          <a
            href="#news"
            onClick={(e: React.MouseEvent) => {
              e.preventDefault();
              setIsNewsModalOpen(true);
            }}
            className="text-sm font-semibold text-[#8a5f00] hover:underline"
          >
            PAN Card services are available
          </a>
        </div>
      </div>

      {/* News detail modal */}
      {isNewsModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setIsNewsModalOpen(false)}>
          <div className="w-full max-w-lg rounded-lg bg-white shadow-xl overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between bg-[#1b8c4e] text-white px-4 py-3">
              <span className="font-bold">Notice</span>
              <button
                type="button"
                onClick={() => setIsNewsModalOpen(false)}
                className="text-white hover:bg-white/15 rounded p-1 text-lg leading-none"
                aria-label="Close"
              >
                ✕
              </button>
            </div>
            <div className="px-4 py-6 text-sm text-slate-700 leading-relaxed">
              PAN Card services are available across all e-Gramin service points and partner centers.
            </div>
            <div className="px-4 py-3 bg-slate-50 flex justify-end">
              <button
                type="button"
                onClick={() => setIsNewsModalOpen(false)}
                className="rounded-md bg-[#d96305] hover:bg-[#b85404] text-white text-sm font-semibold px-4 py-2"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};