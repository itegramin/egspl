import React from 'react';

import insuranceIcon from '../assets/images/insurance.png';
import genInsuranceIcon from '../assets/images/genInsurance.png';
import healthInsuranceIcon from '../assets/images/healthInsurance.png';
import bankingIcon from '../assets/images/banking.png';
import posIcon from '../assets/images/pos.png';
import othersIcon from '../assets/images/others.png';

const CARDS = [
  { icon: insuranceIcon, title: 'Life Insurance Policy', desc: 'LIC, SBI Life and Birla Sun Life' },
  { icon: genInsuranceIcon, title: 'General Insurance' },
  { icon: healthInsuranceIcon, title: 'Health Insurance' },
  { icon: bankingIcon, title: 'Banking' },
  { icon: posIcon, title: 'POS' },
  { icon: othersIcon, title: "Other's" },
];

export const ServicesPage: React.FC = () => {
  return (
    <main className="bg-white py-16">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="text-center">
          <h3 className="text-2xl md:text-3xl font-bold text-slate-900">
            Our <span className="text-[#1b8c4e]">Service&apos;s</span>
          </h3>
          <div className="mx-auto mt-2 h-1 w-12 rounded bg-[#d96305]" />
          <p className="mt-4 text-sm font-semibold text-slate-700">We offer Insurance Services and products like</p>
        </div>

        <div className="mt-10 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {CARDS.map(({ icon, title, desc }) => (
            <div
              key={title}
              className="rounded-2xl border border-slate-200 bg-white p-6 text-center shadow-sm hover:shadow-md transition-shadow"
            >
              <div className="mx-auto w-14 h-14 rounded-full bg-emerald-50 grid place-items-center mb-4">
                <img src={icon} alt={title} className="w-8 h-8 object-contain" />
              </div>
              <h3 className="font-bold text-slate-900">{title}</h3>
              {desc && <p className="mt-1 text-sm text-slate-500">{desc}</p>}
            </div>
          ))}
        </div>
      </div>
    </main>
  );
};