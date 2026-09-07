import React from 'react';

import aboutImg from '../assets/images/about.png';

export const AboutPage: React.FC = () => {
  return (
    <main className="bg-white py-16">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-10 items-center">
          <img src={aboutImg} alt="About e-Gramin" className="w-full rounded-xl object-cover shadow-sm" />
          <div>
            <h3 className="text-2xl md:text-3xl font-bold text-slate-900">
              About <span className="text-[#1b8c4e]">Company</span>
            </h3>
            <div className="mt-2 h-1 w-12 rounded bg-[#d96305]" />
            <p className="mt-6 text-[15px] leading-relaxed text-slate-600">
              E-Gramin Services Pvt Ltd is an ISO Certified Private Limited Organization our Registered office in Dispur, Guwahati with Zonal Office
              in almost all districts of Assam. Our strong network presence in all the nook and corners of North-Eastern region. Our mission is to bring
              convenience to the consumer&apos;s doorstep, enabling them to access a diversified range of B2C services through a vibrant delivery
              mechanism by developing rural level entrepreneurs. And also bring inclusive prosperity by partnering with government agencies and financial
              institutions for citizen centric projects.
            </p>
            <p className="mt-4 text-[15px] leading-relaxed text-slate-600">
              To Promote Financial Inclusion Projects and bring awareness to the Rural Mass providing various Banking and Non-Banking services at
              their doorsteps. We are also operating with various National and Regional Rural banks as Business correspondent (BC) to provide kiosk
              Banking services in the NE Region.
            </p>
          </div>
        </div>
      </div>
    </main>
  );
};