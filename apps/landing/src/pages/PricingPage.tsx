import React from 'react';
import { Check, X, Sparkles } from 'lucide-react';

const AUTH_BASE = import.meta.env.VITE_AUTH_URL || 'https://auth.egraminservices.com';

const PLANS = [
  {
    name: 'Starter',
    price: '₹0',
    period: '/month',
    desc: 'For individuals exploring digital services.',
    features: ['Basic dashboard access', 'Standard support', '1 operator account'],
    notIncluded: ['Advanced analytics', 'Priority support'],
  },
  {
    name: 'Business',
    price: '₹999',
    period: '/month',
    desc: 'For growing businesses and agents.',
    features: ['Full dashboard access', 'Advanced analytics', 'Up to 5 operator accounts', 'Priority support', 'Commission tracking'],
    notIncluded: [],
    highlighted: true,
  },
  {
    name: 'Enterprise',
    price: 'Custom',
    period: '',
    desc: 'For large organizations and CSP networks.',
    features: ['Everything in Business', 'Unlimited operators', 'Dedicated account manager', 'Custom integrations', 'SLA support'],
    notIncluded: [],
  },
];

export const PricingPage: React.FC = () => {
  return (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold mb-3">Simple Pricing</h1>
        <p className="text-slate-400 max-w-2xl mx-auto">
          Choose the plan that fits your business needs.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {PLANS.map((plan) => (
          <div
            key={plan.name}
            className={`rounded-2xl border p-8 ${
              plan.highlighted
                ? 'border-emerald-500/50 bg-gradient-to-b from-emerald-600/10 to-transparent shadow-lg shadow-emerald-500/10'
                : 'border-white/10 bg-white/5'
            }`}
          >
            <div className="flex items-center gap-2 mb-4">
              <h2 className="text-lg font-semibold">{plan.name}</h2>
              {plan.highlighted && <Sparkles className="w-4 h-4 text-emerald-400" />}
            </div>
            <p className="text-sm text-slate-400 mb-6">{plan.desc}</p>
            <div className="mb-6">
              <span className="text-4xl font-bold">{plan.price}</span>
              {plan.period && <span className="text-slate-400">{plan.period}</span>}
            </div>
            <ul className="space-y-3 mb-8">
              {plan.features.map((f) => (
                <li key={f} className="flex items-center gap-2 text-sm">
                  <Check className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                  <span className="text-slate-300">{f}</span>
                </li>
              ))}
              {plan.notIncluded.map((f) => (
                <li key={f} className="flex items-center gap-2 text-sm text-slate-500">
                  <X className="w-4 h-4 flex-shrink-0" />
                  <span>{f}</span>
                </li>
              ))}
            </ul>
            <a
              href={`${AUTH_BASE}/signup`}
              className={`block text-center font-medium rounded-lg px-6 py-3 transition-all ${
                plan.highlighted
                  ? 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white'
                  : 'border border-white/20 hover:bg-white/5 text-white'
              }`}
            >
              Get Started
            </a>
          </div>
        ))}
      </div>
    </main>
  );
};
