import React from 'react';
import { Link } from 'react-router-dom';

const AUTH_BASE =
  import.meta.env.VITE_AUTH_URL || 'https://auth.egraminservices.com';

export const Footer: React.FC = () => {
  return (
    <footer className="bg-[#222] text-white">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-10">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
          <div>
            <h6 className="font-bold text-sm uppercase tracking-wide mb-4">Our Company</h6>
            <ul className="space-y-2 text-sm text-white/80">
              <li><Link to="/" className="hover:text-white">Home</Link></li>
              <li><Link to="/about" className="hover:text-white">About Us</Link></li>
              <li><Link to="/services" className="hover:text-white">Services</Link></li>
              <li><Link to="/gallery" className="hover:text-white">Gallery</Link></li>
              <li><Link to="/contact" className="hover:text-white">Contact Us</Link></li>
            </ul>
          </div>

          <div>
            <h6 className="font-bold text-sm uppercase tracking-wide mb-4">Our Service&apos;s</h6>
            <ul className="space-y-2 text-sm text-white/80">
              <li>Banking</li>
              <li>General Insurance</li>
              <li>Life Insurance</li>
              <li>Health Insurance</li>
              <li>POS</li>
              <li>Education and IT</li>
            </ul>
          </div>

          <div>
            <h6 className="font-bold text-sm uppercase tracking-wide mb-4">Reach Us</h6>
            <div className="space-y-3 text-sm text-white/80 leading-relaxed">
              <p>
                <span className="mr-2">🏠</span>
                e-Gramin Services Pvt. Ltd<br />
                House No. 39, Sapta Swahid Path<br />
                Dispur, Guwahati - 781006<br />
                Assam, India
              </p>
              <p><span className="mr-2">✉</span> helpdesk[dot]egramin[at]gmail[dot]com</p>
              <p><span className="mr-2">📞</span> 0361-3511441</p>
            </div>
          </div>
        </div>

        <div className="mt-8 border-t border-white/15 pt-6 flex flex-col md:flex-row items-center justify-between gap-3 text-sm text-white/60">
          <span>© All Right Reserved. eGramin</span>
        </div>
      </div>
    </footer>
  );
};