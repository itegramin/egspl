import React from 'react';

import mapImg from '../assets/images/map.jpg';

export const ContactPage: React.FC = () => {
  return (
    <main className="bg-white py-16">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <h3 className="text-2xl md:text-3xl font-bold text-slate-900">
          Contact <span className="text-[#1b8c4e]">Us</span>
        </h3>
        <div className="mt-2 h-1 w-12 rounded bg-[#d96305]" />

        <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-10 items-start">
          <div>
            <p className="text-[15px] text-slate-600 mb-6">You can reach us through below given means.</p>
            <div className="space-y-5">
              <div className="flex items-start gap-3">
                <span className="text-xl">🏠</span>
                <div>
                  <strong className="block text-slate-900 text-sm mb-1">e-Gramin Services Pvt. Ltd</strong>
                  <p className="text-sm text-slate-600 leading-relaxed">
                    House No. 39, Sapta Swahid Path<br />
                    Dispur, Guwahati - 781006<br />
                    Assam, India
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <span className="text-xl">✉</span>
                <div>
                  <strong className="block text-slate-900 text-sm mb-1">Email Address</strong>
                  <p className="text-sm text-slate-600">helpdesk[dot]egramin[at]gmail[dot]com</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <span className="text-xl">📞</span>
                <div>
                  <strong className="block text-slate-900 text-sm mb-1">Phone Helpdesk</strong>
                  <p className="text-sm text-slate-600">0361-3511441</p>
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-xl overflow-hidden border border-slate-200 shadow-sm">
            <img src={mapImg} alt="e-Gramin Location Map" className="w-full h-auto object-cover" />
          </div>
        </div>
      </div>
    </main>
  );
};